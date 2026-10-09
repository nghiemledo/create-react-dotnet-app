import { styleText } from 'node:util';

export const log = {
  info: (message: string) => console.log(message),
  step: (message: string) => console.log(`${styleText('cyan', '›')} ${message}`),
  success: (message: string) => console.log(`${styleText('green', '✔')} ${message}`),
  warn: (message: string) => console.warn(`${styleText('yellow', '!')} ${message}`),
  error: (message: string) => console.error(`${styleText('red', '✖')} ${message}`),
  bold: (text: string) => styleText('bold', text),
  dim: (text: string) => styleText('dim', text),
};
