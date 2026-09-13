# DreamWeave

Turn a dream into a short story. Type what you dreamt, pick a genre, and the
story streams back word by word in a pixel-art terminal.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4

---

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

It works with no configuration at all — see **Story sources** below.

```bash
npm test             # unit tests
npm run lint
npm run build
```

## Story sources

`/api/generate` picks the first backend that is configured, so the app runs
whether or not you have an API key:

| Priority | Source | Configure with | Notes |
|---|---|---|---|
| 1 | **Google Gemini** | `GEMINI_API_KEY` | Free key, no card: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| 2 | **Ollama** (local) | `OLLAMA_MODEL` | No account. `ollama pull llama3.2`. Slow on CPU (~60s) |
| 3 | **Demo generator** | *(nothing)* | Offline fallback. Template prose, **not** AI output |

Copy `.env.example` to `.env.local` and fill in whichever you want.

A configured source that fails reports its failure rather than silently falling
through to the next one — a bad key is a misconfiguration worth seeing, not a
reason to quietly downgrade. The response carries `X-Story-Source` so you can
tell which one answered.

> The demo generator assembles prose from templates. It exists so the streaming
> pipeline can be demonstrated without an account. Do not present its output as
> AI-generated.

## How it works

The route streams `text/plain` rather than JSON, because the client needs to
render words as they arrive:

```
POST /api/generate  { dream, genre }
  ├─ rate limit (5/min per IP)
  ├─ validate  (length, genre, safety patterns + profanity)
  ├─ pick a source
  ├─ pull the first chunk  ← so upstream failures become real status codes
  └─ stream the rest
```

Pulling the first chunk before responding matters: once a streaming `Response`
is returned its status can no longer change, so a bad key would otherwise
surface as `200 OK` with an empty body instead of a `500`.

The model is asked for a title, two blank lines, then the story.
`splitStory()` divides them on the first blank run — later blank runs are the
story's own paragraph breaks.

## Sharing

**Optional.** With no store configured `/api/story` answers `503`, and nothing
else in the app is affected.

**SAVE & SHARE** writes the story to Redis under a UUID and returns a link to
`/story/<id>`. That page renders on the server, so a shared link unfurls with a
real title and description. Records carry a 30-day TTL.

```
POST /api/story        { dream, genre, story, title } → { id, shareUrl }
GET  /api/story/<id>                                  → the stored record
GET  /story/<id>                                      → the shared page
```

| Variable | Where from |
|---|---|
| `KV_REST_API_URL` | Upstash Redis → REST API |
| `KV_REST_API_TOKEN` | Upstash Redis → REST API |

Upstash names these `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, but
`@vercel/kv` reads the `KV_` names — rename them when you paste.

The dream is re-validated on POST with the same rules `/api/generate` uses,
because this endpoint is reachable directly and would otherwise persist text
that never passed the safety gate. Ids are checked against a UUID pattern
before any read: the key is the only thing separating one story from every
other key in the store, so a crafted id must not be able to reach one.

## Deploying

Vercel Hobby runs this as-is. Two things to get right:

- **`NEXT_PUBLIC_APP_URL` is inlined at build time**, not read at runtime. Set
  it to the deployed origin *before* building, or every share link points at
  localhost — a restart will not fix it, only a rebuild.
- Leave `OLLAMA_MODEL` unset in production. A serverless function cannot reach
  a local model server.

With no `GEMINI_API_KEY` the deployment still works and serves demo prose,
which is the steadier choice for an unattended public link: a configured key
that hits its quota surfaces the failure rather than falling back.

## Layout

```
app/
  api/generate/route.ts     source selection, streaming, error mapping
  api/story/route.ts        POST — validate, persist, return a share link
  api/story/[id]/route.ts   GET  — read one stored story as JSON
  story/[id]/page.tsx       shared story view (server component)
  story/[id]/not-found.tsx  expired or missing, served with a real 404
  page.tsx                  hero + weaver flow
  error.tsx                 error boundary
  globals.css               design tokens, pixel-art primitives, animations
components/
  DreamInput   GenrePicker   StoryDisplay   Walkers
  PixelEmotes  SharePanel
lib/
  genres        genre palette, emotes and the Genre union
  prompts       per-genre system prompts
  validation    request validation (tested)
  safety        shared client/server content filter
  story-format  splitStory (tested)
  ollama        local model client (tested)
  rate-limit    in-memory limiter (tested)
  demo-story    offline fallback generator
  kv            share storage — save, load, id validation
```

`lib/genres.ts` holds the palette rather than `GenrePicker`, because the shared
story page is a server component: importing that data from a `"use client"`
module would pull a client boundary in for what is only a static array.

## Known limitations

- **Rate limiting is in-memory**, so it is per-instance and resets on redeploy.
  Move it to Redis before running more than one server. `/api/generate` and
  `/api/story` also share one 5/min budget, because the limiter keys on IP
  alone.
- **Nothing is persisted until you press SAVE & SHARE** — a refresh loses the
  current story, and a shared one expires after 30 days.
- **Ollama cannot run on a serverless host**, so a deployment has only Gemini
  and the demo generator to choose between.
- The client-side safety filter is a UX affordance only; `lib/safety.ts` runs
  on the server too, which is the actual gate.
