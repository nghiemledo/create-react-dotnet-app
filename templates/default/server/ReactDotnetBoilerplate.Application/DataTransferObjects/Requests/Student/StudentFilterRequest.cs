using ReactDotnetBoilerplate.Common.Enums;

namespace ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Student
{
    public class StudentFilterRequest
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Keyword { get; set; }
        public int? ClassId { get; set; }
        public StudentStatus? Status { get; set; }
    }
}
