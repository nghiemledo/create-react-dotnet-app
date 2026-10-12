import path from 'node:path';
import type { Database } from './databases.js';
import { displayPath } from './display.js';
import { log } from './log.js';
import { PACKAGE_MANAGERS, type PackageManager } from './package-managers.js';
import type { StepResult, StepStatus } from './steps.js';

const STATUS_LABELS: Record<StepStatus, string> = {
  done: '✔',
  skipped: '–',
  partial: '!',
  failed: '✖',
  interrupted: '✖',
};

export function printSummary(steps: StepResult[]): void {
  log.info('');
  log.info(log.bold('Summary'));
  for (const step of steps) {
    log.info(`  ${STATUS_LABELS[step.status]} ${step.name}: ${step.detail}`);
    if (step.recovery) {
      log.info(`      To finish this step: ${step.recovery}`);
    }
  }
}

export interface NextStepsContext {
  targetDir: string;
  pascalName: string;
  database: Database;
  packageManager: PackageManager;
  dependenciesInstalled: boolean;
  dotnetSdkFound: boolean;
  seedUserPassword: string;
}

export function nextStepLines(context: NextStepsContext): string[] {
  const { targetDir, pascalName, database, packageManager, dependenciesInstalled, dotnetSdkFound, seedUserPassword } =
    context;
  const pm = PACKAGE_MANAGERS[packageManager];
  return [
    'Next steps',
    '',
    ...databaseStepLines(database, targetDir),
    '',
    '  Backend (ASP.NET Core API, Swagger at https://localhost:7001/swagger):',
    ...(dotnetSdkFound ? [] : ['    Install the .NET 9 SDK first: https://dotnet.microsoft.com/download']),
    `    cd ${displayPath(path.join(targetDir, 'server'))}`,
    '    dotnet dev-certs https --trust        # first time only',
    `    dotnet run --project ${pascalName}.Api --launch-profile https`,
    '',
    '  Frontend (Vite dev server at http://localhost:5173):',
    `    cd ${displayPath(path.join(targetDir, 'client'))}`,
    ...(dependenciesInstalled ? [] : [`    ${packageManager} ${pm.installArgs.join(' ')}`]),
    `    ${pm.devCommand}`,
    '',
    `  Seeded development accounts use the password: ${seedUserPassword}`,
    `  It is not shown again. The accounts are defined in server/${pascalName}.Infrastructure/Extensions/DataSeeder.cs.`,
    '',
    '  In Development the API applies its migrations and seeds sample data on startup.',
    '  This tool does not run migrations or touch any database. Database setup details are in README.md.',
  ];
}

function databaseStepLines(database: Database, targetDir: string): string[] {
  if (database === 'postgresql') {
    return [
      '  Database (PostgreSQL in Docker; settings in the generated .env, which is git-ignored):',
      `    cd ${displayPath(targetDir)}`,
      '    docker compose up -d --wait',
      '    Port 5432 taken, or using another server? See "Database" in README.md.',
    ];
  }
  return [
    '  Database (SQL Server): the default connection string uses LocalDB, which is Windows only.',
    '    On macOS/Linux, use the optional container in compose.yaml: set MSSQL_ACCEPT_EULA=Y in .env,',
    '    run docker compose up -d --wait, then point the API at it (see "Database" in README.md).',
  ];
}

export function printNextSteps(context: NextStepsContext): void {
  log.info('');
  for (const line of nextStepLines(context)) {
    log.info(line === 'Next steps' ? log.bold(line) : line);
  }
}
