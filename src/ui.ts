import { stripVTControlCharacters, styleText } from 'node:util';

export type Paint = (text: string) => string;

/** styleText drops the codes when stdout is not a color terminal (pipes, CI, NO_COLOR), so output stays clean. */
export const paint = {
  accent: (text: string) => styleText('cyan', text),
  success: (text: string) => styleText('green', text),
  warn: (text: string) => styleText('yellow', text),
  error: (text: string) => styleText('red', text),
  dim: (text: string) => styleText('dim', text),
  bold: (text: string) => styleText('bold', text),
  highlight: (text: string) => styleText('cyan', styleText('bold', text)),
} satisfies Record<string, Paint>;

export const identity: Paint = (text) => text;

export function visibleWidth(text: string): number {
  return stripVTControlCharacters(text).length;
}

/** Draws a rounded box around the lines; the optional title sits in the top border. */
export function box(lines: string[], options: { border?: Paint; title?: string } = {}): string[] {
  const border = options.border ?? identity;
  const title = options.title;
  const titleWidth = title === undefined ? 0 : visibleWidth(title);
  const width = Math.max(...lines.map(visibleWidth), title === undefined ? 0 : titleWidth + 1);
  const top =
    title === undefined
      ? border(`╭${'─'.repeat(width + 2)}╮`)
      : `${border('╭─')} ${title} ${border(`${'─'.repeat(width - titleWidth - 1)}╮`)}`;
  const rows = lines.map((line) => `${border('│')} ${line}${' '.repeat(width - visibleWidth(line))} ${border('│')}`);
  return [top, ...rows, border(`╰${'─'.repeat(width + 2)}╯`)];
}

export function bannerLines(version: string): string[] {
  return box(
    [
      `${paint.accent('◆')} ${paint.bold('create-react-dotnet-app')} ${paint.dim(`v${version}`)}`,
      paint.dim('React 19 + ASP.NET Core 9 · Clean Architecture starter'),
    ],
    { border: paint.accent },
  );
}
