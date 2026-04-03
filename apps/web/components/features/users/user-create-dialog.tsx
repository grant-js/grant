'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { UserPlus } from 'lucide-react';
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
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { getDocsUrl } from '@/lib/constants';
import { useUsersStore } from '@/stores/users.store';

import { createUserSchema, UserCreateFormValues } from './user-types';

export function UserCreateDialog({
  triggerAlwaysShowLabel,
}: {
  /** When true, trigger label is always visible (e.g. empty state). When false/undefined, toolbar responsive behavior. */
  triggerAlwaysShowLabel?: boolean;
} = {}) {
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope!, limit: -1 });
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { createUser } = useUserMutations();
  const isCreateDialogOpen = useUsersStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useUsersStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.User, ResourceAction.Create, {
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

  const defaultValues: DefaultValues<UserCreateFormValues> = {
    name: '',
    roleIds: [],
    tagIds: [],
    primaryTagId: '',
    metadataEnabled: false,
    metadata: {},
  };

  const relationships: DialogRelationship[] = [
    {
      name: 'roleIds',
      label: 'form.roles',
      renderComponent: (props: CheckboxListProps) => <CheckboxList {...props} />,
      items: roles.map((role: Role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? undefined,
      })),
      loading: rolesLoading,
      loadingText: 'form.rolesLoading',
      emptyText: 'form.noRolesAvailable',
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

  const handleCreate = async (values: UserCreateFormValues) => {
    await createUser({
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
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      icon={UserPlus}
      schema={createUserSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      translationNamespace="users"
      submittingText="createDialog.submitting"
      onCreate={handleCreate}
      onOpenChange={handleOpenChange}
      triggerAlwaysShowLabel={triggerAlwaysShowLabel}
    />
  );
}
