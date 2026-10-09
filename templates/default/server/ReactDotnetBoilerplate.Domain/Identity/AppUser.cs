using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ReactDotnetBoilerplate.Domain.Identity
{
    [Table("AppUsers")]
    public class AppUser : IdentityUser<Guid>
    {
        [Required]
        [MaxLength(20)]
        public required string FirstName { get; set; }

        [Required]
        [MaxLength(30)]
        public required string LastName { get; set; }

        public DateTimeOffset? DateOfBirth { get; set; }
        public bool IsActive { get; set; }
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiryTime { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
        public DateTime? Dob { get; set; }

        [MaxLength(1200)]
        public string? Avatar { get; set; }
        public DateTime? VipStartDate { get; set; }
        public DateTime? VipExpireDate { get; set; }
        public DateTime? LastLoginDate { get; set; }
        public string? GitHubUserName { get; set; }
        public string? LinkelnProfile { get; set; }
        public string? TwitterHandle { get; set; }
        public string? WebsiteUrl { get; set; }
        public string? Address { get; set; }
        public string? Introduction { get; set; }

        // Navigation Properties
        public virtual ICollection<LoginLog> LoginLogs { get; set; } = new List<LoginLog>();
        public virtual UserSettings Settings { get; set; } = null!;

        public string GetFullName()
        {
            return this.FirstName + " " + this.LastName;
        }
    }
}
