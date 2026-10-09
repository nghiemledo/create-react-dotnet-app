using Microsoft.AspNetCore.Http;

namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Auth
{
    public class UserResponse
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public Guid? RoleId { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class UpdateAvatarRequest
    {
        public IFormFile AvatarFile { get; set; } = null!;
    }
}
