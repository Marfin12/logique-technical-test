import { ValidationError } from "./errors.js";

export function parseChatMessage(value: unknown): string {
  const message =
    typeof (value as any)?.message === "string"
      ? (value as any).message.trim()
      : "";
  if (!message || message.length > 500)
    throw new ValidationError(
      "Message must contain between 1 and 500 characters.",
      [{ field: "message", message: "Enter a shorter question." }],
    );
  return message;
}

export const CHAT_KNOWLEDGE = {
  premium:
    "Your premium is calculated by the server from your saved profile, sum assured, payment choices, and the current product rating configuration. The submitted premium is then preserved in your application history.",
  frequencies:
    "Monthly means every month, quarterly means every 3 months, semi-annually means every 6 months, and annually means every 12 months.",
  statuses:
    "Draft means you are still editing. Submitted means it is waiting for review. Under Review means an admin has started reviewing it. Approved and Rejected are final statuses.",
  application:
    "Choosing an insurance type or changing a required product field creates a draft. Apply submits a complete draft; after submission it becomes read-only.",
  review:
    "A submitted application waits for an admin to explicitly start review. The admin may then approve it or reject it with a reason.",
} as const;
