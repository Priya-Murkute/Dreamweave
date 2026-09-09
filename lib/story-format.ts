/**
 * The prompt asks for two blank lines after the title, so the separator is
 * "\n\n\n" — the trailing `+` consumes the whole run. Only the first run is
 * matched; later ones are the story's own paragraph breaks.
 *
 * Not a /g/ literal: a global regex carries lastIndex between calls, and this
 * runs against a growing buffer on every streamed chunk.
 */
const TITLE_SEPARATOR = /\r?\n(?:[ \t]*\r?\n)+/;

export function splitStory(raw: string): { title: string; body: string } {
  const separator = TITLE_SEPARATOR.exec(raw);

  // No blank run yet — everything so far is still the title arriving.
  if (!separator) return { title: raw.trimStart(), body: "" };

  return {
    title: raw.slice(0, separator.index).trim(),
    body: raw.slice(separator.index + separator[0].length),
  };
}
