import { useApolloClient, useMutation } from '@apollo/client/react';
import {
  CreateUserAuthenticationMethodDocument,
  DeleteUserAuthenticationMethodDocument,
  SetPrimaryAuthenticationMethodDocument,
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { evictMeCache } from '@/hooks/auth/cache';

import { useUserAuthenticationMethods } from './useUserAuthenticationMethods';

export function useUserAuthenticationMethodMutations(userId: string) {
  const t = useTranslations('settings.security.authenticationMethods');
  const { refetch } = useUserAuthenticationMethods(userId);
  const apolloClient = useApolloClient();

  const [createMethod] = useMutation<{ createUserAuthenticationMethod: UserAuthenticationMethod }>(
    CreateUserAuthenticationMethodDocument
  );

  const [deleteMethod] = useMutation<{ deleteUserAuthenticationMethod: UserAuthenticationMethod }>(
    DeleteUserAuthenticationMethodDocument
  );

  const [setPrimary] = useMutation<{ setPrimaryAuthenticationMethod: UserAuthenticationMethod }>(
    SetPrimaryAuthenticationMethodDocument
  );

  const deleteAuthenticationMethod = async (
    id: string,
    isPrimary: boolean,
    isLastMethod: boolean
  ) => {
    if (isPrimary) {
      toast.error(t('cannotDisconnectPrimary'));
      return;
    }

    if (isLastMethod) {
      toast.error(t('cannotDisconnectLastMethod'));
      return;
    }

    try {
      await deleteMethod({
        variables: { input: { id } },
      });
      toast.success(t('disconnected', { provider: 'authentication method' }));
      await refetch();
    } catch (error) {
      console.error('Error deleting authentication method:', error);
      toast.error(t('disconnectError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const setPrimaryMethod = async (id: string) => {
    try {
      await setPrimary({
        variables: { id },
      });
      toast.success(t('primarySet'));
      await refetch();
    } catch (error) {
      console.error('Error setting primary method:', error);
      toast.error(t('setPrimaryError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  const createEmailAuthenticationMethod = async (email: string, password: string) => {
    try {
      await createMethod({
        variables: {
          input: {
            userId,
            provider: UserAuthenticationMethodProvider.Email,
            providerId: email,
            providerData: {
              password,
              action: UserAuthenticationEmailProviderAction.Connect,
            },
          },
        },
      });
      toast.success(t('emailConnected'));
      evictMeCache(apolloClient.cache);
      await refetch();
    } catch (error) {
      console.error('Error creating email authentication method:', error);
      toast.error(t('emailConnectError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createEmailAuthenticationMethod,
    deleteAuthenticationMethod,
    setPrimaryMethod,
  };
}
