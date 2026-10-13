import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { databaseDocBlocks } from '../src/databases.js';
import { keepBlock, renderDocBlocks, replaceOnce } from '../src/doc-blocks.js';
import { DEFAULT_FRONTEND, FRONTENDS, SUPPORTED_FRONTENDS, frontendDocBlocks, isFrontend } from '../src/frontends.js';
import { defaultTemplateDir } from '../src/paths.js';
import { nextStepLines } from '../src/summary.js';

describe('frontends', () => {
  it('keeps React + Vite as the default and recognizes only supported values', () => {
    expect(DEFAULT_FRONTEND).toBe('vite');
    expect(SUPPORTED_FRONTENDS).toEqual(['vite', 'nextjs']);
    expect(isFrontend('nextjs')).toBe(true);
    expect(isFrontend('next')).toBe(false);
    expect(isFrontend('angular')).toBe(false);
  });

  it('uses the template client for Vite and an overlay that replaces client/ for Next.js', () => {
    expect(FRONTENDS.vite.overlay).toBeUndefined();
    expect(FRONTENDS.vite.replacesPrefix).toBeUndefined();
    expect(FRONTENDS.nextjs).toMatchObject({ overlay: 'nextjs', replacesPrefix: 'client/', devServerUrl: 'http://localhost:3000' });
    expect(FRONTENDS.vite.devServerUrl).toBe('http://localhost:5173');
  });
});

describe('renderDocBlocks', () => {
  it('passes the text between the markers, without the line breaks around it, to function renderers', () => {
    const text = 'A\n<!-- crda:x -->\nline 1\nline 2\n<!-- /crda:x -->\nB';
    expect(renderDocBlocks(text, { x: keepBlock }, 'README.md')).toBe('A\nline 1\nline 2\nB');
    expect(renderDocBlocks(text, { x: (inner) => inner.toUpperCase() }, 'README.md')).toBe('A\nLINE 1\nLINE 2\nB');
    expect(renderDocBlocks('A <!-- crda:x -->inline<!-- /crda:x --> B', { x: keepBlock }, 'README.md')).toBe('A inline B');
  });

  it('removes the line of an empty block, but not the surrounding text of an inline one', () => {
    expect(renderDocBlocks('A\n<!-- crda:x -->\nhidden\n<!-- /crda:x -->\nB\n', { x: '' }, 'README.md')).toBe('A\nB\n');
    expect(renderDocBlocks('A\r\n<!-- crda:x -->\r\nhidden\r\n<!-- /crda:x -->\r\nB', { x: '' }, 'README.md')).toBe('A\r\nB');
    expect(renderDocBlocks('Kept.<!-- crda:x --> Hidden.<!-- /crda:x --> Also kept.', { x: '' }, 'README.md')).toBe(
      'Kept. Also kept.',
    );
    expect(renderDocBlocks('End.\n<!-- crda:x -->\nhidden\n<!-- /crda:x -->', { x: '' }, 'README.md')).toBe('End.\n');
  });

  it('replaceOnce fails when the expected text is missing or ambiguous', () => {
    expect(replaceOnce('a Vite b', 'Vite', 'Next.js', 'x')).toBe('a Next.js b');
    expect(() => replaceOnce('a b', 'Vite', 'Next.js', 'x')).toThrow(/"x" no longer contains "Vite" exactly once \(found 0\)/);
    expect(() => replaceOnce('Vite Vite', 'Vite', 'Next.js', 'x')).toThrow(/found 2/);
  });
});

describe('frontend documentation blocks', () => {
  it('render the same set of blocks for every frontend', () => {
    const names = Object.keys(frontendDocBlocks('vite')).sort();
    expect(Object.keys(frontendDocBlocks('nextjs')).sort()).toEqual(names);
    expect(names).toContain('source-repo-only');
  });

  it('describe the VS Code configuration of the selected frontend', () => {
    for (const frontend of SUPPORTED_FRONTENDS) {
      const { vscode, devServerUrl } = FRONTENDS[frontend];
      const setup = databaseDocBlocks('postgresql', frontend)['database-setup'];
      expect(setup).toContain(`\`${vscode.launch}\``);
      expect(setup).toContain(`\`${vscode.compound}\``);
      expect(setup).toContain(`default port ${new URL(devServerUrl).port}`);
    }
    expect(databaseDocBlocks('sqlserver')['database-setup']).toBe(databaseDocBlocks('sqlserver', 'vite')['database-setup']);
    expect(databaseDocBlocks('sqlserver', 'nextjs')['database-setup']).not.toMatch(/Vite|5173/);
  });

  it.skipIf(!existsSync(defaultTemplateDir))('render every block in the bundled template documentation', async () => {
    for (const doc of ['README.md', 'CRUD_FLOW_GUIDE.md', 'server/README.md', 'client/README.md']) {
      const text = await fs.readFile(path.join(defaultTemplateDir, ...doc.split('/')), 'utf8');
      for (const frontend of SUPPORTED_FRONTENDS) {
        const blocks = { ...frontendDocBlocks(frontend), ...databaseDocBlocks('postgresql', frontend) };
        const rendered = renderDocBlocks(text, blocks, doc);
        expect(rendered, `${doc} (${frontend})`).not.toContain('crda:');
      }
    }
  });
});

describe('next steps per frontend', () => {
  const context = {
    targetDir: '/work/my-app',
    pascalName: 'MyApp',
    database: 'postgresql' as const,
    packageManager: 'npm' as const,
    dependenciesInstalled: false,
    dotnetSdkFound: true,
    seedUserPassword: 'SeedPw',
  };

  it('starts the Vite dev server by default', () => {
    const text = nextStepLines(context).join('\n');
    expect(text).toContain('3. Start the frontend: Vite dev server at http://localhost:5173');
    expect(text).toContain('"Full stack: API + Vite"');
  });

  it('starts the Next.js dev server for Next.js projects, with the same commands', () => {
    const lines = nextStepLines({ ...context, frontend: 'nextjs' });
    const text = lines.join('\n');
    expect(text).toContain('3. Start the frontend: Next.js dev server at http://localhost:3000');
    expect(text).toContain('"Full stack: API + Next.js"');
    expect(text).not.toMatch(/Vite|5173/);
    expect(lines).toContain('       npm install');
    expect(lines).toContain('       npm run dev');
  });
});
