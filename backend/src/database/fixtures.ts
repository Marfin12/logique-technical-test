import { Decimal128, ObjectId, type Db } from "mongodb";

import type { Role } from "@insurance/contracts";

import { hashPassword } from "../domain/credentials.js";

export const TEST_PRODUCT_IDS = {
  life: new ObjectId("650000000000000000000001"),
  health: new ObjectId("650000000000000000000002"),
  travel: new ObjectId("650000000000000000000003"),
  lifeVersion: new ObjectId("650000000000000000000101"),
  healthVersion: new ObjectId("650000000000000000000102"),
  travelVersion: new ObjectId("650000000000000000000103"),
} as const;

export const TEST_ACCOUNT_IDS = {
  newUser: new ObjectId("650000000000000000000201"),
  profiledUser: new ObjectId("650000000000000000000202"),
  admin: new ObjectId("650000000000000000000203"),
  profiledUserProfile: new ObjectId("650000000000000000000301"),
} as const;

export const TEST_ACCOUNT_CREDENTIALS = {
  newUser: { email: "new.user@example.test", password: "NewUser123!" },
  profiledUser: {
    email: "profiled.user@example.test",
    password: "ProfiledUser123!",
  },
  admin: { email: "admin@example.test", password: "AdminUser123!" },
} as const;

const FIXTURE_TIME = new Date("2026-01-01T00:00:00.000Z");

export async function seedTestAccounts(db: Db): Promise<void> {
  const accounts: Array<{
    _id: ObjectId;
    email: string;
    password: string;
    displayName: string;
    role: Role;
    saltByte: number;
  }> = [
    {
      _id: TEST_ACCOUNT_IDS.newUser,
      ...TEST_ACCOUNT_CREDENTIALS.newUser,
      displayName: "Demo New User",
      role: "USER",
      saltByte: 1,
    },
    {
      _id: TEST_ACCOUNT_IDS.profiledUser,
      ...TEST_ACCOUNT_CREDENTIALS.profiledUser,
      displayName: "Demo Profiled User",
      role: "USER",
      saltByte: 2,
    },
    {
      _id: TEST_ACCOUNT_IDS.admin,
      ...TEST_ACCOUNT_CREDENTIALS.admin,
      displayName: "Demo Administrator",
      role: "ADMIN",
      saltByte: 3,
    },
  ];
  const seededIds = new Map<string, ObjectId>();

  for (const account of accounts) {
    const passwordHash = await hashPassword(
      account.password,
      Buffer.alloc(16, account.saltByte),
    );
    const existingAccount = await db
      .collection("users")
      .findOne({ normalizedEmail: account.email }, { projection: { _id: 1 } });
    const accountId =
      existingAccount?._id instanceof ObjectId
        ? existingAccount._id
        : account._id;
    await db.collection("users").updateOne(
      { _id: accountId },
      {
        $set: {
          normalizedEmail: account.email,
          passwordHash,
          role: account.role,
          displayName: account.displayName,
          updatedAt: FIXTURE_TIME,
        },
        $setOnInsert: { createdAt: FIXTURE_TIME },
      },
      { upsert: true },
    );
    seededIds.set(account.email, accountId);
  }

  const newUserId = seededIds.get(TEST_ACCOUNT_CREDENTIALS.newUser.email)!;
  const profiledUserId = seededIds.get(
    TEST_ACCOUNT_CREDENTIALS.profiledUser.email,
  )!;
  await db.collection("masterProfiles").deleteOne({
    userId: newUserId,
  });
  await db.collection("masterProfiles").updateOne(
    { userId: profiledUserId },
    {
      $set: {
        age: 35,
        sumAssured: Decimal128.fromString("500000000.00"),
        currency: "IDR",
        paymentFrequency: "MONTHLY",
        paymentMethod: "RECURRING",
        version: 1,
        updatedAt: FIXTURE_TIME,
      },
      $setOnInsert: {
        _id: TEST_ACCOUNT_IDS.profiledUserProfile,
        createdAt: FIXTURE_TIME,
      },
    },
    { upsert: true },
  );
}

export async function seedTestProducts(db: Db): Promise<void> {
  const products = [
    {
      _id: TEST_PRODUCT_IDS.life,
      name: "Simple Life",
      active: true,
    },
    {
      _id: TEST_PRODUCT_IDS.health,
      name: "Simple Health",
      active: true,
    },
    {
      _id: TEST_PRODUCT_IDS.travel,
      name: "Simple Travel",
      active: true,
    },
  ];
  for (const product of products) {
    const { _id, ...fields } = product;
    await db.collection("products").updateOne(
      { _id },
      {
        $set: { ...fields, testOnly: true, updatedAt: FIXTURE_TIME },
        $setOnInsert: { createdAt: FIXTURE_TIME },
      },
      { upsert: true },
    );
  }

  const versions = [
    {
      _id: TEST_PRODUCT_IDS.lifeVersion,
      productId: TEST_PRODUCT_IDS.life,
      version: 1,
      insuranceTypes: ["TERM_LIFE"],
      description:
        "Demo term-life product with configurable eligibility and rating.",
      coverage: {
        currency: "IDR",
        summary: "Illustrative coverage up to the selected sum assured",
      },
      benefits: ["Illustrative life insurance benefit"],
      limitations: ["Demo configuration—not approved policy wording"],
      eligibilityConfig: {
        minimumAge: 18,
        maximumAge: 65,
        minimumSumAssured: Decimal128.fromString("10000000.00"),
        maximumSumAssured: Decimal128.fromString("1000000000.00"),
        currency: "IDR",
        paymentFrequencies: [
          "MONTHLY",
          "QUARTERLY",
          "SEMI_ANNUALLY",
          "ANNUALLY",
        ],
        paymentMethods: ["RECURRING", "ONE_TIME"],
      },
      ratingConfig: {
        ratePerThousand: Decimal128.fromString("2.40"),
        frequencyFactors: {
          MONTHLY: Decimal128.fromString("0.09"),
          QUARTERLY: Decimal128.fromString("0.26"),
          SEMI_ANNUALLY: Decimal128.fromString("0.52"),
          ANNUALLY: Decimal128.fromString("0.95"),
        },
        paymentMethodFactors: {
          RECURRING: Decimal128.fromString("1.00"),
          ONE_TIME: Decimal128.fromString("0.98"),
        },
        roundingScale: 2,
        version: 1,
      },
      supplementalSchema: { version: 1, fields: [] },
    },
    {
      _id: TEST_PRODUCT_IDS.healthVersion,
      productId: TEST_PRODUCT_IDS.health,
      version: 1,
      insuranceTypes: ["INDIVIDUAL_HEALTH"],
      description:
        "Demo individual-health product with restricted payment choices.",
      coverage: {
        currency: "IDR",
        summary: "Illustrative inpatient and outpatient coverage",
      },
      benefits: ["Illustrative health insurance benefit"],
      limitations: ["Demo configuration—not approved policy wording"],
      eligibilityConfig: {
        minimumAge: 18,
        maximumAge: 60,
        minimumSumAssured: Decimal128.fromString("50000000.00"),
        maximumSumAssured: Decimal128.fromString("500000000.00"),
        currency: "IDR",
        paymentFrequencies: ["MONTHLY", "ANNUALLY"],
        paymentMethods: ["RECURRING"],
      },
      ratingConfig: {
        ratePerThousand: Decimal128.fromString("3.60"),
        frequencyFactors: {
          MONTHLY: Decimal128.fromString("0.09"),
          QUARTERLY: Decimal128.fromString("0.27"),
          SEMI_ANNUALLY: Decimal128.fromString("0.53"),
          ANNUALLY: Decimal128.fromString("0.96"),
        },
        paymentMethodFactors: {
          RECURRING: Decimal128.fromString("1.00"),
          ONE_TIME: Decimal128.fromString("1.03"),
        },
        roundingScale: 2,
        version: 1,
      },
      supplementalSchema: {
        version: 1,
        fields: [
          {
            key: "preExistingConditions",
            label: "Pre-existing conditions",
            type: "boolean",
            required: true,
          },
        ],
      },
    },
    {
      _id: TEST_PRODUCT_IDS.travelVersion,
      productId: TEST_PRODUCT_IDS.travel,
      version: 1,
      insuranceTypes: ["INDIVIDUAL", "FAMILY"],
      description:
        "Demo travel protection offered for individual and family journeys.",
      coverage: {
        currency: "IDR",
        summary: "Illustrative travel emergency and disruption coverage",
      },
      benefits: [
        "Illustrative emergency medical assistance",
        "Illustrative trip disruption benefit",
      ],
      limitations: ["Demo configuration—not approved policy wording"],
      eligibilityConfig: {
        minimumAge: 18,
        maximumAge: 70,
        minimumSumAssured: Decimal128.fromString("10000000.00"),
        maximumSumAssured: Decimal128.fromString("1000000000.00"),
        currency: "IDR",
        paymentFrequencies: [
          "MONTHLY",
          "QUARTERLY",
          "SEMI_ANNUALLY",
          "ANNUALLY",
        ],
        paymentMethods: ["RECURRING", "ONE_TIME"],
      },
      ratingConfig: {
        ratePerThousand: Decimal128.fromString("1.20"),
        frequencyFactors: {
          MONTHLY: Decimal128.fromString("0.09"),
          QUARTERLY: Decimal128.fromString("0.26"),
          SEMI_ANNUALLY: Decimal128.fromString("0.52"),
          ANNUALLY: Decimal128.fromString("0.95"),
        },
        paymentMethodFactors: {
          RECURRING: Decimal128.fromString("1.00"),
          ONE_TIME: Decimal128.fromString("0.98"),
        },
        roundingScale: 2,
        version: 1,
      },
      supplementalSchema: { version: 1, fields: [] },
    },
  ];
  for (const version of versions) {
    const { _id, ...fields } = version;
    await db.collection("productVersions").updateOne(
      { _id },
      {
        $set: {
          ...fields,
          effectiveFrom: FIXTURE_TIME,
          effectiveTo: null,
          testOnly: true,
        },
      },
      { upsert: true },
    );
  }
}
