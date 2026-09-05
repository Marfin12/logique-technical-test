import { ObjectId } from "mongodb";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "../app.js";
import { SessionCodec } from "../domain/session.js";
import type { ApplicationService } from "../services/application-service.js";

const USER_ID = new ObjectId("650000000000000000000202");

function context() {
  const sessionCodec = new SessionCodec("phase-8-test-secret".padEnd(32, "x"));
  const applicationService = {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    createDraft: vi.fn(),
    submit: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const app = createApp({
    readiness: vi.fn().mockResolvedValue(undefined),
    phase4: {
      applicationService: applicationService as unknown as ApplicationService,
      sessionCodec,
    },
  });
  const token = sessionCodec.issue({
    id: USER_ID.toHexString(),
    role: "USER",
  });
  return {
    app,
    applicationService,
    cookie: `insurance_session=${token}`,
  };
}

describe("Phase 8 application route hardening", () => {
  it("rejects non-canonical application status filters", async () => {
    const { app, applicationService, cookie } = context();
    const response = await request(app)
      .get("/api/v1/me/applications?status=ANYTHING")
      .set("cookie", cookie);

    expect(response.status).toBe(422);
    expect(applicationService.list).not.toHaveBeenCalled();
  });

  it("rejects cross-site draft and submission mutations", async () => {
    const { app, applicationService, cookie } = context();
    const draft = await request(app)
      .post("/api/v1/me/applications/drafts")
      .set("cookie", cookie)
      .set("sec-fetch-site", "cross-site")
      .send({});
    const submit = await request(app)
      .post(`/api/v1/me/applications/${new ObjectId().toHexString()}/submit`)
      .set("cookie", cookie)
      .set("origin", "http://attacker.example")
      .set("host", "insurance.example");

    expect(draft.status).toBe(403);
    expect(submit.status).toBe(403);
    expect(applicationService.createDraft).not.toHaveBeenCalled();
    expect(applicationService.submit).not.toHaveBeenCalled();
  });
});
