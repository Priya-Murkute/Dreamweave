import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PixelEmotes from "@/components/PixelEmotes";
import { genreOption } from "@/lib/genres";
import {
  kvConfigProblem,
  KvAuthError,
  loadStory,
  type StoredStory,
} from "@/lib/kv";

/**
 * A KV read must not run at build time. There is no generateStaticParams here,
 * so Next renders this on demand — but say it outright, since adding one later
 * would otherwise silently start prerendering against an unconfigured store.
 */
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

/**
 * `cache` dedupes within a single request, so generateMetadata and the page
 * body share one KV round trip instead of each paying for their own.
 *
 * Failures are swallowed to null: an unreachable store should render the
 * not-found page, not a 500.
 */
const readStory = cache(async (id: string): Promise<StoredStory | null> => {
  const configProblem = kvConfigProblem();
  if (configProblem !== null) {
    console.error("[story/[id]] cannot read —", configProblem);
    return null;
  }
  try {
    return await loadStory(id);
  } catch (error) {
    // Still renders not-found — a visitor to a shared link can do nothing with
    // a config fault — but the log has to distinguish it, or a rejected
    // credential is indistinguishable from an expired story.
    if (error instanceof KvAuthError) {
      console.error(
        "[story/[id]] KV rejected the credentials. Shared links will all read " +
          "as expired until KV_REST_API_URL/KV_REST_API_TOKEN are fixed:",
        error.message,
      );
      return null;
    }
    console.error("[story/[id]] KV read failed:", error);
    return null;
  }
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const story = await readStory(id);

  if (!story) return { title: "Story not found — DreamWeave" };

  return {
    title: `${story.title} — DreamWeave`,
    description: story.story.slice(0, 155),
    openGraph: {
      title: story.title,
      description: story.story.slice(0, 155),
      type: "article",
    },
  };
}

export default async function SharedStoryPage({ params }: PageProps) {
  const { id } = await params;
  const story = await readStory(id);

  // Renders not-found.tsx in this segment, with a real 404 status — a 200 for
  // a missing story would tell crawlers and link unfurlers it exists.
  if (!story) notFound();

  const option = genreOption(story.genre);

  return (
    // Scopes --genre-color to this page: the picker's client-side write to
    // documentElement never runs here, so the panel border needs it locally.
    <main
      className="mx-auto flex max-w-[700px] flex-col gap-8 px-6 py-16"
      style={
        option
          ? ({ "--genre-color": option.color } as React.CSSProperties)
          : undefined
      }
    >
      <PixelEmotes genre={story.genre} />

      <article className="story-panel">
        <h1
          style={{
            margin: "0 0 20px",
            fontFamily: "var(--font-pixel)",
            fontSize: 13,
            lineHeight: 1.6,
            color: "var(--genre-color, #8b5cf6)",
          }}
        >
          {story.title}
        </h1>

        {/* pre-wrap keeps the generator's paragraph breaks without re-parsing
            the body into elements. */}
        <div
          style={{
            fontFamily: "var(--font-terminal)",
            fontSize: 19,
            lineHeight: 1.75,
            color: "#c4b8ff",
            whiteSpace: "pre-wrap",
          }}
        >
          {story.story}
        </div>
      </article>

      <p
        className="font-mono"
        style={{ margin: 0, fontSize: 11, color: "var(--text-soft)" }}
      >
        {option?.name ?? story.genre.toUpperCase()} ·{" "}
        <time dateTime={story.createdAt}>
          {story.createdAt.slice(0, 10)}
        </time>
      </p>

      <Link
        href="/"
        className="font-pixel"
        style={{
          fontSize: 8,
          color: "var(--text-soft)",
          textDecoration: "none",
          borderBottom: "2px solid var(--border-bright)",
          paddingBottom: 4,
        }}
      >
        ← WEAVE YOUR OWN
      </Link>
    </main>
  );
}
