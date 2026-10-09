# 🎓 Training Management System (Full-Stack Architecture Boilerplate)

> Dự án mẫu kiến trúc chuẩn doanh nghiệp kết hợp giữa **Backend (.NET 9 Web API - Clean Architecture)** và **Frontend (React 19 + TypeScript + Vite + TanStack Query + TailwindCSS)**.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

### Frontend (Client)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query_v5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand_5-443e38?style=for-the-badge&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod_Validation-3E67B1?style=for-the-badge&logo=zod&logoColor=white)

### Backend (Server)
![.NET 9](https://img.shields.io/badge/.NET_9.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
![C#](https://img.shields.io/badge/C%23_13-239120?style=for-the-badge&logo=c-sharp&logoColor=white)
![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core_Web_API-512BD4?style=for-the-badge&logo=.net&logoColor=white)
![Entity Framework Core](https://img.shields.io/badge/EF_Core_9-512BD4?style=for-the-badge&logoColor=white)
![Dapper](https://img.shields.io/badge/Dapper-black?style=for-the-badge&logoColor=white)
![ASP.NET Core Identity](https://img.shields.io/badge/ASP.NET_Identity-0078D7?style=for-the-badge&logo=microsoft&logoColor=white)
![JWT](https://img.shields.io/badge/JWT_Bearer_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL_Server_LocalDB-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger_OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

---

## 📂 Cấu Trúc Tổng Quan Dự Án

```text
demo-software-architecture/
├── client/                     # Mã nguồn Frontend (React + Vite + TypeScript)
│   ├── src/                    # Components, Pages, State, API, Routes
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

---

## ⚡ Hướng Dẫn Khởi Động Nhanh (Quick Start)

### 1. Yêu cầu môi trường
* **Node.js**: Phiên bản 20+ hoặc 22+ (khuyến nghị dùng `pnpm` hoặc `npm`).
* **.NET SDK**: Phiên bản 9.0+ (`dotnet --version`).
* **Cơ sở dữ liệu**: SQL Server LocalDB (`(localdb)\mssqllocaldb`) đi kèm với Visual Studio hoặc SQL Server Express.

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
   * **Swagger UI:** [https://localhost:7001/swagger](https://localhost:7001/swagger)
   * **API Base URL:** `https://localhost:7001/`

> **Lưu ý:** Hệ thống tự động tạo Database `ReactDotnetBoilerplateDb` và Seed dữ liệu mẫu (Tài khoản người dùng + Dữ liệu sinh viên) khi khởi chạy lần đầu.

---

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
4. Khởi động Web Dev Server:
   ```bash
   npm run dev
   ```
5. Mở trình duyệt tại: [http://localhost:5173](http://localhost:5173) (hoặc port hiển thị trên terminal).

---

## 🔐 Tài Khoản Mẫu Đăng Nhập (Identity Seed)

Dự án đã nạp sẵn các tài khoản với các quyền khác nhau để kiểm thử tính năng phân quyền:

| Email | Mật khẩu | Quyền Backend | Quyền Frontend | Khả năng thao tác (Student) |
|---|---|---|---|---|
| `admin@gmail.com` | `<shown-once-when-the-project-is-created>` | `Admin` | `ADMIN` | **Toàn quyền**: Xem, Thêm, Sửa, Xóa |
| `teacher@gmail.com` | `<shown-once-when-the-project-is-created>` | `Teacher` | `TEACHER` | **Toàn quyền**: Xem, Thêm, Sửa, Xóa |
| `user@gmail.com` | `<shown-once-when-the-project-is-created>` | `User` | `STAFF` | **Chỉ xem**: Không thấy nút Thêm/Xóa, Form chỉ đọc |

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
* **Lớp 1 (Frontend):** Ẩn các nút hành động (Thêm/Xóa), khóa form `readOnly`, chặn truy cập URL tạo mới bằng `RoleRoute`.
* **Lớp 2 (Backend):** Controller bắt buộc JWT qua `[Authorize]`, các action ghi dữ liệu (POST/PUT/DELETE) bắt buộc role qua `[Authorize(Roles = "SysAdmin,Admin,Teacher")]`.

### 3. Quản Lý Dữ Liệu Hiện Đại ở Frontend
* **Server State:** Dùng **TanStack Query (React Query)** để quản lý cache, tự động revalidate/invalidate khi Create, Update hoặc Delete.
* **Client State:** Dùng **Zustand** quản lý Token và User Info (persist vào localStorage).
* **URL-driven State:** Phân trang (`page`, `pageSize`) và bộ lọc (`keyword`, `classId`, `status`) được đồng bộ trực tiếp lên URL Search Params.

---

## 📚 Tài Liệu Dành Cho Lập Trình Viên

Để tìm hiểu chi tiết từng phần, vui lòng đọc các tài liệu chuyên sâu:

1. 📘 [**CRUD_FLOW_GUIDE.md**](./CRUD_FLOW_GUIDE.md): Cẩm nang chi tiết từng bước xây dựng một module CRUD từ Backend đến Frontend (dành cho người mới).
2. 📖 [**client/README.md**](./client/README.md): Hướng dẫn chi tiết cấu trúc code, quy chuẩn viết Component, Hook và API phía Client.
3. 📖 [**server/README.md**](./server/README.md): Hướng dẫn chi tiết kiến trúc Clean Architecture 4 lớp, cấu hình JWT, Entity Framework Core và Dapper phía Server.
