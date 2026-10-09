using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ReactDotnetBoilerplate.Domain.Identity
{
    [Table("UserSettings")]
    public class UserSettings
    {
        [Key]
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual AppUser User { get; set; } = null!;

        [MaxLength(20)]
        public string Theme { get; set; } = "light"; // light, dark, system

        public bool DailyStudyReminders { get; set; } = true;
        public bool ExamResultNotifications { get; set; } = true;
        public bool NewsletterSubscription { get; set; } = false;
    }
}
