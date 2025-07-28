'use client';

import { useState } from 'react';
import { useForm, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import { useTranslations } from 'next-intl';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { LucideIcon } from 'lucide-react';

// Generic types for the dialog
export interface CreateDialogField {
  name: string;
  label: string;
  placeholder?: string;
  type: 'text' | 'email' | 'textarea';
  validation?: z.ZodString;
  required?: boolean;
}

export interface CreateDialogRelationship {
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
  isSubmitting?: boolean;
  submittingText?: string;
}

export function CreateDialog<TFormValues extends Record<string, any>>({
  open,
  onOpenChange,
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
  isSubmitting = false,
  submittingText,
}: CreateDialogProps<TFormValues>) {
  const t = useTranslations(translationNamespace);

  // Internal state for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

  const form = useForm<TFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  });

  const onSubmit = async (values: TFormValues) => {
    try {
      // Create main entity first
      const createdEntity = await onCreate(values);

      // Add relationships if entity was created and relationships are configured
      if (createdEntity?.id && onAddRelationships && relationships) {
        await onAddRelationships(createdEntity.id, values);
      }

      setDialogOpen(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the specific mutation hooks
      console.error('Error creating entity:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    setDialogOpen(newOpen);
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
                {isSubmitting ? t(submittingText || 'actions.creating') : t(confirmText)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
