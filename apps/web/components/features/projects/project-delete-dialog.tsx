'use client';

import { useState } from 'react';

import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
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
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectMutations } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectDeleteDialog() {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const projectToDelete = useProjectsStore((state) => state.projectToDelete);
  const setProjectToDelete = useProjectsStore((state) => state.setProjectToDelete);
  const { deleteProject } = useProjectMutations();

  const [confirmProjectId, setConfirmProjectId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Project,
    ResourceAction.Delete,
    {
      scope: scope!,
      context: projectToDelete
        ? { resource: { id: projectToDelete.id, scope: { projects: [projectToDelete.id] } } }
        : undefined,
      enabled: !!projectToDelete,
      returnLoading: true,
    }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) {
    return null;
  }

  if (!isDeleteLoading && !canDelete) {
    return null;
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setProjectToDelete(null);
      setConfirmProjectId('');
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete || !scope || confirmProjectId !== projectToDelete.id) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(projectToDelete.id, scope);
      handleOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!projectToDelete} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteDialog.description', { name: projectToDelete?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t('deleteDialog.warning')}</AlertDescription>
          </Alert>
          {projectToDelete && (
            <>
              <div className="space-y-2">
                <Label>{t('deleteDialog.projectIdLabel')}</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <code className="flex-1 truncate text-sm font-mono">{projectToDelete.id}</code>
                  <CopyToClipboard text={projectToDelete.id} size="sm" variant="ghost" />
                </div>
                <p className="text-xs text-muted-foreground">{t('deleteDialog.projectIdHint')}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-project-id">{t('deleteDialog.confirmProjectIdLabel')}</Label>
                <Input
                  id="delete-project-id"
                  value={confirmProjectId}
                  onChange={(e) => setConfirmProjectId(e.target.value)}
                  placeholder={t('deleteDialog.confirmProjectIdPlaceholder')}
                  disabled={isDeleting}
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  {t('deleteDialog.confirmProjectIdHint')}
                </p>
              </div>
            </>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} onClick={() => setConfirmProjectId('')}>
            {tCommon('actions.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!confirmProjectId || confirmProjectId !== projectToDelete?.id || isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
