'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { ProjectApp } from '@grantjs/schema';
import type { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { type DialogField, EditDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectAppMutations } from '@/hooks/project-apps';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { useProjectAppsStore } from '@/stores/project-apps.store';

const slimEditProjectAppSchema = z.object({
  name: z.string().max(255, 'errors.validation.nameTooLong').min(1, 'errors.validation.required'),
});

export type SlimProjectAppEditFormValues = z.infer<typeof slimEditProjectAppSchema>;

export function ProjectAppEditDialog() {
  const t = useTranslations('projectApps');
  const scope = useScopeFromParams();
  const params = useParams();
  const projectAppToEdit = useProjectAppsStore((state) => state.projectAppToEdit);
  const setProjectAppToEdit = useProjectAppsStore((state) => state.setProjectAppToEdit);
  const { updateProjectApp } = useProjectAppMutations();

  const canUpdate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Update, {
    scope: scope!,
    enabled: !!projectAppToEdit,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const detailHref = useMemo(() => {
    if (!projectAppToEdit) return null;
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'apps',
        entityId: projectAppToEdit.id,
      });
    } catch {
      return null;
    }
  }, [projectAppToEdit, params.organizationId, params.accountId, params.projectId]);

  const defaultValues: DefaultValues<SlimProjectAppEditFormValues> = useMemo(
    () => ({
      name: '',
    }),
    []
  );

  const fields: DialogField[] = useMemo(
    () => [
      {
        name: 'name',
        label: 'form.name',
        placeholder: 'form.namePlaceholder',
        type: 'text' as const,
      },
    ],
    []
  );

  const mapEntityToFormValues = (app: ProjectApp): SlimProjectAppEditFormValues => ({
    name: app.name ?? '',
  });

  const handleUpdate = async (id: string, values: SlimProjectAppEditFormValues) => {
    if (!scope) return;
    await updateProjectApp(id, {
      scope,
      name: values.name.trim(),
    });
  };

  if (!scope || requiresEmailVerification || !canUpdate || !projectAppToEdit) {
    return null;
  }

  return (
    <EditDialog<SlimProjectAppEditFormValues, ProjectApp>
      open={!!projectAppToEdit}
      onOpenChange={(open) => !open && setProjectAppToEdit(null)}
      entity={projectAppToEdit}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.submitting"
      schema={slimEditProjectAppSchema}
      defaultValues={defaultValues}
      fields={fields}
      supplementaryContent={
        detailHref ? (
          <p className="text-sm text-muted-foreground">
            {t('editDialog.manageRelationshipsPrefix')}{' '}
            <Link href={detailHref} className="text-primary hover:underline">
              {t('editDialog.manageRelationshipsLink')}
            </Link>
          </p>
        ) : null
      }
      translationNamespace="projectApps"
      mapEntityToFormValues={mapEntityToFormValues}
      onUpdate={handleUpdate}
    />
  );
}
