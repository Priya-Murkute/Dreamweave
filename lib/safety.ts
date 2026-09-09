import { Filter } from "bad-words";

/** Loads a full word list, so build it once rather than per call. */
const filter = new Filter();

/**
 * Only words with no benign reading in a dream belong here. "kill" and "murder"
 * were removed after they rejected ordinary horror premises.
 */
const RESTRICTED_PATTERNS = [
  /self.?harm/i,
  /how to (kill|hurt|abuse)/i,
  /\brape\b/i,
];

export const SAFETY_MESSAGE = "Your dream contains restricted content.";

/**
 * Shared by the browser and the route so the two cannot drift. The client copy
 * is only a UX affordance — the server call is the gate.
 */
export function isSafeInput(text: string): boolean {
  if (!text.trim()) return true;
  if (RESTRICTED_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return !filter.isProfane(text);
}
