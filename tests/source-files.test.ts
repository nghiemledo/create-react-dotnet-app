import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readCommit, readWorktree } from '../scripts/source-files.js';
import { makeTempDir, writeFiles } from './helpers.js';

function hasGit(): boolean {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const BINARY = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d, 0x0a, 0x1a]);

async function makeRepository(autocrlf: string): Promise<{ repo: string; commit: string }> {
  const repo = await makeTempDir();
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', ...args], {
      cwd: repo,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString('utf8')
      .trim();
  git('init', '--quiet');
  git('config', 'core.autocrlf', autocrlf);
  await writeFiles(repo, {
    '.gitignore': 'ignored.txt\n',
    'tracked.txt': 'a\nb\n',
    'modified.txt': 'x\n',
    'deleted.txt': 'gone\n',
  });
  git('add', '-A');
  git('commit', '--quiet', '-m', 'initial');
  await writeFiles(repo, {
    'modified.txt': 'y\r\nz\r\n',
    'untracked/new.txt': 'u\r\n',
    'ignored.txt': 'must never be read',
    'untracked/image.bin': BINARY,
  });
  await fs.rm(path.join(repo, 'deleted.txt'));
  return { repo, commit: git('rev-parse', 'HEAD') };
}

describe.skipIf(!hasGit())('source snapshots', () => {
  it('reads the working tree as `git add -A` would stage it, never ignored files', async () => {
    const { repo, commit } = await makeRepository('true');
    const snapshot = readWorktree(repo);

    expect(snapshot).toMatchObject({ commit, worktree: true });
    expect([...snapshot.files.keys()]).toEqual(['.gitignore', 'modified.txt', 'tracked.txt', 'untracked/image.bin', 'untracked/new.txt']);
    const text = (p: string) => snapshot.files.get(p)?.toString('utf8');
    expect(text('tracked.txt')).toBe('a\nb\n');
    expect(text('modified.txt')).toBe('y\nz\n');
    expect(text('untracked/new.txt')).toBe('u\n');
    expect(snapshot.files.get('untracked/image.bin')?.equals(BINARY)).toBe(true);
  });

  it('keeps line endings when core.autocrlf is off', async () => {
    const { repo } = await makeRepository('false');
    expect(readWorktree(repo).files.get('untracked/new.txt')?.toString('utf8')).toBe('u\r\n');
  });

  it('reads only the files committed at a ref', async () => {
    const { repo, commit } = await makeRepository('true');
    const snapshot = readCommit(repo, 'HEAD');

    expect(snapshot).toMatchObject({ commit, worktree: false });
    expect([...snapshot.files.keys()].sort()).toEqual(['.gitignore', 'deleted.txt', 'modified.txt', 'tracked.txt']);
    expect(snapshot.files.get('modified.txt')?.toString('utf8')).toBe('x\n');
  });
});
