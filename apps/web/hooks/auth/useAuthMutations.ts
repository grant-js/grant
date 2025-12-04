import { useMutation } from '@apollo/client/react';
import {
  AccountType,
  CreateAccountResult,
  LoginDocument,
  LoginResponse,
  RegisterDocument,
  RequestPasswordResetDocument,
  RequestPasswordResetResponse,
  ResendVerificationDocument,
  ResendVerificationResponse,
  ResetPasswordDocument,
  ResetPasswordResponse,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
  VerifyEmailDocument,
  VerifyEmailResponse,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  accountType: AccountType;
}

export function useAuthMutations() {
  const t = useTranslations('auth');
  const { setAuthData, clearAuth } = useAuthStore();
  const authStore = useAuthStore();

  const [login] = useMutation<{ login: LoginResponse }>(LoginDocument);
  const [register] = useMutation<{ register: CreateAccountResult }>(RegisterDocument);
  const [verifyEmailMutation] = useMutation<{ verifyEmail: VerifyEmailResponse }>(
    VerifyEmailDocument
  );
  const [resendVerificationMutation] = useMutation<{
    resendVerification: ResendVerificationResponse;
  }>(ResendVerificationDocument);
  const [requestPasswordResetMutation] = useMutation<{
    requestPasswordReset: RequestPasswordResetResponse;
  }>(RequestPasswordResetDocument);
  const [resetPasswordMutation] = useMutation<{
    resetPassword: ResetPasswordResponse;
  }>(ResetPasswordDocument);

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
          email: loginData.email ?? null,
          requiresEmailVerification: loginData.requiresEmailVerification ?? false,
          verificationExpiry: loginData.verificationExpiry ?? null,
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
      const apolloError = error as {
        errors?: Array<{ extensions?: { translationKey?: string } }>;
      };
      const translationKey = apolloError.errors?.[0]?.extensions?.translationKey;

      if (translationKey === 'errors:auth.userNotVerified') {
        toast.error(t('notifications.userNotVerified'), {
          description: t('notifications.verificationExpired'),
          duration: 10000,
          action: {
            label: 'Resend Email',
            onClick: async () => {
              try {
                await resendVerificationMutation({
                  variables: {
                    input: {
                      email: input.email,
                    },
                  },
                });

                toast.success(t('resendVerification.success'), {
                  description: t('resendVerification.successDescription'),
                });
              } catch (resendError) {
                console.error('Error resending verification:', resendError);
                toast.error(t('resendVerification.error'), {
                  description:
                    resendError instanceof Error
                      ? resendError.message
                      : 'An unknown error occurred',
                });
              }
            },
          },
        });
      } else {
        toast.error(t('login.error'), {
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }
      throw error;
    }
  };

  const handleRegister = async (input: RegisterInput) => {
    try {
      const result = await register({
        variables: {
          input: {
            type: input.accountType,
            provider: UserAuthenticationMethodProvider.Email,
            providerId: input.email,
            providerData: {
              password: input.password,
              action: UserAuthenticationEmailProviderAction.Register,
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
          email: registerData.email ?? null,
          requiresEmailVerification: registerData.requiresEmailVerification ?? false,
          verificationExpiry: registerData.verificationExpiry ?? null,
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

  const handleVerifyEmail = async (token: string) => {
    try {
      const result = await verifyEmailMutation({
        variables: {
          input: {
            token,
          },
        },
      });

      const verifyData = result.data?.verifyEmail;

      if (verifyData?.success) {
        // Clear email verification requirement from auth store
        const currentState = authStore;
        if (currentState.accounts.length > 0) {
          setAuthData({
            accounts: currentState.accounts,
            accessToken: currentState.accessToken || '',
            refreshToken: currentState.refreshToken || '',
            email: currentState.email,
            requiresEmailVerification: false,
            verificationExpiry: null,
          });
        }

        toast.success(t('verifyEmail.success'), {
          description: verifyData.message,
        });
      }

      return verifyData;
    } catch (error) {
      console.error('Error verifying email:', error);

      // Check for specific error types
      // Apollo Client error structure has 'errors' not 'graphQLErrors'
      const apolloError = error as { errors?: Array<{ extensions?: { translationKey?: string } }> };
      const graphQLError = apolloError.errors?.[0];
      const translationKey = graphQLError?.extensions?.translationKey;

      if (translationKey === 'errors:auth.tokenExpired') {
        toast.error(t('verifyEmail.expiredToken'), {
          description: t('verifyEmail.expiredTokenDescription'),
        });
      } else {
        toast.error(t('verifyEmail.error'), {
          description: error instanceof Error ? error.message : 'An unknown error occurred',
        });
      }

      throw error;
    }
  };

  const handleResendVerification = async (email: string) => {
    try {
      const result = await resendVerificationMutation({
        variables: {
          input: {
            email,
          },
        },
      });

      const resendData = result.data?.resendVerification;

      if (resendData?.success) {
        toast.success(t('resendVerification.success'), {
          description: resendData.message,
        });
      }

      return resendData;
    } catch (error) {
      console.error('Error resending verification:', error);
      toast.error(t('resendVerification.error'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleRequestPasswordReset = async (email: string) => {
    try {
      const result = await requestPasswordResetMutation({
        variables: {
          input: {
            email,
          },
        },
      });

      const requestData = result.data?.requestPasswordReset;

      if (requestData?.success) {
        toast.success(t('forgotPassword.emailSent'), {
          description: t('forgotPassword.emailSentDescription'),
        });
      }

      return requestData;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      toast.error(t('forgotPassword.error'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const handleResetPassword = async (token: string, newPassword: string) => {
    try {
      const result = await resetPasswordMutation({
        variables: {
          input: {
            token,
            newPassword,
          },
        },
      });

      const resetData = result.data?.resetPassword;

      if (resetData?.success) {
        toast.success(t('resetPassword.success.title'), {
          description: t('resetPassword.success.description'),
        });
      }

      return resetData;
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(t('resetPassword.error.title'), {
        description: error instanceof Error ? error.message : t('resetPassword.error.description'),
      });
      throw error;
    }
  };

  return {
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    verifyEmail: handleVerifyEmail,
    resendVerification: handleResendVerification,
    requestPasswordReset: handleRequestPasswordReset,
    resetPassword: handleResetPassword,
  };
}
