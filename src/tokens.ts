/** Identifier used throughout the source boilerplate; replaced with the project's PascalCase name. */
export const SOURCE_PROJECT_NAME = 'ReactDotnetBoilerplate';

/**
 * Placeholders written into the template by `scripts/sync-template.ts` in place of committed secrets.
 * `generateProject` refuses to finish if any of them survives generation.
 */
export const TEMPLATE_TOKENS = {
  jwtSigningKey: '__JWT_SIGNING_KEY__',
  seedUserPassword: '__SEED_USER_PASSWORD__',
  /** Local database container password: the generated root .env and, for PostgreSQL, the connection string. */
  databasePassword: '__DB_PASSWORD__',
} as const;

/** npm strips `.gitignore` from published packages, so the template stores them under this name. */
export const TEMPLATE_GITIGNORE_NAME = '_gitignore';

/**
 * Path segments renamed on output. `.gitignore` is stripped by npm; `.env` and `.vscode/` are stored under other
 * names so this repository's own ignore rules and editor do not treat them as live files.
 */
export const TEMPLATE_DOTFILE_NAMES: Readonly<Record<string, string>> = {
  [TEMPLATE_GITIGNORE_NAME]: '.gitignore',
  _env: '.env',
  _vscode: '.vscode',
};
