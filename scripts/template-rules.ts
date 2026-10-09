import { escapeRegExp, isBinary } from '../src/text.js';
import { TEMPLATE_GITIGNORE_NAME, TEMPLATE_TOKENS } from '../src/tokens.js';

/** Files in the source repository that the sanitizer depends on. Renaming them upstream fails the sync. */
export const SOURCE_PATHS = {
  appsettings: 'server/ReactDotnetBoilerplate.Api/appsettings.json',
  dataSeeder: 'server/ReactDotnetBoilerplate.Infrastructure/Extensions/DataSeeder.cs',
  loginPage: 'client/src/pages/Auth/LoginPage.tsx',
  serverGitignore: 'server/.gitignore',
} as const;

/**
 * Defence in depth: the sync only reads git-tracked files, but these must never reach the template
 * even if someone commits them upstream.
 */
const EXCLUDED_PATHS: RegExp[] = [
  /^\.github\//,
  /(^|\/)node_modules\//,
  /(^|\/)(bin|obj|dist|\.vs)\//,
  /\.csproj\.user$/,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)[^/]+$/,
  /\.(pfx|p12|pem|key|snk|db|sqlite|mdf|ldf|log)$/i,
  /(^|\/)wwwroot\/uploads\/.+(?<!\.gitkeep)$/,
];

export function isExcluded(sourcePath: string): boolean {
  return EXCLUDED_PATHS.some((pattern) => pattern.test(sourcePath));
}

export const DOC_PLACEHOLDERS = {
  jwtSigningKey: '<generated-per-project>',
  seedUserPassword: '<shown-once-when-the-project-is-created>',
} as const;

const SEED_PASSWORD_PATTERN = /(userManager\.CreateAsync\(\s*\w+\s*,\s*)"([^"]*)"/g;

export interface DiscoveredSecrets {
  jwtSigningKeys: string[];
  seedUserPasswords: string[];
}

export class TemplateDriftError extends Error {
  constructor(message: string) {
    super(`${message} The source repository changed; update scripts/template-rules.ts.`);
    this.name = 'TemplateDriftError';
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function readJwtSection(settings: Record<string, unknown>, section: string): { Key?: unknown } {
  const value = settings[section];
  if (typeof value !== 'object' || value === null) {
    throw new TemplateDriftError(`appsettings.json has no "${section}" section.`);
  }
  return value;
}

export function discoverSecrets(appsettings: string, dataSeeder: string): DiscoveredSecrets {
  const settings = JSON.parse(stripBom(appsettings)) as Record<string, unknown>;
  const jwtSigningKeys = ['Jwt', 'JwtTokenSettings'].map((section) => {
    const key = readJwtSection(settings, section).Key;
    if (typeof key !== 'string' || key.length === 0) {
      throw new TemplateDriftError(`appsettings.json "${section}.Key" is missing.`);
    }
    return key;
  });

  const seedUserPasswords = [...dataSeeder.matchAll(SEED_PASSWORD_PATTERN)].map((match) => match[2] ?? '');
  if (seedUserPasswords.length === 0) {
    throw new TemplateDriftError('DataSeeder.cs no longer calls userManager.CreateAsync(user, "<password>").');
  }

  return {
    jwtSigningKeys: [...new Set(jwtSigningKeys)],
    seedUserPasswords: [...new Set(seedUserPasswords.filter(Boolean))],
  };
}

/** Both JWT sections get the same token: Program.cs validates with `Jwt` while TokenService also signs with `JwtTokenSettings`. */
export function sanitizeAppsettings(text: string): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const settings = JSON.parse(stripBom(text)) as Record<string, unknown>;
  for (const section of ['Jwt', 'JwtTokenSettings']) {
    readJwtSection(settings, section).Key = TEMPLATE_TOKENS.jwtSigningKey;
  }
  return `${JSON.stringify(settings, null, 2).replaceAll('\n', eol)}${eol}`;
}

export function sanitizeDataSeeder(text: string): string {
  return text.replace(SEED_PASSWORD_PATTERN, `$1"${TEMPLATE_TOKENS.seedUserPassword}"`);
}

/** Removes the prefilled admin credentials and the on-screen credential hint. */
export function sanitizeLoginPage(text: string, seedUserPasswords: string[]): string {
  let result = text.replace(/useState\('[^']*@[^']*'\)/, "useState('')");
  for (const password of seedUserPasswords) {
    result = result.replaceAll(`useState('${password}')`, "useState('')");
    result = result.replace(new RegExp(` Ví dụ: \\S+@\\S+ / ${escapeRegExp(password)}`, 'g'), '');
  }
  return result;
}

/** server/.gitignore carries an entry for an unrelated project (ENGKING.Api). */
export function removeForeignGitignoreEntries(text: string): string {
  return text.replace(/^ENGKING\.[^\r\n]*\r?\n?/gm, '');
}

export function redactDocs(text: string, secrets: DiscoveredSecrets): string {
  let result = text;
  for (const key of secrets.jwtSigningKeys) {
    result = result.replaceAll(key, DOC_PLACEHOLDERS.jwtSigningKey);
  }
  for (const password of secrets.seedUserPasswords) {
    result = result.replaceAll(password, DOC_PLACEHOLDERS.seedUserPassword);
  }
  return result;
}

export function templatePathFor(sourcePath: string): string {
  return sourcePath
    .split('/')
    .map((segment) => (segment === '.gitignore' ? TEMPLATE_GITIGNORE_NAME : segment))
    .join('/');
}

export interface SanitizeResult {
  files: Map<string, Buffer>;
  excluded: string[];
  applied: string[];
}

/** Turns git-tracked source files into template files. Throws on drift or if any secret value survives. */
export function sanitizeSourceFiles(sourceFiles: Map<string, Buffer>): SanitizeResult {
  const readText = (sourcePath: string): string => {
    const content = sourceFiles.get(sourcePath);
    if (!content) {
      throw new TemplateDriftError(`Expected file ${sourcePath} is missing.`);
    }
    return content.toString('utf8');
  };

  const secrets = discoverSecrets(readText(SOURCE_PATHS.appsettings), readText(SOURCE_PATHS.dataSeeder));
  const fileRules = new Map<string, { name: string; transform: (text: string) => string }>([
    [SOURCE_PATHS.appsettings, { name: 'tokenize JWT signing keys', transform: sanitizeAppsettings }],
    [SOURCE_PATHS.dataSeeder, { name: 'tokenize seed user password', transform: sanitizeDataSeeder }],
    [
      SOURCE_PATHS.loginPage,
      { name: 'remove prefilled login credentials', transform: (t) => sanitizeLoginPage(t, secrets.seedUserPasswords) },
    ],
    [SOURCE_PATHS.serverGitignore, { name: 'remove foreign .gitignore entries', transform: removeForeignGitignoreEntries }],
  ]);

  const files = new Map<string, Buffer>();
  const excluded: string[] = [];
  const applied: string[] = [];

  for (const [sourcePath, content] of sourceFiles) {
    if (isExcluded(sourcePath)) {
      excluded.push(sourcePath);
      continue;
    }
    if (isBinary(content)) {
      files.set(templatePathFor(sourcePath), content);
      continue;
    }

    let text = content.toString('utf8');
    const rule = fileRules.get(sourcePath);
    if (rule) {
      const transformed = rule.transform(text);
      if (transformed !== text) {
        applied.push(`${sourcePath}: ${rule.name}`);
      }
      text = transformed;
    }
    if (sourcePath.endsWith('.md')) {
      const redacted = redactDocs(text, secrets);
      if (redacted !== text) {
        applied.push(`${sourcePath}: redact secrets in docs`);
      }
      text = redacted;
    }
    files.set(templatePathFor(sourcePath), Buffer.from(text, 'utf8'));
  }

  const leaks = findLeakedSecrets(files, secrets);
  if (leaks.length > 0) {
    throw new Error(
      `Secret values from the source repository remain in: ${leaks.join(', ')}. ` +
        'Add a sanitization rule in scripts/template-rules.ts before syncing.',
    );
  }

  return { files, excluded, applied };
}

export function findLeakedSecrets(files: Map<string, Buffer>, secrets: DiscoveredSecrets): string[] {
  const values = [...secrets.jwtSigningKeys, ...secrets.seedUserPasswords];
  const leaks: string[] = [];
  for (const [templatePath, content] of files) {
    if (isBinary(content)) {
      continue;
    }
    const text = content.toString('utf8');
    if (values.some((value) => text.includes(value))) {
      leaks.push(templatePath);
    }
  }
  return leaks;
}
