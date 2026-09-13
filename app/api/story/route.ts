import {
  kvConfigProblem,
  KvAuthError,
  saveStory,
  type StoredStory,
} from "@/lib/kv";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { validateStoryPayload } from "@/lib/validation";

/** Rejects oversized payloads before the body is read into memory. */
const MAX_BODY_BYTES = 16_384;

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request));
  if (!limit.allowed) {
    return jsonError("Too many shares too quickly. Please wait a moment.", 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const configProblem = kvConfigProblem();
  if (configProblem !== null) {
    console.error("[api/story] cannot save —", configProblem);
    return jsonError("Sharing is not configured on this server.", 503);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonError("Request body too large", 413);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const valid = validateStoryPayload(body);
  if (!valid.ok) return jsonError(valid.error, 400);

  const id = crypto.randomUUID();
  const record: StoredStory = {
    dream: valid.dream,
    genre: valid.genre,
    story: valid.story,
    title: valid.title,
    createdAt: new Date().toISOString(),
  };

  try {
    await saveStory(id, record);
  } catch (error) {
    // Credentials present but rejected. Says so plainly rather than inviting a
    // retry that cannot succeed, and names the read-only token because that is
    // the usual cause — the token works, but not for writes.
    if (error instanceof KvAuthError) {
      console.error(
        "[api/story] KV rejected the credentials. Check KV_REST_API_URL and " +
          "KV_REST_API_TOKEN — a read-only Upstash token cannot write:",
        error.message,
      );
      return jsonError("Sharing is misconfigured on this server.", 503);
    }
    console.error("[api/story] KV write failed:", error);
    return jsonError("Could not save your story. Try again.", 502);
  }

  // Falls back to the request's own origin so a missing NEXT_PUBLIC_APP_URL
  // yields a working link rather than the string "undefined/story/...".
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    new URL(request.url).origin;

  return Response.json(
    { id, shareUrl: `${origin}/story/${id}` },
    { headers: { "Cache-Control": "no-store" } },
  );
}
