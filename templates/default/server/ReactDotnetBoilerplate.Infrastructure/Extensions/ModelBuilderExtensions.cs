using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore;

namespace ReactDotnetBoilerplate.Infrastructure.Extensions
{
    public static class ModelBuilderExtensions
    {
        public static void AddConfiguration<TEntity>(
            this ModelBuilder modelBuilder,
            DbEntityConfiguration<TEntity> entityConfiguration
        ) where TEntity : class
        {
            modelBuilder.Entity<TEntity>(entityConfiguration.Configure);
        }

        public static void Seed(this ModelBuilder builder)
        {
        }

        public abstract class DbEntityConfiguration<TEntity> where TEntity : class
        {
            public abstract void Configure(EntityTypeBuilder<TEntity> entity);
        }
    }
}
