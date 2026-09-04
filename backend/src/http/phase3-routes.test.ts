import request from "supertest";
import { Decimal128, ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import type {
  ActiveProductVersion,
  ProductStore,
} from "../database/product-repository.js";
import { SessionCodec } from "../domain/session.js";
import type {
  EligibilityConfigDocument,
  MasterProfileDocument,
  ProductVersionDocument,
} from "../models/persistence.js";
import { ProductService } from "../services/product-service.js";

const USER_ID = new ObjectId("650000000000000000000501");
const NOW = new Date("2026-01-01T00:00:00.000Z");

function eligibility(
  overrides: Partial<EligibilityConfigDocument> = {},
): EligibilityConfigDocument {
  return {
    minimumAge: 18,
    maximumAge: 65,
    minimumSumAssured: Decimal128.fromString("10000000.00"),
    maximumSumAssured: Decimal128.fromString("1000000000.00"),
    currency: "IDR",
    paymentFrequencies: ["MONTHLY", "QUARTERLY", "SEMI_ANNUALLY", "ANNUALLY"],
    paymentMethods: ["RECURRING", "ONE_TIME"],
    ...overrides,
  };
}

function candidate(
  idSuffix: string,
  config = eligibility(),
): ActiveProductVersion {
  const productId = new ObjectId(`650000000000000000000${idSuffix}`);
  const version: ProductVersionDocument = {
    _id: new ObjectId(`650000000000000000001${idSuffix}`),
    productId,
    version: 1,
    insuranceTypes: ["TERM_LIFE"],
    description: "Configured test product",
    coverage: { currency: "IDR", summary: "Test coverage" },
    benefits: ["Test benefit"],
    limitations: ["Test limitation"],
    eligibilityConfig: config,
    ratingConfig: {
      version: 1,
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
    },
    supplementalSchema: { version: 1, fields: [] },
    effectiveFrom: NOW,
    effectiveTo: null,
    testOnly: true,
  };
  return {
    product: {
      _id: productId,
      name: `[TEST ONLY] Product ${idSuffix}`,
      active: true,
      testOnly: true,
      createdAt: NOW,
      updatedAt: NOW,
    },
    version,
  };
}

function context(profile: MasterProfileDocument | null) {
  const compatible = candidate("601");
  const restricted = candidate(
    "602",
    eligibility({ paymentFrequencies: ["ANNUALLY"] }),
  );
  const candidates = [compatible, restricted];
  const products: ProductStore = {
    listActive: () => Promise.resolve(candidates),
    findActiveById: (id) =>
      Promise.resolve(
        candidates.find(({ product }) => product._id.toHexString() === id) ??
          null,
      ),
  };
  const sessionCodec = new SessionCodec(
    "test-secret-that-is-at-least-32-chars",
  );
  const app = createApp({
    readiness: () => Promise.resolve(),
    phase3: {
      productService: new ProductService(
        { findByUserId: () => Promise.resolve(profile) },
        products,
        () => NOW,
      ),
      sessionCodec,
    },
  });
  return { app, candidates, sessionCodec };
}

function userProfile(): MasterProfileDocument {
  return {
    _id: new ObjectId(),
    userId: USER_ID,
    age: 35,
    sumAssured: Decimal128.fromString("500000000.00"),
    currency: "IDR",
    paymentFrequency: "MONTHLY",
    paymentMethod: "RECURRING",
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function cookie(codec: SessionCodec, role: "USER" | "ADMIN" = "USER") {
  return `insurance_session=${codec.issue({ id: USER_ID.toHexString(), role })}`;
}

describe("Phase 3 product API", () => {
  it("returns only eligible products and uses the same quote for detail", async () => {
    const { app, candidates, sessionCodec } = context(userProfile());
    const catalog = await request(app)
      .get("/api/v1/products")
      .set("cookie", cookie(sessionCodec));
    expect(catalog.status).toBe(200);
    expect(catalog.body.items).toHaveLength(1);
    expect(catalog.body.items[0].premium.amount).toBe("108000.00");

    const detail = await request(app)
      .get(`/api/v1/products/${candidates[0]!.product._id.toHexString()}`)
      .set("cookie", cookie(sessionCodec));
    expect(detail.status).toBe(200);
    expect(detail.body.product.premium).toEqual(catalog.body.items[0].premium);
    expect(detail.body.product.coverage.summary).toBe("Test coverage");
  });

  it("returns safe profile, ineligibility, and unavailability errors", async () => {
    const incomplete = context(null);
    const missingProfile = await request(incomplete.app)
      .get("/api/v1/products")
      .set("cookie", cookie(incomplete.sessionCodec));
    expect(missingProfile.status).toBe(422);
    expect(missingProfile.body.error.code).toBe("PROFILE_INCOMPLETE");

    const current = context(userProfile());
    const ineligible = await request(current.app)
      .get(
        `/api/v1/products/${current.candidates[1]!.product._id.toHexString()}`,
      )
      .set("cookie", cookie(current.sessionCodec));
    expect(ineligible.status).toBe(422);
    expect(ineligible.body.error).toMatchObject({
      code: "PRODUCT_INELIGIBLE",
      reasonCodes: ["PAYMENT_FREQUENCY_UNSUPPORTED"],
    });

    const unavailable = await request(current.app)
      .get("/api/v1/products/not-an-object-id")
      .set("cookie", cookie(current.sessionCodec));
    expect(unavailable.status).toBe(404);
    expect(unavailable.body.error.code).toBe("PRODUCT_UNAVAILABLE");
  });

  it("rejects unauthenticated users and admins", async () => {
    const { app, sessionCodec } = context(userProfile());
    expect((await request(app).get("/api/v1/products")).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/v1/products")
          .set("cookie", cookie(sessionCodec, "ADMIN"))
      ).status,
    ).toBe(403);
  });
});
