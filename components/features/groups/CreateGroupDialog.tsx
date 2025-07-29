'use client';

import { Shield } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Permission } from '@/graphql/generated/types';
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';

import { createGroupSchema, CreateGroupFormValues, CreateGroupDialogProps } from './types';

interface CreateGroupDialogComponentProps extends Partial<CreateGroupDialogProps> {
  children?: React.ReactNode;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  children,
}: CreateGroupDialogComponentProps) {
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { tags, loading: tagsLoading } = useTags();
  const { createGroup, addGroupPermission, addGroupTag } = useGroupMutations();

  const fields: CreateDialogField[] = [
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

  const relationships: CreateDialogRelationship[] = [
    {
      name: 'permissionIds',
      label: 'form.permissions',
      renderComponent: (props: any) => <CheckboxList {...props} />,
      items: permissions.map((permission: Permission) => ({
        id: permission.id,
        name: permission.name,
        description: permission.description ?? undefined,
      })),
      loading: permissionsLoading,
      loadingText: 'form.permissionsLoading',
      emptyText: 'form.noPermissionsAvailable',
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
  ];

  const handleCreate = async (values: CreateGroupFormValues) => {
    return await createGroup({
      name: values.name,
      description: values.description,
    });
  };

  const handleAddRelationships = async (groupId: string, values: CreateGroupFormValues) => {
    const promises: Promise<any>[] = [];

    // Add permissions
    if (values.permissionIds && values.permissionIds.length > 0) {
      const addPermissionPromises = values.permissionIds.map((permissionId) =>
        addGroupPermission({
          groupId,
          permissionId,
        }).catch((error: any) => {
          console.error('Error adding group permission:', error);
        })
      );
      promises.push(...addPermissionPromises);
    }

    // Add tags
    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addGroupTag({
          groupId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding group tag:', error);
        })
      );
      promises.push(...addTagPromises);
    }

    await Promise.all(promises);
  };

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      icon={Shield}
      schema={createGroupSchema}
      defaultValues={{
        name: '',
        description: '',
        permissionIds: [],
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="groups"
      submittingText="createDialog.submitting"
    >
      {children}
    </CreateDialog>
  );
}
