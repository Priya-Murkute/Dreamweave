import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAuthFailure, isStoryId, kvConfigProblem } from "@/lib/kv";

describe("kvConfigProblem", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("passes a well-formed REST endpoint", () => {
    process.env.KV_REST_API_URL = "https://apt-lion-12345.upstash.io";
    process.env.KV_REST_API_TOKEN = "AXbCsomeTokenValue";
    expect(kvConfigProblem()).toBeNull();
  });

  it("allows http, so a local stand-in can be pointed at", () => {
    process.env.KV_REST_API_URL = "http://127.0.0.1:4999";
    process.env.KV_REST_API_TOKEN = "t";
    expect(kvConfigProblem()).toBeNull();
  });

  it("names whichever variable is missing", () => {
    expect(kvConfigProblem()).toMatch(/both|unset/i);

    process.env.KV_REST_API_URL = "https://apt-lion-12345.upstash.io";
    expect(kvConfigProblem()).toMatch(/KV_REST_API_TOKEN is unset/);

    delete process.env.KV_REST_API_URL;
    process.env.KV_REST_API_TOKEN = "t";
    expect(kvConfigProblem()).toMatch(/KV_REST_API_URL is unset/);
  });

  it("treats whitespace-only values as unset", () => {
    process.env.KV_REST_API_URL = "   ";
    process.env.KV_REST_API_TOKEN = "  ";
    expect(kvConfigProblem()).toMatch(/unset/);
  });

  it("rejects the redis:// connection string, the usual mix-up", () => {
    process.env.KV_REST_API_URL =
      "redis://default:sometoken@apt-lion-12345.upstash.io:6379";
    process.env.KV_REST_API_TOKEN = "t";
    expect(kvConfigProblem()).toMatch(/REST endpoint/);
  });

  it("never echoes the URL, since redis:// embeds the password", () => {
    process.env.KV_REST_API_URL =
      "redis://default:hunter2SECRET@apt-lion-12345.upstash.io:6379";
    process.env.KV_REST_API_TOKEN = "t";
    const problem = kvConfigProblem() ?? "";
    expect(problem).not.toContain("hunter2SECRET");
    expect(problem).not.toContain("apt-lion-12345");
  });

  it("rejects a bare hostname with no scheme", () => {
    process.env.KV_REST_API_URL = "apt-lion-12345.upstash.io";
    process.env.KV_REST_API_TOKEN = "t";
    expect(kvConfigProblem()).toMatch(/not a valid URL|REST endpoint/);
  });
});

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
