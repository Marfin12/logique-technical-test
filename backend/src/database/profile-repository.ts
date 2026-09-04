import { ObjectId, type Collection, type Db } from "mongodb";

import type { ValidProfileInput } from "../domain/profile.js";
import type { MasterProfileDocument } from "../models/persistence.js";

export class ProfileRepository {
  private readonly profiles: Collection<MasterProfileDocument>;

  constructor(db: Db) {
    this.profiles = db.collection<MasterProfileDocument>("masterProfiles");
  }

  findByUserId(userId: string): Promise<MasterProfileDocument | null> {
    if (!ObjectId.isValid(userId)) return Promise.resolve(null);
    return this.profiles.findOne({ userId: new ObjectId(userId) });
  }

  async save(
    userId: string,
    input: ValidProfileInput,
  ): Promise<MasterProfileDocument> {
    const userObjectId = new ObjectId(userId);
    const now = new Date();
    const profile = await this.profiles.findOneAndUpdate(
      { userId: userObjectId },
      {
        $set: { ...input, updatedAt: now },
        $setOnInsert: {
          _id: new ObjectId(),
          userId: userObjectId,
          createdAt: now,
        },
        $inc: { version: 1 },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!profile) throw new Error("Profile upsert did not return a document.");
    return profile;
  }
}
