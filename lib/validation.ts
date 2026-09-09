import type { Genre } from "@/components/GenrePicker";
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
