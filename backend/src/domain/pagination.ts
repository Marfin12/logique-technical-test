import { ObjectId } from "mongodb";

import { ValidationError } from "./errors.js";

export interface DateCursor {
  date: Date;
  id: ObjectId;
}

export function pageLimit(value: unknown, maximum = 100): number {
  if (value === undefined) return 25;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    throw new ValidationError(`limit must be an integer from 1 to ${maximum}.`);
  }
  return limit;
}

export function encodeDateCursor(cursor: DateCursor): string {
  return Buffer.from(
    JSON.stringify({
      date: cursor.date.toISOString(),
      id: cursor.id.toHexString(),
    }),
  ).toString("base64url");
}

export function decodeDateCursor(value: string): DateCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as {
      date?: unknown;
      id?: unknown;
    };
    if (typeof parsed.date !== "string" || typeof parsed.id !== "string")
      throw new Error();
    const date = new Date(parsed.date);
    if (Number.isNaN(date.getTime()) || !ObjectId.isValid(parsed.id))
      throw new Error();
    return { date, id: new ObjectId(parsed.id) };
  } catch {
    throw new ValidationError("Invalid pagination cursor.");
  }
}

export function descendingCursorFilter(field: string, cursor: DateCursor) {
  return {
    $or: [
      { [field]: { $lt: cursor.date } },
      { [field]: cursor.date, _id: { $lt: cursor.id } },
    ],
  };
}
