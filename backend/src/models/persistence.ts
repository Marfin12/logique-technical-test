import type {
  ApplicationStatus,
  PaymentFrequency,
  PaymentMethod,
  Role,
} from "@insurance/contracts";
import type { Decimal128, Document, ObjectId } from "mongodb";

/** MongoDB persistence shapes; API and domain contracts remain separate. */
export interface UserDocument {
  _id: ObjectId;
  normalizedEmail: string;
  passwordHash: string;
  role: Role;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MasterProfileDocument {
  _id: ObjectId;
  userId: ObjectId;
  age: number;
  sumAssured: Decimal128;
  currency: string;
  paymentFrequency: PaymentFrequency;
  paymentMethod: PaymentMethod;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDocument {
  _id: ObjectId;
  name: string;
  active: boolean;
  testOnly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EligibilityConfigDocument {
  minimumAge: number;
  maximumAge: number;
  minimumSumAssured: Decimal128;
  maximumSumAssured: Decimal128;
  currency: string;
  paymentFrequencies: PaymentFrequency[];
  paymentMethods: PaymentMethod[];
}

export interface RatingConfigDocument {
  version: number;
  ratePerThousand: Decimal128;
  frequencyFactors: Record<PaymentFrequency, Decimal128>;
  paymentMethodFactors: Record<PaymentMethod, Decimal128>;
  roundingScale: number;
}

export interface SupplementalFieldDocument {
  key: string;
  label: string;
  type:
    | "text"
    | "multiline"
    | "integer"
    | "decimal"
    | "date"
    | "boolean"
    | "single-select"
    | "multi-select";
  required: boolean;
  options?: string[];
}

export interface ProductVersionDocument {
  _id: ObjectId;
  productId: ObjectId;
  version: number;
  insuranceTypes: string[];
  description: string;
  coverage: Record<string, string>;
  benefits: string[];
  limitations: string[];
  eligibilityConfig: EligibilityConfigDocument;
  ratingConfig: RatingConfigDocument;
  supplementalSchema: {
    version: number;
    fields: SupplementalFieldDocument[];
  };
  effectiveFrom: Date;
  effectiveTo: Date | null;
  testOnly: boolean;
}

export interface ApplicationDocument {
  _id: ObjectId;
  userId: ObjectId;
  productId: ObjectId;
  productVersionId: ObjectId;
  selectedInsuranceType?: string;
  status: ApplicationStatus;
  supplementalData: Document;
  profileSnapshot?: Document;
  productSnapshot?: Document;
  premiumSnapshot?: Document;
  reviewerId?: ObjectId;
  rejectionReason?: string;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  reviewStartedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
}

export interface ApplicationStatusEventDocument {
  _id: ObjectId;
  applicationId: ObjectId;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  actorId: ObjectId;
  actorRole: Role;
  reason?: string;
  createdAt: Date;
}

export interface IdempotencyRecordDocument {
  _id: ObjectId;
  actorId: ObjectId;
  commandScope: string;
  key: string;
  requestFingerprint: string;
  responseReference: Document;
  createdAt: Date;
  expiresAt: Date;
}
