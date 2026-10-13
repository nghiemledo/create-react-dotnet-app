import { redirect } from 'next/navigation';
import { ROUTE_PATHS } from '@/routes/routePaths';

export default function NotFound() {
  redirect(ROUTE_PATHS.DASHBOARD);
}
