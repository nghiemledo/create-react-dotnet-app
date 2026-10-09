import { describe, expect, it } from 'vitest';
import {
  DOC_PLACEHOLDERS,
  SOURCE_PATHS,
  TemplateDriftError,
  discoverSecrets,
  isExcluded,
  removeForeignGitignoreEntries,
  sanitizeAppsettings,
  sanitizeLoginPage,
  sanitizeSourceFiles,
} from '../scripts/template-rules.js';
import { TEMPLATE_TOKENS } from '../src/tokens.js';
import type { AppSettings } from './helpers.js';

const FAKE_KEY = 'fake-signing-key-for-tests';
const FAKE_PASSWORD = 'fake-pw-123';

const appsettings = JSON.stringify(
  { Jwt: { Key: FAKE_KEY, Issuer: 'x' }, JwtTokenSettings: { Key: FAKE_KEY, Issuer: 'x' }, Other: 'kept' },
  null,
  2,
);
const dataSeeder = [
  `var result = await userManager.CreateAsync(user1, "${FAKE_PASSWORD}");`,
  `var result = await userManager.CreateAsync( user2 , "${FAKE_PASSWORD}");`,
].join('\n');
const loginPage = [
  "const [email, setEmail] = useState('admin@example.com');",
  `const [password, setPassword] = useState('${FAKE_PASSWORD}');`,
  `Dùng tài khoản Identity trên server. Ví dụ: admin@example.com / ${FAKE_PASSWORD}`,
].join('\n');

function sourceFiles(overrides: Record<string, string> = {}): Map<string, Buffer> {
  const files: Record<string, string> = {
    [SOURCE_PATHS.appsettings]: appsettings,
    [SOURCE_PATHS.dataSeeder]: dataSeeder,
    [SOURCE_PATHS.loginPage]: loginPage,
    [SOURCE_PATHS.serverGitignore]: 'bin/\nENGKING.Api/wwwroot/uploads/users\nobj/\n',
    'client/.gitignore': 'node_modules/\n',
    'README.md': `Password: \`${FAKE_PASSWORD}\`, key: ${FAKE_KEY}`,
    ...overrides,
  };
  return new Map(Object.entries(files).map(([p, text]) => [p, Buffer.from(text, 'utf8')]));
}

describe('isExcluded', () => {
  it.each([
    'client/.env',
    'client/.env.production',
    'client/node_modules/x/index.js',
    'server/App.Api/bin/Debug/app.dll',
    'server/App.Api/obj/project.assets.json',
    'server/.vs/config',
    'server/App.Api/App.Api.csproj.user',
    'server/cert.pfx',
    'server/App.Api/wwwroot/uploads/users/avatar.png',
    '.github/workflows/ci.yml',
  ])('excludes %s', (p) => expect(isExcluded(p)).toBe(true));

  it.each(['client/.env.example', 'server/App.Api/wwwroot/uploads/users/.gitkeep', 'client/src/main.tsx'])(
    'keeps %s',
    (p) => expect(isExcluded(p)).toBe(false),
  );
});

describe('individual rules', () => {
  it('discovers JWT keys and seed passwords', () => {
    expect(discoverSecrets(appsettings, dataSeeder)).toEqual({
      jwtSigningKeys: [FAKE_KEY],
      seedUserPasswords: [FAKE_PASSWORD],
    });
  });

  it('fails with a drift error when a JWT section disappears', () => {
    expect(() => discoverSecrets(JSON.stringify({ Jwt: { Key: 'k' } }), dataSeeder)).toThrow(TemplateDriftError);
  });

  it('fails with a drift error when the seeder no longer has passwords', () => {
    expect(() => discoverSecrets(appsettings, 'no users here')).toThrow(TemplateDriftError);
  });

  it('tokenizes both JWT sections and keeps other settings', () => {
    const result = JSON.parse(sanitizeAppsettings(appsettings)) as AppSettings;
    expect(result.Jwt.Key).toBe(TEMPLATE_TOKENS.jwtSigningKey);
    expect(result.JwtTokenSettings.Key).toBe(TEMPLATE_TOKENS.jwtSigningKey);
    expect(result.Other).toBe('kept');
  });

  it('preserves CRLF line endings in appsettings', () => {
    expect(sanitizeAppsettings(appsettings.replaceAll('\n', '\r\n'))).toMatch(/\r\n/);
  });

  it('removes prefilled credentials from the login page', () => {
    const result = sanitizeLoginPage(loginPage, [FAKE_PASSWORD]);
    expect(result).not.toContain(FAKE_PASSWORD);
    expect(result).not.toContain('admin@example.com');
    expect(result).toContain('Dùng tài khoản Identity trên server.');
  });

  it('removes only the foreign .gitignore entry', () => {
    expect(removeForeignGitignoreEntries('bin/\nENGKING.Api/x\nobj/\n')).toBe('bin/\nobj/\n');
  });
});

describe('sanitizeSourceFiles', () => {
  it('produces a template without secrets and with renamed .gitignore files', () => {
    const { files, excluded } = sanitizeSourceFiles(sourceFiles({ 'client/.env': 'VITE_X=1' }));

    expect(excluded).toEqual(['client/.env']);
    expect([...files.keys()]).toContain('client/_gitignore');
    expect([...files.keys()]).toContain('server/_gitignore');
    expect([...files.keys()]).not.toContain('client/.gitignore');

    const readme = files.get('README.md')?.toString('utf8');
    expect(readme).toContain(DOC_PLACEHOLDERS.seedUserPassword);
    expect(readme).toContain(DOC_PLACEHOLDERS.jwtSigningKey);
    expect(files.get(SOURCE_PATHS.dataSeeder)?.toString('utf8')).toContain(TEMPLATE_TOKENS.seedUserPassword);
  });

  it('refuses to produce a template when a secret survives in a file without a rule', () => {
    expect(() =>
      sanitizeSourceFiles(sourceFiles({ 'client/src/config/leak.ts': `export const k = '${FAKE_KEY}';` })),
    ).toThrow(/client\/src\/config\/leak\.ts/);
  });

  it('never includes the secret value in the leak error message', () => {
    try {
      sanitizeSourceFiles(sourceFiles({ 'client/src/leak.ts': FAKE_KEY }));
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain(FAKE_KEY);
    }
  });

  it('fails when a file the rules depend on is missing', () => {
    const files = sourceFiles();
    files.delete(SOURCE_PATHS.dataSeeder);
    expect(() => sanitizeSourceFiles(files)).toThrow(TemplateDriftError);
  });
});
