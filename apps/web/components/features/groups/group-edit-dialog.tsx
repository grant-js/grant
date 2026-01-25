'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group, Permission, Tag } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';

import {
  CheckboxList,
  CheckboxListProps,
  DialogField,
  DialogRelationship,
  EditDialog,
  PrimaryTagSelector,
  PrimaryTagSelectorProps,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupEditFormValues, editGroupSchema } from './group-types';

export function GroupEditDialog() {
  const scope = useScopeFromParams();
  const { permissions, loading: permissionsLoading } = usePermissions({ scope: scope!, limit: -1 });
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { updateGroup } = useGroupMutations();
  const groupToEdit = useGroupsStore((state) => state.groupToEdit);
  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);

  const canUpdate = useGrant(ResourceSlug.Group, ResourceAction.Update, {
    scope: scope!,
  });

  if (!scope || !canUpdate) {
    return null;
  }

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.description',
      type: 'textarea',
    },
    {
      name: 'metadata',
      label: 'form.metadata',
      placeholder: 'form.metadata',
      type: 'json',
      info: 'form.metadataInfo',
    },
  ];

  const defaultValues: DefaultValues<GroupEditFormValues> = {
    name: groupToEdit?.name || '',
    description: groupToEdit?.description || '',
    permissionIds: [],
    tagIds: [],
    primaryTagId: '',
    metadata: groupToEdit?.metadata || {},
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

  const mapGroupToFormValues = (group: Group): GroupEditFormValues => ({
    name: group.name,
    description: group.description || '',
    permissionIds: group.permissions?.map((permission: Permission) => permission.id),
    tagIds: group.tags?.map((tag: Tag) => tag.id),
    primaryTagId: group.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
    metadata: group.metadata || {},
  });

  const handleUpdate = async (groupId: string, values: GroupEditFormValues) => {
    await updateGroup({
      id: groupId,
      input: {
        scope: scope!,
        name: values.name,
        description: values.description,
        permissionIds: values.permissionIds,
        tagIds: values.tagIds,
        primaryTagId: values.primaryTagId,
        metadata:
          values.metadata &&
          typeof values.metadata === 'object' &&
          !Array.isArray(values.metadata) &&
          Object.keys(values.metadata).length > 0
            ? values.metadata
            : undefined,
      },
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGroupToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={groupToEdit}
      open={!!groupToEdit}
      schema={editGroupSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="groups"
      mapEntityToFormValues={mapGroupToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
