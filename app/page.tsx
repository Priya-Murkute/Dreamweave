"use client";

import { useRef, useState } from "react";
import DreamInput from "@/components/DreamInput";
import GenrePicker from "@/components/GenrePicker";
import StoryDisplay, {
  type StoryDisplayHandle,
} from "@/components/StoryDisplay";
import { MIN_DREAM_LENGTH } from "@/lib/validation";

/**
 * Motes drifting around the title. Hand-placed and static, so unlike Walkers
 * this needs no client-only effect. Colours are the palette accents as RGB
 * channels, so one property drives both the core and the halo alphas.
 */
const PIXEL_ORBS = [
  { left: "12%", top: "22%", size: 8, rgb: "0 255 136", duration: 11, delay: 0 },
  { left: "22%", top: "62%", size: 4, rgb: "255 107 107", duration: 14, delay: -3 },
  { left: "31%", top: "34%", size: 12, rgb: "78 205 196", duration: 17, delay: -7 },
  { left: "41%", top: "76%", size: 4, rgb: "255 230 109", duration: 12, delay: -5 },
  { left: "48%", top: "14%", size: 8, rgb: "255 217 61", duration: 15, delay: -9 },
  { left: "58%", top: "70%", size: 8, rgb: "0 255 136", duration: 13, delay: -2 },
  { left: "66%", top: "26%", size: 4, rgb: "78 205 196", duration: 16, delay: -11 },
  { left: "74%", top: "58%", size: 12, rgb: "255 107 107", duration: 18, delay: -6 },
  { left: "84%", top: "22%", size: 8, rgb: "255 230 109", duration: 14, delay: -8 },
  { left: "90%", top: "72%", size: 4, rgb: "255 217 61", duration: 12, delay: -4 },
] as const;

/** Stand-in for SharePanel, which is not built yet. */
function Slot({ name, note }: { name: string; note: string }) {
  return (
    <div className="pixel-box text-center">
      <p className="font-mono m-0 text-xs" style={{ color: "var(--text-soft)" }}>
        {`<${name} />`}
      </p>
      <p className="font-mono mt-2 mb-0 text-xs opacity-60">{note}</p>
    </div>
  );
}

export default function Home() {
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [dreamText, setDreamText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Starts true so an untouched form is gated by length, not a stale verdict.
  const [isSafe, setIsSafe] = useState(true);
  const [story, setStory] = useState<{ title: string; body: string } | null>(
    null,
  );

  const storyRef = useRef<StoryDisplayHandle>(null);

  // /api/generate 400s on a null genre, so this gate is not cosmetic.
  const canWeave =
    isSafe &&
    !isLoading &&
    selectedGenre !== null &&
    dreamText.length >= MIN_DREAM_LENGTH;

  async function handleWeave() {
    setIsLoading(true);
    try {
      // Resolves when the stream ends, keeping the button disabled throughout.
      await storyRef.current?.generate();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <section className="hero px-6 py-24 text-center">
        {PIXEL_ORBS.map((orb, i) => (
          <span
            key={i}
            className="pixel-orb"
            aria-hidden="true"
            style={
              {
                left: orb.left,
                top: orb.top,
                "--orb-size": `${orb.size}px`,
                "--orb-rgb": orb.rgb,
                "--orb-duration": `${orb.duration}s`,
                "--orb-delay": `${orb.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}

        <h1 className="typing-title font-pixel m-0 text-[20px] sm:text-[32px]">
          <span className="typing-title__text">DREAMWEAVE</span>
          <span className="typing-title__cursor" aria-hidden="true" />
        </h1>
        <p
          className="hero-subtitle mt-6 mb-0 text-base"
          style={{ fontFamily: "var(--font-body)", color: "var(--text-soft)" }}
        >
          Enter your dream. Choose your genre. Get your story.
        </p>
      </section>

      <div className="mx-auto flex max-w-[700px] flex-col gap-10 px-6 py-14">
        <div>
          <DreamInput
            value={dreamText}
            onChange={setDreamText}
            onSafetyChange={setIsSafe}
          />
        </div>

        <div>
          <GenrePicker
            selectedGenre={selectedGenre}
            onSelect={setSelectedGenre}
          />
        </div>

        <button
          type="button"
          className="pixel-button self-center"
          disabled={!canWeave}
          onClick={handleWeave}
        >
          WEAVE MY DREAM
        </button>

        <div>
          <StoryDisplay
            ref={storyRef}
            dream={dreamText}
            genre={selectedGenre}
            onComplete={(title, body) => setStory({ title, body })}
          />
        </div>

        <div>
          <Slot
            name="SharePanel"
            note={story ? `ready: "${story.title}"` : "awaiting a woven story"}
          />
        </div>
      </div>
    </main>
  );
}
