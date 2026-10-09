using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

namespace ReactDotnetBoilerplate.Api.Extensions
{
    public static class ServiceCollectionExtensions
    {
        internal static void AddCorsExtensions(this IServiceCollection service)
        {
            service.AddCors(options =>
            {
                options.AddPolicy(name: "ReactDotnetBoilerplate",
                    policy =>
                    {
                        policy.WithOrigins(
                                "http://localhost:3000",
                                "http://localhost:3001",
                                "http://localhost:5173",
                                "http://localhost:5174",
                                "http://127.0.0.1:3000",
                                "http://127.0.0.1:3001",
                                "http://127.0.0.1:5173",
                                "http://127.0.0.1:5174")
                            .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
                            .WithHeaders(
                                "Authorization",
                                "Content-Type",
                                "Accept",
                                "X-Requested-With",
                                "Origin")
                            .AllowCredentials()
                            .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
                    });
            });
        }

        internal static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<ReactDotnetBoilerplate.Infrastructure.DbContexts.ApplicationDbContext>(options =>
            {
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
            });
            return services;
        }
    }
}
