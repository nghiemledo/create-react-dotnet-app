using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ReactDotnetBoilerplate.Domain.Base;
using ReactDotnetBoilerplate.Domain.Entity.Student;
using ReactDotnetBoilerplate.Domain.Identity;
using ReactDotnetBoilerplate.Infrastructure.Extensions;

namespace ReactDotnetBoilerplate.Infrastructure.DbContexts
{
    public class ApplicationDbContext : IdentityDbContext<AppUser, AppRole, Guid>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<LoginLog> LoginLogs { get; set; }
        public DbSet<UserSettings> UserSettings { get; set; }
        public DbSet<Student> Students { get; set; }

        public override int SaveChanges()
        {
            ApplyAuditInfo();
            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            ApplyAuditInfo();
            return await base.SaveChangesAsync(true, cancellationToken);
        }

        private void ApplyAuditInfo()
        {
            var added = ChangeTracker.Entries<IAuditableEntity>().Where(E => E.State == EntityState.Added).ToList();
            added.ForEach(E =>
            {
                E.Property(x => x.CreatedAt).CurrentValue = DateTime.Now;
                E.Property(x => x.UpdatedAt).IsModified = true;
            });

            var modified = ChangeTracker.Entries<IAuditableEntity>().Where(E => E.State == EntityState.Modified).ToList();
            modified.ForEach(E =>
            {
                E.Property(x => x.UpdatedAt).CurrentValue = DateTime.Now;
                E.Property(x => x.UpdatedAt).IsModified = true;
                E.Property(x => x.CreatedAt).CurrentValue = E.Property(x => x.CreatedAt).OriginalValue;
                E.Property(x => x.CreatedAt).IsModified = false;
            });
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.Entity<LoginLog>()
                .HasOne(l => l.User)
                .WithMany(u => u.LoginLogs)
                .HasForeignKey(l => l.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<UserSettings>()
                .HasOne(s => s.User)
                .WithOne(u => u.Settings)
                .HasForeignKey<UserSettings>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<Student>()
                .HasIndex(s => s.StudentCode)
                .IsUnique();

            builder.Entity<Student>()
                .HasIndex(s => s.Email)
                .IsUnique();

            base.OnModelCreating(builder);
            builder.Seed();
        }
    }
}
