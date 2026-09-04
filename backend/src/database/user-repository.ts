import { MongoServerError, ObjectId, type Collection, type Db } from "mongodb";

import type { Role } from "@insurance/contracts";

import { ConflictError } from "../domain/errors.js";
import type { UserDocument } from "../models/persistence.js";

export interface CreateUserInput {
  normalizedEmail: string;
  passwordHash: string;
  displayName: string;
  role: Role;
}

export class UserRepository {
  private readonly users: Collection<UserDocument>;

  constructor(db: Db) {
    this.users = db.collection<UserDocument>("users");
  }

  findByEmail(normalizedEmail: string): Promise<UserDocument | null> {
    return this.users.findOne({ normalizedEmail });
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!ObjectId.isValid(id)) return Promise.resolve(null);
    return this.users.findOne({ _id: new ObjectId(id) });
  }

  async create(input: CreateUserInput): Promise<UserDocument> {
    const now = new Date();
    const user: UserDocument = {
      _id: new ObjectId(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await this.users.insertOne(user);
      return user;
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new ConflictError(
          "An account could not be created with these details.",
        );
      }
      throw error;
    }
  }
}
