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
