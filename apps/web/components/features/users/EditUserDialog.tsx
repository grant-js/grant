'use client';

import { Role, Tag, User as UserType } from '@logusgraphics/grant-schema';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { CheckboxList, CheckboxListProps } from '@/components/ui/checkbox-list';
import { PrimaryTagSelector, PrimaryTagSelectorProps } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList, TagCheckboxListProps } from '@/components/ui/tag-checkbox-list';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useRoles } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { EditUserFormValues, editUserSchema } from './types';

const mapUserToFormValues = (user: UserType): EditUserFormValues => ({
  name: user.name,
  roleIds: user.roles?.map((role: Role) => role.id),
  tagIds: user.tags?.map((tag: Tag) => tag.id),
  primaryTagId: user.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
});

const renderCheckboxList = (props: CheckboxListProps) => <CheckboxList {...props} />;
const renderTagCheckboxList = (props: TagCheckboxListProps) => <TagCheckboxList {...props} />;

export function EditUserDialog() {
  const scope = useScopeFromParams();

  const { roles, loading: rolesLoading } = useRoles({ scope: scope! });
  const { tags, loading: tagsLoading } = useTags({ scope: scope! });
  const { updateUser } = useUserMutations();

  const userToEdit = useUsersStore((state) => state.userToEdit);
  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
  ];

  const defaultValues = {
    name: '',
    roleIds: [],
    tagIds: [],
    primaryTagId: '',
  };

  const roleItems = roles.map((role: Role) => ({
    id: role.id,
    name: role.name,
    description: role.description || undefined,
  }));

  const relationships: EditDialogRelationship[] = [
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

  const handleUpdate = async (userId: string, values: EditUserFormValues) => {
    return await updateUser(userId, {
      name: values.name,
      roleIds: values.roleIds,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
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
      onOpenChange={handleOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      schema={editUserSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapUserToFormValues}
      onUpdate={handleUpdate}
      translationNamespace="users"
    />
  );
}
