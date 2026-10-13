import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isBinary } from '../src/text.js';

export interface SourceSnapshot {
  /** The commit that was read, or HEAD when reading the working tree. */
  commit: string;
  /** True when uncommitted files were read: such a template cannot be reproduced from a commit. */
  worktree: boolean;
  files: Map<string, Buffer>;
}

function git(source: string, args: string[]): Buffer {
  return execFileSync('git', ['-C', source, ...args], { maxBuffer: 512 * 1024 * 1024 });
}

function nulList(output: Buffer): string[] {
  return output.toString('utf8').split('\0').filter(Boolean);
}

/** Files tracked at a commit. Uncommitted changes and ignored files are never read. */
export function readCommit(source: string, ref: string): SourceSnapshot {
  const commit = git(source, ['rev-parse', '--verify', `${ref}^{commit}`]).toString('utf8').trim();
  const files = new Map<string, Buffer>();
  for (const line of nulList(git(source, ['ls-tree', '-r', '-z', commit]))) {
    const [meta = '', filePath = ''] = line.split('\t');
    const [mode = '', type = '', objectId = ''] = meta.split(' ');
    if (type !== 'blob' || mode === '120000') {
      throw new Error(`Unsupported tree entry (${type} ${mode}): ${filePath}`);
    }
    files.set(filePath, git(source, ['cat-file', 'blob', objectId]));
  }
  return { commit, worktree: false, files };
}

/**
 * Tracked files plus untracked files that are not ignored, as `git add -A` would stage them: unmodified tracked
 * files come from the index, everything else from disk with line endings normalized the way core.autocrlf would.
 * Ignored files (node_modules, .env, build output) are never read. For development only; releases sync a commit.
 */
export function readWorktree(source: string): SourceSnapshot {
  const commit = git(source, ['rev-parse', '--verify', 'HEAD^{commit}']).toString('utf8').trim();
  const autocrlf = gitConfig(source, 'core.autocrlf');
  const normalize = autocrlf === 'true' || autocrlf === 'input';

  const indexed = new Map<string, { mode: string; objectId: string }>();
  for (const line of nulList(git(source, ['ls-files', '-s', '-z']))) {
    const [meta = '', filePath = ''] = line.split('\t');
    const [mode = '', objectId = ''] = meta.split(' ');
    indexed.set(filePath, { mode, objectId });
  }
  const changed = new Set(nulList(git(source, ['diff', '--name-only', '-z'])));
  const untracked = nulList(git(source, ['ls-files', '-z', '--others', '--exclude-standard']));

  const files = new Map<string, Buffer>();
  const readDisk = (filePath: string) => {
    const content = readFileSync(path.join(source, ...filePath.split('/')));
    return normalize && !isBinary(content) ? Buffer.from(content.toString('utf8').replaceAll('\r\n', '\n'), 'utf8') : content;
  };
  for (const [filePath, entry] of indexed) {
    if (entry.mode === '120000' || entry.mode === '160000') {
      throw new Error(`Unsupported index entry (${entry.mode}): ${filePath}`);
    }
    if (!changed.has(filePath)) {
      files.set(filePath, git(source, ['cat-file', 'blob', entry.objectId]));
    } else if (existsSync(path.join(source, ...filePath.split('/')))) {
      files.set(filePath, readDisk(filePath));
    }
  }
  for (const filePath of untracked) {
    files.set(filePath, readDisk(filePath));
  }
  return { commit, worktree: true, files: new Map([...files].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}

export function hasUncommittedChanges(source: string): boolean {
  return git(source, ['status', '--porcelain']).length > 0;
}

function gitConfig(source: string, key: string): string | undefined {
  try {
    return git(source, ['config', '--get', key]).toString('utf8').trim().toLowerCase();
  } catch {
    return undefined;
  }
}
