const SNIFF_BYTES = 8000;

/** Same heuristic git uses: a NUL byte near the start means the file is binary. */
export function isBinary(content: Buffer): boolean {
  return content.subarray(0, SNIFF_BYTES).includes(0);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
