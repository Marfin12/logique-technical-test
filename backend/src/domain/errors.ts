import type { FieldErrorDto } from "@insurance/contracts";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrorDto[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fields?: FieldErrorDto[]) {
    super(400, "VALIDATION_ERROR", message, fields);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "This action is not permitted.") {
    super(403, "FORBIDDEN", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}
