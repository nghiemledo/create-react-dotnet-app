using ReactDotnetBoilerplate.Common.Enums;

namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Student
{
    public class StudentResponse
    {
        public Guid Id { get; set; }
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateOnly DateOfBirth { get; set; }
        public StudentGender Gender { get; set; }
        public int ClassId { get; set; }
        public string? ClassName { get; set; }
        public StudentStatus Status { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? UpdatedAt { get; set; }
    }
}
