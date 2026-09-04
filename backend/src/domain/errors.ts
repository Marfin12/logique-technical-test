import type {
  FieldErrorDto,
  ProductEligibilityReasonCode,
} from "@insurance/contracts";

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: FieldErrorDto[],
    readonly reasonCodes?: ProductEligibilityReasonCode[],
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

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication is required.") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class DomainValidationError extends AppError {
  constructor(message: string, fields?: FieldErrorDto[]) {
    super(422, "VALIDATION_ERROR", message, fields);
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

export class NotFoundError extends AppError {
  constructor(message = "Resource not found.") {
    super(404, "NOT_FOUND", message);
  }
}

export class ProfileIncompleteError extends AppError {
  constructor() {
    super(
      422,
      "PROFILE_INCOMPLETE",
      "Complete your master profile before viewing insurance products.",
    );
  }
}

export class ProductUnavailableError extends AppError {
  constructor() {
    super(404, "PRODUCT_UNAVAILABLE", "Insurance product is not available.");
  }
}

export class ProductIneligibleError extends AppError {
  constructor(reasonCodes: ProductEligibilityReasonCode[]) {
    super(
      422,
      "PRODUCT_INELIGIBLE",
      "This insurance product is not compatible with your current profile.",
      undefined,
      reasonCodes,
    );
  }
}
