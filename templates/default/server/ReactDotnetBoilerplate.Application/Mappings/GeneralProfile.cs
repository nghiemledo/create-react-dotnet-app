using AutoMapper;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Role;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Requests.Student;
using ReactDotnetBoilerplate.Application.DataTransferObjects.Responses.Student;
using ReactDotnetBoilerplate.Domain.Identity;
using StudentEntity = ReactDotnetBoilerplate.Domain.Entity.Student.Student;

namespace ReactDotnetBoilerplate.Application.Mappings
{
    public class GeneralProfile : Profile
    {
        public GeneralProfile()
        {
            CreateMap<AppRole, CreateRoleRequest>();
            CreateMap<AppRole, UpdateRoleRequest>();

            CreateMap<CreateStudentRequest, StudentEntity>();
            CreateMap<UpdateStudentRequest, StudentEntity>();
            CreateMap<StudentEntity, StudentResponse>();
        }
    }
}
