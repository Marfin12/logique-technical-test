import { describe, expect, it } from "vitest";
import { parseChatMessage } from "./chat.js";
describe("chat input", () => {
  it("trims bounded messages", () =>
    expect(parseChatMessage({ message: "  premium?  " })).toBe("premium?"));
  it("rejects empty and oversized messages", () => {
    expect(() => parseChatMessage({ message: " " })).toThrow();
    expect(() => parseChatMessage({ message: "x".repeat(501) })).toThrow();
  });
});
