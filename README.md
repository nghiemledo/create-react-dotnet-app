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
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?logo=swagger&logoColor=black)

**Tooling:**
![pnpm](https://img.shields.io/badge/pnpm-supported-F69220?logo=pnpm&logoColor=white)
![npm](https://img.shields.io/badge/npm-supported-CB3837?logo=npm&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-flat_config-4B32C3?logo=eslint&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tested-6E9F18?logo=vitest&logoColor=white)

An interactive CLI to instantly scaffold production-ready full-stack applications with **React 19 (Vite, TypeScript, Tailwind CSS v4, Shadcn/ui)** and **ASP.NET Core (.NET 9) Clean Architecture Web API**.

The starter template is self-contained directly inside the npm package — zero network requests or GitHub dependencies at generation time.

---

## ⚡ Quick Start

You can generate a new application interactively with a single command:

```bash
npx create-react-dotnet-app my-app


Or run without arguments to launch the guided prompt:

```bash
npx create-react-dotnet-app


### Non-Interactive / CI Usage

Pass options with `--yes` (`-y`) to skip all interactive prompts:

```bash
npx create-react-dotnet-app my-app --yes --pm pnpm --install --git


#### Available CLI Flags

| Flag | Description | Default |
| --- | --- | --- |
| `[project-name]` | Target folder & app identifier (e.g. `my-app` → `MyApp`) | Interactive prompt |
| `--pm <manager>` | Frontend package manager: `pnpm` or `npm` | `pnpm` if installed, otherwise `npm` |
| `--install` / `--no-install` | Install frontend dependencies immediately | `--install` |
| `--git` / `--no-git` | Initialize a Git repository with an initial commit | `--git` |
| `--display-name <name>` | Custom human-readable brand name for the UI | The project name |
| `-y, --yes` | Skip all prompts and use defaults | `false` |

---

## 🚀 Getting Started with Your New App

Once scaffolded, launch both client and server:

### 1. Start the Backend (.NET 9 Web API)

```bash
cd my-app/server
dotnet dev-certs https --trust   # first time only
dotnet run --project MyApp.Api --launch-profile https
```

* **Swagger UI:** `https://localhost:7001/swagger` (or `http://localhost:5058/swagger`)
* **Default Database:** Configured for SQL Server LocalDB by default. On first start the API creates and seeds the database. On Linux/macOS, point `ConnectionStrings:DefaultConnection` in `appsettings.json` (or the `ConnectionStrings__DefaultConnection` environment variable) at a SQL Server instance.
* **Admin Login:** The CLI generates a unique random password for your local seeded development account and prints it in the terminal summary.

### 2. Start the Frontend (React 19 + Vite)

```bash
cd my-app/client
# If not installed during setup:
pnpm install # or npm install

# Start Vite dev server:
pnpm dev     # or npm run dev


* **App URL:** `http://localhost:5173`

---

## 📦 What's Included in the Box

### Frontend

* **Framework:** React 19 + TypeScript + Vite 8
* **Styling:** Tailwind CSS v4 + Shadcn UI (accessible primitives with Radix UI)
* **State & Server Cache:** Zustand 5 & TanStack Query v5
* **Icons & Forms:** Lucide React, React Hook Form, Zod validation
* **Zero-Config DX:** Path alias `@/*` preconfigured, pre-wired API client with auto JWT attachment

### Backend

* **Framework:** ASP.NET Core Web API (.NET 9)
* **Architecture:** Clean Architecture (`Api`, `Application`, `Domain`, `Infrastructure`, `Common`)
* **Security:** Fully configured JWT Authentication & Refresh Token flow with auto-generated signing keys
* **Data Access:** Entity Framework Core (SQL Server); the database is created on first run (`EnsureCreated`) and seeded with sample data. No migrations are included, and the CLI never touches a database.
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
| **Node.js** | `^22.13.0` or `>=23.5.0` | Required by the CLI and modern Vite / ESLint |
| **.NET SDK** | `9.0+` | Required to build and run the backend Web API |
| **Package Manager** | `pnpm 9+` or `npm 10+` | `pnpm` is recommended |
| **Database** | SQL Server / LocalDB / Docker | LocalDB works out-of-the-box on Windows |

---

## 🛠️ CLI Development & Contributing

### Local Setup

```bash
git clone https://github.com/nghiemledo/create-react-dotnet-app.git
cd create-react-dotnet-app
npm install

# Run typechecks, tests, and build
npm run check


### Local Testing

Test the CLI locally without publishing:

```bash
# Compile, then run the built CLI (creates ../test-app, outside this repository)
npm run build
node dist/index.js ../test-app --no-install --no-git

# Test packing dry-run (verifies bundle size and excluded artifacts)
npm pack --dry-run


### Project Structure

```text
src/
├── index.ts          # Entry point & error/cancellation handler
├── cli.ts            # Commander setup and step orchestrator
├── questions.ts      # Interactive prompt workflow
├── generate.ts       # Template copier, identifier renamer & secret injector
├── replacements.ts   # C# namespace & React identifier transformation logic
└── steps.ts          # Safe subprocess runners (pnpm install, git init)
templates/default/    # Sanitized template snapshot distributed via npm
scripts/              # Automated template sync & secret redaction scripts


### Updating the Template Snapshot

The starter template is mirrored from `react-dotnet-boilerplate`. To pull upstream updates:

```bash
npm run sync-template -- --source ../react-dotnet-boilerplate --ref <git-tag-or-branch>
npm run check
```

Only committed files at the given ref are copied, and secrets are replaced with per-project tokens. In PowerShell, quote the separator: `npm run sync-template '--' --source ...`.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE). Generated applications include the same MIT `LICENSE` and are free to use in personal or commercial projects, as long as the copyright notice is kept.