import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root: one level above both `src/` (tests, tsx) and `dist/` (published build). */
export const packageRoot = fileURLToPath(new URL('..', import.meta.url));

export const defaultTemplateDir = path.join(packageRoot, 'templates', 'default');

/** Provider overlays (compose.yaml, .env files, PostgreSQL migrations), laid out like the template they are added to. */
export const defaultDatabasesDir = path.join(packageRoot, 'templates', 'databases');
/** Files added to every generated project regardless of database (editor configuration, root .gitignore). */
export const defaultCommonDir = path.join(packageRoot, 'templates', 'common');
/** Frontend overlays (another `client/` and its editor configuration), laid out like the template. */
export const defaultFrontendsDir = path.join(packageRoot, 'templates', 'frontends');
