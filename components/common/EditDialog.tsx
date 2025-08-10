'use client';

import React, { useState, useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm, DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
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

export interface EditDialogRelationship<T = any> {
  name: string;
  label: string;
  renderComponent: (props: any) => React.ReactNode;
  items: T[];
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
}

export function EditDialog<TFormValues extends Record<string, any>, TEntity>({
  open,
  onOpenChange,
  entity,
  title,
  description,
  confirmText,
  cancelText = 'cancel',
  updatingText = 'updating',
  schema,
  defaultValues,
  fields,
  relationships,
  mapEntityToFormValues,
  onUpdate,
  onAddRelationships,
  onRemoveRelationships,
  translationNamespace,
}: EditDialogProps<TFormValues, TEntity>) {
  const t = useTranslations(translationNamespace);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  // Update form values when entity changes
  useEffect(() => {
    if (entity) {
      const formValues = mapEntityToFormValues(entity);
      const safeFormValues = { ...defaultValues, ...formValues };
      form.reset(safeFormValues);
    }
  }, [entity, mapEntityToFormValues, defaultValues, form]);

  const onSubmit = async (values: TFormValues) => {
    if (!entity) return;

    setIsSubmitting(true);
    try {
      await onUpdate((entity as any).id, values);

      // Handle relationship updates if configured - with proper diffing logic
      if (relationships && onAddRelationships && onRemoveRelationships) {
        // Get current form values to compare with initial entity state
        const entityFormValues = mapEntityToFormValues(entity);

        // Process relationships in parallel to avoid blocking UI
        const relationshipPromises: Promise<void>[] = [];

        for (const relationship of relationships) {
          const relationshipName = relationship.name;
          const initialIds = entityFormValues[relationshipName] || [];
          const newIds = values[relationshipName] || [];

          // Find items to add
          const itemsToAdd = newIds.filter((id: string) => !initialIds.includes(id));
          if (itemsToAdd.length > 0) {
            relationshipPromises.push(
              onAddRelationships((entity as any).id, relationshipName, itemsToAdd)
            );
          }

          // Find items to remove
          const itemsToRemove = initialIds.filter((id: string) => !newIds.includes(id));
          if (itemsToRemove.length > 0) {
            relationshipPromises.push(
              onRemoveRelationships((entity as any).id, relationshipName, itemsToRemove)
            );
          }
        }

        if (relationshipPromises.length > 0) {
          await Promise.all(relationshipPromises);
        }
      }

      // Close dialog after successful update
      if (onOpenChange) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error updating entity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset(defaultValues);
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
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
                  disabled={isSubmitting}
                  {...formField}
                />
              ) : (
                <Input
                  type={field.type}
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  className={hasError ? 'border-red-500' : ''}
                  disabled={isSubmitting}
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription>{t(description)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {fields.map(renderField)}

            {relationships?.map((relationship) => (
              <div key={relationship.name}>
                {relationship.renderComponent({
                  control: form.control,
                  name: relationship.name as any,
                  label: t(relationship.label),
                  items: relationship.items,
                  loading: relationship.loading,
                  loadingText: t(relationship.loadingText),
                  emptyText: t(relationship.emptyText),
                  error: relationship.error,
                  disabled: isSubmitting,
                })}
              </div>
            ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
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
