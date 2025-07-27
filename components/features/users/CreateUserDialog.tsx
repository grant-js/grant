'use client';

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
import { CreateUserFormValues, createUserSchema, CreateUserDialogProps } from './types';
import { useUserMutations } from '@/hooks/users';
import { useRoles } from '@/hooks/roles';
import { Role } from '@/graphql/generated/types';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';

interface CreateUserDialogComponentProps extends Partial<CreateUserDialogProps> {
  children?: React.ReactNode;
}

export function CreateUserDialog({ open, onOpenChange, children }: CreateUserDialogComponentProps) {
  const t = useTranslations('users');
  const { roles, loading: rolesLoading } = useRoles();

  // Internal state for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      roleIds: [],
    },
    mode: 'onSubmit',
  });

  const { createUser, addUserRole } = useUserMutations();

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      // Create user first
      const createdUser = await createUser({
        name: values.name,
        email: values.email,
      });

      // Add roles if user was created and roles are selected
      if (createdUser?.id && values.roleIds && values.roleIds.length > 0) {
        const addPromises = values.roleIds.map((roleId) =>
          addUserRole({
            userId: createdUser.id,
            roleId,
          }).catch((error: any) => {
            console.error('Error adding user role:', error);
            // Continue with other role assignments even if one fails
          })
        );
        await Promise.all(addPromises);
      }

      setDialogOpen(false);
      form.reset();
    } catch (error) {
      // Error handling is now done in the useUserMutations hook
      console.error('Error creating user:', error);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <UserPlus className="size-4" />
            {t('createDialog.trigger')}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
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
                description: role.description ?? undefined,
              }))}
              loading={rolesLoading}
              loadingText={t('form.rolesLoading')}
              emptyText={t('form.noRolesAvailable')}
              error={form.formState.errors.roleIds?.message}
            />
            <DialogFooter>
              <Button type="submit">{t('createDialog.confirm')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
