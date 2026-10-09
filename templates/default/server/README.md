# 🖥️ Hướng Dẫn Server (Backend)

> Backend Web API xây dựng trên nền tảng **.NET 9**, kiến trúc **Clean Architecture 4 lớp** (Domain, Application, Infrastructure, Api) kết hợp với **ASP.NET Core Identity**, **JWT Bearer Token**, **Entity Framework Core 9** và **Dapper**.

---

## 🛠️ Công Nghệ & Thư Viện Sử Dụng

![.NET 9](https://img.shields.io/badge/.NET_9.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23_13-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![ASP.NET Core Web API](https://img.shields.io/badge/ASP.NET_Core_Web_API-512BD4?style=for-the-badge&logo=.net&logoColor=white)
![Entity Framework Core](https://img.shields.io/badge/EF_Core_9-512BD4?style=for-the-badge&logoColor=white)
![Dapper](https://img.shields.io/badge/Dapper-black?style=for-the-badge&logoColor=white)
![ASP.NET Identity](https://img.shields.io/badge/ASP.NET_Identity-0078D7?style=for-the-badge&logo=microsoft&logoColor=white)
![JWT Bearer](https://img.shields.io/badge/JWT_Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![AutoMapper](https://img.shields.io/badge/AutoMapper-CC292B?style=for-the-badge&logoColor=white)
![Swagger UI](https://img.shields.io/badge/Swagger_OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![SQL Server](https://img.shields.io/badge/SQL_Server_LocalDB-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)

---

## 🏛️ Kiến Trúc Clean Architecture (4 Lớp)

Dự án tuân theo quy tắc phụ thuộc (Dependency Inversion Principle) — các lớp bên trong không phụ thuộc vào các lớp bên ngoài:

```text
               +-----------------------------+
               |        4. API Layer         | (Controllers, Middlewares, Swagger)
               +--------------+--------------+
                              |
                              v
               +-----------------------------+
               |   3. Infrastructure Layer   | (DbContext, Repositories, Services, Seed)
               +--------------+--------------+
                              |
                              v
               +-----------------------------+
               |    2. Application Layer     | (DTOs, Mapping Profiles, Exceptions)
               +--------------+--------------+
                              |
                              v
               +-----------------------------+
               |       1. Domain Layer       | (Entities, Base Auditable, Wrappers)
               +-----------------------------+
```

### Chi tiết từng Project trong Solution:

```text
server/
├── ReactDotnetBoilerplate.Domain/          # [1. Core Domain]
│   ├── Base/                               # AuditableEntity<TId>, IEntity, NonAuditableEntity
│   ├── Entity/                             # Các bảng cơ sở dữ liệu (Student, Course...)
│   ├── Identity/                           # AppUser, AppRole, UserSettings, LoginLog
│   └── Wrappers/                           # Result<T>, IResult, PagedResult (Chuẩn API response)
│
├── ReactDotnetBoilerplate.Application/     # [2. Use Cases & Contract]
│   ├── DataTransferObjects/                # DTOs: Requests và Responses
│   │   ├── Requests/                       # CreateStudentRequest, StudentFilterRequest...
│   │   └── Responses/                      # StudentResponse, AuthResponse, ProfileResponse...
│   ├── Exceptions/                         # ApiException, Custom Exceptions
│   ├── Interfaces/                         # Interfaces dùng chung (IEmailService...)
│   └── Mappings/                           # GeneralProfile.cs (AutoMapper cấu hình ánh xạ)
│
├── ReactDotnetBoilerplate.Infrastructure/  # [3. Database & External Implementations]
│   ├── DbContexts/                         # ApplicationDbContext (EF Core cấu hình quan hệ & Index)
│   ├── EFCoreRepositories/                 # GenericRepository<T> và Custom Repositories (StudentRepository)
│   ├── DapperRepositories/                 # DapperBase và các repository truy vấn hiệu năng cao
│   ├── Extensions/                         # ServiceCollectionExtensions, DataSeeder, ModelBuilder
│   └── Services/                           # Triển khai Service: AuthService, StudentService, TokenService
│
├── ReactDotnetBoilerplate.Api/             # [4. Presentation / Web API]
│   ├── Controllers/                        # AuthController (/v1/auth), StudentController (/v1/students)
│   ├── Filters/                            # ValidateModelAttribute
│   ├── Middlewares/                        # ErrorHandlerMiddleware (Bắt lỗi toàn cục trả về Result.Fail)
│   ├── appsettings.json                    # Cấu hình ConnectionString, JWT, Email, RateLimiting
│   └── Program.cs                          # Cấu hình DI, Authentication, CORS, Swagger, Pipeline
│
└── ReactDotnetBoilerplate.Common/          # [Shared Utilities]
    ├── Constants/                          # Roles.cs, UserClaims.cs
    ├── Enums/                              # StudentStatus, StudentGender, Status
    └── Helpers/                            # StringHelper, PasswordHelper, SlugHelper
```

---

## ⚙️ Cấu Hình & Khởi Chạy (Getting Started)

### 1. Yêu cầu môi trường
* **.NET 9 SDK** (`dotnet --version` ➔ `9.x.x`)
* **SQL Server LocalDB** (mặc định có sẵn khi cài Visual Studio) hoặc **SQL Server Express**

### 2. Cấu hình Chuỗi Kết Nối & JWT (`appsettings.json`)

Tệp cấu hình nằm tại `ReactDotnetBoilerplate.Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=(localdb)\\mssqllocaldb;Database=ReactDotnetBoilerplateDb;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
  },
  "Jwt": {
    "Key": "<generated-per-project>",
    "Issuer": "https://localhost:7001",
    "ExpireInHours": "24"
  }
}
```

### 3. Lệnh Khởi Chạy Server

```bash
# Di chuyển vào thư mục server
cd server

# Khởi tạo chứng chỉ HTTPS cho localhost (chỉ cần chạy 1 lần)
dotnet dev-certs https --trust

# Build kiểm tra lỗi
dotnet build

# Chạy API với HTTPS profile (Port 7001)
dotnet run --project ReactDotnetBoilerplate.Api --launch-profile https
```

* **Swagger UI:** [https://localhost:7001/swagger](https://localhost:7001/swagger)
* **Health Check API:** [https://localhost:7001/v1/students](https://localhost:7001/v1/students)

---

## 🔒 Cơ Chế Xác Thực & Phân Quyền (Auth & RBAC)

Hệ thống sử dụng **ASP.NET Core Identity** kết hợp **JWT Bearer Token**:

### 1. Luồng Đăng Nhập & Cấp Token
1. Client gửi `POST /v1/auth/login` kèm `{ email, password }`.
2. `AuthService` kiểm tra tài khoản, mật khẩu và trạng thái hoạt động (`IsActive`).
3. `TokenService` tạo JWT chứa các Claims quan trọng:
   * `ClaimTypes.NameIdentifier` & `id`: User ID (Guid).
   * `ClaimTypes.Email`: Email người dùng.
   * `ClaimTypes.Role`: Tên quyền hạn (`SysAdmin`, `Admin`, `Teacher`, `User`).
4. Server trả về Token dạng `Result<AuthResponse>`.

### 2. Dữ Liệu Tài Khoản Mẫu (Data Seeder)

Khi khởi động lần đầu, `DataSeeder.cs` tự động tạo các Role và User mẫu:

| Tài khoản | Mật khẩu | Role Identity | Mô tả quyền hạn |
|---|---|---|---|
| `sysadmin@gmail.com` | `<shown-once-when-the-project-is-created>` | `SysAdmin` | Quản trị viên cấp cao nhất của hệ thống |
| `admin@gmail.com` | `<shown-once-when-the-project-is-created>` | `Admin` | Quản trị viên quản lý đào tạo |
| `teacher@gmail.com` | `<shown-once-when-the-project-is-created>` | `Teacher` | Giảng viên đào tạo |
| `user@gmail.com` | `<shown-once-when-the-project-is-created>` | `User` | Người dùng thông thường (chỉ xem) |

---

## 📦 Chuẩn Hóa API Response & Quy Ước RESTful

### 1. Phong bì `Result<T>` chuẩn
Mọi endpoint trả về `ActionResult<Result<T>>`:

```csharp
// Trả về thành công
return Ok(await Result<StudentResponse>.SuccessAsync(data, "Tạo sinh viên thành công."));

// Trả về lỗi nghiệp vụ
return BadRequest(await Result<StudentResponse>.FailAsync("Mã sinh viên đã tồn tại."));

// Trả về không tìm thấy
return NotFound(await Result<StudentResponse>.FailAsync("Không tìm thấy sinh viên."));
```

### 2. Định dạng JSON & Enums
* Tên trường JSON trả về dạng **camelCase** (ví dụ: `studentCode`, `fullName`, `dateOfBirth`).
* Giá trị Enum tuần tự hóa dạng **String** (ví dụ: `"status": "ACTIVE"`, `"gender": "MALE"`).

---

## 📝 Hướng Dẫn Các Bước Tạo Module CRUD Mới

Để thêm một bảng nghiệp vụ mới (Ví dụ: `Teacher`, `Course`, `Subject`):

### Bước 1: Tạo Entity trong Domain
Tạo `ReactDotnetBoilerplate.Domain/Entity/<Feature>/<Feature>.cs` kế thừa `AuditableEntity<Guid>`:
```csharp
[Table("Teachers")]
public class Teacher : AuditableEntity<Guid>
{
    [Required, MaxLength(30)]
    public string TeacherCode { get; set; } = string.Empty;
    [Required, MaxLength(120)]
    public string FullName { get; set; } = string.Empty;
}
```

### Bước 2: Tạo DTOs & Mapping trong Application
* `CreateTeacherRequest.cs`, `UpdateTeacherRequest.cs`, `TeacherFilterRequest.cs`, `TeacherResponse.cs`.
* Cấu hình trong `GeneralProfile.cs`:
  ```csharp
  CreateMap<CreateTeacherRequest, Teacher>();
  CreateMap<Teacher, TeacherResponse>();
  ```

### Bước 3: Đăng ký DbContext, Repository & Service trong Infrastructure
1. Thêm `public DbSet<Teacher> Teachers { get; set; }` vào `ApplicationDbContext.cs`.
2. Tạo `ITeacherRepository` kế thừa `IGenericRepository<Teacher>` và `TeacherRepository`.
3. Tạo `ITeacherService` và `TeacherService` để xử lý logic validate, filter, paging.

### Bước 4: Tạo Controller trong Api
Tạo `ReactDotnetBoilerplate.Api/Controllers/Teacher/TeacherController.cs`:
```csharp
[Authorize]
[Route("v1/teachers")]
[ApiController]
public class TeacherController : ControllerBase
{
    private readonly ITeacherService _teacherService;
    public TeacherController(ITeacherService teacherService) => _teacherService = teacherService;

    [HttpGet]
    public async Task<ActionResult<Result<PagingResponse<TeacherResponse>>>> GetList([FromQuery] TeacherFilterRequest filter)
        => Ok(await _teacherService.GetListAsync(filter));

    [Authorize(Roles = "SysAdmin,Admin")]
    [HttpPost]
    public async Task<ActionResult<Result<TeacherResponse>>> Create([FromBody] CreateTeacherRequest request)
        => Ok(await _teacherService.CreateAsync(request));
}
```

### Bước 5: Đăng ký Dependency Injection (DI)
Trong `Infrastructure/Extensions/ServiceCollectionExtensions.cs`:
```csharp
public static void AddRepositories(this IServiceCollection services)
{
    // ...
    services.AddScoped<ITeacherRepository, TeacherRepository>();
}

public static void AddApplicationServices(this IServiceCollection services)
{
    // ...
    services.AddScoped<ITeacherService, TeacherService>();
}
```

---

## 🗄️ Database Migrations

Khi có thay đổi về Model/Entity:

```bash
# Thêm migration mới:
dotnet ef migrations add AddTeacher --project ReactDotnetBoilerplate.Infrastructure --startup-project ReactDotnetBoilerplate.Api

# Cập nhật Database:
dotnet ef database update --project ReactDotnetBoilerplate.Infrastructure --startup-project ReactDotnetBoilerplate.Api
```
