'use client';

import { useTranslations } from 'next-intl';

import {
  EditDialog,
  EditDialogField,
  EditDialogRelationship,
} from '@/components/common/EditDialog';
import { TagCheckboxList } from '@/components/ui/tag-checkbox-list';
import { Tag } from '@/graphql/generated/types';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useTags } from '@/hooks/tags';
import { useTagMutations } from '@/hooks/tags';
import { getAvailableTagColors } from '@/lib/constants/colors';
import { useTagsStore } from '@/stores/tags.store';

import { editTagSchema, EditTagFormValues } from './types';

export function EditTagDialog() {
  const t = useTranslations('tags');
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope });
  const tagToEdit = useTagsStore((state) => state.tagToEdit);
  const setTagToEdit = useTagsStore((state) => state.setTagToEdit);
  const { handleUpdateTag } = useTagMutations();

  const usedColors = tags.map((tag) => tag.color);
  const availableColors = getAvailableTagColors();

  const colorItems = availableColors.map((color) => ({
    id: color,
    name: color,
    color: color,
    disabled: usedColors.includes(color) && color !== tagToEdit?.color,
  }));

  const fields: EditDialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
      required: true,
    },
  ];

  const relationships: EditDialogRelationship[] = [
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

  const mapTagToFormValues = (tag: Tag): EditTagFormValues => ({
    name: tag.name,
    color: tag.color,
  });

  const handleUpdate = async (tagId: string, values: EditTagFormValues) => {
    await handleUpdateTag({
      id: tagId,
      input: {
        name: values.name,
        color: values.color,
      },
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTagToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={tagToEdit}
      open={!!tagToEdit}
      onOpenChange={handleOpenChange}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      schema={editTagSchema}
      defaultValues={{
        name: '',
        color: '',
      }}
      fields={fields}
      relationships={relationships}
      mapEntityToFormValues={mapTagToFormValues}
      onUpdate={handleUpdate}
      translationNamespace="tags"
      updatingText="editDialog.updating"
    />
  );
}
