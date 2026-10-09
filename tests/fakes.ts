import { CancelledError } from '../src/errors.js';
import type { CommandResult, CommandRunner, RunOptions, ToolProbe } from '../src/process.js';
import type { Prompter } from '../src/prompter.js';

export interface FakeTools {
  pnpm?: boolean;
  npm?: boolean;
  git?: boolean;
  dotnet?: boolean;
  insideGitRepo?: boolean;
}

export function fakeProbe(overrides: FakeTools = {}): ToolProbe {
  const tools = { pnpm: true, npm: true, git: true, dotnet: true, insideGitRepo: false, ...overrides };
  const answers: Record<string, string | undefined> = {
    'pnpm --version': tools.pnpm ? '10.15.0' : undefined,
    'npm --version': tools.npm ? '10.9.0' : undefined,
    'git --version': tools.git ? 'git version 2.47.0' : undefined,
    'dotnet --list-sdks': tools.dotnet ? '9.0.100 [C:\\Program Files\\dotnet\\sdk]' : undefined,
    'git rev-parse --is-inside-work-tree': tools.insideGitRepo ? 'true' : undefined,
  };
  return (command, args) => answers[`${command} ${args.join(' ')}`];
}

export interface RecordedCall {
  command: string;
  args: string[];
  options: RunOptions;
}

export type FakeRunner = CommandRunner & { calls: RecordedCall[] };

/** Runs synchronous fake logic behind an async interface; a throw becomes a rejection. */
function settle<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => resolve(fn()));
}

/** Records every command; `respond` can make a call fail. Defaults to success. */
export function fakeRunner(respond: (call: RecordedCall) => Partial<CommandResult> = () => ({})): FakeRunner {
  const calls: RecordedCall[] = [];
  const runner: CommandRunner = (command, args, options) =>
    settle(() => {
      const call = { command, args: [...args], options };
      calls.push(call);
      const response = respond(call);
      const exitCode = response.exitCode === undefined ? (response.error ? null : 0) : response.exitCode;
      const signal = response.signal ?? null;
      return {
        ok: exitCode === 0 && !signal && !response.error,
        exitCode,
        signal,
        error: response.error,
        output: response.output ?? '',
      };
    });
  return Object.assign(runner, { calls });
}

export const CANCEL = Symbol('cancel');
export type ScriptedAnswer = string | boolean | typeof CANCEL;

export interface AskedQuestion {
  kind: 'text' | 'select' | 'confirm';
  message: string;
  choices?: unknown[];
  /** Text answers the validator rejected before one was accepted. */
  rejected: string[];
}

/** Answers prompts from a script, applying validators the way a real prompt re-asks on invalid input. */
export function scriptedPrompter(script: ScriptedAnswer[]): Prompter & { asked: AskedQuestion[]; remaining: () => number } {
  const queue = [...script];
  const asked: AskedQuestion[] = [];

  const next = (message: string): string | boolean => {
    if (queue.length === 0) {
      throw new Error(`Unexpected prompt: ${message}`);
    }
    const answer = queue.shift()!;
    if (answer === CANCEL) {
      throw new CancelledError();
    }
    return answer;
  };

  return {
    asked,
    remaining: () => queue.length,
    text: (question) =>
      settle(() => {
        const record: AskedQuestion = { kind: 'text', message: question.message, rejected: [] };
        asked.push(record);
        for (;;) {
          const answer = String(next(question.message));
          const value = answer === '' ? (question.default ?? '') : answer;
          if ((question.validate?.(value) ?? true) === true) {
            return value;
          }
          record.rejected.push(value);
        }
      }),
    select: <T>(question: { message: string; choices: { name: string; value: T }[]; default?: T }) =>
      settle(() => {
        const choices = question.choices.map((choice) => choice.value);
        asked.push({ kind: 'select', message: question.message, choices, rejected: [] });
        const answer = next(question.message);
        if (!choices.includes(answer as T)) {
          throw new Error(`"${String(answer)}" is not offered for "${question.message}" (offered: ${choices.join(', ')})`);
        }
        return answer as T;
      }),
    confirm: (question) =>
      settle(() => {
        asked.push({ kind: 'confirm', message: question.message, rejected: [] });
        const answer = next(question.message);
        if (typeof answer !== 'boolean') {
          throw new Error(`Expected a boolean answer for "${question.message}"`);
        }
        return answer;
      }),
  };
}
