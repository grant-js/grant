'use client';

import { UserPlus } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Role } from '@/graphql/generated/types';
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';

import { createUserSchema, CreateUserFormValues, CreateUserDialogProps } from './types';

interface CreateUserDialogComponentProps extends Partial<CreateUserDialogProps> {
  children?: React.ReactNode;
}

export function CreateUserDialog({ open, onOpenChange, children }: CreateUserDialogComponentProps) {
  const { roles, loading: rolesLoading } = useRoles();
  const { tags, loading: tagsLoading } = useTags();
  const { createUser, addUserRole, addUserTag } = useUserMutations();

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
      renderComponent: (props: any) => <CheckboxList {...props} />,
      items: roles.map((role: Role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? undefined,
      })),
      loading: rolesLoading,
      loadingText: 'form.rolesLoading',
      emptyText: 'form.noRolesAvailable',
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

  const handleCreate = async (values: CreateUserFormValues) => {
    return await createUser({
      name: values.name,
      email: values.email,
    });
  };

  const handleAddRelationships = async (userId: string, values: CreateUserFormValues) => {
    const promises: Promise<any>[] = [];

    // Add roles
    if (values.roleIds && values.roleIds.length > 0) {
      const addRolePromises = values.roleIds.map((roleId) =>
        addUserRole({
          userId,
          roleId,
        }).catch((error: any) => {
          console.error('Error adding user role:', error);
        })
      );
      promises.push(...addRolePromises);
    }

    // Add tags
    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addUserTag({
          userId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding user tag:', error);
        })
      );
      promises.push(...addTagPromises);
    }

    await Promise.all(promises);
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
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="users"
      submittingText="createDialog.submitting"
    >
      {children}
    </CreateDialog>
  );
}
