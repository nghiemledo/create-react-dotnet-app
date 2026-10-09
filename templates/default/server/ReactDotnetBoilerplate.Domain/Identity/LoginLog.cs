using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ReactDotnetBoilerplate.Domain.Identity
{
    [Table("LoginLogs")]
    public class LoginLog
    {
        [Key]
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual AppUser User { get; set; } = null!;

        [MaxLength(45)]
        public string IPAddress { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? DeviceType { get; set; } // Desktop, Mobile

        [MaxLength(100)]
        public string? DeviceName { get; set; } // e.g., Windows PC, iPhone 14

        [MaxLength(100)]
        public string? Browser { get; set; }

        [MaxLength(255)]
        public string? Location { get; set; }

        public bool IsSuccess { get; set; }

        [MaxLength(500)]
        public string? RefreshToken { get; set; }
        public bool IsRevoked { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
