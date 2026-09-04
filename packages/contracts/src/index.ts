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
