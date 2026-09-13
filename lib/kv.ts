import { kv } from "@vercel/kv";
import { GENRE_OPTIONS, type Genre } from "@/lib/genres";

/** 30 days, in seconds — the TTL every stored story is written with. */
export const STORY_TTL_SECONDS = 2_592_000;

export interface StoredStory {
  dream: string;
  genre: Genre;
  story: string;
  title: string;
  createdAt: string;
}

/**
 * `@vercel/kv` reads these lazily and throws on first use if either is missing,
 * which surfaces as an opaque 500. Checking up front lets callers answer with
 * something a developer can act on.
 */
export function isKvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() && process.env.KV_REST_API_TOKEN?.trim(),
  );
}

/**
 * Ids are the only thing separating one stored story from every other key in
 * the KV namespace, so anything that isn't a UUID this app generated is
 * rejected before it reaches `kv.get` — otherwise a crafted id could read
 * unrelated keys out of the same store.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStoryId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function isStoredStory(value: unknown): value is StoredStory {
  if (typeof value !== "object" || value === null) return false;
  const story = value as Record<string, unknown>;
  return (
    typeof story.dream === "string" &&
    typeof story.story === "string" &&
    typeof story.title === "string" &&
    typeof story.createdAt === "string" &&
    GENRE_OPTIONS.some((option) => option.id === story.genre)
  );
}

export async function saveStory(id: string, story: StoredStory): Promise<void> {
  await kv.set(id, story, { ex: STORY_TTL_SECONDS });
}

/**
 * Returns null for both "expired or never existed" and "stored under this id
 * but not a story" — callers render the same not-found page either way.
 */
export async function loadStory(id: string): Promise<StoredStory | null> {
  if (!isStoryId(id)) return null;

  const data = await kv.get<unknown>(id);
  if (data === null || data === undefined) return null;

  if (!isStoredStory(data)) {
    console.error("[lib/kv] value at id is not a story:", id);
    return null;
  }
  return data;
}
