using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Auth;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth;
using ReactDotnetBoilerplate.Common.Constants;
using ReactDotnetBoilerplate.Domain.Identity;
using ReactDotnetBoilerplate.Domain.Wrappers;
using ReactDotnetBoilerplate.Infrastructure.DbContexts;
using ReactDotnetBoilerplate.Infrastructure.Services.Token;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace ReactDotnetBoilerplate.Infrastructure.Services.Auth
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly SignInManager<AppUser> _signInManager;
        private readonly ITokenService _tokenService;
        private readonly RoleManager<AppRole> _roleManager;
        private readonly ApplicationDbContext _dbContext;
        private readonly IConfiguration _configuration;

        public AuthService(
            UserManager<AppUser> userManager,
            SignInManager<AppUser> signInManager,
            ITokenService tokenService,
            RoleManager<AppRole> roleManager,
            ApplicationDbContext dbContext,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _tokenService = tokenService;
            _roleManager = roleManager;
            _dbContext = dbContext;
            _configuration = configuration;
        }

        public async Task<Result<AuthResponse>> OAuthLoginAsync(OAuthLoginRequest request, HttpContext httpContext)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email))
            {
                return await Result<AuthResponse>.FailAsync("Email không hợp lệ");
            }

            // 1. Verify Google ID Token (if provider is Google)
            if (request.Provider.Equals("Google", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(request.IdToken))
                {
                    return await Result<AuthResponse>.FailAsync("ID Token is required for Google login.");
                }

                try
                {
                    var settings = new GoogleJsonWebSignature.ValidationSettings
                    {
                        Audience = new[] { _configuration["Authentication:Google:ClientId"] }
                    };

                    var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);

                    if (!payload.EmailVerified)
                    {
                        return await Result<AuthResponse>.FailAsync("Google email is not verified.");
                    }

                    if (payload.Issuer != "accounts.google.com" && payload.Issuer != "https://accounts.google.com")
                    {
                        return await Result<AuthResponse>.FailAsync("Invalid token issuer.");
                    }

                    if (!string.Equals(payload.Email, request.Email, StringComparison.OrdinalIgnoreCase))
                    {
                        return await Result<AuthResponse>.FailAsync("Token email does not match request email.");
                    }
                }
                catch (InvalidJwtException ex)
                {
                    return await Result<AuthResponse>.FailAsync($"Invalid Google ID Token: {ex.Message}");
                }
                catch (Exception ex)
                {
                    return await Result<AuthResponse>.FailAsync($"Token validation failed: {ex.Message}");
                }
            }

            // Find existing user or create new one
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null)
            {
                // Create new user
                var (firstName, lastName) = ParseName(request.Name);
                user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    UserName = request.Email,
                    Email = request.Email,
                    FirstName = firstName,
                    LastName = lastName,
                    IsActive = true,
                    Avatar = request.Image,
                    CreatedAt = DateTimeOffset.UtcNow,
                };

                var createResult = await _userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    var errors = createResult.Errors.Select(e => e.Description).ToList();
                    return await Result<AuthResponse>.FailAsync(errors);
                }

                await _userManager.AddToRoleAsync(user, Roles.User);
            }
            else
            {
                // Update existing user info
                var (firstName, lastName) = ParseName(request.Name);
                if (!string.IsNullOrWhiteSpace(firstName))
                {
                    user.FirstName = firstName;
                }
                if (!string.IsNullOrWhiteSpace(lastName))
                {
                    user.LastName = lastName;
                }

                if (!string.IsNullOrWhiteSpace(request.Image))
                {
                    user.Avatar = request.Image;
                }

                user.LastLoginDate = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
            }

            // Add login info
            var loginInfo = new UserLoginInfo(request.Provider, request.ProviderId, request.Provider);
            await _userManager.AddLoginAsync(user, loginInfo);

            // Generate tokens
            var (token, refreshToken) = await GenerateTokensAsync(user);
            SetRefreshTokenCookie(httpContext, $"{user.Id}:{refreshToken}");

            // Record login
            await RecordLoginLogAsync(user.Id, true, httpContext);

            var authResponse = new AuthResponse
            {
                Token = token,
                RefreshToken = null,
                User = await MapToUserResponseAsync(user)
            };

            return await Result<AuthResponse>.SuccessAsync(authResponse, "Đăng nhập thành công!");
        }

        public async Task<Result<AuthenticatedResponse>> RegisterAsync(RegisterRequest request, HttpContext httpContext)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.FirstName) ||
                string.IsNullOrWhiteSpace(request.LastName) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return await Result<AuthenticatedResponse>.FailAsync("Hãy nhập đầy đủ thông tin");
            }

            var existingUser = await _userManager.FindByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return await Result<AuthenticatedResponse>.FailAsync("Email đã tồn tại.");
            }

            const string DefaultUserImage = "/uploads/avatars/776a0dab-c2a6-4604-a21c-95643709bd3e.png";

            var user = new AppUser
            {
                UserName = request.Email,
                Email = request.Email,
                FirstName = request.FirstName,
                LastName = request.LastName,
                IsActive = true,
                Avatar = DefaultUserImage,
                CreatedAt = DateTimeOffset.UtcNow,
            };

            var result = await _userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => TranslateIdentityError(e.Description)).ToList();
                return await Result<AuthenticatedResponse>.FailAsync(errors);
            }

            await _userManager.AddToRoleAsync(user, Roles.User);

            var claims = new[]
            {
                new Claim(UserClaims.Id, user.Id.ToString()),
                new Claim(UserClaims.FirstName, user.FirstName),
                new Claim(UserClaims.LastName, user.LastName),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(UserClaims.Roles, Roles.User),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var accessToken = _tokenService.GenerateAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();

            user.RefreshToken = BCrypt.Net.BCrypt.HashPassword(refreshToken);
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);
            SetRefreshTokenCookie(httpContext, $"{user.Id}:{refreshToken}");

            var response = new AuthenticatedResponse { Token = accessToken };
            return await Result<AuthenticatedResponse>.SuccessAsync(response, "Đăng ký thành công.");
        }

        public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, HttpContext httpContext)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return await Result<AuthResponse>.FailAsync("Hãy nhập đầy đủ thông tin");
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return await Result<AuthResponse>.FailAsync("Email không đúng");
            }

            if (!user.IsActive || user.LockoutEnabled)
            {
                return await Result<AuthResponse>.FailAsync("Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
            if (!result.Succeeded)
            {
                return await Result<AuthResponse>.FailAsync("Email hoặc mật khẩu không đúng.");
            }

            var roleNames = await _userManager.GetRolesAsync(user);
            var loginInfo = new UserLoginInfo(
                loginProvider: user.Email ?? string.Empty,
                providerKey: DateTime.Now.ToString(),
                displayName: user.GetFullName()
            );
            await _userManager.AddLoginAsync(user, loginInfo);

            var (token, refreshToken) = await GenerateTokensAsync(user);
            SetRefreshTokenCookie(httpContext, $"{user.Id}:{refreshToken}");

            var response = new AuthResponse
            {
                Token = token,
                RefreshToken = null,
                User = await MapToUserResponseAsync(user),
            };

            await RecordLoginLogAsync(user.Id, true, httpContext);

            return await Result<AuthResponse>.SuccessAsync(response, "Đăng nhập thành công!");
        }

        public async Task<Result<AuthResponse>> RefreshAsync(HttpRequest request)
        {
            var cookieToken = request.Cookies["refreshToken"];
            if (string.IsNullOrEmpty(cookieToken))
                return await Result<AuthResponse>.FailAsync("No refresh token provided");

            string userIdStr;
            string refreshToken;

            if (cookieToken.Contains(":"))
            {
                var parts = cookieToken.Split(':');
                if (parts.Length != 2)
                    return await Result<AuthResponse>.FailAsync("Invalid token format");
                userIdStr = parts[0];
                refreshToken = parts[1];
            }
            else
            {
                userIdStr = string.Empty;
                refreshToken = string.Empty;

                var authHeader = request.Headers["Authorization"].ToString();
                if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var accessToken = authHeader["Bearer ".Length..].Trim();
                    if (!string.IsNullOrWhiteSpace(accessToken))
                    {
                        try
                        {
                            var principal = _tokenService.GetPrincipalFromExpiredToken(accessToken);
                            var idClaim = principal.FindFirst("id")?.Value ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                            if (!string.IsNullOrWhiteSpace(idClaim))
                            {
                                userIdStr = idClaim;
                                refreshToken = cookieToken;
                            }
                        }
                        catch { }
                    }
                }

                if (string.IsNullOrWhiteSpace(userIdStr) || string.IsNullOrWhiteSpace(refreshToken))
                {
                    var userOld = await _dbContext.Users.FirstOrDefaultAsync(u => u.RefreshToken == cookieToken);
                    if (userOld != null && userOld.RefreshTokenExpiryTime >= DateTime.UtcNow)
                    {
                        var (newAccessToken, newRefreshToken) = await GenerateTokensAsync(userOld);
                        return await Result<AuthResponse>.SuccessAsync(
                            new AuthResponse
                            {
                                Token = newAccessToken,
                                RefreshToken = null,
                                User = await MapToUserResponseAsync(userOld)
                            },
                            "ok");
                    }
                    return await Result<AuthResponse>.FailAsync("Invalid refresh token format");
                }
            }

            var user = await _userManager.FindByIdAsync(userIdStr);
            if (user == null || user.RefreshTokenExpiryTime < DateTime.UtcNow)
                return await Result<AuthResponse>.FailAsync("Invalid refresh token or user not found");

            bool isRefreshTokenValid = false;
            try
            {
                isRefreshTokenValid = BCrypt.Net.BCrypt.Verify(refreshToken, user.RefreshToken);
            }
            catch
            {
                isRefreshTokenValid = (user.RefreshToken == refreshToken);
            }

            if (!isRefreshTokenValid)
                return await Result<AuthResponse>.FailAsync("Invalid refresh token");

            var (newToken, newRefreshTok) = await GenerateTokensAsync(user);

            var userResponse = new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                Role = (await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? Roles.User,
                RoleId = (await _roleManager.FindByNameAsync((await _userManager.GetRolesAsync(user)).FirstOrDefault() ?? Roles.User))?.Id
            };

            var response = new AuthResponse
            {
                Token = newToken,
                RefreshToken = null,
                User = userResponse
            };

            return await Result<AuthResponse>.SuccessAsync(response, "ok");
        }

        public async Task<Result<AuthResponse>> LogoutAsync(Guid userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return await Result<AuthResponse>.FailAsync("Người dùng không tồn tại.");
            }

            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userManager.UpdateAsync(user);

            return await Result<AuthResponse>.SuccessAsync(null, "Đăng xuất thành công.");
        }

        public async Task RecordLoginLogAsync(Guid userId, bool isSuccess, HttpContext httpContext)
        {
            try
            {
                var userAgent = httpContext.Request.Headers["User-Agent"].ToString();
                var ipAddress = httpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

                var log = new LoginLog
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    IPAddress = ipAddress,
                    Browser = userAgent,
                    DeviceType = userAgent.Contains("Mobi") ? "Mobile" : "Desktop",
                    DeviceName = userAgent,
                    IsSuccess = isSuccess,
                    Timestamp = DateTime.UtcNow
                };

                _dbContext.LoginLogs.Add(log);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Log but don't fail the login process
                Console.WriteLine($"Failed to record login log: {ex.Message}");
            }
        }

        // ========== HELPER METHODS ==========

        private (string firstName, string lastName) ParseName(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
            {
                return (string.Empty, string.Empty);
            }

            var parts = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0)
                return (string.Empty, string.Empty);

            if (parts.Length == 1)
                return (parts[0], string.Empty);

            return (parts[0], string.Join(' ', parts.Skip(1)));
        }

        private async Task<(string token, string refreshToken)> GenerateTokensAsync(AppUser user)
        {
            var roleNames = await _userManager.GetRolesAsync(user);
            var roleName = roleNames.FirstOrDefault() ?? Roles.User;
            var roleInfo = await _roleManager.FindByNameAsync(roleName);

            var token = _tokenService.GenerateToken(
                user.Id,
                user.Email ?? string.Empty,
                user.LastName,
                user.FirstName,
                user.Avatar ?? string.Empty,
                roleName,
                roleInfo?.Id.ToString() ?? string.Empty
            );

            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshToken = BCrypt.Net.BCrypt.HashPassword(refreshToken);
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);

            return (token, refreshToken);
        }

        private async Task<UserResponse> MapToUserResponseAsync(AppUser user)
        {
            var roles = await _userManager.GetRolesAsync(user);
            var roleName = roles.FirstOrDefault() ?? Roles.User;
            var roleInfo = await _roleManager.FindByNameAsync(roleName);

            return new UserResponse
            {
                Id = user.Id,
                Email = user.Email,
                Role = roleName,
                RoleId = roleInfo?.Id
            };
        }

        private void SetRefreshTokenCookie(HttpContext httpContext, string token)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = httpContext.Request.IsHttps,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.UtcNow.AddDays(30),
                Path = "/"
            };

            httpContext.Response.Cookies.Append("refreshToken", token, cookieOptions);
        }

        public string TranslateIdentityError(string error)
        {
            return error switch
            {
                "PasswordTooShort" => "Mật khẩu quá ngắn. Mật khẩu phải có ít nhất 6 ký tự.",
                "PasswordRequiresNonAlphanumeric" => "Mật khẩu phải chứa ít nhất một ký tự không phải chữ số.",
                "PasswordRequiresDigit" => "Mật khẩu phải chứa ít nhất một chữ số.",
                "PasswordRequiresLower" => "Mật khẩu phải chứa ít nhất một chữ cái thường.",
                "PasswordRequiresUpper" => "Mật khẩu phải chứa ít nhất một chữ cái hoa.",
                "DuplicateUserName" => "Tên người dùng đã tồn tại.",
                "DuplicateEmail" => "Email đã tồn tại.",
                "InvalidUserName" => "Tên người dùng không hợp lệ.",
                _ => error
            };
        }

        // ========== NEW SERVICE METHODS EXTRACTED FROM CONTROLLER ==========

        public async Task<Result<ProfileResponse>> GetCurrentUserAsync(Guid userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return await Result<ProfileResponse>.FailAsync("Người dùng không tồn tại.");
            }

            var roles = await _userManager.GetRolesAsync(user);

            return await Result<ProfileResponse>.SuccessAsync(new ProfileResponse
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                Avatar = user.Avatar,
                UserName = user.UserName,
                LastName = user.LastName,
                Role = roles.FirstOrDefault()
            }, "Lấy thông tin người dùng thành công.");
        }

        public async Task<Result<string>> ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return await Result<string>.FailAsync("Người dùng không tồn tại.");
            }

            var result = await _userManager.ChangePasswordAsync(user, currentPassword, newPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => TranslateIdentityError(e.Description)).ToList();
                return await Result<string>.FailAsync(errors);
            }

            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userManager.UpdateAsync(user);

            return await Result<string>.SuccessAsync("Đổi mật khẩu thành công, vui lòng đăng nhập lại.");
        }

        public async Task<Result<string>> UpdateAvatarAsync(Guid userId, IFormFile avatarFile, string wwwRootPath, string scheme, string host)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return await Result<string>.FailAsync("Người dùng không tồn tại.");
            }

            var uploadsFolder = Path.Combine(wwwRootPath, "uploads", "users");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            if (!string.IsNullOrWhiteSpace(user.Avatar))
            {
                var oldFilePath = Path.Combine(wwwRootPath, user.Avatar.TrimStart('/'));
                if (File.Exists(oldFilePath))
                {
                    File.Delete(oldFilePath);
                }
            }

            var fileName = $"{Guid.NewGuid()}{Path.GetExtension(avatarFile.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await avatarFile.CopyToAsync(stream);
            }

            var avatarUrl = $"/uploads/users/{fileName}";
            user.Avatar = avatarUrl;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return await Result<string>.FailAsync(errors);
            }

            return await Result<string>.SuccessAsync("Cập nhật Avatar thành công.");
        }

        public async Task<Result<ProfileResponse>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return await Result<ProfileResponse>.FailAsync("Người dùng không tồn tại.");
            }

            if (user.Email != request.Email)
            {
                var existingUser = await _userManager.FindByEmailAsync(request.Email);
                if (existingUser != null && existingUser.Id != user.Id)
                {
                    return await Result<ProfileResponse>.FailAsync("Email đã được sử dụng bởi tài khoản khác.");
                }
            }

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Email = request.Email;
            user.UserName = request.Email;
            user.PhoneNumber = request.PhoneNumber;
            user.UpdatedAt = DateTimeOffset.UtcNow;

            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => TranslateIdentityError(e.Description)).ToList();
                return await Result<ProfileResponse>.FailAsync(errors);
            }

            var roles = await _userManager.GetRolesAsync(user);

            return await Result<ProfileResponse>.SuccessAsync(new ProfileResponse
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                Avatar = user.Avatar,
                UserName = user.UserName,
                LastName = user.LastName,
                Role = roles.FirstOrDefault()
            }, "Cập nhật thông tin thành công.");
        }

        public async Task<Result<string>> DeleteAccountAsync(Guid userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
            {
                return await Result<string>.FailAsync("Người dùng không tồn tại.");
            }

            var result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description).ToList();
                return await Result<string>.FailAsync(errors);
            }

            return await Result<string>.SuccessAsync("Xóa tài khoản thành công.");
        }

        public async Task<Result<string>> ForgotPasswordAsync(string email, IServiceProvider serviceProvider)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                return await Result<string>.SuccessAsync("Nếu email tồn tại, mã xác nhận đã được gửi.");
            }

            // Note: MemoryCache and EmailService usage requires controller-level coordination
            // This method returns a specific message to trigger email sending in controller
            return await Result<string>.SuccessAsync("RESET_OTP_REQUIRED", "Mã xác nhận đã được gửi đến email của bạn.");
        }

        public async Task<Result<string>> VerifyOtpAsync(string email, string otp)
        {
            // Note: This is a placeholder. Actual OTP verification uses MemoryCache
            // The controller handles cache operations, this method provides the service interface
            return await Result<string>.SuccessAsync(Guid.NewGuid().ToString(), "Xác thực thành công.");
        }

        public async Task<Result<string>> ResetPasswordAsync(string email, string resetToken, string newPassword)
        {
            var user = await _userManager.FindByEmailAsync(email);
            if (user == null)
            {
                return await Result<string>.FailAsync("Người dùng không tồn tại.");
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var resetResult = await _userManager.ResetPasswordAsync(user, token, newPassword);

            if (!resetResult.Succeeded)
            {
                var errors = resetResult.Errors.Select(e => TranslateIdentityError(e.Description)).ToList();
                return await Result<string>.FailAsync(errors);
            }

            return await Result<string>.SuccessAsync("Đặt lại mật khẩu thành công.");
        }
    }
}
