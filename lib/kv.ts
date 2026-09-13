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
 * Why the store is unusable, or null when it is fine.
 *
 * `@vercel/kv` reads its two variables lazily and only complains on first use,
 * so every kind of misconfiguration used to surface as one generic failure at
 * write time. The URL is checked here as well as the presence of both values,
 * because the commonest mistake is pasting Upstash's `redis://` connection
 * string in place of its REST endpoint — the client then rejects the URL
 * before it opens a connection, which looks identical to the store being down.
 *
 * The returned string is for logs only. It never quotes the URL: the
 * `redis://` form embeds the password in its userinfo.
 */
export function kvConfigProblem(): string | null {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();

  if (!url && !token) return "KV_REST_API_URL and KV_REST_API_TOKEN are unset";
  if (!url) return "KV_REST_API_URL is unset";
  if (!token) return "KV_REST_API_TOKEN is unset";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "KV_REST_API_URL is not a valid URL — it should be the https:// REST endpoint Upstash lists under 'REST API'";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return `KV_REST_API_URL uses "${parsed.protocol}//" — that is the Redis connection string, not the REST endpoint. Upstash lists the https:// one separately, under 'REST API'`;
  }

  return null;
}

export function isKvConfigured(): boolean {
  return kvConfigProblem() === null;
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

/**
 * Credentials that are present but wrong. Upstash says `Unauthorized` for a bad
 * token or URL, and `NOPERM` when the token is real but lacks the command —
 * which is what copying `UPSTASH_REDIS_REST_READONLY_TOKEN` produces: reads
 * succeed, writes are refused.
 *
 * Worth separating from a transient blip, because "try again" is useless advice
 * for a misconfiguration and it will never start working on its own.
 */
export class KvAuthError extends Error {}

const AUTH_FAILURE = /(unauthorized|noperm|forbidden|wrongpass|invalid[ _-]?token)/i;

/**
 * `@upstash/redis` appends `, command was: [...]` to its errors — and that echo
 * contains the story the caller tried to write. Only the part before it is the
 * Redis error, so a dream that happens to use the word "unauthorized" cannot be
 * read as a credential fault.
 */
function redisErrorText(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return `${error.name} ${error.message.split(", command was:")[0]}`;
}

/** Exported for tests; callers should catch `KvAuthError` instead. */
export function isAuthFailure(error: unknown): boolean {
  return AUTH_FAILURE.test(redisErrorText(error));
}

function rethrow(error: unknown): never {
  if (isAuthFailure(error)) {
    throw new KvAuthError(
      error instanceof Error ? error.message : String(error),
      { cause: error },
    );
  }
  throw error;
}

export async function saveStory(id: string, story: StoredStory): Promise<void> {
  try {
    await kv.set(id, story, { ex: STORY_TTL_SECONDS });
  } catch (error) {
    rethrow(error);
  }
}

/**
 * Returns null for both "expired or never existed" and "stored under this id
 * but not a story" — callers render the same not-found page either way.
 */
export async function loadStory(id: string): Promise<StoredStory | null> {
  if (!isStoryId(id)) return null;

  let data: unknown;
  try {
    data = await kv.get<unknown>(id);
  } catch (error) {
    rethrow(error);
  }
  if (data === null || data === undefined) return null;

  if (!isStoredStory(data)) {
    console.error("[lib/kv] value at id is not a story:", id);
    return null;
  }
  return data;
}
