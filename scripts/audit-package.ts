/**
 * Pre-release audit of a packed tarball (extracted to <dir>/package).
 *
 *   tsx scripts/audit-package.ts --extracted <dir>/package --source <path-to-react-dotnet-boilerplate> [--ref HEAD]
 *   tsx scripts/audit-package.ts --extracted <dir>/package --source <path-to-react-dotnet-boilerplate> --worktree
 *
 * --worktree compares against the source working tree (see sync-template --worktree). Such a template is not
 * reproducible from a commit, so the provenance check always fails it.
 * Prints file paths and pass/fail only; secret values are never printed.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { DATABASES, TEMPLATE_PATHS } from '../src/databases.js';
import { FRONTENDS } from '../src/frontends.js';
import { defaultCommonDir, defaultDatabasesDir, defaultFrontendsDir, packageRoot } from '../src/paths.js';
import { isBinary } from '../src/text.js';
import { readCommit, readWorktree } from './source-files.js';
import { discoverSecrets, isExcluded, packagedPathFor, SOURCE_PATHS } from './template-rules.js';

const FORBIDDEN: [string, RegExp][] = [
  ['.env file', /(^|\/)\.env(\.(?!example$)[^/]+)?$/],
  ['git metadata', /(^|\/)\.git(\/|$)/],
  ['node_modules', /(^|\/)node_modules\//],
  ['.NET build output', /(^|\/)(bin|obj)\//],
  ['IDE state', /(^|\/)(\.vs|\.idea|\.vscode)\/|\.csproj\.user$|\.suo$/],
  ['database file', /\.(mdf|ldf|ndf|db|sqlite3?)$/i],
  ['certificate/key', /\.(pfx|p12|pem|key|snk)$/i],
  ['log file', /\.log$/i],
  ['npm credentials', /(^|\/)\.npmrc$/],
  ['build output', /^templates\/(default|databases\/[^/]+|frontends\/[^/]+)\/client\/(dist|\.next|out)\//],
  ['Next.js or TypeScript generated file', /(^|\/)next-env\.d\.ts$|\.tsbuildinfo$/],
  ['dev-only source', /^(src|tests|scripts)\//],
  ['sync staging', /^templates\/(frontends\/)?\.sync-/],
  ['stored .env outside the database overlays', /^(?!templates\/databases\/[^/]+\/_env$).*(^|\/)_env$/],
  [
    'stored .vscode outside the common and frontend overlays',
    /^(?!templates\/(common|frontends\/[^/]+)\/_vscode\/).*(^|\/)_vscode\//,
  ],
  ['uploaded user file', /wwwroot\/uploads\/.+(?<!\.gitkeep)$/],
];

const CREDENTIAL_PATTERNS: RegExp[] = [
  /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/,
  /\bnpm_[A-Za-z0-9]{36}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

async function walk(root: string, dir = ''): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...(await walk(root, relative)));
    else files.push(relative);
  }
  return files.sort();
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      extracted: { type: 'string' },
      source: { type: 'string' },
      ref: { type: 'string' },
      worktree: { type: 'boolean', default: false },
    },
  });
  if (!values.extracted || !values.source || (values.worktree && values.ref)) {
    throw new Error('Usage: --extracted <dir> --source <repo> [--ref HEAD | --worktree]');
  }
  const root = path.resolve(values.extracted);
  const source = path.resolve(values.source);
  const snapshot = values.worktree ? readWorktree(source) : readCommit(source, values.ref ?? 'HEAD');

  const failures: string[] = [];
  const check = (ok: boolean, message: string) => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
    if (!ok) failures.push(message);
  };

  const files = await walk(root);
  console.log(`${files.length} files in package`);

  // Executable
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8')) as {
    bin?: Record<string, string>;
    type?: string;
    files?: string[];
  };
  const binPath = manifest.bin?.['create-react-dotnet-app'];
  check(binPath === 'dist/index.js', `bin "create-react-dotnet-app" -> ${binPath}`);
  check(manifest.type === 'module', 'package type is "module" (dist is ESM)');
  const entry = binPath ? await fs.readFile(path.join(root, binPath)).catch(() => undefined) : undefined;
  check(entry !== undefined, 'bin target exists in the package');
  check(entry?.toString('utf8').startsWith('#!/usr/bin/env node\n') ?? false, 'bin target starts with an LF node shebang');
  for (const file of files.filter((f) => f.startsWith('dist/'))) {
    for (const [, specifier] of (await fs.readFile(path.join(root, file), 'utf8')).matchAll(/from '(\.[^']+)'/g)) {
      const target = path.posix.join(path.posix.dirname(file), specifier!);
      check(files.includes(target), `${file} import ${specifier} resolves`);
    }
  }

  // Forbidden content
  for (const file of files) {
    for (const [kind, pattern] of FORBIDDEN) {
      if (pattern.test(file)) check(false, `forbidden ${kind}: ${file}`);
    }
  }
  check(true, 'forbidden-path scan completed');

  // Provenance: the template must come from the audited commit, not from uncommitted files.
  const sourceInfo = JSON.parse(
    await fs.readFile(path.join(packageRoot, 'templates', 'default.source.json'), 'utf8'),
  ) as { commit?: string; worktree?: boolean };
  check(
    sourceInfo.commit === snapshot.commit && sourceInfo.worktree !== true,
    `templates were synced from commit ${snapshot.commit}${sourceInfo.worktree ? ' (FAILS: synced from a working tree)' : ''}`,
  );

  // Template completeness against the source repository
  const syncedPrefixes = [
    'templates/default/',
    ...Object.values(FRONTENDS).flatMap((info) => (info.overlay ? [`templates/frontends/${info.overlay}/client/`] : [])),
  ];
  const expected = [...snapshot.files.keys()].filter((p) => !isExcluded(p)).map(packagedPathFor);
  const missing = expected.filter((p) => !files.includes(p));
  const unexpected = files.filter((f) => syncedPrefixes.some((prefix) => f.startsWith(prefix)) && !expected.includes(f));
  check(missing.length === 0, `all ${expected.length} distributable source files are present${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
  check(unexpected.length === 0, `no template files beyond the source repository${unexpected.length ? `: ${unexpected.join(', ')}` : ''}`);
  const hiddenFiles = [
    ...['client/.env.example', 'client/_gitignore', 'server/_gitignore'].map((f) => `templates/default/${f}`),
    ...Object.values(FRONTENDS).flatMap((info) =>
      info.overlay ? ['client/.env.example', 'client/_gitignore'].map((f) => `templates/frontends/${info.overlay}/${f}`) : [],
    ),
  ];
  for (const hidden of hiddenFiles) {
    check(files.includes(hidden), `hidden template file present: ${hidden}`);
  }
  check(
    files.some((f) => f.endsWith('wwwroot/uploads/users/.gitkeep')),
    'hidden template file present: wwwroot/uploads/users/.gitkeep',
  );

  // Overlays: exactly the files in this repository's templates/databases, templates/common and templates/frontends
  const overlayExpected = [
    ...(await walk(defaultDatabasesDir)).map((f) => `templates/databases/${f}`),
    ...(await walk(defaultCommonDir)).map((f) => `templates/common/${f}`),
    ...(await walk(defaultFrontendsDir)).map((f) => `templates/frontends/${f}`),
  ];
  const overlayPackaged = files.filter((f) => /^templates\/(databases|common|frontends)\//.test(f));
  const overlayMissing = overlayExpected.filter((f) => !files.includes(f));
  const overlayExtra = overlayPackaged.filter((f) => !overlayExpected.includes(f));
  check(overlayMissing.length === 0, `all ${overlayExpected.length} overlay files are present${overlayMissing.length ? `; missing: ${overlayMissing.join(', ')}` : ''}`);
  check(overlayExtra.length === 0, `no unexpected overlay files${overlayExtra.length ? `: ${overlayExtra.join(', ')}` : ''}`);
  for (const info of Object.values(FRONTENDS)) {
    if (!info.overlay) continue;
    for (const file of ['_vscode/launch.json', '_vscode/tasks.json', 'client/package.json']) {
      check(files.includes(`templates/frontends/${info.overlay}/${file}`), `${info.name} overlay ships ${file}`);
    }
  }
  for (const [database, info] of Object.entries(DATABASES)) {
    if (info.replacesPrefix !== TEMPLATE_PATHS.migrations) continue;
    const migrations = `templates/databases/${info.overlay}/${TEMPLATE_PATHS.migrations}`;
    check(
      files.some((f) => f.startsWith(migrations) && f.endsWith('ModelSnapshot.cs')),
      `${database} overlay ships its own migrations`,
    );
  }
  const passwordSettings: Record<string, RegExp> = {
    sqlserver: /^\s+MSSQL_SA_PASSWORD: \$\{MSSQL_SA_PASSWORD:\?[^}]+\}\r?$/m,
    postgresql: /^\s+POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD:\?[^}]+\}\r?$/m,
  };
  for (const [database, info] of Object.entries(DATABASES)) {
    const read = (file: string) =>
      fs.readFile(path.join(root, `templates/databases/${info.overlay}/${file}`), 'utf8').catch(() => '');
    const compose = await read('compose.yaml');
    check(passwordSettings[database]?.test(compose) ?? false, `${database} compose.yaml takes its password from .env, not a literal`);
    check(/127\.0\.0\.1:\$\{\w+_PORT:-\d+\}:\d+/.test(compose), `${database} compose.yaml publishes its port on 127.0.0.1 only`);
    check(/^\w+_PASSWORD=__DB_PASSWORD__\r?$/m.test(await read('_env')), `${database} generated .env gets a per-project password token`);
    check(!(await read('.env.example')).includes('__DB_PASSWORD__'), `${database} .env.example holds placeholders only`);
  }

  // Secrets: original source values must not appear anywhere in the package
  const show = (p: string) => {
    const content = snapshot.files.get(p);
    if (!content) throw new Error(`${p} is missing from the source.`);
    return content.toString('utf8');
  };
  const secrets = discoverSecrets(show(SOURCE_PATHS.appsettings), show(SOURCE_PATHS.dataSeeder));
  const secretValues = [...secrets.jwtSigningKeys, ...secrets.seedUserPasswords];
  let leaked = 0;
  let credentialHits = 0;
  for (const file of files) {
    const content = await fs.readFile(path.join(root, file));
    if (isBinary(content)) continue;
    const text = content.toString('utf8');
    if (secretValues.some((value) => text.includes(value))) {
      leaked++;
      console.log(`      source secret value found in ${file}`);
    }
    if (CREDENTIAL_PATTERNS.some((pattern) => pattern.test(text))) {
      credentialHits++;
      console.log(`      credential pattern found in ${file}`);
    }
  }
  check(leaked === 0, `none of the ${secretValues.length} source secret values appear in the package`);
  check(credentialHits === 0, 'no tokens or private keys in the package');

  console.log(failures.length === 0 ? '\nAUDIT PASSED' : `\nAUDIT FAILED (${failures.length})`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
