'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Permission, Tag } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { usePermissionMutations } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { usePermissionsStore } from '@/stores/permissions.store';

import { EditPermissionFormValues, editPermissionSchema } from './types';

export function EditPermissionDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { updatePermission } = usePermissionMutations();

  const permissionToEdit = usePermissionsStore((state) => state.permissionToEdit);
  const setPermissionToEdit = usePermissionsStore((state) => state.setPermissionToEdit);

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
    {
      name: 'action',
      label: 'form.action',
      placeholder: 'form.action',
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

  const relationships: EditDialogRelationship[] = [
    {
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: (props: any) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
    {
      name: 'primaryTagId',
      label: 'form.primaryTag',
      renderComponent: (props: any) => <PrimaryTagSelector {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const mapPermissionToFormValues = (permission: Permission): EditPermissionFormValues => ({
    name: permission.name,
    action: permission.action,
    description: permission.description || '',
    tagIds: permission.tags?.map((tag: Tag) => tag.id),
    primaryTagId: permission.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
  });

  const handleUpdate = async (permissionId: string, values: EditPermissionFormValues) => {
    await updatePermission(permissionId, {
      name: values.name,
      action: values.action,
      description: values.description,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
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
      onOpenChange={handleOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      schema={editPermissionSchema}
      defaultValues={{
        name: '',
        action: '',
        description: '',
        tagIds: [],
        primaryTagId: '',
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapPermissionToFormValues}
      onUpdate={handleUpdate}
      translationNamespace="permissions"
    />
  );
}
