import { useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  LoginResponse,
  CreateAccountResult,
  UserAuthenticationMethodProvider,
  AccountType,
  UserAuthenticationEmailProviderAction,
} from '@/graphql/generated/types';
import { setStoredTokens } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

import { LOGIN, LOGOUT, REGISTER } from './mutations';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  accountType: AccountType;
}

export function useAuthMutations() {
  const t = useTranslations('auth');
  const { setAuthData } = useAuthStore();

  const [login] = useMutation<{ login: LoginResponse }>(LOGIN);
  const [logout] = useMutation<{ logout: boolean }>(LOGOUT);
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
        setStoredTokens(loginData.accessToken, loginData.refreshToken);

        setAuthData({
          accounts: loginData.accounts,
          accessToken: loginData.accessToken,
          refreshToken: loginData.refreshToken,
        });
      }

      // Handle verification status
      if (loginData?.requiresEmailVerification) {
        toast.warning(t('login.verificationRequired'), {
          description: t('login.verifyEmailDescription'),
          duration: 8000, // Longer duration for important message
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
        // Store tokens locally
        setStoredTokens(registerData.accessToken, registerData.refreshToken);

        // Create accounts array from single account
        const accounts = [registerData.account];

        // Store account data in Zustand store
        setAuthData({
          accounts,
          accessToken: registerData.accessToken,
          refreshToken: registerData.refreshToken,
        });

        // Handle verification status
        if (registerData?.requiresEmailVerification) {
          toast.warning(t('register.verificationRequired'), {
            description: t('register.verificationRequired'),
            duration: 8000, // Longer duration for important message
          });
        } else {
          toast.success(t('register.success'));
        }
      }

      return registerData;
    } catch (error) {
      console.error('Error registering:', error);

      // Check if it's a validation error with detailed field errors
      if (error instanceof Error && error.message.includes('Input validation failed')) {
        // For validation errors, show a simple message since field-specific errors
        // are already shown via form validation
        toast.error(t('register.error'), {
          description: 'Please check the form for validation errors',
        });
      } else {
        // For other errors (network, server, etc.), show the full error message
        toast.error(t('register.error'), {
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }

      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const result = await logout();
      // Clear auth store will be handled by the logout function in useAuth hook

      toast.success(t('notifications.logoutSuccess'));
      return result.data?.logout;
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
