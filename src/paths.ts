import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Package root: one level above both `src/` (tests, tsx) and `dist/` (published build). */
export const packageRoot = fileURLToPath(new URL('..', import.meta.url));

export const defaultTemplateDir = path.join(packageRoot, 'templates', 'default');
