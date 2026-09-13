import Link from "next/link";

export default function StoryNotFound() {
  return (
    <main className="mx-auto flex max-w-[700px] flex-col items-center gap-8 px-6 py-24 text-center">
      <p
        className="font-pixel"
        style={{ margin: 0, fontSize: 13, color: "#ef4444" }}
      >
        STORY EXPIRED OR NOT FOUND
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-body)",
          color: "var(--text-soft)",
        }}
      >
        Shared dreams are kept for 30 days, then they fade like the real thing.
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
