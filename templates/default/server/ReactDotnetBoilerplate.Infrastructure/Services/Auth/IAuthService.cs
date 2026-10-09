using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Auth;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth;
using ReactDotnetBoilerplate.Domain.Wrappers;
using Microsoft.AspNetCore.Http;

namespace ReactDotnetBoilerplate.Infrastructure.Services.Auth
{
    public interface IAuthService
    {
        Task<Result<AuthResponse>> OAuthLoginAsync(OAuthLoginRequest request, HttpContext httpContext);
        Task<Result<AuthenticatedResponse>> RegisterAsync(RegisterRequest request, HttpContext httpContext);
        Task<Result<AuthResponse>> LoginAsync(LoginRequest request, HttpContext httpContext);
        Task<Result<AuthResponse>> RefreshAsync(HttpRequest request);
        Task<Result<AuthResponse>> LogoutAsync(Guid userId);
        Task RecordLoginLogAsync(Guid userId, bool isSuccess, HttpContext httpContext);

        // Additional methods extracted from AuthController
        Task<Result<ProfileResponse>> GetCurrentUserAsync(Guid userId);
        Task<Result<string>> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
        Task<Result<string>> UpdateAvatarAsync(Guid userId, IFormFile avatarFile, string wwwRootPath, string scheme, string host);
        Task<Result<ProfileResponse>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
        Task<Result<string>> DeleteAccountAsync(Guid userId);
        Task<Result<string>> ForgotPasswordAsync(string email, IServiceProvider serviceProvider);
        Task<Result<string>> VerifyOtpAsync(string email, string otp);
        Task<Result<string>> ResetPasswordAsync(string email, string resetToken, string newPassword);
        string TranslateIdentityError(string error);
    }
}
