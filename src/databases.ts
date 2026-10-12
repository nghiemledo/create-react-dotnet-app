import { SOURCE_PROJECT_NAME, TEMPLATE_TOKENS } from './tokens.js';

export const SUPPORTED_DATABASES = ['sqlserver', 'postgresql'] as const;

export type Database = (typeof SUPPORTED_DATABASES)[number];

/** The template's own provider. 0.1.x generated SQL Server projects, so it stays the default. */
export const DEFAULT_DATABASE: Database = 'sqlserver';

const INFRASTRUCTURE = `server/${SOURCE_PROJECT_NAME}.Infrastructure`;
export const TEMPLATE_PATHS = {
  infrastructureProject: `${INFRASTRUCTURE}/${SOURCE_PROJECT_NAME}.Infrastructure.csproj`,
  databaseRegistration: `${INFRASTRUCTURE}/Extensions/DatabaseServiceCollectionExtensions.cs`,
  dapperConnectionFactory: `${INFRASTRUCTURE}/DapperRepositories/Base/DbConnectionFactory.cs`,
  appsettings: `server/${SOURCE_PROJECT_NAME}.Api/appsettings.json`,
  /** Generated for SQL Server upstream; other providers replace the whole directory with their own set. */
  migrations: `${INFRASTRUCTURE}/Migrations/`,
} as const;

/** An exact-text edit of one template file. A missing anchor means the template drifted, so generation stops. */
export interface ProviderEdit {
  templatePath: string;
  from: string;
  to: string;
}

export interface DatabaseInfo {
  /** Shown in prompts and documentation. */
  name: string;
  promptLabel: string;
  efCorePackage: { id: string; version: string };
  edits: ProviderEdit[];
  /**
   * Directory under `templates/databases/` whose files are added to the project (same relative layout as the
   * template): compose.yaml, .env.example, the generated .env and, for non-template providers, migrations.
   */
  overlay: string;
  /** Template files dropped for this provider because the overlay supplies replacements. */
  replacesPrefix?: string;
}

/** Template text the edits anchor to. Kept verbatim so any upstream change fails loudly instead of half-applying. */
const SQLSERVER_PACKAGE = '<PackageReference Include="Microsoft.EntityFrameworkCore.SqlServer" Version="9.0.18" />';
const SQLSERVER_REGISTRATION = 'options.UseSqlServer(connectionString)';
const SQLSERVER_ADO_NAMESPACE = 'using Microsoft.Data.SqlClient;';
const SQLSERVER_ADO_CONNECTION = 'return new SqlConnection(connectionString);';
const SQLSERVER_CONNECTION =
  '"DefaultConnection": "Server=(localdb)\\\\mssqllocaldb;Database=ReactDotnetBoilerplateDb;' +
  'Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"';

export const DATABASES: Record<Database, DatabaseInfo> = {
  sqlserver: {
    name: 'SQL Server',
    promptLabel: 'SQL Server (LocalDB on Windows by default)',
    efCorePackage: { id: 'Microsoft.EntityFrameworkCore.SqlServer', version: '9.0.18' },
    edits: [],
    overlay: 'sqlserver',
  },
  postgresql: {
    name: 'PostgreSQL',
    promptLabel: 'PostgreSQL (includes a Docker Compose file for local development)',
    // 9.0.x is the newest line for EF Core 9 / net9.0; 10.x requires net10.0 and EF Core 10.
    efCorePackage: { id: 'Npgsql.EntityFrameworkCore.PostgreSQL', version: '9.0.4' },
    edits: [
      {
        templatePath: TEMPLATE_PATHS.infrastructureProject,
        from: SQLSERVER_PACKAGE,
        to: '<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.4" />',
      },
      {
        templatePath: TEMPLATE_PATHS.databaseRegistration,
        from: SQLSERVER_REGISTRATION,
        to: 'options.UseNpgsql(connectionString)',
      },
      // Npgsql comes with the EF Core provider package, as Microsoft.Data.SqlClient does for SQL Server.
      { templatePath: TEMPLATE_PATHS.dapperConnectionFactory, from: SQLSERVER_ADO_NAMESPACE, to: 'using Npgsql;' },
      {
        templatePath: TEMPLATE_PATHS.dapperConnectionFactory,
        from: SQLSERVER_ADO_CONNECTION,
        to: 'return new NpgsqlConnection(connectionString);',
      },
      {
        templatePath: TEMPLATE_PATHS.appsettings,
        from: SQLSERVER_CONNECTION,
        to:
          '"DefaultConnection": "Host=localhost;Port=5432;Database=ReactDotnetBoilerplateDb;' +
          `Username=postgres;Password=${TEMPLATE_TOKENS.databasePassword}"`,
      },
    ],
    overlay: 'postgresql',
    replacesPrefix: TEMPLATE_PATHS.migrations,
  },
};

export function isDatabase(value: string): value is Database {
  return (SUPPORTED_DATABASES as readonly string[]).includes(value);
}

const SERVER_PROJECTS = `--project ${SOURCE_PROJECT_NAME}.Infrastructure --startup-project ${SOURCE_PROJECT_NAME}.Api`;

/**
 * Renderers for `<!-- crda:<name> -->...<!-- /crda:<name> -->` blocks in the template's Markdown files.
 * Output uses the source identifiers; the regular identifier rename runs afterwards.
 */
export function databaseDocBlocks(database: Database): Record<string, string> {
  const info = DATABASES[database];
  return {
    'database-name': info.name,
    'database-setup': database === 'postgresql' ? postgresSetup() : sqlServerSetup(),
    'database-guide': databaseGuide(info),
  };
}

const COMPOSE_LIFECYCLE = `\`\`\`bash
docker compose up -d --wait   # start and wait until healthy (run in the project root)
docker compose ps             # status and health
docker compose logs -f        # follow the database logs
docker compose stop           # stop; the container and data are kept
docker compose down           # remove the container; the data volume is kept
\`\`\`

Data lives in a named Docker volume, so stopping, restarting or recreating the container keeps it.
\`docker compose down -v\` deletes the volume and every row in it; use it only to start from scratch.`;

function sqlServerSetup(): string {
  return `### Database: SQL Server

The API uses Entity Framework Core (and Dapper) with SQL Server. The connection string is
\`ConnectionStrings:DefaultConnection\` in \`server/${SOURCE_PROJECT_NAME}.Api/appsettings.json\` and points to
SQL Server LocalDB, which is available on Windows only (installed with Visual Studio or SQL Server Express).
In the Development environment the API applies pending migrations and seeds sample data on startup; see
\`server/README.md\` for migration commands.

#### Optional: SQL Server in Docker (macOS, Linux, or no LocalDB)

\`compose.yaml\` defines a SQL Server 2022 Developer edition container. It reads its settings from \`.env\` in the
project root, which was generated with a random \`sa\` password and is git-ignored (\`.env.example\` documents each
value). Requirements: Docker that can run \`linux/amd64\` images (Apple Silicon uses emulation) and about 2 GB of
memory for the container.

1. Read the [SQL Server license terms](https://hub.docker.com/r/microsoft/mssql-server) and set
   \`MSSQL_ACCEPT_EULA=Y\` in \`.env\`. The container refuses to start until you do.
2. Start it and wait until it is healthy:

${COMPOSE_LIFECYCLE}

3. Point the API at the container instead of LocalDB with the \`ConnectionStrings__DefaultConnection\`
   environment variable. \`.env\` contains the matching value, commented out: uncomment it and use the
   **Backend: API (settings from .env)** launch configuration in VS Code, or set it in your shell before \`dotnet run\`:

\`\`\`bash
# bash/zsh
export ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=${SOURCE_PROJECT_NAME}Db;User Id=sa;Password=<password from .env>;TrustServerCertificate=True;MultipleActiveResultSets=true"
# PowerShell
$env:ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=${SOURCE_PROJECT_NAME}Db;User Id=sa;Password=<password from .env>;TrustServerCertificate=True;MultipleActiveResultSets=true"
\`\`\`

The same variable points the API at any other SQL Server instance.

${connectionHostSection('sqlserver')}

#### Troubleshooting

- **\`required variable MSSQL_ACCEPT_EULA is missing a value\`**: set \`MSSQL_ACCEPT_EULA=Y\` in \`.env\` (step 1).
- **The container exits right after starting**: check \`docker compose logs sqlserver\`. The usual causes are an
  \`sa\` password that does not meet the complexity rules, or too little memory for Docker.
- **Port 1433 is already in use**: change \`MSSQL_PORT\` in \`.env\` and \`Server=localhost,<port>\` in the connection string.
- **Changing \`MSSQL_SA_PASSWORD\` has no effect**: the password is stored in the data volume when it is first
  created. Keep the old one, or delete the volume with \`docker compose down -v\` (deletes all data).
- **LocalDB: "A network-related or instance-specific error"**: run \`sqllocaldb info\` to check that the
  \`MSSQLLocalDB\` instance exists, and \`sqllocaldb start MSSQLLocalDB\` to start it.

${credentialsSection('sqlserver')}

${VSCODE_SECTION}`;
}

function postgresSetup(): string {
  return `### Database: PostgreSQL

The API uses Entity Framework Core (and Dapper) with PostgreSQL. A local PostgreSQL 17 container is defined in
\`compose.yaml\` (Docker required). It reads its settings from \`.env\` in the project root, which was generated
with a random password and is git-ignored (\`.env.example\` documents each value). The API's connection string,
\`ConnectionStrings:DefaultConnection\` in \`server/${SOURCE_PROJECT_NAME}.Api/appsettings.json\`, already matches
it: \`Host=localhost;Port=5432\` with the same database, user and password. The API runs on your machine, so it
reaches the container through the published port, which is bound to \`127.0.0.1\` only.

${COMPOSE_LIFECYCLE}

In the Development environment the API applies pending migrations and seeds sample data on startup; see
\`server/README.md\` for migration commands.

To use another PostgreSQL server instead, override the connection string with an environment variable (or with
the commented line in \`.env\` and the **Backend: API (settings from .env)** VS Code launch configuration):

\`\`\`bash
# bash/zsh
export ConnectionStrings__DefaultConnection="Host=<host>;Port=5432;Database=${SOURCE_PROJECT_NAME}Db;Username=<user>;Password=<password>"
# PowerShell
$env:ConnectionStrings__DefaultConnection="Host=<host>;Port=5432;Database=${SOURCE_PROJECT_NAME}Db;Username=<user>;Password=<password>"
\`\`\`

${connectionHostSection('postgresql')}

#### Troubleshooting

- **\`Bind for 127.0.0.1:5432 failed: port is already allocated\`** (often a locally installed PostgreSQL): set
  \`POSTGRES_PORT\` in \`.env\` to a free port and use the same \`Port=\` in the connection string, or use that
  server through \`ConnectionStrings__DefaultConnection\`.
- **\`password authentication failed for user "postgres"\`**: the password in \`.env\` and the connection string
  differ, or \`.env\` changed after the volume was created. PostgreSQL stores the password when the volume is
  first initialized; restore the old one, or delete the volume with \`docker compose down -v\` (deletes all data).
- **\`required variable POSTGRES_PASSWORD is missing a value\`**: \`.env\` is missing (it is not committed). Copy
  \`.env.example\` to \`.env\` and set a password that matches the connection string.
- **The API cannot connect right after \`docker compose up\`**: wait for the health check (\`docker compose ps\`
  shows \`healthy\`), which \`--wait\` does for you.

${credentialsSection('postgresql')}

${VSCODE_SECTION}`;
}

/**
 * The connection string names the database as seen from wherever the API process runs. `compose.yaml` has no API
 * service, so the documented setup is an API on the host using the published port.
 */
function connectionHostSection(database: Database): string {
  const sqlServer = database === 'sqlserver';
  const service = sqlServer ? 'sqlserver' : 'postgres';
  const portVariable = sqlServer ? 'MSSQL_PORT' : 'POSTGRES_PORT';
  const containerPort = sqlServer ? 1433 : 5432;
  const onHost = sqlServer ? `Server=localhost,<${portVariable}>` : `Host=localhost;Port=<${portVariable}>`;
  const inCompose = sqlServer ? `Server=${service},${containerPort}` : `Host=${service};Port=${containerPort}`;
  const localDbRow = sqlServer
    ? '\n| On Windows, with LocalDB (the default in `appsettings.json`) | `Server=(localdb)\\mssqllocaldb` (no container involved) |'
    : '';
  return `#### Which host name to use

The connection string names the database server as seen from the process that runs the API:

| Where the API runs | Server part of the connection string |
| --- | --- |${localDbRow}
| On your machine (\`dotnet run\`, VS Code), the documented setup | \`${onHost}\`, the port published on \`127.0.0.1\` (default ${containerPort}) |
| In a container on the same Compose network (a service you add to \`compose.yaml\`) | \`${inCompose}\`: the service name and the container port |

Inside a container, \`localhost\` is that container itself, so a containerized API must reach the database
through the Compose service name (\`${service}\`), never through \`localhost\`. The published port and
\`${portVariable}\` only apply to connections from your machine.`;
}

/** Generated values are per-project development credentials; production must supply its own. */
function credentialsSection(database: Database): string {
  const databasePassword =
    database === 'postgresql'
      ? '- The database password, in `.env` and in the connection string in `appsettings.json` (both must match).'
      : '- The `sa` password of the optional container, in `.env` (and its commented connection string override).';
  return `### Development credentials and production secrets

These values were generated randomly for this project and are for local development only
(\`appsettings.json\` is \`server/${SOURCE_PROJECT_NAME}.Api/appsettings.json\`):

${databasePassword}
- The JWT signing key, in \`Jwt:Key\` and \`JwtTokenSettings:Key\` in \`appsettings.json\`. Tokens are signed with one
  and validated with the other, so the two must always be the same value.
- The password of the seeded sample accounts, in
  \`server/${SOURCE_PROJECT_NAME}.Infrastructure/Extensions/DataSeeder.cs\`. Seeding runs only in the Development
  environment.

\`.env\` is git-ignored; \`appsettings.json\` and \`DataSeeder.cs\` are committed with the project, so treat their
values as known to anyone with access to the repository. Do not reuse them outside your machine.

For staging and production, provide secrets through environment variables or your hosting platform's secret
store. Environment variables override \`appsettings.json\` (\`__\` separates the sections), for example
\`ConnectionStrings__DefaultConnection\`, \`Jwt__Key\` and \`JwtTokenSettings__Key\` (one new random value of at
least 64 characters for both), \`EmailSettings__SmtpUser\`, \`EmailSettings__SmtpPass\` and
\`Authentication__Google__ClientId\`.`;
}

const VSCODE_SECTION = `### Running in VS Code

Open the project root folder and install the recommended extensions when prompted (\`.vscode/extensions.json\`).

- **Run and Debug**: \`Backend: API\` builds and debugs the API with the \`https\` launch profile and opens
  Swagger; \`Backend: API (settings from .env)\` does the same with the variables from \`.env\` (for connection
  string overrides); \`Frontend: Vite (Chrome)\` starts the Vite dev server and debugs the client in Chrome;
  \`Full stack: API + Vite\` runs both.
- **Tasks** (Terminal > Run Task): \`server: build\`, \`server: watch\`, \`client: dev\`, \`client: lint\`, and
  \`db: up\` / \`db: stop\` / \`db: logs\` for the Docker database. None of them delete data.
- Install the client dependencies first (\`npm install\` or \`pnpm install\` in \`client/\`). The frontend
  configuration expects Vite on its default port 5173; if Vite picks another port, update \`url\` in
  \`.vscode/launch.json\`.`;

function databaseGuide(info: DatabaseInfo): string {
  return `## 🗄️ Database & Migrations (${info.name})

- EF Core provider: \`${info.efCorePackage.id}\` ${info.efCorePackage.version}.
- Connection string: \`ConnectionStrings:DefaultConnection\` in \`${SOURCE_PROJECT_NAME}.Api/appsettings.json\`,
  overridable with the \`ConnectionStrings__DefaultConnection\` environment variable.
- Migrations in \`${SOURCE_PROJECT_NAME}.Infrastructure/Migrations\` were generated for ${info.name}. They are
  provider-specific: switching providers means regenerating them, not reusing them.
- In Development the API applies pending migrations and seeds sample data on startup. In other environments,
  apply migrations explicitly.
- Dapper (\`DapperRepositories/Base\`) uses the same database through \`IDbConnectionFactory\`, which creates
  ${info.name === 'PostgreSQL' ? '`NpgsqlConnection`' : '`SqlConnection`'} instances. ${dapperNote(info)}

\`\`\`bash
cd server
dotnet tool restore   # installs the dotnet-ef version pinned in .config/dotnet-tools.json

# Add a migration after changing the model:
dotnet ef migrations add AddTeacher ${SERVER_PROJECTS}

# Apply migrations to the configured database:
dotnet ef database update ${SERVER_PROJECTS}
\`\`\``;
}

/** `IDapperBase` runs stored procedures (`CommandType.StoredProcedure`), which the two providers execute differently. */
function dapperNote(info: DatabaseInfo): string {
  if (info.name === 'PostgreSQL') {
    return `Npgsql runs \`IDapperBase\` calls as \`CALL name(...)\`, so they target
  procedures (\`CREATE PROCEDURE\`); procedures return at most one row of OUT/INOUT values. For row-returning
  functions, query a connection from \`IDbConnectionFactory\` with \`SELECT * FROM function_name(@param)\`.
  No stored procedures are included; create your own (for example with \`migrationBuilder.Sql\`) in PostgreSQL syntax.`;
  }
  return `\`IDapperBase\` executes stored procedures by name. No stored procedures are
  included; create your own (for example with \`migrationBuilder.Sql\`) in T-SQL.`;
}

const BLOCK_PATTERN = /<!-- crda:([a-z-]+) -->[\s\S]*?<!-- \/crda:\1 -->/g;

/** Replaces every marked block with its rendering, markers included. Unknown block names are template bugs. */
export function renderDocBlocks(text: string, blocks: Record<string, string>, templatePath: string): string {
  return text.replace(BLOCK_PATTERN, (_match, name: string) => {
    const rendered = blocks[name];
    if (rendered === undefined) {
      throw new Error(`Unknown documentation block "${name}" in ${templatePath}.`);
    }
    return rendered;
  });
}
