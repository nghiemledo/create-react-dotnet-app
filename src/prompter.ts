import { confirm, input, select } from '@inquirer/prompts';
import { CancelledError } from './errors.js';
import { paint } from './ui.js';

export interface Choice<T> {
  name: string;
  value: T;
  /** Short qualifier shown after the name, e.g. "Recommended for macOS / Linux". */
  badge?: string;
  /** Shown below the list while the choice is highlighted. */
  description?: string;
}

/** The questions the CLI can ask. Tests substitute a scripted implementation. */
export interface Prompter {
  text(question: { message: string; default?: string; validate?: (value: string) => string | true }): Promise<string>;
  select<T>(question: { message: string; choices: Choice<T>[]; default?: T }): Promise<T>;
  confirm(question: { message: string; default: boolean }): Promise<boolean>;
}

const theme = {
  prefix: { idle: paint.accent('◆'), done: paint.success('✔') },
  style: {
    answer: paint.success,
    message: (text: string, status: string) => (status === 'done' ? paint.dim(text) : paint.bold(text)),
    defaultAnswer: (text: string) => paint.dim(`(${text})`),
    help: paint.dim,
    highlight: paint.highlight,
  },
};

const selectTheme = {
  ...theme,
  icon: { cursor: paint.accent('❯') },
  style: { ...theme.style, description: paint.dim },
};

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
  text: (question) => cancellable(input({ ...question, theme })),
  select: (question) =>
    cancellable(
      select({
        ...question,
        theme: selectTheme,
        choices: question.choices.map(({ name, value, badge, description }) => ({
          name: badge ? `${name}  ${paint.warn(`(${badge})`)}` : name,
          short: name,
          value,
          description,
        })),
      }),
    ),
  confirm: (question) => cancellable(confirm({ ...question, theme })),
};
