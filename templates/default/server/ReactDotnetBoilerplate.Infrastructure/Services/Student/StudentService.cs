using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ReactDotnetBoilerplate.Application.DataTransferObjects;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Student;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Student;
using ReactDotnetBoilerplate.Domain.Wrappers;
using ReactDotnetBoilerplate.Infrastructure.EFCoreRepositories.Students;
using StudentEntity = ReactDotnetBoilerplate.Domain.Entity.Student.Student;

namespace ReactDotnetBoilerplate.Infrastructure.Services.Student
{
    public class StudentService : IStudentService
    {
        private readonly IStudentRepository _studentRepository;
        private readonly IMapper _mapper;

        public StudentService(IStudentRepository studentRepository, IMapper mapper)
        {
            _studentRepository = studentRepository;
            _mapper = mapper;
        }

        public async Task<Result<PagingResponse<StudentResponse>>> GetListAsync(StudentFilterRequest filter)
        {
            var page = filter.Page < 1 ? 1 : filter.Page;
            var pageSize = filter.PageSize < 1 ? 10 : Math.Min(filter.PageSize, 100);

            var query = _studentRepository.Query();

            if (!string.IsNullOrWhiteSpace(filter.Keyword))
            {
                var keyword = filter.Keyword.Trim();
                query = query.Where(x =>
                    x.StudentCode.Contains(keyword) ||
                    x.FullName.Contains(keyword) ||
                    x.Email.Contains(keyword));
            }

            if (filter.ClassId.HasValue)
            {
                query = query.Where(x => x.ClassId == filter.ClassId.Value);
            }

            if (filter.Status.HasValue)
            {
                query = query.Where(x => x.Status == filter.Status.Value);
            }

            var totalItems = await query.CountAsync();
            var students = await query
                .OrderByDescending(x => x.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var data = new PagingResponse<StudentResponse>
            {
                Items = students.Select(MapToResponse).ToList(),
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                TotalPages = (int)Math.Ceiling(totalItems / (double)pageSize)
            };

            return await Result<PagingResponse<StudentResponse>>.SuccessAsync(data, "Đã lấy danh sách sinh viên.");
        }

        public async Task<Result<StudentResponse>> GetByIdAsync(Guid id)
        {
            var student = await _studentRepository.GetByIdAsync(id);
            if (student is null)
            {
                return await Result<StudentResponse>.FailAsync("Không tìm thấy sinh viên.");
            }

            return await Result<StudentResponse>.SuccessAsync(MapToResponse(student), "Đã lấy thông tin sinh viên.");
        }

        public async Task<Result<StudentResponse>> CreateAsync(CreateStudentRequest request)
        {
            var validationError = ValidateRequest(request.StudentCode, request.FullName, request.Email, request.ClassId, request.DateOfBirth);
            if (validationError is not null)
            {
                return await Result<StudentResponse>.FailAsync(validationError);
            }

            if (await _studentRepository.ExistsByStudentCodeAsync(request.StudentCode.Trim()))
            {
                return await Result<StudentResponse>.FailAsync("Mã sinh viên đã tồn tại.");
            }

            if (await _studentRepository.ExistsByEmailAsync(request.Email.Trim()))
            {
                return await Result<StudentResponse>.FailAsync("Email đã tồn tại.");
            }

            var student = _mapper.Map<StudentEntity>(request);
            student.Id = Guid.NewGuid();
            student.StudentCode = request.StudentCode.Trim();
            student.FullName = request.FullName.Trim();
            student.Email = request.Email.Trim();
            student.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
            student.ClassName = ResolveClassName(request.ClassName, request.ClassId);

            var created = await _studentRepository.CreateAsync(student);
            return await Result<StudentResponse>.SuccessAsync(MapToResponse(created), "Tạo sinh viên thành công.");
        }

        public async Task<Result<StudentResponse>> UpdateAsync(Guid id, UpdateStudentRequest request)
        {
            var student = await _studentRepository.GetByIdAsync(id);
            if (student is null)
            {
                return await Result<StudentResponse>.FailAsync("Không tìm thấy sinh viên.");
            }

            var validationError = ValidateRequest(request.StudentCode, request.FullName, request.Email, request.ClassId, request.DateOfBirth);
            if (validationError is not null)
            {
                return await Result<StudentResponse>.FailAsync(validationError);
            }

            if (await _studentRepository.ExistsByStudentCodeAsync(request.StudentCode.Trim(), id))
            {
                return await Result<StudentResponse>.FailAsync("Mã sinh viên đã tồn tại.");
            }

            if (await _studentRepository.ExistsByEmailAsync(request.Email.Trim(), id))
            {
                return await Result<StudentResponse>.FailAsync("Email đã tồn tại.");
            }

            student.StudentCode = request.StudentCode.Trim();
            student.FullName = request.FullName.Trim();
            student.Email = request.Email.Trim();
            student.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
            student.DateOfBirth = request.DateOfBirth;
            student.Gender = request.Gender;
            student.ClassId = request.ClassId;
            student.ClassName = ResolveClassName(request.ClassName, request.ClassId);
            student.Status = request.Status;

            var updated = await _studentRepository.UpdateAsync(student);
            return await Result<StudentResponse>.SuccessAsync(MapToResponse(updated), "Cập nhật sinh viên thành công.");
        }

        public async Task<Result<string>> DeleteAsync(Guid id)
        {
            var student = await _studentRepository.GetByIdAsync(id);
            if (student is null)
            {
                return await Result<string>.FailAsync("Không tìm thấy sinh viên.");
            }

            await _studentRepository.DeleteAsync(student);
            return await Result<string>.SuccessAsync("Xóa sinh viên thành công.");
        }

        private StudentResponse MapToResponse(StudentEntity student)
        {
            var response = _mapper.Map<StudentResponse>(student);
            response.ClassName = ResolveClassName(student.ClassName, student.ClassId);
            return response;
        }

        private static string ResolveClassName(string? className, int classId)
        {
            return string.IsNullOrWhiteSpace(className) ? $"Lớp {classId}" : className.Trim();
        }

        private static string? ValidateRequest(string studentCode, string fullName, string email, int classId, DateOnly dateOfBirth)
        {
            if (string.IsNullOrWhiteSpace(studentCode) || studentCode.Trim().Length < 3)
            {
                return "Mã sinh viên phải có ít nhất 3 ký tự.";
            }

            if (string.IsNullOrWhiteSpace(fullName) || fullName.Trim().Length < 2)
            {
                return "Vui lòng nhập họ và tên.";
            }

            if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            {
                return "Email không đúng định dạng.";
            }

            if (classId < 1)
            {
                return "Vui lòng chọn lớp học.";
            }

            if (dateOfBirth == default || dateOfBirth > DateOnly.FromDateTime(DateTime.Today))
            {
                return "Ngày sinh không hợp lệ.";
            }

            return null;
        }
    }
}
