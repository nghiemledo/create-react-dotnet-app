import path from 'node:path';
import { CancelledError, CliError } from './errors.js';
import { inspectDestination, nonEmptyDirectoryMessage, planProject, type DestinationInspection } from './generate.js';
import { log } from './log.js';
import { projectNameFromDirectory, toPascalCase, validateProjectName } from './naming.js';
import { PACKAGE_MANAGERS, type PackageManager } from './package-managers.js';
import { isInsideGitRepository, preferredPackageManager, type Tools } from './prerequisites.js';
import type { ToolProbe } from './process.js';
import type { Prompter } from './prompter.js';

export interface GivenOptions {
  directory?: string;
  packageManager?: PackageManager;
  /** `undefined` means "ask" (interactive) or "yes" (non-interactive). */
  install?: boolean;
  git?: boolean;
}

export interface Answers {
  targetDir: string;
  projectName: string;
  allowNonEmpty: boolean;
  packageManager: PackageManager;
  install: boolean;
  installSkipReason?: string;
  git: boolean;
  gitSkipReason?: string;
}

export interface QuestionContext {
  given: GivenOptions;
  interactive: boolean;
  prompter: Prompter;
  tools: Tools;
  templateDir: string;
  probe: ToolProbe;
}

type ExistingDirectoryAction = 'rename' | 'merge' | 'cancel';

/**
 * Resolves every decision before any file is written, so cancelling at a prompt never leaves files behind.
 * Order: project name -> package manager -> install -> git.
 */
export async function collectAnswers(context: QuestionContext): Promise<Answers> {
  const destination = await resolveDestination(context);
  const packageManager = await choosePackageManager(context);
  const install = await decideInstall(context, packageManager);
  const git = await decideGit(context, destination.targetDir);
  return { ...destination, packageManager, ...install, ...git };
}

async function resolveDestination(
  context: QuestionContext,
): Promise<Pick<Answers, 'targetDir' | 'projectName' | 'allowNonEmpty'>> {
  const { given, interactive, prompter, templateDir } = context;
  let directory = given.directory?.trim();

  for (;;) {
    if (!directory) {
      if (!interactive) {
        throw new CliError('Missing project name. Usage: npx create-react-dotnet-app <project-name>');
      }
      directory = (
        await prompter.text({
          message: 'Project name:',
          default: 'my-app',
          validate: (value) => validateProjectName(projectNameFromDirectory(value)) ?? true,
        })
      ).trim();
    }

    const targetDir = path.resolve(directory);
    const projectName = path.basename(targetDir);
    const retry = (message: string) => {
      if (!interactive) {
        throw new CliError(message);
      }
      log.warn(message);
      directory = undefined;
    };

    const nameError = validateProjectName(projectName);
    if (nameError) {
      retry(`Invalid project name "${projectName}": ${nameError}`);
      continue;
    }

    // pnpm's plan is a superset of npm's (it includes the lockfile), so it catches every possible conflict.
    const plan = await planProject(templateDir, toPascalCase(projectName), 'pnpm');
    let inspection: DestinationInspection;
    try {
      inspection = await inspectDestination(targetDir, plan);
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      retry(error.message);
      continue;
    }

    if (inspection.state !== 'non-empty') {
      return { targetDir, projectName, allowNonEmpty: false };
    }
    if (!interactive) {
      throw new CliError(nonEmptyDirectoryMessage(targetDir));
    }

    const action = await askAboutExistingDirectory(prompter, targetDir, inspection.conflicts);
    if (action === 'merge') {
      return { targetDir, projectName, allowNonEmpty: true };
    }
    if (action === 'cancel') {
      throw new CancelledError();
    }
    directory = undefined;
  }
}

async function askAboutExistingDirectory(
  prompter: Prompter,
  targetDir: string,
  conflicts: string[],
): Promise<ExistingDirectoryAction> {
  if (conflicts.length > 0) {
    log.warn(
      `${conflicts.length} project file(s) already exist in ${targetDir} (e.g. ${conflicts.slice(0, 3).join(', ')}); ` +
        'adding the project there would overwrite them, so that option is not offered.',
    );
  }
  return prompter.select<ExistingDirectoryAction>({
    message: `${targetDir} already exists and is not empty. What would you like to do?`,
    choices: [
      { name: 'Choose a different project name', value: 'rename' },
      ...(conflicts.length === 0
        ? [{ name: 'Add the project to this directory (existing files are kept, none are overwritten)', value: 'merge' as const }]
        : []),
      { name: 'Cancel', value: 'cancel' },
    ],
  });
}

async function choosePackageManager({ given, interactive, prompter, tools }: QuestionContext): Promise<PackageManager> {
  if (given.packageManager) {
    return given.packageManager;
  }
  const installed = tools.packageManagers;
  // npm ships with Node, so it is the fallback for next-step instructions even when detection fails.
  const preferred = preferredPackageManager(installed) ?? 'npm';
  if (!interactive || installed.length <= 1) {
    return preferred;
  }
  return prompter.select<PackageManager>({
    message: 'Frontend package manager:',
    choices: installed.map((pm) => ({ name: PACKAGE_MANAGERS[pm].label, value: pm })),
    default: preferred,
  });
}

async function decideInstall(
  { given, interactive, prompter, tools }: QuestionContext,
  packageManager: PackageManager,
): Promise<Pick<Answers, 'install' | 'installSkipReason'>> {
  const available = tools.packageManagers.includes(packageManager);
  if (given.install === true && !available) {
    throw new CliError(
      `Cannot install frontend dependencies: ${packageManager} was not found on PATH. ` +
        'Install it, choose another package manager with --pm, or pass --no-install.',
    );
  }
  if (given.install === false) {
    return { install: false, installSkipReason: 'skipped (--no-install)' };
  }
  if (!available) {
    return { install: false, installSkipReason: `skipped: ${packageManager} was not found on PATH` };
  }
  if (given.install === true || !interactive) {
    return { install: true };
  }
  const install = await prompter.confirm({
    message: `Install frontend dependencies with ${packageManager} now?`,
    default: true,
  });
  return install ? { install } : { install, installSkipReason: 'skipped at your request' };
}

async function decideGit(
  { given, interactive, prompter, tools, probe }: QuestionContext,
  targetDir: string,
): Promise<Pick<Answers, 'git' | 'gitSkipReason'>> {
  if (given.git === false) {
    return { git: false, gitSkipReason: 'skipped (--no-git)' };
  }
  if (!tools.git) {
    if (given.git === true) {
      throw new CliError('Cannot initialize a Git repository: git was not found on PATH. Install Git or pass --no-git.');
    }
    return { git: false, gitSkipReason: 'skipped: git was not found on PATH' };
  }
  if (isInsideGitRepository(probe, targetDir)) {
    return { git: false, gitSkipReason: 'skipped: the destination is already inside a Git repository' };
  }
  if (given.git === true || !interactive) {
    return { git: true };
  }
  const git = await prompter.confirm({ message: 'Initialize a new Git repository?', default: true });
  return git ? { git } : { git, gitSkipReason: 'skipped at your request' };
}
