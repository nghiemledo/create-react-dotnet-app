#!/usr/bin/env node
import { CommanderError } from 'commander';
import { main } from './cli.js';
import { CancelledError, CliError } from './errors.js';
import { log } from './log.js';

main()
  .then((summary) => {
    // The project exists, but tell scripts/CI that a requested step did not complete.
    if (summary.steps.some((step) => step.status === 'failed' || step.status === 'interrupted')) {
      process.exitCode = 1;
    }
  })
  .catch((error: unknown) => {
    if (error instanceof CommanderError) {
      // Commander has already printed help, the version, or the parse error.
      process.exitCode = error.exitCode;
      return;
    }
    if (error instanceof CancelledError) {
      log.warn(error.message);
      process.exitCode = error.exitCode;
      return;
    }
    if (error instanceof CliError) {
      log.error(error.message);
      process.exitCode = error.exitCode;
      return;
    }
    log.error('Unexpected error:');
    console.error(error);
    process.exitCode = 1;
  });
