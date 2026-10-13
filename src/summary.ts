import path from 'node:path';
import type { Database } from './databases.js';
import { displayPath } from './display.js';
import { DEFAULT_FRONTEND, FRONTENDS, type Frontend } from './frontends.js';
import { log } from './log.js';
import { PACKAGE_MANAGERS, type PackageManager } from './package-managers.js';
import type { StepResult, StepStatus } from './steps.js';
import { box, identity, paint, type Paint } from './ui.js';

/** How each part of the completion screen is drawn: plain for tests and logs, colored for the terminal. */
interface Style {
  heading: Paint;
  title: Paint;
  command: Paint;
  comment: Paint;
  note: Paint;
  secret: Paint;
  border: Paint;
}

const PLAIN: Style = {
  heading: identity,
  title: identity,
  command: identity,
  comment: identity,
  note: identity,
  secret: identity,
  border: identity,
};

const COLORED: Style = {
  heading: paint.bold,
  title: paint.bold,
  command: paint.accent,
  comment: paint.dim,
  note: paint.dim,
  secret: paint.highlight,
  border: paint.warn,
};

const STATUS_ICONS: Record<StepStatus, string> = {
  done: paint.success('✔'),
  skipped: paint.dim('–'),
  partial: paint.warn('!'),
  failed: paint.error('✖'),
  interrupted: paint.error('✖'),
};

export function printSummary(steps: StepResult[], projectName: string): void {
  const complete = steps.every((step) => step.status === 'done' || step.status === 'skipped');
  log.info('');
  const banner = complete
    ? box([`${paint.success('✔')} ${paint.bold(projectName)} is ready`], { border: paint.success })
    : box([`${paint.warn('!')} ${paint.bold(projectName)} was created, but some steps need attention`], { border: paint.warn });
  for (const line of banner) log.info(line);
  log.info('');
  log.info(log.bold('Summary'));
  for (const step of steps) {
    log.info(`  ${STATUS_ICONS[step.status]} ${step.name}: ${step.detail}`);
    if (step.recovery) {
      log.info(`      To finish this step: ${paint.accent(step.recovery)}`);
    }
  }
}

export interface NextStepsContext {
  targetDir: string;
  pascalName: string;
  /** Defaults to React + Vite. */
  frontend?: Frontend;
  database: Database;
  packageManager: PackageManager;
  dependenciesInstalled: boolean;
  dotnetSdkFound: boolean;
  seedUserPassword: string;
}

export function nextStepLines(context: NextStepsContext, style: Style = PLAIN): string[] {
  const { targetDir, pascalName, database, packageManager, dependenciesInstalled, dotnetSdkFound } = context;
  const pm = PACKAGE_MANAGERS[packageManager];
  const frontend = FRONTENDS[context.frontend ?? DEFAULT_FRONTEND];
  const step = (number: number, title: string, detail: string) => `  ${style.title(`${number}. ${title}`)} ${detail}`;
  const command = (text: string, comment?: string) =>
    `       ${style.command(text)}${comment ? `   ${style.comment(`# ${comment}`)}` : ''}`;
  const note = (text: string) => `       ${style.note(text)}`;

  return [
    style.heading('Next steps'),
    '',
    ...databaseStepLines(database, targetDir, step, command, note),
    '',
    step(2, 'Start the backend:', 'ASP.NET Core API, Swagger at https://localhost:7001/swagger'),
    ...(dotnetSdkFound ? [] : [note('Install the .NET 9 SDK first: https://dotnet.microsoft.com/download')]),
    command(`cd ${displayPath(path.join(targetDir, 'server'))}`),
    command('dotnet dev-certs https --trust', 'first time only'),
    command(`dotnet run --project ${pascalName}.Api --launch-profile https`),
    '',
    step(3, 'Start the frontend:', `${frontend.tool} dev server at ${frontend.devServerUrl}`),
    command(`cd ${displayPath(path.join(targetDir, 'client'))}`),
    ...(dependenciesInstalled ? [] : [command(`${packageManager} ${pm.installArgs.join(' ')}`)]),
    command(pm.devCommand),
    '',
    `  ${style.note(`Prefer VS Code? Open the project folder and run "${frontend.vscode.compound}" from Run and Debug.`)}`,
    `  ${style.note('In Development the API applies its migrations and seeds sample data on startup.')}`,
    `  ${style.note('This tool does not run migrations or touch any database. Database setup details are in README.md.')}`,
    '',
    ...seedPasswordCallout(context, style),
  ];
}

function databaseStepLines(
  database: Database,
  targetDir: string,
  step: (number: number, title: string, detail: string) => string,
  command: (text: string, comment?: string) => string,
  note: (text: string) => string,
): string[] {
  if (database === 'postgresql') {
    return [
      step(1, 'Start the database:', 'PostgreSQL in Docker (settings in the generated .env, which is git-ignored)'),
      command(`cd ${displayPath(targetDir)}`),
      command('docker compose up -d --wait'),
      note('Port 5432 taken, or using another server? See "Database" in README.md.'),
    ];
  }
  return [
    step(1, 'Database:', 'SQL Server. The default connection string uses LocalDB, which is Windows only.'),
    note('Windows: nothing to start; LocalDB starts on the first connection.'),
    note('macOS/Linux: use the optional container in compose.yaml: set MSSQL_ACCEPT_EULA=Y in .env, then run'),
    command(`cd ${displayPath(targetDir)}`),
    command('docker compose up -d --wait'),
    note('and point the API at it with ConnectionStrings__DefaultConnection (see "Database" in README.md).'),
  ];
}

function seedPasswordCallout({ pascalName, seedUserPassword }: NextStepsContext, style: Style): string[] {
  return box(
    [
      `Password: ${style.secret(seedUserPassword)}`,
      'Shown only once. Development use only.',
      style.note(`Accounts: server/${pascalName}.Infrastructure/Extensions/DataSeeder.cs`),
    ],
    { border: style.border, title: style.title('Seeded development accounts') },
  );
}

export function printNextSteps(context: NextStepsContext): void {
  log.info('');
  for (const line of nextStepLines(context, COLORED)) {
    log.info(line);
  }
}
