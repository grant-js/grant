'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User as UserType } from '@grantjs/schema';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useUserMutations } from '@/hooks/users';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { useUsersStore } from '@/stores/users.store';

const slimEditUserSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
});

type SlimUserEditFormValues = z.infer<typeof slimEditUserSchema>;

const mapUserToFormValues = (user: UserType): SlimUserEditFormValues => ({
  name: user.name,
});

export function UserEditDialog() {
  const scope = useScopeFromParams();
  const params = useParams();
  const t = useTranslations('users');
  const { updateUser } = useUserMutations();
  const userToEdit = useUsersStore((state) => state.userToEdit);
  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.User,
    ResourceAction.Update,
    { scope: scope!, enabled: !!userToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const detailHref = useMemo(() => {
    if (!userToEdit) return null;
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'users',
        entityId: userToEdit.id,
      });
    } catch {
      return null;
    }
  }, [userToEdit, params.organizationId, params.accountId, params.projectId]);

  if (!scope || requiresEmailVerification) return null;
  if (!isUpdateLoading && !canUpdate) return null;

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
  ];

  const defaultValues = {
    name: userToEdit?.name || '',
  };

  const handleUpdate = async (userId: string, values: SlimUserEditFormValues) => {
    return await updateUser(userId, {
      scope: scope!,
      name: values.name,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUserToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={userToEdit}
      open={!!userToEdit}
      schema={slimEditUserSchema}
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
      translationNamespace="users"
      mapEntityToFormValues={mapUserToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
