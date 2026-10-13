/**
 * Rebuilds templates/default and the synced client of each frontend overlay (templates/frontends/<name>/client)
 * from a git commit of the private react-dotnet-boilerplate repository.
 *
 *   npm run sync-template -- --source <path-to-local-clone> [--ref <tag|branch|sha>] [--dry-run]
 *   npm run sync-template -- --source <path-to-local-clone> --worktree [--dry-run]
 *
 * By default only files tracked at that commit are read (uncommitted changes and ignored files never leak in).
 * --worktree also reads uncommitted and untracked (but not ignored) files, for developing against unreleased
 * boilerplate changes; it is recorded in templates/default.source.json and fails the release audit.
 * scripts/template-rules.ts then excludes, routes and sanitizes the files.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { packageRoot } from '../src/paths.js';
import { hasUncommittedChanges, readCommit, readWorktree } from './source-files.js';
import { FRONTEND_SOURCE_DIRS, sanitizeSourceFiles } from './template-rules.js';

const SOURCE_REPOSITORY_NAME = 'react-dotnet-boilerplate';
const templatesDir = path.join(packageRoot, 'templates');
const templateDir = path.join(templatesDir, 'default');
const frontendsDir = path.join(templatesDir, 'frontends');
const sourceInfoFile = path.join(templatesDir, 'default.source.json');
/** The part of a frontend overlay that comes from the source repository; the rest (e.g. _vscode) is CLI-owned. */
const SYNCED_FRONTEND_DIR = 'client';

async function writeTree(targetDir: string, files: Map<string, Buffer>): Promise<void> {
  const stagingDir = path.join(path.dirname(targetDir), `.sync-${process.pid}`);
  await fs.rm(stagingDir, { recursive: true, force: true });
  for (const [relativePath, content] of files) {
    const destination = path.join(stagingDir, ...relativePath.split('/'));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
  }
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.rename(stagingDir, targetDir);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string' },
      ref: { type: 'string' },
      worktree: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (!values.source) {
    throw new Error('Missing --source <path to a local clone of react-dotnet-boilerplate>.');
  }
  if (values.worktree && values.ref) {
    throw new Error('--worktree reads the working tree; it cannot be combined with --ref.');
  }

  const source = path.resolve(values.source);
  const ref = values.ref ?? 'HEAD';
  const snapshot = values.worktree ? readWorktree(source) : readCommit(source, ref);
  if (!snapshot.worktree && hasUncommittedChanges(source)) {
    console.warn(`! ${source} has uncommitted changes; they are NOT included (syncing ${ref} = ${snapshot.commit}).`);
  }
  if (snapshot.worktree) {
    console.warn(
      `! Reading the WORKING TREE of ${source} (HEAD = ${snapshot.commit}), including uncommitted and untracked ` +
        'files. The result is not reproducible from a commit: do not release it. Re-sync from a commit first.',
    );
  }

  const result = sanitizeSourceFiles(snapshot.files);
  for (const [overlay, sourceDir] of Object.entries(FRONTEND_SOURCE_DIRS)) {
    if (!result.frontendFiles.get(overlay)?.size) {
      throw new Error(
        `The source has no ${sourceDir} (the ${overlay} frontend). ` +
          (snapshot.worktree ? '' : `Is it committed at ${ref}? `) +
          'Syncing without it would leave templates/frontends out of step with templates/default.',
      );
    }
  }

  const label = snapshot.worktree ? `working tree (HEAD ${snapshot.commit})` : `${snapshot.commit} (${ref})`;
  console.log(`Source: ${SOURCE_REPOSITORY_NAME} @ ${label}`);
  console.log(
    `Files: ${snapshot.files.size} read, ${result.files.size} in templates/default, ` +
      [...result.frontendFiles].map(([overlay, files]) => `${files.size} in templates/frontends/${overlay}`).join(', ') +
      `, ${result.excluded.length} excluded`,
  );
  result.excluded.forEach((file) => console.log(`  excluded  ${file}`));
  result.applied.forEach((rule) => console.log(`  sanitized ${rule}`));

  if (values['dry-run']) {
    console.log('Dry run: templates were not changed.');
    return;
  }

  await writeTree(templateDir, result.files);
  for (const [overlay, files] of result.frontendFiles) {
    const synced = new Map(
      [...files].map(([templatePath, content]) => {
        if (!templatePath.startsWith(`${SYNCED_FRONTEND_DIR}/`)) {
          throw new Error(`Unexpected frontend file outside ${SYNCED_FRONTEND_DIR}/: ${templatePath}`);
        }
        return [templatePath.slice(SYNCED_FRONTEND_DIR.length + 1), content] as const;
      }),
    );
    await fs.mkdir(path.join(frontendsDir, overlay), { recursive: true });
    await writeTree(path.join(frontendsDir, overlay, SYNCED_FRONTEND_DIR), synced);
  }
  const sourceInfo = {
    repository: SOURCE_REPOSITORY_NAME,
    ref: snapshot.worktree ? 'WORKTREE' : ref,
    commit: snapshot.commit,
    ...(snapshot.worktree ? { worktree: true } : {}),
    syncedAt: new Date().toISOString(),
  };
  await fs.writeFile(sourceInfoFile, `${JSON.stringify(sourceInfo, null, 2)}\n`);
  console.log(`Updated templates/default, templates/frontends and ${path.relative(packageRoot, sourceInfoFile)}.`);
  console.log('Review the diff (git diff --stat templates/), then run npm run check.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
