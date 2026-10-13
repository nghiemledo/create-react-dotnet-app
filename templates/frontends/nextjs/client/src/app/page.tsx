import { redirect } from 'next/navigation';
import { ROUTE_PATHS } from '@/routes/routePaths';

export default function HomePage() {
  redirect(ROUTE_PATHS.DASHBOARD);
}
