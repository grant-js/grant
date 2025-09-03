'use client';

import { Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  CreateDialog,
  CreateDialogField,
  CreateDialogRelationship,
} from '@/components/common/CreateDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useTags } from '@/hooks/tags';
import { useTagMutations } from '@/hooks/tags';
import { getAvailableTagColors } from '@/lib/constants/colors';
import { useTagsStore } from '@/stores/tags.store';

import { createTagSchema, CreateTagFormValues } from './types';

export function CreateTagDialog() {
  const t = useTranslations('tags');
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const { handleCreateTag } = useTagMutations();

  const isCreateDialogOpen = useTagsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useTagsStore((state) => state.setCreateDialogOpen);

  const usedColors = tags.map((tag) => tag.color);
  const availableColors = getAvailableTagColors();

  const colorItems = availableColors.map((color) => ({
    id: color,
    name: color,
    color: color,
    disabled: usedColors.includes(color),
  }));

  const fields: CreateDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
      required: true,
    },
  ];

  const relationships: CreateDialogRelationship[] = [
    {
      name: 'color',
      label: 'form.color',
      renderComponent: (props: any) => (
        <TagCheckboxList
          {...props}
          items={colorItems}
          multiple={false}
          loading={tagsLoading}
          loadingText={t('colorPicker.loadingColors')}
          emptyText={t('colorPicker.noColorsAvailable')}
        />
      ),
      items: colorItems,
      loading: tagsLoading,
      loadingText: 'colorPicker.loadingColors',
      emptyText: 'colorPicker.noColorsAvailable',
    },
  ];

  const handleCreate = async (values: CreateTagFormValues) => {
    return await handleCreateTag({
      name: values.name,
      color: values.color,
      scope,
    });
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
      cancelText="createDialog.cancel"
      icon={Tag}
      schema={createTagSchema}
      defaultValues={{
        name: '',
        color: '',
      }}
      fields={fields}
      relationships={relationships}
      onCreate={handleCreate}
      translationNamespace="tags"
      submittingText="createDialog.submitting"
    />
  );
}
