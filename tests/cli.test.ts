import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { CommanderError } from 'commander';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { main, type Runtime } from '../src/cli.js';
import { CancelledError, CliError } from '../src/errors.js';
import { defaultTemplateDir } from '../src/paths.js';
import { INITIAL_COMMIT_MESSAGE } from '../src/steps.js';
import { CANCEL, fakeProbe, fakeRunner, scriptedPrompter, type FakeTools, type ScriptedAnswer } from './fakes.js';
import { listFiles, makeTempDir, writeFiles } from './helpers.js';

const argv = (...args: string[]) => ['node', 'create-react-dotnet-app', ...args];

function runtime(overrides: Partial<Runtime> & { tools?: FakeTools } = {}): Partial<Runtime> {
  const { tools, ...rest } = overrides;
  return {
    templateDir: defaultTemplateDir,
    probe: fakeProbe(tools),
    run: fakeRunner(),
    nodeVersion: 'v22.13.0',
    interactive: false,
    ...rest,
  };
}

async function newTarget(name = 'my-app'): Promise<string> {
  return path.join(await makeTempDir(), name);
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  return () => vi.restoreAllMocks();
});

describe.skipIf(!existsSync(defaultTemplateDir))('create-react-dotnet-app CLI', () => {
  describe('project name', () => {
    it('uses the name given as an argument and runs install + git with the defaults', async () => {
      const target = await newTarget();
      const run = fakeRunner();

      const summary = await main(argv(target), runtime({ run }));

      expect(summary.projectName).toBe('my-app');
      expect(summary.pascalName).toBe('MyApp');
      expect(existsSync(path.join(target, 'server', 'MyApp.sln'))).toBe(true);
      expect(summary.steps.map((s) => [s.name, s.status])).toEqual([
        ['Project files', 'done'],
        ['Frontend dependencies', 'done'],
        ['Git repository', 'done'],
      ]);
      expect(run.calls.map(({ command, args, options }) => [command, args, options.cwd])).toEqual([
        ['pnpm', ['install', '--frozen-lockfile'], path.join(target, 'client')],
        ['git', ['init'], target],
        ['git', ['add', '-A'], target],
        ['git', ['commit', '-m', INITIAL_COMMIT_MESSAGE], target],
      ]);
    });

    it('asks for the project name, package manager, install and git when no name is given', async () => {
      const target = await newTarget('prompted-app');
      const prompter = scriptedPrompter([target, 'npm', false, false]);
      const run = fakeRunner();

      const summary = await main(argv(), runtime({ interactive: true, prompter, run }));

      expect(prompter.asked.map((q) => [q.kind, q.message])).toEqual([
        ['text', 'Project name:'],
        ['select', 'Frontend package manager:'],
        ['confirm', 'Install frontend dependencies with npm now?'],
        ['confirm', 'Initialize a new Git repository?'],
      ]);
      expect(prompter.remaining()).toBe(0);
      expect(summary.projectName).toBe('prompted-app');
      expect(run.calls).toEqual([]);
      expect(existsSync(path.join(target, 'client', 'pnpm-lock.yaml'))).toBe(false);
      expect(summary.steps[1]).toMatchObject({ status: 'skipped', detail: 'skipped at your request' });
    });

    it('re-asks when the typed name is invalid', async () => {
      const dir = await makeTempDir();
      const prompter = scriptedPrompter([path.join(dir, 'Bad Name'), path.join(dir, 'good-name'), 'pnpm', false, false]);

      const summary = await main(argv(), runtime({ interactive: true, prompter }));

      expect(prompter.asked[0]?.rejected).toEqual([path.join(dir, 'Bad Name')]);
      expect(summary.projectName).toBe('good-name');
    });

    it('rejects an invalid name argument without prompting', async () => {
      const target = await newTarget('Not_Valid');
      await expect(main(argv(target), runtime())).rejects.toThrow(/Invalid project name "Not_Valid"/);
      expect(existsSync(target)).toBe(false);
    });

    it('re-prompts after an invalid name argument in interactive mode', async () => {
      const dir = await makeTempDir();
      const prompter = scriptedPrompter([path.join(dir, 'fixed-name'), 'pnpm', false, false]);

      const summary = await main(argv(path.join(dir, 'con')), runtime({ interactive: true, prompter }));

      expect(summary.projectName).toBe('fixed-name');
      expect(await listFiles(dir)).not.toContain('con');
    });

    it('requires a name when prompting is disabled', async () => {
      await expect(main(argv('--yes'), runtime())).rejects.toThrow(/Missing project name/);
    });
  });

  describe('package managers', () => {
    it('only offers installed package managers', async () => {
      const target = await newTarget();
      const prompter = scriptedPrompter([false, false]);

      const summary = await main(argv(target), runtime({ interactive: true, prompter, tools: { pnpm: false } }));

      expect(prompter.asked.some((q) => q.message === 'Frontend package manager:')).toBe(false);
      expect(prompter.asked[0]?.message).toBe('Install frontend dependencies with npm now?');
      expect(existsSync(path.join(summary.targetDir, 'client', 'pnpm-lock.yaml'))).toBe(false);
    });

    it('offers pnpm and npm when both are installed', async () => {
      const target = await newTarget();
      const prompter = scriptedPrompter(['pnpm', false, false]);

      await main(argv(target), runtime({ interactive: true, prompter }));

      expect(prompter.asked[0]).toMatchObject({ kind: 'select', choices: ['pnpm', 'npm'] });
    });

    it('rejects unsupported package managers', async () => {
      await expect(main(argv('my-app', '--pm', 'yarn'), runtime())).rejects.toThrow(CommanderError);
    });

    it('fails before writing anything when --install is requested but the package manager is missing', async () => {
      const target = await newTarget();
      await expect(
        main(argv(target, '--pm', 'pnpm', '--install'), runtime({ tools: { pnpm: false } })),
      ).rejects.toThrow(/pnpm was not found on PATH/);
      expect(existsSync(target)).toBe(false);
    });

    it('skips installation with a clear reason when no supported package manager is installed', async () => {
      const target = await newTarget();
      const run = fakeRunner();

      const summary = await main(argv(target, '--no-git'), runtime({ run, tools: { pnpm: false, npm: false } }));

      expect(summary.steps[1]).toMatchObject({ status: 'skipped', detail: 'skipped: npm was not found on PATH' });
      expect(run.calls).toEqual([]);
    });
  });

  describe('existing destination', () => {
    it('refuses a non-empty directory when not prompting and leaves it untouched', async () => {
      const target = await newTarget();
      await writeFiles(target, { 'notes.txt': 'keep me' });

      await expect(main(argv(target), runtime())).rejects.toThrow(/already exists and is not empty/);
      expect(await listFiles(target)).toEqual(['notes.txt']);
    });

    it('lets the user choose a different name', async () => {
      const dir = await makeTempDir();
      const existing = path.join(dir, 'taken');
      await writeFiles(existing, { 'notes.txt': 'keep me' });
      const prompter = scriptedPrompter(['rename', path.join(dir, 'fresh'), 'pnpm', false, false]);

      const summary = await main(argv(existing), runtime({ interactive: true, prompter }));

      expect(summary.projectName).toBe('fresh');
      expect(await listFiles(existing)).toEqual(['notes.txt']);
    });

    it('adds the project to a non-empty directory only after explicit confirmation, keeping existing files', async () => {
      const target = await newTarget();
      await writeFiles(target, { 'notes.txt': 'keep me', 'client/design.md': 'mine' });
      const prompter = scriptedPrompter(['merge', 'pnpm', false, false]);

      await main(argv(target), runtime({ interactive: true, prompter }));

      expect(prompter.asked[0]?.choices).toEqual(['rename', 'merge', 'cancel']);
      expect(await fs.readFile(path.join(target, 'notes.txt'), 'utf8')).toBe('keep me');
      expect(await fs.readFile(path.join(target, 'client/design.md'), 'utf8')).toBe('mine');
      expect(existsSync(path.join(target, 'server', 'MyApp.sln'))).toBe(true);
    });

    it('does not offer merging when a project file already exists, and cancelling changes nothing', async () => {
      const target = await newTarget();
      await writeFiles(target, { 'README.md': 'existing readme' });
      const prompter = scriptedPrompter(['cancel']);

      await expect(main(argv(target), runtime({ interactive: true, prompter }))).rejects.toThrow(CancelledError);

      expect(prompter.asked[0]?.choices).toEqual(['rename', 'cancel']);
      expect(await listFiles(target)).toEqual(['README.md']);
      expect(await fs.readFile(path.join(target, 'README.md'), 'utf8')).toBe('existing readme');
    });

    it('rejects a destination that is a file', async () => {
      const dir = await makeTempDir();
      await writeFiles(dir, { 'my-app': 'a file' });
      await expect(main(argv(path.join(dir, 'my-app')), runtime())).rejects.toThrow(/not a directory/);
    });
  });

  describe('cancellation', () => {
    it.each<[string, ScriptedAnswer[]]>([
      ['project name', [CANCEL]],
      ['package manager', ['__TARGET__', CANCEL]],
      ['install question', ['__TARGET__', 'pnpm', CANCEL]],
      ['git question', ['__TARGET__', 'pnpm', true, CANCEL]],
    ])('cancelling at the %s prompt writes nothing and runs nothing', async (_label, script) => {
      const target = await newTarget();
      const run = fakeRunner();
      const prompter = scriptedPrompter(script.map((answer) => (answer === '__TARGET__' ? target : answer)));

      await expect(main(argv(), runtime({ interactive: true, prompter, run }))).rejects.toThrow(CancelledError);
      expect(existsSync(target)).toBe(false);
      expect(run.calls).toEqual([]);
    });
  });

  describe('dependency installation', () => {
    it('does not run anything with --no-install --no-git', async () => {
      const run = fakeRunner();
      await main(argv(await newTarget(), '--no-install', '--no-git'), runtime({ run }));
      expect(run.calls).toEqual([]);
    });

    it('keeps the project and explains how to recover when installation fails', async () => {
      const target = await newTarget();
      const run = fakeRunner((call) => (call.command === 'pnpm' ? { exitCode: 1 } : {}));

      const summary = await main(argv(target), runtime({ run }));

      expect(summary.steps[1]).toMatchObject({ status: 'failed' });
      expect(summary.steps[1]?.detail).toContain('exit code 1');
      expect(summary.steps[1]?.recovery).toMatch(/pnpm install --frozen-lockfile$/);
      expect(summary.steps[2]).toMatchObject({ name: 'Git repository', status: 'done' });
      expect(existsSync(path.join(target, 'server', 'MyApp.sln'))).toBe(true);
    });

    it('reports a package manager that cannot be started', async () => {
      const run = fakeRunner((call) => (call.command === 'npm' ? { error: new Error('spawn npm ENOENT') } : {}));
      const summary = await main(argv(await newTarget(), '--pm', 'npm', '--no-git'), runtime({ run }));
      expect(summary.steps[1]).toMatchObject({ status: 'failed' });
      expect(summary.steps[1]?.detail).toContain('spawn npm ENOENT');
    });

    it('stops after an interrupted installation and skips git', async () => {
      const run = fakeRunner((call) => (call.command === 'pnpm' ? { exitCode: null, signal: 'SIGINT' } : {}));

      const summary = await main(argv(await newTarget()), runtime({ run }));

      expect(summary.steps[1]).toMatchObject({ status: 'interrupted' });
      expect(summary.steps[2]).toMatchObject({ status: 'skipped' });
      expect(run.calls.map((c) => c.command)).toEqual(['pnpm']);
    });
  });

  describe('git initialization', () => {
    it('reports a partial result when the initial commit fails', async () => {
      const target = await newTarget();
      const run = fakeRunner((call) =>
        call.args[0] === 'commit' ? { exitCode: 128, output: 'Author identity unknown' } : {},
      );

      const summary = await main(argv(target, '--no-install'), runtime({ run }));

      expect(summary.steps[2]).toMatchObject({ status: 'partial' });
      expect(summary.steps[2]?.detail).toContain('Author identity unknown');
      expect(summary.steps[2]?.recovery).toContain('git add -A && git commit');
    });

    it('reports a failed git init', async () => {
      const run = fakeRunner((call) => (call.args[0] === 'init' ? { exitCode: 1 } : {}));
      const summary = await main(argv(await newTarget(), '--no-install'), runtime({ run }));
      expect(summary.steps[2]).toMatchObject({ status: 'failed' });
      expect(run.calls).toHaveLength(1);
    });

    it('skips git inside an existing repository', async () => {
      const run = fakeRunner();
      const summary = await main(argv(await newTarget(), '--no-install'), runtime({ run, tools: { insideGitRepo: true } }));
      expect(summary.steps[2]).toMatchObject({ status: 'skipped' });
      expect(summary.steps[2]?.detail).toContain('already inside a Git repository');
      expect(run.calls).toEqual([]);
    });

    it('skips git with a reason when it is not installed, and fails early if --git was explicit', async () => {
      const summary = await main(argv(await newTarget(), '--no-install'), runtime({ tools: { git: false } }));
      expect(summary.steps[2]).toMatchObject({ status: 'skipped', detail: 'skipped: git was not found on PATH' });

      const target = await newTarget('other-app');
      await expect(main(argv(target, '--git'), runtime({ tools: { git: false } }))).rejects.toThrow(CliError);
      expect(existsSync(target)).toBe(false);
    });
  });
});
