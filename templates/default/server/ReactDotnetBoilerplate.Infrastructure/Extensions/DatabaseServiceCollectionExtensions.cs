using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ReactDotnetBoilerplate.Infrastructure.DapperRepositories.Base;
using ReactDotnetBoilerplate.Infrastructure.DbContexts;

namespace ReactDotnetBoilerplate.Infrastructure.Extensions
{
    public static class DatabaseServiceCollectionExtensions
    {
        public const string ConnectionStringName = "DefaultConnection";

        /// <summary>
        /// Registers ApplicationDbContext (EF Core) and the Dapper connection factory for the same database provider.
        /// The connection string comes from ConnectionStrings:DefaultConnection, which the
        /// ConnectionStrings__DefaultConnection environment variable overrides.
        /// </summary>
        public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString(ConnectionStringName);
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    $"Connection string '{ConnectionStringName}' is not configured. Set ConnectionStrings:{ConnectionStringName} " +
                    $"in appsettings.json or the ConnectionStrings__{ConnectionStringName} environment variable.");
            }

            services.AddDbContext<ApplicationDbContext>(options => options.UseSqlServer(connectionString));
            services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();
            return services;
        }
    }
}
