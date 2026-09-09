import { describe, expect, it } from "vitest";
import { splitStory } from "../story-format";

const TITLE = "The Breathing Shelves";
const BODY = "I walked the stacks — endless.\n\nThe books exhaled.";
const FULL = `${TITLE}\n\n\n${BODY}`;

describe("splitStory", () => {
  it("splits on the two blank lines the prompt asks for", () => {
    expect(splitStory(FULL)).toEqual({ title: TITLE, body: BODY });
  });

  it("does not leave a leading newline on the body", () => {
    expect(splitStory(FULL).body.startsWith("\n")).toBe(false);
  });

  it("keeps the body's own paragraph breaks", () => {
    expect(splitStory(FULL).body).toContain("\n\n");
  });

  it("treats everything as title until a blank run arrives", () => {
    expect(splitStory("The Breath")).toEqual({ title: "The Breath", body: "" });
  });

  it("accepts a single blank line", () => {
    expect(splitStory("Title\n\nBody").body).toBe("Body");
  });

  it("accepts CRLF", () => {
    expect(splitStory("Title\r\n\r\n\r\nBody").body).toBe("Body");
  });

  it("accepts whitespace on the blank line", () => {
    expect(splitStory("Title\n   \n\nBody").body).toBe("Body");
  });

  it("is stable across every byte-level chunk boundary", () => {
    const bytes = new TextEncoder().encode(FULL);

    for (let cut = 1; cut < bytes.length; cut++) {
      const decoder = new TextDecoder();
      let raw = decoder.decode(bytes.slice(0, cut), { stream: true });
      splitStory(raw); // must not throw mid-stream
      raw += decoder.decode(bytes.slice(cut), { stream: true });
      raw += decoder.decode();

      expect(splitStory(raw), `split at byte ${cut}`).toEqual({
        title: TITLE,
        body: BODY,
      });
    }
  });
});
