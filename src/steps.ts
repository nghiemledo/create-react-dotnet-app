import path from 'node:path';
import { displayPath } from './display.js';
import { log } from './log.js';
import { PACKAGE_MANAGERS, type PackageManager } from './package-managers.js';
import { describeFailure, wasInterrupted, type CommandRunner } from './process.js';

export type StepStatus = 'done' | 'skipped' | 'failed' | 'interrupted' | 'partial';

export interface StepResult {
  name: string;
  status: StepStatus;
  detail: string;
  /** Command(s) the user can run to finish the step themselves. */
  recovery?: string;
}

export const INITIAL_COMMIT_MESSAGE = 'Initial commit from create-react-dotnet-app';

export function skippedStep(name: string, reason: string): StepResult {
  return { name, status: 'skipped', detail: reason };
}

export async function installFrontendDependencies(
  run: CommandRunner,
  targetDir: string,
  packageManager: PackageManager,
): Promise<StepResult> {
  const name = 'Frontend dependencies';
  const { installArgs } = PACKAGE_MANAGERS[packageManager];
  const clientDir = path.join(targetDir, 'client');
  const command = `${packageManager} ${installArgs.join(' ')}`;
  const recovery = `cd ${displayPath(clientDir)} && ${command}`;

  log.step(`Installing frontend dependencies with ${packageManager}...`);
  const result = await run(packageManager, installArgs, { cwd: clientDir });

  if (result.ok) {
    return { name, status: 'done', detail: `installed with ${packageManager}` };
  }
  if (wasInterrupted(result)) {
    return { name, status: 'interrupted', detail: 'installation was interrupted; the project files are complete', recovery };
  }
  return {
    name,
    status: 'failed',
    detail: `"${command}" failed (${describeFailure(result)}); the project files are complete`,
    recovery,
  };
}

export async function initializeGitRepository(run: CommandRunner, targetDir: string): Promise<StepResult> {
  const name = 'Git repository';
  const cd = `cd ${displayPath(targetDir)}`;
  const options = { cwd: targetDir, quiet: true };

  log.step('Initializing a Git repository...');
  const init = await run('git', ['init'], options);
  if (!init.ok) {
    return { name, status: 'failed', detail: `git init failed (${describeFailure(init)})`, recovery: `${cd} && git init` };
  }

  const commitRecovery = `${cd} && git add -A && git commit -m "Initial commit"`;
  const add = await run('git', ['add', '-A'], options);
  if (!add.ok) {
    return {
      name,
      status: 'partial',
      detail: `repository created, but staging files failed (${describeFailure(add)})`,
      recovery: commitRecovery,
    };
  }

  const commit = await run('git', ['commit', '-m', INITIAL_COMMIT_MESSAGE], options);
  if (!commit.ok) {
    return {
      name,
      status: 'partial',
      detail: `repository created, but the initial commit failed (${describeFailure(commit)}). Check that git user.name and user.email are configured`,
      recovery: commitRecovery,
    };
  }
  return { name, status: 'done', detail: 'initialized with an initial commit' };
}
