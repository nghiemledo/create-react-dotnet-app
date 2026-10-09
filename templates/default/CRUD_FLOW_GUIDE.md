# Hướng Dẫn Luồng CRUD Full-Stack (Backend -> Frontend)

> Tài liệu hướng dẫn luồng chuẩn phát triển tính năng CRUD từ Backend (ASP.NET Core 9 Clean Architecture) đến Frontend (React + Vite + TanStack Query + TailwindCSS). Dành cho thành viên mới trong team dev.

---

## 1. Tư Duy Kiến Trúc & Quy Tắc Vàng

### Quy tắc chiều làm việc:

- **Khi code (Thứ tự tạo file):** Đi từ **TRONG ra NGOÀI**
`Domain` ➔ `Application` ➔ `Infrastructure` ➔ `Api (BE)` ➔ `Client (FE)`
- **Khi chạy (Runtime Request):** Đi từ **NGOÀI vào TRONG**
`User UI` ➔ `Form/Zod` ➔ `React Query` ➔ `Axios + Bearer Token` ➔ `Controller [Authorize]` ➔ `Service` ➔ `Repository` ➔ `SQL Database`

```text
+---------------------------------------------------------------------------------------+
|                                    FRONTEND (React)                                   |
|   [Page / Component] ➔ [Zod Schema] ➔ [React Query Hook] ➔ [Api Service] ➔ [Axios]   |
+-------------------------------------------+-------------------------------------------+
                                            | (HTTPS + Bearer JWT Token)
                                            v
+---------------------------------------------------------------------------------------+
|                                   BACKEND (.NET 9)                                    |
|   1. API: Controller (Kiểm tra [Authorize], Route v1/..., Validate ModelState)        |
|      ↓                                                                                |
|   2. INFRASTRUCTURE: Service (Validate nghiệp vụ, check trùng, Map DTO)               |
|      ↓                                                                                |
|   3. INFRASTRUCTURE: Repository (Kế thừa GenericRepository + Query EF Core)           |
|      ↓                                                                                |
|   4. DOMAIN: Entity (Students Table, AuditableEntity<Guid>)                           |
|      ↓                                                                                |
|   5. DATABASE: LocalDB / SQL Server                                                   |
+---------------------------------------------------------------------------------------+
```

---



## 2. Chuẩn Dữ Liệu Trao Đổi (API Envelope)

Tất cả API BE đều trả về cấu trúc bọc `Result<T>`:

```json
{
  "status": true,
  "messages": ["Thao tác thành công."],
  "data": { ... }
}
```

- **Thành công:** `status: true`, dữ liệu nằm trong `data`.
- **Thất bại:** `status: false`, thông báo lỗi nằm trong `messages: ["Chi tiết lỗi..."]`.
- **Frontend:** Dùng helper `unwrapApiResult(response.data)` để tự động lấy `data` hoặc ném lỗi có message từ BE.

---



## 3. Phân Quyền & Xác Thực (Auth & Roles)



### Tài khoản mẫu có sẵn (Seed Data):


| Email               | Mật khẩu | Role BE   | Role FE   | Quyền Student                                  |
| ------------------- | -------- | --------- | --------- | ---------------------------------------------- |
| `admin@gmail.com`   | `<shown-once-when-the-project-is-created>` | `Admin`   | `ADMIN`   | Xem, Thêm, Sửa, Xóa                            |
| `teacher@gmail.com` | `<shown-once-when-the-project-is-created>` | `Teacher` | `TEACHER` | Xem, Thêm, Sửa, Xóa                            |
| `user@gmail.com`    | `<shown-once-when-the-project-is-created>` | `User`    | `STAFF`   | **Chỉ xem** (Không nút thêm/xóa, form chỉ đọc) |




### Cơ chế chặn quyền:

1. **Frontend (Chặn hiển thị UI):**
  - `canManageStudents(role)` kiểm tra nếu không phải `ADMIN`/`TEACHER` thì ẩn nút Thêm, ẩn nút Xóa, khóa form `readOnly`.
  - Route `/students/create` được bọc bởi `<RoleRoute allowedRoles={['ADMIN', 'TEACHER']} />`.
2. **Backend (Chặn bảo mật thực tế):**
  - Class Controller: `[Authorize]` (bắt buộc phải có Bearer Token, không có ➔ `401 Unauthorized`).
  - Action Thêm/Sửa/Xóa: `[Authorize(Roles = "SysAdmin,Admin,Teacher")]` (User thường gọi vào ➔ `403 Forbidden`).

---



## 4. Các Bước Triển Khai Backend (Ví dụ: Module Student)



### Bước 1: Domain Layer (Tạo Entity)

- Thư mục: `server/ReactDotnetBoilerplate.Domain/Entity/Student/Student.cs`
- Kế thừa `AuditableEntity<Guid>` để có sẵn `Id`, `CreatedAt`, `UpdatedAt`.
- Khai báo enum giới tính/trạng thái trong `ReactDotnetBoilerplate.Common/Enums/`.



### Bước 2: Application Layer (Tạo DTO & Mapping)

- Thư mục: `server/ReactDotnetBoilerplate.Application/DataTransferObjects/`
  - `Requests/Student/CreateStudentRequest.cs` (Dữ liệu gửi lên khi tạo)
  - `Requests/Student/UpdateStudentRequest.cs` (Dữ liệu gửi lên khi sửa)
  - `Requests/Student/StudentFilterRequest.cs` (Dữ liệu lọc: `page`, `pageSize`, `keyword`, `classId`, `status`)
  - `Responses/Student/StudentResponse.cs` (Dữ liệu trả về cho FE)
- Khai báo AutoMapper trong `server/ReactDotnetBoilerplate.Application/Mappings/GeneralProfile.cs`:
  ```csharp
  CreateMap<CreateStudentRequest, StudentEntity>();
  CreateMap<UpdateStudentRequest, StudentEntity>();
  CreateMap<StudentEntity, StudentResponse>();
  ```



### Bước 3: Infrastructure Layer (Repository & Service)

- **DbContext:** Đăng ký `DbSet<Student> Students { get; set; }` và Index Unique trong `ApplicationDbContext.cs`.
- **Repository:** `server/ReactDotnetBoilerplate.Infrastructure/EFCoreRepositories/Student/StudentRepository.cs`
  - Kế thừa `GenericRepository<Student>`, triển khai thêm hàm kiểm tra trùng `ExistsByStudentCodeAsync`, `ExistsByEmailAsync`.
- **Service:** `server/ReactDotnetBoilerplate.Infrastructure/Services/Student/StudentService.cs`
  - Chứa toàn bộ nghiệp vụ: Validate độ dài/định dạng, check trùng lặp, tính toán phân trang `Skip/Take`, Map DTO sang Entity và ngược lại.



### Bước 4: Api Layer (Controller)

- Thư mục: `server/ReactDotnetBoilerplate.Api/Controllers/Student/StudentController.cs`
- Route chuẩn: `[Route("v1/students")]`
- Action methods:
  - `GET /v1/students`: Lấy danh sách phân trang + lọc (`[HttpGet]`)
  - `GET /v1/students/{id:guid}`: Lấy chi tiết 1 sinh viên (`[HttpGet("{id:guid}")]`)
  - `POST /v1/students`: Thêm mới (`[Authorize(Roles = "SysAdmin,Admin,Teacher")] [HttpPost]`)
  - `PUT /v1/students/{id:guid}`: Cập nhật (`[Authorize(Roles = "SysAdmin,Admin,Teacher")] [HttpPut("{id:guid}")]`)
  - `DELETE /v1/students/{id:guid}`: Xóa (`[Authorize(Roles = "SysAdmin,Admin,Teacher")] [HttpDelete("{id:guid}")]`)



### Bước 5: Đăng ký Dependency Injection (DI)

- Trong `server/ReactDotnetBoilerplate.Infrastructure/Extensions/ServiceCollectionExtensions.cs`:
  ```csharp
  services.AddScoped<IStudentRepository, StudentRepository>();
  services.AddScoped<IStudentService, StudentService>();
  ```

---



## 5. Các Bước Triển Khai Frontend (Client React)

Mỗi tính năng được gom gọn trong thư mục feature riêng biệt `client/src/pages/<FeatureName>/`.

```text
client/src/pages/Students/
├── types/
│   └── student.types.ts            # Khai báo TypeScript types (Student, Filter, Payload)
├── schemas/
│   └── student.schema.ts           # Schema validation bằng Zod (bắt lỗi form)
├── services/
│   └── studentApi.ts               # Gọi API qua Axios + unwrapApiResult
├── queries/
│   ├── student.queryKeys.ts        # Quản lý Query Keys tập trung
│   ├── useStudentsQuery.ts         # Hook fetch danh sách (useQuery)
│   ├── useStudentDetailQuery.ts    # Hook fetch chi tiết (useQuery)
│   ├── useCreateStudentMutation.ts # Hook tạo mới (useMutation)
│   ├── useUpdateStudentMutation.ts # Hook cập nhật (useMutation)
│   └── useDeleteStudentMutation.ts # Hook xóa (useMutation)
├── components/
│   ├── StudentTable.tsx            # Bảng hiển thị danh sách + action xem/xóa
│   ├── StudentFilter.tsx           # Thanh tìm kiếm, lọc theo lớp, trạng thái
│   └── StudentForm.tsx             # Form nhập liệu (dùng React Hook Form + Zod)
├── StudentListPage.tsx             # Trang danh sách chính (lưu filter trên URL)
├── StudentCreatePage.tsx           # Trang tạo mới
└── StudentDetailPage.tsx           # Trang xem chi tiết / chỉnh sửa
```



### Chi tiết các bước viết code FE:

1. **Định nghĩa Types (**`types/student.types.ts`**):**
  Đồng bộ kiểu dữ liệu chính xác với DTO của Backend.
2. **Viết Schema Form (**`schemas/student.schema.ts`**):**
  Dùng Zod để kiểm tra rỗng, độ dài, regex email, số điện thoại ngay tại Client trước khi gửi request.
3. **Viết API Service (**`services/studentApi.ts`**):**
  Dùng `apiClient` gọi endpoint `appConfig.endpoints.students` (`/v1/students`), bọc qua `unwrapApiResult` để lấy thẳng `data`.
4. **Viết React Query Hooks (**`queries/`**):**
  - `queryKey` phân cấp: `['students', 'list', filter]`, `['students', 'detail', id]`.
  - Khi mutate (Create/Update/Delete) thành công ➔ gọi `queryClient.invalidateQueries({ queryKey: studentKeys.lists() })` để danh sách tự động làm mới mà không cần F5.
5. **Gắn Route & Bảo vệ Route (**`AppRoutes.tsx`**):**
  ```tsx
   <Route element={<ProtectedRoute />}>
     <Route element={<MainLayout />}>
       <Route path="/students" element={<StudentListPage />} />
       <Route path="/students/:id" element={<StudentDetailPage />} />
       <Route element={<RoleRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
         <Route path="/students/create" element={<StudentCreatePage />} />
       </Route>
     </Route>
   </Route>
  ```

---



## 6. Luồng Chạy Thực Tế Từng Thao Tác (E2E Walkthrough)



### 1. Xem danh sách (List & Search)

1. User truy cập `/students?keyword=An&page=1`.
2. `StudentListPage` lấy query params từ URL đưa vào `useStudentsQuery(filter)`.
3. `apiClient` tự gắn header `Authorization: Bearer <token>` ➔ `GET /v1/students?keyword=An&page=1&pageSize=10`.
4. BE kiểm tra `[Authorize]` ➔ `StudentService.GetListAsync` thực hiện truy vấn `AsNoTracking()`, `Skip/Take`, đếm `TotalItems`.
5. BE trả về `Result<PagingResponse<StudentResponse>>`.
6. FE unwrap dữ liệu và hiển thị lên `StudentTable`, hỗ trợ phân trang mượt mà.



### 2. Thêm mới sinh viên (Create)

1. User nhấn "Thêm sinh viên" ➔ Điều hướng tới `/students/create`.
2. Người dùng nhập form ➔ Bấm "Lưu".
3. `react-hook-form` + `zod` kiểm tra hợp lệ tại client. Nếu sai hiển thị lỗi ngay dưới ô nhập.
4. `useCreateStudentMutation` kích hoạt ➔ `POST /v1/students` kèm body JSON.
5. BE kiểm tra quyền `[Authorize(Roles = "SysAdmin,Admin,Teacher")]`.
6. `StudentService.CreateAsync` kiểm tra xem Mã SV hoặc Email đã tồn tại trong DB chưa. Nếu có trả về `400 BadRequest` cùng `messages: ["Email đã tồn tại."]`.
7. Nếu hợp lệ: Lưu DB ➔ Trả về `200 OK`.
8. FE nhận thành công ➔ Invalidate cache danh sách ➔ Chuyển hướng về `/students` kèm thông báo toast/banner xanh.



### 3. Cập nhật sinh viên (Update)

1. User bấm icon "Xem" trên bảng ➔ Mở `/students/{id}`.
2. `useStudentDetailQuery` fetch dữ liệu chi tiết đưa vào form.
3. Nếu user là `STAFF` (User thường): Form bị vô hiệu hóa `readOnly={true}`, nút Lưu bị ẩn.
4. Nếu user là `ADMIN`/`TEACHER`: Cho phép sửa ➔ Bấm "Cập nhật".
5. `useUpdateStudentMutation` gửi `PUT /v1/students/{id}`.
6. BE kiểm tra trùng (loại trừ chính ID đang sửa), cập nhật DB.
7. FE cập nhật lại cache chi tiết (`setQueryData`) và làm mới danh sách.



### 4. Xóa sinh viên (Delete)

1. Nút "Xóa" chỉ render khi `canManageStudents(role)` là `true`.
2. User bấm Xóa ➔ Hiện hộp thoại xác nhận `window.confirm`.
3. `useDeleteStudentMutation` gửi `DELETE /v1/students/{id}`.
4. BE xóa trong DB ➔ Trả về thông báo thành công.
5. FE xóa cache chi tiết (`removeQueries`) và làm mới danh sách.

---



## 7. Checklist Khi Tạo Module Mới (Cheat Sheet Cho Dev)

Khi cần tạo thêm một chức năng CRUD mới (Ví dụ: `Teacher`, `Course`, `Classroom`):

- [ ] **Domain:** Tạo Entity kế thừa `AuditableEntity<Guid>`, tạo enum nếu có.
- [ ] **Application:** Tạo 3 Request DTOs (Create, Update, Filter), 1 Response DTO, cấu hình `GeneralProfile.cs`.
- [ ] **Infrastructure:** Thêm `DbSet<...>` trong `ApplicationDbContext`, tạo `Repository`, tạo `Service`.
- [ ] **Api:** Tạo Controller kế thừa `ControllerBase`, gắn `[Route("v1/...")]`, gắn `[Authorize]` và role phù hợp.
- [ ] **DI:** Đăng ký Repository và Service vào `ServiceCollectionExtensions.cs`.
- [ ] **FE Types & Schema:** Tạo `types.ts`, `schema.ts` (Zod).
- [ ] **FE Api & Query:** Tạo `api.ts`, `queryKeys.ts`, các hooks `useQuery` và `useMutation`.
- [ ] **FE Components & Pages:** Tạo Table, Filter, Form, ListPage, DetailPage, CreatePage.
- [ ] **FE Routes:** Khai báo đường dẫn trong `routePaths.ts` và đăng ký vào `AppRoutes.tsx`.