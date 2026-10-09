/**
 * Pre-release audit of a packed tarball (extracted to <dir>/package).
 *
 *   tsx scripts/audit-package.ts --extracted <dir>/package --source <path-to-react-dotnet-boilerplate> [--ref HEAD]
 *
 * Prints file paths and pass/fail only; secret values are never printed.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { isBinary } from '../src/text.js';
import { discoverSecrets, isExcluded, SOURCE_PATHS, templatePathFor } from './template-rules.js';

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
  ['build output', /^templates\/default\/client\/dist\//],
  ['dev-only source', /^(src|tests|scripts)\//],
  ['sync staging', /^templates\/\.sync-/],
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
    options: { extracted: { type: 'string' }, source: { type: 'string' }, ref: { type: 'string', default: 'HEAD' } },
  });
  if (!values.extracted || !values.source) throw new Error('Usage: --extracted <dir> --source <repo> [--ref HEAD]');
  const root = path.resolve(values.extracted);
  const git = (...args: string[]) => execFileSync('git', ['-C', path.resolve(values.source!), ...args]);

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

  // Template completeness against the source repository
  const commit = git('rev-parse', '--verify', `${values.ref}^{commit}`).toString().trim();
  const tracked = git('ls-tree', '-r', '-z', '--name-only', commit).toString().split('\0').filter(Boolean);
  const expected = tracked.filter((p) => !isExcluded(p)).map((p) => `templates/default/${templatePathFor(p)}`);
  const missing = expected.filter((p) => !files.includes(p));
  const unexpected = files.filter((f) => f.startsWith('templates/default/') && !expected.includes(f));
  check(missing.length === 0, `all ${expected.length} distributable source files are present${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
  check(unexpected.length === 0, `no template files beyond the source repository${unexpected.length ? `: ${unexpected.join(', ')}` : ''}`);
  for (const hidden of ['client/.env.example', 'client/_gitignore', 'server/_gitignore']) {
    check(files.includes(`templates/default/${hidden}`), `hidden template file present: ${hidden}`);
  }
  check(
    files.some((f) => f.endsWith('wwwroot/uploads/users/.gitkeep')),
    'hidden template file present: wwwroot/uploads/users/.gitkeep',
  );

  // Secrets: original source values must not appear anywhere in the package
  const show = (p: string) => git('show', `${commit}:${p}`).toString('utf8');
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
