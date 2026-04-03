'use client';

import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role, Tag, User as UserType } from '@grantjs/schema';

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
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { getDocsUrl } from '@/lib/constants';
import { useUsersStore } from '@/stores/users.store';

import { editUserSchema, UserEditFormValues } from './user-types';

const mapUserToFormValues = (user: UserType): UserEditFormValues => {
  const metadata = user.metadata ?? null;
  const hasMetadata =
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    Object.keys(metadata).length > 0;
  return {
    name: user.name,
    roleIds: user.roles?.map((role: Role) => role.id),
    tagIds: user.tags?.map((tag: Tag) => tag.id),
    primaryTagId: user.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
    metadataEnabled: !!hasMetadata,
    metadata: metadata || {},
  };
};

const renderCheckboxList = (props: CheckboxListProps) => <CheckboxList {...props} />;
const renderTagCheckboxList = (props: TagCheckboxListProps) => <TagCheckboxList {...props} />;

export function UserEditDialog() {
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope!, limit: -1 });
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { updateUser } = useUserMutations();
  const userToEdit = useUsersStore((state) => state.userToEdit);
  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);

  // Defer permission check until the dialog is actually open
  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.User,
    ResourceAction.Update,
    { scope: scope!, enabled: !!userToEdit, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;
  if (!isUpdateLoading && !canUpdate) return null;

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
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
        href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
        label: 'form.metadataDocsLink',
      },
      partOfCollapsible: 'metadataEnabled',
    },
  ];

  const metadata = userToEdit?.metadata ?? null;
  const hasMetadata =
    metadata &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata) &&
    Object.keys(metadata).length > 0;
  const defaultValues = {
    name: userToEdit?.name || '',
    roleIds: userToEdit?.roles?.map((role: Role) => role.id) || [],
    tagIds: userToEdit?.tags?.map((tag: Tag) => tag.id) || [],
    primaryTagId: userToEdit?.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
    metadataEnabled: !!hasMetadata,
    metadata: metadata || {},
  };

  const roleItems = roles.map((role: Role) => ({
    id: role.id,
    name: role.name,
    description: role.description || undefined,
  }));

  const relationships: DialogRelationship[] = [
    {
      name: 'roleIds',
      label: 'form.roles',
      renderComponent: renderCheckboxList,
      items: roleItems,
      loading: rolesLoading,
      loadingText: 'form.rolesLoading',
      emptyText: 'form.noRolesAvailable',
    },
    {
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: renderTagCheckboxList,
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

  const handleUpdate = async (userId: string, values: UserEditFormValues) => {
    return await updateUser(userId, {
      scope: scope!,
      name: values.name,
      roleIds: values.roleIds,
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
    if (!open) {
      setUserToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={userToEdit}
      open={!!userToEdit}
      schema={editUserSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="users"
      mapEntityToFormValues={mapUserToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
