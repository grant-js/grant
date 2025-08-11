'use client';

import { UserPlus } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Role, Tenant } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useOrganizationUserMutations } from '@/hooks/organization-users';
import { useProjectUserMutations } from '@/hooks/project-users';
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { createUserSchema, CreateUserFormValues } from './types';

export function CreateUserDialog() {
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope });
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { createUser, addUserRole, addUserTag } = useUserMutations();
  const { addOrganizationUser } = useOrganizationUserMutations();
  const { addProjectUser } = useProjectUserMutations();

  const isCreateDialogOpen = useUsersStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useUsersStore((state) => state.setCreateDialogOpen);

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

    if (scope.tenant === Tenant.Organization) {
      promises.push(
        addOrganizationUser({
          organizationId: scope.id,
          userId,
        })
      );
    } else if (scope.tenant === Tenant.Project) {
      promises.push(
        addProjectUser({
          projectId: scope.id,
          userId,
        })
      );
    }

    if (values.roleIds && values.roleIds.length > 0) {
      const addRolePromises = values.roleIds.map((roleId) =>
        addUserRole({
          userId,
          roleId,
        })
      );
      promises.push(...addRolePromises);
    }

    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addUserTag({
          userId,
          tagId,
        })
      );
      promises.push(...addTagPromises);
    }

    await Promise.all(promises);
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      onOpenChange={handleOpenChange}
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
    />
  );
}
