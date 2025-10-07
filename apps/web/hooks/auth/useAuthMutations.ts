import { useMutation } from '@apollo/client';
import {
  LoginResponse,
  CreateAccountResult,
  UserAuthenticationMethodProvider,
  AccountType,
  UserAuthenticationEmailProviderAction,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';

import { LOGIN, REGISTER } from './mutations';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  username?: string;
  email: string;
  password: string;
  accountType: AccountType;
}

export function useAuthMutations() {
  const t = useTranslations('auth');
  const { setAuthData, clearAuth } = useAuthStore();

  const [login] = useMutation<{ login: LoginResponse }>(LOGIN);
  const [register] = useMutation<{ register: CreateAccountResult }>(REGISTER);

  const handleLogin = async (input: LoginInput) => {
    try {
      const result = await login({
        variables: {
          input: {
            provider: UserAuthenticationMethodProvider.Email,
            providerId: input.email,
            providerData: {
              password: input.password,
              action: UserAuthenticationEmailProviderAction.Login,
            },
          },
        },
      });

      const loginData = result.data?.login;

      if (loginData?.accessToken && loginData?.refreshToken && loginData?.accounts) {
        setAuthData({
          accounts: loginData.accounts,
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        });
      }

      if (loginData?.requiresEmailVerification) {
        toast.warning(t('login.verificationRequired'), {
          description: t('login.verifyEmailDescription'),
          duration: 8000,
        });
      } else {
        toast.success(t('login.success'));
      }

      return loginData;
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error(t('login.error'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRegister = async (input: RegisterInput) => {
    try {
      const result = await register({
        variables: {
          input: {
            name: input.name,
            username: input.username,
            type: input.accountType,
            provider: UserAuthenticationMethodProvider.Email,
            providerId: input.email,
            providerData: {
              password: input.password,
              action: UserAuthenticationEmailProviderAction.Signup,
            },
          },
        },
      });

      const registerData = result.data?.register;

      if (registerData?.accessToken && registerData?.refreshToken && registerData?.account) {
        const accounts = [registerData.account];

        setAuthData({
          accounts,
          accessToken: registerData.accessToken,
          refreshToken: registerData.refreshToken,
        });

        if (registerData?.requiresEmailVerification) {
          toast.warning(t('register.verificationRequired'), {
            description: t('register.verificationRequired'),
            duration: 8000,
          });
        } else {
          toast.success(t('register.success'));
        }
      }

      return registerData;
    } catch (error) {
      console.error('Error registering:', error);

      if (error instanceof Error && error.message.includes('Input validation failed')) {
        toast.error(t('register.error'), {
          description: 'Please check the form for validation errors',
        });
      } else if (
        error instanceof Error &&
        error.message.includes(
          'duplicate key value violates unique constraint "accounts_slug_unique"'
        )
      ) {
        toast.error(t('register.error'), {
          description: t('validation.usernameUnique'),
        });
      } else {
        toast.error(t('register.error'), {
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }

      throw error;
    }
  };

  const handleLogout = async () => {
    // Logout is handled client-side by clearing auth data
    // No server-side logout mutation needed
    try {
      clearAuth();
      toast.success(t('notifications.logoutSuccess'));
      return true;
    } catch (error) {
      toast.error(t('notifications.logoutError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}
