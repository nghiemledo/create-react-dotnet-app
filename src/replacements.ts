import type { ProjectSecrets } from './secrets.js';
import { SOURCE_PROJECT_NAME, TEMPLATE_TOKENS } from './tokens.js';

export interface Replacement {
  from: string;
  to: string;
  /** Restricts the rule to matching template-relative paths (POSIX separators). Defaults to all text files. */
  appliesTo?: (templatePath: string) => boolean;
}

export interface ReplacementContext {
  projectName: string;
  pascalName: string;
  displayName: string;
  secrets: ProjectSecrets;
}

const SOURCE_DISPLAY_NAME = 'Hệ thống quản lý đào tạo';

/**
 * Identifiers from the source boilerplate that must change per generated project.
 * Covers namespaces, project/solution names, the CORS policy name, the Swagger title and
 * the database name, all of which derive from `ReactDotnetBoilerplate`.
 */
export function buildReplacements(context: ReplacementContext): Replacement[] {
  const { projectName, pascalName, displayName, secrets } = context;
  return [
    { from: SOURCE_PROJECT_NAME, to: pascalName },
    {
      from: '"training-management-client"',
      to: `"${projectName}-client"`,
      appliesTo: (p) => p === 'client/package.json',
    },
    {
      // Zustand persist keys: training-auth, training-app, training-academic-context.
      from: "'training-",
      to: `'${projectName}-`,
      appliesTo: (p) => p.startsWith('client/src/store/'),
    },
    { from: SOURCE_DISPLAY_NAME, to: displayName },
    {
      from: '<title>client</title>',
      to: `<title>${displayName}</title>`,
      appliesTo: (p) => p === 'client/index.html',
    },
    {
      from: 'demo-software-architecture/',
      to: `${projectName}/`,
      appliesTo: (p) => p.endsWith('.md'),
    },
    { from: TEMPLATE_TOKENS.jwtSigningKey, to: secrets.jwtSigningKey },
    { from: TEMPLATE_TOKENS.seedUserPassword, to: secrets.seedUserPassword },
  ];
}

export function applyReplacements(content: string, templatePath: string, replacements: Replacement[]): string {
  let result = content;
  for (const replacement of replacements) {
    if (!replacement.appliesTo || replacement.appliesTo(templatePath)) {
      result = result.replaceAll(replacement.from, replacement.to);
    }
  }
  return result;
}
