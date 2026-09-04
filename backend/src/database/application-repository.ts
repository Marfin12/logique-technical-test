import type {
  AdminApplicationStatus,
  ApplicationListItemDto,
  ApplicationStatus,
  CursorPageDto,
} from "@insurance/contracts";
import type { Db, ObjectId } from "mongodb";

import {
  decodeDateCursor,
  encodeDateCursor,
  pageLimit,
} from "../domain/pagination.js";
import {
  adminApplicationQuery,
  APPLICATION_LIST_PROJECTION,
  reviewerApplicationQuery,
  statusHistoryQuery,
  userApplicationQuery,
} from "./application-queries.js";
import type {
  ApplicationDocument,
  ApplicationStatusEventDocument,
} from "../models/persistence.js";

function toListItem(document: ApplicationDocument): ApplicationListItemDto {
  return {
    id: document._id.toHexString(),
    userId: document.userId.toHexString(),
    productId: document.productId.toHexString(),
    productVersionId: document.productVersionId.toHexString(),
    ...(document.selectedInsuranceType
      ? { selectedInsuranceType: document.selectedInsuranceType }
      : {}),
    status: document.status,
    version: document.version,
    updatedAt: document.updatedAt.toISOString(),
    ...(document.submittedAt
      ? { submittedAt: document.submittedAt.toISOString() }
      : {}),
    ...(document.reviewStartedAt
      ? { reviewStartedAt: document.reviewStartedAt.toISOString() }
      : {}),
  };
}

export class ApplicationRepository {
  constructor(private readonly db: Db) {}

  async listForUser(input: {
    userId: ObjectId;
    status?: ApplicationStatus;
    limit?: number;
    cursor?: string;
  }): Promise<CursorPageDto<ApplicationListItemDto>> {
    const limit = pageLimit(input.limit);
    const query = userApplicationQuery(
      input.userId,
      input.status,
      input.cursor ? decodeDateCursor(input.cursor) : undefined,
    );
    const documents = await this.db
      .collection<ApplicationDocument>("applications")
      .find(query.filter, { projection: APPLICATION_LIST_PROJECTION })
      .sort(query.sort)
      .hint(query.hint)
      .limit(limit + 1)
      .toArray();
    return this.page(documents, limit, "updatedAt");
  }

  async listForAdmin(input: {
    status: AdminApplicationStatus;
    limit?: number;
    cursor?: string;
  }): Promise<CursorPageDto<ApplicationListItemDto>> {
    const limit = pageLimit(input.limit);
    const query = adminApplicationQuery(
      input.status,
      input.cursor ? decodeDateCursor(input.cursor) : undefined,
    );
    const documents = await this.db
      .collection<ApplicationDocument>("applications")
      .find(query.filter, { projection: APPLICATION_LIST_PROJECTION })
      .sort(query.sort)
      .hint(query.hint)
      .limit(limit + 1)
      .toArray();
    return this.page(documents, limit, "submittedAt");
  }

  async listForReviewer(input: {
    reviewerId: ObjectId;
    status: AdminApplicationStatus;
    limit?: number;
    cursor?: string;
  }): Promise<CursorPageDto<ApplicationListItemDto>> {
    const limit = pageLimit(input.limit);
    const query = reviewerApplicationQuery(
      input.reviewerId,
      input.status,
      input.cursor ? decodeDateCursor(input.cursor) : undefined,
    );
    const documents = await this.db
      .collection<ApplicationDocument>("applications")
      .find(query.filter, { projection: APPLICATION_LIST_PROJECTION })
      .sort(query.sort)
      .hint(query.hint)
      .limit(limit + 1)
      .toArray();
    return this.page(documents, limit, "reviewStartedAt");
  }

  async statusHistory(
    applicationId: ObjectId,
  ): Promise<ApplicationStatusEventDocument[]> {
    const query = statusHistoryQuery(applicationId);
    return this.db
      .collection<ApplicationStatusEventDocument>("applicationStatusEvents")
      .find(query.filter)
      .sort(query.sort)
      .hint(query.hint)
      .toArray();
  }

  private page(
    documents: ApplicationDocument[],
    limit: number,
    cursorField: "updatedAt" | "submittedAt" | "reviewStartedAt",
  ): CursorPageDto<ApplicationListItemDto> {
    const hasNext = documents.length > limit;
    const items = documents.slice(0, limit);
    const last = items.at(-1);
    const cursorDate = last?.[cursorField];
    return {
      items: items.map(toListItem),
      nextCursor:
        hasNext && last && cursorDate
          ? encodeDateCursor({ date: cursorDate, id: last._id })
          : null,
    };
  }
}
