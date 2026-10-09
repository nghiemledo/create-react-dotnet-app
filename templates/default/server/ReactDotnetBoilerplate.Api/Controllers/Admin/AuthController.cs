using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Auth;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth;
using ReactDotnetBoilerplate.Application.Interfaces;
using ReactDotnetBoilerplate.Common.Constants;
using ReactDotnetBoilerplate.Domain.Identity;
using ReactDotnetBoilerplate.Domain.Wrappers;
using ReactDotnetBoilerplate.Infrastructure.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;

namespace ReactDotnetBoilerplate.Api.Controllers.Admin
{
    [Route("v1/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly UserManager<AppUser> _userManager;
        private readonly SignInManager<AppUser> _signInManager;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMemoryCache _memoryCache;

        public AuthController(
            IAuthService authService,
            UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager,
            IServiceScopeFactory scopeFactory,
            IMemoryCache memoryCache)
        {
            _authService = authService;
            _userManager = userManager;
            _signInManager = signInManager;
            _scopeFactory = scopeFactory;
            _memoryCache = memoryCache;
        }

        private Guid GetCurrentUserId()
        {
            var userId = User.FindFirstValue(UserClaims.Id);
            if (string.IsNullOrEmpty(userId) || !Guid.TryParse(userId, out var userGuid))
                throw new UnauthorizedAccessException("Không tìm thấy thông tin người dùng.");
            return userGuid;
        }

        [HttpPost("oauth")]
        public async Task<ActionResult<Result<AuthResponse>>> OAuthLogin([FromBody] OAuthLoginRequest request)
        {
            var result = await _authService.OAuthLoginAsync(request, HttpContext);
            if (!result.Status)
                return BadRequest(result);

            SetRefreshTokenCookie(result.Data!.Token);
            return Ok(result);
        }

        [HttpPost("register")]
        public async Task<ActionResult<Result<AuthenticatedResponse>>> Register([FromBody] RegisterRequest request)
        {
            var result = await _authService.RegisterAsync(request, HttpContext);
            if (!result.Status)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<ActionResult<Result<AuthResponse>>> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request, HttpContext);
            if (!result.Status)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("refresh")]
        public async Task<ActionResult<Result<AuthResponse>>> Refresh()
        {
            var result = await _authService.RefreshAsync(Request);
            if (!result.Status)
                return Unauthorized(result);

            return Ok(result);
        }

        private void SetRefreshTokenCookie(string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(30),
                Path = "/"
            };

            Response.Cookies.Append("refreshToken", token, cookieOptions);
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<ActionResult<Result<ProfileResponse>>> GetCurrentUser()
        {
            var userId = GetCurrentUserId();
            var result = await _authService.GetCurrentUserAsync(userId);
            if (!result.Status)
                return Unauthorized(result);
            return Ok(result);
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<ActionResult<Result<string>>> Logout()
        {
            var userId = GetCurrentUserId();
            var result = await _authService.LogoutAsync(userId);
            if (!result.Status)
                return BadRequest(result);

            Response.Cookies.Delete("refreshToken");
            return Ok(result);
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<ActionResult<Result<string>>> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(await Result<string>.FailAsync("Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới."));

            var userId = GetCurrentUserId();
            var result = await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
            if (!result.Status)
                return BadRequest(result);

            return Ok(result);
        }

        [Authorize]
        [HttpPost("update-avatar")]
        [Consumes("multipart/form-data")]
        public async Task<ActionResult<Result<string>>> UpdateAvatar([FromForm] UpdateAvatarRequest request)
        {
            if (request.AvatarFile == null || request.AvatarFile.Length == 0)
                return BadRequest(await Result<string>.FailAsync("Vui lòng chọn file ảnh để upload."));

            var userId = GetCurrentUserId();
            var wwwRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var result = await _authService.UpdateAvatarAsync(userId, request.AvatarFile, wwwRootPath, Request.Scheme, Request.Host.ToString());
            if (!result.Status)
                return BadRequest(result);

            return Ok(result);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<ActionResult<Result<ProfileResponse>>> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) || string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(await Result<ProfileResponse>.FailAsync("Vui lòng nhập đầy đủ thông tin."));

            var userId = GetCurrentUserId();
            var result = await _authService.UpdateProfileAsync(userId, request);
            if (!result.Status)
                return BadRequest(result);

            return Ok(result);
        }

        [Authorize]
        [HttpDelete("delete")]
        public async Task<ActionResult<Result<string>>> DeleteAccount()
        {
            var userId = GetCurrentUserId();
            var result = await _authService.DeleteAccountAsync(userId);
            if (!result.Status)
                return BadRequest(result);

            await _signInManager.SignOutAsync();
            return Ok(result);
        }

        [HttpPost("forgot-password")]
        public async Task<ActionResult<Result<string>>> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(await Result<string>.FailAsync("Vui lòng nhập email."));

            // Rate Limit: 1 request per minute per email
            var rateLimitKey = $"RateLimit:ForgotPassword:{request.Email}";
            if (_memoryCache.TryGetValue(rateLimitKey, out _))
                return StatusCode(429, await Result<string>.FailAsync("Vui lòng đợi 1 phút trước khi gửi lại yêu cầu."));

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
                return Ok(await Result<string>.SuccessAsync("Nếu email tồn tại, mã xác nhận đã được gửi."));

            // Generate OTP
            var otp = new Random().Next(100000, 999999).ToString();

            // Save OTP to cache (5 minutes)
            var otpKey = $"OTP:{request.Email}";
            _memoryCache.Set(otpKey, otp, TimeSpan.FromMinutes(5));

            // Set Rate Limit (1 minute)
            _memoryCache.Set(rateLimitKey, true, TimeSpan.FromMinutes(1));

            // Send OTP Email (Background Task - Fire and Forget)
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
                    var userName = $"{user.LastName} {user.FirstName}";
                    await emailService.SendOtpEmailAsync(request.Email, userName, otp);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[EMAIL BACKGROUND TASK ERROR] {ex.Message}");
                }
            });

            return Ok(await Result<string>.SuccessAsync("Mã xác nhận đã được gửi đến email của bạn."));
        }

        [HttpPost("verify-otp")]
        public async Task<ActionResult<Result<string>>> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
                return BadRequest(await Result<string>.FailAsync("Email và mã OTP là bắt buộc."));

            var otpKey = $"OTP:{request.Email}";
            if (!_memoryCache.TryGetValue(otpKey, out string? cachedOtp) || cachedOtp != request.Otp)
                return BadRequest(await Result<string>.FailAsync("Mã OTP không chính xác hoặc đã hết hạn."));

            // OTP is valid. Generate ResetToken for Step 3.
            var resetToken = Guid.NewGuid().ToString();
            var resetTokenKey = $"ResetToken:{resetToken}";

            // Save ResetToken -> Email (5 minutes)
            _memoryCache.Set(resetTokenKey, request.Email, TimeSpan.FromMinutes(5));

            // Remove OTP to prevent reuse (optional, but good for security)
            _memoryCache.Remove(otpKey);

            return Ok(await Result<string>.SuccessAsync(resetToken, "Xác thực thành công."));
        }

        [HttpPost("reset-password")]
        public async Task<ActionResult<Result<string>>> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.ResetToken) || string.IsNullOrWhiteSpace(request.NewPassword))
                return BadRequest(await Result<string>.FailAsync("Thông tin không hợp lệ."));

            var resetTokenKey = $"ResetToken:{request.ResetToken}";
            if (!_memoryCache.TryGetValue(resetTokenKey, out string? cachedEmail) || cachedEmail != request.Email)
                return BadRequest(await Result<string>.FailAsync("Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng thử lại từ đầu."));

            var result = await _authService.ResetPasswordAsync(request.Email, request.ResetToken, request.NewPassword);
            if (!result.Status)
                return BadRequest(result);

            // Invalidate ResetToken
            _memoryCache.Remove(resetTokenKey);

            return Ok(result);
        }
    }
}
