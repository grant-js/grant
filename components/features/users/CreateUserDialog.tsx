'use client';

import { useTranslations } from 'next-intl';
import { createUserSchema, CreateUserFormValues, CreateUserDialogProps } from './types';
import { useUserMutations } from '@/hooks/users';
import { useRoles } from '@/hooks/roles';
import { Role } from '@/graphql/generated/types';
import { UserPlus } from 'lucide-react';
import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';

interface CreateUserDialogComponentProps extends Partial<CreateUserDialogProps> {
  children?: React.ReactNode;
}

export function CreateUserDialog({ open, onOpenChange, children }: CreateUserDialogComponentProps) {
  const t = useTranslations('users');
  const { roles, loading: rolesLoading } = useRoles();
  const { createUser, addUserRole } = useUserMutations();

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'email',
      label: 'form.email',
      placeholder: 'form.email',
      type: 'email',
    },
  ];

  const relationships: CreateDialogRelationship[] = [
    {
      name: 'roleIds',
      label: 'form.roles',
      items: roles.map((role: Role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? undefined,
      })),
      loading: rolesLoading,
      loadingText: 'form.rolesLoading',
      emptyText: 'form.noRolesAvailable',
    },
  ];

  const handleCreate = async (values: CreateUserFormValues) => {
    return await createUser({
      name: values.name,
      email: values.email,
    });
  };

  const handleAddRelationships = async (userId: string, values: CreateUserFormValues) => {
    if (values.roleIds && values.roleIds.length > 0) {
      const addPromises = values.roleIds.map((roleId) =>
        addUserRole({
          userId,
          roleId,
        }).catch((error: any) => {
          console.error('Error adding user role:', error);
        })
      );
      await Promise.all(addPromises);
    }
  };

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      icon={UserPlus}
      schema={createUserSchema}
      defaultValues={{
        name: '',
        email: '',
        roleIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="users"
    >
      {children}
    </CreateDialog>
  );
}
