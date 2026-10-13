import { ROUTE_PATHS } from './routePaths';

/** Login URL that returns to `from` after signing in (replaces React Router's location state). */
export const loginPath = (from?: string | null) =>
  from && isSafeReturnPath(from)
    ? `${ROUTE_PATHS.AUTH.LOGIN}?from=${encodeURIComponent(from)}`
    : ROUTE_PATHS.AUTH.LOGIN;

/** Only same-origin absolute paths are accepted, so `?from=` cannot redirect to another site. */
export const isSafeReturnPath = (value: string | null | undefined): value is string =>
  !!value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\');
