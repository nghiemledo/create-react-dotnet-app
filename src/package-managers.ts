/** Package managers the template is verified with. Yarn and Bun are not offered because the template is not tested with them. */
export const SUPPORTED_PACKAGE_MANAGERS = ['pnpm', 'npm'] as const;

export type PackageManager = (typeof SUPPORTED_PACKAGE_MANAGERS)[number];

interface PackageManagerInfo {
  prompt: { badge: string; description: string };
  installArgs: readonly string[];
  devCommand: string;
}

export const PACKAGE_MANAGERS: Record<PackageManager, PackageManagerInfo> = {
  pnpm: {
    prompt: {
      badge: 'exact versions from the template lockfile',
      description: 'Runs pnpm install --frozen-lockfile against the pnpm-lock.yaml shipped with the template.',
    },
    installArgs: ['install', '--frozen-lockfile'],
    devCommand: 'pnpm dev',
  },
  npm: {
    prompt: {
      badge: 'resolves versions from package.json',
      description: 'No npm lockfile is shipped; npm resolves the ranges in package.json and writes package-lock.json.',
    },
    installArgs: ['install'],
    devCommand: 'npm run dev',
  },
};
