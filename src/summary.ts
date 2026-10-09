import path from 'node:path';
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
  packageManager: PackageManager;
  dependenciesInstalled: boolean;
  dotnetSdkFound: boolean;
  seedUserPassword: string;
}

export function nextStepLines(context: NextStepsContext): string[] {
  const { targetDir, pascalName, packageManager, dependenciesInstalled, dotnetSdkFound, seedUserPassword } = context;
  const pm = PACKAGE_MANAGERS[packageManager];
  return [
    'Next steps',
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
    '  On first start the API creates and seeds its database. The default connection string uses SQL Server',
    '  LocalDB (Windows only); on macOS/Linux set ConnectionStrings__DefaultConnection to a SQL Server instance.',
    '  This tool does not run migrations or touch any database.',
  ];
}

export function printNextSteps(context: NextStepsContext): void {
  log.info('');
  for (const line of nextStepLines(context)) {
    log.info(line === 'Next steps' ? log.bold(line) : line);
  }
}
