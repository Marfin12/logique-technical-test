import { ObjectId, type Collection, type Db } from "mongodb";

import type { UserDocument } from "../models/persistence.js";

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
}
