'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { AlertTriangle } from 'lucide-react';

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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmailVerified } from '@/hooks/auth';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useRouter } from '@/i18n/navigation';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationDeleteDialog() {
  const t = useTranslations('organizations');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { deleteOrganization } = useOrganizationMutations();

  const organizationToDelete = useOrganizationsStore((state) => state.organizationToDelete);
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  const [confirmName, setConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const scope = organizationToDelete
    ? { tenant: Tenant.Organization, id: organizationToDelete.id }
    : null;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Organization,
    ResourceAction.Delete,
    {
      scope: scope ?? undefined,
      enabled: !!organizationToDelete,
      returnLoading: true,
    }
  ) as UseGrantResult;
  const isEmailVerified = useEmailVerified();

  if (!scope || !isEmailVerified) {
    return null;
  }

  if (!isDeleteLoading && !canDelete) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOrganizationToDelete(null);
      setConfirmName('');
    }
  };

  const handleDelete = async () => {
    if (!organizationToDelete || confirmName !== organizationToDelete.name) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOrganization(
        {
          id: organizationToDelete.id,
          scope: { id: organizationToDelete.id, tenant: Tenant.Organization },
        },
        organizationToDelete.name
      );
      handleOpenChange(false);
      router.push('/dashboard/organizations');
    } catch {
      // The mutation hook already toasted the failure; stay on this page.
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!organizationToDelete} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteDialog.description', { name: organizationToDelete?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('deleteDialog.warning')}</AlertDescription>
          </Alert>
          {organizationToDelete && (
            <div className="space-y-2">
              <Label htmlFor="delete-org-name">
                {t('deleteDialog.confirmNameLabel', { name: organizationToDelete.name })}
              </Label>
              <Input
                id="delete-org-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={organizationToDelete.name}
                disabled={isDeleting}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">{t('deleteDialog.confirmNameHint')}</p>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => setConfirmName('')}>
            {tCommon('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!confirmName || confirmName !== organizationToDelete?.name || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
