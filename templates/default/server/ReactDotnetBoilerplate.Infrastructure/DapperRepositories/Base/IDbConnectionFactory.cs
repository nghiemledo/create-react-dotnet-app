using System.Data;

namespace ReactDotnetBoilerplate.Infrastructure.DapperRepositories.Base
{
    public interface IDbConnectionFactory
    {
        /// <summary>Creates an unopened connection for ConnectionStrings:{connectionId}. The caller disposes it.</summary>
        IDbConnection CreateConnection(string connectionId = "DefaultConnection");
    }
}
