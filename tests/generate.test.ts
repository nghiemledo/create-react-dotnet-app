import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CancelledError, CliError } from '../src/errors.js';
import { generateProject, toDestinationPath, type GenerateOptions } from '../src/generate.js';
import { defaultTemplateDir } from '../src/paths.js';
import { TEMPLATE_TOKENS } from '../src/tokens.js';
import { listFiles, makeTempDir, writeFiles, type AppSettings } from './helpers.js';

const secrets = { jwtSigningKey: 'generated-jwt-key', seedUserPassword: 'GeneratedPw123' };
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

async function makeFixtureTemplate(extra: Record<string, string | Buffer> = {}): Promise<string> {
  const templateDir = await makeTempDir();
  await writeFiles(templateDir, {
    'server/ReactDotnetBoilerplate.sln': 'Project "ReactDotnetBoilerplate.Api"',
    'server/ReactDotnetBoilerplate.Api/appsettings.json': `{"Jwt":{"Key":"${TEMPLATE_TOKENS.jwtSigningKey}"}}`,
    'server/ReactDotnetBoilerplate.Infrastructure/DataSeeder.cs': `CreateAsync(u, "${TEMPLATE_TOKENS.seedUserPassword}")`,
    'server/_gitignore': 'bin/\n',
    'client/package.json': '{ "name": "training-management-client" }',
    'client/pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
    'client/.env.example': 'VITE_APP_NAME=Hệ thống quản lý đào tạo\n',
    'client/src/assets/logo.png': PNG_HEADER,
    ...extra,
  });
  return templateDir;
}

async function options(overrides: Partial<GenerateOptions> = {}): Promise<GenerateOptions> {
  return {
    templateDir: overrides.templateDir ?? (await makeFixtureTemplate()),
    targetDir: path.join(await makeTempDir(), 'my-app'),
    projectName: 'my-app',
    displayName: 'My App',
    packageManager: 'pnpm',
    secrets,
    ...overrides,
  };
}

describe('toDestinationPath', () => {
  it('renames project folders and restores .gitignore', () => {
    expect(toDestinationPath('server/ReactDotnetBoilerplate.Api/ReactDotnetBoilerplate.Api.csproj', 'MyApp')).toBe(
      'server/MyApp.Api/MyApp.Api.csproj',
    );
    expect(toDestinationPath('client/_gitignore', 'MyApp')).toBe('client/.gitignore');
  });
});

describe('generateProject (fixture template)', () => {
  it('renames, injects secrets, copies binaries untouched and creates client/.env', async () => {
    const opts = await options();
    const result = await generateProject(opts);

    expect(result.pascalName).toBe('MyApp');
    expect(await listFiles(opts.targetDir)).toEqual([
      'client/.env',
      'client/.env.example',
      'client/package.json',
      'client/pnpm-lock.yaml',
      'client/src/assets/logo.png',
      'server/.gitignore',
      'server/MyApp.Api/appsettings.json',
      'server/MyApp.Infrastructure/DataSeeder.cs',
      'server/MyApp.sln',
    ]);
    const read = (p: string) => fs.readFile(path.join(opts.targetDir, p), 'utf8');
    expect(await read('server/MyApp.sln')).toBe('Project "MyApp.Api"');
    expect(await read('server/MyApp.Api/appsettings.json')).toContain(secrets.jwtSigningKey);
    expect(await read('server/MyApp.Infrastructure/DataSeeder.cs')).toContain(secrets.seedUserPassword);
    expect(await read('client/package.json')).toContain('"my-app-client"');
    expect(await read('client/.env')).toBe('VITE_APP_NAME=My App\n');
    expect(await fs.readFile(path.join(opts.targetDir, 'client/src/assets/logo.png'))).toEqual(PNG_HEADER);
  });

  it('never copies .git history from the template', async () => {
    const opts = await options({
      templateDir: await makeFixtureTemplate({ '.git/HEAD': 'ref: refs/heads/main\n', 'client/.git/config': '[core]' }),
    });
    await generateProject(opts);
    expect((await listFiles(opts.targetDir)).some((file) => file.split('/').includes('.git'))).toBe(false);
  });

  it('drops the pnpm lockfile when npm is selected', async () => {
    const opts = await options({ packageManager: 'npm' });
    await generateProject(opts);
    expect(existsSync(path.join(opts.targetDir, 'client/pnpm-lock.yaml'))).toBe(false);
  });

  it('refuses to write into a non-empty directory without consent and leaves it untouched', async () => {
    const opts = await options();
    await writeFiles(opts.targetDir, { 'keep.txt': 'existing work' });

    await expect(generateProject(opts)).rejects.toThrow(CliError);
    expect(await listFiles(opts.targetDir)).toEqual(['keep.txt']);
  });

  it('adds files to a non-empty directory with consent, without touching existing files', async () => {
    const opts = await options({ allowNonEmpty: true });
    await writeFiles(opts.targetDir, { 'keep.txt': 'existing work', 'client/notes.md': 'mine' });

    await generateProject(opts);

    expect(await fs.readFile(path.join(opts.targetDir, 'keep.txt'), 'utf8')).toBe('existing work');
    expect(await fs.readFile(path.join(opts.targetDir, 'client/notes.md'), 'utf8')).toBe('mine');
    expect(existsSync(path.join(opts.targetDir, 'server/MyApp.sln'))).toBe(true);
  });

  it('refuses to merge when any planned file already exists, even with consent', async () => {
    const opts = await options({ allowNonEmpty: true });
    await writeFiles(opts.targetDir, { 'client/package.json': '{"name":"mine"}' });

    await expect(generateProject(opts)).rejects.toThrow(/would be overwritten.*client\/package\.json/);
    expect(await listFiles(opts.targetDir)).toEqual(['client/package.json']);
    expect(await fs.readFile(path.join(opts.targetDir, 'client/package.json'), 'utf8')).toBe('{"name":"mine"}');
  });

  it('treats a file blocking a planned directory as a conflict', async () => {
    const opts = await options({ allowNonEmpty: true });
    await writeFiles(opts.targetDir, { server: 'a file named server' });
    await expect(generateProject(opts)).rejects.toThrow(/would be overwritten/);
  });

  it('rejects invalid names before touching the file system', async () => {
    const opts = await options({ projectName: 'Bad_Name' });
    await expect(generateProject(opts)).rejects.toThrow(/Invalid project name/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('reports a missing template directory clearly', async () => {
    const opts = await options();
    await expect(generateProject({ ...opts, templateDir: path.join(opts.targetDir, 'nope') })).rejects.toThrow(
      /Template directory not found/,
    );
  });

  it('removes a directory it created when generation fails', async () => {
    const opts = await options({ secrets: { jwtSigningKey: TEMPLATE_TOKENS.jwtSigningKey, seedUserPassword: 'x' } });
    await expect(generateProject(opts)).rejects.toThrow(/was not replaced/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('removes only its own files from a pre-existing directory when generation fails', async () => {
    const opts = await options({
      allowNonEmpty: true,
      secrets: { jwtSigningKey: TEMPLATE_TOKENS.jwtSigningKey, seedUserPassword: 'x' },
    });
    await writeFiles(opts.targetDir, { 'keep.txt': 'existing work' });

    await expect(generateProject(opts)).rejects.toThrow(/was not replaced/);
    expect(await listFiles(opts.targetDir)).toEqual(['keep.txt']);
  });

  it('rolls back when cancelled during generation', async () => {
    const controller = new AbortController();
    controller.abort();
    const opts = await options({ signal: controller.signal });

    await expect(generateProject(opts)).rejects.toThrow(CancelledError);
    expect(existsSync(opts.targetDir)).toBe(false);
  });
});

describe.skipIf(!existsSync(defaultTemplateDir))('generateProject (bundled template)', () => {
  async function generateBundled(): Promise<{ targetDir: string; files: string[] }> {
    const targetDir = path.join(await makeTempDir(), 'school-portal');
    await generateProject({
      templateDir: defaultTemplateDir,
      targetDir,
      projectName: 'school-portal',
      displayName: 'School Portal',
      packageManager: 'pnpm',
      secrets,
    });
    return { targetDir, files: await listFiles(targetDir) };
  }

  const readText = (targetDir: string, file: string) => fs.readFile(path.join(targetDir, file), 'utf8');

  it('produces a fully renamed project with no template tokens or source identifiers', async () => {
    const { targetDir, files } = await generateBundled();

    expect(files).toContain('server/SchoolPortal.sln');
    expect(files).toContain('server/SchoolPortal.Api/SchoolPortal.Api.csproj');
    expect(files).toContain('client/.gitignore');
    expect(files).toContain('server/.gitignore');
    expect(files).toContain('client/.env');
    expect(files.some((f) => f.includes('ReactDotnetBoilerplate') || f.endsWith('_gitignore'))).toBe(false);

    const forbidden = ['ReactDotnetBoilerplate', 'training-management-client', "'training-", ...Object.values(TEMPLATE_TOKENS)];
    for (const file of files) {
      const content = await fs.readFile(path.join(targetDir, file));
      if (content.subarray(0, 8000).includes(0)) continue;
      const text = content.toString('utf8');
      for (const value of forbidden) {
        expect(text.includes(value), `${file} still contains ${value}`).toBe(false);
      }
    }

    const appsettings = JSON.parse(await readText(targetDir, 'server/SchoolPortal.Api/appsettings.json')) as AppSettings;
    expect(appsettings.Jwt.Key).toBe(secrets.jwtSigningKey);
    expect(appsettings.JwtTokenSettings.Key).toBe(secrets.jwtSigningKey);
    expect(appsettings.ConnectionStrings.DefaultConnection).toContain('Database=SchoolPortalDb');
    expect(appsettings.EmailSettings.DisplayName).toBe('School Portal');

    const pkg = JSON.parse(await readText(targetDir, 'client/package.json')) as { name: string };
    expect(pkg.name).toBe('school-portal-client');
    expect(await readText(targetDir, 'client/index.html')).toContain('<title>School Portal</title>');
    expect(await readText(targetDir, 'server/SchoolPortal.Infrastructure/Extensions/DataSeeder.cs')).toContain(
      `"${secrets.seedUserPassword}"`,
    );
  });

  it('keeps every solution entry and ProjectReference pointing at an existing project', async () => {
    const { targetDir, files } = await generateBundled();

    const sln = await readText(targetDir, 'server/SchoolPortal.sln');
    const slnProjects = [...sln.matchAll(/^Project\("[^"]+"\) = "([^"]+)", "([^"]+)"/gm)];
    expect(slnProjects.map((m) => m[1])).toEqual([
      'SchoolPortal.Common',
      'SchoolPortal.Domain',
      'SchoolPortal.Infrastructure',
      'SchoolPortal.Application',
      'SchoolPortal.Api',
    ]);
    for (const [, , projectPath] of slnProjects) {
      expect(existsSync(path.join(targetDir, 'server', ...projectPath!.split('\\')))).toBe(true);
    }

    const csprojFiles = files.filter((f) => f.endsWith('.csproj'));
    expect(csprojFiles).toHaveLength(5);
    for (const csproj of csprojFiles) {
      const content = await readText(targetDir, csproj);
      for (const [, reference] of content.matchAll(/<ProjectReference Include="([^"]+)"/g)) {
        const resolved = path.join(targetDir, path.dirname(csproj), ...reference!.split('\\'));
        expect(existsSync(resolved), `${csproj} -> ${reference}`).toBe(true);
      }
    }
  });

  it('produces valid C# namespaces rooted at the new project name', async () => {
    const { targetDir, files } = await generateBundled();
    const namespaces = new Set<string>();
    for (const file of files.filter((f) => f.endsWith('.cs'))) {
      for (const [, ns] of (await readText(targetDir, file)).matchAll(/^\s*(?:namespace|using)\s+(SchoolPortal[\w.]*)/gm)) {
        namespaces.add(ns!);
      }
    }
    expect(namespaces.size).toBeGreaterThan(10);
    for (const ns of namespaces) {
      expect(ns).toMatch(/^SchoolPortal(\.[A-Z][A-Za-z0-9]*)*$/);
    }
  });
});
