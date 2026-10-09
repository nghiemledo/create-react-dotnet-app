import { confirm, input, select } from '@inquirer/prompts';
import { CancelledError } from './errors.js';

export interface Choice<T> {
  name: string;
  value: T;
}

/** The questions the CLI can ask. Tests substitute a scripted implementation. */
export interface Prompter {
  text(question: { message: string; default?: string; validate?: (value: string) => string | true }): Promise<string>;
  select<T>(question: { message: string; choices: Choice<T>[]; default?: T }): Promise<T>;
  confirm(question: { message: string; default: boolean }): Promise<boolean>;
}

async function cancellable<T>(prompt: Promise<T>): Promise<T> {
  try {
    return await prompt;
  } catch (error) {
    // Thrown by @inquirer/prompts on Ctrl+C / Ctrl+D.
    if (error instanceof Error && error.name === 'ExitPromptError') {
      throw new CancelledError();
    }
    throw error;
  }
}

export const inquirerPrompter: Prompter = {
  text: (question) => cancellable(input(question)),
  select: (question) => cancellable(select(question)),
  confirm: (question) => cancellable(confirm(question)),
};
