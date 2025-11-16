import { useMutation } from '@apollo/client/react';
import {
  Account,
  CreateComplementaryAccountDocument,
  CreateComplementaryAccountInput,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';

interface CreateComplementaryAccountParams {
  name: string;
  username?: string | null;
}

interface CreateComplementaryAccountResult {
  account: Account;
  accounts: Account[];
}

export function useCreateComplementaryAccount() {
  const t = useTranslations('settings.account');
  const { setAccounts } = useAuthStore();

  const [createComplementaryAccountMutation] = useMutation<
    { createComplementaryAccount: CreateComplementaryAccountResult },
    { input: CreateComplementaryAccountInput }
  >(CreateComplementaryAccountDocument);

  const createComplementaryAccount = async (params: CreateComplementaryAccountParams) => {
    try {
      const result = await createComplementaryAccountMutation({
        variables: {
          input: {
            name: params.name,
            username: params.username || null,
          },
        },
      });

      const data = result.data?.createComplementaryAccount;

      if (data) {
        // Update the auth store with all accounts
        setAccounts(data.accounts);

        toast.success(t('notifications.createComplementaryAccountSuccess'), {
          description: t('notifications.createComplementaryAccountSuccessDescription', {
            type: data.account.type === 'organization' ? 'organization' : 'personal',
          }),
        });
      }

      return data;
    } catch (error) {
      console.error('Error creating complementary account:', error);
      toast.error(t('notifications.createComplementaryAccountError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    createComplementaryAccount,
  };
}

