'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Group, Permission } from '@/graphql/generated/types';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { editGroupSchema, EditGroupFormValues } from './types';

interface EditGroupDialogProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPage: number;
}

export function EditGroupDialog({ group, open, onOpenChange, currentPage }: EditGroupDialogProps) {
  const t = useTranslations('groups');
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { updateGroup, addGroupPermission, removeGroupPermission } = useGroupMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditGroupFormValues>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      permissionIds: [],
    },
    mode: 'onSubmit',
  });

  // Update form values when group changes
  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
        description: group.description || '',
        permissionIds: group.permissions.map((permission) => permission.id),
      });
    }
  }, [group, form]);

  const onSubmit = async (values: EditGroupFormValues) => {
    if (!group) return;

    try {
      setIsSubmitting(true);
      // Update group data first
      await updateGroup(group.id, {
        name: values.name,
        description: values.description,
      });

      // Handle permission assignments
      const currentPermissionIds = group.permissions.map((permission) => permission.id);
      const newPermissionIds = values.permissionIds || [];

      // Find permissions to add (in newPermissionIds but not in currentPermissionIds)
      const permissionsToAdd = newPermissionIds.filter(
        (permissionId) => !currentPermissionIds.includes(permissionId)
      );

      // Find permissions to remove (in currentPermissionIds but not in newPermissionIds)
      const permissionsToRemove = currentPermissionIds.filter(
        (permissionId) => !newPermissionIds.includes(permissionId)
      );

      // Add new permissions
      if (permissionsToAdd.length > 0) {
        const addPromises = permissionsToAdd.map((permissionId) =>
          addGroupPermission({
            groupId: group.id,
            permissionId,
          }).catch((error: any) => {
            console.error('Error adding group permission:', error);
            // Continue with other permission assignments even if one fails
          })
        );
        await Promise.all(addPromises);
      }

      // Remove permissions
      if (permissionsToRemove.length > 0) {
        const removePromises = permissionsToRemove.map((permissionId) =>
          removeGroupPermission({
            groupId: group.id,
            permissionId,
          }).catch((error: any) => {
            // Handle "GroupPermission not found" error gracefully
            if (error.message?.includes('GroupPermission not found')) {
              console.warn('GroupPermission not found, skipping removal:', {
                groupId: group.id,
                permissionId,
              });
              return;
            }
            console.error('Error removing group permission:', error);
            throw error;
          })
        );
        await Promise.all(removePromises);
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
          <DialogDescription>{t('edit.description')}</DialogDescription>
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
                {isSubmitting ? t('actions.updating') : t('actions.update')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
