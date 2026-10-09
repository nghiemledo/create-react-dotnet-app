namespace ReactDotnetBoilerplate.Infrastructure.DapperRepositories.Base
{
    public interface IDapperBase
    {
        Task<IEnumerable<T>> GetData<T, P>(string spName, P parameters, string connectionId = "DefaultConnection");
        Task SaveData<T>(string spName, T parameters, string connectionId = "DefaultConnection");
        Task<IEnumerable<IEnumerable<T>>> GetDataMultiple<T, TParams>(string storedProcedure, TParams parameters, string connectionId = "DefaultConnection");

        Task<T?> GetFirstOrDefault<T, P>(string spName, P parameters, string connectionId = "DefaultConnection");

        Task<T?> GetScalar<T, P>(string spName, P parameters, string connectionId = "DefaultConnection");
    }
}
