import { useState, useEffect } from 'react';

import { isAuthenticated, getDecodedToken } from '@/lib/auth';

interface JWTPayload {
  exp: number;
  sub: string;
  email: string;
}

interface UseAuthResult {
  user: JWTPayload | null;
  loading: boolean;
  error: Error | undefined;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<JWTPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    try {
      const decodedToken = getDecodedToken();

      setUser(decodedToken);
      setLoading(false);
      setError(undefined);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Authentication check failed'));
      setLoading(false);
    }
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: isAuthenticated(),
  };
}
