'use client';

import { Group } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Permission } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroupMutations } from '@/hooks/groups/useGroupMutations';
import { usePermissions } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { useGroupsStore } from '@/stores/groups.store';

import { createGroupSchema, CreateGroupFormValues } from './types';

export function CreateGroupDialog() {
  const scope = useScopeFromParams();
  const { permissions, loading: permissionsLoading } = usePermissions({ scope: scope! });
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { createGroup } = useGroupMutations();

  const isCreateDialogOpen = useGroupsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useGroupsStore((state) => state.setCreateDialogOpen);

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.description',
      type: 'textarea',
    },
  ];

  const relationships: CreateDialogRelationship[] = [
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

  const handleCreate = async (values: CreateGroupFormValues) => {
    return await createGroup({
      name: values.name,
      description: values.description,
      scope: scope!,
      permissionIds: values.permissionIds,
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
      cancelText="createDialog.cancel"
      icon={Group}
      schema={createGroupSchema}
      defaultValues={{
        name: '',
        description: '',
        permissionIds: [],
        tagIds: [],
        primaryTagId: '',
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      translationNamespace="groups"
      submittingText="createDialog.submitting"
    />
  );
}
