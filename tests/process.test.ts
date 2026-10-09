import { describe, expect, it } from 'vitest';
import { describeFailure, probeCommand, runCommand, wasInterrupted } from '../src/process.js';
import { makeTempDir } from './helpers.js';

const node = process.execPath;

describe('runCommand (real subprocesses)', () => {
  it('reports success', async () => {
    const result = await runCommand(node, ['-e', 'process.exit(0)'], { cwd: await makeTempDir(), quiet: true });
    expect(result).toMatchObject({ ok: true, exitCode: 0 });
  });

  it('reports a non-zero exit code with captured output', async () => {
    const result = await runCommand(node, ['-e', 'console.error("boom"); process.exit(3)'], {
      cwd: await makeTempDir(),
      quiet: true,
    });
    expect(result).toMatchObject({ ok: false, exitCode: 3 });
    expect(describeFailure(result)).toBe('exit code 3: boom');
  });

  it('reports a command that cannot be started', async () => {
    const result = await runCommand('definitely-not-a-real-command-xyz', [], { cwd: await makeTempDir(), quiet: true });
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it('passes arguments literally, without shell interpretation', async () => {
    const result = await runCommand(node, ['-e', 'console.log(process.argv[1])', 'a && echo injected'], {
      cwd: await makeTempDir(),
      quiet: true,
    });
    expect(result.output.trim()).toBe('a && echo injected');
  });

  it('removes its temporary SIGINT handler', async () => {
    const before = process.listenerCount('SIGINT');
    await runCommand(node, ['-e', ''], { cwd: await makeTempDir(), quiet: true });
    expect(process.listenerCount('SIGINT')).toBe(before);
  });
});

describe('probeCommand', () => {
  it('returns stdout for a working command and undefined for a missing one', () => {
    expect(probeCommand(node, ['--version'])).toBe(process.version);
    expect(probeCommand('definitely-not-a-real-command-xyz', ['--version'])).toBeUndefined();
  });
});

describe('wasInterrupted', () => {
  it('recognises SIGINT and Ctrl+C exit codes', () => {
    const base = { ok: false, output: '' };
    expect(wasInterrupted({ ...base, exitCode: null, signal: 'SIGINT' })).toBe(true);
    expect(wasInterrupted({ ...base, exitCode: 130, signal: null })).toBe(true);
    expect(wasInterrupted({ ...base, exitCode: 3221225786, signal: null })).toBe(true);
    expect(wasInterrupted({ ...base, exitCode: 1, signal: null })).toBe(false);
  });
});
