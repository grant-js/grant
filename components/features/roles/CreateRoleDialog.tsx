'use client';

import { ShieldPlus } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Group } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroups } from '@/hooks/groups';
import { useRoleMutations } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useRolesStore } from '@/stores/roles.store';

import { createRoleSchema, CreateRoleFormValues } from './types';

export function CreateRoleDialog() {
  const scope = useScopeFromParams();
  const { groups, loading: groupsLoading } = useGroups({ scope: scope! });
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { createRole } = useRoleMutations();

  const isCreateDialogOpen = useRolesStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useRolesStore((state) => state.setCreateDialogOpen);

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

  const handleCreate = async (values: CreateRoleFormValues) => {
    return await createRole({
      scope: scope!,
      name: values.name,
      description: values.description,
      groupIds: values.groupIds,
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
      icon={ShieldPlus}
      schema={createRoleSchema}
      defaultValues={{
        name: '',
        description: '',
        groupIds: [],
        tagIds: [],
        primaryTagId: '',
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      translationNamespace="roles"
      submittingText="createDialog.submitting"
    />
  );
}
