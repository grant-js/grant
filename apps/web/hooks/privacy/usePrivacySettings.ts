import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useLazyQuery, useMutation } from '@apollo/client/react';
import {
  DeleteAccountDocument,
  DeleteAccountInput,
  ExportUserDataDocument,
  ExportUserDataQuery,
} from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useAuthStore } from '@/stores/auth.store';

export function usePrivacySettings() {
  const t = useTranslations('settings.privacy');
  const router = useRouter();
  const { clearAuth, getCurrentUserId } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [exportUserDataQuery] = useLazyQuery<ExportUserDataQuery>(ExportUserDataDocument);

  const [deleteAccountMutation] = useMutation(DeleteAccountDocument);

  const handleExportData = async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t('dataExport.error'), {
        description: 'You must be logged in to export your data',
      });
      return;
    }

    setIsExporting(true);
    try {
      const { data } = await exportUserDataQuery();

      if (!data?.exportUserData) {
        throw new Error('No data received from server');
      }

      // Create a blob from the JSON data and trigger download
      const jsonData = JSON.stringify(data.exportUserData, null, 2);
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
        description: 'Your data has been downloaded successfully',
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast.error(t('dataExport.error'), {
        description: error instanceof Error ? error.message : 'Failed to export your data',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async (confirmedUserId: string) => {
    const userId = getCurrentUserId();
    if (!userId) {
      toast.error(t('accountDeletion.error'), {
        description: 'You must be logged in to delete your account',
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
      const input: DeleteAccountInput = {
        userId,
        hardDelete: false,
      };

      await deleteAccountMutation({
        variables: { input },
      });

      toast.success(t('accountDeletion.success'), {
        description: 'Your account has been deleted successfully',
      });

      // Clear auth and redirect to login
      clearAuth();
      const currentPath = window.location.pathname;
      const locale = currentPath.split('/')[1] || 'en';
      router.push(`/${locale}/auth/login`);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(t('accountDeletion.error'), {
        description: error instanceof Error ? error.message : 'Failed to delete your account',
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
    handleDeleteAccount,
  };
}
