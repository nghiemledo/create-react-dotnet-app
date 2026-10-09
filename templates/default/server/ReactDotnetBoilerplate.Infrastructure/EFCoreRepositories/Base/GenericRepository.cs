using Microsoft.EntityFrameworkCore;
using ReactDotnetBoilerplate.Infrastructure.DbContexts;

namespace ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Base
{
    public class GenericRepository<T> : IGenericRepository<T> where T : class
    {
        private readonly ApplicationDbContext _dbContext;
        public GenericRepository(ApplicationDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }
        public async Task<IEnumerable<T>> GetAllAsync()
        {
            return await _dbContext.Set<T>().ToListAsync();
        }
        public async Task<T?> GetByIdAsync(object? id)
        {
            return await _dbContext.Set<T>().FindAsync(id);
        }
        public async Task<T?> GetBySlugAsync(string slug)
        {
            return await _dbContext.Set<T>()
                .FirstOrDefaultAsync(entity => EF.Property<string>(entity, "Slug") == slug);
        }
        public async Task<T?> GetByNameAsync(string name)
        {
            return await _dbContext.Set<T>()
                .FirstOrDefaultAsync(entity => EF.Property<string>(entity, "Name") == name);
        }
        public IQueryable<T> GetAllAsQueryableAsync(bool isTracking = false)
        {
            var dataset = _dbContext.Set<T>();
            return isTracking ? dataset : dataset.AsNoTracking();
        }
        public async Task<T> CreateAsync(T entity)
        {
            await _dbContext.Set<T>().AddAsync(entity);
            await _dbContext.SaveChangesAsync();
            return entity;
        }
        public async Task CreateRangeAsync(IEnumerable<T> entities)
        {
            try
            {
                await _dbContext.Set<T>().AddRangeAsync(entities);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new Exception("Lỗi khi thêm dữ liệu", ex);
            }
        }
        public async Task<T> DeleteAsync(T entity)
        {
            try
            {
                _dbContext.Set<T>().Remove(entity);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new Exception("Lỗi khi xóa dữ liệu", ex);
            }
            return entity;
        }
        public async Task<T> UpdateAsync(T entity)
        {
            try
            {
                _dbContext.Entry(entity).State = EntityState.Modified;
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new Exception("Lỗi khi xóa dữ liệu", ex);
            }
            return entity;
        }
        public void Dispose()
        {
            _dbContext.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
