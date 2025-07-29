'use client';

import { useTranslations } from 'next-intl';
import { useUserMutations } from '@/hooks/users';
import { useRoles } from '@/hooks/roles';
import { Role, User } from '@/graphql/generated/types';
import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { EditUserFormValues, editUserSchema, EditUserDialogProps } from './types';

export function EditUserDialog({ user, open, onOpenChange, currentPage }: EditUserDialogProps) {
  const t = useTranslations('users');
  const { roles, loading: rolesLoading } = useRoles();
  const { updateUser, addUserRole, removeUserRole } = useUserMutations();

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'form.email',
      placeholder: 'form.email',
      type: 'email',
      required: true,
    },
  ];

  const relationships: EditDialogRelationship[] = [
    {
      name: 'roleIds',
      label: 'form.roles',
      items: roles.map((role: Role) => ({
        id: role.id,
        name: role.name,
        description: role.description || undefined,
      })),
      loading: rolesLoading,
      loadingText: 'form.rolesLoading',
      emptyText: 'form.noRolesAvailable',
    },
  ];

  const mapUserToFormValues = (user: User): EditUserFormValues => ({
    name: user.name,
    email: user.email,
    roleIds: user.roles?.map((role: Role) => role.id),
  });

  const handleUpdate = async (userId: string, values: EditUserFormValues) => {
    await updateUser(userId, {
      name: values.name,
      email: values.email,
    });
  };

  const handleAddRelationships = async (
    userId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'roleIds') {
      const addPromises = itemIds.map((roleId) =>
        addUserRole({
          userId,
          roleId,
        }).catch((error: any) => {
          console.error('Error adding user role:', error);
          throw error;
        })
      );
      await Promise.all(addPromises);
    }
  };

  const handleRemoveRelationships = async (
    userId: string,
    relationshipName: string,
    itemIds: string[]
  ) => {
    if (relationshipName === 'roleIds') {
      const removePromises = itemIds.map((roleId) =>
        removeUserRole({
          userId,
          roleId,
        }).catch((error: any) => {
          console.error('Error removing user role:', error);
          throw error;
        })
      );
      await Promise.all(removePromises);
    }
  };

  return (
    <EditDialog
      entity={user}
      open={open}
      onOpenChange={onOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      schema={editUserSchema}
      defaultValues={{
        name: '',
        email: '',
        roleIds: [],
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapUserToFormValues}
      onUpdate={handleUpdate}
      onAddRelationships={handleAddRelationships}
      onRemoveRelationships={handleRemoveRelationships}
      translationNamespace="users"
    />
  );
}
