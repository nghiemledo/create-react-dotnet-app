import { BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react';

const cards = [
  { label: 'Sinh viên', value: '1.248', icon: GraduationCap },
  { label: 'Giảng viên', value: '86', icon: Users },
  { label: 'Lớp đang học', value: '42', icon: BookOpen },
  { label: 'Lịch học hôm nay', value: '18', icon: CalendarDays },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tổng quan đào tạo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Các số liệu dưới đây đang là dữ liệu giao diện mẫu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{card.label}</p>
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50">
                  <Icon className="size-5" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-semibold">{card.value}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
