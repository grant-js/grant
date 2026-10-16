'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  Download,
  FolderOpen,
  ShieldAlert,
  Trash2,
  User,
  UserCog,
  UserX,
} from 'lucide-react';

import { CopyToClipboard } from '@/components/common';
import { SettingCard } from '@/components/features/settings';
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { useIsAccountless } from '@/hooks/accounts';
import { useEmailVerified } from '@/hooks/auth';
import { usePrivacySettings } from '@/hooks/privacy';
import { getCurrentUserId } from '@/lib/auth';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { useAuthStore } from '@/stores/auth.store';

const DATA_EXPORT_INCLUDES = [
  { key: 'account' as const, Icon: User },
  { key: 'profile' as const, Icon: UserCog },
  { key: 'sessions' as const, Icon: Activity },
  { key: 'activity' as const, Icon: FolderOpen },
] as const;

const DELETION_CONSEQUENCES = [
  { key: 'data' as const, Icon: Trash2 },
  { key: 'access' as const, Icon: UserX },
  { key: 'irreversible' as const, Icon: ShieldAlert },
  { key: 'retention' as const, Icon: CalendarClock },
] as const;

export function SettingPrivacy() {
  const t = useTranslations('settings.privacy');
  const tCommon = useTranslations('common');
  const { isExporting, isDeleting, handleExportData, handleDeleteAccounts } = usePrivacySettings();
  const { accessToken } = useAuthStore();
  const [deleteUserId, setDeleteUserId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isEmailVerified = useEmailVerified();
  // Without an account there are no "accounts" to delete: the deletion removes the identity.
  const isAccountless = useIsAccountless();
  const deletionKey = isAccountless ? 'identityDeletion' : 'accountDeletion';

  const currentUserId = useMemo(() => getCurrentUserId(accessToken!), [accessToken]);

  const onDeleteAccounts = async () => {
    if (!deleteUserId || deleteUserId !== currentUserId) {
      return;
    }

    await handleDeleteAccounts(deleteUserId);
    setDeleteDialogOpen(false);
    setDeleteUserId('');
  };

  return (
    <div className="space-y-6">
      {/* Data Export Card */}
      <SettingCard title={t('dataExport.title')} description={t('dataExport.description')}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('dataExport.info')}</p>
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">{t('dataExport.includes.title')}</p>
            <ItemGroup className="gap-4">
              {DATA_EXPORT_INCLUDES.map(({ key, Icon }) => (
                <Item key={key} variant="default" size="sm">
                  <ItemMedia variant="icon">
                    <Icon className="size-4 text-muted-foreground" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t(`dataExport.includes.${key}Title`)}</ItemTitle>
                    <ItemDescription>{t(`dataExport.includes.${key}Description`)}</ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </div>
          <Button onClick={handleExportData} disabled={isExporting} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? t('dataExport.exporting') : t('dataExport.export')}
          </Button>
        </div>
      </SettingCard>

      {/* Account Deletion Card */}
      <SettingCard title={t(`${deletionKey}.title`)} description={t(`${deletionKey}.description`)}>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t(`${deletionKey}.warning`)}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <p className="text-sm font-medium">{t(`${deletionKey}.consequences.title`)}</p>
            <ItemGroup className="gap-4">
              {DELETION_CONSEQUENCES.map(({ key, Icon }) => (
                <Item key={key} variant="default" size="sm">
                  <ItemMedia variant="icon">
                    <Icon className="size-4 text-muted-foreground" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{t(`${deletionKey}.consequences.${key}Title`)}</ItemTitle>
                    <ItemDescription>
                      {key === 'retention'
                        ? t('dataRetention.deleted.description', {
                            days: getRuntimeConfig().accountDeletionRetentionDays,
                          })
                        : t(`${deletionKey}.consequences.${key}Description`)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              ))}
            </ItemGroup>
          </div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
                disabled={!isEmailVerified}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t(`${deletionKey}.deleteButton`)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t(`${deletionKey}.dialog.title`)}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(`${deletionKey}.dialog.description`)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{t(`${deletionKey}.dialog.warning`)}</AlertDescription>
                </Alert>
                {currentUserId && (
                  <div className="space-y-2">
                    <Label>{t(`${deletionKey}.dialog.userIdLabel`)}</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                      <code className="flex-1 text-sm font-mono">{currentUserId}</code>
                      <CopyToClipboard text={currentUserId} size="sm" variant="ghost" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`${deletionKey}.dialog.userIdHint`)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="delete-user-id">
                    {t(`${deletionKey}.dialog.confirmUserIdLabel`)}
                  </Label>
                  <Input
                    id="delete-user-id"
                    value={deleteUserId}
                    onChange={(e) => setDeleteUserId(e.target.value)}
                    placeholder={t(`${deletionKey}.dialog.confirmUserIdPlaceholder`)}
                    disabled={isDeleting || !currentUserId}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t(`${deletionKey}.dialog.confirmUserIdHint`)}
                  </p>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting} onClick={() => setDeleteUserId('')}>
                  {tCommon('actions.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDeleteAccounts}
                  disabled={!deleteUserId || deleteUserId !== currentUserId || isDeleting}
                  variant="destructive"
                >
                  {isDeleting
                    ? t(`${deletionKey}.dialog.deleting`)
                    : t(`${deletionKey}.dialog.confirm`)}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingCard>
    </div>
  );
}
