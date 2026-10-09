using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactDotnetBoilerplate.Application.DataTransferObjects;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Student;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Student;
using ReactDotnetBoilerplate.Domain.Wrappers;
using ReactDotnetBoilerplate.Infrastructure.Services.Student;

namespace ReactDotnetBoilerplate.Api.Controllers.Student
{
    [Authorize]
    [Route("v1/students")]
    [ApiController]
    public class StudentController : ControllerBase
    {
        private const string StudentManagers = "SysAdmin,Admin,Teacher";
        private readonly IStudentService _studentService;

        public StudentController(IStudentService studentService)
        {
            _studentService = studentService;
        }

        [HttpGet]
        public async Task<ActionResult<Result<PagingResponse<StudentResponse>>>> GetList([FromQuery] StudentFilterRequest filter)
        {
            var result = await _studentService.GetListAsync(filter);
            if (!result.Status)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<ActionResult<Result<StudentResponse>>> GetById(Guid id)
        {
            var result = await _studentService.GetByIdAsync(id);
            if (!result.Status)
            {
                return NotFound(result);
            }

            return Ok(result);
        }

        [Authorize(Roles = StudentManagers)]
        [HttpPost]
        public async Task<ActionResult<Result<StudentResponse>>> Create([FromBody] CreateStudentRequest request)
        {
            var result = await _studentService.CreateAsync(request);
            if (!result.Status)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }

        [Authorize(Roles = StudentManagers)]
        [HttpPut("{id:guid}")]
        public async Task<ActionResult<Result<StudentResponse>>> Update(Guid id, [FromBody] UpdateStudentRequest request)
        {
            var result = await _studentService.UpdateAsync(id, request);
            if (!result.Status)
            {
                return result.Messages.Contains("Không tìm thấy sinh viên.")
                    ? NotFound(result)
                    : BadRequest(result);
            }

            return Ok(result);
        }

        [Authorize(Roles = StudentManagers)]
        [HttpDelete("{id:guid}")]
        public async Task<ActionResult<Result<string>>> Delete(Guid id)
        {
            var result = await _studentService.DeleteAsync(id);
            if (!result.Status)
            {
                return NotFound(result);
            }

            return Ok(result);
        }
    }
}
