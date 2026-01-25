'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Key } from 'lucide-react';
import { DefaultValues } from 'react-hook-form';

import {
  CreateDialog,
  DialogField,
  DialogRelationship,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { useResources } from '@/hooks/resources';
import { useTags } from '@/hooks/tags';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionCreateFormValues, createPermissionSchema } from './permission-types';

export function PermissionCreateDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { resources } = useResources({ scope: scope!, isActive: true, limit: -1 });
  const { createPermission } = usePermissionMutations();
  const isCreateDialogOpen = usePermissionsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = usePermissionsStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.Permission, ResourceAction.Create, {
    scope: scope!,
  });

  if (!scope || !canCreate) {
    return null;
  }

  const resourceOptions = [
    { value: '__none__', label: 'None' },
    ...resources.map((resource) => ({
      value: resource.id,
      label: resource.name,
    })),
  ];

  const getActionOptions = (resourceId: string) => {
    if (!resourceId || resourceId === '__none__') return [];
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource || !resource.actions || resource.actions.length === 0) return [];
    return resource.actions.map((action) => ({
      value: action,
      label: action,
    }));
  };

  const getActionType = (resourceId: string): 'text' | 'select' => {
    if (!resourceId || resourceId === '__none__') return 'text';
    return 'select';
  };

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'resourceId',
      label: 'form.resource',
      placeholder: 'form.noResourceConnected',
      type: 'select',
      options: resourceOptions,
    },
    {
      name: 'action',
      label: 'form.action',
      placeholder: 'form.action',
      type: 'select',
      dependsOn: 'resourceId',
      getType: getActionType,
      getOptions: getActionOptions,
      required: true,
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.description',
      type: 'textarea',
    },
    {
      name: 'condition',
      label: 'form.condition',
      placeholder: 'form.condition',
      info: 'form.conditionInfo',
      type: 'json',
    },
  ];

  const defaultValues: DefaultValues<PermissionCreateFormValues> = {
    name: '',
    action: '',
    description: '',
    resourceId: '__none__',
    tagIds: [],
    primaryTagId: '',
    condition: {},
  };

  const relationships: DialogRelationship[] = [
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

  const handleCreate = async (values: PermissionCreateFormValues) => {
    const conditionValue = values.condition as Record<string, unknown> | null | undefined;

    await createPermission({
      scope: scope!,
      name: values.name,
      action: values.action || '',
      description: values.description,
      resourceId: values.resourceId === '__none__' || !values.resourceId ? null : values.resourceId,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
      condition: conditionValue,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      icon={Key}
      schema={createPermissionSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="createDialog.cancel"
      translationNamespace="permissions"
      submittingText="createDialog.submitting"
      onCreate={handleCreate}
      onOpenChange={handleOpenChange}
    />
  );
}
