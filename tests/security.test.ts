import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultTemplateDir, packageRoot } from '../src/paths.js';
import { listFiles } from './helpers.js';

const CREDENTIAL_PATTERNS: [string, RegExp][] = [
  ['GitHub token', /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['token in URL', /https:\/\/[^/\s:@]+:[^/\s@]+@github\.com/],
];

async function textFiles(root: string): Promise<[string, string][]> {
  const result: [string, string][] = [];
  for (const file of await listFiles(root)) {
    const content = await fs.readFile(path.join(root, file));
    if (!content.subarray(0, 8000).includes(0)) {
      result.push([file, content.toString('utf8')]);
    }
  }
  return result;
}

describe('no embedded credentials', () => {
  it.each([
    ['src', path.join(packageRoot, 'src')],
    ['template', defaultTemplateDir],
  ])('%s contains no tokens or private keys', async (_label, root) => {
    if (!existsSync(root)) return;
    for (const [file, text] of await textFiles(root)) {
      for (const [kind, pattern] of CREDENTIAL_PATTERNS) {
        expect(pattern.test(text), `${kind} in ${file}`).toBe(false);
      }
    }
  });

  it('never downloads the template at runtime', async () => {
    for (const [file, text] of await textFiles(path.join(packageRoot, 'src'))) {
      expect(/\bfetch\(|node:https|node:http\b|git clone|github\.com/.test(text), file).toBe(false);
    }
  });

  it('never spawns through a shell', async () => {
    for (const [file, text] of await textFiles(path.join(packageRoot, 'src'))) {
      expect(/shell:\s*true|\bexec(Sync)?\(|node:child_process/.test(text), file).toBe(false);
    }
  });
});
