import type { Document, IndexDescription } from "mongodb";

import {
  APPLICATION_STATUSES,
  PAYMENT_FREQUENCIES,
  PAYMENT_METHODS,
  ROLES,
} from "@insurance/contracts";

/** Declarative collection validation and indexing used by migrations. */
export interface CollectionSpec {
  name: string;
  validator: Document;
}

const timestamps = {
  createdAt: { bsonType: "date" },
  updatedAt: { bsonType: "date" },
};

export const COLLECTION_SPECS: readonly CollectionSpec[] = [
  {
    name: "users",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "normalizedEmail",
          "passwordHash",
          "role",
          "displayName",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          normalizedEmail: { bsonType: "string", minLength: 3 },
          passwordHash: { bsonType: "string", minLength: 20 },
          role: { enum: [...ROLES] },
          displayName: { bsonType: "string", minLength: 1 },
          ...timestamps,
        },
      },
    },
  },
  {
    name: "masterProfiles",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "userId",
          "age",
          "sumAssured",
          "currency",
          "paymentFrequency",
          "paymentMethod",
          "version",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          userId: { bsonType: "objectId" },
          age: { bsonType: "int", minimum: 1 },
          sumAssured: { bsonType: "decimal", minimum: 0 },
          currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
          paymentFrequency: { enum: [...PAYMENT_FREQUENCIES] },
          paymentMethod: { enum: [...PAYMENT_METHODS] },
          version: { bsonType: "int", minimum: 1 },
          ...timestamps,
        },
      },
    },
  },
  {
    name: "products",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["name", "active", "testOnly", "createdAt", "updatedAt"],
        properties: {
          name: { bsonType: "string", minLength: 1 },
          active: { bsonType: "bool" },
          testOnly: { bsonType: "bool" },
          ...timestamps,
        },
      },
    },
  },
  {
    name: "productVersions",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "productId",
          "version",
          "insuranceTypes",
          "description",
          "coverage",
          "benefits",
          "limitations",
          "eligibilityConfig",
          "ratingConfig",
          "supplementalSchema",
          "effectiveFrom",
          "testOnly",
        ],
        properties: {
          productId: { bsonType: "objectId" },
          version: { bsonType: "int", minimum: 1 },
          insuranceTypes: {
            bsonType: "array",
            minItems: 1,
            items: { bsonType: "string" },
          },
          description: { bsonType: "string" },
          coverage: { bsonType: "object" },
          benefits: { bsonType: "array" },
          limitations: { bsonType: "array" },
          eligibilityConfig: { bsonType: "object" },
          ratingConfig: { bsonType: "object" },
          supplementalSchema: { bsonType: "object" },
          effectiveFrom: { bsonType: "date" },
          effectiveTo: { bsonType: ["date", "null"] },
          testOnly: { bsonType: "bool" },
        },
      },
    },
  },
  {
    name: "applications",
    validator: {
      $and: [
        {
          $jsonSchema: {
            bsonType: "object",
            required: [
              "userId",
              "productId",
              "productVersionId",
              "status",
              "supplementalData",
              "version",
              "isDeleted",
              "createdAt",
              "updatedAt",
            ],
            properties: {
              userId: { bsonType: "objectId" },
              productId: { bsonType: "objectId" },
              productVersionId: { bsonType: "objectId" },
              selectedInsuranceType: { bsonType: "string" },
              status: { enum: [...APPLICATION_STATUSES] },
              supplementalData: { bsonType: "object" },
              profileSnapshot: { bsonType: "object" },
              productSnapshot: { bsonType: "object" },
              premiumSnapshot: {
                bsonType: "object",
                required: [
                  "amount",
                  "currency",
                  "ratingVersion",
                  "calculatedAt",
                ],
                properties: {
                  amount: { bsonType: "decimal" },
                  currency: { bsonType: "string", pattern: "^[A-Z]{3}$" },
                  ratingVersion: { bsonType: "int" },
                  calculatedAt: { bsonType: "date" },
                  breakdown: { bsonType: "object" },
                },
              },
              reviewerId: { bsonType: "objectId" },
              rejectionReason: { bsonType: "string", minLength: 1 },
              version: { bsonType: "int", minimum: 1 },
              isDeleted: { bsonType: "bool" },
              deletedAt: { bsonType: "date" },
              submittedAt: { bsonType: "date" },
              reviewStartedAt: { bsonType: "date" },
              approvedAt: { bsonType: "date" },
              rejectedAt: { bsonType: "date" },
              ...timestamps,
            },
          },
        },
        {
          $or: [
            {
              status: "DRAFT",
              submittedAt: { $exists: false },
              reviewStartedAt: { $exists: false },
              approvedAt: { $exists: false },
              rejectedAt: { $exists: false },
              rejectionReason: { $exists: false },
            },
            {
              status: "SUBMITTED",
              submittedAt: { $type: "date" },
              profileSnapshot: { $type: "object" },
              productSnapshot: { $type: "object" },
              premiumSnapshot: { $type: "object" },
              reviewerId: { $exists: false },
              reviewStartedAt: { $exists: false },
              approvedAt: { $exists: false },
              rejectedAt: { $exists: false },
              rejectionReason: { $exists: false },
            },
            {
              status: "UNDER_REVIEW",
              submittedAt: { $type: "date" },
              reviewerId: { $type: "objectId" },
              reviewStartedAt: { $type: "date" },
              profileSnapshot: { $type: "object" },
              productSnapshot: { $type: "object" },
              premiumSnapshot: { $type: "object" },
              approvedAt: { $exists: false },
              rejectedAt: { $exists: false },
              rejectionReason: { $exists: false },
            },
            {
              status: "APPROVED",
              submittedAt: { $type: "date" },
              reviewerId: { $type: "objectId" },
              reviewStartedAt: { $type: "date" },
              approvedAt: { $type: "date" },
              profileSnapshot: { $type: "object" },
              productSnapshot: { $type: "object" },
              premiumSnapshot: { $type: "object" },
              rejectedAt: { $exists: false },
              rejectionReason: { $exists: false },
            },
            {
              status: "REJECTED",
              submittedAt: { $type: "date" },
              reviewerId: { $type: "objectId" },
              reviewStartedAt: { $type: "date" },
              rejectedAt: { $type: "date" },
              rejectionReason: { $type: "string", $regex: "\\S" },
              profileSnapshot: { $type: "object" },
              productSnapshot: { $type: "object" },
              premiumSnapshot: { $type: "object" },
              approvedAt: { $exists: false },
            },
          ],
        },
        {
          $or: [
            { isDeleted: false, deletedAt: { $exists: false } },
            { isDeleted: true, status: "DRAFT", deletedAt: { $type: "date" } },
          ],
        },
      ],
    },
  },
  {
    name: "applicationStatusEvents",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "applicationId",
          "fromStatus",
          "toStatus",
          "actorId",
          "actorRole",
          "createdAt",
        ],
        properties: {
          applicationId: { bsonType: "objectId" },
          fromStatus: { enum: [null, ...APPLICATION_STATUSES] },
          toStatus: { enum: [...APPLICATION_STATUSES] },
          actorId: { bsonType: "objectId" },
          actorRole: { enum: [...ROLES] },
          reason: { bsonType: "string" },
          createdAt: { bsonType: "date" },
        },
      },
    },
  },
  {
    name: "idempotencyRecords",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: [
          "actorId",
          "commandScope",
          "key",
          "requestFingerprint",
          "responseReference",
          "createdAt",
          "expiresAt",
        ],
        properties: {
          actorId: { bsonType: "objectId" },
          commandScope: { bsonType: "string", minLength: 3 },
          key: { bsonType: "string", minLength: 8, maxLength: 128 },
          requestFingerprint: { bsonType: "string", pattern: "^[a-f0-9]{64}$" },
          responseReference: { bsonType: "object" },
          createdAt: { bsonType: "date" },
          expiresAt: { bsonType: "date" },
        },
      },
    },
  },
] as const;

export interface NamedIndexSpec extends IndexDescription {
  name: string;
  key: Document;
}

export const INDEX_SPECS: Readonly<Record<string, readonly NamedIndexSpec[]>> =
  {
    users: [
      {
        key: { normalizedEmail: 1 },
        unique: true,
        name: "uq_users_normalized_email",
      },
    ],
    masterProfiles: [
      { key: { userId: 1 }, unique: true, name: "uq_master_profiles_user" },
    ],
    products: [
      { key: { active: 1, name: 1, _id: 1 }, name: "idx_products_active_name" },
    ],
    productVersions: [
      {
        key: { productId: 1, version: 1 },
        unique: true,
        name: "uq_product_versions_product_version",
      },
      {
        key: { productId: 1, effectiveFrom: -1 },
        name: "idx_product_versions_effective",
      },
    ],
    applications: [
      {
        key: { userId: 1, updatedAt: -1, _id: -1 },
        name: "idx_applications_user_recent",
        partialFilterExpression: { isDeleted: false },
      },
      {
        key: { userId: 1, status: 1, updatedAt: -1, _id: -1 },
        name: "idx_applications_user_status_recent",
        partialFilterExpression: { isDeleted: false },
      },
      {
        key: { status: 1, submittedAt: -1, _id: -1 },
        name: "idx_applications_admin_queue",
        partialFilterExpression: { isDeleted: false },
      },
      {
        key: { reviewerId: 1, status: 1, reviewStartedAt: -1, _id: -1 },
        name: "idx_applications_reviewer_queue",
        partialFilterExpression: { reviewerId: { $exists: true } },
      },
    ],
    applicationStatusEvents: [
      {
        key: { applicationId: 1, createdAt: 1, _id: 1 },
        name: "idx_status_events_application_time",
      },
    ],
    idempotencyRecords: [
      {
        key: { actorId: 1, commandScope: 1, key: 1 },
        unique: true,
        name: "uq_idempotency_actor_scope_key",
      },
      {
        key: { expiresAt: 1 },
        expireAfterSeconds: 0,
        name: "ttl_idempotency_expiry",
      },
    ],
  };
