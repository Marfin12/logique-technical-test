"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function StartReviewButton({
  applicationId,
}: {
  applicationId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/admin/applications/${applicationId}/start-review`,
        { method: "POST" },
      );
      if (response.status === 409) {
        setError("Status changed. Refreshing…");
        router.refresh();
        return;
      }
      if (!response.ok) throw new Error();
      router.push(`/admin/applications/${applicationId}`);
    } catch {
      setError("Unable to start review.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Starting…" : "Start Review"}
      </button>
      {error ? (
        <p className="mt-1 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
