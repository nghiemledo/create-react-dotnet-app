/**
 * A rendering for `<!-- crda:<name> -->...<!-- /crda:<name> -->` blocks in the template's Markdown files.
 * A string replaces the block, markers included. A function receives the text between the markers (without the
 * line breaks that put the markers on their own lines) and returns its replacement, so the source text can be
 * kept or edited instead of rewritten.
 */
export type DocBlock = string | ((inner: string) => string);

const BLOCK_PATTERN = /<!-- crda:([a-z-]+) -->([\s\S]*?)<!-- \/crda:\1 -->/g;

/** Replaces every marked block with its rendering. Unknown block names are template bugs. */
export function renderDocBlocks(text: string, blocks: Record<string, DocBlock>, templatePath: string): string {
  let result = '';
  let position = 0;
  for (const match of text.matchAll(BLOCK_PATTERN)) {
    const [whole, name = '', inner = ''] = match;
    const block = blocks[name];
    if (block === undefined) {
      throw new Error(`Unknown documentation block "${name}" in ${templatePath}.`);
    }
    const rendered = typeof block === 'string' ? block : block(inner.replace(/^\r?\n/, '').replace(/\r?\n$/, ''));
    let end = match.index + whole.length;
    // An empty block that occupies whole lines disappears with its line instead of leaving a blank one.
    if (rendered === '' && (match.index === 0 || text[match.index - 1] === '\n')) {
      end += text.slice(end).match(/^\r?\n/)?.[0].length ?? 0;
    }
    result += text.slice(position, match.index) + rendered;
    position = end;
  }
  return result + text.slice(position);
}

/** Keeps the source text of a block as it is. */
export const keepBlock: DocBlock = (inner) => inner;

/** Replaces text that must occur exactly once, so an upstream wording change fails generation instead of being missed. */
export function replaceOnce(text: string, from: string, to: string, blockName: string): string {
  const occurrences = text.split(from).length - 1;
  if (occurrences !== 1) {
    throw new Error(
      `Documentation block "${blockName}" no longer contains "${from}" exactly once (found ${occurrences}); ` +
        'the template changed, so this version of the CLI cannot render it.',
    );
  }
  return text.replace(from, () => to);
}
