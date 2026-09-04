import assert from "node:assert/strict";

import {
  Decimal128,
  ObjectId,
  type Db,
  type Document,
  type Sort,
} from "mongodb";

import { requestFingerprint } from "../domain/idempotency.js";
import {
  adminApplicationQuery,
  APPLICATION_LIST_PROJECTION,
  reviewerApplicationQuery,
  statusHistoryQuery,
  userApplicationQuery,
} from "./application-queries.js";
import { ApplicationRepository } from "./application-repository.js";
import { connectDatabase } from "./client.js";
import {
  seedTestAccounts,
  seedTestProducts,
  TEST_ACCOUNT_IDS,
  TEST_PRODUCT_IDS,
} from "./fixtures.js";
import { IdempotencyRepository } from "./idempotency-repository.js";
import { ProductRepository } from "./product-repository.js";
import { ProfileRepository } from "./profile-repository.js";
import { runMigrations } from "../migrations/migrations.js";
import { COLLECTION_SPECS, INDEX_SPECS } from "../migrations/schema.js";
import { runInTransaction } from "./transactions.js";
import { loadConfig } from "../config.js";
import { ProductService } from "../services/product-service.js";

function applicationFixture(input: {
  userId: ObjectId;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  at: Date;
  reviewerId: ObjectId;
}) {
  const base: Document = {
    _id: new ObjectId(),
    userId: input.userId,
    productId: TEST_PRODUCT_IDS.life,
    productVersionId: TEST_PRODUCT_IDS.lifeVersion,
    selectedInsuranceType: "TERM_LIFE",
    status: input.status,
    supplementalData: { fixtureSequence: input.at.getTime() },
    version: 1,
    isDeleted: false,
    createdAt: input.at,
    updatedAt: input.at,
  };
  if (input.status !== "DRAFT") {
    Object.assign(base, {
      submittedAt: input.at,
      profileSnapshot: { fixture: true },
      productSnapshot: { fixture: true },
      premiumSnapshot: {
        amount: Decimal128.fromString("100.00"),
        currency: "IDR",
        ratingVersion: 1,
        calculatedAt: input.at,
        breakdown: { fixture: true },
      },
    });
  }
  if (["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(input.status)) {
    Object.assign(base, {
      reviewerId: input.reviewerId,
      reviewStartedAt: input.at,
    });
  }
  if (input.status === "APPROVED") base.approvedAt = input.at;
  if (input.status === "REJECTED") {
    base.rejectedAt = input.at;
    base.rejectionReason = "Test-only rejection reason";
  }
  return base;
}

function hasStage(value: unknown, stage: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value) && "stage" in value && value.stage === stage)
    return true;
  return Object.values(value).some((child) => hasStage(child, stage));
}

async function assertIndexedQuery(
  db: Db,
  query: { filter: Document; sort: Sort; hint: string },
) {
  const explanation = await db
    .collection("applications")
    .find(query.filter)
    .sort(query.sort)
    .hint(query.hint)
    .limit(10)
    .explain("executionStats");
  assert.equal(
    hasStage(explanation, "COLLSCAN"),
    false,
    `${query.hint} used COLLSCAN`,
  );
  assert.equal(
    hasStage(explanation, "SORT"),
    false,
    `${query.hint} used blocking SORT`,
  );
}

async function verifySchemaAndIndexes(db: Db) {
  const collections = await db
    .listCollections({}, { nameOnly: false })
    .toArray();
  for (const spec of COLLECTION_SPECS) {
    const actual = collections.find(({ name }) => name === spec.name);
    assert(actual, `Missing collection ${spec.name}`);
    assert.deepEqual(actual.options?.validator, spec.validator);
  }
  for (const [collectionName, expectedIndexes] of Object.entries(INDEX_SPECS)) {
    const actualIndexes = await db.collection(collectionName).indexes();
    for (const expected of expectedIndexes) {
      const actual = actualIndexes.find(({ name }) => name === expected.name);
      assert(actual, `Missing index ${expected.name}`);
      assert.deepEqual(actual.key, expected.key);
      assert.equal(Boolean(actual.unique), Boolean(expected.unique));
      assert.deepEqual(
        actual.partialFilterExpression,
        expected.partialFilterExpression,
      );
      assert.equal(actual.expireAfterSeconds, expected.expireAfterSeconds);
    }
  }
}

async function verifyValidators(db: Db, userId: ObjectId) {
  const now = new Date();
  await assert.rejects(
    db.collection("applications").insertOne({
      _id: new ObjectId(),
      userId,
      productId: TEST_PRODUCT_IDS.life,
      productVersionId: TEST_PRODUCT_IDS.lifeVersion,
      status: "INVALID_STATUS",
      supplementalData: {},
      version: 1,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    }),
  );
  const inconsistent = applicationFixture({
    userId,
    status: "REJECTED",
    at: now,
    reviewerId: new ObjectId(),
  });
  delete inconsistent.rejectionReason;
  await assert.rejects(db.collection("applications").insertOne(inconsistent));
  await assert.rejects(
    db.collection("productVersions").insertOne({
      _id: new ObjectId(),
      productId: TEST_PRODUCT_IDS.life,
      version: 99,
      insuranceTypes: ["INVALID_FIXTURE"],
      description: "Invalid rating configuration fixture",
      coverage: {},
      benefits: [],
      limitations: [],
      eligibilityConfig: { minimumAge: 18, maximumAge: 65 },
      ratingConfig: { version: 1 },
      supplementalSchema: { version: 1, fields: [] },
      effectiveFrom: now,
      effectiveTo: null,
      testOnly: true,
    }),
  );
}

async function verifyProductCatalog(db: Db) {
  await seedTestAccounts(db);
  const products = new ProductRepository(db);
  const service = new ProductService(
    new ProfileRepository(db),
    products,
    () => new Date("2026-09-04T00:00:00.000Z"),
  );
  const principal = {
    id: TEST_ACCOUNT_IDS.profiledUser.toHexString(),
    role: "USER" as const,
  };
  const catalog = await service.catalog(principal);
  assert.equal(catalog.items.length, 2);
  const life = catalog.items.find(
    ({ id }) => id === TEST_PRODUCT_IDS.life.toHexString(),
  );
  assert(life);
  assert.equal(life.premium.amount, "108000.00");
  const detail = await service.getDetail(principal, life.id);
  assert.deepEqual(detail.product.premium, life.premium);

  await db.collection("masterProfiles").updateOne(
    { userId: TEST_ACCOUNT_IDS.profiledUser },
    {
      $set: {
        paymentFrequency: "QUARTERLY",
        paymentMethod: "ONE_TIME",
      },
    },
  );
  const restricted = await service.catalog(principal);
  assert.deepEqual(
    restricted.items.map(({ id }) => id),
    [TEST_PRODUCT_IDS.life.toHexString()],
  );
  await assert.rejects(
    service.getDetail(principal, TEST_PRODUCT_IDS.health.toHexString()),
    (error: unknown) =>
      error instanceof Error && error.message.includes("not compatible"),
  );
}

async function verifyTransactionsAndIdempotency(
  db: Db,
  client: Parameters<typeof runInTransaction>[0],
) {
  const actorId = new ObjectId();
  const now = new Date();
  await runInTransaction(client, async (session) => {
    await db.collection("users").insertOne(
      {
        _id: actorId,
        normalizedEmail: "phase1.verify@example.test",
        passwordHash: "test-only-hash-not-a-real-credential",
        role: "USER",
        displayName: "Phase 1 Verification User",
        createdAt: now,
        updatedAt: now,
      },
      { session },
    );
    await db.collection("masterProfiles").insertOne(
      {
        _id: new ObjectId(),
        userId: actorId,
        age: 30,
        sumAssured: Decimal128.fromString("100000.00"),
        currency: "IDR",
        paymentFrequency: "MONTHLY",
        paymentMethod: "RECURRING",
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      { session },
    );
  });
  assert.equal(
    await db.collection("masterProfiles").countDocuments({ userId: actorId }),
    1,
  );

  const repository = new IdempotencyRepository(db);
  const fingerprint = requestFingerprint({ applicationId: "fixture" });
  const input = {
    actorId,
    commandScope: "application.submit",
    key: "phase1-verification-key",
    requestFingerprint: fingerprint,
    responseReference: { applicationId: "fixture" },
    createdAt: now,
    expiresAt: new Date(now.getTime() + 60_000),
  };
  const first = await runInTransaction(client, (session) =>
    repository.reserve(input, session),
  );
  const retry = await runInTransaction(client, (session) =>
    repository.reserve(input, session),
  );
  assert.equal(first.reused, false);
  assert.equal(retry.reused, true);
  await assert.rejects(
    runInTransaction(client, (session) =>
      repository.reserve(
        { ...input, requestFingerprint: requestFingerprint({ changed: true }) },
        session,
      ),
    ),
    /different request/,
  );
  const concurrentInput = {
    ...input,
    key: `phase1-concurrent-${new ObjectId().toHexString()}`,
  };
  const concurrent = await Promise.all([
    runInTransaction(client, (session) =>
      repository.reserve(concurrentInput, session),
    ),
    runInTransaction(client, (session) =>
      repository.reserve(concurrentInput, session),
    ),
  ]);
  assert.deepEqual(concurrent.map((result) => result.reused).sort(), [
    false,
    true,
  ]);
  assert.equal(
    concurrent[0]?.responseReference.applicationId,
    concurrent[1]?.responseReference.applicationId,
  );
  return actorId;
}

async function verifyGrowthQueries(db: Db, userId: ObjectId) {
  const reviewerId = new ObjectId();
  const statuses = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "APPROVED",
    "REJECTED",
  ] as const;
  const applications = Array.from({ length: 150 }, (_, index) =>
    applicationFixture({
      userId,
      reviewerId,
      status: statuses[index % statuses.length]!,
      at: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
    }),
  );
  await db.collection("applications").insertMany(applications);
  const historyApplicationId = applications[0]!._id as ObjectId;
  await db.collection("applicationStatusEvents").insertMany(
    Array.from({ length: 30 }, (_, index) => ({
      _id: new ObjectId(),
      applicationId: historyApplicationId,
      fromStatus: index === 0 ? null : "DRAFT",
      toStatus: "DRAFT",
      actorId: userId,
      actorRole: "USER",
      createdAt: new Date(Date.UTC(2026, 0, 1, 1, 0, index)),
    })),
  );

  await assertIndexedQuery(db, userApplicationQuery(userId));
  await assertIndexedQuery(db, userApplicationQuery(userId, "DRAFT"));
  await assertIndexedQuery(db, adminApplicationQuery("SUBMITTED"));
  await assertIndexedQuery(
    db,
    reviewerApplicationQuery(reviewerId, "UNDER_REVIEW"),
  );
  const history = statusHistoryQuery(historyApplicationId);
  const historyExplain = await db
    .collection("applicationStatusEvents")
    .find(history.filter)
    .sort(history.sort)
    .hint(history.hint)
    .explain("executionStats");
  assert.equal(hasStage(historyExplain, "COLLSCAN"), false);
  assert.equal(hasStage(historyExplain, "SORT"), false);

  const repository = new ApplicationRepository(db);
  const firstPage = await repository.listForUser({ userId, limit: 7 });
  assert.equal(firstPage.items.length, 7);
  assert(firstPage.nextCursor);
  const secondPage = await repository.listForUser({
    userId,
    limit: 7,
    cursor: firstPage.nextCursor,
  });
  assert.equal(secondPage.items.length, 7);
  assert.equal(
    firstPage.items.some((item) =>
      secondPage.items.some(({ id }) => id === item.id),
    ),
    false,
  );
  const narrow = await db
    .collection("applications")
    .findOne(
      { _id: applications[0]!._id },
      { projection: APPLICATION_LIST_PROJECTION },
    );
  assert(narrow);
  assert.equal("supplementalData" in narrow, false);
  assert.equal("profileSnapshot" in narrow, false);
}

async function main() {
  const config = loadConfig();
  let connection: Awaited<ReturnType<typeof connectDatabase>> | undefined;
  try {
    connection = await connectDatabase(config);
    await connection.db.dropDatabase();
    const firstRun = await runMigrations(connection.db);
    assert.deepEqual(firstRun, [
      "000-foundation",
      "001-contracts-and-persistence",
      "002-product-configuration-contracts",
    ]);
    assert.deepEqual(await runMigrations(connection.db), []);
    await verifySchemaAndIndexes(connection.db);
    await seedTestProducts(connection.db);
    const userId = await verifyTransactionsAndIdempotency(
      connection.db,
      connection.client,
    );
    await verifyValidators(connection.db, userId);
    await verifyGrowthQueries(connection.db, userId);
    await verifyProductCatalog(connection.db);
    console.log("Phase 1-3 database verification passed.");
  } catch (error) {
    console.error("Phase 1 database verification failed.", error);
    process.exitCode = 1;
  } finally {
    if (connection) {
      try {
        await connection.db.dropDatabase();
        await connection.client.close();
      } catch (error) {
        console.error("Verification database cleanup failed.", error);
        process.exitCode = 1;
      }
    }
  }
}

void main();
