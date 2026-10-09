/**
 * Rebuilds templates/default from a git commit of the private react-dotnet-boilerplate repository.
 *
 *   npm run sync-template -- --source <path-to-local-clone> [--ref <tag|branch|sha>] [--dry-run]
 *
 * Only files tracked at that commit are read (uncommitted changes and ignored files never leak in),
 * then scripts/template-rules.ts excludes and sanitizes them.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { packageRoot } from '../src/paths.js';
import { sanitizeSourceFiles } from './template-rules.js';

const SOURCE_REPOSITORY_NAME = 'react-dotnet-boilerplate';
const templatesDir = path.join(packageRoot, 'templates');
const templateDir = path.join(templatesDir, 'default');
const sourceInfoFile = path.join(templatesDir, 'default.source.json');

function git(source: string, args: string[]): Buffer {
  return execFileSync('git', ['-C', source, ...args], { maxBuffer: 512 * 1024 * 1024 });
}

interface TreeEntry {
  mode: string;
  type: string;
  objectId: string;
  path: string;
}

function listTree(source: string, commit: string): TreeEntry[] {
  return git(source, ['ls-tree', '-r', '-z', commit])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((line) => {
      const [meta = '', filePath = ''] = line.split('\t');
      const [mode = '', type = '', objectId = ''] = meta.split(' ');
      return { mode, type, objectId, path: filePath };
    });
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string' },
      ref: { type: 'string', default: 'HEAD' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (!values.source) {
    throw new Error('Missing --source <path to a local clone of react-dotnet-boilerplate>.');
  }

  const source = path.resolve(values.source);
  const ref = values.ref ?? 'HEAD';
  const commit = git(source, ['rev-parse', '--verify', `${ref}^{commit}`]).toString('utf8').trim();

  if (git(source, ['status', '--porcelain']).length > 0) {
    console.warn(`! ${source} has uncommitted changes; they are NOT included (syncing ${ref} = ${commit}).`);
  }

  const sourceFiles = new Map<string, Buffer>();
  for (const entry of listTree(source, commit)) {
    if (entry.type !== 'blob' || entry.mode === '120000') {
      throw new Error(`Unsupported tree entry (${entry.type} ${entry.mode}): ${entry.path}`);
    }
    sourceFiles.set(entry.path, git(source, ['cat-file', 'blob', entry.objectId]));
  }

  const result = sanitizeSourceFiles(sourceFiles);

  console.log(`Source: ${SOURCE_REPOSITORY_NAME} @ ${commit} (${ref})`);
  console.log(`Files: ${sourceFiles.size} tracked, ${result.files.size} in template, ${result.excluded.length} excluded`);
  result.excluded.forEach((file) => console.log(`  excluded  ${file}`));
  result.applied.forEach((rule) => console.log(`  sanitized ${rule}`));

  if (values['dry-run']) {
    console.log('Dry run: templates/default was not changed.');
    return;
  }

  const stagingDir = path.join(templatesDir, `.sync-${process.pid}`);
  await fs.rm(stagingDir, { recursive: true, force: true });
  for (const [templatePath, content] of result.files) {
    const destination = path.join(stagingDir, ...templatePath.split('/'));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
  }

  await fs.rm(templateDir, { recursive: true, force: true });
  await fs.rename(stagingDir, templateDir);
  await fs.writeFile(
    sourceInfoFile,
    `${JSON.stringify({ repository: SOURCE_REPOSITORY_NAME, ref, commit, syncedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  console.log(`Updated ${path.relative(packageRoot, templateDir)} and ${path.relative(packageRoot, sourceInfoFile)}.`);
  console.log('Review the diff (git diff --stat templates/), then run npm run check.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
