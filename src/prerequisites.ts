import { existsSync } from 'node:fs';
import path from 'node:path';
import { SUPPORTED_PACKAGE_MANAGERS, type PackageManager } from './package-managers.js';
import type { ToolProbe } from './process.js';

export interface Tools {
  /** Supported package managers that are actually installed. */
  packageManagers: PackageManager[];
  git: boolean;
  dotnetSdk: boolean;
  nodeVersion: string;
  nodeSupported: boolean;
}

export function detectTools(probe: ToolProbe, nodeVersion: string): Tools {
  const sdkList = probe('dotnet', ['--list-sdks']);
  return {
    packageManagers: SUPPORTED_PACKAGE_MANAGERS.filter((pm) => probe(pm, ['--version']) !== undefined),
    git: probe('git', ['--version']) !== undefined,
    dotnetSdk: sdkList !== undefined && hasCompatibleDotnetSdk(parseDotnetSdkList(sdkList)),
    nodeVersion,
    nodeSupported: nodeSatisfiesTemplate(nodeVersion),
  };
}

/** pnpm first: the template ships a pnpm lockfile, so it reproduces the tested dependency versions. */
export function preferredPackageManager(installed: readonly PackageManager[]): PackageManager | undefined {
  return installed.includes('pnpm') ? 'pnpm' : installed[0];
}

/** Checks the nearest existing ancestor, since the destination usually does not exist yet. */
export function isInsideGitRepository(probe: ToolProbe, targetDir: string): boolean {
  let dir = targetDir;
  while (!existsSync(dir)) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      return false;
    }
    dir = parent;
  }
  return probe('git', ['rev-parse', '--is-inside-work-tree'], dir) === 'true';
}

/** The template's Vite 8 and ESLint 10 require Node ^20.19 || ^22.13 || >=24. */
export function nodeSatisfiesTemplate(version: string): boolean {
  const [major = 0, minor = 0] = version.replace(/^v/, '').split('.').map(Number);
  return (major === 20 && minor >= 19) || (major === 22 && minor >= 13) || major >= 24;
}

/** All template projects target net9.0, which any SDK with major version 9 or later can build. */
export function hasCompatibleDotnetSdk(sdkVersions: string[], minimumMajor = 9): boolean {
  return sdkVersions.some((version) => Number.parseInt(version, 10) >= minimumMajor);
}

export function parseDotnetSdkList(output: string): string[] {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().split(' ')[0] ?? '')
    .filter(Boolean);
}
