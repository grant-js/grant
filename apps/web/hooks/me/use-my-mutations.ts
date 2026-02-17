import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  ChangeMyPasswordDocument,
  ChangeMyPasswordInput,
  ChangeMyPasswordResult,
  CreateMySecondaryAccountDocument,
  CreateMySecondaryAccountResult,
  CreateMyUserAuthenticationMethodDocument,
  CreateMyUserAuthenticationMethodInput,
  DeleteMyAccountsDocument,
  DeleteMyAccountsInput,
  DeleteMyUserAuthenticationMethodDocument,
  LogoutMyUserDocument,
  RevokeMyUserSessionDocument,
  RevokeMyUserSessionResult,
  SetMyPrimaryAuthenticationMethodDocument,
  UpdateMyUserDocument,
  UpdateMyUserInput,
  UploadMyUserPictureDocument,
  UploadMyUserPictureInput,
  UploadUserPictureResult,
  User,
  UserAuthenticationMethod,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

import { evictMeCache } from './cache';

export function useMyMutations() {
  const t = useTranslations('settings');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const { setAccounts, clearAuth } = useAuthStore();

  const update = (cache: ApolloCache) => {
    evictMeCache(cache);
  };

  const [createMySecondaryAccount] = useMutation<{
    createMySecondaryAccount: CreateMySecondaryAccountResult;
  }>(CreateMySecondaryAccountDocument, {
    update,
  });

  const [deleteMyAccounts] = useMutation<{ deleteMyAccounts: User }>(DeleteMyAccountsDocument, {
    update,
  });

  const [uploadMyUserPicture] = useMutation<{ uploadMyUserPicture: UploadUserPictureResult }>(
    UploadMyUserPictureDocument,
    {
      update,
    }
  );

  const [updateMyUser] = useMutation<{ updateMyUser: User }>(UpdateMyUserDocument, {
    update,
  });

  const [changeMyPassword] = useMutation<{ changeMyPassword: ChangeMyPasswordResult }>(
    ChangeMyPasswordDocument,
    {
      update,
    }
  );

  const [logoutMyUserMutation] = useMutation(LogoutMyUserDocument);

  const [revokeMyUserSession] = useMutation<{ revokeMyUserSession: RevokeMyUserSessionResult }>(
    RevokeMyUserSessionDocument,
    {
      update,
    }
  );

  const [createMyUserAuthenticationMethod] = useMutation<{
    createMyUserAuthenticationMethod: UserAuthenticationMethod;
  }>(CreateMyUserAuthenticationMethodDocument, {
    update,
  });

  const [deleteMyUserAuthenticationMethod] = useMutation<{
    deleteMyUserAuthenticationMethod: UserAuthenticationMethod;
  }>(DeleteMyUserAuthenticationMethodDocument, {
    update,
  });

  const [setMyPrimaryAuthenticationMethod] = useMutation<{
    setMyPrimaryAuthenticationMethod: UserAuthenticationMethod;
  }>(SetMyPrimaryAuthenticationMethodDocument, {
    update,
  });

  const handleCreateMySecondaryAccount = async () => {
    try {
      const result = await createMySecondaryAccount();

      const data = result.data?.createMySecondaryAccount;

      if (data) {
        setAccounts(data.accounts);
        toast.success(t('account.notifications.createComplementaryAccountSuccess'), {
          description: t('account.notifications.createComplementaryAccountSuccessDescription', {
            type: data.account.type === 'organization' ? 'organization' : 'personal',
          }),
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating secondary account:', error);
      toast.error(t('account.notifications.createComplementaryAccountError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleDeleteMyAccounts = async (input: DeleteMyAccountsInput) => {
    try {
      const result = await deleteMyAccounts({
        variables: { input },
      });

      toast.success(t('account.notifications.deleteSuccess'));
      return result.data?.deleteMyAccounts;
    } catch (error) {
      console.error('Error deleting accounts:', error);
      toast.error(t('account.notifications.deleteError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleUploadMyUserPicture = async (input: UploadMyUserPictureInput) => {
    try {
      const result = await uploadMyUserPicture({
        variables: { input },
      });

      toast.success(t('profile.notifications.uploadPictureSuccess'));
      return result.data?.uploadMyUserPicture;
    } catch (error) {
      console.error('Error uploading user picture:', error);
      toast.error(t('profile.notifications.uploadPictureError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleUpdateMyUser = async (input: UpdateMyUserInput) => {
    try {
      const result = await updateMyUser({
        variables: { input },
      });
      return result.data?.updateMyUser;
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(t('profile.notifications.updateError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleChangeMyPassword = async (input: ChangeMyPasswordInput) => {
    try {
      const result = await changeMyPassword({
        variables: { input },
      });

      toast.success(t('security.notifications.changePasswordSuccess'));
      return result.data?.changeMyPassword;
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('security.notifications.changePasswordError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleRevokeMyUserSession = async (sessionId: string) => {
    try {
      const result = await revokeMyUserSession({
        variables: { id: sessionId },
      });

      toast.success(t('security.notifications.revokeSessionSuccess'));
      return result.data?.revokeMyUserSession;
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error(t('security.notifications.revokeSessionError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleCreateMyUserAuthenticationMethod = async (
    input: CreateMyUserAuthenticationMethodInput
  ) => {
    try {
      const result = await createMyUserAuthenticationMethod({
        variables: { input },
      });

      toast.success(t('security.authenticationMethods.emailConnected'));
      return result.data?.createMyUserAuthenticationMethod;
    } catch (error) {
      console.error('Error creating authentication method:', error);
      toast.error(t('security.authenticationMethods.emailConnectError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleDeleteMyUserAuthenticationMethod = async (id: string) => {
    try {
      const result = await deleteMyUserAuthenticationMethod({
        variables: { id },
      });

      toast.success(
        t('security.authenticationMethods.disconnected', {
          provider: 'authentication method',
        })
      );
      return result.data?.deleteMyUserAuthenticationMethod;
    } catch (error) {
      console.error('Error deleting authentication method:', error);
      toast.error(t('security.authenticationMethods.disconnectError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleSetMyPrimaryAuthenticationMethod = async (id: string) => {
    try {
      const result = await setMyPrimaryAuthenticationMethod({
        variables: { id },
      });

      toast.success(t('security.authenticationMethods.primarySet'));
      return result.data?.setMyPrimaryAuthenticationMethod;
    } catch (error) {
      console.error('Error setting primary method:', error);
      toast.error(t('security.authenticationMethods.setPrimaryError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      throw error;
    }
  };

  const handleLogoutMyUser = async () => {
    try {
      await logoutMyUserMutation();
      clearAuth();
      toast.success(t('notifications.logoutSuccess'));
      router.push('/auth/login');
      return { message: 'Logged out successfully' };
    } catch (error) {
      clearAuth();
      toast.error(t('notifications.logoutError'), {
        description: error instanceof Error ? error.message : tErrors('common.unknownError'),
      });
      router.push('/auth/login');
      throw error;
    }
  };

  return {
    createMySecondaryAccount: handleCreateMySecondaryAccount,
    deleteMyAccounts: handleDeleteMyAccounts,
    uploadMyUserPicture: handleUploadMyUserPicture,
    updateMyUser: handleUpdateMyUser,
    changeMyPassword: handleChangeMyPassword,
    revokeMyUserSession: handleRevokeMyUserSession,
    createMyUserAuthenticationMethod: handleCreateMyUserAuthenticationMethod,
    deleteMyUserAuthenticationMethod: handleDeleteMyUserAuthenticationMethod,
    setMyPrimaryAuthenticationMethod: handleSetMyPrimaryAuthenticationMethod,
    logoutMyUser: handleLogoutMyUser,
  };
}
