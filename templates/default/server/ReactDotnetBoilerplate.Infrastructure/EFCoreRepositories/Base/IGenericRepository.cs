namespace ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Base
{
    public interface IGenericRepository<T> : IDisposable where T : class
    {
        Task<T?> GetByIdAsync(object? id);
        Task<T?> GetBySlugAsync(string slug);
        Task<T?> GetByNameAsync(string name);
        Task<IEnumerable<T>> GetAllAsync();
        IQueryable<T> GetAllAsQueryableAsync(bool isTracking = false);
        Task<T> CreateAsync(T entity);
        Task CreateRangeAsync(IEnumerable<T> entities);
        Task<T> UpdateAsync(T entity);
        Task<T> DeleteAsync(T entity);

    }
}
