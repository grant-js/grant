'use client';

import { Key } from 'lucide-react';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { usePermissionMutations } from '@/hooks/permissions';
import { useTags } from '@/hooks/tags';

import {
  createPermissionSchema,
  CreatePermissionFormValues,
  CreatePermissionDialogProps,
} from './types';

interface CreatePermissionDialogComponentProps extends Partial<CreatePermissionDialogProps> {
  children?: React.ReactNode;
}

export function CreatePermissionDialog({
  open,
  onOpenChange,
  children,
}: CreatePermissionDialogComponentProps) {
  const { tags, loading: tagsLoading } = useTags();
  const { createPermission, addPermissionTag } = usePermissionMutations();

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

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
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
    >
      {children}
    </CreateDialog>
  );
}
