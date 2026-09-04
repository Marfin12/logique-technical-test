import type {
  AdminApplicationStatus,
  ApplicationStatus,
} from "@insurance/contracts";
import type { Document, ObjectId, Sort } from "mongodb";

import {
  descendingCursorFilter,
  type DateCursor,
} from "../domain/pagination.js";

export const APPLICATION_LIST_PROJECTION = {
  _id: 1,
  userId: 1,
  productId: 1,
  productVersionId: 1,
  selectedInsuranceType: 1,
  status: 1,
  version: 1,
  updatedAt: 1,
  submittedAt: 1,
  reviewStartedAt: 1,
  "productSnapshot.name": 1,
} as const;

interface QuerySpec {
  filter: Document;
  sort: Sort;
  hint: string;
}

function withCursor(
  filter: Document,
  field: string,
  cursor?: DateCursor,
): Document {
  return cursor
    ? { $and: [filter, descendingCursorFilter(field, cursor)] }
    : filter;
}

export function userApplicationQuery(
  userId: ObjectId,
  status?: ApplicationStatus,
  cursor?: DateCursor,
): QuerySpec {
  return {
    filter: withCursor(
      { userId, isDeleted: false, ...(status ? { status } : {}) },
      "updatedAt",
      cursor,
    ),
    sort: { updatedAt: -1, _id: -1 },
    hint: status
      ? "idx_applications_user_status_recent"
      : "idx_applications_user_recent",
  };
}

export function adminApplicationQuery(
  status: AdminApplicationStatus,
  cursor?: DateCursor,
): QuerySpec {
  return {
    filter: withCursor({ status, isDeleted: false }, "submittedAt", cursor),
    sort: { submittedAt: -1, _id: -1 },
    hint: "idx_applications_admin_queue",
  };
}

export function reviewerApplicationQuery(
  reviewerId: ObjectId,
  status: AdminApplicationStatus,
  cursor?: DateCursor,
): QuerySpec {
  return {
    filter: withCursor(
      { reviewerId, status, isDeleted: false },
      "reviewStartedAt",
      cursor,
    ),
    sort: { reviewStartedAt: -1, _id: -1 },
    hint: "idx_applications_reviewer_queue",
  };
}

export function statusHistoryQuery(applicationId: ObjectId): QuerySpec {
  return {
    filter: { applicationId },
    sort: { createdAt: 1, _id: 1 },
    hint: "idx_status_events_application_time",
  };
}
