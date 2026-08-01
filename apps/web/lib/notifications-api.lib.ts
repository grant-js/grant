import type {
  Notification,
  NotificationPage,
  NotificationPreference,
  SetNotificationPreferenceInput,
} from '@grantjs/schema';

import { getApiBaseUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

function authHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().accessToken;
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}/api/me${path}`, {
    credentials: 'include',
    headers: authHeaders(),
    ...init,
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => res.statusText);
    throw new Error(bodyText || `Request failed (${res.status})`);
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

export function listNotifications(options?: {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}): Promise<NotificationPage> {
  const params = new URLSearchParams();
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return request<NotificationPage>(`/notifications${query ? `?${query}` : ''}`);
}

export function getUnreadNotificationCount(): Promise<{ unreadCount: number }> {
  return request<{ unreadCount: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsRead(): Promise<{ updated: number }> {
  return request<{ updated: number }>('/notifications/read-all', { method: 'POST' });
}

export function listNotificationPreferences(
  scopeTenant: string
): Promise<NotificationPreference[]> {
  return request<NotificationPreference[]>(
    `/notification-preferences?${new URLSearchParams({ scopeTenant }).toString()}`
  );
}

export function setNotificationPreference(
  input: SetNotificationPreferenceInput
): Promise<NotificationPreference> {
  return request<NotificationPreference>('/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export type { Notification };
