'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useRoleMutations } from '@/hooks/roles';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { useRolesStore } from '@/stores/roles.store';

const slimEditRoleSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
});

type SlimRoleEditFormValues = z.infer<typeof slimEditRoleSchema>;

export function RoleEditDialog() {
  const scope = useScopeFromParams();
  const params = useParams();
  const t = useTranslations('roles');
  const { updateRole } = useRoleMutations();
  const roleToEdit = useRolesStore((state) => state.roleToEdit);
  const setRoleToEdit = useRolesStore((state) => state.setRoleToEdit);

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Role,
    ResourceAction.Update,
    { scope: scope!, enabled: !!roleToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const detailHref = useMemo(() => {
    if (!roleToEdit) return null;
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'roles',
        entityId: roleToEdit.id,
      });
    } catch {
      return null;
    }
  }, [roleToEdit, params.organizationId, params.accountId, params.projectId]);

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
      name: 'description',
      label: 'form.description',
      placeholder: 'form.description',
      type: 'textarea',
    },
  ];

  const mapRoleToFormValues = (role: Role): SlimRoleEditFormValues => ({
    name: role.name,
    description: role.description || '',
  });

  const handleUpdate = async (roleId: string, values: SlimRoleEditFormValues) => {
    await updateRole(roleId, {
      scope: scope!,
      name: values.name,
      description: values.description,
    });
  };

  const defaultValues: DefaultValues<SlimRoleEditFormValues> = {
    name: roleToEdit?.name || '',
    description: roleToEdit?.description || '',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRoleToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!roleToEdit}
      entity={roleToEdit}
      schema={slimEditRoleSchema}
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
      translationNamespace="roles"
      mapEntityToFormValues={mapRoleToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
