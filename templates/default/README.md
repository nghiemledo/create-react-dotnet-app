# 🎓 Training Management System (Full-Stack Architecture Boilerplate)

> Dự án mẫu kiến trúc chuẩn doanh nghiệp kết hợp giữa **Backend (.NET 9 Web API - Clean Architecture)** và **Frontend (<!-- crda:frontend-summary -->React 19 + TypeScript + Vite<!-- /crda:frontend-summary --> + TanStack Query + TailwindCSS)**.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

### Frontend (Client)

<!-- crda:frontend-stack -->
> React
> TypeScript
> Vite
> TanStack Query
> TailwindCSS
> Zustand
> React Hook Form
> Zod
<!-- /crda:frontend-stack -->

### Backend (Server)

.NET 9
C#
ASP.NET Core
Entity Framework Core
Dapper
ASP.NET Core Identity
JWT
<!-- crda:database-name -->SQL Server<!-- /crda:database-name -->
Swagger

---



## 📂 Cấu Trúc Tổng Quan Dự Án

<!-- crda:frontend-tree -->
```text
demo-software-architecture/
├── client/                     # Mã nguồn Frontend (React + Vite + TypeScript)
│   ├── src/                    # Components, Pages, State, API, Routes
│   ├── scripts/codegen.mjs     # Sinh src/types/api.generated.ts từ OpenAPI của Backend
│   ├── package.json
│   └── README.md               # 📖 Hướng dẫn chi tiết cho Frontend
├── server/                     # Mã nguồn Backend (.NET 9 Clean Architecture)
│   ├── ReactDotnetBoilerplate.Api/             # API Controllers, Middleware, Program.cs
│   ├── ReactDotnetBoilerplate.Application/     # DTOs, Mapping Profiles, Exceptions
│   ├── ReactDotnetBoilerplate.Domain/          # Entities, Identity Models, Wrappers
│   ├── ReactDotnetBoilerplate.Infrastructure/  # DbContext, Repositories, Services, Seed
│   ├── ReactDotnetBoilerplate.Common/          # Constants, Enums, Helpers
│   ├── ReactDotnetBoilerplate.sln
│   └── README.md               # 📖 Hướng dẫn chi tiết cho Backend
├── CRUD_FLOW_GUIDE.md          # 📘 Sách hướng dẫn luồng CRUD từ A -> Z cho Dev
└── README.md                   # 📄 Tài liệu tổng quan này
```
<!-- /crda:frontend-tree -->

---



## ⚡ Hướng Dẫn Khởi Động Nhanh (Quick Start)



### 1. Yêu cầu môi trường

- **Node.js**: Phiên bản 20+ hoặc 22+ (khuyến nghị dùng `pnpm` hoặc `npm`).
- **.NET SDK**: Phiên bản 9.0+ (`dotnet --version`).
- **Cơ sở dữ liệu**: <!-- crda:database-name -->SQL Server<!-- /crda:database-name --> (xem mục "Database" bên dưới).

---

<!-- crda:database-setup -->
### Database: SQL Server

The API uses Entity Framework Core with `Microsoft.EntityFrameworkCore.SqlServer`. The connection string is
`ConnectionStrings:DefaultConnection` in `server/ReactDotnetBoilerplate.Api/appsettings.json` and points to
SQL Server LocalDB, which is available on Windows only.

To use another SQL Server instance (for example on macOS or Linux), override the connection string with an
environment variable instead of editing the file:

```bash
# Optional: SQL Server in Docker. Choose your own strong password.
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=<your-strong-password>" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest

# bash/zsh
export ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=ReactDotnetBoilerplateDb;User Id=sa;Password=<your-strong-password>;TrustServerCertificate=True"
# PowerShell
$env:ConnectionStrings__DefaultConnection="Server=localhost,1433;Database=ReactDotnetBoilerplateDb;User Id=sa;Password=<your-strong-password>;TrustServerCertificate=True"
```

In the Development environment the API applies pending migrations and seeds sample data on startup. See
`server/README.md` for migration commands.
<!-- /crda:database-setup -->

---

### 2. Chạy Backend (Server)

1. Di chuyển vào thư mục server:
  ```bash
   cd server
  ```
2. Khởi tạo chứng chỉ SSL cho Localhost (nếu chưa có):
  ```bash
   dotnet dev-certs https --trust
  ```
3. Chạy API:
  ```bash
   dotnet run --project ReactDotnetBoilerplate.Api --launch-profile https
  ```
4. Truy cập các địa chỉ:
  - **Swagger UI:** [https://localhost:7001/swagger](https://localhost:7001/swagger)
  - **API Base URL:** `https://localhost:7001/`

> **Lưu ý:** Ở môi trường Development, API tự động áp dụng migrations cho Database `ReactDotnetBoilerplateDb` và Seed dữ liệu mẫu (Tài khoản người dùng + Dữ liệu sinh viên) khi khởi chạy.

---



<!-- crda:frontend-quickstart -->
### 3. Chạy Frontend (Client)

1. Mở một terminal mới và di chuyển vào thư mục client:
  ```bash
   cd client
  ```
2. Cài đặt các gói thư viện:
  ```bash
   pnpm install --no-frozen-lockfile
   # hoặc: npm install
  ```
3. Cấu hình biến môi trường: Tạo file `.env` từ `.env.example`:
  ```env
   VITE_APP_NAME=Hệ thống quản lý đào tạo
   VITE_API_BASE_URL=https://localhost:7001
   VITE_API_TIMEOUT=15000
  ```
4. (Khi API thay đổi) Sinh lại TypeScript type từ OpenAPI của Backend. Backend ở bước 2 phải đang chạy:
  ```bash
   npm run codegen
  ```
   Lệnh này ghi `client/src/types/api.generated.ts` từ `http://localhost:5058/swagger/v1/swagger.json`. Xem mục "Sinh TypeScript Type từ OpenAPI" trong [client/README.md](./client/README.md) để biết tùy chọn và cách xử lý lỗi.
5. Khởi động Web Dev Server:
  ```bash
   npm run dev
  ```
6. Mở trình duyệt tại: [http://localhost:5173](http://localhost:5173) (hoặc port hiển thị trên terminal).
<!-- /crda:frontend-quickstart -->

---



## 🔐 Tài Khoản Mẫu Đăng Nhập (Identity Seed)

Dự án đã nạp sẵn các tài khoản với các quyền khác nhau để kiểm thử tính năng phân quyền:


| Email               | Mật khẩu | Quyền Backend | Quyền Frontend | Khả năng thao tác (Student)                        |
| ------------------- | -------- | ------------- | -------------- | -------------------------------------------------- |
| `admin@gmail.com`   | `<shown-once-when-the-project-is-created>` | `Admin`       | `ADMIN`        | **Toàn quyền**: Xem, Thêm, Sửa, Xóa                |
| `teacher@gmail.com` | `<shown-once-when-the-project-is-created>` | `Teacher`     | `TEACHER`      | **Toàn quyền**: Xem, Thêm, Sửa, Xóa                |
| `user@gmail.com`    | `<shown-once-when-the-project-is-created>` | `User`        | `STAFF`        | **Chỉ xem**: Không thấy nút Thêm/Xóa, Form chỉ đọc |


---



## 🧠 Nguyên Lý Thiết Kế Cốt Lõi



### 1. Chuẩn Hóa Response Dữ Liệu (`Result<T>`)

Toàn bộ API đều bọc qua phong bì chuẩn `Result<T>`:

```json
{
  "status": true,
  "messages": ["Thao tác thành công."],
  "data": { ... }
}
```

Frontend sử dụng helper `unwrapApiResult` để tự động bóc tách `data` hoặc ném thông báo lỗi `messages[0]` hiển thị lên UI.

### 2. Bảo Mật Hai Lớp (Defense in Depth)

- **Lớp 1 (Frontend):** Ẩn các nút hành động (Thêm/Xóa), khóa form `readOnly`, chặn truy cập URL tạo mới bằng `RoleRoute`.
- **Lớp 2 (Backend):** Controller bắt buộc JWT qua `[Authorize]`, các action ghi dữ liệu (POST/PUT/DELETE) bắt buộc role qua `[Authorize(Roles = "SysAdmin,Admin,Teacher")]`.



### 3. Quản Lý Dữ Liệu Hiện Đại ở Frontend

- **Server State:** Dùng **TanStack Query (React Query)** để quản lý cache, tự động revalidate/invalidate khi Create, Update hoặc Delete.
- **Client State:** Dùng **Zustand** quản lý Token và User Info (persist vào localStorage).
- **URL-driven State:** Phân trang (`page`, `pageSize`) và bộ lọc (`keyword`, `classId`, `status`) được đồng bộ trực tiếp lên URL Search Params.

---



## 📚 Tài Liệu Dành Cho Lập Trình Viên

Để tìm hiểu chi tiết từng phần, vui lòng đọc các tài liệu chuyên sâu:

1. 📘 **[CRUD_FLOW_GUIDE.md](./CRUD_FLOW_GUIDE.md)**: Cẩm nang chi tiết từng bước xây dựng một module CRUD từ Backend đến Frontend (dành cho người mới).
2. 📖 **[client/README.md](./client/README.md)**: Hướng dẫn chi tiết cấu trúc code, quy chuẩn viết Component, Hook và API phía Client.
3. 📖 **[server/README.md](./server/README.md)**: Hướng dẫn chi tiết kiến trúc Clean Architecture 4 lớp, cấu hình JWT, Entity Framework Core và Dapper phía Server.

