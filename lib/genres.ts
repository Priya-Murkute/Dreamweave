export type Genre = "horror" | "funny" | "romantic" | "sad" | "dramatic";

export interface GenreOption {
  id: Genre;
  color: string;
  name: string;
  emoji: string;
  emojis: string[];
  desc: string;
}

/**
 * The single source of truth for how a genre looks. It lives in `lib/` rather
 * than inside GenrePicker because the shared story page is a server component:
 * importing this from a `"use client"` module would drag a client boundary in
 * for what is only static data.
 */
export const GENRE_OPTIONS: readonly GenreOption[] = [
  {
    id: "horror",
    color: "#ef4444",
    name: "HORROR",
    emoji: "👻",
    emojis: ["👻", "💀", "🕷️"],
    desc: "Dark and suspenseful. Ends with a twist.",
  },
  {
    id: "funny",
    color: "#fbbf24",
    name: "FUNNY",
    emoji: "😂",
    emojis: ["😂", "🤡", "🎉"],
    desc: "Absurd, escalating, full of chaos.",
  },
  {
    id: "romantic",
    color: "#f472b6",
    name: "ROMANTIC",
    emoji: "❤️",
    emojis: ["❤️", "🌹", "💫"],
    desc: "Warm and tender. Dream becomes metaphor.",
  },
  {
    id: "sad",
    color: "#60a5fa",
    name: "SAD",
    emoji: "😢",
    emojis: ["😢", "💧", "☁️"],
    desc: "Melancholy and poignant. Lingers after.",
  },
  {
    id: "dramatic",
    color: "#a78bfa",
    name: "DRAMATIC",
    emoji: "⚡",
    emojis: ["⚡", "💥", "🌊"],
    desc: "Epic, cinematic. Maximum intensity.",
  },
];

/** Looks up a genre's presentation, tolerating the `string | null` the UI holds. */
export function genreOption(genre: string | null): GenreOption | undefined {
  if (genre === null) return undefined;
  return GENRE_OPTIONS.find((option) => option.id === genre);
}

/** Hover and glow need the colour at partial alpha; every colour above is 6-digit hex. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
