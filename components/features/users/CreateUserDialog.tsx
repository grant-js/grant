'use client';

import { UserPlus } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Role } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { createUserSchema, CreateUserFormValues } from './types';

export function CreateUserDialog() {
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope });
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { createUser } = useUserMutations();

  const isCreateDialogOpen = useUsersStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useUsersStore((state) => state.setCreateDialogOpen);

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
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

  const handleCreate = async (values: CreateUserFormValues) => {
    return await createUser({
      scope: scope,
      name: values.name,
      roleIds: values.roleIds,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
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
        roleIds: [],
        tagIds: [],
        primaryTagId: '',
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      translationNamespace="users"
      submittingText="createDialog.submitting"
    />
  );
}
