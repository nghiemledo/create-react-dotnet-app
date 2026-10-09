import spawn from 'cross-spawn';

export interface CommandResult {
  ok: boolean;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  /** Set when the command could not be started (e.g. ENOENT). */
  error?: Error;
  /** Tail of stdout/stderr; only captured for quiet commands. */
  output: string;
}

export interface RunOptions {
  cwd: string;
  /** Capture output instead of streaming it to the terminal. */
  quiet?: boolean;
}

/**
 * Commands are always an executable plus an argument array; nothing is passed through a shell,
 * and user input only ever reaches a child process as its working directory.
 */
export type CommandRunner = (command: string, args: readonly string[], options: RunOptions) => Promise<CommandResult>;

/** Returns trimmed stdout of a successful command, or `undefined` if it is missing or fails. */
export type ToolProbe = (command: string, args: readonly string[], cwd?: string) => string | undefined;

const MAX_CAPTURED_OUTPUT = 4000;
// Windows reports Ctrl+C as STATUS_CONTROL_C_EXIT.
const WINDOWS_CTRL_C_EXIT = 3221225786;

export const runCommand: CommandRunner = (command, args, { cwd, quiet = false }) =>
  new Promise((resolve) => {
    // Ctrl+C reaches the child directly from the terminal. Ignoring it here keeps this process
    // alive long enough to report what completed and how to recover.
    const ignoreInterrupt = () => {};
    process.on('SIGINT', ignoreInterrupt);

    let output = '';
    let settled = false;
    const finish = (result: CommandResult) => {
      if (settled) return;
      settled = true;
      process.off('SIGINT', ignoreInterrupt);
      resolve(result);
    };

    const child = spawn(command, [...args], { cwd, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    const capture = (chunk: Buffer) => {
      output = (output + chunk.toString('utf8')).slice(-MAX_CAPTURED_OUTPUT);
    };
    child.stdout?.on('data', capture);
    child.stderr?.on('data', capture);
    child.on('error', (error) => finish({ ok: false, exitCode: null, signal: null, error, output }));
    child.on('close', (exitCode, signal) => finish({ ok: exitCode === 0, exitCode, signal, output }));
  });

export const probeCommand: ToolProbe = (command, args, cwd) => {
  const result = spawn.sync(command, [...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  if (result.error || result.status !== 0) {
    return undefined;
  }
  return String(result.stdout).trim();
};

export function wasInterrupted(result: CommandResult): boolean {
  return result.signal === 'SIGINT' || result.exitCode === 130 || result.exitCode === WINDOWS_CTRL_C_EXIT;
}

export function describeFailure(result: CommandResult): string {
  if (result.error) {
    return result.error.message;
  }
  const reason = result.signal ? `terminated by ${result.signal}` : `exit code ${result.exitCode}`;
  const lastLine = result.output.trim().split(/\r?\n/).pop();
  return lastLine ? `${reason}: ${lastLine}` : reason;
}
