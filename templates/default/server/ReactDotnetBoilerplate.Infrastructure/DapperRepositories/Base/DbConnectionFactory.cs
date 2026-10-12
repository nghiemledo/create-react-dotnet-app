using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;

namespace ReactDotnetBoilerplate.Infrastructure.DapperRepositories.Base
{
    /// <summary>
    /// ADO.NET connections for Dapper, using the same provider and connection strings as ApplicationDbContext.
    /// </summary>
    public class DbConnectionFactory : IDbConnectionFactory
    {
        private readonly IConfiguration _config;

        public DbConnectionFactory(IConfiguration config)
        {
            _config = config;
        }

        public IDbConnection CreateConnection(string connectionId = "DefaultConnection")
        {
            var connectionString = _config.GetConnectionString(connectionId);
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException($"Connection string '{connectionId}' is not configured.");
            }

            return new SqlConnection(connectionString);
        }
    }
}
