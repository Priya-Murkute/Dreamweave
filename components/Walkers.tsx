"use client";

import { useEffect, useRef, useState } from "react";

const EMOJI_POOL = [
  "🐑", "👻", "🌙", "✨", "☁️", "🦉", "🕯️", "📖", "🦇", "💤", "🔮",
];

const WALKER_COUNT = 6;
const SPEED_MIN = 60; // px/s
const SPEED_MAX = 150; // px/s
const FALLBACK_SIZE = 32; // px — used only if a ref's offsetWidth isn't available yet

interface WalkerMeta {
  id: number;
  emoji: string;
  size: number;
}

/** Mutated every frame by the rAF loop — deliberately not React state. */
interface WalkerPhysics {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildMeta(): WalkerMeta[] {
  // Shuffled, not sampled, so on-screen walkers rarely repeat an emoji.
  const pool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);

  return Array.from({ length: WALKER_COUNT }, (_, i) => ({
    id: i,
    emoji: pool[i % pool.length],
    size: Math.round(randomBetween(18, 30)),
  }));
}

/**
 * DVD-logo drift: each walker travels at its own angle and reflects off
 * whichever viewport edge it reaches.
 *
 * Driven from JS rather than CSS keyframes because a bounce path depends on
 * random per-walker starting points. Position is written to each element's
 * `transform` through a ref inside rAF, never React state — 60 re-renders a
 * second for a decorative effect would be needless cost.
 */
export default function Walkers() {
  const [meta, setMeta] = useState<WalkerMeta[]>([]);
  const elsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const physicsRef = useRef<WalkerPhysics[]>([]);

  // Math.random() during render would desync server HTML from the client's
  // first render (a hydration error), so the list is built in an effect.
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    // Deriving this isn't possible: it must run outside render. See above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMeta(buildMeta());
  }, []);

  // Starts once the spans exist, so their refs are available to write into.
  useEffect(() => {
    if (meta.length === 0) return;

    physicsRef.current = meta.map((_, i) => {
      const el = elsRef.current[i];
      const width = el?.offsetWidth ?? FALLBACK_SIZE;
      const height = el?.offsetHeight ?? FALLBACK_SIZE;
      // A full angle, so a walker can set off toward any of the four edges.
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(SPEED_MIN, SPEED_MAX);
      return {
        x: randomBetween(0, Math.max(1, window.innerWidth - width)),
        y: randomBetween(0, Math.max(1, window.innerHeight - height)),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        width,
        height,
      };
    });

    let frameId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      // Clamped so a resumed background tab doesn't leap across the screen.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Read live, so a window resize needs no separate listener.
      const maxX = window.innerWidth;
      const maxY = window.innerHeight;

      for (let i = 0; i < physicsRef.current.length; i++) {
        const p = physicsRef.current[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Clamping as well as flipping stops sub-pixel creep past the edge.
        if (p.x <= 0) {
          p.x = 0;
          p.vx = Math.abs(p.vx);
        } else if (p.x >= maxX - p.width) {
          p.x = maxX - p.width;
          p.vx = -Math.abs(p.vx);
        }

        if (p.y <= 0) {
          p.y = 0;
          p.vy = Math.abs(p.vy);
        } else if (p.y >= maxY - p.height) {
          p.y = maxY - p.height;
          p.vy = -Math.abs(p.vy);
        }

        const el = elsRef.current[i];
        if (el) {
          const facing = p.vx < 0 ? -1 : 1;
          el.style.transform = `translate(${p.x}px, ${p.y}px) scaleX(${facing})`;
        }
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [meta]);

  return (
    <>
      {meta.map((walker, i) => (
        <span
          key={walker.id}
          ref={(el) => {
            elsRef.current[i] = el;
          }}
          className="walker"
          aria-hidden="true"
          style={{ fontSize: walker.size }}
        >
          {walker.emoji}
        </span>
      ))}
    </>
  );
}
