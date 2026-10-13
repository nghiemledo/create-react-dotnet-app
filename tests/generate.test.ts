import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATABASES, SUPPORTED_DATABASES, TEMPLATE_PATHS, type Database } from '../src/databases.js';
import { CancelledError, CliError } from '../src/errors.js';
import { FRONTENDS } from '../src/frontends.js';
import { generateProject, toDestinationPath, type GenerateOptions } from '../src/generate.js';
import { defaultCommonDir, defaultDatabasesDir, defaultFrontendsDir, defaultTemplateDir } from '../src/paths.js';
import { escapeRegExp } from '../src/text.js';
import { TEMPLATE_TOKENS } from '../src/tokens.js';
import { listFiles, makeTempDir, writeFiles, type AppSettings } from './helpers.js';

const secrets = { jwtSigningKey: 'generated-jwt-key', seedUserPassword: 'GeneratedPw123', databasePassword: 'GeneratedDbPw456' };
const unreplacedSecrets = { jwtSigningKey: TEMPLATE_TOKENS.jwtSigningKey, seedUserPassword: 'x', databasePassword: 'y' };
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

/** Empty provider and shared overlays, so fixture tests see only the fixture template. */
async function makeEmptyOverlays(): Promise<{ databasesDir: string; commonDir: string }> {
  const databasesDir = await makeTempDir();
  for (const database of SUPPORTED_DATABASES) {
    await fs.mkdir(path.join(databasesDir, DATABASES[database].overlay));
  }
  return { databasesDir, commonDir: await makeTempDir() };
}

async function options(overrides: Partial<GenerateOptions> = {}): Promise<GenerateOptions> {
  return {
    templateDir: overrides.templateDir ?? (await makeFixtureTemplate()),
    ...(await makeEmptyOverlays()),
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
    expect(toDestinationPath('_env', 'MyApp')).toBe('.env');
    expect(toDestinationPath('_vscode/launch.json', 'MyApp')).toBe('.vscode/launch.json');
    expect(toDestinationPath('client/_env.example', 'MyApp')).toBe('client/_env.example');
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
    const opts = await options({ secrets: unreplacedSecrets });
    await expect(generateProject(opts)).rejects.toThrow(/was not replaced/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('removes only its own files from a pre-existing directory when generation fails', async () => {
    const opts = await options({
      allowNonEmpty: true,
      secrets: unreplacedSecrets,
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

describe('generateProject database providers (fixture template)', () => {
  const postgresEdits = DATABASES.postgresql.edits;
  const anchor = (templatePath: string) => postgresEdits.find((edit) => edit.templatePath === templatePath)!.from;
  const MIGRATIONS = TEMPLATE_PATHS.migrations;

  async function makeProviderTemplate(overrides: Record<string, string> = {}): Promise<string> {
    return makeFixtureTemplate({
      [TEMPLATE_PATHS.infrastructureProject]: `<ItemGroup>\n${anchor(TEMPLATE_PATHS.infrastructureProject)}\n</ItemGroup>\n`,
      [TEMPLATE_PATHS.databaseRegistration]: `AddDbContext(options => ${anchor(TEMPLATE_PATHS.databaseRegistration)});\n`,
      [TEMPLATE_PATHS.dapperConnectionFactory]: postgresEdits
        .filter((edit) => edit.templatePath === TEMPLATE_PATHS.dapperConnectionFactory)
        .map((edit) => edit.from)
        .join('\n// ...\n'),
      [TEMPLATE_PATHS.appsettings]:
        `{"Jwt":{"Key":"${TEMPLATE_TOKENS.jwtSigningKey}"},"ConnectionStrings":{${anchor(TEMPLATE_PATHS.appsettings)}}}`,
      [`${MIGRATIONS}20260101000000_InitialCreate.cs`]: 'namespace ReactDotnetBoilerplate.Infrastructure.Migrations; // SqlServer',
      'README.md': '# App\n\nUses <!-- crda:database-name -->SQL Server<!-- /crda:database-name -->.\n',
      ...overrides,
    });
  }

  async function makeOverlays(files: Record<string, string> = {}): Promise<string> {
    const databasesDir = await makeTempDir();
    await writeFiles(path.join(databasesDir, 'sqlserver'), { 'compose.yaml': 'image: mssql\n' });
    await writeFiles(path.join(databasesDir, 'postgresql'), {
      'compose.yaml': `POSTGRES_PASSWORD: ${TEMPLATE_TOKENS.databasePassword}\nPOSTGRES_DB: ReactDotnetBoilerplateDb\n`,
      [`${MIGRATIONS}20260102000000_InitialCreate.cs`]: 'namespace ReactDotnetBoilerplate.Infrastructure.Migrations; // Npgsql',
      ...files,
    });
    return databasesDir;
  }

  it('leaves the template untouched for SQL Server and renders its doc blocks', async () => {
    const opts = await options({ templateDir: await makeProviderTemplate(), databasesDir: await makeOverlays() });
    await generateProject(opts);

    const files = await listFiles(opts.targetDir);
    expect(files).toContain('server/MyApp.Infrastructure/Migrations/20260101000000_InitialCreate.cs');
    expect(files.filter((f) => f.includes('/Migrations/'))).toHaveLength(1);
    const read = (p: string) => fs.readFile(path.join(opts.targetDir, p), 'utf8');
    expect(await read('compose.yaml')).toBe('image: mssql\n');
    expect(await read('server/MyApp.Infrastructure/MyApp.Infrastructure.csproj')).toContain('EntityFrameworkCore.SqlServer');
    expect(await read('README.md')).toBe('# App\n\nUses SQL Server.\n');
  });

  it('applies the PostgreSQL edits, swaps the migrations and injects one generated password', async () => {
    const opts = await options({
      templateDir: await makeProviderTemplate(),
      databasesDir: await makeOverlays(),
      database: 'postgresql',
    });
    await generateProject(opts);

    const files = await listFiles(opts.targetDir);
    expect(files.filter((f) => f.includes('/Migrations/'))).toEqual([
      'server/MyApp.Infrastructure/Migrations/20260102000000_InitialCreate.cs',
    ]);
    const read = (p: string) => fs.readFile(path.join(opts.targetDir, p), 'utf8');
    expect(await read('server/MyApp.Infrastructure/Migrations/20260102000000_InitialCreate.cs')).toBe(
      'namespace MyApp.Infrastructure.Migrations; // Npgsql',
    );
    const csproj = await read('server/MyApp.Infrastructure/MyApp.Infrastructure.csproj');
    expect(csproj).toContain('<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.4" />');
    expect(csproj).not.toContain('SqlServer');
    expect(await read('server/MyApp.Infrastructure/Extensions/DatabaseServiceCollectionExtensions.cs')).toContain(
      'options.UseNpgsql(connectionString)',
    );
    expect(await read('server/MyApp.Infrastructure/DapperRepositories/Base/DbConnectionFactory.cs')).toBe(
      'using Npgsql;\n// ...\nreturn new NpgsqlConnection(connectionString);',
    );
    const appsettings = JSON.parse(await read('server/MyApp.Api/appsettings.json')) as AppSettings;
    expect(appsettings.ConnectionStrings.DefaultConnection).toBe(
      `Host=localhost;Port=5432;Database=MyAppDb;Username=postgres;Password=${secrets.databasePassword}`,
    );
    expect(await read('compose.yaml')).toBe(`POSTGRES_PASSWORD: ${secrets.databasePassword}\nPOSTGRES_DB: MyAppDb\n`);
    expect(await read('README.md')).toBe('# App\n\nUses PostgreSQL.\n');
  });

  it.each([
    ['csproj', TEMPLATE_PATHS.infrastructureProject, '<PackageReference Include="Something.Else" />'],
    ['registration', TEMPLATE_PATHS.databaseRegistration, 'options.UseSqlServer(connectionString); options.UseSqlServer(connectionString)'],
    ['Dapper connection', TEMPLATE_PATHS.dapperConnectionFactory, 'using Microsoft.Data.SqlClient;\nreturn new SqlConnection(cs);'],
  ])('stops before writing anything when the %s anchor drifted', async (_label, templatePath, content) => {
    const opts = await options({
      templateDir: await makeProviderTemplate({ [templatePath]: content }),
      databasesDir: await makeOverlays(),
      database: 'postgresql',
    });
    await expect(generateProject(opts)).rejects.toThrow(/does not match what this version of the CLI expects/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('explains a missing PostgreSQL overlay instead of generating a half-converted project', async () => {
    const opts = await options({
      templateDir: await makeProviderTemplate(),
      databasesDir: await makeTempDir(),
      database: 'postgresql',
    });
    await expect(generateProject(opts)).rejects.toThrow(/PostgreSQL files are missing from this installation/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('adds the shared files for every database, renaming stored dotfiles, with the provider overlay winning', async () => {
    const commonDir = await makeTempDir();
    await writeFiles(commonDir, {
      _gitignore: '.env\n',
      '_vscode/launch.json': '{"program":"server/ReactDotnetBoilerplate.Api"}',
      'compose.yaml': 'shared\n',
    });
    for (const database of SUPPORTED_DATABASES) {
      const opts = await options({
        templateDir: await makeProviderTemplate(),
        databasesDir: await makeOverlays({ _env: `POSTGRES_PASSWORD=${TEMPLATE_TOKENS.databasePassword}\n` }),
        commonDir,
        database,
      });
      await generateProject(opts);

      const files = await listFiles(opts.targetDir);
      expect(files).toEqual(expect.arrayContaining(['.gitignore', '.vscode/launch.json']));
      expect(files.some((f) => f.split('/').some((segment) => segment === '_vscode' || segment === '_gitignore'))).toBe(false);
      const read = (p: string) => fs.readFile(path.join(opts.targetDir, p), 'utf8');
      expect(await read('.vscode/launch.json')).toBe('{"program":"server/MyApp.Api"}');
      expect(await read('compose.yaml')).not.toBe('shared\n');
      if (database === 'postgresql') {
        expect(await read('.env')).toBe(`POSTGRES_PASSWORD=${secrets.databasePassword}\n`);
      }
    }
  });

  it('explains missing shared files', async () => {
    const opts = await options({ templateDir: await makeProviderTemplate(), commonDir: path.join(await makeTempDir(), 'nope') });
    await expect(generateProject(opts)).rejects.toThrow(/shared project files are missing from this installation/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('rejects an unknown documentation block', async () => {
    const opts = await options({
      templateDir: await makeProviderTemplate({ 'README.md': '<!-- crda:nope -->x<!-- /crda:nope -->' }),
      databasesDir: await makeOverlays(),
    });
    await expect(generateProject(opts)).rejects.toThrow(/Unknown documentation block "nope" in README\.md/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });
});

describe('generateProject frontend overlays (fixture template)', () => {
  async function makeFrontendsDir(files: Record<string, string> = {}): Promise<string> {
    const frontendsDir = await makeTempDir();
    await writeFiles(path.join(frontendsDir, 'nextjs'), {
      'client/package.json': '{ "name": "training-management-client", "scripts": { "dev": "next dev" } }',
      'client/pnpm-lock.yaml': "lockfileVersion: '9.0'\n",
      'client/.env.example': 'NEXT_PUBLIC_APP_NAME=Hệ thống quản lý đào tạo\n',
      'client/_gitignore': '.next/\n.env\n',
      'client/next.config.ts': 'export default {};\n',
      'client/src/store/authStore.ts': "persist({ name: 'training-auth' })",
      '_vscode/launch.json': '{"url":"http://localhost:3000","program":"server/ReactDotnetBoilerplate.Api"}',
      ...files,
    });
    return frontendsDir;
  }

  async function nextOptions(overrides: Partial<GenerateOptions> = {}): Promise<GenerateOptions> {
    const commonDir = await makeTempDir();
    await writeFiles(commonDir, { _gitignore: '.env\n', '_vscode/launch.json': '{"url":"http://localhost:5173"}' });
    return options({ commonDir, frontendsDir: await makeFrontendsDir(), frontend: 'nextjs', ...overrides });
  }

  it('replaces the whole template client with the overlay and keeps every other template file', async () => {
    const opts = await nextOptions();
    await generateProject(opts);

    expect(await listFiles(opts.targetDir)).toEqual([
      '.gitignore',
      '.vscode/launch.json',
      'client/.env',
      'client/.env.example',
      'client/.gitignore',
      'client/next.config.ts',
      'client/package.json',
      'client/pnpm-lock.yaml',
      'client/src/store/authStore.ts',
      'server/.gitignore',
      'server/MyApp.Api/appsettings.json',
      'server/MyApp.Infrastructure/DataSeeder.cs',
      'server/MyApp.sln',
    ]);
    const read = (p: string) => fs.readFile(path.join(opts.targetDir, p), 'utf8');
    expect(await read('client/.env')).toBe('NEXT_PUBLIC_APP_NAME=My App\n');
    expect(await read('client/package.json')).toContain('"my-app-client"');
    expect(await read('client/src/store/authStore.ts')).toBe("persist({ name: 'my-app-auth' })");
    expect(await read('.vscode/launch.json')).toBe('{"url":"http://localhost:3000","program":"server/MyApp.Api"}');
    expect(await read('server/MyApp.Api/appsettings.json')).toContain(secrets.jwtSigningKey);
  });

  it('drops the overlay lockfile when npm is selected', async () => {
    const opts = await nextOptions({ packageManager: 'npm' });
    await generateProject(opts);
    const files = await listFiles(opts.targetDir);
    expect(files).not.toContain('client/pnpm-lock.yaml');
    expect(files).toContain('client/next.config.ts');
  });

  it('does not need the frontend overlays for the default React + Vite client', async () => {
    const opts = await options({ frontendsDir: path.join(await makeTempDir(), 'missing') });
    await generateProject(opts);
    expect(await listFiles(opts.targetDir)).toContain('client/src/assets/logo.png');
  });

  it('explains a missing Next.js overlay instead of generating a project without a client', async () => {
    const opts = await nextOptions({ frontendsDir: await makeTempDir() });
    await expect(generateProject(opts)).rejects.toThrow(/Next\.js files are missing from this installation/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });

  it('renders frontend documentation blocks for the selected frontend', async () => {
    const readme = [
      '# App',
      'Frontend: <!-- crda:frontend-summary -->React + Vite<!-- /crda:frontend-summary --> + Query.',
      '<!-- crda:frontend-stack -->',
      '> React',
      '> Vite',
      '<!-- /crda:frontend-stack -->',
      'End.',
      '',
    ].join('\n');
    const nextReadme = '# Next\n<!-- crda:source-repo-only -->\nOnly in the source repository.\n<!-- /crda:source-repo-only -->\nEnd.\n';
    const generate = async (frontend: 'vite' | 'nextjs') => {
      const opts = await nextOptions({
        frontend,
        templateDir: await makeFixtureTemplate({ 'README.md': readme }),
        frontendsDir: await makeFrontendsDir({ 'client/README.md': nextReadme }),
      });
      await generateProject(opts);
      return opts.targetDir;
    };

    const vite = await generate('vite');
    expect(await fs.readFile(path.join(vite, 'README.md'), 'utf8')).toBe(
      '# App\nFrontend: React + Vite + Query.\n> React\n> Vite\nEnd.\n',
    );
    const next = await generate('nextjs');
    expect(await fs.readFile(path.join(next, 'README.md'), 'utf8')).toBe(
      '# App\nFrontend: React + Next.js + Query.\n> React\n> Next.js (App Router)\nEnd.\n',
    );
    expect(await fs.readFile(path.join(next, 'client/README.md'), 'utf8')).toBe('# Next\nEnd.\n');
  });

  it('stops before writing anything when a frontend documentation block no longer matches', async () => {
    const opts = await nextOptions({
      templateDir: await makeFixtureTemplate({
        'README.md': '<!-- crda:frontend-stack -->\n> Webpack\n<!-- /crda:frontend-stack -->\n',
      }),
    });
    await expect(generateProject(opts)).rejects.toThrow(/"frontend-stack" no longer contains "> Vite" exactly once/);
    expect(existsSync(opts.targetDir)).toBe(false);
  });
});

describe.skipIf(!existsSync(defaultTemplateDir))('bundled template and database overlays', () => {
  it.each(SUPPORTED_DATABASES)('contains each %s provider edit anchor exactly once', async (database) => {
    for (const edit of DATABASES[database].edits) {
      const text = await fs.readFile(path.join(defaultTemplateDir, ...edit.templatePath.split('/')), 'utf8');
      expect(text.split(edit.from).length - 1, edit.templatePath).toBe(1);
    }
  });

  it('ships its own migrations for every overlay provider', async () => {
    for (const info of Object.values(DATABASES).filter((i) => i.replacesPrefix === TEMPLATE_PATHS.migrations)) {
      const migrations = await listFiles(path.join(defaultDatabasesDir, info.overlay, ...TEMPLATE_PATHS.migrations.split('/')));
      expect(migrations.some((f) => f.endsWith('_InitialCreate.cs')), info.name).toBe(true);
      expect(migrations).toContain('ApplicationDbContextModelSnapshot.cs');
    }
  });
});

describe.skipIf(!existsSync(defaultTemplateDir)).each(SUPPORTED_DATABASES)('generateProject (bundled template, %s)', (database) => {
  async function generateBundled(): Promise<{ targetDir: string; files: string[] }> {
    const targetDir = path.join(await makeTempDir(), 'school-portal');
    await generateProject({
      templateDir: defaultTemplateDir,
      targetDir,
      projectName: 'school-portal',
      displayName: 'School Portal',
      packageManager: 'pnpm',
      database,
      secrets,
    });
    return { targetDir, files: await listFiles(targetDir) };
  }

  const readText = (targetDir: string, file: string) => fs.readFile(path.join(targetDir, file), 'utf8');

  it('contains only the selected provider, its migrations and its documentation', async () => {
    const { targetDir, files } = await generateBundled();
    const other: Database = database === 'postgresql' ? 'sqlserver' : 'postgresql';
    const selectedPackage = DATABASES[database].efCorePackage;

    const packageReferences: string[] = [];
    for (const csproj of files.filter((f) => f.endsWith('.csproj'))) {
      packageReferences.push(...[...(await readText(targetDir, csproj)).matchAll(/<PackageReference Include="([^"]+)"/g)].map((m) => m[1]!));
    }
    expect(packageReferences).toContain(selectedPackage.id);
    expect(packageReferences).not.toContain(DATABASES[other].efCorePackage.id);
    expect(await readText(targetDir, 'server/SchoolPortal.Infrastructure/SchoolPortal.Infrastructure.csproj')).toContain(
      `<PackageReference Include="${selectedPackage.id}" Version="${selectedPackage.version}" />`,
    );

    const registration = await readText(
      targetDir,
      'server/SchoolPortal.Infrastructure/Extensions/DatabaseServiceCollectionExtensions.cs',
    );
    expect(registration).toContain(database === 'postgresql' ? 'UseNpgsql(' : 'UseSqlServer(');
    expect(registration).not.toContain(database === 'postgresql' ? 'UseSqlServer(' : 'UseNpgsql(');

    const migrations = files.filter((f) => f.startsWith('server/SchoolPortal.Infrastructure/Migrations/'));
    expect(migrations.filter((f) => f.endsWith('_InitialCreate.cs'))).toHaveLength(1);
    expect(migrations.filter((f) => f.endsWith('ModelSnapshot.cs'))).toHaveLength(1);
    const snapshot = await readText(targetDir, migrations.find((f) => f.endsWith('ModelSnapshot.cs'))!);
    expect(snapshot).toContain('namespace SchoolPortal.Infrastructure.Migrations');
    expect(snapshot).toContain(database === 'postgresql' ? 'NpgsqlModelBuilderExtensions' : 'SqlServerModelBuilderExtensions');
    expect(snapshot).not.toContain(database === 'postgresql' ? 'SqlServer' : 'Npgsql');

    for (const doc of files.filter((f) => f.endsWith('.md'))) {
      expect(await readText(targetDir, doc), doc).not.toContain('crda:');
    }
    const name = DATABASES[database].name;
    expect(await readText(targetDir, 'README.md')).toContain(`### Database: ${name}`);
    expect(await readText(targetDir, 'server/README.md')).toContain(`## 🗄️ Database & Migrations (${name})`);
    expect(files).toContain('server/.config/dotnet-tools.json');
  });

  it('keeps both repository implementations, wired to the selected provider', async () => {
    const { targetDir, files } = await generateBundled();
    const infrastructure = 'server/SchoolPortal.Infrastructure';

    for (const file of [
      'EFCoreRepositories/Base/IGenericRepository.cs',
      'EFCoreRepositories/Base/GenericRepository.cs',
      'EFCoreRepositories/Student/StudentRepository.cs',
      'DapperRepositories/Base/IDapperBase.cs',
      'DapperRepositories/Base/DapperBase.cs',
      'DapperRepositories/Base/IDbConnectionFactory.cs',
      'DapperRepositories/Base/DbConnectionFactory.cs',
    ]) {
      expect(files, file).toContain(`${infrastructure}/${file}`);
    }

    expect(await readText(targetDir, `${infrastructure}/SchoolPortal.Infrastructure.csproj`)).toContain(
      '<PackageReference Include="Dapper" Version="2.1.79" />',
    );

    const factory = await readText(targetDir, `${infrastructure}/DapperRepositories/Base/DbConnectionFactory.cs`);
    const [connection, namespace, otherConnection, otherNamespace] =
      database === 'postgresql'
        ? ['new NpgsqlConnection(', 'using Npgsql;', 'SqlConnection(', 'Microsoft.Data.SqlClient']
        : ['new SqlConnection(', 'using Microsoft.Data.SqlClient;', 'Npgsql', 'Npgsql'];
    expect(factory).toContain(connection);
    expect(factory).toContain(namespace);
    expect(factory).not.toContain(otherConnection);
    expect(factory).not.toContain(otherNamespace);

    const dapperBase = await readText(targetDir, `${infrastructure}/DapperRepositories/Base/DapperBase.cs`);
    expect(dapperBase).toContain('public DapperBase(IDbConnectionFactory connectionFactory)');
    expect(dapperBase.match(/_connectionFactory\.CreateConnection\(connectionId\)/g)).toHaveLength(5);
    expect(dapperBase).not.toMatch(/SqlConnection|Npgsql/);
    const dapperInterface = await readText(targetDir, `${infrastructure}/DapperRepositories/Base/IDapperBase.cs`);
    for (const method of ['GetData<T, P>', 'SaveData<T>', 'GetDataMultiple<T, TParams>', 'GetFirstOrDefault<T, P>', 'GetScalar<T, P>']) {
      expect(dapperInterface).toContain(method);
    }

    const count = (text: string, needle: string) => text.split(needle).length - 1;
    const repositories = await readText(targetDir, `${infrastructure}/Extensions/ServiceCollectionExtensions.cs`);
    expect(count(repositories, 'services.AddScoped<IDapperBase, DapperBase>();')).toBe(1);
    expect(count(repositories, 'services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));')).toBe(1);
    expect(count(repositories, 'services.AddScoped<IStudentRepository, StudentRepository>();')).toBe(1);
    expect(repositories).not.toContain('IDbConnectionFactory');
    const registration = await readText(targetDir, `${infrastructure}/Extensions/DatabaseServiceCollectionExtensions.cs`);
    expect(count(registration, 'services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();')).toBe(1);
    expect(count(registration, 'services.AddDbContext<ApplicationDbContext>(')).toBe(1);

    const program = await readText(targetDir, 'server/SchoolPortal.Api/Program.cs');
    expect(program).toContain('AddDatabase(');
    expect(program).toContain('AddRepositories(');

    expect(await readText(targetDir, 'server/README.md')).toContain(
      database === 'postgresql' ? 'creates\n  `NpgsqlConnection` instances' : 'creates\n  `SqlConnection` instances',
    );
  });

  /** KEY=VALUE lines of a .env file; commented `# KEY=VALUE` lines are returned separately. */
  function parseEnv(text: string): { values: Record<string, string>; commented: Record<string, string> } {
    const values: Record<string, string> = {};
    const commented: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      const match = /^(#\s*)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
      if (match) (match[1] ? commented : values)[match[2]!] = match[3]!;
    }
    return { values, commented };
  }

  const parseConnectionString = (value: string) =>
    Object.fromEntries(value.split(';').filter(Boolean).map((part) => part.split('=', 2) as [string, string]));

  it('ships a compose file whose settings come from a git-ignored .env and match the connection string', async () => {
    const { targetDir, files } = await generateBundled();
    expect(files).toEqual(expect.arrayContaining(['compose.yaml', '.env', '.env.example', '.gitignore']));
    const compose = await readText(targetDir, 'compose.yaml');
    const env = parseEnv(await readText(targetDir, '.env'));
    const example = await readText(targetDir, '.env.example');
    const appsettings = JSON.parse(await readText(targetDir, 'server/SchoolPortal.Api/appsettings.json')) as AppSettings;
    const connection = appsettings.ConnectionStrings.DefaultConnection;

    expect((await readText(targetDir, '.gitignore')).split(/\r?\n/)).toContain('.env');
    expect(example).not.toContain(secrets.databasePassword);
    expect(compose).not.toContain(secrets.databasePassword);
    expect(compose).not.toMatch(/ACCEPT_EULA: "?Y"?$/m);

    const ports = compose.match(/^\s+- "[^"]*"$/gm) ?? [];
    const portMappings = ports.filter((line) => /:\d+"$/.test(line));
    expect(portMappings, 'exactly one published port, on loopback').toHaveLength(1);
    expect(portMappings[0]).toMatch(/- "127\.0\.0\.1:\$\{\w+_PORT:-\d+\}:\d+"$/);
    expect(compose).toMatch(/^\s+healthcheck:\s*$/m);
    expect(compose).toMatch(/^volumes:\s*\n\s+[\w-]+-data:\s*$/m);

    if (database === 'postgresql') {
      expect(compose).toContain('image: postgres:17');
      expect(compose).toContain('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?');
      expect(compose).toContain('POSTGRES_DB: ${POSTGRES_DB:-SchoolPortalDb}');
      expect(compose).toContain('- postgres-data:/var/lib/postgresql/data');
      expect(env.values).toEqual({
        POSTGRES_USER: 'postgres',
        POSTGRES_PASSWORD: secrets.databasePassword,
        POSTGRES_DB: 'SchoolPortalDb',
        POSTGRES_PORT: '5432',
      });
      expect(parseConnectionString(connection)).toEqual({
        Host: 'localhost',
        Port: env.values.POSTGRES_PORT,
        Database: env.values.POSTGRES_DB,
        Username: env.values.POSTGRES_USER,
        Password: env.values.POSTGRES_PASSWORD,
      });
      expect(env.commented.ConnectionStrings__DefaultConnection).toBe(connection);
    } else {
      expect(compose).toContain('image: mcr.microsoft.com/mssql/server:2022-latest');
      expect(compose).toContain('ACCEPT_EULA: ${MSSQL_ACCEPT_EULA:?');
      expect(compose).toContain('MSSQL_SA_PASSWORD: ${MSSQL_SA_PASSWORD:?');
      expect(compose).toContain('MSSQL_PID: Developer');
      expect(compose).toContain('- sqlserver-data:/var/opt/mssql');
      expect(compose).not.toContain('POSTGRES_');
      expect(env.values).toEqual({ MSSQL_ACCEPT_EULA: '', MSSQL_SA_PASSWORD: secrets.databasePassword, MSSQL_PORT: '1433' });
      expect(connection).toBe(
        'Server=(localdb)\\mssqllocaldb;Database=SchoolPortalDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true',
      );
      expect(parseConnectionString(env.commented.ConnectionStrings__DefaultConnection!)).toEqual({
        Server: `localhost,${env.values.MSSQL_PORT}`,
        Database: 'SchoolPortalDb',
        'User Id': 'sa',
        Password: env.values.MSSQL_SA_PASSWORD,
        TrustServerCertificate: 'True',
        MultipleActiveResultSets: 'true',
      });
    }

    const holders = [];
    for (const file of files) {
      const text = await readText(targetDir, file);
      if (text.includes(secrets.databasePassword)) holders.push(file);
      if (database === 'postgresql') expect(text.toLowerCase().includes('localdb'), file).toBe(false);
    }
    expect(holders).toEqual(database === 'postgresql' ? ['.env', 'server/SchoolPortal.Api/appsettings.json'] : ['.env']);
  });

  it('documents host names that match the compose service: localhost from the host, the service name between containers', async () => {
    const { targetDir } = await generateBundled();
    const compose = await readText(targetDir, 'compose.yaml');
    const readme = await readText(targetDir, 'README.md');
    const service = /^services:\s*\n\s+([\w-]+):\s*$/m.exec(compose)?.[1];
    const mapping = /- "127\.0\.0\.1:\$\{(\w+_PORT):-(\d+)\}:(\d+)"$/m.exec(compose);
    expect(service).toBe(database === 'postgresql' ? 'postgres' : 'sqlserver');
    const [, portVariable, publishedDefault, containerPort] = mapping!;
    expect(publishedDefault).toBe(containerPort);

    const fromHost = database === 'postgresql' ? `Host=localhost;Port=<${portVariable}>` : `Server=localhost,<${portVariable}>`;
    const betweenContainers =
      database === 'postgresql' ? `Host=${service};Port=${containerPort}` : `Server=${service},${containerPort}`;
    expect(readme).toContain('#### Which host name to use');
    expect(readme).toContain(`\`${fromHost}\``);
    expect(readme).toContain(`\`${betweenContainers}\``);
    expect(readme).toContain(`through the Compose service name (\`${service}\`), never through \`localhost\``);
    expect(compose).toContain(betweenContainers);
    expect(compose).not.toMatch(/^\s+(depends_on|links|network_mode):/m);
    if (database === 'sqlserver') expect(readme).toContain('`Server=(localdb)\\mssqllocaldb`');
  });

  it('separates the generated development credentials from production secrets without printing them', async () => {
    const { targetDir } = await generateBundled();
    const readme = await readText(targetDir, 'README.md');
    expect(readme).toContain('### Development credentials and production secrets');
    expect(readme).toContain('server/SchoolPortal.Infrastructure/Extensions/DataSeeder.cs');
    for (const variable of ['ConnectionStrings__DefaultConnection', 'Jwt__Key', 'JwtTokenSettings__Key', 'EmailSettings__SmtpPass']) {
      expect(readme).toContain(`\`${variable}\``);
    }
    for (const secret of Object.values(secrets)) expect(readme).not.toContain(secret);
    expect(existsSync(path.join(targetDir, 'server', 'SchoolPortal.Infrastructure', 'Extensions', 'DataSeeder.cs'))).toBe(true);
  });

  it('ships VS Code launch configurations and tasks that point at real project files', async () => {
    const { targetDir, files } = await generateBundled();
    const readJson = async <T>(file: string) => JSON.parse(await readText(targetDir, file)) as T;
    expect(files).toEqual(expect.arrayContaining(['.vscode/extensions.json', '.vscode/launch.json', '.vscode/tasks.json']));

    interface Task { label: string; type: string; command?: string; args?: string[]; script?: string; path?: string }
    interface LaunchConfig { name: string; type: string; preLaunchTask?: string; program?: string; cwd?: string;
      launchSettingsProfile?: string; envFile?: string; url?: string; webRoot?: string }
    const extensions = await readJson<{ recommendations: string[] }>('.vscode/extensions.json');
    const { tasks } = await readJson<{ tasks: Task[] }>('.vscode/tasks.json');
    const launch = await readJson<{ configurations: LaunchConfig[]; compounds: { configurations: string[] }[] }>(
      '.vscode/launch.json',
    );
    expect(extensions.recommendations).toContain('ms-dotnettools.csharp');
    expect(new Set(extensions.recommendations).size).toBe(extensions.recommendations.length);

    const strings: string[] = [];
    const collect = (value: unknown): void => {
      if (typeof value === 'string') strings.push(value);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect([tasks, launch]);
    for (const value of strings) {
      expect(value, 'no machine-specific absolute paths').not.toMatch(/^([A-Za-z]:[\\/]|\/(?!\/)|~)/);
      expect(value).not.toMatch(/ReactDotnetBoilerplate|\\\\/);
    }
    const resolve = (value: string) => {
      expect(value.startsWith('${workspaceFolder}/'), value).toBe(true);
      return path.join(targetDir, ...value.slice('${workspaceFolder}/'.length).split('/'));
    };
    for (const value of strings.filter((s) => s.includes('${workspaceFolder}/') && !s.endsWith('.dll'))) {
      expect(existsSync(resolve(value)), value).toBe(true);
    }

    const labels = tasks.map((t) => t.label);
    expect(new Set(labels).size).toBe(labels.length);
    const clientPackage = JSON.parse(await readText(targetDir, 'client/package.json')) as { scripts: Record<string, string> };
    for (const task of tasks) {
      if (task.type === 'npm') {
        expect(task.path).toBe('client');
        expect(clientPackage.scripts[task.script!], task.label).toBeDefined();
      }
      if (task.command === 'docker') {
        expect(task.args?.[0]).toBe('compose');
        expect(task.args, `${task.label} must not delete data`).not.toContain('down');
        expect(task.args).not.toEqual(expect.arrayContaining(['-v']));
      }
    }

    const launchSettings = JSON.parse(await readText(targetDir, 'server/SchoolPortal.Api/Properties/launchSettings.json')) as {
      profiles: Record<string, { commandName: string; applicationUrl?: string }>;
    };
    const csproj = await readText(targetDir, 'server/SchoolPortal.Api/SchoolPortal.Api.csproj');
    const targetFramework = /<TargetFramework>([^<]+)<\/TargetFramework>/.exec(csproj)?.[1];
    const names = launch.configurations.map((c) => c.name);
    for (const config of launch.configurations) {
      if (config.preLaunchTask) expect(labels, config.name).toContain(config.preLaunchTask);
      if (config.type === 'coreclr') {
        expect(config.program).toBe(
          `\${workspaceFolder}/server/SchoolPortal.Api/bin/Debug/${targetFramework}/SchoolPortal.Api.dll`,
        );
        expect(config.cwd).toBe('${workspaceFolder}/server/SchoolPortal.Api');
        expect(launchSettings.profiles[config.launchSettingsProfile!]?.commandName).toBe('Project');
        if (config.envFile) expect(config.envFile).toBe('${workspaceFolder}/.env');
      }
      if (config.type === 'chrome') {
        expect(config.url).toBe('http://localhost:5173');
        expect(config.webRoot).toBe('${workspaceFolder}/client');
      }
    }
    expect(launch.configurations.filter((c) => c.type === 'coreclr' && !c.envFile)).toHaveLength(1);
    for (const compound of launch.compounds) {
      for (const name of compound.configurations) expect(names).toContain(name);
    }
    expect(await readText(targetDir, 'client/vite.config.ts')).not.toMatch(/\bport\s*:/);
  });

  it('wires the client codegen script to the API OpenAPI document and a committed, non-empty output', async () => {
    const { targetDir, files } = await generateBundled();
    const clientPackage = JSON.parse(await readText(targetDir, 'client/package.json')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
      overrides?: Record<string, Record<string, string>>;
      pnpm?: { peerDependencyRules?: { allowedVersions?: Record<string, string> } };
    };
    expect(clientPackage.scripts.codegen).toBe('node scripts/codegen.mjs');
    expect(clientPackage.scripts['codegen:test']).toBe('node --test scripts/codegen.test.mjs');
    expect(files).toEqual(expect.arrayContaining(['client/scripts/codegen.mjs', 'client/scripts/codegen.test.mjs']));

    const generatorRange = clientPackage.devDependencies['openapi-typescript'];
    expect(generatorRange, 'pinned: the generated file must not change with the npm resolution date').toMatch(/^7\.\d+\.\d+$/);
    expect(clientPackage.overrides?.['openapi-typescript']).toEqual({ typescript: '$typescript' });
    const typescriptMajor = /\d+/.exec(clientPackage.devDependencies.typescript ?? '')?.[0];
    expect(clientPackage.pnpm?.peerDependencyRules?.allowedVersions?.['openapi-typescript>typescript']).toBe(typescriptMajor);
    const lockfile = await readText(targetDir, 'client/pnpm-lock.yaml');
    expect(lockfile).toMatch(new RegExp(`^ {6}openapi-typescript:\\r?\\n {8}specifier: ${escapeRegExp(generatorRange!)}\\r?$`, 'm'));

    const script = await readText(targetDir, 'client/scripts/codegen.mjs');
    const defaultInput = new URL(/const DEFAULT_INPUT = '([^']+)';/.exec(script)?.[1] ?? 'invalid:');
    const launchSettings = JSON.parse(await readText(targetDir, 'server/SchoolPortal.Api/Properties/launchSettings.json')) as {
      profiles: Record<string, { applicationUrl?: string }>;
    };
    const httpUrls = Object.values(launchSettings.profiles).flatMap((p) => p.applicationUrl?.split(';') ?? []).filter((u) => u.startsWith('http:'));
    expect(httpUrls, 'Node.js cannot verify the ASP.NET Core dev certificate, so the default must be HTTP').toContain(defaultInput.origin);
    const swaggerDoc = /c\.SwaggerDoc\("([^"]+)"/.exec(await readText(targetDir, 'server/SchoolPortal.Api/Program.cs'))?.[1];
    expect(defaultInput.pathname).toBe(`/swagger/${swaggerDoc}/swagger.json`);
    const projectHint = /dotnet run --project (\S+) --launch-profile (\w+)/.exec(script);
    expect(existsSync(path.join(targetDir, 'server', projectHint?.[1] ?? 'missing'))).toBe(true);
    expect(launchSettings.profiles[projectHint?.[2] ?? 'missing']).toBeDefined();

    const outputSegments = /const DEFAULT_OUTPUT = path\.join\(CLIENT_DIR, ([^)]+)\);/.exec(script)?.[1]?.match(/'[^']+'/g)?.map((s) => s.slice(1, -1));
    expect(outputSegments).toEqual(['src', 'types', 'api.generated.ts']);
    const marker = /export const GENERATED_MARKER = '([^']+)';/.exec(script)?.[1];
    const generated = await readText(targetDir, 'client/src/types/api.generated.ts');
    expect(marker).toBeTruthy();
    expect(generated.startsWith(`${marker}\n`) || generated.startsWith(`${marker}\r\n`)).toBe(true);
    expect(generated).toMatch(/^export interface paths \{/m);
    expect(generated).toMatch(/^export interface components \{/m);
    const pathKeys = [...generated.matchAll(/^ {4}"(\/[^"]*)": \{/gm)].map((m) => m[1]);
    expect(pathKeys).toEqual(expect.arrayContaining(['/v1/auth/login', '/v1/students', '/v1/students/{id}']));
    expect(generated).toMatch(/^ {8}StudentResponse: \{/m);

    expect(await readText(targetDir, 'client/eslint.config.js')).toContain("'src/types/api.generated.ts'");
  });

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

interface Launch {
  configurations: { name: string; type: string; url?: string; webRoot?: string }[];
  compounds: { name: string; configurations: string[] }[];
}

describe.skipIf(!existsSync(path.join(defaultFrontendsDir, 'nextjs')))('Next.js frontend overlay', () => {
  const readJson = async <T>(file: string) => JSON.parse(await fs.readFile(file, 'utf8')) as T;
  interface Tasks { tasks: { label: string; problemMatcher?: unknown }[] }

  it('changes only the frontend entries of the shared VS Code configuration', async () => {
    const common = path.join(defaultCommonDir, '_vscode');
    const next = path.join(defaultFrontendsDir, 'nextjs', '_vscode');
    const [commonLaunch, nextLaunch] = await Promise.all([readJson<Launch>(path.join(common, 'launch.json')), readJson<Launch>(path.join(next, 'launch.json'))]);
    expect(nextLaunch.configurations.filter((c) => c.type !== 'chrome')).toEqual(commonLaunch.configurations.filter((c) => c.type !== 'chrome'));
    expect(nextLaunch.configurations.find((c) => c.type === 'chrome')).toMatchObject({
      name: FRONTENDS.nextjs.vscode.launch,
      url: FRONTENDS.nextjs.devServerUrl,
      webRoot: '${workspaceFolder}/client',
    });
    expect(nextLaunch.compounds).toEqual([
      { name: FRONTENDS.nextjs.vscode.compound, configurations: ['Backend: API', FRONTENDS.nextjs.vscode.launch], stopAll: true },
    ]);
    expect(commonLaunch.compounds[0]?.name).toBe(FRONTENDS.vite.vscode.compound);

    const [commonTasks, nextTasks] = await Promise.all([readJson<Tasks>(path.join(common, 'tasks.json')), readJson<Tasks>(path.join(next, 'tasks.json'))]);
    const withoutDevServer = (tasks: Tasks) => tasks.tasks.filter((t) => t.label !== 'client: dev');
    expect(withoutDevServer(nextTasks)).toEqual(withoutDevServer(commonTasks));
    expect(JSON.stringify(nextTasks.tasks.find((t) => t.label === 'client: dev'))).toContain('Ready in');
  });
});

describe.skipIf(!existsSync(path.join(defaultFrontendsDir, 'nextjs'))).each(SUPPORTED_DATABASES)(
  'generateProject (bundled template, Next.js, %s)',
  (database) => {
    async function generateBundled(frontend: 'vite' | 'nextjs', packageManager: 'pnpm' | 'npm' = 'pnpm') {
      const targetDir = path.join(await makeTempDir(), 'school-portal');
      await generateProject({
        templateDir: defaultTemplateDir,
        targetDir,
        projectName: 'school-portal',
        displayName: 'School Portal',
        packageManager,
        database,
        frontend,
        secrets,
      });
      return { targetDir, files: await listFiles(targetDir) };
    }
    const readText = (targetDir: string, file: string) => fs.readFile(path.join(targetDir, file), 'utf8');
    const FRONTEND_DOCS = ['README.md', 'CRUD_FLOW_GUIDE.md', '.vscode/launch.json', '.vscode/tasks.json'];

    it('shares the backend, database files and editor setup byte for byte with the React + Vite project', async () => {
      const [vite, next] = await Promise.all([generateBundled('vite'), generateBundled('nextjs')]);
      const outsideClient = (files: string[]) => files.filter((f) => !f.startsWith('client/'));
      expect(outsideClient(next.files)).toEqual(outsideClient(vite.files));
      for (const file of outsideClient(next.files).filter((f) => !FRONTEND_DOCS.includes(f))) {
        const [a, b] = await Promise.all([fs.readFile(path.join(vite.targetDir, file)), fs.readFile(path.join(next.targetDir, file))]);
        expect(b.equals(a), file).toBe(true);
      }
      expect(next.files).toEqual(expect.arrayContaining(['compose.yaml', '.env', '.env.example', '.gitignore', 'server/SchoolPortal.sln']));
    });

    it('contains the Next.js client only', async () => {
      const { files } = await generateBundled('nextjs');
      expect(files).toEqual(
        expect.arrayContaining([
          'client/next.config.ts',
          'client/package.json',
          'client/pnpm-lock.yaml',
          'client/.env',
          'client/.env.example',
          'client/.gitignore',
          'client/src/app/layout.tsx',
          'client/src/app/(main)/students/[id]/page.tsx',
          'client/src/app/(main)/students/create/page.tsx',
          'client/src/features/students/views/StudentListView.tsx',
        ]),
      );
      for (const viteOnly of ['client/vite.config.ts', 'client/index.html', 'client/src/main.tsx', 'client/src/routes/AppRoutes.tsx']) {
        expect(files).not.toContain(viteOnly);
      }
      expect(files.some((f) => f.startsWith('client/src/pages/'))).toBe(false);
      expect(files.some((f) => /(^|\/)(_gitignore|_env|_vscode)(\/|$)|\.next\/|next-env\.d\.ts|\.tsbuildinfo$/.test(f))).toBe(false);
    });

    it('drops the pnpm lockfile for npm', async () => {
      const { files } = await generateBundled('nextjs', 'npm');
      expect(files).not.toContain('client/pnpm-lock.yaml');
      expect(files).toContain('client/package.json');
    });

    it('creates a browser-only client .env with no secrets and keeps it git-ignored', async () => {
      const { targetDir } = await generateBundled('nextjs');
      const env = await readText(targetDir, 'client/.env');
      const example = await readText(targetDir, 'client/.env.example');
      expect(env).toBe(example);
      const variables = [...env.matchAll(/^([A-Z_]+)=(.*)$/gm)].map((m) => [m[1]!, m[2]!] as const);
      expect(Object.fromEntries(variables)).toEqual({
        NEXT_PUBLIC_APP_NAME: 'School Portal',
        NEXT_PUBLIC_API_BASE_URL: 'https://localhost:7001',
        NEXT_PUBLIC_API_TIMEOUT: '15000',
      });
      for (const secret of Object.values(secrets)) expect(env).not.toContain(secret);
      expect(variables.some(([name]) => /SECRET|PASSWORD|TOKEN|KEY/.test(name))).toBe(false);

      const clientIgnore = (await readText(targetDir, 'client/.gitignore')).split(/\r?\n/);
      expect(clientIgnore).toEqual(expect.arrayContaining(['.env', '.next/', 'next-env.d.ts', 'node_modules/']));
      expect((await readText(targetDir, '.gitignore')).split(/\r?\n/)).toContain('.env');
    });

    it('documents the Next.js client instead of Vite', async () => {
      const { targetDir, files } = await generateBundled('nextjs');
      for (const doc of files.filter((f) => f.endsWith('.md'))) {
        const text = await readText(targetDir, doc);
        expect(text, doc).not.toContain('crda:');
        expect(text, doc).not.toMatch(/\bVite\b|VITE_|5173|client-next|AppRoutes\.tsx|client\/src\/pages\//);
      }
      const readme = await readText(targetDir, 'README.md');
      expect(readme).toContain('React 19 + TypeScript + Next.js + TanStack Query');
      expect(readme).toContain('Mã nguồn Frontend (Next.js App Router + TypeScript)');
      expect(readme).toContain('### 3. Chạy Frontend (Client Next.js)');
      expect(readme).toContain('NEXT_PUBLIC_API_BASE_URL=https://localhost:7001');
      expect(readme).toContain('NEXT_PUBLIC_APP_NAME=School Portal');
      expect(readme).toContain('[http://localhost:3000](http://localhost:3000)');
      expect(readme).toContain('`Frontend: Next.js (Chrome)` starts the Next.js dev server');
      expect(readme).toContain('expects Next.js on its default port 3000');
      expect(readme).toContain(`### Database: ${DATABASES[database].name}`);
      const guide = await readText(targetDir, 'CRUD_FLOW_GUIDE.md');
      expect(guide).toContain('## 5. Các Bước Triển Khai Frontend (Client Next.js)');
      expect(guide).toContain('client/src/features/students/');
      expect(guide).toContain('4. **Viết React Query Hooks');
      expect(guide).toContain('// src/app/(main)/students/create/page.tsx');
      const clientReadme = await readText(targetDir, 'client/README.md');
      expect(clientReadme).toContain('# Next.js client');
      expect(clientReadme).not.toContain('Shared code with the Vite client');
    });

    it('points VS Code at the Next.js dev server', async () => {
      const { targetDir } = await generateBundled('nextjs');
      const launch = JSON.parse(await readText(targetDir, '.vscode/launch.json')) as Launch;
      expect(launch.configurations.find((c) => c.type === 'chrome')).toMatchObject({ url: 'http://localhost:3000' });
      expect(launch.compounds.map((c) => c.name)).toEqual(['Full stack: API + Next.js']);
      const tasks = JSON.parse(await readText(targetDir, '.vscode/tasks.json')) as { tasks: { label: string; script?: string }[] };
      const clientPackage = JSON.parse(await readText(targetDir, 'client/package.json')) as { scripts: Record<string, string> };
      for (const task of tasks.tasks.filter((t) => t.script)) expect(clientPackage.scripts[task.script!], task.label).toBeDefined();
      expect(clientPackage.scripts.dev).toBe('next dev');
    });

    it('uses the same codegen script and generated API types as the React + Vite client', async () => {
      const [vite, next] = await Promise.all([generateBundled('vite'), generateBundled('nextjs')]);
      for (const file of ['client/scripts/codegen.mjs', 'client/scripts/codegen.test.mjs', 'client/src/types/api.generated.ts']) {
        expect(await readText(next.targetDir, file), file).toBe(await readText(vite.targetDir, file));
      }
      const clientPackage = JSON.parse(await readText(next.targetDir, 'client/package.json')) as {
        scripts: Record<string, string>;
        devDependencies: Record<string, string>;
      };
      expect(clientPackage.scripts.codegen).toBe('node scripts/codegen.mjs');
      expect(clientPackage.scripts['codegen:test']).toBe('node --test scripts/codegen.test.mjs');
      expect(clientPackage.devDependencies['openapi-typescript']).toMatch(/^7\.\d+\.\d+$/);
      expect(await readText(next.targetDir, 'client/eslint.config.mjs')).toContain("'src/types/api.generated.ts'");
    });

    it('produces a fully renamed project with no template tokens or source identifiers', async () => {
      const { targetDir, files } = await generateBundled('nextjs');
      const forbidden = ['ReactDotnetBoilerplate', 'training-management-client', "'training-", 'Hệ thống quản lý đào tạo', ...Object.values(TEMPLATE_TOKENS)];
      for (const file of files) {
        const content = await fs.readFile(path.join(targetDir, file));
        if (content.subarray(0, 8000).includes(0)) continue;
        const text = content.toString('utf8');
        for (const value of forbidden) expect(text.includes(value), `${file} still contains ${value}`).toBe(false);
      }
      expect((JSON.parse(await readText(targetDir, 'client/package.json')) as { name: string }).name).toBe('school-portal-client');
      expect(await readText(targetDir, 'client/src/store/authStore.ts')).toContain("name: 'school-portal-auth'");
    });
  },
);
