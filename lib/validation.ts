import type { Genre } from "@/lib/genres";
import { isSafeInput, SAFETY_MESSAGE } from "@/lib/safety";

export const MIN_DREAM_LENGTH = 50;
export const MAX_DREAM_LENGTH = 500;

export const GENRES = [
  "horror",
  "funny",
  "romantic",
  "sad",
  "dramatic",
] as const;

export function isGenre(value: unknown): value is Genre {
  return (
    typeof value === "string" && (GENRES as readonly string[]).includes(value)
  );
}

export type ValidationResult =
  | { ok: true; dream: string; genre: Genre }
  | { ok: false; error: string };

export function validateRequest(body: unknown): ValidationResult {
  const { dream, genre } = (body ?? {}) as { dream?: unknown; genre?: unknown };

  // Upper bound on the raw string so this agrees with the client's length
  // counter; lower bound on the trimmed one so whitespace can't pad it out.
  const trimmed = typeof dream === "string" ? dream.trim() : "";
  if (
    typeof dream !== "string" ||
    dream.length > MAX_DREAM_LENGTH ||
    trimmed.length < MIN_DREAM_LENGTH
  ) {
    return {
      ok: false,
      error: `Dream must be ${MIN_DREAM_LENGTH}-${MAX_DREAM_LENGTH} characters`,
    };
  }

  if (!isGenre(genre)) return { ok: false, error: "Unknown genre" };
  if (!isSafeInput(trimmed)) return { ok: false, error: SAFETY_MESSAGE };

  return { ok: true, dream: trimmed, genre };
}

/** A generated story runs ~500 words; this leaves room without letting KV grow unbounded. */
export const MAX_STORY_LENGTH = 8_000;
export const MAX_TITLE_LENGTH = 200;

export type StoryPayload = {
  dream: string;
  genre: Genre;
  story: string;
  title: string;
};

export type StoryPayloadResult =
  | ({ ok: true } & StoryPayload)
  | { ok: false; error: string };

/**
 * Guards what gets written to KV. The dream is re-checked with the same rules
 * the generate route uses, because this endpoint is reachable directly and a
 * caller could otherwise persist text that never passed the safety gate.
 */
export function validateStoryPayload(body: unknown): StoryPayloadResult {
  const { dream, genre, story, title } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (
    typeof dream !== "string" ||
    typeof genre !== "string" ||
    typeof story !== "string" ||
    typeof title !== "string"
  ) {
    return { ok: false, error: "dream, genre, story and title are required" };
  }

  const trimmedStory = story.trim();
  const trimmedTitle = title.trim();

  if (trimmedStory === "" || trimmedTitle === "") {
    return { ok: false, error: "Story and title cannot be empty" };
  }
  if (story.length > MAX_STORY_LENGTH || title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: "Story or title too long" };
  }

  const validDream = validateRequest({ dream, genre });
  if (!validDream.ok) return validDream;

  return {
    ok: true,
    dream: validDream.dream,
    genre: validDream.genre,
    story: trimmedStory,
    title: trimmedTitle,
  };
}
