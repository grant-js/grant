'use client';

import { useMutation } from '@apollo/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { EditRoleFormValues, editRoleSchema, EditRoleDialogProps } from './types';
import { evictRolesCache } from './cache';
import { UPDATE_ROLE, ADD_ROLE_GROUP, REMOVE_ROLE_GROUP } from './mutations';
import { useGroups } from '@/hooks/useGroups';

export function EditRoleDialog({ role, open, onOpenChange, currentPage }: EditRoleDialogProps) {
  const t = useTranslations('roles');
  const { groups, loading: groupsLoading } = useGroups();

  const form = useForm<EditRoleFormValues>({
    resolver: zodResolver(editRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      groupIds: [],
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description || '',
        groupIds: role.groups.map((group) => group.id),
      });
    }
  }, [role, form]);

  const [updateRole] = useMutation(UPDATE_ROLE, {
    update(cache) {
      // Evict all roles-related queries from cache
      evictRolesCache(cache);

      // Also evict any specific role queries
      cache.evict({ id: `Role:${role?.id}` });
      cache.gc();
    },
    refetchQueries: ['GetRoles'], // Force refetch of roles after update
  });

  const [addRoleGroup] = useMutation(ADD_ROLE_GROUP, {
    update(cache) {
      evictRolesCache(cache);
    },
    refetchQueries: ['GetRoles'], // Force refetch of roles after adding group
  });

  const [removeRoleGroup] = useMutation(REMOVE_ROLE_GROUP, {
    update(cache) {
      evictRolesCache(cache);
    },
    refetchQueries: ['GetRoles'], // Force refetch of roles after removing group
  });

  const onSubmit = async (values: EditRoleFormValues) => {
    if (!role) return;

    try {
      // Update role data first
      await updateRole({
        variables: {
          id: role.id,
          input: {
            name: values.name,
            description: values.description,
          },
        },
      });

      // Handle group assignments
      const currentGroupIds = role.groups.map((group) => group.id);
      const newGroupIds = values.groupIds || [];

      // Find groups to add (in newGroupIds but not in currentGroupIds)
      const groupsToAdd = newGroupIds.filter(
        (groupId: string) => !currentGroupIds.includes(groupId)
      );

      // Find groups to remove (in currentGroupIds but not in newGroupIds)
      const groupsToRemove = currentGroupIds.filter(
        (groupId: string) => !newGroupIds.includes(groupId)
      );

      // Add new groups
      if (groupsToAdd.length > 0) {
        const addPromises = groupsToAdd.map((groupId: string) =>
          addRoleGroup({
            variables: {
              input: {
                roleId: role.id,
                groupId,
              },
            },
          })
        );
        await Promise.all(addPromises);
      }

      // Remove groups (only if they exist)
      if (groupsToRemove.length > 0) {
        const removePromises = groupsToRemove.map((groupId: string) =>
          removeRoleGroup({
            variables: {
              input: {
                roleId: role.id,
                groupId,
              },
            },
          }).catch((error) => {
            // If the role-group relationship doesn't exist, just log it and continue
            if (error.message?.includes('RoleGroup not found')) {
              console.warn(
                `RoleGroup relationship for role ${role.id} and group ${groupId} not found, skipping removal`
              );
              return null;
            }
            throw error;
          })
        );
        await Promise.all(removePromises);
      }

      // Small delay to ensure cache invalidation and refetch complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast.success(t('notifications.updateSuccess'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error(t('notifications.updateError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>{t('editDialog.description')}</DialogDescription>
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
                    <Input
                      placeholder={t('form.name')}
                      {...field}
                      className={form.formState.errors.name ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  {form.formState.errors.name && (
                    <FormMessage className="text-red-500 text-sm mt-1">
                      {form.formState.errors.name.message}
                    </FormMessage>
                  )}
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
                      placeholder={t('form.description')}
                      {...field}
                      className={form.formState.errors.description ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  {form.formState.errors.description && (
                    <FormMessage className="text-red-500 text-sm mt-1">
                      {form.formState.errors.description.message}
                    </FormMessage>
                  )}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupIds"
              render={() => (
                <FormItem>
                  <FormLabel>{t('form.groups')}</FormLabel>
                  <div className="space-y-2">
                    {groupsLoading ? (
                      <div className="text-sm text-muted-foreground">{t('form.groupsLoading')}</div>
                    ) : groups.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {t('form.noGroupsAvailable')}
                      </div>
                    ) : (
                      groups.map((group: any) => (
                        <FormField
                          key={group.id}
                          control={form.control}
                          name="groupIds"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={group.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(group.id)}
                                    onCheckedChange={(checked: boolean) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), group.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value: string) => value !== group.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>{group.name}</FormLabel>
                                </div>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    )}
                  </div>
                  {form.formState.errors.groupIds && (
                    <FormMessage className="text-red-500 text-sm mt-1">
                      {t('form.validation.groupsRequired')}
                    </FormMessage>
                  )}
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{t('editDialog.confirm')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
