'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Permission, Tag } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { usePermissionMutations } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { usePermissionsStore } from '@/stores/permissions.store';

import { EditPermissionFormValues, editPermissionSchema } from './types';

export function EditPermissionDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { updatePermission, addPermissionTag, removePermissionTag } = usePermissionMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
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
  ];

  const mapPermissionToFormValues = (permission: Permission): EditPermissionFormValues => ({
    name: permission.name,
    action: permission.action,
    description: permission.description || '',
    tagIds: permission.tags?.map((tag: Tag) => tag.id),
  });

  const handleUpdate = async (permissionId: string, values: EditPermissionFormValues) => {
    await updatePermission(permissionId, {
      name: values.name,
      action: values.action,
      description: values.description,
    });
  };

  const handleAddRelationships = async (
    permissionId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'tagIds') {
      const addPromises = itemIds.map((tagId) =>
        addPermissionTag({
          permissionId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding permission tag:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    permissionId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'tagIds') {
      const removePromises = itemIds.map((tagId) =>
        removePermissionTag({
          permissionId,
          tagId,
        }).catch((error: any) => {
          console.error('Error removing permission tag:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
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
      schema={editPermissionSchema}
      defaultValues={{
        name: '',
        action: '',
        description: '',
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapPermissionToFormValues}
      onUpdate={handleUpdate}
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="permissions"
    />
  );
}
