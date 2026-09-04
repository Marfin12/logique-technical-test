import { randomUUID } from "node:crypto";

import type { ErrorRequestHandler, RequestHandler } from "express";

import type { ErrorDto } from "@insurance/contracts";

import { AppError, ValidationError } from "../domain/errors.js";

export const requestIdMiddleware: RequestHandler = (
  request,
  response,
  next,
) => {
  const supplied = request.header("x-request-id");
  const requestId =
    supplied && /^[A-Za-z0-9._:-]{8,128}$/.test(supplied)
      ? supplied
      : randomUUID();
  response.locals.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
};

export function validateBody<T>(parse: (value: unknown) => T): RequestHandler {
  return (request, response, next) => {
    try {
      response.locals.validatedBody = parse(request.body);
      next();
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : new ValidationError("Request validation failed."),
      );
    }
  };
}

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  const malformedJson =
    error instanceof SyntaxError &&
    typeof error === "object" &&
    "status" in error &&
    error.status === 400;
  const appError =
    error instanceof AppError
      ? error
      : malformedJson
        ? new AppError(
            400,
            "INVALID_JSON",
            "Request body contains invalid JSON.",
          )
        : undefined;
  if (!appError) {
    console.error({ requestId: response.locals.requestId, error });
  }
  const body: ErrorDto = {
    error: {
      code: appError?.code ?? "INTERNAL_ERROR",
      message: appError?.message ?? "An unexpected error occurred.",
      requestId: response.locals.requestId as string | undefined,
      ...(appError?.fields ? { fields: appError.fields } : {}),
    },
  };
  response.status(appError?.status ?? 500).json(body);
};
