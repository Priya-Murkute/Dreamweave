"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Filter } from "bad-words";

const MIN_LENGTH = 50;
const MAX_LENGTH = 500;

/**
 * Built once at module scope rather than per render — the constructor loads the
 * whole word list, which is far too much work to repeat on every keystroke.
 */
const filter = new Filter();

/**
 * Phrases the profanity list doesn't cover.
 *
 * The first two are intent-based — about what the dream is asking for rather
 * than which words it uses. The third is a bare-word block, and it is far
 * blunter: it rejects "a shadow was trying to kill me" and "solving a murder
 * mystery", which are ordinary horror-genre dreams. Narrow it to /\brape\b/ if
 * the false-positive rate on the horror genre turns out to be a problem.
 */
const RESTRICTED_PATTERNS = [
  /self.?harm/i,
  /how to (kill|hurt|abuse)/i,
  /\b(kill|murder|rape)\b/i,
];

export function isSafeInput(text: string): { safe: boolean } {
  if (!text.trim()) return { safe: true };
  if (RESTRICTED_PATTERNS.some((pattern) => pattern.test(text))) {
    return { safe: false };
  }
  return { safe: !filter.isProfane(text) };
}

export interface DreamInputProps {
  value: string;
  onChange: (text: string) => void;
  /**
   * Part of the public API, but read via CSS rather than JS: GenrePicker owns
   * the genre palette and writes the active colour to `--genre-color` on the
   * document root, which the border below inherits. Mapping genre -> colour a
   * second time here would just be a second source of truth to drift.
   */
  genre: string | null;
  onSafetyChange: (isSafe: boolean) => void;
}

export default function DreamInput({
  value,
  onChange,
  onSafetyChange,
}: DreamInputProps) {
  const warningId = useId();
  const counterId = useId();

  const [isFocused, setIsFocused] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Re-runs on every keystroke, since `value` is the only input. Deriving this
  // from `value` rather than from the onChange event also covers writes the
  // parent makes directly (restore, reset, paste-in), which never fire onChange
  // and would otherwise leave a stale verdict behind.
  const isBlocked = useMemo(() => !isSafeInput(value).safe, [value]);

  // Held in a ref so an inline `onSafetyChange` from the parent doesn't make
  // the effect below re-fire on every parent render.
  const onSafetyChangeRef = useRef(onSafetyChange);
  useEffect(() => {
    onSafetyChangeRef.current = onSafetyChange;
  });

  const wasBlocked = useRef<boolean | null>(null);
  useEffect(() => {
    onSafetyChangeRef.current(!isBlocked);

    // Shake on the transition into blocked only. Re-shaking on every keystroke
    // while the text is still blocked reads as noise rather than feedback.
    if (isBlocked && wasBlocked.current === false) setIsShaking(true);
    wasBlocked.current = isBlocked;
  }, [isBlocked]);

  const isTooShort = value.length < MIN_LENGTH;

  return (
    <div className={isBlocked ? "input-error" : undefined}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        // The keyframe runs twice, and animationend fires once both passes are
        // done — clearing here lets a later block re-trigger the animation.
        onAnimationEnd={() => setIsShaking(false)}
        className={isShaking ? "pixel-shake" : undefined}
        maxLength={MAX_LENGTH}
        rows={6}
        aria-label="Your dream"
        aria-invalid={isBlocked}
        aria-describedby={isBlocked ? `${warningId} ${counterId}` : counterId}
        placeholder="Last night I dreamed that I was..."
        style={{
          display: "block",
          width: "100%",
          minHeight: 160,
          resize: "vertical",
          padding: "calc(var(--px) * 3)",
          fontFamily: "var(--font-terminal)",
          fontSize: 20,
          lineHeight: 1.4,
          background: "#0a0a18",
          color: "#d0c8ff",
          caretColor: "#f59e0b",
          border: "3px solid var(--genre-color, #3d3d6b)",
          outline: isFocused ? "2px solid var(--genre-color)" : "none",
          outlineOffset: isFocused ? 2 : 0,
        }}
      />

      <div style={{ marginTop: 8, textAlign: "right" }}>
        <span
          id={counterId}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: isTooShort ? "#ef4444" : "var(--text-soft)",
          }}
        >
          {value.length} / {MAX_LENGTH}
        </span>
      </div>

      {/* Rendered only while blocked, so `role="alert"` announces on the
          transition. A permanently-mounted box toggled with `display` would
          announce nothing. */}
      {isBlocked && (
        <p
          id={warningId}
          role="alert"
          style={{
            display: "block",
            margin: 0,
            marginTop: 8,
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
          ⚠ YOUR DREAM CONTAINS RESTRICTED CONTENT. PLEASE REVISE IT TO CONTINUE.
        </p>
      )}
    </div>
  );
}
