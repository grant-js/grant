import { useState, useEffect } from 'react';

import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import { getRedirectPath, removeStoredTokens } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

interface JWTPayload {
  exp: number;
  sub: string;
  email: string;
}

interface UseAuthOptions {
  disableAutoRedirect?: boolean;
}

interface UseAuthResult {
  user: JWTPayload | null;
  loading: boolean;
  error: Error | undefined;
  isAuthenticated: boolean;
  logout: () => void;
}

export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const { disableAutoRedirect = false } = options;
  const { accessToken, isAuthenticated, currentAccount, clearAuth } = useAuthStore();
  const router = useRouter();
  const locale = useLocale();
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    try {
      const decodedToken = accessToken ? jwtDecode<JWTPayload>(accessToken) : null;

      setUser(decodedToken);
      setLoading(false);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Authentication check failed'));
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!disableAutoRedirect && isAuthenticated && currentAccount) {
      const redirectTo = getRedirectPath(currentAccount.type, currentAccount.id, locale);
      router.replace(redirectTo as any);
    }
  }, [isAuthenticated, currentAccount, locale, router, disableAutoRedirect]);

  const handleLogout = () => {
    removeStoredTokens();
    clearAuth();
    router.push(`/${locale}/auth/login`);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated,
    logout: handleLogout,
  };
}
