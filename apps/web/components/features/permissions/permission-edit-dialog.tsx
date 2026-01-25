'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission, Tag } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';

import {
  DialogField,
  DialogRelationship,
  EditDialog,
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

import { PermissionEditFormValues, editPermissionSchema } from './permission-types';

export function PermissionEditDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { resources } = useResources({ scope: scope!, isActive: true, limit: -1 });
  const { updatePermission } = usePermissionMutations();
  const permissionToEdit = usePermissionsStore((state) => state.permissionToEdit);
  const setPermissionToEdit = usePermissionsStore((state) => state.setPermissionToEdit);

  const canUpdate = useGrant(ResourceSlug.Permission, ResourceAction.Update, {
    scope: scope!,
  });

  if (!scope || !canUpdate) {
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
      required: true,
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

  const defaultValues: DefaultValues<PermissionEditFormValues> = {
    name: permissionToEdit?.name || '',
    action: permissionToEdit?.action || '',
    description: permissionToEdit?.description || '',
    resourceId: permissionToEdit?.resourceId || '__none__',
    tagIds: permissionToEdit?.tags?.map((tag: Tag) => tag.id) || [],
    primaryTagId: permissionToEdit?.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
    condition: permissionToEdit?.condition || {},
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

  const mapPermissionToFormValues = (permission: Permission): PermissionEditFormValues => ({
    name: permission.name,
    action: permission.action || '',
    description: permission.description || '',
    resourceId: permission.resourceId || '__none__',
    tagIds: permission.tags?.map((tag: Tag) => tag.id),
    primaryTagId: permission.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
    condition: permission.condition || {},
  });

  const handleUpdate = async (permissionId: string, values: PermissionEditFormValues) => {
    await updatePermission(permissionId, {
      scope: scope!,
      name: values.name,
      action: values.action || '',
      description: values.description,
      resourceId: values.resourceId === '__none__' || !values.resourceId ? null : values.resourceId,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
      condition: values.condition as Record<string, unknown> | null | undefined,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPermissionToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={permissionToEdit}
      open={!!permissionToEdit}
      schema={editPermissionSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="permissions"
      mapEntityToFormValues={mapPermissionToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
