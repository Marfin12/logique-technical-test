import type { Db, Document } from "mongodb";

import { COLLECTION_SPECS, INDEX_SPECS } from "./schema.js";

export interface Migration {
  id: string;
  up(db: Db): Promise<void>;
}

async function collectionExists(db: Db, name: string): Promise<boolean> {
  return db.listCollections({ name }, { nameOnly: true }).hasNext();
}

/** Ordered, idempotent changes to the MongoDB database structure. */
export const MIGRATIONS: Migration[] = [
  {
    id: "000-foundation",
    async up(db) {
      const validator: Document = {
        $jsonSchema: {
          bsonType: "object",
          required: ["key", "value", "updatedAt"],
          properties: {
            key: { bsonType: "string", minLength: 1 },
            value: {},
            updatedAt: { bsonType: "date" },
          },
        },
      };
      if (!(await collectionExists(db, "systemMetadata"))) {
        await db.createCollection("systemMetadata", { validator });
      } else {
        await db.command({
          collMod: "systemMetadata",
          validator,
          validationAction: "error",
        });
      }
      await db
        .collection("systemMetadata")
        .createIndex(
          { key: 1 },
          { unique: true, name: "uq_system_metadata_key" },
        );
    },
  },
  {
    id: "001-contracts-and-persistence",
    async up(db) {
      for (const spec of COLLECTION_SPECS) {
        if (!(await collectionExists(db, spec.name))) {
          await db.createCollection(spec.name, {
            validator: spec.validator,
            validationLevel: "strict",
            validationAction: "error",
          });
        } else {
          await db.command({
            collMod: spec.name,
            validator: spec.validator,
            validationLevel: "strict",
            validationAction: "error",
          });
        }
      }

      for (const [collectionName, indexes] of Object.entries(INDEX_SPECS)) {
        for (const index of indexes) {
          await db.collection(collectionName).createIndex(index.key, index);
        }
      }
    },
  },
];

async function ensureMigrationCollection(db: Db): Promise<void> {
  if (!(await collectionExists(db, "migrationRecords"))) {
    await db.createCollection("migrationRecords", {
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["migrationId", "appliedAt"],
          properties: {
            migrationId: { bsonType: "string" },
            appliedAt: { bsonType: "date" },
          },
        },
      },
    });
  }
  await db
    .collection("migrationRecords")
    .createIndex(
      { migrationId: 1 },
      { unique: true, name: "uq_migration_records_id" },
    );
}

export async function runMigrations(db: Db): Promise<string[]> {
  await ensureMigrationCollection(db);
  const applied: string[] = [];
  for (const migration of MIGRATIONS) {
    const alreadyApplied = await db
      .collection("migrationRecords")
      .findOne({ migrationId: migration.id }, { projection: { _id: 1 } });
    if (alreadyApplied) continue;

    await migration.up(db);
    await db
      .collection("migrationRecords")
      .updateOne(
        { migrationId: migration.id },
        { $setOnInsert: { migrationId: migration.id, appliedAt: new Date() } },
        { upsert: true },
      );
    applied.push(migration.id);
  }
  return applied;
}
