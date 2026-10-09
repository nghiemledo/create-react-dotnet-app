import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/routes/routePaths';

export default function ForgotPasswordPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold">Quên mật khẩu</h1>
      <p className="mt-2 text-sm text-slate-500">
        Hãy nối màn hình này với endpoint gửi mã hoặc email đặt lại mật khẩu của backend .NET.
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
