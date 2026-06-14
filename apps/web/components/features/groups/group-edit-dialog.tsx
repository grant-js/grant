'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { Link } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';
import { useGroupsStore } from '@/stores/groups.store';

const slimEditGroupSchema = z.object({
  name: z.string().min(2, 'errors.validation.labelMin2'),
  description: z.string().optional(),
});

type SlimGroupEditFormValues = z.infer<typeof slimEditGroupSchema>;

export function GroupEditDialog() {
  const scope = useScopeFromParams();
  const params = useParams();
  const t = useTranslations('groups');
  const { updateGroup } = useGroupMutations();
  const groupToEdit = useGroupsStore((state) => state.groupToEdit);
  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Group,
    ResourceAction.Update,
    { scope: scope!, enabled: !!groupToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const detailHref = useMemo(() => {
    if (!groupToEdit) return null;
    try {
      return getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'groups',
        entityId: groupToEdit.id,
      });
    } catch {
      return null;
    }
  }, [groupToEdit, params.organizationId, params.accountId, params.projectId]);

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

  const mapGroupToFormValues = (group: Group): SlimGroupEditFormValues => ({
    name: group.name,
    description: group.description || '',
  });

  const handleUpdate = async (groupId: string, values: SlimGroupEditFormValues) => {
    await updateGroup({
      id: groupId,
      input: {
        scope: scope!,
        name: values.name,
        description: values.description,
      },
    });
  };

  const defaultValues: DefaultValues<SlimGroupEditFormValues> = {
    name: groupToEdit?.name || '',
    description: groupToEdit?.description || '',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGroupToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={groupToEdit}
      open={!!groupToEdit}
      schema={slimEditGroupSchema}
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
      translationNamespace="groups"
      mapEntityToFormValues={mapGroupToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
