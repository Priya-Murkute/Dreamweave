"use client";

import { useEffect, useRef, useState } from "react";

const TWEET_TEXT = "I turned my dream into a story ✨";
const COPIED_RESET_MS = 2_000;

export interface SharePanelProps {
  title: string;
  story: string;
  dream: string;
  genre: string;
}

export default function SharePanel({
  title,
  story,
  dream,
  genre,
}: SharePanelProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dream, genre, story, title }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not save your story.");
      }
      setShareUrl(payload.shareUrl);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not save your story.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      // Needs a secure context; localhost counts, plain http on a LAN IP does not.
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      setError("Could not copy. Select the link and copy it manually.");
    }
  }

  const tweetHref =
    shareUrl === null
      ? "#"
      : `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          TWEET_TEXT,
        )}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <section className="flex flex-col items-center gap-5">
      {shareUrl === null ? (
        <button
          type="button"
          className="pixel-button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "SAVING..." : "SAVE & SHARE"}
        </button>
      ) : (
        <>
          <input
            readOnly
            value={shareUrl}
            aria-label="Shareable link to your story"
            // Selecting on focus makes a manual copy one keystroke, which is
            // the fallback when the clipboard API is unavailable.
            onFocus={(event) => event.currentTarget.select()}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              background: "#0a0a18",
              color: "#d0c8ff",
              border: "2px solid var(--border-bright)",
            }}
          />

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button type="button" className="pixel-button" onClick={handleCopy}>
              {copied ? "COPIED ✓" : "COPY LINK"}
            </button>

            <a
              href={tweetHref}
              target="_blank"
              rel="noopener noreferrer"
              className="pixel-button"
              style={{ display: "inline-block", textDecoration: "none" }}
            >
              SHARE ON X
            </a>
          </div>
        </>
      )}

      {error !== null && (
        <p
          role="alert"
          style={{
            margin: 0,
            fontFamily: "var(--font-pixel)",
            fontSize: 7,
            lineHeight: 1.8,
            letterSpacing: "0.05em",
            color: "#ef4444",
            background: "rgba(239, 68, 68, 0.1)",
            border: "2px solid #ef4444",
            padding: "8px 12px",
          }}
        >
          {error.toUpperCase()}
        </p>
      )}

      {/* Announces the copy without moving focus off the button. */}
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
        {copied ? "Link copied to clipboard" : ""}
      </p>
    </section>
  );
}
