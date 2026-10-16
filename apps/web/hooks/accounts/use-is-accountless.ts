import { isAccountlessState } from '@/lib/accountless';
import { useAuthStore } from '@/stores/auth.store';

/** True when the user is signed in and the server confirmed they own no account. */
export function useIsAccountless(): boolean {
  return useAuthStore(isAccountlessState);
}
