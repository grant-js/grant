import { useCallback, useState } from 'react';

import { useLazyQuery } from '@apollo/client';
import { UsernameAvailability } from '@logusgraphics/grant-schema';

import { useDebounce } from '@/hooks/common/useDebounce';

import { CHECK_USERNAME } from './queries/checkUsername';

interface UseUsernameValidationReturn {
  isChecking: boolean;
  isAvailable: boolean | null;
  error: string | null;
  checkUsername: (username: string) => void;
}

export function useUsernameValidation(): UseUsernameValidationReturn {
  const [checkUsernameQuery, { loading, error }] = useLazyQuery<{
    checkUsername: UsernameAvailability;
  }>(CHECK_USERNAME);

  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const performUsernameCheck = useCallback(
    (username: string) => {
      // Reset availability state
      setIsAvailable(null);

      // Don't check if username is too short
      if (!username || username.trim().length < 3) {
        return;
      }

      checkUsernameQuery({
        variables: { username: username.trim() },
        onCompleted: (result) => {
          setIsAvailable(result.checkUsername.available);
        },
        onError: () => {
          setIsAvailable(null);
        },
      });
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
