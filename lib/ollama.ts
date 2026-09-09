const DEFAULT_HOST = "http://127.0.0.1:11434";

/** Caps generation so a model that fails to stop can't stream indefinitely. */
const NUM_PREDICT = 900;

/** Ollama can be slow to load a model; past this it is not coming back. */
const TIMEOUT_MS = 120_000;

export class OllamaUnavailableError extends Error {}

function host(): string {
  return process.env.OLLAMA_HOST?.trim() || DEFAULT_HOST;
}

interface ChatLine {
  message?: { content?: string };
  done?: boolean;
}

/**
 * Pulls whole NDJSON lines out of a growing buffer, returning the text of each
 * and whatever partial line is left over. A JSON object can be split across
 * chunk boundaries, so the remainder has to be carried to the next read.
 */
export function drainLines(buffer: string): {
  texts: string[];
  rest: string;
  done: boolean;
} {
  const texts: string[] = [];
  let rest = buffer;
  let done = false;

  for (;;) {
    const newline = rest.indexOf("\n");
    if (newline === -1) break;

    const line = rest.slice(0, newline).trim();
    rest = rest.slice(newline + 1);
    if (line === "") continue;

    let parsed: ChatLine;
    try {
      parsed = JSON.parse(line) as ChatLine;
    } catch {
      continue;
    }

    const text = parsed.message?.content;
    if (typeof text === "string" && text !== "") texts.push(text);
    if (parsed.done === true) {
      done = true;
      break;
    }
  }

  return { texts, rest, done };
}

export async function* streamOllamaStory(
  dream: string,
  model: string,
  systemPrompt: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${host()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: dream },
        ],
        stream: true,
        options: { num_predict: NUM_PREDICT },
      }),
      signal: AbortSignal.any([signal, timeout]),
    });
  } catch (cause) {
    if (timeout.aborted) {
      throw new OllamaUnavailableError(
        `Ollama did not respond within ${TIMEOUT_MS / 1000}s.`,
        { cause },
      );
    }
    throw new OllamaUnavailableError(
      `Cannot reach Ollama at ${host()}. Is \`ollama serve\` running?`,
      { cause },
    );
  }

  if (!response.ok || !response.body) {
    throw new OllamaUnavailableError(
      response.status === 404
        ? `Model "${model}" is not installed. Run: ollama pull ${model}`
        : `Ollama returned ${response.status}.`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    // stream: true holds back a trailing partial code point instead of
    // emitting U+FFFD for a character split across chunks.
    buffer += decoder.decode(value, { stream: true });

    const drained = drainLines(buffer);
    buffer = drained.rest;
    for (const text of drained.texts) yield text;
    if (drained.done) return;
  }

  buffer += decoder.decode();
  const tail = drainLines(buffer + "\n");
  for (const text of tail.texts) yield text;
}
