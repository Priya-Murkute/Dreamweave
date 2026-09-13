import { genreOption } from "@/lib/genres";

export interface PixelEmotesProps {
  genre: string | null;
  /** Emoji size in px. */
  size?: number;
}

/**
 * The genre's three emotes, bobbing out of phase. No `"use client"` — the
 * stagger is a CSS custom property per emote, so this renders as static markup
 * on the server and the animation costs no JavaScript.
 */
export default function PixelEmotes({ genre, size = 26 }: PixelEmotesProps) {
  const option = genreOption(genre);
  if (!option) return null;

  return (
    <div
      // Decorative: the genre is already stated in text next to this.
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 14,
        fontSize: size,
        lineHeight: 1,
      }}
    >
      {option.emojis.map((emote, i) => (
        <span
          key={emote}
          className="pixel-emote"
          style={{ "--emote-delay": `${i * -0.6}s` } as React.CSSProperties}
        >
          {emote}
        </span>
      ))}
    </div>
  );
}
