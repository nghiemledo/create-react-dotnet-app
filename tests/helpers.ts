import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach } from 'vitest';

/** The parts of the template's appsettings.json the tests assert on. */
export interface AppSettings {
  Jwt: { Key: string };
  JwtTokenSettings: { Key: string };
  ConnectionStrings: { DefaultConnection: string };
  EmailSettings: { DisplayName: string };
  Other?: string;
}

const tempDirs: string[] = [];

export async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'crda-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

export async function writeFiles(root: string, files: Record<string, string | Buffer>): Promise<void> {
  for (const [relativePath, content] of Object.entries(files)) {
    const destination = path.join(root, ...relativePath.split('/'));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, content);
  }
}

export async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
}
