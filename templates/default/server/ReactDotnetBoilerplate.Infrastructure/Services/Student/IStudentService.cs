using ReactDotnetBoilerplate.Application.DataTransferObjects;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Student;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Student;
using ReactDotnetBoilerplate.Domain.Wrappers;

namespace ReactDotnetBoilerplate.Infrastructure.Services.Student
{
    public interface IStudentService
    {
        Task<Result<PagingResponse<StudentResponse>>> GetListAsync(StudentFilterRequest filter);
        Task<Result<StudentResponse>> GetByIdAsync(Guid id);
        Task<Result<StudentResponse>> CreateAsync(CreateStudentRequest request);
        Task<Result<StudentResponse>> UpdateAsync(Guid id, UpdateStudentRequest request);
        Task<Result<string>> DeleteAsync(Guid id);
    }
}
