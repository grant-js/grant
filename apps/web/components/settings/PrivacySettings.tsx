'use client';

import { useState } from 'react';

import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CopyToClipboard } from '@/components/common/CopyToClipboard';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePrivacySettings } from '@/hooks/privacy';
import { useAuthStore } from '@/stores/auth.store';

export function PrivacySettings() {
  const t = useTranslations('settings.privacy');
  const tCommon = useTranslations('common');
  const { isExporting, isDeleting, handleExportData, handleDeleteAccount } = usePrivacySettings();
  const { getCurrentUserId } = useAuthStore();
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const currentUserId = getCurrentUserId();

  const onDeleteAccount = async () => {
    if (!deleteUserId) {
      return;
    }

    try {
      await handleDeleteAccount(deleteUserId);
      setDeleteDialogOpen(false);
      setDeleteUserId('');
    } catch {
      // Error is already handled in the hook with toast notification
      // Keep dialog open so user can retry
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Export Card */}
      <SettingsCard title={t('dataExport.title')} description={t('dataExport.description')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('dataExport.info')}</p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">{t('dataExport.includes.title')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('dataExport.includes.account')}</li>
              <li>{t('dataExport.includes.profile')}</li>
              <li>{t('dataExport.includes.sessions')}</li>
              <li>{t('dataExport.includes.activity')}</li>
            </ul>
          </div>
          <Button onClick={handleExportData} disabled={isExporting} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? t('dataExport.exporting') : t('dataExport.export')}
          </Button>
        </div>
      </SettingsCard>

      {/* Data Retention Card */}
      <SettingsCard title={t('dataRetention.title')} description={t('dataRetention.description')}>
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">{t('dataRetention.active.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('dataRetention.active.description')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">{t('dataRetention.deleted.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('dataRetention.deleted.description')}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">{t('dataRetention.backup.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('dataRetention.backup.description')}
              </p>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Account Deletion Card */}
      <SettingsCard
        title={t('accountDeletion.title')}
        description={t('accountDeletion.description')}
      >
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('accountDeletion.warning')}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t('accountDeletion.consequences.title')}</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t('accountDeletion.consequences.data')}</li>
              <li>{t('accountDeletion.consequences.access')}</li>
              <li>{t('accountDeletion.consequences.irreversible')}</li>
            </ul>
          </div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('accountDeletion.deleteButton')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('accountDeletion.dialog.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('accountDeletion.dialog.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{t('accountDeletion.dialog.warning')}</AlertDescription>
                </Alert>
                {currentUserId && (
                  <div className="space-y-2">
                    <Label>{t('accountDeletion.dialog.userIdLabel')}</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      <code className="flex-1 text-sm font-mono">{currentUserId}</code>
                      <CopyToClipboard text={currentUserId} size="sm" variant="ghost" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('accountDeletion.dialog.userIdHint')}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="delete-user-id">
                    {t('accountDeletion.dialog.confirmUserIdLabel')}
                  </Label>
                  <Input
                    id="delete-user-id"
                    value={deleteUserId}
                    onChange={(e) => setDeleteUserId(e.target.value)}
                    placeholder={t('accountDeletion.dialog.confirmUserIdPlaceholder')}
                    disabled={isDeleting || !currentUserId}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('accountDeletion.dialog.confirmUserIdHint')}
                  </p>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting} onClick={() => setDeleteUserId('')}>
                  {tCommon('actions.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAccount}
                  disabled={!deleteUserId || deleteUserId !== currentUserId || isDeleting}
                  variant="destructive"
                >
                  {isDeleting
                    ? t('accountDeletion.dialog.deleting')
                    : t('accountDeletion.dialog.confirm')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingsCard>
    </div>
  );
}
