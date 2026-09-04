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
    const id = new ObjectId();
    const existing = await collection.findOneAndUpdate(
      identity,
      { $setOnInsert: { _id: id, ...input } },
      { upsert: true, returnDocument: "before", session },
    );
    if (existing) return this.match(existing, input.requestFingerprint);
    return {
      reused: false as const,
      id,
      responseReference: input.responseReference,
    };
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
