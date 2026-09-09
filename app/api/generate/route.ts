import { ApiError, GoogleGenAI } from "@google/genai";
import { streamDemoStory } from "@/lib/demo-story";
import { OllamaUnavailableError, streamOllamaStory } from "@/lib/ollama";
import { SYSTEM_PROMPTS } from "@/lib/prompts";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { validateRequest } from "@/lib/validation";

const MODEL = "gemini-2.5-flash";

/** 500 words runs ~650-750 tokens; this leaves headroom for the title. */
const MAX_OUTPUT_TOKENS = 1200;

const GEMINI_TIMEOUT_MS = 60_000;

/** Rejects oversized payloads before the body is read into memory. */
const MAX_BODY_BYTES = 4_096;

type StorySource = "gemini" | "ollama" | "demo";

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

/** Upstream messages can carry key and account detail, so they are logged only. */
function upstreamFailure(error: unknown): Response {
  console.error("[api/generate] upstream failed:", error);

  if (error instanceof ApiError) {
    if (error.status === 429) {
      return jsonError(
        "The weaver has hit its free-tier limit. Try again shortly.",
        429,
      );
    }
    // Gemini answers a rejected key with 400, not 401, and a bad model id with
    // 400 or 404 — all faults in the request this server built.
    if ([400, 401, 403, 404].includes(error.status)) {
      return jsonError("Story generation is unavailable.", 500);
    }
  }
  return jsonError("The weaver could not reach the loom. Try again.", 502);
}

function encodeUtf8(): TransformStream<string, Uint8Array> {
  const encoder = new TextEncoder();
  return new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(encoder.encode(chunk));
    },
  });
}

function streamResponse(
  chunks: AsyncGenerator<string>,
  abort: AbortController,
  source: StorySource,
): Response {
  let cancelled = false;

  const story = new ReadableStream<string>({
    async start(controller) {
      try {
        for (;;) {
          const { value, done } = await chunks.next();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      } catch (error) {
        if (cancelled) return;
        console.error("[api/generate] stream interrupted:", error);
        controller.error(error);
      }
    },
    cancel() {
      cancelled = true;
      abort.abort();
    },
  });

  return new Response(story.pipeThrough(encodeUtf8()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Story-Source": source,
    },
  });
}

async function* geminiText(
  events: AsyncGenerator<{ text?: string }>,
): AsyncGenerator<string> {
  for (;;) {
    const { value, done } = await events.next();
    if (done) return;
    if (value.text) yield value.text;
  }
}

async function* withFirst(first: string, rest: AsyncGenerator<string>) {
  yield first;
  for (;;) {
    const { value, done } = await rest.next();
    if (done) return;
    yield value;
  }
}

/**
 * Pulls to the first non-empty chunk before committing to a 200. Upstream
 * failures surface on the first read, and once the Response is returned the
 * status can no longer change — the browser would get a 200 with an empty body.
 */
async function firstChunkOf(chunks: AsyncGenerator<string>) {
  for (;;) {
    const { value, done } = await chunks.next();
    if (done) return null;
    if (value !== "") return value;
  }
}

export async function POST(request: Request): Promise<Response> {
  const limit = rateLimit(clientKey(request));
  if (!limit.allowed) {
    return jsonError("Too many dreams too quickly. Please wait a moment.", 429, {
      "Retry-After": String(limit.retryAfter),
    });
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

  const valid = validateRequest(body);
  if (!valid.ok) return jsonError(valid.error, 400);
  const { dream, genre } = valid;

  const abort = new AbortController();

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const hasKey =
    apiKey !== undefined && apiKey !== "" && !apiKey.startsWith("paste-");
  const ollamaModel = process.env.OLLAMA_MODEL?.trim();

  if (!hasKey && !ollamaModel) {
    return streamResponse(
      streamDemoStory(dream, genre, abort.signal),
      abort,
      "demo",
    );
  }

  let chunks: AsyncGenerator<string>;
  let source: StorySource;

  if (hasKey) {
    source = "gemini";
    try {
      // Constructed per request: at module scope this would run during
      // `next build`, where the key isn't loaded.
      const ai = new GoogleGenAI({ apiKey });
      chunks = geminiText(
        await ai.models.generateContentStream({
          model: MODEL,
          contents: dream,
          config: {
            systemInstruction: SYSTEM_PROMPTS[genre],
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            abortSignal: AbortSignal.any([
              abort.signal,
              AbortSignal.timeout(GEMINI_TIMEOUT_MS),
            ]),
          },
        }),
      );
    } catch (error) {
      return upstreamFailure(error);
    }
  } else {
    source = "ollama";
    chunks = streamOllamaStory(
      dream,
      ollamaModel!,
      SYSTEM_PROMPTS[genre],
      abort.signal,
    );
  }

  let firstChunk: string | null;
  try {
    firstChunk = await firstChunkOf(chunks);
  } catch (error) {
    abort.abort();
    // Ollama's messages are written to be acted on, so they pass through.
    if (error instanceof OllamaUnavailableError) {
      console.error("[api/generate] Ollama unavailable:", error.message);
      return jsonError(error.message, 503);
    }
    return upstreamFailure(error);
  }

  // No text at all usually means the model's own safety filter declined.
  if (firstChunk === null) {
    console.error(`[api/generate] ${source} returned no text for:`, genre);
    return jsonError(
      "The weaver could not shape this dream. Try rewording it.",
      502,
    );
  }

  return streamResponse(withFirst(firstChunk, chunks), abort, source);
}
