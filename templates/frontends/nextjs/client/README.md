# Next.js client

A Next.js (App Router) UI for the ASP.NET Core API in `server/`.<!-- crda:source-repo-only --> It is a second frontend option next to
the React + Vite client in `client/` and talks to the same REST API.<!-- /crda:source-repo-only --> It is a UI client only: there are no
Route Handlers, Server Actions or database access in Next.js, and all business rules stay in the .NET API.

## Requirements

- Node.js 20.9 or later (Next.js 16)
- pnpm (the lockfile is `pnpm-lock.yaml`) or npm
- The API running locally (see the root README)

## Getting started

```bash
cp .env.example .env    # Windows PowerShell: Copy-Item .env.example .env
pnpm install
pnpm dev                # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Development server on port 3000 |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint (TypeScript, React Hooks and Next.js rules) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm codegen` | Regenerate `src/types/api.generated.ts` from the API's Swagger document |
| `pnpm codegen --check` | Fail if the generated types are out of date (the API must be running) |
| `pnpm codegen:test` | Tests for the codegen script |

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://localhost:7001` | API URL used **by the browser** |
| `NEXT_PUBLIC_APP_NAME` | | Application name in the sidebar and page title |
| `NEXT_PUBLIC_API_TIMEOUT` | `15000` | Request timeout in milliseconds |

`NEXT_PUBLIC_*` values are inlined into the JavaScript bundle when `next dev` or `next build` runs, so
they are public. Never put secrets in them, and restart `next dev` (or rebuild) after changing them.

### Browser URL versus Docker

All API calls are made by the browser, so `NEXT_PUBLIC_API_BASE_URL` must be an address the user's
browser can reach:

- **Local development:** `https://localhost:7001` (the API's `https` launch profile). Trust the ASP.NET Core
  development certificate once with `dotnet dev-certs https --trust`.
- **Docker:** the browser runs on the host, not inside the Compose network, so a service name such as
  `http://api:8080` does not resolve. Use the port published on the host (for example
  `http://localhost:8080`) or the public URL of the API. The project's `compose.yaml` (when present) only runs
  the database; the API and this client run on the host.
- Because the value is inlined at build time, a production image must be built with the final URL.

The API's CORS policy allows `http://localhost:3000` and `http://localhost:3001` for development. Add the
production origin to the CORS policy in the API before deploying.

## Authentication

Authentication uses the API's JWT flow<!-- crda:source-repo-only --> (the same as the Vite client)<!-- /crda:source-repo-only -->:

- `POST /v1/auth/login` returns a JWT; it is stored by the Zustand `authStore` (`localStorage`) and sent
  as `Authorization: Bearer` by the Axios client. A 401 response signs the user out.
- Authenticated pages are client components. They wait until the store has been restored in the
  browser, then redirect to `/auth/login?from=<path>` when there is no session. Authenticated data is
  never fetched in Server Components, because the server cannot see the token.
- Role checks (`ADMIN`, `TEACHER`) are UI conveniences; the API enforces authorization.

## Project structure

```text
src/
  app/                    Routes (App Router)
    (auth)/auth/login     Login
    (auth)/auth/register  Register placeholder
    (main)/dashboard      Dashboard (sample data)
    (main)/students       List, create (/students/create) and detail/edit (/students/[id])
  components/             Layouts and shadcn/ui components
  features/               Feature modules: services, queries, schemas, types, components, views
  config/ lib/ store/ types/ utils/ routes/
scripts/codegen.mjs       OpenAPI to TypeScript generator
```

Feature modules live in `src/features/` because `src/pages/` is reserved for the Next.js Pages Router.
<!-- crda:source-repo-only -->

## Shared code with the Vite client

The API layer, stores, generated types, utilities, Students services, queries, schemas and form
components are byte-for-byte copies of their counterparts in `client/`. Change both copies together.
`node scripts/check-client-next-shared.mjs` (from the repository root) fails when they drift.
<!-- /crda:source-repo-only -->
