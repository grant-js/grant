'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
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
import { toast } from '@/components/ui/toast';
import { useTranslations } from 'next-intl';
import { GET_USERS } from './UserList';
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
import { UserPlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ROLES } from '@/shared/constants/roles';
import { User, CreateUserFormValues, createUserSchema, UsersQueryResult } from './types';
import { evictUsersCache } from './cache';

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
      roles {
        id
        label
      }
    }
  }
`;

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('users');

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      roleIds: ['customer'], // Default to customer role
    },
    mode: 'onSubmit',
  });

  const [createUser] = useMutation(CREATE_USER, {
    update(cache) {
      evictUsersCache(cache);
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    try {
      await createUser({
        variables: {
          input: values,
        },
      });
      toast.success(t('notifications.createSuccess'));
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('notifications.createError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('actions.create')}</span>
        </Button>
      </DialogTrigger>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
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
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleIds"
              render={() => (
                <FormItem>
                  <FormLabel>{t('form.roles')}</FormLabel>
                  <div className="space-y-2">
                    {ROLES.map((role) => (
                      <FormField
                        key={role.id}
                        control={form.control}
                        name="roleIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={role.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(role.id)}
                                  onCheckedChange={(checked: boolean) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), role.id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== role.id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>{t(`roles.${role.id}`)}</FormLabel>
                              </div>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  {form.formState.errors.roleIds && (
                    <FormMessage className="text-red-500 text-sm mt-1">
                      {t('form.validation.rolesRequired')}
                    </FormMessage>
                  )}
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t('createDialog.submitting')
                  : t('createDialog.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
