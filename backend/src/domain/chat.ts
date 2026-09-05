import { ValidationError } from "./errors.js";

export function parseChatMessage(value: unknown): string {
  const body =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 500)
    throw new ValidationError(
      "Message must contain between 1 and 500 characters.",
      [{ field: "message", message: "Enter a shorter question." }],
    );
  return message;
}

const PROMPT_EXTRACTION_TERMS =
  /\b(repeat|reveal|show|display|print|quote|copy|return|output|extract|give|provide|recite|summarize|translate|encode|decode|reproduce|dump|verbatim|between|above|hidden)\b/;
const TRUSTED_CONTEXT_TERMS =
  /\b(system|developer|prompt|instruction|knowledge|context|reference|content)\b/;
const PRIVILEGED_ROLE_TERMS =
  /\b(admin(?:istrator)?|reviewer|underwriter|staff|back[ -]?office|privileged?)\b/;
const PRIVILEGED_ACCESS_TERMS =
  /\b(access|credential|password|secret|token|permission|role|tool|panel|dashboard|login|endpoint|api|bypass|elevat(?:e|ion))\b/;
const MUTATION_TERMS =
  /\b(change|update|approve|reject|delete|submit|start review|modify|override)\b.{0,40}\b(application|status|decision|review)\b/;
const OTHER_USER_TERMS =
  /\b(other|another|someone else(?:'s)?)\b.{0,30}\b(user|customer|applicant|application|profile|status|data)\b/;

export const SAFE_CHAT_REFUSAL =
  "I can only provide general insurance information and read your own application status. I cannot expose internal instructions, provide administrative access guidance, access other-user data, or change an application.";

export function isRestrictedChatMessage(message: string): boolean {
  const text = message.toLowerCase().replace(/\s+/g, " ").trim();
  const requestsPromptExtraction =
    (PROMPT_EXTRACTION_TERMS.test(text) && TRUSTED_CONTEXT_TERMS.test(text)) ||
    /\bknowledge\s*:|\banswer\s*:/.test(text) ||
    /ignore\b.{0,40}\b(previous|system|developer|instruction)/.test(text);
  const requestsPrivilegedAccess =
    PRIVILEGED_ROLE_TERMS.test(text) && PRIVILEGED_ACCESS_TERMS.test(text);
  return (
    requestsPromptExtraction ||
    requestsPrivilegedAccess ||
    MUTATION_TERMS.test(text) ||
    OTHER_USER_TERMS.test(text)
  );
}

export function approvedKnowledgeForChatMessage(
  message: string,
): (typeof CHAT_KNOWLEDGE)[keyof typeof CHAT_KNOWLEDGE] | null {
  const text = message.toLowerCase();
  if (/premium|price|cost|calculation/.test(text))
    return CHAT_KNOWLEDGE.premium;
  if (/quarter|semi.?annual|monthly|frequency|payment term/.test(text))
    return CHAT_KNOWLEDGE.frequencies;
  if (/status|draft|submitted|approved|rejected/.test(text))
    return CHAT_KNOWLEDGE.statuses;
  if (/apply|application|insurance type/.test(text))
    return CHAT_KNOWLEDGE.application;
  if (/review|decision/.test(text)) return CHAT_KNOWLEDGE.review;
  return null;
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
