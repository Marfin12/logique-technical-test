import { ObjectId, type ClientSession, type Db, type Document } from "mongodb";

import { ConflictError } from "../domain/errors.js";
import type { IdempotencyRecordDocument } from "../models/persistence.js";

interface ReserveInput {
  actorId: ObjectId;
  commandScope: string;
  key: string;
  requestFingerprint: string;
  responseReference: Document;
  createdAt: Date;
  expiresAt: Date;
}

export class IdempotencyRepository {
  constructor(private readonly db: Db) {}

  async reserve(input: ReserveInput, session: ClientSession) {
    const collection =
      this.db.collection<IdempotencyRecordDocument>("idempotencyRecords");
    const identity = {
      actorId: input.actorId,
      commandScope: input.commandScope,
      key: input.key,
    };
    const existing = await collection.findOne(identity, { session });
    if (existing) return this.match(existing, input.requestFingerprint);

    try {
      const result = await collection.insertOne(
        { _id: new ObjectId(), ...input },
        { session },
      );
      return {
        reused: false as const,
        id: result.insertedId,
        responseReference: input.responseReference,
      };
    } catch (error) {
      if (
        !(
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 11000
        )
      )
        throw error;
      const concurrent = await collection.findOne(identity, { session });
      if (!concurrent) throw error;
      return this.match(concurrent, input.requestFingerprint);
    }
  }

  private match(record: IdempotencyRecordDocument, fingerprint: string) {
    if (record.requestFingerprint !== fingerprint) {
      throw new ConflictError(
        "Idempotency key was already used with a different request.",
      );
    }
    return {
      reused: true as const,
      id: record._id,
      responseReference: record.responseReference,
    };
  }
}
