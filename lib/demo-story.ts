import type { Genre } from "@/components/GenrePicker";

/**
 * Offline fallback used when no model is configured.
 *
 * This is template assembly, not a language model — present its output as demo
 * text, never as AI-generated writing.
 */

/** FNV-1a. Seeds the RNG from the dream so one dream always tells one story. */
function hashText(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — small seeded PRNG. Deterministic output beats Math.random here. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A clause of the dream, so it can be dropped mid-sentence. */
function fragmentOf(dream: string): string {
  const clause = dream.split(/[.,;—]/)[0].trim();
  const words = clause.split(/\s+/).slice(0, 12).join(" ");
  return words.replace(/^I\s+(was|were|am)\s+/i, "").toLowerCase();
}

interface Beats {
  titles: string[];
  beats: string[][];
}

/** `{dream}` takes the dream verbatim, `{fragment}` the clause above. */
const BEATS: Record<Genre, Beats> = {
  horror: {
    titles: ["The Quiet Hour", "What The Dark Kept", "Something Counted Back"],
    beats: [
      [
        "It began the way you remember it. {dream} That much you can say out loud without your voice changing. What you cannot say is how long it had been going on before you noticed — how many nights the same shape had stood at the edge of the same room, patient as furniture, waiting for you to look directly at it.",
        "You have told this part before. {dream} You tell it lightly, the way people do with things that have not finished happening yet. The lightness is the tell. Somewhere behind the telling, the room you describe is still standing, still lit, still waiting for you to come back and finish looking.",
      ],
      [
        "The house was not empty. That is the wrong word, and you have always known it was the wrong word. Empty is a thing a house can be. This one was vacated — cleared out deliberately, and recently, by something that had heard you coming and did not want to be seen leaving.",
      ],
      [
        "It was the sound that changed first. Not louder. Closer. The distance between you and it collapsed by exactly one room each time you stopped to listen, and you understood, with the flat calm that only arrives in dreams, that it had been measuring the distance too.",
      ],
      [
        "By then you were counting doors. Seven behind you, and the eighth would not open, and the ninth had never been there at all. Somewhere in the counting you realised the number had been going up, not down, and that the corridor you were walking had begun the night with an end.",
      ],
      [
        "You woke before it reached you. That is what you tell yourself, and it is nearly true. But the detail that will not settle is this: in the dream, {fragment} — and you were not afraid. You were relieved. Because the thing at the end of the corridor was not chasing you.\n\nIt was following you home.",
        "You woke before it reached you, and the relief lasted until you understood what waking had cost. The corridor is still there. It did not stop when you opened your eyes. And somewhere along its length, {fragment}, a door you never opened is standing open now.",
      ],
    ],
  },
  funny: {
    titles: ["An Administrative Error", "The Committee Will See You", "Regrettably, Ducks"],
    beats: [
      [
        "The trouble started, as trouble does, with paperwork. {dream} Nobody had filed for that. There is a form — there is always a form — and it had not been filed, and so the situation proceeded entirely without authorisation, which everyone agreed afterwards was the most upsetting part.",
        "Look, it was going fine. {dream} That is a perfectly normal sequence of events and I will not be taking questions about it. The abnormal part came later, and involved a committee, and I would like it noted that I was not the one who invited the committee.",
      ],
      [
        "A man in a high-visibility jacket appeared to explain that this was a restricted area. He was standing in a corridor that had not existed forty seconds earlier, holding a clipboard with nothing on it, and he was extremely confident. He asked for identification. I gave him a library card. He photocopied it, somehow, using no visible equipment.",
      ],
      [
        "By the third floor the ducks had organised. I want to stress that there had been no ducks. This was established. The building had a strict no-duck policy, printed on a laminated sign that the ducks had clearly read, because they had arranged themselves into a shape that was, unmistakably, a rebuttal.",
      ],
      [
        "The lift descended for eleven minutes. The building has four floors. When the doors opened we were in a car park that smelled of a school gymnasium, and a woman with a megaphone informed us that the appeal had been unsuccessful, that we had never appealed, and that the ducks were now management.",
      ],
      [
        "I would like to end by noting that {fragment} is not, legally, my fault. The tribunal disagreed. The tribunal was six ducks and the man with the clipboard. I have been fined an amount of money that does not exist, in a currency they invented during the hearing, and I have paid it.\n\nI am appealing. The ducks are handling my appeal.",
      ],
    ],
  },
  romantic: {
    titles: ["The Long Way Round", "Held Light", "What You Left Unlocked"],
    beats: [
      [
        "You dreamed it plainly, the way the heart says things when it is finally allowed to. {dream} There was no ache in it. That was the strange part — the absence of the ache you had been carrying so long you had stopped calling it anything at all.",
        "It came to you gently, and you let it. {dream} You have spent a great deal of energy not letting things, and the dream simply declined to accept that from you. It set the thing down in front of you and waited, without impatience, for you to look at it properly.",
      ],
      [
        "The light in that place was the low gold of late afternoon in a room you have not stood in for years. It fell across everything without hurrying. Nothing in the dream was in a hurry. That alone should have told you what the dream was about, because nothing in your waking life has been unhurried for a very long time.",
      ],
      [
        "There was someone there. Not a face — the dream was kinder than that, and did not make you do the work of recognising anyone. Only the fact of them. The particular quiet of a room with one other person in it who is not waiting for you to be different.",
      ],
      [
        "You talked about nothing. The weather in a place neither of you lived. A song one of you had misremembered for a decade. It was the conversation you have been not-having with someone real, conducted safely, in a language the dream invented so that it would not cost you anything to say it.",
      ],
      [
        "And when you woke, the ache came back — but changed. Lighter. Because {fragment} was never really the dream's subject. The dream was showing you that you still know how to want something without bracing for it.\n\nThat capacity had not gone anywhere. You had only put it down. It is still where you left it, and it is still yours.",
      ],
    ],
  },
  sad: {
    titles: ["The House Still Standing", "Small Weather", "Nothing Was Lost"],
    beats: [
      [
        "In the dream it was ordinary. {dream} Nothing announced itself. That is how you knew it was a true dream and not a frightening one — the true ones never arrive with music, they simply resume, as though they had been running quietly the whole time you were awake.",
        "It was an ordinary evening in the dream. {dream} Nobody said anything important. You have noticed that about the dreams that stay with you: they are never about the last conversation. They are about a Tuesday.",
      ],
      [
        "The room was exactly right. Not the room as it was at the end — the room as it was for years before that, when it was nobody's last anything. The chair in the wrong place. The window that stuck. The particular sound the floor made near the door, which you had entirely forgotten you knew.",
      ],
      [
        "You were not sad in the dream. This is the part that is difficult to explain to people who ask. You were simply there, doing something small and unmemorable, in the company of something the dream had returned to you without comment or ceremony, as if it had never been away.",
      ],
      [
        "And there was time. That is the cruelty of it, and also the mercy. In the dream there was no shortage of time. There was no sense that anything had to be said now, because there would be a Wednesday, and a week after that, and the conversation could keep.",
      ],
      [
        "You woke slowly, and for a moment you did not remember. That moment is the whole of it — the small mercy and the whole of the grief arriving one after the other in the same breath. {fragment}, and then the room, and then the knowing.\n\nIt does not get shorter, that moment. It only gets further apart. You would not trade it. You have thought about this carefully, and you would not trade it.",
      ],
    ],
  },
  dramatic: {
    titles: ["The Last Good Hour", "Everything, And Then", "Hold The Line"],
    beats: [
      [
        "There is a moment before everything changes, and you were standing in it. {dream} You did not know it was the last quiet minute. Nobody ever does. That is the arrangement — the hour announces itself only after it has gone.",
        "It started small, the way the enormous things do. {dream} Later they would ask you when you knew. The honest answer is that you knew immediately and refused it for three full seconds, and that those three seconds were the last ordinary time you will ever have.",
      ],
      [
        "The ground gave first. Not dramatically — a settling, a shift of a few degrees, the sound a building makes when it decides. And in the half-second afterwards every person in that place made the same calculation at the same instant, and half of them got it wrong.",
      ],
      [
        "You ran towards it. You will spend years being unable to explain that. There was no decision in it, no weighing, nothing you could reconstruct afterwards for anyone who needed you to have been brave on purpose. Your body simply went, and the rest of you followed, arguing the whole way.",
      ],
      [
        "The noise stopped. That was worse. In the silence you could hear the specific, ordinary sounds of a place that had just ended — water finding a new route, metal cooling, somebody's radio still playing to nobody in a car with its door open and its headlights on.",
      ],
      [
        "They will tell it wrong. They will make it a story with a shape, and give it a reason, and put you somewhere near the middle of it looking resolute. Let them. You know where you actually were: on your knees in the dark, at the exact place where {fragment}, holding on to somebody's hand and lying to them about the time.\n\nAnd they held on. That is the part worth telling. In the worst hour anyone there would ever have, not one person let go.",
      ],
    ],
  },
};

/** Picks one variant, advancing the shared RNG so beats don't correlate. */
function pick(variants: string[], random: () => number): string {
  return variants[Math.floor(random() * variants.length)];
}

export function composeDemoStory(
  dream: string,
  genre: Genre,
): { title: string; body: string } {
  const random = seededRandom(hashText(`${genre}:${dream}`));
  const source = BEATS[genre];
  const fragment = fragmentOf(dream);

  const fill = (text: string) =>
    text.replaceAll("{dream}", dream).replaceAll("{fragment}", fragment);

  return {
    title: pick(source.titles, random),
    body: source.beats.map((beat) => fill(pick(beat, random))).join("\n\n"),
  };
}

/** Paced so the client sees the same progressive arrival a model stream gives. */
export async function* streamDemoStory(
  dream: string,
  genre: Genre,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const { title, body } = composeDemoStory(dream, genre);

  // The two blank lines the real prompt asks for — the client splits on them.
  yield `${title}\n\n\n`;

  // Split on whitespace but keep it, so paragraph breaks survive the rejoin.
  for (const token of body.split(/(\s+)/)) {
    if (signal.aborted) return;
    yield token;
    if (token.trim() !== "") {
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
  }
}
