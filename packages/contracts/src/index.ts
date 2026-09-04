export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const PAYMENT_FREQUENCIES = [
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUALLY",
  "ANNUALLY",
] as const;
export type PaymentFrequency = (typeof PAYMENT_FREQUENCIES)[number];

export const PAYMENT_METHODS = ["RECURRING", "ONE_TIME"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const ADMIN_APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
] as const satisfies readonly ApplicationStatus[];
export type AdminApplicationStatus =
  (typeof ADMIN_APPLICATION_STATUSES)[number];

export interface MoneyDto {
  amount: string;
  currency: string;
}

export interface FieldErrorDto {
  field: string;
  message: string;
}

export interface ErrorDto {
  error: {
    code: string;
    message: string;
    requestId?: string;
    fields?: FieldErrorDto[];
    reasonCodes?: ProductEligibilityReasonCode[];
  };
}

export interface CursorPageDto<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApplicationListFiltersDto {
  status?: ApplicationStatus;
  limit?: number;
  cursor?: string;
}

export interface AdminApplicationListFiltersDto {
  status?: AdminApplicationStatus;
  reviewerId?: string;
  limit?: number;
  cursor?: string;
}

export interface ApplicationListItemDto {
  id: string;
  userId: string;
  productId: string;
  productVersionId: string;
  selectedInsuranceType?: string;
  status: ApplicationStatus;
  version: number;
  updatedAt: string;
  submittedAt?: string;
  reviewStartedAt?: string;
}

export type DraftTriggerDto =
  | { kind: "INSURANCE_TYPE_SELECTED"; insuranceType: string }
  | { kind: "SUPPLEMENTAL_FIELD_CHANGED"; fieldKey: string; value: unknown };

export interface CreateDraftRequestDto {
  productId: string;
  productVersionId?: string;
  trigger: DraftTriggerDto;
}

export interface DraftUpdateRequestDto {
  version: number;
  selectedInsuranceType?: string;
  supplementalData?: Readonly<Record<string, unknown>>;
}

export interface ApplicationDto extends ApplicationListItemDto {
  userId: string;
  supplementalData: Readonly<Record<string, unknown>>;
  createdAt: string;
}

export interface ApplicationResponseDto {
  application: ApplicationDto;
}

export interface IdempotencyKeyContract {
  key: string;
  commandScope: string;
  requestFingerprint: string;
}

export interface HealthResponse {
  status: "ok";
  service: "api";
}

export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface RegisterRequestDto {
  displayName: string;
  email: string;
  password: string;
}

export interface AccountDto {
  id: string;
  displayName: string;
  role: Role;
  profileComplete: boolean;
}

export interface LoginResponseDto {
  account: AccountDto;
  nextPath: "/profile/setup" | "/products" | "/admin/applications";
}

export interface CurrentAccountResponseDto {
  account: AccountDto;
}

export interface MasterProfileDto {
  age: number;
  sumAssured: MoneyDto;
  paymentFrequency: PaymentFrequency;
  paymentMethod: PaymentMethod;
  version: number;
  updatedAt: string;
}

export interface MasterProfileResponseDto {
  profile: MasterProfileDto | null;
}

export interface SaveMasterProfileRequestDto {
  age: number;
  sumAssured: MoneyDto;
  paymentFrequency: PaymentFrequency;
  paymentMethod: PaymentMethod;
}

export const PRODUCT_ELIGIBILITY_REASON_CODES = [
  "AGE_BELOW_MINIMUM",
  "AGE_ABOVE_MAXIMUM",
  "SUM_ASSURED_BELOW_MINIMUM",
  "SUM_ASSURED_ABOVE_MAXIMUM",
  "CURRENCY_UNSUPPORTED",
  "PAYMENT_FREQUENCY_UNSUPPORTED",
  "PAYMENT_METHOD_UNSUPPORTED",
] as const;
export type ProductEligibilityReasonCode =
  (typeof PRODUCT_ELIGIBILITY_REASON_CODES)[number];

export interface PremiumQuoteDto extends MoneyDto {
  paymentFrequency: PaymentFrequency;
}

export type SupplementalFieldType =
  | "text"
  | "multiline"
  | "integer"
  | "decimal"
  | "date"
  | "boolean"
  | "single-select"
  | "multi-select";

export interface SupplementalFieldDto {
  key: string;
  label: string;
  type: SupplementalFieldType;
  required: boolean;
  options?: readonly string[];
}

export interface SupplementalSchemaDto {
  version: number;
  fields: readonly SupplementalFieldDto[];
}

export interface ProductCatalogItemDto {
  id: string;
  versionId: string;
  version: number;
  name: string;
  insuranceTypes: readonly string[];
  description: string;
  premium: PremiumQuoteDto;
  testOnly: boolean;
}

export interface ProductDetailDto extends ProductCatalogItemDto {
  coverage: Readonly<Record<string, string>>;
  benefits: readonly string[];
  limitations: readonly string[];
  supplementalSchema: SupplementalSchemaDto;
}

export interface ProductCatalogResponseDto {
  items: readonly ProductCatalogItemDto[];
}

export interface ProductDetailResponseDto {
  product: ProductDetailDto;
}
