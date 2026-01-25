import { useLazyQuery } from '@apollo/client/react';
import { MyUserDataExportDocument, UserDataExport } from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

interface UseMyUserDataExportResult {
  exportUserData: () => Promise<UserDataExport | undefined>;
  loading: boolean;
  error: Error | undefined;
}

export function useMyUserDataExport(): UseMyUserDataExportResult {
  const t = useTranslations('settings.privacy');

  const [exportUserDataQuery, { loading, error }] = useLazyQuery<{
    myUserDataExport: UserDataExport;
  }>(MyUserDataExportDocument);

  const exportUserData = async () => {
    try {
      const result = await exportUserDataQuery();

      if (result.data?.myUserDataExport) {
        // Create a blob and download it
        const blob = new Blob([JSON.stringify(result.data.myUserDataExport, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-data-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(t('notifications.exportSuccess'));
        return result.data.myUserDataExport;
      }
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast.error(t('notifications.exportError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
      throw error;
    }
  };

  return {
    exportUserData,
    loading,
    error: error as Error | undefined,
  };
}
