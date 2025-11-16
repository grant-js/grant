import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { Account, UpdateAccountDocument, UpdateAccountInput } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';

interface UpdateAccountParams {
  id: string;
  input: UpdateAccountInput;
}

export function useAccountMutations() {
  const t = useTranslations('settings.account');
  const { accounts, setAccounts, currentAccount, setCurrentAccount } = useAuthStore();

  // Clear any cached account data when mutations occur
  const update = (cache: ApolloCache) => {
    cache.evict({ fieldName: 'accounts' });
    cache.gc();
  };

  const [updateAccountMutation] = useMutation<{ updateAccount: Account }>(UpdateAccountDocument, {
    update,
  });

  const handleUpdateAccount = async ({ id, input }: UpdateAccountParams) => {
    try {
      const result = await updateAccountMutation({
        variables: { id, input },
      });

      const updatedAccount = result.data?.updateAccount;

      if (updatedAccount) {
        // Update the account in the auth store
        const updatedAccounts = accounts.map((account) =>
          account.id === updatedAccount.id ? updatedAccount : account
        );
        setAccounts(updatedAccounts);

        // Update current account if it's the one being updated
        if (currentAccount?.id === updatedAccount.id) {
          setCurrentAccount(updatedAccount);
        }
      }

      toast.success(t('notifications.updateSuccess'));
      return updatedAccount;
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    updateAccount: handleUpdateAccount,
  };
}
