"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function ReviewActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: "approve" | "reject") {
    if (action === "reject" && !reason.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/admin/applications/${applicationId}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body:
            action === "reject"
              ? JSON.stringify({ reason: reason.trim() })
              : undefined,
        },
      );
      if (response.status === 409) {
        setError("Status changed. The latest record has been loaded.");
        router.refresh();
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "Review action failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Review action failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-6 border-t border-slate-200 pt-6">
      <h2 className="font-bold text-slate-950">Decision</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act("approve")}
          className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy || !reason.trim()}
          onClick={() => void act("reject")}
          className="rounded-lg bg-red-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      <label className="mt-4 block text-sm font-semibold text-slate-700">
        Rejection reason
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
