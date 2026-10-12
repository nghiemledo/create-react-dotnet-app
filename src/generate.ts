import fs from 'node:fs/promises';
import path from 'node:path';
import {
  DATABASES,
  DEFAULT_DATABASE,
  databaseDocBlocks,
  renderDocBlocks,
  type Database,
  type ProviderEdit,
} from './databases.js';
import { CancelledError, CliError } from './errors.js';
import { toPascalCase, validateDisplayName, validateProjectName } from './naming.js';
import type { PackageManager } from './package-managers.js';
import { defaultCommonDir, defaultDatabasesDir } from './paths.js';
import { applyReplacements, buildReplacements, type Replacement } from './replacements.js';
import { generateSecrets, type ProjectSecrets } from './secrets.js';
import { isBinary } from './text.js';
import { SOURCE_PROJECT_NAME, TEMPLATE_DOTFILE_NAMES, TEMPLATE_TOKENS } from './tokens.js';

const PNPM_LOCKFILE = 'client/pnpm-lock.yaml';
const ENV_EXAMPLE = 'client/.env.example';
const ENV_FILE = 'client/.env';
/** Version-control metadata is never copied, even if it somehow ends up inside the template. */
const NEVER_COPIED = new Set(['.git']);

export interface PlannedFile {
  /** Directory the file is read from: the template, or a database overlay. */
  sourceDir: string;
  templatePath: string;
  destinationPath: string;
}

export interface PlanOptions {
  templateDir: string;
  pascalName: string;
  packageManager: PackageManager;
  database?: Database;
  databasesDir?: string;
  commonDir?: string;
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
  /** Defaults to the template's own provider (SQL Server). */
  database?: Database;
  /** Where provider overlays live; defaults to the packaged `templates/databases`. */
  databasesDir?: string;
  /** Files added for every database; defaults to the packaged `templates/common`. */
  commonDir?: string;
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
  const database = options.database ?? DEFAULT_DATABASE;
  const plan = await planProject({
    templateDir: options.templateDir,
    pascalName,
    packageManager: options.packageManager,
    database,
    databasesDir: options.databasesDir,
    commonDir: options.commonDir,
  });
  await verifyProviderEdits(options.templateDir, database);
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
  const rendering: RenderContext = {
    replacements,
    edits: DATABASES[database].edits,
    docBlocks: databaseDocBlocks(database),
  };

  const writtenFiles: string[] = [];
  const createdDirs: string[] = [];
  try {
    for (const file of plan) {
      if (options.signal?.aborted) {
        throw new CancelledError('Cancelled while writing project files. Files written by this run were removed.');
      }
      const destinationPath = path.join(options.targetDir, ...file.destinationPath.split('/'));
      const content = await renderFile(file, rendering);
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
export async function planProject(options: PlanOptions): Promise<PlannedFile[]> {
  const { templateDir, pascalName, packageManager } = options;
  const info = DATABASES[options.database ?? DEFAULT_DATABASE];
  const templateFiles = await listTemplateFiles(templateDir);
  const plannedFile = (sourceDir: string, templatePath: string): PlannedFile => ({
    sourceDir,
    templatePath,
    destinationPath: toDestinationPath(templatePath, pascalName),
  });

  const plan = templateFiles
    .filter((templatePath) => !(packageManager === 'npm' && templatePath === PNPM_LOCKFILE))
    .filter((templatePath) => !(info.replacesPrefix && templatePath.startsWith(info.replacesPrefix)))
    .map((templatePath) => plannedFile(templateDir, templatePath));

  const overlays = [
    { dir: options.commonDir ?? defaultCommonDir, label: 'shared project' },
    { dir: path.join(options.databasesDir ?? defaultDatabasesDir, info.overlay), label: info.name },
  ];
  for (const overlay of overlays) {
    const overlayFiles = await listOverlayFiles(overlay.dir, overlay.label);
    const overlaid = new Set(overlayFiles);
    const kept = plan.filter((file) => !overlaid.has(file.templatePath));
    plan.length = 0;
    plan.push(...kept, ...overlayFiles.map((templatePath) => plannedFile(overlay.dir, templatePath)));
  }

  // The client works without .env (env.ts has fallbacks), but starting from the example keeps the settings visible.
  if (templateFiles.includes(ENV_EXAMPLE)) {
    plan.push({ sourceDir: templateDir, templatePath: ENV_EXAMPLE, destinationPath: ENV_FILE });
  }
  return plan;
}

/** Fails before anything is written if a provider edit no longer matches the bundled template exactly once. */
async function verifyProviderEdits(templateDir: string, database: Database): Promise<void> {
  const info = DATABASES[database];
  for (const edit of info.edits) {
    let text: string;
    try {
      text = await fs.readFile(path.join(templateDir, ...edit.templatePath.split('/')), 'utf8');
    } catch {
      throw new CliError(`Cannot generate a ${info.name} project: ${edit.templatePath} is missing from the template.`);
    }
    const occurrences = text.split(edit.from).length - 1;
    if (occurrences !== 1) {
      throw new CliError(
        `Cannot generate a ${info.name} project: the template's ${edit.templatePath} does not match what this ` +
          `version of the CLI expects (found the expected text ${occurrences} times). Nothing was written.`,
      );
    }
  }
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
      TEMPLATE_DOTFILE_NAMES[segment] ?? segment.replaceAll(SOURCE_PROJECT_NAME, pascalName),
    )
    .join('/');
}

interface RenderContext {
  replacements: Replacement[];
  edits: ProviderEdit[];
  docBlocks: Record<string, string>;
}

async function renderFile(file: PlannedFile, context: RenderContext): Promise<Buffer | string> {
  const { templatePath } = file;
  const source = await fs.readFile(path.join(file.sourceDir, ...templatePath.split('/')));
  if (isBinary(source)) {
    return source;
  }
  // Provider edits and doc blocks use the source identifiers, so they run before the rename.
  let text = source.toString('utf8');
  for (const edit of context.edits) {
    if (edit.templatePath === templatePath) {
      text = text.replace(edit.from, () => edit.to);
    }
  }
  if (templatePath.endsWith('.md')) {
    text = renderDocBlocks(text, context.docBlocks, templatePath);
  }
  text = applyReplacements(text, templatePath, context.replacements);
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

async function listOverlayFiles(overlayDir: string, label: string): Promise<string[]> {
  try {
    return await walkFiles(overlayDir);
  } catch {
    throw new CliError(`The ${label} files are missing from this installation (${overlayDir}). Reinstall the package.`);
  }
}

async function walkFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];
  const walk = async (relativeDir: string): Promise<void> => {
    const entries = await fs.readdir(path.join(rootDir, relativeDir), { withFileTypes: true });
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
  return files.sort();
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

  const files = await walkFiles(templateDir);
  if (files.length === 0) {
    throw new CliError(`Template directory is empty: ${templateDir}`);
  }
  return files;
}
