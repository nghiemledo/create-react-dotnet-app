import path from 'node:path';

/** A path for copy-pasteable instructions: relative to the working directory, quoted when it has spaces. */
export function displayPath(target: string, cwd = process.cwd()): string {
  const relative = path.relative(cwd, target) || '.';
  return /\s/.test(relative) ? `"${relative}"` : relative;
}
