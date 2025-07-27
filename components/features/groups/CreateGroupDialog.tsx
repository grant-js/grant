'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { useGroupMutations } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions/usePermissions';
import { Permission } from '@/graphql/generated/types';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { createGroupSchema, CreateGroupFormValues, CreateGroupDialogProps } from './types';
import { Group } from 'lucide-react';

interface CreateGroupDialogComponentProps extends Partial<CreateGroupDialogProps> {
  children?: React.ReactNode;
}

export function CreateGroupDialog({
  open,
  onOpenChange,
  children,
}: CreateGroupDialogComponentProps) {
  const t = useTranslations('groups');
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { createGroup, addGroupPermission } = useGroupMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Internal state for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      permissionIds: [],
    },
    mode: 'onSubmit',
  });

  const onSubmit = async (values: CreateGroupFormValues) => {
    try {
      setIsSubmitting(true);
      // Create group first
      const createdGroup = await createGroup({
        name: values.name,
        description: values.description,
      });

      // Add permissions if group was created and permissions are selected
      if (createdGroup?.id && values.permissionIds && values.permissionIds.length > 0) {
        const addPromises = values.permissionIds.map((permissionId) =>
          addGroupPermission({
            groupId: createdGroup.id,
            permissionId,
          }).catch((error: any) => {
            console.error('Error adding group permission:', error);
            // Continue with other permission assignments even if one fails
          })
        );
        await Promise.all(addPromises);
      }

      setDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    setDialogOpen(newOpen);
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Group className="size-4" />
            {t('createDialog.trigger')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('create.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('form.namePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('form.descriptionPlaceholder')}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <CheckboxList
              control={form.control}
              name="permissionIds"
              label={t('form.permissions')}
              items={permissions.map((permission: Permission) => ({
                id: permission.id,
                name: permission.name,
                description: permission.description ?? undefined,
              }))}
              loading={permissionsLoading}
              loadingText={t('form.permissionsLoading')}
              emptyText={t('form.noPermissionsAvailable')}
              error={form.formState.errors.permissionIds?.message}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('actions.creating') : t('actions.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
