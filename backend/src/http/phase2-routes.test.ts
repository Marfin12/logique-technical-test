import request from "supertest";
import { Decimal128, ObjectId } from "mongodb";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { Role } from "@insurance/contracts";

import { createApp } from "../app.js";
import { hashPassword } from "../domain/credentials.js";
import { ConflictError } from "../domain/errors.js";
import { SessionCodec } from "../domain/session.js";
import type {
  MasterProfileDocument,
  UserDocument,
} from "../models/persistence.js";
import { AuthService } from "../services/auth-service.js";
import {
  ProfileService,
  type ProfileStore,
} from "../services/profile-service.js";

const USER_ID = new ObjectId("650000000000000000000401");
const PROFILED_USER_ID = new ObjectId("650000000000000000000402");
const ADMIN_ID = new ObjectId("650000000000000000000403");
const NOW = new Date("2026-01-01T00:00:00.000Z");
let passwordHash = "";

beforeAll(async () => {
  passwordHash = await hashPassword("ValidPassword123!", Buffer.alloc(16, 5));
});

function user(id: ObjectId, email: string, role: Role): UserDocument {
  return {
    _id: id,
    normalizedEmail: email,
    passwordHash,
    role,
    displayName: `${role} fixture`,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

class MemoryProfiles implements ProfileStore {
  readonly values = new Map<string, MasterProfileDocument>();

  findByUserId(userId: string) {
    return Promise.resolve(this.values.get(userId) ?? null);
  }

  save(userId: string, input: Parameters<ProfileStore["save"]>[1]) {
    const previous = this.values.get(userId);
    const value: MasterProfileDocument = {
      _id: previous?._id ?? new ObjectId(),
      userId: new ObjectId(userId),
      ...input,
      version: (previous?.version ?? 0) + 1,
      createdAt: previous?.createdAt ?? NOW,
      updatedAt: NOW,
    };
    this.values.set(userId, value);
    return Promise.resolve(value);
  }
}

function testContext() {
  const users = [
    user(USER_ID, "new@example.test", "USER"),
    user(PROFILED_USER_ID, "profiled@example.test", "USER"),
    user(ADMIN_ID, "admin@example.test", "ADMIN"),
  ];
  const profiles = new MemoryProfiles();
  void profiles.save(PROFILED_USER_ID.toHexString(), {
    age: 40,
    sumAssured: Decimal128.fromString("1000.00"),
    currency: "IDR",
    paymentFrequency: "MONTHLY",
    paymentMethod: "RECURRING",
  });
  const authService = new AuthService(
    {
      findByEmail: (email) =>
        Promise.resolve(
          users.find((item) => item.normalizedEmail === email) ?? null,
        ),
      findById: (id) =>
        Promise.resolve(
          users.find((item) => item._id.toHexString() === id) ?? null,
        ),
      create: (input) => {
        if (
          users.some((item) => item.normalizedEmail === input.normalizedEmail)
        ) {
          return Promise.reject(
            new ConflictError(
              "An account could not be created with these details.",
            ),
          );
        }
        const created: UserDocument = {
          _id: new ObjectId(),
          ...input,
          createdAt: NOW,
          updatedAt: NOW,
        };
        users.push(created);
        return Promise.resolve(created);
      },
    },
    profiles,
  );
  const sessionCodec = new SessionCodec(
    "test-secret-that-is-at-least-32-chars",
  );
  return {
    profiles,
    sessionCodec,
    app: createApp({
      readiness: () => Promise.resolve(),
      phase2: {
        authService,
        profileService: new ProfileService(profiles),
        sessionCodec,
      },
    }),
  };
}

describe("Phase 2 authentication and profile API", () => {
  it("registers only a user account and starts profile setup", async () => {
    const { app } = testContext();
    const invalid = await request(app).post("/api/v1/auth/register").send({
      displayName: "A",
      email: "invalid",
      password: "weak",
    });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.fields).toHaveLength(3);

    const agent = request.agent(app);
    const created = await agent.post("/api/v1/auth/register").send({
      displayName: "New Customer",
      email: "NEW.CUSTOMER@example.test",
      password: "StrongPassword123!",
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      account: { role: "USER", profileComplete: false },
      nextPath: "/profile/setup",
    });
    expect((await agent.get("/api/v1/me")).body.account.role).toBe("USER");

    const duplicate = await request(app).post("/api/v1/auth/register").send({
      displayName: "Another Customer",
      email: "new.customer@example.test",
      password: "StrongPassword123!",
    });
    expect(duplicate.status).toBe(409);
  });

  it("returns the correct destination for each authenticated account", async () => {
    const { app } = testContext();
    for (const [email, nextPath] of [
      ["new@example.test", "/profile/setup"],
      ["profiled@example.test", "/products"],
      ["admin@example.test", "/admin/applications"],
    ] as const) {
      const response = await request(app).post("/api/v1/auth/login").send({
        email,
        password: "ValidPassword123!",
      });
      expect(response.status).toBe(200);
      expect(response.body.nextPath).toBe(nextPath);
      expect(response.headers["set-cookie"]?.[0]).toMatch(
        /HttpOnly; SameSite=Strict/,
      );
    }
  });

  it("uses the same safe response for unknown accounts and wrong passwords", async () => {
    const { app } = testContext();
    const unknown = await request(app).post("/api/v1/auth/login").send({
      email: "unknown@example.test",
      password: "ValidPassword123!",
    });
    const wrong = await request(app).post("/api/v1/auth/login").send({
      email: "new@example.test",
      password: "WrongPassword123!",
    });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it("counts only failed credentials and resets after a successful login", async () => {
    const { app } = testContext();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const failed = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "new@example.test",
          password: "WrongPassword123!",
        })
        .set("x-forwarded-for", "203.0.113.10");
      expect(failed.status).toBe(401);
    }
    expect(
      (
        await request(app)
          .post("/api/v1/auth/login")
          .set("x-forwarded-for", "203.0.113.10")
          .send({
            email: "new@example.test",
            password: "WrongPassword123!",
          })
      ).status,
    ).toBe(429);

    const successful = await request(app)
      .post("/api/v1/auth/login")
      .set("x-forwarded-for", "203.0.113.10")
      .send({
        email: "new@example.test",
        password: "ValidPassword123!",
      });
    expect(successful.status).toBe(200);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const failed = await request(app)
        .post("/api/v1/auth/login")
        .set("x-forwarded-for", "203.0.113.10")
        .send({
          email: "new@example.test",
          password: "WrongPassword123!",
        });
      expect(failed.status).toBe(401);
    }
  });

  it("persists and returns only the authenticated user's valid profile", async () => {
    const { app, profiles } = testContext();
    const agent = request.agent(app);
    await agent.post("/api/v1/auth/login").send({
      email: "new@example.test",
      password: "ValidPassword123!",
    });

    const invalid = await agent.put("/api/v1/me/profile").send({
      age: -1,
      sumAssured: { amount: "0", currency: "IDR" },
      paymentFrequency: "WEEKLY",
      paymentMethod: "CASH",
    });
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.fields).toHaveLength(4);

    const saved = await agent.put("/api/v1/me/profile").send({
      age: 31,
      sumAssured: { amount: "250000000.00", currency: "IDR" },
      paymentFrequency: "ANNUALLY",
      paymentMethod: "ONE_TIME",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.profile.sumAssured.amount).toBe("250000000.00");
    expect(profiles.values.has(USER_ID.toHexString())).toBe(true);

    const returned = await agent.get("/api/v1/me/profile");
    expect(returned.body).toEqual(saved.body);
  });

  it("rejects unauthenticated, tampered, cross-role, and cross-origin access", async () => {
    const { app, sessionCodec } = testContext();
    expect((await request(app).get("/api/v1/me/profile")).status).toBe(401);

    const tampered = `${sessionCodec.issue({ id: USER_ID.toHexString(), role: "USER" })}x`;
    expect(
      (
        await request(app)
          .get("/api/v1/me/profile")
          .set("cookie", `insurance_session=${tampered}`)
      ).status,
    ).toBe(401);

    const admin = sessionCodec.issue({
      id: ADMIN_ID.toHexString(),
      role: "ADMIN",
    });
    expect(
      (
        await request(app)
          .put("/api/v1/me/profile")
          .set("cookie", `insurance_session=${admin}`)
          .send({})
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .post("/api/v1/auth/logout")
          .set("origin", "http://attacker.example")
          .set("host", "insurance.example")
      ).status,
    ).toBe(403);

    expect(
      (
        await request(app)
          .post("/api/v1/auth/logout")
          .set("sec-fetch-site", "cross-site")
      ).status,
    ).toBe(403);
  });

  it("clears the session cookie on logout", async () => {
    const { app } = testContext();
    const response = await request(app).post("/api/v1/auth/logout");
    expect(response.status).toBe(204);
    expect(response.headers["set-cookie"]?.[0]).toContain("Max-Age=0");
  });

  it("returns a controlled error when a profile database operation fails", async () => {
    const { app, profiles, sessionCodec } = testContext();
    vi.spyOn(profiles, "findByUserId").mockRejectedValueOnce(
      new Error("database unavailable"),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const token = sessionCodec.issue({
      id: USER_ID.toHexString(),
      role: "USER",
    });
    const failed = await request(app)
      .get("/api/v1/me/profile")
      .set("cookie", `insurance_session=${token}`);
    const healthy = await request(app).get("/health");
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe("INTERNAL_ERROR");
    expect(healthy.status).toBe(200);
    log.mockRestore();
  });
});
