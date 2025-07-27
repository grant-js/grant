'use client';

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
import { EditUserFormValues, editUserSchema, EditUserDialogProps } from './types';
import { useUserMutations } from '@/hooks/users';
import { useRoles } from '@/hooks/roles';
import { Role } from '@/graphql/generated/types';
import { CheckboxList } from '@/components/ui/checkbox-list';

export function EditUserDialog({ user, open, onOpenChange, currentPage }: EditUserDialogProps) {
  const t = useTranslations('users');
  const { roles, loading: rolesLoading } = useRoles();

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      name: '',
      email: '',
      roleIds: [],
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        roleIds: user.roles.map((role) => role.id),
      });
    }
  }, [user, form]);

  const { updateUser, addUserRole, removeUserRole } = useUserMutations();

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) return;

    try {
      // Update user data first
      await updateUser(user.id, {
        name: values.name,
        email: values.email,
      });

      // Handle role assignments
      const currentRoleIds = user.roles.map((role) => role.id);
      const newRoleIds = values.roleIds || [];

      // Find roles to add (in newRoleIds but not in currentRoleIds)
      const rolesToAdd = newRoleIds.filter((roleId) => !currentRoleIds.includes(roleId));

      // Find roles to remove (in currentRoleIds but not in newRoleIds)
      const rolesToRemove = currentRoleIds.filter((roleId) => !newRoleIds.includes(roleId));

      // Add new roles
      if (rolesToAdd.length > 0) {
        const addPromises = rolesToAdd.map((roleId) =>
          addUserRole({
            userId: user.id,
            roleId,
          })
        );
        await Promise.all(addPromises);
      }

      // Remove roles
      if (rolesToRemove.length > 0) {
        const removePromises = rolesToRemove.map((roleId) =>
          removeUserRole({
            userId: user.id,
            roleId,
          })
        );
        await Promise.all(removePromises);
      }

      onOpenChange(false);
    } catch (error) {
      // Error handling is now done in the useUserMutations hook
      console.error('Error updating user:', error);
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('form.email')}
                      {...field}
                      className={form.formState.errors.email ? 'border-red-500' : ''}
                    />
                  </FormControl>
                  {form.formState.errors.email && (
                    <FormMessage className="text-red-500 text-sm mt-1">
                      {form.formState.errors.email.message}
                    </FormMessage>
                  )}
                </FormItem>
              )}
            />
            <CheckboxList
              control={form.control}
              name="roleIds"
              label={t('form.roles')}
              items={roles.map((role: Role) => ({
                id: role.id,
                name: role.name,
                description: role.description || undefined,
              }))}
              loading={rolesLoading}
              loadingText={t('form.rolesLoading')}
              emptyText={t('form.noRolesAvailable')}
              error={form.formState.errors.roleIds?.message}
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
