import { describe, expect, it } from "vitest";
import { drainLines } from "../ollama";

const line = (content: string, done = false) =>
  JSON.stringify({ message: { role: "assistant", content }, done }) + "\n";

describe("drainLines", () => {
  it("pulls the text out of complete lines", () => {
    const { texts, rest, done } = drainLines(line("Hello ") + line("world"));
    expect(texts).toEqual(["Hello ", "world"]);
    expect(rest).toBe("");
    expect(done).toBe(false);
  });

  it("holds back a partial trailing line rather than parsing it", () => {
    const partial = line("Hello ") + '{"message":{"content":"wor';
    const { texts, rest } = drainLines(partial);
    expect(texts).toEqual(["Hello "]);
    expect(rest).toBe('{"message":{"content":"wor');
  });

  it("reports the done marker", () => {
    expect(drainLines(line("end", true)).done).toBe(true);
  });

  it("skips metadata-only lines carrying no content", () => {
    const meta = JSON.stringify({ model: "llama3.2", done: false }) + "\n";
    expect(drainLines(meta + line("text")).texts).toEqual(["text"]);
  });

  it("skips malformed lines instead of throwing", () => {
    expect(drainLines("not json\n" + line("ok")).texts).toEqual(["ok"]);
  });

  it("ignores blank lines", () => {
    expect(drainLines("\n\n" + line("ok")).texts).toEqual(["ok"]);
  });

  it("reassembles a stream split at every byte boundary", () => {
    const payload = line("The ") + line("quiet ") + line("hour", true);

    for (let cut = 1; cut < payload.length; cut++) {
      let buffer = payload.slice(0, cut);
      const collected: string[] = [];

      let drained = drainLines(buffer);
      collected.push(...drained.texts);
      buffer = drained.rest + payload.slice(cut);

      drained = drainLines(buffer);
      collected.push(...drained.texts);

      expect(collected.join(""), `split at byte ${cut}`).toBe(
        "The quiet hour",
      );
    }
  });
});
