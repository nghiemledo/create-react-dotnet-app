using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;

namespace ReactDotnetBoilerplate.Infrastructure.DapperRepositories.Base
{
    public class DapperBase : IDapperBase
    {
        private readonly IConfiguration _config;

        public DapperBase(IConfiguration config)
        {
            _config = config;
        }
        public async Task<IEnumerable<T>> GetData<T, P>(string spName, P parameters, string connectionId = "DefaultConnection")
        {
            using IDbConnection connection = new SqlConnection(_config.GetConnectionString(connectionId));
            return await connection.QueryAsync<T>(spName, parameters, commandType: CommandType.StoredProcedure);
        }
        public async Task SaveData<T>(string spName, T parameters, string connectionId = "DefaultConnection")
        {
            using IDbConnection connection = new SqlConnection(_config.GetConnectionString(connectionId));
            await connection.ExecuteAsync(spName, parameters, commandType: CommandType.StoredProcedure);
        }
        public async Task<IEnumerable<IEnumerable<T>>> GetDataMultiple<T, TParams>(string storedProcedure, TParams parameters, string connectionId = "DefaultConnection")
        {
            using IDbConnection connection = new SqlConnection(_config.GetConnectionString(connectionId));
            using var gridReader = await connection.QueryMultipleAsync(storedProcedure, parameters, commandType: CommandType.StoredProcedure);

            var result = new List<IEnumerable<T>>();
            while (!gridReader.IsConsumed)
            {
                result.Add(await gridReader.ReadAsync<T>());
            }

            return result;
        }

        public async Task<T?> GetFirstOrDefault<T, P>(string spName, P parameters, string connectionId = "DefaultConnection")
        {
            using IDbConnection connection = new SqlConnection(_config.GetConnectionString(connectionId));
            return await connection.QueryFirstOrDefaultAsync<T>(spName, parameters, commandType: CommandType.StoredProcedure);
        }

        public async Task<T?> GetScalar<T, P>(string spName, P parameters, string connectionId = "DefaultConnection")
        {
            using IDbConnection connection = new SqlConnection(_config.GetConnectionString(connectionId));
            return await connection.ExecuteScalarAsync<T>(spName, parameters, commandType: CommandType.StoredProcedure);
        }
    }
}
