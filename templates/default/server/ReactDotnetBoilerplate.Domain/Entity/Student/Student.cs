using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ReactDotnetBoilerplate.Common.Enums;
using ReactDotnetBoilerplate.Domain.Base;

namespace ReactDotnetBoilerplate.Domain.Entity.Student
{
    [Table("Students")]
    public class Student : AuditableEntity<Guid>
    {
        [Required]
        [MaxLength(30)]
        public string StudentCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(120)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Phone { get; set; }

        public DateOnly DateOfBirth { get; set; }

        public StudentGender Gender { get; set; } = StudentGender.MALE;

        public int ClassId { get; set; }

        [MaxLength(100)]
        public string? ClassName { get; set; }

        public StudentStatus Status { get; set; } = StudentStatus.ACTIVE;
    }
}
