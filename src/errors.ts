/** An expected, user-facing failure. The CLI prints only the message (no stack trace). */
export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CliError';
  }
}

/** The user aborted (Ctrl+C in a prompt, or choosing "Cancel"). */
export class CancelledError extends CliError {
  constructor(message = 'Cancelled. No files were created.') {
    super(message, 130);
    this.name = 'CancelledError';
  }
}
