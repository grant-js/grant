'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Resource } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { useResourcesStore } from '@/stores/resources.store';

const slimEditResourceSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  slug: z.string().min(1, 'errors.validation.required'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type SlimResourceEditFormValues = z.infer<typeof slimEditResourceSchema>;

export function ResourceEditDialog() {
  const scope = useScopeFromParams();
  const params = useParams();
  const t = useTranslations('resources');
  const { updateResource } = useResourceMutations();
  const resourceToEdit = useResourcesStore((state) => state.resourceToEdit);
  const setResourceToEdit = useResourcesStore((state) => state.setResourceToEdit);

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Resource,
    ResourceAction.Update,
    { scope: scope!, enabled: !!resourceToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const detailHref = useMemo(() => {
    if (!resourceToEdit) return null;
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'resources',
        entityId: resourceToEdit.id,
      });
    } catch {
      return null;
    }
  }, [resourceToEdit, params.organizationId, params.accountId, params.projectId]);

  if (!scope || requiresEmailVerification) {
    return null;
  }

  if (!isUpdateLoading && !canUpdate) {
    return null;
  }

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'slug',
      label: 'form.slug',
      placeholder: 'form.slugPlaceholder',
      type: 'slug',
      autoSlugifyFrom: 'name',
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.descriptionPlaceholder',
      type: 'textarea',
    },
    {
      name: 'isActive',
      label: 'form.isActive',
      type: 'switch',
      info: 'form.isActiveInfo',
    },
  ];

  const mapResourceToFormValues = (resource: Resource): SlimResourceEditFormValues => ({
    name: resource.name,
    slug: resource.slug,
    description: resource.description || '',
    isActive: resource.isActive,
  });

  const handleUpdate = async (resourceId: string, values: SlimResourceEditFormValues) => {
    await updateResource({
      id: resourceId,
      input: {
        scope: scope!,
        name: values.name,
        slug: values.slug,
        description: values.description,
        isActive: values.isActive,
      },
    });
  };

  const defaultValues: DefaultValues<SlimResourceEditFormValues> = {
    name: resourceToEdit?.name || '',
    slug: resourceToEdit?.slug || '',
    description: resourceToEdit?.description || '',
    isActive: resourceToEdit?.isActive ?? true,
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setResourceToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!resourceToEdit}
      entity={resourceToEdit}
      schema={slimEditResourceSchema}
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
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="resources"
      mapEntityToFormValues={mapResourceToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
