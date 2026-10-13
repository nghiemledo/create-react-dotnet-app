# create-react-dotnet-app

[![npm version](https://img.shields.io/npm/v/create-react-dotnet-app.svg?color=CB3837&logo=npm)](https://www.npmjs.com/package/create-react-dotnet-app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-nghiemledo%2Fcreate--react--dotnet--app-181717?logo=github&logoColor=white)](https://github.com/nghiemledo/create-react-dotnet-app)
![Node.js](https://img.shields.io/badge/Node.js-%5E22.13%20%7C%7C%20%3E%3D23.5-339933?logo=nodedotjs&logoColor=white)

**Frontend:**
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Radix-000000?logo=shadcnui&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-5-443E38)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-7-EC5990?logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-4-3E67B1?logo=zod&logoColor=white)

**Backend:**
![.NET](https://img.shields.io/badge/.NET-9-512BD4?logo=dotnet&logoColor=white)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-Web_API-512BD4?logo=dotnet&logoColor=white)
![EF Core](https://img.shields.io/badge/EF_Core-9-512BD4?logo=dotnet&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server-LocalDB-CC2927?logo=microsoftsqlserver&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Npgsql-4169E1?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?logo=swagger&logoColor=black)

**Tooling:**
![pnpm](https://img.shields.io/badge/pnpm-supported-F69220?logo=pnpm&logoColor=white)
![npm](https://img.shields.io/badge/npm-supported-CB3837?logo=npm&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-flat_config-4B32C3?logo=eslint&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)

An interactive CLI to instantly scaffold production-ready full-stack applications with **React 19 (Vite or Next.js, TypeScript, Tailwind CSS v4, Shadcn/ui)** and **ASP.NET Core (.NET 9) Clean Architecture Web API**. Both frontends use the same backend, databases and tooling.

The starter template is self-contained directly inside the npm package — zero network requests or GitHub dependencies at generation time.

---

## ⚡ Quick Start

You can generate a new application interactively with a single command:

```bash
npx create-react-dotnet-app my-app
```

Or run without arguments to launch the guided prompt (project name, frontend, database, package manager, install, Git):

```bash
npx create-react-dotnet-app
```

### Non-Interactive / CI Usage

Pass options with `--yes` (`-y`) to skip all interactive prompts:

```bash
npx create-react-dotnet-app my-app --yes --db postgresql --pm pnpm --install --git
npx create-react-dotnet-app my-app --yes --frontend nextjs --db postgresql
```

#### Available CLI Flags

| Flag | Description | Default |
| --- | --- | --- |
| `[project-name]` | Target folder & app identifier (e.g. `my-app` → `MyApp`) | Interactive prompt |
| `--frontend <framework>` | Frontend: `vite` (React + Vite) or `nextjs` (Next.js App Router); any other value is rejected before anything is written | Interactive prompt; `vite` with `--yes` or without a terminal |
| `--db <database>` | Database provider: `sqlserver` or `postgresql` | Interactive prompt; `sqlserver` with `--yes` |
| `--pm <manager>` | Frontend package manager: `pnpm` or `npm` | `pnpm` if installed, otherwise `npm` |
| `--install` / `--no-install` | Install frontend dependencies immediately | `--install` |
| `--git` / `--no-git` | Initialize a Git repository with an initial commit | `--git` |
| `--display-name <name>` | Custom human-readable brand name for the UI | The project name |
| `-y, --yes` | Skip all prompts and use defaults | `false` |

---

## 🚀 Getting Started with Your New App

Once scaffolded, prepare the database, then launch both client and server:

### 1. Prepare the Database

| | SQL Server (default) | PostgreSQL |
| --- | --- | --- |
| EF Core provider | `Microsoft.EntityFrameworkCore.SqlServer` 9.0.18 | `Npgsql.EntityFrameworkCore.PostgreSQL` 9.0.4 |
| Default connection | LocalDB (`(localdb)\mssqllocaldb`), Windows only | `localhost:5432`, the container in `compose.yaml` |
| Docker Compose service | Optional `sqlserver` (SQL Server 2022 Developer, `linux/amd64`) | `postgres` (PostgreSQL 17) |
| Local setup | Nothing on Windows with LocalDB | `docker compose up -d --wait` in the project root |

```bash
cd my-app
docker compose up -d --wait   # start the database and wait until it is healthy
docker compose stop           # stop it; data is kept
docker compose down           # remove the container; the data volume is kept
```

* **Settings:** `compose.yaml` reads its settings from a root `.env` that the CLI generates with a random development password. `.env` is git-ignored; the committed `.env.example` documents every value with placeholders. Ports are published on `127.0.0.1` only and are configurable (`POSTGRES_PORT` / `MSSQL_PORT`).
* **PostgreSQL:** `appsettings.json` already points at the container (`Host=localhost`, same port, database, user and password as `.env`).
* **SQL Server in Docker** is opt-in: read the license terms and set `MSSQL_ACCEPT_EULA=Y` in `.env` (the CLI never accepts it for you), start the container, then point the API at it with `ConnectionStrings__DefaultConnection`. `.env` contains the matching value, commented out.
* **Overrides:** the `ConnectionStrings__DefaultConnection` environment variable overrides `ConnectionStrings:DefaultConnection` in `server/MyApp.Api/appsettings.json` for any other server.
* **Host names:** the API runs on your machine and uses `localhost` with the published port. A service you add to `compose.yaml` must use the service name and container port instead (`Host=postgres;Port=5432` or `Server=sqlserver,1433`), never `localhost`.
* **Development credentials only:** the generated database password, JWT signing key and seeded-account password are for local development; `appsettings.json` and `DataSeeder.cs` are committed. The generated `README.md` lists the environment variables (`ConnectionStrings__DefaultConnection`, `Jwt__Key`, `JwtTokenSettings__Key`, ...) to set for production instead.
* **Data safety:** data lives in a named volume that survives `stop`, `down` and restarts; only `docker compose down -v` deletes it. The CLI never starts containers or touches volumes.
* **Migrations:** each project contains only the selected provider's package and EF Core migrations generated for that provider. In the Development environment the API applies pending migrations and seeds sample data on startup; in other environments apply them explicitly (`dotnet ef database update`). The CLI itself never runs migrations or connects to a database.
* **Troubleshooting** (port already in use, password changes after the first start, the EULA variable, LocalDB) is covered in the generated `README.md`.

### 2. Start the Backend (.NET 9 Web API)

```bash
cd my-app/server
dotnet dev-certs https --trust   # first time only
dotnet run --project MyApp.Api --launch-profile https
```

* **Swagger UI:** `https://localhost:7001/swagger` (or `http://localhost:5058/swagger`)
* **Admin Login:** The CLI generates a unique random password for your local seeded development account and prints it in the terminal summary.

### 3. Start the Frontend

The frontend is always in `client/`, with the same commands for both frameworks:

```bash
cd my-app/client
# If not installed during setup:
pnpm install # or npm install

# Start the dev server:
pnpm dev     # or npm run dev
```

* **React + Vite:** `http://localhost:5173`. Settings in `client/.env` (`VITE_API_BASE_URL`, ...).
* **Next.js:** `http://localhost:3000`. Settings in `client/.env` (`NEXT_PUBLIC_API_BASE_URL`, ...). `NEXT_PUBLIC_*` values are inlined into the browser bundle, so they never hold secrets. Pages that need a signed-in user render in the browser and call the .NET API directly; there are no Next.js API routes or server actions, and the API's development CORS policy already allows port 3000.
* **API URL and Docker:** the client's API base URL is called **from the browser**, so it must be a host-reachable address (`https://localhost:7001` by default), never a Compose service name.

### 4. Regenerate API Types After Changing the API

With the backend running in Development (step 2), from `client/`:

```bash
pnpm codegen            # or: npm run codegen
pnpm codegen --check    # CI: fail if api.generated.ts is out of date (npm: npm run codegen -- --check)
```

The script reads `http://localhost:5058/swagger/v1/swagger.json` (HTTP, because Node.js does not trust the ASP.NET Core development certificate), or a saved file with `--input swagger.json`. It fails with an explanation when the API is unreachable or the document is invalid or empty, and never overwrites a file it did not generate. See "Sinh TypeScript Type từ OpenAPI" in `client/README.md` for using the types with the existing `apiClient` services.

### 5. Or Use VS Code

Open the project root in VS Code and install the recommended extensions (C#, ESLint, Tailwind CSS, Docker).

* **Run and Debug:** `Backend: API` (builds and debugs the API with the `https` profile, opens Swagger), `Backend: API (settings from .env)` (same, with `.env` variables such as a connection string override), `Frontend: Vite (Chrome)` or `Frontend: Next.js (Chrome)`, and the compound `Full stack: API + Vite` or `Full stack: API + Next.js`, matching the selected frontend.
* **Tasks:** `server: build`, `server: watch`, `client: dev`, `client: lint`, `db: up`, `db: stop`, `db: logs`. No task deletes containers or volumes.

---

## 📦 What's Included in the Box

### Frontend

* **Framework:** React 19 + TypeScript, with Vite 8 (single-page app, React Router) or Next.js 16 (App Router)
* **Styling:** Tailwind CSS v4 + Shadcn UI (accessible primitives with Radix UI)
* **State & Server Cache:** Zustand 5 & TanStack Query v5
* **Icons & Forms:** Lucide React, React Hook Form, Zod validation
* **Zero-Config DX:** Path alias `@/*` preconfigured, pre-wired API client with auto JWT attachment
* **API Types:** `codegen` script generates `client/src/types/api.generated.ts` from the API's Swagger document with [`openapi-typescript`](https://openapi-ts.dev/) (pinned 7.13.0); the generated file ships with the project

### Backend

* **Framework:** ASP.NET Core Web API (.NET 9)
* **Architecture:** Clean Architecture (`Api`, `Application`, `Domain`, `Infrastructure`, `Common`)
* **Security:** Fully configured JWT Authentication & Refresh Token flow with auto-generated signing keys
* **Data Access:** Entity Framework Core 9 with SQL Server or PostgreSQL, provider-specific migrations (`InitialCreate`), and `dotnet-ef` pinned in a local tool manifest (`dotnet tool restore`).
* **Documentation:** Interactive Swagger / OpenAPI documentation with JWT Bearer support

---

## 🛡️ Built-in Safety & Reliability

* **Non-Destructive:** Existing non-empty directories are never overwritten silently.
* **Rollback:** If writing the project files fails or is aborted (`Ctrl + C`), only the files created by that run are removed. If a later step (dependency install or Git) fails, the files are kept and the CLI prints the command to finish that step.
* **Air-Gapped Generation:** The template snapshot is bundled locally within the package.
* **Secure Process Execution:** Spawns native child processes without shell wrappers, eliminating command-injection risks.
* **Isolated Secrets:** Unique, cryptographically secure JWT secrets and local admin credentials are generated on-the-fly per project.

---

## 💻 Prerequisites

| Tool | Minimum Version | Notes |
| --- | --- | --- |
| **Node.js** | `^22.13.0` or `>=23.5.0` | Required by the CLI; the generated client (Vite 8 or Next.js 16, with ESLint 10) needs `^20.19`, `^22.13` or `>=24` |
| **.NET SDK** | `9.0+` | Required to build and run the backend Web API |
| **Package Manager** | `pnpm 9+` or `npm 10+` | `pnpm` is recommended |
| **Database** | SQL Server (LocalDB on Windows) or PostgreSQL | Docker (Compose v2) for the PostgreSQL container, or for SQL Server outside Windows/LocalDB |

---

## 🛠️ CLI Development & Contributing

### Local Setup

```bash
git clone https://github.com/nghiemledo/create-react-dotnet-app.git
cd create-react-dotnet-app
npm install

# Run typechecks, tests, and build
npm run check
```


### Local Testing

Test the CLI locally without publishing:

```bash
# Compile, then run the built CLI (creates ../test-app, outside this repository)
npm run build
node dist/index.js ../test-app --no-install --no-git

# Test packing dry-run (verifies bundle size and excluded artifacts)
npm pack --dry-run
```


### Project Structure

```text
src/
├── index.ts          # Entry point & error/cancellation handler
├── cli.ts            # Commander setup and step orchestrator
├── questions.ts      # Interactive prompt workflow
├── databases.ts      # Database providers: template edits, overlays & README sections
├── frontends.ts      # Frontends: overlays & README sections
├── doc-blocks.ts     # Renders the marked README sections
├── generate.ts       # Template copier, identifier renamer & secret injector
├── replacements.ts   # C# namespace & React identifier transformation logic
└── steps.ts          # Safe subprocess runners (pnpm install, git init)
templates/default/    # Sanitized template snapshot (SQL Server, React + Vite) distributed via npm
templates/frontends/  # Frontend overlays: nextjs/client (replaces client/) and its .vscode/ (stored as _vscode)
templates/databases/  # Per-provider overlays: compose.yaml, .env.example, generated .env (stored as _env), PostgreSQL migrations
templates/common/     # Added to every project: .vscode/ (stored as _vscode) and the root .gitignore
scripts/              # Template sync, migration generation & package audit scripts
```

A project is the template plus, in order, `templates/common`, the frontend overlay (Next.js only) and the database overlay; a later overlay replaces files with the same path. The backend therefore comes from one place for every frontend.


### Updating the Template Snapshot

The starter template is mirrored from `react-dotnet-boilerplate`. To pull upstream updates:

```bash
npm run sync-template -- --source ../react-dotnet-boilerplate --ref <git-tag-or-branch>
npm run check
```

Only committed files at the given ref are copied, and secrets are replaced with per-project tokens. The source's `client-next/` becomes `templates/frontends/nextjs/client/`; everything else (except excluded files) becomes `templates/default/`. `templates/default.source.json` records the source commit. In PowerShell, quote the separator: `npm run sync-template '--' --source ...`.

To try unreleased boilerplate changes, `--worktree` (instead of `--ref`) also reads uncommitted and untracked files that are not git-ignored. It is recorded as `"worktree": true` in `templates/default.source.json`, and the package audit (`scripts/audit-package.ts`) fails until the template is synced from a commit again.

### Maintaining Database Migrations

The template's own migrations are for SQL Server. PostgreSQL migrations live in `templates/databases/postgresql` and are generated by EF Core for Npgsql, never copied from the SQL Server ones. When the upstream model changes (and a SQL Server migration was added upstream), add the matching PostgreSQL migration and verify both providers (requires the .NET 9 SDK; no database is contacted):

```bash
npm run generate-migrations -- --db postgresql --name AddTeacher
npm run generate-migrations -- --check
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Generated applications include the same MIT `LICENSE` and are free to use in personal or commercial projects, as long as the copyright notice is kept.