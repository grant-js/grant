'use client';

import { Key } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { usePermissionMutations } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';
import { usePermissionsStore } from '@/stores/permissions.store';

import { createPermissionSchema, CreatePermissionFormValues } from './types';

export function CreatePermissionDialog() {
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { createPermission, addPermissionTag } = usePermissionMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const isCreateDialogOpen = usePermissionsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = usePermissionsStore((state) => state.setCreateDialogOpen);

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
    },
    {
      name: 'action',
      label: 'form.action',
      placeholder: 'form.action',
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
      name: 'tagIds',
      label: 'form.tags',
      renderComponent: (props: any) => <TagCheckboxList {...props} />,
      items: tags,
      loading: tagsLoading,
      loadingText: 'form.tagsLoading',
      emptyText: 'form.noTagsAvailable',
    },
  ];

  const handleCreate = async (values: CreatePermissionFormValues) => {
    return await createPermission({
      name: values.name,
      description: values.description,
      action: values.action,
    });
  };

  const handleAddRelationships = async (
    permissionId: string,
    values: CreatePermissionFormValues
  ) => {
    const promises: Promise<any>[] = [];

    // Add tags
    if (values.tagIds && values.tagIds.length > 0) {
      const addTagPromises = values.tagIds.map((tagId) =>
        addPermissionTag({
          permissionId,
          tagId,
        }).catch((error: any) => {
          console.error('Error adding permission tag:', error);
        })
      );
      promises.push(...addTagPromises);
    }

    await Promise.all(promises);
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      onOpenChange={handleOpenChange}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="deleteDialog.cancel"
      icon={Key}
      schema={createPermissionSchema}
      defaultValues={{
        name: '',
        action: '',
        description: '',
        tagIds: [],
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      onAddRelationships={handleAddRelationships}
      translationNamespace="permissions"
      submittingText="createDialog.submitting"
    />
  );
}
