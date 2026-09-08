"use client";

import { useState } from "react";
import DreamInput from "@/components/DreamInput";
import GenrePicker from "@/components/GenrePicker";

/**
 * Anything shorter than this doesn't give the weaver enough to work with, so
 * the submit button stays locked until the dream has real material in it.
 */
const MIN_DREAM_LENGTH = 50;

/**
 * Stand-in for a component that hasn't been built yet. Renders the state that
 * the real component will own, so the page is useful to develop against before
 * any of them exist.
 */
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
  // Starts true so an untouched form is gated by the length rule, not by an
  // unsafe verdict the safety check has not actually returned yet.
  const [isSafe, setIsSafe] = useState(true);

  const canWeave = isSafe && !isLoading && dreamText.length >= MIN_DREAM_LENGTH;

  async function handleWeave() {
    setIsLoading(true);
    try {
      // TODO: send { dreamText, selectedGenre } to the story route and hand
      // the result to StoryDisplay.
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero px-6 py-16 text-center">
        <h1 className="font-pixel m-0 text-[20px] sm:text-[32px]">DREAMWEAVE</h1>
        <p
          className="mt-6 mb-0 text-base"
          style={{ fontFamily: "var(--font-body)", color: "var(--text-soft)" }}
        >
          Enter your dream. Choose your genre. Get your story.
        </p>
      </section>

      {/* ── Weaver ───────────────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-[700px] flex-col gap-10 px-6 py-14">
        <div>
          <DreamInput
            value={dreamText}
            onChange={setDreamText}
            genre={selectedGenre}
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
          {/* StoryDisplay goes here */}
          {/* <StoryDisplay story={story} isLoading={isLoading} /> */}
          <Slot name="StoryDisplay" note={isLoading ? "weaving…" : "idle"} />
        </div>

        <div>
          {/* SharePanel goes here */}
          {/* <SharePanel story={story} genre={selectedGenre} /> */}
          <Slot name="SharePanel" note="awaiting a woven story" />
        </div>
      </div>
    </main>
  );
}
