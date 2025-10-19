import { useCallback, useState } from 'react';

import { useLazyQuery } from '@apollo/client/react';
import { CheckUsernameDocument, UsernameAvailability } from '@logusgraphics/grant-schema';

import { useDebounce } from '@/hooks/common/useDebounce';

interface UseUsernameValidationReturn {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
  checkUsername: (username: string) => void;
}

export function useUsernameValidation(): UseUsernameValidationReturn {
  const [checkUsernameQuery, { loading, error }] = useLazyQuery<{
    checkUsername: UsernameAvailability;
  }>(CheckUsernameDocument);

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const performUsernameCheck = useCallback(
    async (username: string) => {
      // Reset availability state
      setIsAvailable(null);

      // Don't check if username is too short
      if (!username || username.trim().length < 3) {
        return;
      }

      try {
        const result = await checkUsernameQuery({
          variables: { username: username.trim() },
        });

        if (result.data) {
          setIsAvailable(result.data.checkUsername.available);
        }
      } catch {
        setIsAvailable(null);
      }
    },
    [checkUsernameQuery]
  );

  const debouncedCheckUsername = useDebounce(performUsernameCheck, 300);

  const checkUsername = useCallback(
    (username: string) => {
      debouncedCheckUsername(username);
    },
    [debouncedCheckUsername]
  );

  return {
    isChecking: loading,
    isAvailable,
    error: error?.message || null,
    checkUsername,
  };
}
