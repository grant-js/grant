'use client';

import { useState } from 'react';

import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CopyToClipboard } from '@/components/common';
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
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationDeleteDialog() {
  const t = useTranslations('organizations');
  const tCommon = useTranslations('common');
  const { deleteOrganization } = useOrganizationMutations();

  const organizationToDelete = useOrganizationsStore((state) => state.organizationToDelete);
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  const [confirmOrgId, setConfirmOrgId] = useState('');
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
      setConfirmOrgId('');
    }
  };

  const handleDelete = async () => {
    if (!organizationToDelete || confirmOrgId !== organizationToDelete.id) {
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
            <>
              <div className="space-y-2">
                <Label>{t('deleteDialog.orgIdLabel')}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <code className="flex-1 truncate text-sm font-mono">
                    {organizationToDelete.id}
                  </code>
                  <CopyToClipboard text={organizationToDelete.id} size="sm" variant="ghost" />
                </div>
                <p className="text-xs text-muted-foreground">{t('deleteDialog.orgIdHint')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-org-id">{t('deleteDialog.confirmOrgIdLabel')}</Label>
                <Input
                  id="delete-org-id"
                  value={confirmOrgId}
                  onChange={(e) => setConfirmOrgId(e.target.value)}
                  placeholder={t('deleteDialog.confirmOrgIdPlaceholder')}
                  disabled={isDeleting}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {t('deleteDialog.confirmOrgIdHint')}
                </p>
              </div>
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => setConfirmOrgId('')}>
            {tCommon('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!confirmOrgId || confirmOrgId !== organizationToDelete?.id || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
