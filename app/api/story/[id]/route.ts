import { isStoryId, kvConfigProblem, KvAuthError, loadStory } from "@/lib/kv";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  // Answered before touching KV so an unconfigured server is distinguishable
  // from a story that genuinely expired.
  const configProblem = kvConfigProblem();
  if (configProblem !== null) {
    console.error("[api/story/[id]] cannot read —", configProblem);
    return jsonError("Sharing is not configured on this server.", 503);
  }

  if (!isStoryId(id)) return jsonError("Story not found", 404);

  let data;
  try {
    data = await loadStory(id);
  } catch (error) {
    if (error instanceof KvAuthError) {
      console.error(
        "[api/story/[id]] KV rejected the credentials. Check KV_REST_API_URL " +
          "and KV_REST_API_TOKEN:",
        error.message,
      );
      return jsonError("Sharing is misconfigured on this server.", 503);
    }
    console.error("[api/story/[id]] KV read failed:", error);
    return jsonError("Could not load that story. Try again.", 502);
  }

  if (data === null) return jsonError("Story not found", 404);

  return Response.json(data, {
    // Stories are immutable once written, but they expire — let a shared link
    // be cached briefly without outliving the 30-day TTL by much.
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
