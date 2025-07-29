'use client';

import { useState, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { CheckboxList } from '@/components/ui/checkbox-list';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Generic types for the dialog
export interface EditDialogField {
  name: string;
  label: string;
  placeholder?: string;
  type: 'text' | 'email' | 'textarea';
  validation?: z.ZodString;
  required?: boolean;
}

export interface EditDialogRelationship {
  name: string;
  label: string;
  items: Array<{
    id: string;
    name: string;
    description?: string;
  }>;
  loading: boolean;
  loadingText: string;
  emptyText: string;
  error?: string;
}

export interface EditDialogProps<TFormValues extends Record<string, any>, TEntity> {
  // Dialog props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Entity to edit
  entity: TEntity | null;

  // Content
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  updatingText?: string;

  // Form configuration
  schema: z.ZodSchema<TFormValues>;
  defaultValues: DefaultValues<TFormValues>;
  fields: EditDialogField[];
  relationships?: EditDialogRelationship[];

  // Data mapping
  mapEntityToFormValues: (entity: TEntity) => TFormValues;

  // Actions
  onUpdate: (entityId: string, values: TFormValues) => Promise<any>;
  onAddRelationships?: (
    entityId: string,
    relationshipName: string,
    itemIds: string[]
  ) => Promise<void>;
  onRemoveRelationships?: (
    entityId: string,
    relationshipName: string,
    itemIds: string[]
  ) => Promise<void>;

  // Translation namespace
  translationNamespace: string;

  // Loading state
  isSubmitting?: boolean;
}

export function EditDialog<TFormValues extends Record<string, any>, TEntity>({
  open,
  onOpenChange,
  entity,
  title,
  description,
  confirmText,
  cancelText = 'actions.cancel',
  updatingText = 'actions.updating',
  schema,
  defaultValues,
  fields,
  relationships,
  mapEntityToFormValues,
  onUpdate,
  onAddRelationships,
  onRemoveRelationships,
  translationNamespace,
  isSubmitting = false,
}: EditDialogProps<TFormValues, TEntity>) {
  const t = useTranslations(translationNamespace);

  // Internal state for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<TFormValues | null>(null);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

  const form = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  });

  // Update form values when entity changes
  useEffect(() => {
    if (entity) {
      const formValues = mapEntityToFormValues(entity);
      form.reset(formValues);
      setInitialFormValues(formValues);
    }
  }, [entity, form, mapEntityToFormValues]);

  const onSubmit = async (values: TFormValues) => {
    if (!entity) return;

    try {
      // Update main entity first
      const updatedEntity = await onUpdate((entity as any).id, values);

      // Handle relationship updates if configured
      if (relationships && onAddRelationships && onRemoveRelationships && initialFormValues) {
        for (const relationship of relationships) {
          const relationshipName = relationship.name;
          const initialIds = initialFormValues[relationshipName] || [];
          const newIds = values[relationshipName] || [];

          // Find items to add
          const itemsToAdd = newIds.filter((id: string) => !initialIds.includes(id));
          if (itemsToAdd.length > 0) {
            await onAddRelationships((entity as any).id, relationshipName, itemsToAdd);
          }

          // Find items to remove
          const itemsToRemove = initialIds.filter((id: string) => !newIds.includes(id));
          if (itemsToRemove.length > 0) {
            await onRemoveRelationships((entity as any).id, relationshipName, itemsToRemove);
          }
        }
      }

      setDialogOpen(false);
    } catch (error) {
      // Error handling is done in the specific mutation hooks
      console.error('Error updating entity:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setInitialFormValues(null);
    }
    setDialogOpen(newOpen);
  };

  const renderField = (field: EditDialogField) => {
    const fieldName = field.name as keyof TFormValues;
    const error = form.formState.errors[fieldName];
    const hasError = !!error;

    return (
      <FormField
        key={field.name}
        control={form.control}
        name={fieldName as any}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel>{t(field.label)}</FormLabel>
            <FormControl>
              {field.type === 'textarea' ? (
                <Textarea
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  className="resize-none"
                  {...formField}
                />
              ) : (
                <Input
                  type={field.type}
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  className={hasError ? 'border-red-500' : ''}
                  {...formField}
                />
              )}
            </FormControl>
            {hasError && (
              <FormMessage className="text-red-500 text-sm mt-1">
                {String(error?.message || '')}
              </FormMessage>
            )}
          </FormItem>
        )}
      />
    );
  };

  if (!entity) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription>{t(description)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(renderField)}

            {relationships?.map((relationship) => (
              <CheckboxList
                key={relationship.name}
                control={form.control}
                name={relationship.name as any}
                label={t(relationship.label)}
                items={relationship.items}
                loading={relationship.loading}
                loadingText={t(relationship.loadingText)}
                emptyText={t(relationship.emptyText)}
                error={relationship.error}
              />
            ))}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t(cancelText)}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t(updatingText) : t(confirmText)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
