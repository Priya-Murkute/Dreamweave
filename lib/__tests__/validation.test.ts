import { describe, expect, it } from "vitest";
import { validateRequest } from "../validation";

const VALID_DREAM =
  "I was walking through an endless library where every book was written in a language I invented as a child.";

const valid = (over: Record<string, unknown> = {}) => ({
  dream: VALID_DREAM,
  genre: "horror",
  ...over,
});

describe("validateRequest", () => {
  it("accepts a well-formed request and returns the trimmed dream", () => {
    const result = validateRequest(valid({ dream: `  ${VALID_DREAM}  ` }));
    expect(result).toEqual({ ok: true, dream: VALID_DREAM, genre: "horror" });
  });

  it.each([null, undefined, {}, { genre: "horror" }])(
    "rejects a missing dream: %j",
    (body) => {
      expect(validateRequest(body).ok).toBe(false);
    },
  );

  it("rejects a dream under the minimum", () => {
    expect(validateRequest(valid({ dream: "too short" })).ok).toBe(false);
  });

  it("rejects a dream over the maximum", () => {
    expect(validateRequest(valid({ dream: "x".repeat(501) })).ok).toBe(false);
  });

  it("rejects whitespace padded out to the minimum", () => {
    expect(validateRequest(valid({ dream: " ".repeat(200) })).ok).toBe(false);
  });

  it("rejects a non-string dream", () => {
    expect(validateRequest(valid({ dream: 12345 })).ok).toBe(false);
  });

  it.each(["western", "", null, 7])("rejects unknown genre: %j", (genre) => {
    expect(validateRequest(valid({ genre })).ok).toBe(false);
  });

  it.each(["horror", "funny", "romantic", "sad", "dramatic"])(
    "accepts genre %s",
    (genre) => {
      expect(validateRequest(valid({ genre })).ok).toBe(true);
    },
  );

  it("rejects restricted content the client filter also blocks", () => {
    const dream =
      "I dreamt someone explained how to kill the thing chasing me down the long corridor of my old school.";
    expect(validateRequest(valid({ dream })).ok).toBe(false);
  });

  it("allows ordinary horror vocabulary", () => {
    const dream =
      "A shadow was trying to kill me while I was solving a murder mystery in an endless hotel with no exit.";
    expect(validateRequest(valid({ dream })).ok).toBe(true);
  });
});
