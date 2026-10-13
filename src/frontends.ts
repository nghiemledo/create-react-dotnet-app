import { keepBlock, replaceOnce, type DocBlock } from './doc-blocks.js';

export const SUPPORTED_FRONTENDS = ['vite', 'nextjs'] as const;

export type Frontend = (typeof SUPPORTED_FRONTENDS)[number];

/** The template's own client. 0.2.x and earlier generated React + Vite projects, so it stays the default. */
export const DEFAULT_FRONTEND: Frontend = 'vite';

export interface FrontendInfo {
  /** Shown in prompts, progress output and documentation. */
  name: string;
  prompt: { badge: string; description: string };
  /** Short name of the dev tool, as used in VS Code configuration names. */
  tool: string;
  /**
   * Directory under `templates/frontends/` whose files are added to the project (same relative layout as the
   * template). `undefined` for the client that the template already contains.
   */
  overlay?: string;
  /** Template files dropped for this frontend because the overlay supplies replacements. */
  replacesPrefix?: string;
  devServerUrl: string;
  /** Names in `.vscode/launch.json`. */
  vscode: { launch: string; compound: string };
  /** What sets the Node.js requirement of the generated client. */
  nodeRequirementSource: string;
}

export const FRONTENDS: Record<Frontend, FrontendInfo> = {
  vite: {
    name: 'React + Vite',
    prompt: {
      badge: 'Default',
      description: 'Single-page app with React Router, served by the Vite dev server on http://localhost:5173.',
    },
    tool: 'Vite',
    devServerUrl: 'http://localhost:5173',
    vscode: { launch: 'Frontend: Vite (Chrome)', compound: 'Full stack: API + Vite' },
    nodeRequirementSource: 'Vite 8 and ESLint 10',
  },
  nextjs: {
    name: 'Next.js',
    prompt: {
      badge: 'App Router',
      description:
        'Next.js 16 with the App Router on http://localhost:3000. Pages that need a signed-in user render in ' +
        'the browser and call the same .NET API; Next.js holds no business logic.',
    },
    tool: 'Next.js',
    overlay: 'nextjs',
    replacesPrefix: 'client/',
    devServerUrl: 'http://localhost:3000',
    vscode: { launch: 'Frontend: Next.js (Chrome)', compound: 'Full stack: API + Next.js' },
    nodeRequirementSource: 'Next.js 16 and ESLint 10',
  },
};

export function isFrontend(value: string): value is Frontend {
  return (SUPPORTED_FRONTENDS as readonly string[]).includes(value);
}

/**
 * Renderers for the frontend blocks in the template's Markdown files. The template documents its own Vite client,
 * so the Vite rendering keeps the source text and the Next.js rendering adapts or replaces it.
 */
export function frontendDocBlocks(frontend: Frontend): Record<string, DocBlock> {
  // Notes about the boilerplate repository itself (for example its second client) never reach a generated project.
  const common = { 'source-repo-only': '' };
  if (frontend === 'vite') {
    return {
      ...common,
      'frontend-summary': keepBlock,
      'frontend-stack': keepBlock,
      'frontend-tree': keepBlock,
      'frontend-quickstart': keepBlock,
      'frontend-role-route': keepBlock,
      'frontend-crud-steps': keepBlock,
      'frontend-checklist': keepBlock,
    };
  }
  return {
    ...common,
    'frontend-summary': (inner) => replaceOnce(inner, 'Vite', 'Next.js', 'frontend-summary'),
    'frontend-stack': (inner) => replaceOnce(inner, '> Vite', '> Next.js (App Router)', 'frontend-stack'),
    'frontend-tree': (inner) =>
      replaceOnce(
        replaceOnce(inner, '(React + Vite + TypeScript)', '(Next.js App Router + TypeScript)', 'frontend-tree'),
        '# Components, Pages, State, API, Routes',
        '# App Router (src/app), Features, State, API',
        'frontend-tree',
      ),
    'frontend-quickstart': () => NEXT_QUICKSTART,
    'frontend-role-route': () =>
      "  - Trang `/students/create` (`src/app/(main)/students/create/page.tsx`) được bọc bởi `<RoleRoute allowedRoles={['ADMIN', 'TEACHER']}>`.",
    'frontend-crud-steps': nextCrudSteps,
    'frontend-checklist': () => NEXT_CHECKLIST,
  };
}

const NEXT_QUICKSTART = `### 3. Chạy Frontend (Client Next.js)

1. Mở một terminal mới và di chuyển vào thư mục client:
  \`\`\`bash
   cd client
  \`\`\`
2. Cài đặt các gói thư viện:
  \`\`\`bash
   pnpm install --no-frozen-lockfile
   # hoặc: npm install
  \`\`\`
3. Cấu hình biến môi trường trong \`client/.env\` (tạo từ \`.env.example\` nếu chưa có):
  \`\`\`env
   NEXT_PUBLIC_APP_NAME=Hệ thống quản lý đào tạo
   NEXT_PUBLIC_API_BASE_URL=https://localhost:7001
   NEXT_PUBLIC_API_TIMEOUT=15000
  \`\`\`
   - Các biến \`NEXT_PUBLIC_*\` được nhúng vào bundle JavaScript khi chạy \`next dev\` / \`next build\`, nên ai cũng đọc được: **không bao giờ** đặt secret vào đây, và khởi động lại \`next dev\` (hoặc build lại) sau khi thay đổi.
   - \`NEXT_PUBLIC_API_BASE_URL\` là địa chỉ mà **trình duyệt** dùng để gọi API. Khi chạy API trong Docker, hãy dùng port được publish ra máy (ví dụ \`http://localhost:8080\`), không dùng tên service của Compose (trình duyệt không phân giải được tên đó).
4. (Khi API thay đổi) Sinh lại TypeScript type từ OpenAPI của Backend. Backend ở bước 2 phải đang chạy:
  \`\`\`bash
   npm run codegen
  \`\`\`
   Lệnh này ghi \`client/src/types/api.generated.ts\` từ \`http://localhost:5058/swagger/v1/swagger.json\`. Xem bảng script trong [client/README.md](./client/README.md) (ví dụ \`codegen --check\` để kiểm tra type đã cập nhật chưa).
5. Khởi động Next.js Dev Server:
  \`\`\`bash
   npm run dev
  \`\`\`
6. Mở trình duyệt tại: [http://localhost:3000](http://localhost:3000). CORS của API cho phép \`http://localhost:3000\` và \`http://localhost:3001\` ở môi trường Development.

> Các trang cần đăng nhập là client component: token nằm trong \`localStorage\` của trình duyệt, nên dữ liệu được gọi từ trình duyệt tới API .NET, không gọi trong Server Component.`;

const CRUD_STEPS_DETAILS = '### Chi tiết các bước viết code FE:';
const CRUD_STEPS_ROUTES = '5. **Gắn Route & Bảo vệ Route';

/** Keeps the framework-neutral steps 1-4 of the source text and replaces the folder layout and the routing step. */
function nextCrudSteps(inner: string): string {
  const details = inner.indexOf(CRUD_STEPS_DETAILS);
  const routes = inner.indexOf(CRUD_STEPS_ROUTES);
  if (details < 0 || routes < details || inner.indexOf(CRUD_STEPS_ROUTES, routes + 1) >= 0) {
    throw new Error(
      'Documentation block "frontend-crud-steps" no longer has the expected sections; ' +
        'the template changed, so this version of the CLI cannot render it.',
    );
  }
  return `${NEXT_CRUD_LAYOUT}\n\n\n${inner.slice(details, routes)}${NEXT_CRUD_ROUTES}`;
}

const NEXT_CRUD_LAYOUT = `## 5. Các Bước Triển Khai Frontend (Client Next.js)

Mỗi tính năng được gom gọn trong thư mục feature riêng biệt \`client/src/features/<feature>/\`. Thư mục \`src/app/\`
(App Router) chỉ chứa các file route mỏng render view của feature. \`src/pages/\` được Next.js dành cho Pages Router,
nên không dùng cho feature.

\`\`\`text
client/src/features/students/
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
├── views/
│   ├── StudentListView.tsx         # Màn hình danh sách chính (lưu filter trên URL)
│   ├── StudentCreateView.tsx       # Màn hình tạo mới
│   └── StudentDetailView.tsx       # Màn hình xem chi tiết / chỉnh sửa
└── notices.ts                      # Thông báo thành công hiển thị trên trang danh sách (?notice=)

client/src/app/(main)/students/
├── page.tsx                        # /students
├── create/page.tsx                 # /students/create (bọc bởi RoleRoute)
└── [id]/page.tsx                   # /students/[id]
\`\`\``;

const NEXT_CRUD_ROUTES = `5. **Tạo Route & Bảo vệ Route (App Router):**
  Mỗi đường dẫn là một file \`page.tsx\` trong \`src/app/\`. \`src/app/(main)/layout.tsx\` bọc mọi trang của nhóm
  \`(main)\` bằng \`ProtectedRoute\` và \`MainLayout\`; trang cần phân quyền tự bọc view bằng \`RoleRoute\`:
  \`\`\`tsx
   // src/app/(main)/students/create/page.tsx
   export default function StudentCreatePage() {
     return (
       <RoleRoute allowedRoles={['ADMIN', 'TEACHER']}>
         <StudentCreateView />
       </RoleRoute>
     );
   }
  \`\`\`
  Các trang này là client component: dữ liệu được gọi từ trình duyệt (token nằm trong \`localStorage\`), không gọi
  trong Server Component.`;

const NEXT_CHECKLIST = `- [ ] **FE Components & Views:** Tạo Table, Filter, Form trong \`components/\` và ListView, DetailView, CreateView trong \`views/\` của feature.
- [ ] **FE Routes:** Khai báo đường dẫn trong \`routePaths.ts\`, tạo các file \`page.tsx\` tương ứng trong \`src/app/(main)/\` và bọc trang cần phân quyền bằng \`RoleRoute\`.`;
