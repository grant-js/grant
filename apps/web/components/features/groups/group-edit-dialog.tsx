'use client';

import { useGrant, type UseGrantResult } from '@grantjs/client/react';
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
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { getDocsUrl } from '@/lib/constants';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupEditFormValues, editGroupSchema } from './group-types';

export function GroupEditDialog() {
  const scope = useScopeFromParams();
  const { permissions, loading: permissionsLoading } = usePermissions({ scope: scope!, limit: -1 });
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { updateGroup } = useGroupMutations();
  const groupToEdit = useGroupsStore((state) => state.groupToEdit);
  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Group,
    ResourceAction.Update,
    { scope: scope!, enabled: !!groupToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) {
    return null;
  }

  if (!isUpdateLoading && !canUpdate) {
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

  const metadata = groupToEdit?.metadata ?? {};
  const hasMetadata =
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    Object.keys(metadata).length > 0;
  const defaultValues: DefaultValues<GroupEditFormValues> = {
    name: groupToEdit?.name || '',
    description: groupToEdit?.description || '',
    permissionIds: [],
    tagIds: [],
    primaryTagId: '',
    metadataEnabled: !!hasMetadata,
    metadata: metadata || {},
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

  const mapGroupToFormValues = (group: Group): GroupEditFormValues => {
    const metadata = group.metadata ?? {};
    const hasMetadata =
      metadata &&
      typeof metadata === 'object' &&
      !Array.isArray(metadata) &&
      Object.keys(metadata).length > 0;
    return {
      name: group.name,
      description: group.description || '',
      permissionIds: group.permissions?.map((permission: Permission) => permission.id),
      tagIds: group.tags?.map((tag: Tag) => tag.id),
      primaryTagId: group.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
      metadataEnabled: !!hasMetadata,
      metadata: metadata || {},
    };
  };

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
          values.metadataEnabled &&
          values.metadata &&
          typeof values.metadata === 'object' &&
          !Array.isArray(values.metadata)
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
