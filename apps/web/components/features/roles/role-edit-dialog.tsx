'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group, Role, Tag } from '@grantjs/schema';
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
import { useGroups } from '@/hooks/groups';
import { useRoleMutations } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useRolesStore } from '@/stores/roles.store';

import { RoleEditFormValues, editRoleSchema } from './role-types';

export function RoleEditDialog() {
  const scope = useScopeFromParams();
  const { groups, loading: groupsLoading } = useGroups({ scope: scope!, limit: -1 });
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { updateRole } = useRoleMutations();
  const roleToEdit = useRolesStore((state) => state.roleToEdit);
  const setRoleToEdit = useRolesStore((state) => state.setRoleToEdit);

  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
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

  const relationships: DialogRelationship[] = [
    {
      name: 'groupIds',
      label: 'form.groups',
      renderComponent: (props: CheckboxListProps) => <CheckboxList {...props} />,
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

  const mapRoleToFormValues = (role: Role): RoleEditFormValues => ({
    name: role.name,
    description: role.description || '',
    groupIds: role.groups?.map((group: Group) => group.id),
    tagIds: role.tags?.map((tag: Tag) => tag.id),
    primaryTagId: role.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
    metadata: role.metadata || {},
  });

  const handleUpdate = async (roleId: string, values: RoleEditFormValues) => {
    await updateRole(roleId, {
      scope: scope!,
      name: values.name,
      description: values.description,
      groupIds: values.groupIds,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
      metadata:
        values.metadata &&
        typeof values.metadata === 'object' &&
        !Array.isArray(values.metadata) &&
        Object.keys(values.metadata).length > 0
          ? values.metadata
          : undefined,
    });
  };

  const defaultValues: DefaultValues<RoleEditFormValues> = {
    name: roleToEdit?.name || '',
    description: roleToEdit?.description || '',
    groupIds: roleToEdit?.groups?.map((group: Group) => group.id) || [],
    tagIds: roleToEdit?.tags?.map((tag: Tag) => tag.id) || [],
    primaryTagId: roleToEdit?.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRoleToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!roleToEdit}
      entity={roleToEdit}
      schema={editRoleSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="roles"
      mapEntityToFormValues={mapRoleToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
