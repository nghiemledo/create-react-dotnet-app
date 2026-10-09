import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/routes/routePaths';

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Đăng ký tài khoản</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Trong hệ thống quản lý đào tạo, tài khoản thường do quản trị viên cấp. Bạn có thể nối màn hình này với endpoint đăng ký của backend khi nghiệp vụ cho phép.
      </p>
      <Link
        to={ROUTE_PATHS.AUTH.LOGIN}
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
