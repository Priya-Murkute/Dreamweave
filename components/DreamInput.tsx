"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { isSafeInput } from "@/lib/safety";
import { MAX_DREAM_LENGTH, MIN_DREAM_LENGTH } from "@/lib/validation";

export interface DreamInputProps {
  value: string;
  onChange: (text: string) => void;
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

  // Derived from `value` rather than the change event so it also covers writes
  // the parent makes directly, which never fire onChange.
  const isBlocked = useMemo(() => !isSafeInput(value), [value]);

  const onSafetyChangeRef = useRef(onSafetyChange);
  useEffect(() => {
    onSafetyChangeRef.current = onSafetyChange;
  });

  const wasBlocked = useRef<boolean | null>(null);
  useEffect(() => {
    onSafetyChangeRef.current(!isBlocked);

    // Shake only on the transition into blocked; re-shaking every keystroke
    // while still blocked reads as noise.
    if (isBlocked && wasBlocked.current === false) setIsShaking(true);
    wasBlocked.current = isBlocked;
  }, [isBlocked]);

  const isTooShort = value.length < MIN_DREAM_LENGTH;

  return (
    <div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onAnimationEnd={() => setIsShaking(false)}
        className={isShaking ? "pixel-shake" : undefined}
        maxLength={MAX_DREAM_LENGTH}
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
          {value.length} / {MAX_DREAM_LENGTH}
        </span>
      </div>

      {/* Mounted only while blocked so role="alert" announces on the
          transition; a hidden-but-present box would announce nothing. */}
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
