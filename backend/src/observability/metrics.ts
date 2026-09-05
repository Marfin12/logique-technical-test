export interface MetricsSnapshot {
  apiRequests: number;
  apiErrors: number;
  draftSaveAttempts: number;
  draftSaveFailures: number;
  ratingRequests: number;
  ratingFailures: number;
  submissions: number;
  submissionFailures: number;
  adminTransitions: number;
  adminTransitionConflicts: number;
  chatRequests: number;
  chatFailures: number;
}

const initialMetrics = (): MetricsSnapshot => ({
  apiRequests: 0,
  apiErrors: 0,
  draftSaveAttempts: 0,
  draftSaveFailures: 0,
  ratingRequests: 0,
  ratingFailures: 0,
  submissions: 0,
  submissionFailures: 0,
  adminTransitions: 0,
  adminTransitionConflicts: 0,
  chatRequests: 0,
  chatFailures: 0,
});

export class OperationalMetrics {
  private values = initialMetrics();

  observeRequest(method: string, path: string, status: number): void {
    this.values.apiRequests += 1;
    if (status >= 500) this.values.apiErrors += 1;

    const isDraftSave =
      (method === "POST" && path === "/api/v1/me/applications/drafts") ||
      (method === "PATCH" &&
        /^\/api\/v1\/me\/applications\/[^/]+\/draft$/.test(path));
    if (isDraftSave) {
      this.values.draftSaveAttempts += 1;
      if (status >= 400) this.values.draftSaveFailures += 1;
    }

    if (method === "GET" && path.startsWith("/api/v1/products")) {
      this.values.ratingRequests += 1;
      if (status >= 500) this.values.ratingFailures += 1;
    }

    if (
      method === "POST" &&
      /^\/api\/v1\/me\/applications\/[^/]+\/submit$/.test(path)
    ) {
      if (status < 400) this.values.submissions += 1;
      else this.values.submissionFailures += 1;
    }

    if (
      method === "POST" &&
      /^\/api\/v1\/admin\/applications\/[^/]+\/(start-review|approve|reject)$/.test(
        path,
      )
    ) {
      if (status < 400) this.values.adminTransitions += 1;
      if (status === 409) this.values.adminTransitionConflicts += 1;
    }

    if (method === "POST" && path === "/api/v1/chat/messages") {
      this.values.chatRequests += 1;
      if (status >= 400) this.values.chatFailures += 1;
    }
  }

  snapshot(): Readonly<MetricsSnapshot> {
    return { ...this.values };
  }

  reset(): void {
    this.values = initialMetrics();
  }
}

export const operationalMetrics = new OperationalMetrics();
