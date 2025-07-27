import { useMutation } from '@apollo/client';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { LoginResponse } from '@/graphql/generated/types';
import { LOGIN, LOGOUT } from './mutations';

interface LoginInput {
  email: string;
  password: string;
}

export function useAuthMutations() {
  const t = useTranslations('auth');

  const [login] = useMutation<{ login: LoginResponse }>(LOGIN);
  const [logout] = useMutation<{ logout: boolean }>(LOGOUT);

  const handleLogin = async (input: LoginInput) => {
    try {
      const result = await login({
        variables: { input },
      });

      toast.success(t('notifications.loginSuccess'));
      return result.data?.login;
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error(t('notifications.loginError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const result = await logout();

      toast.success(t('notifications.logoutSuccess'));
      return result.data?.logout;
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error(t('notifications.logoutError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    login: handleLogin,
    logout: handleLogout,
  };
}
