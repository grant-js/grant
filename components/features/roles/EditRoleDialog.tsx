'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Group, Role, Tag } from '@/graphql/generated/types';
import { useGroups } from '@/hooks/groups';
import { useRoleMutations } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';

import { EditRoleFormValues, editRoleSchema, EditRoleDialogProps } from './types';

export function EditRoleDialog({ role, open, onOpenChange }: EditRoleDialogProps) {
  const { groups, loading: groupsLoading } = useGroups();
  const { tags, loading: tagsLoading } = useTags();
  const { updateRole, addRoleGroup, removeRoleGroup, addRoleTag, removeRoleTag } =
    useRoleMutations();

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
      name: 'groupIds',
      label: 'form.groups',
      renderComponent: (props: any) => <CheckboxList {...props} />,
      items: groups.map((group: Group) => ({
        id: group.id,
        name: group.name,
        description: group.description || undefined,
      })),
      loading: groupsLoading,
      loadingText: 'form.groupsLoading',
      emptyText: 'form.noGroupsAvailable',
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

  const mapRoleToFormValues = (role: Role): EditRoleFormValues => ({
    name: role.name,
    description: role.description || '',
    groupIds: role.groups?.map((group: Group) => group.id),
    tagIds: role.tags?.map((tag: Tag) => tag.id),
  });

  const handleUpdate = async (roleId: string, values: EditRoleFormValues) => {
    await updateRole(roleId, {
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (
    roleId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'groupIds') {
      const addPromises = itemIds.map((groupId) =>
        addRoleGroup({
          roleId,
          groupId,
        }).catch((error: any) => {
          console.error('Error adding role group:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    } else if (relationshipName === 'tagIds') {
      const addPromises = itemIds.map((tagId) =>
        addRoleTag({
          roleId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding role tag:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    roleId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'groupIds') {
      const removePromises = itemIds.map((groupId) =>
        removeRoleGroup({
          roleId,
          groupId,
        }).catch((error: any) => {
          console.error('Error removing role group:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    } else if (relationshipName === 'tagIds') {
      const removePromises = itemIds.map((tagId) =>
        removeRoleTag({
          roleId,
          tagId,
        }).catch((error: any) => {
          console.error('Error removing role tag:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
  };

  return (
    <EditDialog
      entity={role}
      open={open}
      onOpenChange={onOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      schema={editRoleSchema}
      defaultValues={{
        name: '',
        description: '',
        groupIds: [],
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapRoleToFormValues}
      onUpdate={handleUpdate}
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="roles"
    />
  );
}
