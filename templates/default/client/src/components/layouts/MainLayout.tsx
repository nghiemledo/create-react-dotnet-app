import { useEffect } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { appConfig } from '@/config/appConfig';
import { queryClient } from '@/lib/queryClient';
import { authApi } from '@/pages/Auth/services/authApi';
import { ROUTE_PATHS } from '@/routes/routePaths';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const navigation = [
  {
    label: 'Tổng quan',
    to: ROUTE_PATHS.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: 'Sinh viên',
    to: ROUTE_PATHS.STUDENTS.LIST,
    icon: GraduationCap,
  },
];

export const MainLayout = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleLogout = async () => {
    await authApi.logout();
    logout();
    queryClient.clear();
    navigate(ROUTE_PATHS.AUTH.LOGIN, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-800">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
            <BookOpen className="size-5" />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{appConfig.name}</p>
              <p className="text-xs text-slate-500">React + .NET</p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="size-5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="size-5" />
            ) : (
              <>
                <ChevronLeft className="size-5" />
                Thu gọn
              </>
            )}
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-200 ${
          sidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div>
            <p className="text-sm font-medium">Quản lý đào tạo</p>
            <p className="text-xs text-slate-500">Dữ liệu đồng bộ từ .NET API</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Đổi giao diện"
            >
              {theme === 'dark' ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>

            <div className="grid size-9 place-items-center rounded-full bg-slate-200 dark:bg-slate-700">
              <Users className="size-4" />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="grid size-9 place-items-center rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
              aria-label="Đăng xuất"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
