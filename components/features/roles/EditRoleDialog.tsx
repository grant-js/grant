'use client';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { PrimaryTagSelector } from '@/components/ui/primary-tag-selector';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Group, Role, Tag } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroups } from '@/hooks/groups';
import { useRoleMutations } from '@/hooks/roles';
import { useTags } from '@/hooks/tags';
import { useRolesStore } from '@/stores/roles.store';

import { editRoleSchema, EditRoleFormValues } from './types';

export function EditRoleDialog() {
  const scope = useScopeFromParams();
  const { groups, loading: groupsLoading } = useGroups({ scope });
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { updateRole } = useRoleMutations();

  const roleToEdit = useRolesStore((state) => state.roleToEdit);
  const setRoleToEdit = useRolesStore((state) => state.setRoleToEdit);

  const fields: EditDialogField[] = [
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

  const relationships: EditDialogRelationship[] = [
    {
      name: 'groupIds',
      label: 'form.groups',
      renderComponent: (props: any) => <CheckboxList {...props} />,
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
      renderComponent: (props: any) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
    {
      name: 'primaryTagId',
      label: 'form.primaryTag',
      renderComponent: (props: any) => <PrimaryTagSelector {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const mapRoleToFormValues = (role: Role): EditRoleFormValues => ({
    name: role.name,
    description: role.description || '',
    groupIds: role.groups?.map((group: Group) => group.id),
    tagIds: role.tags?.map((tag: Tag) => tag.id),
    primaryTagId: role.tags?.find((tag: Tag) => tag.isPrimary)?.id || '',
  });

  const handleUpdate = async (roleId: string, values: EditRoleFormValues) => {
    await updateRole(roleId, {
      name: values.name,
      description: values.description,
      groupIds: values.groupIds,
      tagIds: values.tagIds,
      primaryTagId: values.primaryTagId,
    });
  };

  const defaultValues = {
    name: '',
    description: '',
    groupIds: [],
    tagIds: [],
    primaryTagId: '',
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRoleToEdit(null);
    }
  };

  return (
    <EditDialog
      open={!!roleToEdit}
      onOpenChange={handleOpenChange}
      entity={roleToEdit}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      schema={editRoleSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapRoleToFormValues}
      onUpdate={handleUpdate}
      translationNamespace="roles"
    />
  );
}
