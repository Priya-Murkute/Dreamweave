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

## Layout

```
app/
  api/generate/route.ts   source selection, streaming, error mapping
  page.tsx                hero + weaver flow
  error.tsx               error boundary
  globals.css             design tokens, pixel-art primitives, animations
components/
  DreamInput   GenrePicker   StoryDisplay   Walkers
lib/
  prompts       per-genre system prompts
  validation    request validation (tested)
  safety        shared client/server content filter
  story-format  splitStory (tested)
  ollama        local model client (tested)
  rate-limit    in-memory limiter (tested)
  demo-story    offline fallback generator
```

## Known limitations

- **Rate limiting is in-memory**, so it is per-instance and resets on redeploy.
  Move it to Redis before running more than one server.
- **`SharePanel` is not built.** The page still renders a placeholder for it.
- **Stories are not persisted** — a refresh loses the current one.
- The client-side safety filter is a UX affordance only; `lib/safety.ts` runs
  on the server too, which is the actual gate.
