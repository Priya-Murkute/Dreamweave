import { describe, expect, it } from "vitest";
import { isAuthFailure, isStoryId } from "@/lib/kv";

describe("isAuthFailure", () => {
  it("matches the Upstash rejection for a bad token or URL", () => {
    expect(
      isAuthFailure(new Error("Unauthorized, command was: [[\"set\",\"a\"]]")),
    ).toBe(true);
  });

  it("matches NOPERM, which is what a read-only token gives on a write", () => {
    expect(
      isAuthFailure(
        new Error("NOPERM this user has no permissions to run the 'set' command"),
      ),
    ).toBe(true);
  });

  it("matches regardless of case", () => {
    expect(isAuthFailure(new Error("UNAUTHORIZED"))).toBe(true);
    expect(isAuthFailure(new Error("noperm"))).toBe(true);
  });

  it("reads the error name too, not only the message", () => {
    const error = new Error("request failed");
    error.name = "UnauthorizedError";
    expect(isAuthFailure(error)).toBe(true);
  });

  it("leaves transient failures alone, so they still say 'try again'", () => {
    expect(isAuthFailure(new Error("fetch failed"))).toBe(false);
    expect(isAuthFailure(new Error("ETIMEDOUT"))).toBe(false);
    expect(isAuthFailure(new Error("Internal Server Error"))).toBe(false);
  });

  it("ignores the echoed command, which carries the user's own story", () => {
    // Upstash appends `, command was: [...]` including the payload. A dream
    // using the word must not be mistaken for a credential fault.
    const dream = "I dreamed I made an unauthorized copy of the moon";
    expect(
      isAuthFailure(
        new Error(
          `Internal Server Error, command was: [["set","id","{\\"dream\\":\\"${dream}\\"}","ex",2592000]]`,
        ),
      ),
    ).toBe(false);
  });

  it("still catches a real rejection that echoes such a story back", () => {
    const dream = "I dreamed I made an unauthorized copy of the moon";
    expect(
      isAuthFailure(
        new Error(
          `NOPERM this user has no permissions, command was: [["set","id","{\\"dream\\":\\"${dream}\\"}"]]`,
        ),
      ),
    ).toBe(true);
  });

  it("survives a non-Error being thrown", () => {
    expect(isAuthFailure("Unauthorized")).toBe(true);
    expect(isAuthFailure(null)).toBe(false);
    expect(isAuthFailure(undefined)).toBe(false);
  });
});

describe("isStoryId", () => {
  it("accepts a crypto.randomUUID() value", () => {
    expect(isStoryId(crypto.randomUUID())).toBe(true);
  });

  it("rejects anything that could reach another key in the store", () => {
    for (const value of [
      "not-a-uuid",
      "rate-limit:1.2.3.4",
      "*",
      "",
      "../admin",
      123,
      null,
      undefined,
    ]) {
      expect(isStoryId(value)).toBe(false);
    }
  });
});
