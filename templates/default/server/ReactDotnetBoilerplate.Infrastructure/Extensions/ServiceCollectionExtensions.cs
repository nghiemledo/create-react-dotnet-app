using ReactDotnetBoilerplate.Infrastructure.DapperRepositories.Base;
using ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Base;
using ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Students;
using ReactDotnetBoilerplate.Infrastructure.Services.Auth;
using ReactDotnetBoilerplate.Infrastructure.Services.Student;
using Microsoft.Extensions.DependencyInjection;

namespace ReactDotnetBoilerplate.Infrastructure.Extensions
{
    public static class ServiceCollectionExtensions
    {
        public static void AddRepositories(this IServiceCollection services)
        {
            services.AddScoped<IDapperBase, DapperBase>();
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            services.AddScoped<IStudentRepository, StudentRepository>();
        }

        public static void AddApplicationServices(this IServiceCollection services)
        {
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IStudentService, StudentService>();
        }
    }
}
