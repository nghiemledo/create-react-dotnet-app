import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Command, Option } from 'commander';
import { DATABASES, SUPPORTED_DATABASES, type Database } from './databases.js';
import { CliError } from './errors.js';
import { FRONTENDS, SUPPORTED_FRONTENDS, type Frontend } from './frontends.js';
import { generateProject, type GenerateResult } from './generate.js';
import { log } from './log.js';
import { SUPPORTED_PACKAGE_MANAGERS, type PackageManager } from './package-managers.js';
import { defaultDatabasesDir, defaultFrontendsDir, defaultTemplateDir, packageRoot } from './paths.js';
import { detectTools } from './prerequisites.js';
import { probeCommand, runCommand, type CommandRunner, type ToolProbe } from './process.js';
import { inquirerPrompter, type Prompter } from './prompter.js';
import { collectAnswers, type Answers } from './questions.js';
import { initializeGitRepository, installFrontendDependencies, skippedStep, type StepResult } from './steps.js';
import { printNextSteps, printSummary } from './summary.js';
import { bannerLines } from './ui.js';

interface CliOptions {
  displayName?: string;
  frontend?: Frontend;
  db?: Database;
  pm?: PackageManager;
  install?: boolean;
  git?: boolean;
  yes?: boolean;
}

/** Everything that touches the terminal or spawns processes; tests replace these. */
export interface Runtime {
  prompter: Prompter;
  run: CommandRunner;
  probe: ToolProbe;
  templateDir: string;
  databasesDir: string;
  frontendsDir: string;
  nodeVersion: string;
  /** Defaults to: stdin and stdout are TTYs and --yes was not passed. */
  interactive?: boolean;
}

export interface RunSummary {
  targetDir: string;
  projectName: string;
  pascalName: string;
  frontend: Frontend;
  database: Database;
  steps: StepResult[];
}

function readVersion(): string {
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as { version: string };
  return manifest.version;
}

export function createProgram(): Command {
  return new Command()
    .name('create-react-dotnet-app')
    .description('Create a React (Vite or Next.js) + ASP.NET Core (.NET 9) project.')
    .version(readVersion())
    .argument('[project-name]', 'name of the directory to create, e.g. my-app (a path is also accepted)')
    .addOption(
      new Option('--frontend <framework>', 'frontend framework (default when not prompting: vite)').choices(
        SUPPORTED_FRONTENDS,
      ),
    )
    .addOption(
      new Option('--db <database>', 'database provider for the API (default when not prompting: sqlserver)').choices(
        SUPPORTED_DATABASES,
      ),
    )
    .addOption(new Option('--pm <manager>', 'frontend package manager').choices(SUPPORTED_PACKAGE_MANAGERS))
    .option('--install', 'install frontend dependencies (default when not prompting)')
    .option('--no-install', 'do not install frontend dependencies')
    .option('--git', 'initialize a Git repository (default when not prompting)')
    .option('--no-git', 'do not initialize a Git repository')
    .option('--display-name <name>', 'human-readable application name (default: the project name)')
    .option('-y, --yes', 'never prompt; use defaults for anything not passed as an option')
    .showHelpAfterError()
    .exitOverride();
}

export async function main(argv: string[] = process.argv, overrides: Partial<Runtime> = {}): Promise<RunSummary> {
  const runtime: Runtime = {
    prompter: inquirerPrompter,
    run: runCommand,
    probe: probeCommand,
    templateDir: defaultTemplateDir,
    databasesDir: defaultDatabasesDir,
    frontendsDir: defaultFrontendsDir,
    nodeVersion: process.version,
    ...overrides,
  };

  const program = createProgram();
  program.parse(argv);
  const options = program.opts<CliOptions>();
  const interactive =
    runtime.interactive ?? (!options.yes && Boolean(process.stdin.isTTY && process.stdout.isTTY));
  if (interactive) {
    log.info('');
    for (const line of bannerLines(readVersion())) log.info(line);
    log.info('');
  }

  const tools = detectTools(runtime.probe, runtime.nodeVersion);
  const answers = await collectAnswers({
    given: {
      directory: program.args[0],
      frontend: options.frontend,
      database: options.db,
      packageManager: options.pm,
      install: options.install,
      git: options.git,
    },
    interactive,
    prompter: runtime.prompter,
    tools,
    templateDir: runtime.templateDir,
    databasesDir: runtime.databasesDir,
    frontendsDir: runtime.frontendsDir,
    probe: runtime.probe,
  });

  if (!tools.nodeSupported) {
    log.warn(
      `Node ${tools.nodeVersion} is below what the generated client needs (^20.19, ^22.13 or >=24 for ` +
        `${FRONTENDS[answers.frontend].nodeRequirementSource}); its build and lint may fail until you upgrade.`,
    );
  }
  if (!tools.dotnetSdk) {
    log.warn('.NET SDK 9 or later was not found. The project will be created, but the backend needs it to run.');
  }

  const result = await generate(answers, options.displayName?.trim() || answers.projectName, runtime);
  log.success(`Created ${result.fileCount} files in ${result.targetDir}`);

  const steps: StepResult[] = [
    { name: 'Project files', status: 'done', detail: `${result.fileCount} files written to ${result.targetDir}` },
  ];

  const install = answers.install
    ? await installFrontendDependencies(runtime.run, result.targetDir, answers.packageManager)
    : skippedStep('Frontend dependencies', answers.installSkipReason ?? 'skipped');
  steps.push(install);

  if (install.status === 'interrupted') {
    steps.push(skippedStep('Git repository', 'skipped because the installation was interrupted'));
  } else {
    steps.push(
      answers.git
        ? await initializeGitRepository(runtime.run, result.targetDir)
        : skippedStep('Git repository', answers.gitSkipReason ?? 'skipped'),
    );
  }

  printSummary(steps, answers.projectName);
  printNextSteps({
    targetDir: result.targetDir,
    pascalName: result.pascalName,
    frontend: answers.frontend,
    database: answers.database,
    packageManager: answers.packageManager,
    dependenciesInstalled: install.status === 'done',
    dotnetSdkFound: tools.dotnetSdk,
    seedUserPassword: result.secrets.seedUserPassword,
  });

  return {
    targetDir: result.targetDir,
    projectName: answers.projectName,
    pascalName: result.pascalName,
    frontend: answers.frontend,
    database: answers.database,
    steps,
  };
}

async function generate(answers: Answers, displayName: string, runtime: Runtime): Promise<GenerateResult> {
  const controller = new AbortController();
  const onInterrupt = () => controller.abort();
  process.once('SIGINT', onInterrupt);

  log.step(
    `Creating ${log.bold(answers.projectName)} (${FRONTENDS[answers.frontend].name}, ` +
      `${DATABASES[answers.database].name}) in ${answers.targetDir}`,
  );
  try {
    return await generateProject({
      templateDir: runtime.templateDir,
      databasesDir: runtime.databasesDir,
      frontendsDir: runtime.frontendsDir,
      targetDir: answers.targetDir,
      projectName: answers.projectName,
      displayName,
      frontend: answers.frontend,
      database: answers.database,
      packageManager: answers.packageManager,
      allowNonEmpty: answers.allowNonEmpty,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliError(`Could not create the project: ${reason}. Files written by this run were removed.`, 1, {
      cause: error,
    });
  } finally {
    process.off('SIGINT', onInterrupt);
  }
}