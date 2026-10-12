using Microsoft.EntityFrameworkCore;
using ReactDotnetBoilerplate.Infrastructure.DbContexts;
using ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Base;
using StudentEntity = ReactDotnetBoilerplate.Domain.Entity.Student.Student;

namespace ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Students
{
    public interface IStudentRepository : IGenericRepository<StudentEntity>
    {
        Task<bool> ExistsByStudentCodeAsync(string studentCode, Guid? excludeId = null);
        Task<bool> ExistsByEmailAsync(string email, Guid? excludeId = null);
        IQueryable<StudentEntity> Query();
    }

    public class StudentRepository : GenericRepository<StudentEntity>, IStudentRepository
    {
        private readonly ApplicationDbContext _dbContext;

        public StudentRepository(ApplicationDbContext dbContext) : base(dbContext)
        {
            _dbContext = dbContext;
        }

        public IQueryable<StudentEntity> Query()
        {
            return _dbContext.Students.AsNoTracking();
        }

        public Task<bool> ExistsByStudentCodeAsync(string studentCode, Guid? excludeId = null)
        {
            var query = _dbContext.Students.AsQueryable();
            if (excludeId.HasValue)
            {
                query = query.Where(x => x.Id != excludeId.Value);
            }

            // Compared in lower case so SQL Server (case-insensitive collation) and PostgreSQL (case-sensitive) agree.
            var normalized = studentCode.ToLowerInvariant();
            return query.AnyAsync(x => x.StudentCode.ToLower() == normalized);
        }

        public Task<bool> ExistsByEmailAsync(string email, Guid? excludeId = null)
        {
            var query = _dbContext.Students.AsQueryable();
            if (excludeId.HasValue)
            {
                query = query.Where(x => x.Id != excludeId.Value);
            }

            var normalized = email.ToLowerInvariant();
            return query.AnyAsync(x => x.Email.ToLower() == normalized);
        }
    }
}
