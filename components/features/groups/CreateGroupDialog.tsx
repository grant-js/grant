'use client';

import { Group } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Permission, Tenant } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroupPermissionMutations } from '@/hooks/group-permissions';
import { useGroupTagMutations } from '@/hooks/group-tags';
import { useGroupMutations } from '@/hooks/groups/useGroupMutations';
import { useOrganizationGroupMutations } from '@/hooks/organization-groups/useOrganizationGroupMutations';
import { usePermissions } from '@/hooks/permissions';
import { useProjectGroupMutations } from '@/hooks/project-groups/useProjectGroupMutations';
import { useTags } from '@/hooks/tags';
import { useGroupsStore } from '@/stores/groups.store';

import { createGroupSchema, CreateGroupFormValues } from './types';

export function CreateGroupDialog() {
  const scope = useScopeFromParams();
  const { permissions, loading: permissionsLoading } = usePermissions({ scope });
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { createGroup } = useGroupMutations();
  const { addGroupPermission } = useGroupPermissionMutations();
  const { addGroupTag } = useGroupTagMutations();
  const { addOrganizationGroup } = useOrganizationGroupMutations();
  const { addProjectGroup } = useProjectGroupMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
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
  ];

  const handleCreate = async (values: CreateGroupFormValues) => {
    return await createGroup({
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (groupId: string, values: CreateGroupFormValues) => {
    const promises: Promise<any>[] = [];

    // Add group to tenant
    if (scope.tenant === Tenant.Organization) {
      promises.push(
        addOrganizationGroup({
          organizationId: scope.id,
          groupId,
        }).catch((error: any) => {
          console.error('Error adding organization group:', error);
        })
      );
    } else if (scope.tenant === Tenant.Project) {
      promises.push(
        addProjectGroup({
          projectId: scope.id,
          groupId,
        }).catch((error: any) => {
          console.error('Error adding project group:', error);
        })
      );
    }

    // Add permissions
    if (values.permissionIds && values.permissionIds.length > 0) {
      const addPermissionPromises = values.permissionIds.map((permissionId) =>
        addGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          console.error('Error adding group permission:', error);
        })
      );
      promises.push(...addPermissionPromises);
    }

    // Add tags
    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addGroupTag({
          groupId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding group tag:', error);
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
      cancelText="createDialog.cancel"
      icon={Group}
      schema={createGroupSchema}
      defaultValues={{
        name: '',
        description: '',
        permissionIds: [],
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="groups"
      submittingText="createDialog.submitting"
    />
  );
}
