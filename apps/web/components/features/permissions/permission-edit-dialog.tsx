'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { usePermissionsStore } from '@/stores/permissions.store';

const slimEditPermissionSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
});

type SlimPermissionEditFormValues = z.infer<typeof slimEditPermissionSchema>;

export function PermissionEditDialog() {
  const scope = useScopeFromParams();
  const params = useParams();
  const t = useTranslations('permissions');
  const { updatePermission } = usePermissionMutations();
  const permissionToEdit = usePermissionsStore((state) => state.permissionToEdit);
  const setPermissionToEdit = usePermissionsStore((state) => state.setPermissionToEdit);

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Permission,
    ResourceAction.Update,
    { scope: scope!, enabled: !!permissionToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const detailHref = useMemo(() => {
    if (!permissionToEdit) return null;
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'permissions',
        entityId: permissionToEdit.id,
      });
    } catch {
      return null;
    }
  }, [permissionToEdit, params.organizationId, params.accountId, params.projectId]);

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
      required: true,
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.description',
      type: 'textarea',
    },
  ];

  const mapPermissionToFormValues = (permission: Permission): SlimPermissionEditFormValues => ({
    name: permission.name,
    description: permission.description || '',
  });

  const handleUpdate = async (permissionId: string, values: SlimPermissionEditFormValues) => {
    await updatePermission(permissionId, {
      scope: scope!,
      name: values.name,
      description: values.description,
    });
  };

  const defaultValues: DefaultValues<SlimPermissionEditFormValues> = {
    name: permissionToEdit?.name || '',
    description: permissionToEdit?.description || '',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPermissionToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={permissionToEdit}
      open={!!permissionToEdit}
      schema={slimEditPermissionSchema}
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
      translationNamespace="permissions"
      mapEntityToFormValues={mapPermissionToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
