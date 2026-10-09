/** Identifier used throughout the source boilerplate; replaced with the project's PascalCase name. */
export const SOURCE_PROJECT_NAME = 'ReactDotnetBoilerplate';

/**
 * Placeholders written into the template by `scripts/sync-template.ts` in place of committed secrets.
 * `generateProject` refuses to finish if any of them survives generation.
 */
export const TEMPLATE_TOKENS = {
  jwtSigningKey: '__JWT_SIGNING_KEY__',
  seedUserPassword: '__SEED_USER_PASSWORD__',
} as const;

/** npm strips `.gitignore` from published packages, so the template stores them under this name. */
export const TEMPLATE_GITIGNORE_NAME = '_gitignore';
