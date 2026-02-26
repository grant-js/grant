'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DefaultValues, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
  ChipArray,
  DialogField,
  DialogRelationship,
  JsonEditor,
  SlugInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DatePicker } from '@/components/ui/date-picker';
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
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface FormDialogProps<TFormValues extends Record<string, any>> {
  open?: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText?: string;
  submittingText?: string;
  schema: z.ZodSchema<TFormValues>;
  defaultValues: DefaultValues<TFormValues>;
  fields: DialogField[];
  relationships?: DialogRelationship[];
  translationNamespace: string;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (values: TFormValues) => Promise<void>;
  trigger?: ReactNode;
  onReset?: () => void;
  resetValues?: DefaultValues<TFormValues>;
}

export function FormDialog<TFormValues extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText = 'cancel',
  submittingText,
  schema,
  defaultValues,
  fields,
  relationships,
  onSubmit,
  translationNamespace,
  trigger,
  onReset,
  resetValues,
}: FormDialogProps<TFormValues>) {
  const t = useTranslations(translationNamespace);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TFormValues>({
    // @ts-expect-error - Zod v4 schema type compatibility with react-hook-form (known issue)
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit', // Only validate on submit, not on change
    reValidateMode: 'onBlur', // After first submit, validate on blur
  });

  useEffect(() => {
    if (resetValues !== undefined) {
      form.reset(resetValues);
    } else if (onReset) {
      onReset();
    } else if (!open) {
      const timer = setTimeout(() => {
        form.reset(defaultValues);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [open, form, defaultValues, onReset, resetValues]);

  useEffect(() => {
    const dependencyMap = new Map<string, string[]>();
    fields.forEach((field) => {
      if (field.dependsOn) {
        const dependentFields = dependencyMap.get(field.dependsOn) || [];
        dependentFields.push(field.name);
        dependencyMap.set(field.dependsOn, dependentFields);
      }
      // When a field has showWhen, reset its value when the toggle field changes to false
      if (field.showWhen) {
        const toggleField = field.showWhen.field;
        const dependentFields = dependencyMap.get(toggleField) || [];
        dependentFields.push(field.name);
        dependencyMap.set(toggleField, dependentFields);
      }
      // When a field is partOfCollapsible, reset its value when the collapsible closes
      if (field.partOfCollapsible) {
        const toggleField = field.partOfCollapsible;
        const dependentFields = dependencyMap.get(toggleField) || [];
        dependentFields.push(field.name);
        dependencyMap.set(toggleField, dependentFields);
      }
    });

    if (dependencyMap.size === 0) {
      return;
    }

    const subscription = form.watch((value, { name }) => {
      if (name && dependencyMap.has(name)) {
        const dependentFields = dependencyMap.get(name)!;
        const toggleValue = value[name];
        dependentFields.forEach((dependentField) => {
          const fieldConfig = fields.find((f) => f.name === dependentField);
          const shouldReset =
            (fieldConfig?.showWhen && toggleValue !== fieldConfig.showWhen.value) ||
            (fieldConfig?.partOfCollapsible && !toggleValue);
          const resetValue = shouldReset
            ? fieldConfig?.type === 'json'
              ? {}
              : null
            : (defaultValues[dependentField] ?? null);
          form.setValue(dependentField as any, resetValue, {
            shouldValidate: false,
          });
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [form, fields, defaultValues]);

  const handleSubmit = async (values: TFormValues): Promise<void> => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
      if (onOpenChange) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isSubmitting && !newOpen) {
      return;
    }

    if (!newOpen && !onReset) {
      form.reset(defaultValues);
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const handleInteractionOutside = (event: Event) => {
    if (isSubmitting) {
      event.preventDefault();
    }
  };

  const handleEscapeKeyDown = (event: KeyboardEvent) => {
    if (isSubmitting) {
      event.preventDefault();
    }
  };

  const watchedNameValue = useWatch({
    control: form.control as any,
    name: 'name' as any,
    defaultValue: '',
  });

  const watchedResourceId = useWatch({
    control: form.control as any,
    name: 'resourceId' as any,
    defaultValue: '',
  });

  const watchedAllValues = useWatch({
    control: form.control as any,
    defaultValue: defaultValues as any,
  });

  const watchedValues: Record<string, any> = {
    name: String(watchedNameValue || ''),
    resourceId: watchedResourceId || '',
    ...watchedAllValues,
  };

  const renderField = (field: DialogField, fromCollapsibleContent = false) => {
    const fieldName = field.name as keyof TFormValues;
    const error = form.formState.errors[fieldName];
    const hasError = !!error;

    // Skip fields that are rendered inside a collapsible (unless we're rendering from there)
    if (field.partOfCollapsible && !fromCollapsibleContent) {
      return null;
    }

    if (field.showWhen) {
      const toggleValue = watchedValues[field.showWhen.field];
      if (toggleValue !== field.showWhen.value) {
        return null;
      }
    }

    const fieldType =
      field.dependsOn && field.getType
        ? field.getType(watchedValues[field.dependsOn] || '')
        : field.type;

    const autoSlugifySourceValue =
      fieldType === 'slug' && field.autoSlugifyFrom
        ? watchedValues[field.autoSlugifyFrom] || ''
        : undefined;

    if (fieldType === 'actions') {
      return (
        <div key={field.name} className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t(field.label)}
            </label>
            {field.info && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Field information"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 z-[99999999]" align="start">
                  <p className="text-sm text-muted-foreground">{t(field.info)}</p>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <ChipArray
            control={form.control as any}
            name={field.name}
            label=""
            placeholder={field.placeholder ? t(field.placeholder) : undefined}
            disabled={isSubmitting}
            error={hasError ? (error?.message as string) : undefined}
          />
        </div>
      );
    }

    return (
      <FormField
        key={field.name}
        // @ts-expect-error - Zod v4 generic type compatibility with react-hook-form Control
        control={form.control}
        name={fieldName as any}
        render={({ field: formField }) => (
          <FormItem>
            {fieldType !== 'collapsible-group' && !fromCollapsibleContent && (
              <FormLabel className="flex items-center gap-2">
                {t(field.label)}
                {field.info && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Field information"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 z-[99999999]" align="start">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{t(field.info)}</p>
                        {field.infoLink && (
                          <a
                            href={field.infoLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            {field.infoLink.label
                              ? t(field.infoLink.label)
                              : 'Full syntax reference'}
                          </a>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </FormLabel>
            )}
            <FormControl>
              {fieldType === 'textarea' ? (
                <Textarea
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  className="resize-none"
                  disabled={isSubmitting}
                  {...formField}
                />
              ) : fieldType === 'date' ? (
                <DatePicker
                  date={formField.value as Date | undefined}
                  onDateChange={(date) => formField.onChange(date)}
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  disabled={isSubmitting}
                  className={hasError ? 'border-red-500' : ''}
                />
              ) : fieldType === 'collapsible-group' && field.contentField ? (
                (() => {
                  const contentFieldConfig = fields.find((f) => f.name === field.contentField);
                  return (
                    <Collapsible
                      open={!!formField.value}
                      onOpenChange={(open) => formField.onChange(open)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {t(contentFieldConfig?.label ?? field.label)}
                            {contentFieldConfig?.info && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex shrink-0 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                    aria-label="Field information"
                                  >
                                    <Info className="w-4 h-4" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-80 z-[99999999]"
                                  align="start"
                                  onOpenAutoFocus={(e) => e.preventDefault()}
                                >
                                  <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                      {t(contentFieldConfig.info)}
                                    </p>
                                    {contentFieldConfig.infoLink && (
                                      <a
                                        href={contentFieldConfig.infoLink.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline"
                                      >
                                        {contentFieldConfig.infoLink.label
                                          ? t(contentFieldConfig.infoLink.label)
                                          : 'Full syntax reference'}
                                      </a>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                          </span>
                          {formField.value ? (
                            <ChevronDown className="h-4 w-4 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-2">
                        {contentFieldConfig ? renderField(contentFieldConfig, true) : null}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })()
              ) : fieldType === 'switch' ? (
                <Switch
                  checked={formField.value as boolean}
                  onCheckedChange={(checked) => formField.onChange(checked)}
                  disabled={isSubmitting}
                />
              ) : fieldType === 'slug' ? (
                <SlugInput
                  value={formField.value as string}
                  onChange={(value) => formField.onChange(value)}
                  autoSlugifyFrom={autoSlugifySourceValue}
                  onAutoSlugify={(slug) => formField.onChange(slug)}
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  className={hasError ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
              ) : fieldType === 'select' ? (
                <Select
                  value={formField.value || ''}
                  onValueChange={(value) => formField.onChange(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={cn(hasError ? 'border-red-500' : '')}>
                    {field.options?.some((o) => o.description) ? (
                      <span className="min-w-0 flex-1 truncate text-left">
                        {formField.value ? (
                          (field.options.find((o) => o.value === formField.value)?.label ??
                          formField.value)
                        ) : (
                          <span className="text-muted-foreground">
                            {field.placeholder ? t(field.placeholder) : t('form.selectPlaceholder')}
                          </span>
                        )}
                      </span>
                    ) : (
                      <SelectValue
                        placeholder={
                          field.placeholder ? t(field.placeholder) : t('form.selectPlaceholder')
                        }
                      />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {field.options && field.options.length > 0
                      ? field.options.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            disabled={option.disabled}
                          >
                            {option.description ? (
                              <div className="flex flex-col">
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground">
                                  {option.description}
                                </span>
                              </div>
                            ) : (
                              option.label
                            )}
                          </SelectItem>
                        ))
                      : field.dependsOn && field.getOptions
                        ? (() => {
                            const dependsOnValue = watchedValues[field.dependsOn] || '';
                            const dynamicOptions = field.getOptions(dependsOnValue);
                            return dynamicOptions.length > 0 ? (
                              dynamicOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                {t('form.noOptionsAvailable')}
                              </div>
                            );
                          })()
                        : null}
                  </SelectContent>
                </Select>
              ) : fieldType === 'json' ? (
                <JsonEditor
                  value={formField.value as object | string | undefined}
                  onChange={(value) => {
                    formField.onChange(value);
                    // Don't trigger validation on change - validation happens on blur and submit
                  }}
                  onBlur={formField.onBlur}
                  disabled={isSubmitting}
                  className={hasError ? 'border-red-500' : ''}
                  error={hasError ? (error?.message as string) : undefined}
                />
              ) : (
                <Input
                  type={fieldType === 'text' || fieldType === 'email' ? fieldType : 'text'}
                  placeholder={field.placeholder ? t(field.placeholder) : t(field.label)}
                  className={hasError ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                  {...formField}
                />
              )}
            </FormControl>
            {hasError && (
              <TranslatedFormMessage className="text-destructive text-sm mt-1">
                {String(error?.message || '')}
              </TranslatedFormMessage>
            )}
          </FormItem>
        )}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent
        className="sm:max-w-[425px] flex max-h-[calc(100vh-4rem)] flex-col"
        onPointerDownOutside={handleInteractionOutside}
        onInteractOutside={handleInteractionOutside}
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t(title)}</DialogTitle>
          <DialogDescription>{t(description)}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit as any)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-4 overflow-y-auto pr-1 border-t py-4">
              {fields.map((f) => renderField(f))}

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
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t(cancelText)}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t(submittingText || confirmText) : t(confirmText)}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
