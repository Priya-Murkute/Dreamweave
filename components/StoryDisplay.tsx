"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { splitStory } from "@/lib/story-format";

export interface StoryDisplayProps {
  dream: string;
  genre: string | null;
  onComplete: (title: string, story: string) => void;
}

export interface StoryDisplayHandle {
  /** Resolves when the stream finishes, so the caller can await its busy state. */
  generate: () => Promise<void>;
}

export default function StoryDisplay({
  ref,
  dream,
  genre,
  onComplete,
}: StoryDisplayProps & { ref?: React.Ref<StoryDisplayHandle> }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  useImperativeHandle(ref, () => ({
    async generate() {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setTitle("");
      setBody("");
      setError(null);
      setStatus("");
      setIsLoading(true);
      setIsStreaming(false);

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dream, genre }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const payload = await response.json().catch(() => null);
          throw new Error(
            payload?.error ?? "The weaver could not finish your story.",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;

          // stream: true holds back a trailing partial code point instead of
          // emitting U+FFFD for a character split across chunks.
          raw += decoder.decode(value, { stream: true });

          const next = splitStory(raw);
          setTitle(next.title);
          setBody(next.body);
          setIsLoading(false);
          setIsStreaming(true);
        }

        raw += decoder.decode();

        const final = splitStory(raw);
        setTitle(final.title);
        setBody(final.body);
        setStatus(`Story complete: ${final.title}`);
        onCompleteRef.current(final.title, final.body);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "The weaver could not finish your story.",
        );
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
  }));

  // isLoading and error count as content — gating on title/body alone would
  // hide the loading state during the stretch it exists to cover.
  const hasContent = title !== "" || body !== "";
  const isVisible = hasContent || isLoading || error !== null;
  const isGenerating = isLoading || isStreaming;

  return (
    <>
      {/*
        The story text itself is deliberately NOT a live region: it grows a word
        at a time, and a screen reader would re-announce the whole accumulating
        passage on every chunk. This announces once, on completion, instead.
      */}
      <p
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          margin: -1,
          padding: 0,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {status}
      </p>

      <section
        className="story-panel"
        aria-busy={isGenerating}
        style={{ display: isVisible ? "block" : "none" }}
      >
        {isGenerating && (
          <span className="story-walker" aria-hidden>
            🧙
          </span>
        )}

        {isLoading && (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-pixel)",
              fontSize: 8,
              lineHeight: 1.8,
              letterSpacing: "0.05em",
              color: "#ffb000",
            }}
          >
            GENERATING YOUR STORY...{" "}
            <span className="story-cursor" aria-hidden>
              █
            </span>
          </p>
        )}

        {error !== null && (
          <p
            role="alert"
            style={{
              margin: 0,
              fontFamily: "var(--font-pixel)",
              fontSize: 8,
              lineHeight: 1.8,
              letterSpacing: "0.05em",
              color: "#ef4444",
            }}
          >
            {error.toUpperCase()}
          </p>
        )}

        {title !== "" && (
          <h2
            style={{
              margin: "0 0 20px",
              fontFamily: "var(--font-pixel)",
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--genre-color, #8b5cf6)",
            }}
          >
            {title}
          </h2>
        )}

        {body !== "" && (
          // pre-wrap keeps paragraph breaks without splitting the body into
          // <p>s, which would fight the append-only streaming update.
          <div
            style={{
              fontFamily: "var(--font-terminal)",
              fontSize: 19,
              lineHeight: 1.75,
              color: "#c4b8ff",
              whiteSpace: "pre-wrap",
            }}
          >
            {body}
            {isStreaming && (
              <span className="story-cursor" aria-hidden>
                █
              </span>
            )}
          </div>
        )}
      </section>
    </>
  );
}
