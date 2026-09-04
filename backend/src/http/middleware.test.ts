import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { ValidationError } from "../domain/errors.js";
import {
  errorHandler,
  requestIdMiddleware,
  validateBody,
} from "./middleware.js";

function testApp() {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.post(
    "/value",
    validateBody((body) => {
      if (!body || typeof body !== "object" || !("name" in body)) {
        throw new ValidationError("Invalid value.", [
          { field: "name", message: "Required." },
        ]);
      }
      return body;
    }),
    (_request, response) => response.status(204).end(),
  );
  app.use(errorHandler);
  return app;
}

describe("HTTP validation and error mapping", () => {
  it("preserves a valid request ID", async () => {
    const response = await request(testApp())
      .post("/value")
      .set("x-request-id", "request-1234")
      .send({ name: "ok" });
    expect(response.status).toBe(204);
    expect(response.headers["x-request-id"]).toBe("request-1234");
  });

  it("returns structured field errors and a generated request ID", async () => {
    const response = await request(testApp()).post("/value").send({});
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.fields).toEqual([
      { field: "name", message: "Required." },
    ]);
    expect(response.body.error.requestId).toBeTruthy();
  });

  it("maps malformed JSON without exposing parser details", async () => {
    const response = await request(testApp())
      .post("/value")
      .set("content-type", "application/json")
      .send('{"name":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_JSON");
    expect(response.body.error.message).toBe(
      "Request body contains invalid JSON.",
    );
  });
});
