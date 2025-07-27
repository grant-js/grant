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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
import { CreateRoleFormValues, createRoleSchema, CreateRoleDialogProps } from './types';
import { evictRolesCache } from './cache';
import { CREATE_ROLE, ADD_ROLE_GROUP } from './mutations';
import { useGroups } from '@/hooks/useGroups';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { Shield } from 'lucide-react';
import { useState } from 'react';

interface CreateRoleDialogComponentProps extends Partial<CreateRoleDialogProps> {
  children?: React.ReactNode;
}

export function CreateRoleDialog({ open, onOpenChange, children }: CreateRoleDialogComponentProps) {
  const t = useTranslations('roles');
  const { groups, loading: groupsLoading } = useGroups();

  // Internal state for uncontrolled usage
  const [internalOpen, setInternalOpen] = useState(false);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange : setInternalOpen;

  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      groupIds: [],
    },
    mode: 'onSubmit',
  });

  const [createRole] = useMutation(CREATE_ROLE, {
    update(cache) {
      evictRolesCache(cache);
    },
    refetchQueries: ['GetRoles'],
  });

  const [addRoleGroup] = useMutation(ADD_ROLE_GROUP, {
    refetchQueries: ['GetRoles'],
  });

  const onSubmit = async (values: CreateRoleFormValues) => {
    try {
      // Create role first
      const result = await createRole({
        variables: {
          input: {
            name: values.name,
            description: values.description,
          },
        },
      });

      const roleId = result.data?.createRole?.id;

      // Add groups if role was created and groups are selected
      if (roleId && values.groupIds && values.groupIds.length > 0) {
        const addPromises = values.groupIds.map((groupId) =>
          addRoleGroup({
            variables: {
              input: {
                roleId,
                groupId,
              },
            },
          }).catch((error) => {
            console.error('Error adding role group:', error);
            // Continue with other group assignments even if one fails
          })
        );
        await Promise.all(addPromises);
      }

      toast.success(t('notifications.createSuccess'));
      setDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(t('notifications.createError'), {
        description: error instanceof Error ? error.message : 'An unknown error occurred',
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Shield className="size-4" />
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Input
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
            <CheckboxList
              control={form.control}
              name="groupIds"
              label={t('form.groups')}
              items={groups.map((group) => ({
                id: group.id,
                name: group.name,
                description: group.description ?? undefined,
              }))}
              loading={groupsLoading}
              loadingText={t('form.groupsLoading')}
              emptyText={t('form.noGroupsAvailable')}
              error={form.formState.errors.groupIds?.message}
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
