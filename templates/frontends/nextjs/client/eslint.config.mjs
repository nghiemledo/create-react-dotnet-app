import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// eslint-config-next pulls in plugins that do not support ESLint 10 yet, so the Next.js rules are
// added through @next/eslint-plugin-next on top of the same base as the Vite client.
export default defineConfig([
  // api.generated.ts is written by `npm run codegen`; fix the API or the generator, not the file.
  globalIgnores(['.next', 'out', 'next-env.d.ts', 'src/types/api.generated.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
]);
