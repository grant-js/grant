'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Group, Permission, Tag } from '@/graphql/generated/types';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { useGroupsStore } from '@/stores/groups.store';

import { EditGroupFormValues, editGroupSchema } from './types';

export function EditGroupDialog() {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { tags, loading: tagsLoading } = useTags();
  const { updateGroup, addGroupPermission, removeGroupPermission, addGroupTag, removeGroupTag } =
    useGroupMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const groupToEdit = useGroupsStore((state) => state.groupToEdit);
  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);

  const fields: EditDialogField[] = [
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

  const relationships: EditDialogRelationship[] = [
    {
      name: 'permissionIds',
      label: 'form.permissions',
      renderComponent: (props: any) => <CheckboxList {...props} />,
      items: permissions.map((permission: Permission) => ({
        id: permission.id,
        name: permission.name,
        description: permission.description || undefined,
      })),
      loading: permissionsLoading,
      loadingText: 'form.permissionsLoading',
      emptyText: 'form.noPermissionsAvailable',
    },
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

  const mapGroupToFormValues = (group: Group): EditGroupFormValues => ({
    name: group.name,
    description: group.description || '',
    permissionIds: group.permissions?.map((permission: Permission) => permission.id),
    tagIds: group.tags?.map((tag: Tag) => tag.id),
  });

  const handleUpdate = async (groupId: string, values: EditGroupFormValues) => {
    await updateGroup(groupId, {
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (
    groupId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'permissionIds') {
      const addPromises = itemIds.map((permissionId) =>
        addGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          console.error('Error adding group permission:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    } else if (relationshipName === 'tagIds') {
      const addPromises = itemIds.map((tagId) =>
        addGroupTag({
          groupId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding group tag:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    groupId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'permissionIds') {
      const removePromises = itemIds.map((permissionId) =>
        removeGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          console.error('Error removing group permission:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    } else if (relationshipName === 'tagIds') {
      const removePromises = itemIds.map((tagId) =>
        removeGroupTag({
          groupId,
          tagId,
        }).catch((error: any) => {
          console.error('Error removing group tag:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
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
      onOpenChange={handleOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      schema={editGroupSchema}
      defaultValues={{
        name: '',
        description: '',
        permissionIds: [],
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapGroupToFormValues}
      onUpdate={handleUpdate}
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="groups"
    />
  );
}
