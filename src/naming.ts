import path from 'node:path';

const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PROJECT_NAME_MAX_LENGTH = 64;

// Display names are inserted into JSON, C#, TypeScript and HTML string literals,
// so quotes, backslashes and markup characters are not allowed.
const DISPLAY_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} ._-]*$/u;
const DISPLAY_NAME_MAX_LENGTH = 80;

// A root namespace with these names would shadow framework namespaces.
const RESERVED_DOTNET_NAMES = new Set(['System', 'Microsoft']);

// Device names that cannot be used as directory names on Windows.
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/;

/** Returns an error message, or `undefined` when the name is valid. */
export function validateProjectName(name: string): string | undefined {
  if (!name) {
    return 'Project name is required.';
  }
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return `Project name must be at most ${PROJECT_NAME_MAX_LENGTH} characters.`;
  }
  if (!PROJECT_NAME_PATTERN.test(name)) {
    return 'Use lowercase letters, digits and single hyphens, starting with a letter (for example "my-app").';
  }
  if (WINDOWS_RESERVED_NAMES.test(name)) {
    return `"${name}" is a reserved device name on Windows.`;
  }
  const pascalName = toPascalCase(name);
  if (RESERVED_DOTNET_NAMES.has(pascalName)) {
    return `"${name}" would produce the reserved .NET namespace "${pascalName}".`;
  }
  return undefined;
}

/** Returns an error message, or `undefined` when the display name is valid. */
export function validateDisplayName(name: string): string | undefined {
  if (!name) {
    return 'Display name is required.';
  }
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }
  if (!DISPLAY_NAME_PATTERN.test(name)) {
    return 'Use letters, digits, spaces, dots, hyphens and underscores only.';
  }
  return undefined;
}

/** `my-app` -> `MyApp`. Assumes the input already passed `validateProjectName`. */
export function toPascalCase(name: string): string {
  return name
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
}

export function projectNameFromDirectory(directory: string): string {
  return path.basename(path.resolve(directory.trim()));
}
