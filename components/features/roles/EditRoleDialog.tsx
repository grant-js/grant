'use client';

import { useTranslations } from 'next-intl';
import { useRoleMutations } from '@/hooks/roles';
import { useGroups } from '@/hooks/groups';
import { Group, Role } from '@/graphql/generated/types';
import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { EditRoleFormValues, editRoleSchema, EditRoleDialogProps } from './types';

export function EditRoleDialog({ role, open, onOpenChange, currentPage }: EditRoleDialogProps) {
  const t = useTranslations('roles');
  const { groups, loading: groupsLoading } = useGroups();
  const { updateRole, addRoleGroup, removeRoleGroup } = useRoleMutations();

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
      type: 'text',
    },
  ];

  const relationships: EditDialogRelationship[] = [
    {
      name: 'groupIds',
      label: 'form.groups',
      items: groups.map((group: Group) => ({
        id: group.id,
        name: group.name,
        description: group.description ?? undefined,
      })),
      loading: groupsLoading,
      loadingText: 'form.groupsLoading',
      emptyText: 'form.noGroupsAvailable',
    },
  ];

  const mapRoleToFormValues = (role: Role): EditRoleFormValues => ({
    name: role.name,
    description: role.description || '',
    groupIds: role.groups?.map((group: Group) => group.id),
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
          // Continue with other group assignments even if one fails
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
          // Handle "RoleGroup not found" error gracefully
          if (error.message?.includes('RoleGroup not found')) {
            console.warn('RoleGroup not found, skipping removal:', { roleId, groupId });
            return;
          }
          console.error('Error removing role group:', error);
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
