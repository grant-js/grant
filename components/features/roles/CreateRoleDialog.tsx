'use client';

import { ShieldPlus } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Group } from '@/graphql/generated/types';
import { Tenant } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroups } from '@/hooks/groups';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useProjectMutations } from '@/hooks/projects';
import { useRoleMutations } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useRolesStore } from '@/stores/roles.store';

import { createRoleSchema, CreateRoleFormValues } from './types';

export function CreateRoleDialog() {
  const scope = useScopeFromParams();
  const { groups, loading: groupsLoading } = useGroups({ scope });
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { createRole, addRoleGroup, addRoleTag } = useRoleMutations();
  const { addProjectRole } = useProjectMutations();
  const { addOrganizationRole } = useOrganizationMutations();

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
  ];

  const handleCreate = async (values: CreateRoleFormValues) => {
    return await createRole({
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (roleId: string, values: CreateRoleFormValues) => {
    const promises: Promise<any>[] = [];

    if (scope.tenant === Tenant.Organization) {
      promises.push(
        addOrganizationRole({
          organizationId: scope.id,
          roleId,
        })
      );
    } else if (scope.tenant === Tenant.Project) {
      promises.push(
        addProjectRole({
          projectId: scope.id,
          roleId,
        })
      );
    }

    if (values.groupIds && values.groupIds.length > 0) {
      const addGroupPromises = values.groupIds.map((groupId) =>
        addRoleGroup({
          roleId,
          groupId,
        })
      );
      promises.push(...addGroupPromises);
    }

    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addRoleTag({
          roleId,
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
      icon={ShieldPlus}
      schema={createRoleSchema}
      defaultValues={{
        name: '',
        description: '',
        groupIds: [],
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="roles"
      submittingText="createDialog.submitting"
    />
  );
}
