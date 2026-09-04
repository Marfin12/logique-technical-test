import { Decimal128, ObjectId, type Db } from "mongodb";

export const TEST_PRODUCT_IDS = {
  life: new ObjectId("650000000000000000000001"),
  health: new ObjectId("650000000000000000000002"),
  lifeVersion: new ObjectId("650000000000000000000101"),
  healthVersion: new ObjectId("650000000000000000000102"),
} as const;

const FIXTURE_TIME = new Date("2026-01-01T00:00:00.000Z");

export async function seedTestProducts(db: Db): Promise<void> {
  const products = [
    {
      _id: TEST_PRODUCT_IDS.life,
      name: "[TEST ONLY] Simple Life",
      active: true,
    },
    {
      _id: TEST_PRODUCT_IDS.health,
      name: "[TEST ONLY] Simple Health",
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
      description: "Test fixture for exercising Phase 1 persistence only.",
      coverage: { currency: "IDR" },
      benefits: ["TEST DATA - not an approved insurance benefit"],
      limitations: ["TEST DATA - do not use for production decisions"],
      eligibilityConfig: { minimumAge: 18, maximumAge: 65 },
      ratingConfig: { baseAmount: Decimal128.fromString("100.00"), version: 1 },
      supplementalSchema: { version: 1, fields: [] },
    },
    {
      _id: TEST_PRODUCT_IDS.healthVersion,
      productId: TEST_PRODUCT_IDS.health,
      version: 1,
      insuranceTypes: ["INDIVIDUAL_HEALTH"],
      description: "Test fixture for exercising Phase 1 persistence only.",
      coverage: { currency: "IDR" },
      benefits: ["TEST DATA - not an approved insurance benefit"],
      limitations: ["TEST DATA - do not use for production decisions"],
      eligibilityConfig: { minimumAge: 18, maximumAge: 60 },
      ratingConfig: { baseAmount: Decimal128.fromString("150.00"), version: 1 },
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
