# create-react-dotnet-app

Scaffold a full-stack project with a **React 19 + Vite + TypeScript** client and an **ASP.NET Core (.NET 9) Clean Architecture** API.

The template is bundled inside the package, so generating a project needs no access to the (private) source repository.

> **Status:** not published yet. See [Before publishing](#before-publishing).

## Usage

```bash
npx create-react-dotnet-app my-app
```

Run interactively (with or without a name), the CLI asks, in order:

1. **Project name**, if not given. Re-asked until valid.
2. **Frontend package manager**. Only supported managers that are installed are offered: pnpm, which uses the template lockfile, and npm. The question is skipped if only one is installed.
3. **Install frontend dependencies now?**
4. **Initialize a new Git repository?** Not asked if Git is missing or the destination is already inside a repository.

Every question is answered before any file is written, so Ctrl+C at a prompt leaves nothing behind.

In CI or scripts, pass options and add `--yes`. Anything not specified defaults to: pnpm if installed, otherwise npm; install dependencies; initialize Git.

```bash
npx create-react-dotnet-app my-app --yes --pm npm --no-git
```

| Option | Description |
| --- | --- |
| `[project-name]` | Directory to create; a path is also accepted. Its last segment is the project name: lowercase letters, digits and single hyphens (e.g. `my-app` becomes the .NET name `MyApp`). |
| `--pm <pnpm\|npm>` | Frontend package manager. With npm, the pnpm lockfile is not copied. |
| `--install` / `--no-install` | Install frontend dependencies, or skip it. `--install` fails early if the package manager is missing. |
| `--git` / `--no-git` | Initialize a repository with an initial commit, or skip it. `--git` fails early if Git is missing. |
| `--display-name <name>` | Human-readable application name (default: the project name). |
| `-y, --yes` | Never prompt. |

### Safety

- **Existing directories:** an existing non-empty directory is never written to silently. Non-interactively, the CLI stops. Interactively, you can choose another name, cancel, or add the project to the directory. Adding is offered only when none of the project's files already exist there, and files are created with exclusive-create, so nothing is overwritten.
- **Rollback:** if generation fails or is cancelled (Ctrl+C), only the files and directories this run created are removed.
- **Template source:** the template is bundled; nothing is downloaded, and no `.git` metadata is copied.
- **Subprocesses:** only fixed commands run: `pnpm install --frozen-lockfile` or `npm install` in `client/`, then `git init`, `git add -A` and `git commit`. They run without a shell, and user input reaches them only as the working directory. No database commands, migrations or `dotnet` commands are run.
- **Failed steps:** if installation or Git fails, or is interrupted, the project is kept. The summary shows what completed and the exact command to finish each step, and the CLI exits with code 1.

### What gets generated

- `server/<Name>.sln` with `<Name>.Api`, `.Application`, `.Domain`, `.Infrastructure` and `.Common` projects. Namespaces, the CORS policy, the Swagger title and the database name (`<Name>Db`) are renamed.
- `client/`, with the package name `<project-name>-client`, localStorage keys prefixed with `<project-name>-`, the display name in the page title and `.env`, and `client/.env` created from `.env.example`.
- A random JWT signing key per project in `server/<Name>.Api/appsettings.json`. The same key is used by the `Jwt` and `JwtTokenSettings` sections, as the API requires.
- A random password for the seeded development accounts, written into `DataSeeder.cs` and **printed once** by the CLI.

### Requirements for generated projects

- Node.js `^20.19`, `^22.13` or `>=24` (Vite 8 / ESLint 10). The CLI itself needs Node `^22.13` or `>=23.5` (the floor set by `@inquirer/prompts` and `commander`).
- .NET SDK 9 or later.
- SQL Server. The default connection string uses LocalDB (Windows only). On macOS/Linux set `ConnectionStrings__DefaultConnection`.

## Development

```bash
npm install
npm run check        # typecheck + tests + build
node dist/index.js my-app --no-install --no-git
```

| Script | Purpose |
| --- | --- |
| `npm run build` | Compile `src/` to `dist/` (the `bin` entry is `dist/index.js`). Also runs on `npm pack`/`npm publish` via `prepack`. |
| `npm run typecheck` | Type-check `src/`, `scripts/` and `tests/`. |
| `npm test` | Vitest: naming, sanitization rules, generation and rollback, the full CLI flow (scripted prompts, fake subprocesses), real subprocess handling, and credential scans. |
| `npm run sync-template` | Refresh `templates/default` from the source repository (see below). |

Inspect exactly what would be published with `npm pack --dry-run`.

### Layout

```text
src/
  index.ts          entry point: maps errors and cancellation to exit codes
  cli.ts            options and orchestration (questions -> generate -> install -> git -> summary)
  questions.ts      every interactive decision; nothing is written until all are answered
  prompter.ts       @inquirer/prompts adapter (tests use a scripted prompter)
  generate.ts       plan, conflict check, copy/rename/inject secrets, rollback
  replacements.ts   audited identifier transformations
  steps.ts          frontend install and git init, with recovery instructions
  process.ts        shell-free subprocess runner and tool probes
  prerequisites.ts  node / dotnet / package manager / git detection
  summary.ts        result summary and next steps
scripts/            template sync + sanitization rules (not published)
templates/default/  sanitized template snapshot (published; generated, do not hand-edit)
templates/default.source.json  commit the snapshot was taken from
tests/
```

### Dependencies

| Package | Why |
| --- | --- |
| `commander` | Argument parsing, `--help`/`--version`, option validation. |
| `@inquirer/prompts` | Interactive prompts. |
| `cross-spawn` | Runs `pnpm`/`npm`/`git` (and the `dotnet --list-sdks` probe) reliably on Windows (`.cmd` shims) without `shell: true`. |
| `typescript`, `@types/*` (dev) | Compilation and types. |
| `vitest` (dev) | Test runner with native TypeScript support. |
| `tsx` (dev) | Runs the TypeScript sync script without a build step. |

## Updating the template

`templates/default` is a generated snapshot of the private `react-dotnet-boilerplate` repository. Fix application code **upstream**, then re-sync. Never edit the snapshot by hand.

```bash
# Preview: lists excluded files and applied sanitization rules, writes nothing
npm run sync-template -- --source ../react-dotnet-boilerplate --ref v1.2.0 --dry-run

# Apply
npm run sync-template -- --source ../react-dotnet-boilerplate --ref v1.2.0
git diff --stat templates/
npm run check
```

On PowerShell, quote the separator: `npm run sync-template '--' --source ...`.

How the sync works (`scripts/sync-template.ts`, rules in `scripts/template-rules.ts`):

1. Reads only files **tracked at the given ref** (default `HEAD`). Uncommitted changes and ignored files (`.env`, `bin/`, `obj/`, `node_modules/`, `.vs/`, `*.csproj.user`) can never enter the template. A deny-list excludes them again in case they are ever committed.
2. Replaces the committed JWT signing keys and the seeded user password with the tokens `__JWT_SIGNING_KEY__` and `__SEED_USER_PASSWORD__`. Removes the prefilled login credentials and the unrelated `ENGKING` `.gitignore` entry. Redacts those values from Markdown docs.
3. Fails if any secret value from the source still appears anywhere in the output. Error messages show file paths, never the values.
4. Fails with a drift error if a file or pattern the rules depend on no longer exists upstream, so rule changes are explicit.
5. Renames `.gitignore` to `_gitignore` (npm drops `.gitignore` from packages). The CLI renames it back.
6. Records the source commit in `templates/default.source.json`.

Prefer syncing from a tag so each CLI release maps to a known template version.

## License

[MIT](LICENSE). The bundled template is covered by the same license.

## Before publishing

- Create the GitHub repository named in `package.json` and push.
