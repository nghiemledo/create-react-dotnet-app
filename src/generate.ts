import fs from 'node:fs/promises';
import path from 'node:path';
import { CancelledError, CliError } from './errors.js';
import { toPascalCase, validateDisplayName, validateProjectName } from './naming.js';
import type { PackageManager } from './package-managers.js';
import { applyReplacements, buildReplacements, type Replacement } from './replacements.js';
import { generateSecrets, type ProjectSecrets } from './secrets.js';
import { isBinary } from './text.js';
import { SOURCE_PROJECT_NAME, TEMPLATE_GITIGNORE_NAME, TEMPLATE_TOKENS } from './tokens.js';

const PNPM_LOCKFILE = 'client/pnpm-lock.yaml';
const ENV_EXAMPLE = 'client/.env.example';
const ENV_FILE = 'client/.env';
/** Version-control metadata is never copied, even if it somehow ends up inside the template. */
const NEVER_COPIED = new Set(['.git']);

export interface PlannedFile {
  templatePath: string;
  destinationPath: string;
}

export type DestinationState = 'missing' | 'empty' | 'non-empty';

export interface DestinationInspection {
  state: DestinationState;
  /** Planned paths that already exist (or are blocked by a file) in a non-empty destination. */
  conflicts: string[];
}

export interface GenerateOptions {
  templateDir: string;
  targetDir: string;
  projectName: string;
  displayName: string;
  packageManager: PackageManager;
  /** Explicit consent to add files to a non-empty directory. Existing files are never overwritten. */
  allowNonEmpty?: boolean;
  /** Aborting stops generation and removes everything this run wrote. */
  signal?: AbortSignal;
  /** Injected by tests; generated randomly otherwise. */
  secrets?: ProjectSecrets;
}

export interface GenerateResult {
  targetDir: string;
  pascalName: string;
  secrets: ProjectSecrets;
  fileCount: number;
}

export async function generateProject(options: GenerateOptions): Promise<GenerateResult> {
  const nameError = validateProjectName(options.projectName);
  if (nameError) {
    throw new CliError(`Invalid project name "${options.projectName}": ${nameError}`);
  }
  const displayNameError = validateDisplayName(options.displayName);
  if (displayNameError) {
    throw new CliError(`Invalid display name "${options.displayName}": ${displayNameError}`);
  }

  const pascalName = toPascalCase(options.projectName);
  const plan = await planProject(options.templateDir, pascalName, options.packageManager);
  const destination = await inspectDestination(options.targetDir, plan);
  if (destination.state === 'non-empty') {
    if (!options.allowNonEmpty) {
      throw new CliError(nonEmptyDirectoryMessage(options.targetDir));
    }
    if (destination.conflicts.length > 0) {
      throw new CliError(conflictMessage(options.targetDir, destination.conflicts));
    }
  }

  const secrets = options.secrets ?? generateSecrets();
  const replacements = buildReplacements({
    projectName: options.projectName,
    pascalName,
    displayName: options.displayName,
    secrets,
  });

  const writtenFiles: string[] = [];
  const createdDirs: string[] = [];
  try {
    for (const file of plan) {
      if (options.signal?.aborted) {
        throw new CancelledError('Cancelled while writing project files. Files written by this run were removed.');
      }
      const destinationPath = path.join(options.targetDir, ...file.destinationPath.split('/'));
      const content = await renderFile(options.templateDir, file.templatePath, replacements);
      const createdDir = await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      if (createdDir) {
        createdDirs.push(createdDir);
      }
      // 'wx' fails instead of overwriting if something appeared after the conflict check.
      await fs.writeFile(destinationPath, content, { flag: 'wx' });
      writtenFiles.push(destinationPath);
    }
  } catch (error) {
    await rollBack(writtenFiles, createdDirs);
    throw error;
  }

  return { targetDir: options.targetDir, pascalName, secrets, fileCount: writtenFiles.length };
}

/** Every file the project will contain, with renamed destination paths. */
export async function planProject(
  templateDir: string,
  pascalName: string,
  packageManager: PackageManager,
): Promise<PlannedFile[]> {
  const templateFiles = await listTemplateFiles(templateDir);
  const plan = templateFiles
    .filter((templatePath) => !(packageManager === 'npm' && templatePath === PNPM_LOCKFILE))
    .map((templatePath) => ({ templatePath, destinationPath: toDestinationPath(templatePath, pascalName) }));

  // The client works without .env (env.ts has fallbacks), but starting from the example keeps the settings visible.
  if (templateFiles.includes(ENV_EXAMPLE)) {
    plan.push({ templatePath: ENV_EXAMPLE, destinationPath: ENV_FILE });
  }
  return plan;
}

export async function inspectDestination(targetDir: string, plan: PlannedFile[]): Promise<DestinationInspection> {
  let stat;
  try {
    stat = await fs.stat(targetDir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return { state: 'missing', conflicts: [] };
    }
    if (code === 'ENOTDIR') {
      throw new CliError(`Cannot create "${targetDir}": part of the path is a file.`);
    }
    throw error;
  }

  if (!stat.isDirectory()) {
    throw new CliError(`"${targetDir}" already exists and is not a directory.`);
  }
  if ((await fs.readdir(targetDir)).length === 0) {
    return { state: 'empty', conflicts: [] };
  }

  const conflicts: string[] = [];
  for (const file of plan) {
    if (await isBlocked(targetDir, file.destinationPath)) {
      conflicts.push(file.destinationPath);
    }
  }
  return { state: 'non-empty', conflicts };
}

export function nonEmptyDirectoryMessage(targetDir: string): string {
  return `Directory "${targetDir}" already exists and is not empty. Choose a different project name or directory.`;
}

function conflictMessage(targetDir: string, conflicts: string[]): string {
  const examples = conflicts.slice(0, 3).join(', ');
  return `Cannot add the project to "${targetDir}": ${conflicts.length} file(s) would be overwritten (${examples}${
    conflicts.length > 3 ? ', ...' : ''
  }). Nothing was written.`;
}

export function toDestinationPath(templatePath: string, pascalName: string): string {
  return templatePath
    .split('/')
    .map((segment) =>
      segment === TEMPLATE_GITIGNORE_NAME ? '.gitignore' : segment.replaceAll(SOURCE_PROJECT_NAME, pascalName),
    )
    .join('/');
}

async function renderFile(templateDir: string, templatePath: string, replacements: Replacement[]): Promise<Buffer | string> {
  const source = await fs.readFile(path.join(templateDir, ...templatePath.split('/')));
  if (isBinary(source)) {
    return source;
  }
  const text = applyReplacements(source.toString('utf8'), templatePath, replacements);
  const leftover = Object.values(TEMPLATE_TOKENS).find((token) => text.includes(token));
  if (leftover) {
    throw new Error(`Template token ${leftover} was not replaced in ${templatePath}.`);
  }
  return text;
}

/** True if the path exists, or one of its parent segments exists as a non-directory. */
async function isBlocked(root: string, relativePath: string): Promise<boolean> {
  const segments = relativePath.split('/');
  let current = root;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    let stat;
    try {
      stat = await fs.lstat(current);
    } catch {
      return false;
    }
    if (index === segments.length - 1 || !stat.isDirectory()) {
      return true;
    }
  }
  return false;
}

/** Removes only what this run created: written files, then directories that did not exist before. */
async function rollBack(writtenFiles: string[], createdDirs: string[]): Promise<void> {
  await Promise.allSettled(writtenFiles.map((file) => fs.rm(file, { force: true })));
  for (const dir of [...createdDirs].reverse()) {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function listTemplateFiles(templateDir: string): Promise<string[]> {
  try {
    const stat = await fs.stat(templateDir);
    if (!stat.isDirectory()) {
      throw new Error('not a directory');
    }
  } catch {
    throw new CliError(
      `Template directory not found: ${templateDir}. ` +
        'If you are developing this CLI, run "npm run sync-template" first.',
    );
  }

  const files: string[] = [];
  const walk = async (relativeDir: string): Promise<void> => {
    const entries = await fs.readdir(path.join(templateDir, relativeDir), { withFileTypes: true });
    for (const entry of entries) {
      if (NEVER_COPIED.has(entry.name)) {
        continue;
      }
      const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  };
  await walk('');

  if (files.length === 0) {
    throw new CliError(`Template directory is empty: ${templateDir}`);
  }
  return files.sort();
}
