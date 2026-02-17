import { useState } from 'react';

import { useLazyQuery, useMutation } from '@apollo/client/react';
import {
  DeleteMyAccountsDocument,
  DeleteMyAccountsInput,
  MyUserDataExportDocument,
  MyUserDataExportQuery,
} from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/i18n/navigation';
import { getCurrentUserId } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth.store';

export function usePrivacySettings() {
  const t = useTranslations('settings.privacy');
  const router = useRouter();
  const { clearAuth, accessToken } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [exportUserDataQuery] = useLazyQuery<MyUserDataExportQuery>(MyUserDataExportDocument);

  const [deleteAccountsMutation] = useMutation(DeleteMyAccountsDocument);

  const handleExportData = async () => {
    const userId = getCurrentUserId(accessToken!);
    if (!userId) {
      toast.error(t('dataExport.error'), {
        description: t('dataExport.loginRequired'),
      });
      return;
    }

    setIsExporting(true);
    try {
      const { data } = await exportUserDataQuery();

      if (!data?.myUserDataExport) {
        throw new Error('No data received from server');
      }

      // Create a blob from the JSON data and trigger download
      const jsonData = JSON.stringify(data.myUserDataExport, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-data-${userId}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('dataExport.success'), {
        description: t('dataExport.downloadSuccess'),
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast.error(t('dataExport.error'), {
        description:
          error instanceof Error ? error.message : t('dataExport.exportErrorDescription'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccounts = async (confirmedUserId: string) => {
    const userId = getCurrentUserId(accessToken!);
    if (!userId) {
      toast.error(t('accountDeletion.error'), {
        description: t('accountDeletion.loginRequired'),
      });
      return;
    }

    // Verify that the entered user ID matches the current user ID
    if (confirmedUserId !== userId) {
      toast.error(t('accountDeletion.error'), {
        description: t('accountDeletion.userIdMismatch'),
      });
      return;
    }

    setIsDeleting(true);
    try {
      const input: DeleteMyAccountsInput = {
        hardDelete: false,
      };

      await deleteAccountsMutation({
        variables: { input },
      });

      toast.success(t('accountDeletion.success'), {
        description: t('accountDeletion.deleteSuccessDescription'),
      });

      // Clear auth and redirect to login
      clearAuth();
      router.push(`/auth/login`);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(t('accountDeletion.error'), {
        description:
          error instanceof Error ? error.message : t('accountDeletion.deleteErrorDescription'),
      });
      throw error; // Re-throw to allow component to handle
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isExporting,
    isDeleting,
    handleExportData,
    handleDeleteAccounts,
  };
}
