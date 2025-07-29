'use client';

import React, { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { LucideIcon } from 'lucide-react';
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
  DialogTrigger,
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
export interface CreateDialogField {
  name: string;
  label: string;
  placeholder?: string;
  type: 'text' | 'email' | 'textarea';
  validation?: z.ZodString;
  required?: boolean;
}

export interface CreateDialogRelationship<T = any> {
  name: string;
  label: string;
  renderComponent: (props: any) => React.ReactNode;
  items: T[];
  loading: boolean;
  loadingText: string;
  emptyText: string;
  error?: string;
}

export interface CreateDialogProps<TFormValues extends Record<string, any>> {
  // Dialog props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;

  // Content
  title: string;
  description: string;
  triggerText: string;
  confirmText: string;
  cancelText?: string;
  icon: LucideIcon;

  // Form configuration
  schema: z.ZodSchema<TFormValues>;
  defaultValues: DefaultValues<TFormValues>;
  fields: CreateDialogField[];
  relationships?: CreateDialogRelationship[];

  // Actions
  onCreate: (values: TFormValues) => Promise<any>;
  onAddRelationships?: (entityId: string, values: TFormValues) => Promise<void>;

  // Translation namespace
  translationNamespace: string;

  // Loading state
  submittingText?: string;
}

export function CreateDialog<TFormValues extends Record<string, any>>({
  open,
  onOpenChange: _onOpenChange,
  children,
  title,
  description,
  triggerText,
  confirmText,
  cancelText = 'actions.cancel',
  icon: Icon,
  schema,
  defaultValues,
  fields,
  relationships,
  onCreate,
  onAddRelationships,
  translationNamespace,
  submittingText,
}: CreateDialogProps<TFormValues>) {
  const t = useTranslations(translationNamespace);
  const [dialogOpen, setDialogOpen] = useState(open || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const onSubmit = async (values: TFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await onCreate(values);
      if (result?.id && onAddRelationships) {
        await onAddRelationships(result.id, values);
      }
      form.reset(defaultValues);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating entity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset(defaultValues);
    }
    setDialogOpen(newOpen);
    if (_onOpenChange) {
      _onOpenChange(newOpen);
    }
  };

  const renderField = (field: CreateDialogField) => {
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
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Icon className="size-4" />
            {t(triggerText)}
          </Button>
        </DialogTrigger>
      )}
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
                {isSubmitting ? t(submittingText || 'actions.creating') : t(confirmText)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
