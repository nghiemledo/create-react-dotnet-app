import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { authApi, toAuthUser } from '@/pages/Auth/services/authApi';
import { ROUTE_PATHS } from '@/routes/routePaths';
import { useAuthStore } from '@/store/authStore';
import { getApiErrorMessage } from '@/utils/handleApiError';
import { mapBackendRole } from '@/utils/roles';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await authApi.login({ email, password });
      if (!result.token) {
        throw new Error('Không nhận được token đăng nhập.');
      }

      login(
        {
          id: result.user?.id ?? '',
          email: result.user?.email ?? email,
          fullName: result.user?.email ?? email,
          role: mapBackendRole(result.user?.role),
        },
        result.token,
      );

      try {
        const profile = await authApi.me();
        login(toAuthUser(profile), result.token);
      } catch {
        // Token đã lưu, thiếu profile không chặn vào hệ thống.
      }

      const state = location.state as LocationState | null;
      navigate(state?.from ?? ROUTE_PATHS.DASHBOARD, { replace: true });
    } catch (loginError) {
      setError(getApiErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-slate-500">
          Dùng tài khoản Identity trên server.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <label className="block space-y-1.5 text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 dark:border-slate-700"
            required
          />
        </label>

        <label className="block space-y-1.5 text-sm font-medium">
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 outline-none focus:border-blue-500 dark:border-slate-700"
            required
            minLength={3}
          />
        </label>

        <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link className="font-medium text-blue-600 hover:underline" to={ROUTE_PATHS.AUTH.REGISTER}>
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
