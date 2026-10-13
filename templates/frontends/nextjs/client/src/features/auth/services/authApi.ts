import { appConfig } from '@/config/appConfig';
import { apiClient } from '@/lib/apiClient';
import type { AuthUser } from '@/types/permission.types';
import { mapBackendRole } from '@/utils/roles';
import { unwrapApiResult, type ApiPayload } from '@/utils/unwrapApiResult';

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthUserPayload {
  id: string;
  email: string;
  role?: string | null;
  roleId?: string | null;
}

interface AuthResponse {
  token?: string | null;
  refreshToken?: string | null;
  user?: AuthUserPayload | null;
}

interface ProfileResponse {
  id: string;
  email: string;
  role?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userName?: string | null;
}

const toFullName = (lastName?: string | null, firstName?: string | null, fallback = '') => {
  const fullName = [lastName, firstName].filter(Boolean).join(' ').trim();
  return fullName || fallback;
};

export const toAuthUser = (profile: ProfileResponse): AuthUser => ({
  id: profile.id,
  email: profile.email,
  fullName: toFullName(profile.lastName, profile.firstName, profile.email),
  role: mapBackendRole(profile.role),
});

export const authApi = {
  async login(payload: LoginRequest) {
    const response = await apiClient.post<ApiPayload<AuthResponse>>(
      `${appConfig.endpoints.auth}/login`,
      payload,
    );

    return unwrapApiResult(response.data);
  },

  async me() {
    const response = await apiClient.get<ApiPayload<ProfileResponse>>(
      `${appConfig.endpoints.auth}/me`,
    );

    return unwrapApiResult(response.data);
  },

  async logout() {
    try {
      await apiClient.post(`${appConfig.endpoints.auth}/logout`);
    } catch {
      // Token hết hạn vẫn cho phép đăng xuất local.
    }
  },
};
