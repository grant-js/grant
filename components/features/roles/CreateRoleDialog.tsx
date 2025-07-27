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
import { CreateRoleFormValues, createRoleSchema, CreateRoleDialogProps } from './types';
import { useRoleMutations } from '@/hooks/roles';
import { useGroups } from '@/hooks/groups';
import { Group } from '@/graphql/generated/types';
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

  const { createRole, addRoleGroup } = useRoleMutations();

  const onSubmit = async (values: CreateRoleFormValues) => {
    try {
      // Create role first
      const createdRole = await createRole({
        name: values.name,
        description: values.description,
      });

      // Add groups if role was created and groups are selected
      if (createdRole?.id && values.groupIds && values.groupIds.length > 0) {
        const addPromises = values.groupIds.map((groupId) =>
          addRoleGroup({
            roleId: createdRole.id,
            groupId,
          }).catch((error: any) => {
            console.error('Error adding role group:', error);
            // Continue with other group assignments even if one fails
          })
        );
        await Promise.all(addPromises);
      }

      setDialogOpen(false);
      form.reset();
    } catch (error) {
      // Error handling is now done in the useRoleMutations hook
      console.error('Error creating role:', error);
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
              items={groups.map((group: Group) => ({
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
