'use client';

import { useState } from 'react';
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
import { UserPlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateRoleFormValues, createRoleSchema } from './types';
import { evictRolesCache } from './cache';
import { useGroups } from '@/hooks/useGroups';
import { CREATE_ROLE, ADD_ROLE_GROUP } from './mutations';

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('roles');
  const { groups, loading: groupsLoading } = useGroups();

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
    refetchQueries: ['GetRoles'], // Force refetch of roles after creation
  });

  const [addRoleGroup] = useMutation(ADD_ROLE_GROUP, {
    update(cache) {
      evictRolesCache(cache);
    },
    refetchQueries: ['GetRoles'], // Force refetch of roles after adding group
  });

  const onSubmit = async (values: CreateRoleFormValues) => {
    try {
      // Create the role first
      const result = await createRole({
        variables: {
          input: {
            name: values.name,
            description: values.description,
          },
        },
      });

      const roleId = result.data?.createRole.id;

      if (roleId && values.groupIds && values.groupIds.length > 0) {
        // Add groups to the role
        const groupPromises = values.groupIds.map((groupId: string) =>
          addRoleGroup({
            variables: {
              input: {
                roleId,
                groupId,
              },
            },
          }).catch((error) => {
            // If there's an error adding a group, log it but don't fail the entire operation
            console.warn(`Failed to add group ${groupId} to role ${roleId}:`, error);
            return null;
          })
        );

        await Promise.all(groupPromises);
      }

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
        <Button className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          {t('actions.create')}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
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
