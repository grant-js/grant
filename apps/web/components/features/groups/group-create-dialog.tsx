'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { Group } from 'lucide-react';
import { DefaultValues } from 'react-hook-form';

import {
  CheckboxList,
  CheckboxListProps,
  CreateDialog,
  DialogField,
  DialogRelationship,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { getDocsUrl } from '@/lib/constants';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupCreateFormValues, createGroupSchema } from './group-types';

export function GroupCreateDialog() {
  const scope = useScopeFromParams();
  const { permissions, loading: permissionsLoading } = usePermissions({ scope: scope!, limit: -1 });
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { createGroup } = useGroupMutations();
  const isCreateDialogOpen = useGroupsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useGroupsStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.Group, ResourceAction.Create, {
    scope: scope!,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || !canCreate || requiresEmailVerification) {
    return null;
  }

  const fields: DialogField[] = [
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
    {
      name: 'metadataEnabled',
      label: 'form.showMetadata',
      type: 'collapsible-group',
      contentField: 'metadata',
    },
    {
      name: 'metadata',
      label: 'form.metadata',
      placeholder: 'form.metadata',
      type: 'json',
      info: 'form.metadataInfo',
      infoLink: {
        href: `${getDocsUrl()}/core-concepts/permission-conditions#field-paths`,
        label: 'form.metadataDocsLink',
      },
      partOfCollapsible: 'metadataEnabled',
    },
  ];

  const defaultValues: DefaultValues<GroupCreateFormValues> = {
    name: '',
    description: '',
    permissionIds: [],
    tagIds: [],
    primaryTagId: '',
    metadataEnabled: false,
    metadata: {},
  };

  const relationships: DialogRelationship[] = [
    {
      name: 'permissionIds',
      label: 'form.permissions',
      renderComponent: (props: CheckboxListProps) => <CheckboxList {...props} />,
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
      renderComponent: (props: TagCheckboxListProps) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
    {
      name: 'primaryTagId',
      label: 'form.primaryTag',
      renderComponent: (props: PrimaryTagSelectorProps) => <PrimaryTagSelector {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const handleCreate = async (values: GroupCreateFormValues) => {
    await createGroup({
      name: values.name,
      description: values.description,
      scope: scope!,
      permissionIds: values.permissionIds,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
      metadata:
        values.metadataEnabled &&
        values.metadata &&
        typeof values.metadata === 'object' &&
        !Array.isArray(values.metadata)
          ? values.metadata
          : undefined,
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
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      translationNamespace="groups"
      submittingText="createDialog.submitting"
    />
  );
}
