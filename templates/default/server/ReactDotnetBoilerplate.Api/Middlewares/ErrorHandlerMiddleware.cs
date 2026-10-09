using ReactDotnetBoilerplate.Application.Exceptions;
using ReactDotnetBoilerplate.Domain.Wrappers;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;

namespace ReactDotnetBoilerplate.Api.Middlewares
{
    public class ErrorHandlerMiddleware
    {
        private const string CorsPolicyName = "ReactDotnetBoilerplate";
        private readonly RequestDelegate _next;

        public ErrorHandlerMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception error)
            {
                var response = context.Response;
                if (response.HasStarted)
                {
                    throw;
                }

                ApplyCorsHeadersForErrorResponse(context);

                response.ContentType = "application/json";
                var responseModel = await Result<string>.FailAsync(error.Message);

                switch (error)
                {
                    case ApiException:
                        response.StatusCode = (int)HttpStatusCode.BadRequest;
                        break;
                    case KeyNotFoundException:
                        response.StatusCode = (int)HttpStatusCode.NotFound;
                        break;
                    default:
                        response.StatusCode = (int)HttpStatusCode.InternalServerError;
                        break;
                }

                var option = new JsonSerializerOptions()
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var result = JsonSerializer.Serialize(responseModel, option);
                await response.WriteAsync(result);
            }
        }

        private static void ApplyCorsHeadersForErrorResponse(HttpContext context)
        {
            var origin = context.Request.Headers.Origin.ToString();
            if (string.IsNullOrEmpty(origin))
            {
                return;
            }

            var corsService = context.RequestServices.GetService<ICorsService>();
            var corsOptions = context.RequestServices.GetService<IOptions<CorsOptions>>()?.Value;
            if (corsService == null || corsOptions == null)
            {
                return;
            }

            var policy = corsOptions.GetPolicy(CorsPolicyName);
            if (policy == null)
            {
                return;
            }

            var corsResult = corsService.EvaluatePolicy(context, policy);
            corsService.ApplyResult(corsResult, context.Response);
        }
    }
}
