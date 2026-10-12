import { describe, expect, it } from 'vitest';
import {
  DATABASES,
  DEFAULT_DATABASE,
  SUPPORTED_DATABASES,
  databaseDocBlocks,
  isDatabase,
  renderDocBlocks,
} from '../src/databases.js';
import { generateDatabasePassword } from '../src/secrets.js';
import { nextStepLines } from '../src/summary.js';

describe('generated database password', () => {
  it('always satisfies the SQL Server sa complexity rule and needs no escaping in .env or connection strings', () => {
    for (let i = 0; i < 500; i++) {
      const password = generateDatabasePassword();
      expect(password).toMatch(/^[A-Za-z0-9]{24}$/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
    }
  });
});

describe('database providers', () => {
  it('keeps SQL Server as the default and recognizes only supported values', () => {
    expect(DEFAULT_DATABASE).toBe('sqlserver');
    expect(SUPPORTED_DATABASES).toEqual(['sqlserver', 'postgresql']);
    expect(isDatabase('postgresql')).toBe(true);
    expect(isDatabase('mysql')).toBe(false);
  });

  it('pins EF Core 9 compatible provider versions', () => {
    expect(DATABASES.sqlserver.efCorePackage).toEqual({ id: 'Microsoft.EntityFrameworkCore.SqlServer', version: '9.0.18' });
    expect(DATABASES.postgresql.efCorePackage).toEqual({ id: 'Npgsql.EntityFrameworkCore.PostgreSQL', version: '9.0.4' });
  });
});

describe('documentation blocks', () => {
  it.each(SUPPORTED_DATABASES)('renders every block for %s with placeholders instead of credentials', (database) => {
    const blocks = databaseDocBlocks(database);
    expect(Object.keys(blocks).sort()).toEqual(['database-guide', 'database-name', 'database-setup']);
    expect(blocks['database-setup']).toContain('ConnectionStrings__DefaultConnection');
    expect(blocks['database-setup']).toMatch(/Password=<(password from \.env|password)>/);
    expect(blocks['database-setup']).toContain('docker compose up -d --wait');
    expect(blocks['database-setup']).toContain('docker compose down -v` deletes the volume');
    expect(blocks['database-setup']).toContain('#### Troubleshooting');
    expect(blocks['database-setup']).toContain('### Running in VS Code');
    expect(blocks['database-setup']).toContain('#### Which host name to use');
    expect(blocks['database-setup']).toContain('### Development credentials and production secrets');
    expect(blocks['database-guide']).toContain(DATABASES[database].efCorePackage.id);
    expect(blocks['database-guide']).toContain('dotnet tool restore');
  });

  it('documents Dapper with the provider-specific connection and stored-procedure behavior', () => {
    const sqlServer = databaseDocBlocks('sqlserver')['database-guide'];
    const postgres = databaseDocBlocks('postgresql')['database-guide'];
    expect(sqlServer).toContain('`SqlConnection` instances');
    expect(sqlServer).toContain('T-SQL');
    expect(postgres).toContain('`NpgsqlConnection` instances');
    expect(postgres).toContain('`CALL name(...)`');
    expect(postgres).toContain('SELECT * FROM function_name(@param)');
  });

  it('replaces marked blocks, markers included, and leaves other text alone', () => {
    const text = 'A <!-- crda:database-name -->old<!-- /crda:database-name --> B\n<!-- crda:x -->\nline\n<!-- /crda:x -->\nC';
    expect(renderDocBlocks(text, { 'database-name': 'PostgreSQL', x: 'new' }, 'README.md')).toBe('A PostgreSQL B\nnew\nC');
  });

  it('fails on an unknown block name', () => {
    expect(() => renderDocBlocks('<!-- crda:nope -->x<!-- /crda:nope -->', {}, 'server/README.md')).toThrow(
      'Unknown documentation block "nope" in server/README.md.',
    );
  });
});

describe('next steps', () => {
  const context = {
    targetDir: '/work/my-app',
    pascalName: 'MyApp',
    packageManager: 'pnpm' as const,
    dependenciesInstalled: true,
    dotnetSdkFound: true,
    seedUserPassword: 'SeedPw',
  };

  it('tells PostgreSQL users to start the bundled compose database', () => {
    const text = nextStepLines({ ...context, database: 'postgresql' }).join('\n');
    expect(text).toContain('docker compose up -d --wait');
    expect(text).toContain('.env');
    expect(text).not.toContain('LocalDB');
  });

  it('explains the LocalDB default and the optional container for SQL Server', () => {
    const text = nextStepLines({ ...context, database: 'sqlserver' }).join('\n');
    expect(text).toContain('LocalDB, which is Windows only');
    expect(text).toContain('MSSQL_ACCEPT_EULA=Y');
    expect(text).toContain('docker compose up -d --wait');
  });

  it.each(SUPPORTED_DATABASES)('states that the CLI never touches a database (%s)', (database) => {
    const text = nextStepLines({ ...context, database }).join('\n');
    expect(text).toContain('This tool does not run migrations or touch any database.');
    expect(text).toContain('applies its migrations and seeds sample data on startup');
  });
});
