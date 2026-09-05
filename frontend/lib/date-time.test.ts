import { describe, expect, it } from "vitest";

import { formatWibDateTime } from "./date-time";

describe("WIB date formatting", () => {
  it("converts UTC timestamps to Asia/Jakarta time", () => {
    const result = formatWibDateTime("2026-01-01T00:00:00.000Z");
    expect(result).toContain("07:00:00");
    expect(result).toContain("01 Jan 2026");
    expect(result).toMatch(/ WIB$/);
  });

  it("safely handles invalid timestamps", () => {
    expect(formatWibDateTime("not-a-date")).toBe("—");
  });
});
