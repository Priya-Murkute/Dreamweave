"use client";

import { useEffect, useState } from "react";
import { type Genre, GENRE_OPTIONS, withAlpha } from "@/lib/genres";

export type { Genre } from "@/lib/genres";

export interface GenrePickerProps {
  selectedGenre: string | null;
  onSelect: (genre: string) => void;
}

export default function GenrePicker({
  selectedGenre,
  onSelect,
}: GenrePickerProps) {
  const [hovered, setHovered] = useState<Genre | null>(null);

  // Driven off `selectedGenre` rather than the click handler so the variable
  // also tracks selections made elsewhere (restored state, a reset button) and
  // never disagrees with what's actually highlighted.
  useEffect(() => {
    const match = GENRE_OPTIONS.find((genre) => genre.id === selectedGenre);
    const root = document.documentElement;

    if (match) {
      root.style.setProperty("--genre-color", match.color);
    } else {
      // Fall back to the :root default in globals.css.
      root.style.removeProperty("--genre-color");
    }
  }, [selectedGenre]);

  return (
    <div
      role="group"
      aria-label="Story genre"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 10,
      }}
    >
      {GENRE_OPTIONS.map((genre) => {
        const isSelected = genre.id === selectedGenre;
        const isHovered = hovered === genre.id;

        return (
          <button
            key={genre.id}
            type="button"
            onClick={() => onSelect(genre.id)}
            onMouseEnter={() => setHovered(genre.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(genre.id)}
            onBlur={() => setHovered(null)}
            aria-pressed={isSelected}
            style={{
              // Borders are border-box (globals.css reset), so the 1px -> 2px
              // swap on select eats into padding instead of nudging the grid.
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "14px 10px",
              margin: 0,
              cursor: "pointer",
              textAlign: "center",
              background: isSelected ? "#1a1a32" : "var(--card)",
              border: isSelected
                ? `2px solid ${genre.color}`
                : `1px solid ${isHovered ? withAlpha(genre.color, 0.5) : "var(--border)"}`,
              boxShadow: isSelected
                ? `0 0 12px ${withAlpha(genre.color, 0.3)}`
                : "none",
              // The stripe is a child, so it needs somewhere to anchor.
              position: "relative",
              paddingTop: 17,
            }}
          >
            {/* 3px top stripe. A div, not ::before — inline styles can't reach
                a pseudo-element, and the colour is per-genre. */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: genre.color,
              }}
            />

            <span
              style={{
                fontFamily: "var(--font-pixel)",
                fontSize: 7,
                lineHeight: 1.8,
                letterSpacing: "0.05em",
                color: genre.color,
              }}
            >
              {genre.name}
            </span>

            <span style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: 2 }}>
              {genre.emojis.join("")}
            </span>

            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                lineHeight: 1.4,
                color: "var(--text-muted, var(--text-soft))",
              }}
            >
              {genre.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}
