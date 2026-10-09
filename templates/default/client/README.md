# 💻 Hướng Dẫn Client (Frontend)

> Ứng dụng Frontend xây dựng trên nền tảng **React 19**, **TypeScript**, **Vite** kết hợp với **TanStack Query (React Query v5)**, **TailwindCSS v4**, **Zustand** và **React Hook Form + Zod**.

---

## 🛠️ Công Nghệ & Thư Viện Sử Dụng

![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript_5-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query_v5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand_5-443e38?style=for-the-badge&logoColor=white)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-EC5990?style=for-the-badge&logo=reacthookform&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white)
![Lucide React](https://img.shields.io/badge/Lucide_Icons-F05032?style=for-the-badge&logoColor=white)

---

## 📁 Cấu Trúc Thư Mục Chuẩn (Feature-Driven Structure)

Thư mục `client/src` được tổ chức theo module tính năng (Feature-based pattern) giúp dễ dàng mở rộng và bảo trì:

```text
client/src/
├── components/                 # Các UI component dùng chung toàn hệ thống
│   ├── layouts/                # App Layouts: MainLayout (Sidebar + Header), AuthLayout
│   └── ui/                     # Primitives UI (Button, Input, Badge, Dialog...)
├── config/                     # Cấu hình tĩnh & biến môi trường
│   ├── appConfig.ts            # Endpoint API, cấu hình phân trang mặc định
│   └── env.ts                  # Đọc & validate import.meta.env
├── lib/                        # Thư viện ngoài & custom wrapper
│   └── apiClient.ts            # Axios Instance cấu hình sẵn BaseURL, Interceptor Token & 401
├── pages/                      # Các trang theo từng module nghiệp vụ (Feature Modules)
│   ├── Auth/                   # Đăng nhập, đăng ký, dịch vụ xác thực
│   │   ├── services/           # authApi.ts (login, me, logout)
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx
│   ├── Dashboard/              # Trang tổng quan
│   └── Students/               # Module Quản lý sinh viên (Module mẫu)
│       ├── components/         # Component nội bộ của module (Table, Filter, Form)
│       ├── queries/            # React Query hooks (useQuery, useMutation, queryKeys)
│       ├── schemas/            # Zod validation schema (student.schema.ts)
│       ├── services/           # studentApi.ts (gọi axios tới /v1/students)
│       ├── types/              # TypeScript interfaces (student.types.ts)
│       ├── StudentListPage.tsx # Trang danh sách
│       ├── StudentCreatePage.tsx# Trang tạo mới
│       └── StudentDetailPage.tsx# Trang chi tiết & chỉnh sửa
├── routes/                     # Cấu hình điều hướng và bảo vệ Route
│   ├── AppRoutes.tsx           # Khai báo toàn bộ Route
│   ├── ProtectedRoute.tsx      # Chặn người dùng chưa đăng nhập
│   ├── RoleRoute.tsx           # Chặn theo quyền hạn (Role-based access)
│   └── routePaths.ts           # Hằng số định nghĩa đường dẫn URL
├── store/                      # Quản lý State toàn cục bằng Zustand
│   └── authStore.ts            # Lưu trữ user, accessToken (persist vào localStorage)
├── types/                      # Type dùng chung hệ thống (api.types, paging.types, permission.types)
├── utils/                      # Các hàm tiện ích hỗ trợ
│   ├── handleApiError.ts       # Trích xuất thông báo lỗi chuẩn từ Axios / API Error
│   ├── roles.ts                # Map role BE -> FE & hàm canManageStudents
│   └── unwrapApiResult.ts      # Bóc tách envelope Result<T> từ Backend
└── main.tsx                    # Entry point ứng dụng (QueryClientProvider, RouterProvider)
```

---

## ⚙️ Cài Đặt & Chạy Môi Trường Phát Triển

### 1. Cài đặt Dependencies

Sử dụng `pnpm` (khuyến nghị) hoặc `npm`:

```bash
# Cài đặt bằng pnpm:
pnpm install --no-frozen-lockfile

# Hoặc cài đặt bằng npm:
npm install
```

### 2. Thiết lập Biến Môi Trường (.env)

Tạo file `.env` tại thư mục `client/`:

```env
# Tên hiển thị của hệ thống
VITE_APP_NAME=Hệ thống quản lý đào tạo

# Địa chỉ API Backend (.NET)
VITE_API_BASE_URL=https://localhost:7001

# Thời gian Timeout cho mỗi request (miligiây)
VITE_API_TIMEOUT=15000
```

### 3. Chạy lệnh phát triển

```bash
# Chạy dev server với HMR (Hot Module Replacement)
npm run dev

# Kiểm tra lỗi TypeScript và Build Production
npm run build

# Chạy linter kiểm tra code
npm run lint
```

---

## 🔄 Luồng Dữ Liệu & Quản Lý State (State Management)

### 1. Phân Tách Client State vs Server State

| Loại State | Thư viện | Mục đích sử dụng |
|---|---|---|
| **Client State** | `Zustand` (`authStore.ts`) | Lưu phiên đăng nhập, JWT Token, thông tin User (tự động lưu vào `localStorage`). |
| **Server State** | `TanStack React Query` | Quản lý việc gọi API, Caching, tự động re-fetch khi cửa sổ focus, quản lý trạng thái loading/error. |
| **URL State** | `React Router` (`useSearchParams`) | Lưu trữ trạng thái bộ lọc (`keyword`, `classId`, `status`) và phân trang (`page`, `pageSize`) trực tiếp trên URL. |

---

### 2. Luồng Gọi API Chuẩn (Axios + Interceptor + Result Envelope)

1. `apiClient` (`src/lib/apiClient.ts`) tự động gắn Header `Authorization: Bearer <token>` lấy từ `authStore`.
2. Khi Server trả về lỗi `401 Unauthorized` (hết hạn Token hoặc Token không hợp lệ), interceptor tự động kích hoạt `logout()` đưa người dùng về trang đăng nhập.
3. Backend trả về dữ liệu dạng bọc:
   ```json
   { "status": true, "messages": ["OK"], "data": { ... } }
   ```
4. Hàm tiện ích `unwrapApiResult(response.data)` kiểm tra:
   * Nếu `status === true` ➔ Trả trực tiếp trường `data` với Type tương ứng.
   * Nếu `status === false` ➔ Ném lỗi kèm thông báo đầu tiên trong mảng `messages`.

---

### 3. Quy Ước Viết Module Mới (Ví dụ: Module Student)

Khi xây dựng một tính năng CRUD mới, hãy tuân thủ 5 bước chuẩn sau:

#### Bước 1: Định nghĩa Type (`student.types.ts`)
```typescript
export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  email: string;
  phone?: string | null;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  classId: number;
  className?: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED';
}
```

#### Bước 2: Viết Schema Form với Zod (`student.schema.ts`)
```typescript
export const studentSchema = z.object({
  studentCode: z.string().trim().min(3, 'Mã SV phải từ 3 ký tự trở lên.'),
  fullName: z.string().trim().min(2, 'Vui lòng nhập họ tên.'),
  email: z.string().trim().email('Email không hợp lệ.'),
  dateOfBirth: z.string().min(1, 'Vui lòng chọn ngày sinh.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  classId: z.number().int().positive('Vui lòng chọn lớp.'),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'GRADUATED']),
});
```

#### Bước 3: Viết API Service (`studentApi.ts`)
```typescript
export const studentApi = {
  async getList(filter: StudentFilter) {
    const res = await apiClient.get<ApiPayload<PagingResponse<Student>>>(
      appConfig.endpoints.students,
      { params: filter }
    );
    return unwrapApiResult(res.data);
  },
  async create(data: StudentUpsertRequest) {
    const res = await apiClient.post<ApiPayload<Student>>(appConfig.endpoints.students, data);
    return unwrapApiResult(res.data);
  }
};
```

#### Bước 4: Viết React Query Hooks (`queries/`)
* **Query Keys:** Quản lý tập trung trong `student.queryKeys.ts`:
  ```typescript
  export const studentKeys = {
    all: ['students'] as const,
    lists: () => [...studentKeys.all, 'list'] as const,
    list: (filter: StudentFilter) => [...studentKeys.lists(), filter] as const,
    details: () => [...studentKeys.all, 'detail'] as const,
    detail: (id: string) => [...studentKeys.details(), id] as const,
  };
  ```
* **Fetch Data:** Dùng `useQuery` trong `useStudentsQuery.ts`.
* **Mutations:** Dùng `useMutation` trong `useCreateStudentMutation.ts`, sau khi thành công nhớ gọi:
  ```typescript
  await queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
  ```

#### Bước 5: Tạo Giao Diện & Đăng Ký Route
* Tạo các Components: `StudentTable`, `StudentFilter`, `StudentForm`.
* Tạo các Pages: `StudentListPage`, `StudentCreatePage`, `StudentDetailPage`.
* Khai báo trong `routePaths.ts` và bọc quyền trong `AppRoutes.tsx`.

---

## 🔒 Phân Quyền Phía Client (Role-Based Access Control)

Mapping quyền giữa Backend và Frontend (`src/utils/roles.ts`):
* Backend Role `SysAdmin` hoặc `Admin` ➔ Frontend Role `ADMIN`
* Backend Role `Teacher` ➔ Frontend Role `TEACHER`
* Backend Role `User` ➔ Frontend Role `STAFF`

**Kiểm soát trên giao diện:**
```tsx
const canManage = canManageStudents(useAuthStore((s) => s.user?.role));

// 1. Ẩn nút hành động
{canManage && <Button onClick={handleCreate}>Thêm mới</Button>}

// 2. Chặn quyền truy cập Route
<Route element={<RoleRoute allowedRoles={['ADMIN', 'TEACHER']} />}>
  <Route path="/students/create" element={<StudentCreatePage />} />
</Route>
```
