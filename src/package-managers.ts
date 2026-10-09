/** Package managers the template is verified with. Yarn and Bun are not offered because the template is not tested with them. */
export const SUPPORTED_PACKAGE_MANAGERS = ['pnpm', 'npm'] as const;

export type PackageManager = (typeof SUPPORTED_PACKAGE_MANAGERS)[number];

interface PackageManagerInfo {
  label: string;
  installArgs: readonly string[];
  devCommand: string;
}

export const PACKAGE_MANAGERS: Record<PackageManager, PackageManagerInfo> = {
  pnpm: {
    label: 'pnpm (installs the exact versions from the template lockfile)',
    installArgs: ['install', '--frozen-lockfile'],
    devCommand: 'pnpm dev',
  },
  npm: {
    label: 'npm (resolves versions from package.json; no npm lockfile is shipped)',
    installArgs: ['install'],
    devCommand: 'npm run dev',
  },
};
