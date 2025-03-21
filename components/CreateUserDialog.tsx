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
import { z } from 'zod';
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

const createUserSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Please enter a valid email address'),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      name
      email
    }
  }
`;

interface CreateUserDialogProps {
  currentPage: number;
}

interface UsersQueryResult {
  users: {
    users: Array<{ id: string; name: string; email: string }>;
    totalCount: number;
    hasNextPage: boolean;
  };
}

export function CreateUserDialog({ currentPage }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('users');

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
    },
    mode: 'onSubmit',
  });

  const [createUser] = useMutation(CREATE_USER, {
    update: (cache, { data: mutationData }) => {
      if (!mutationData?.createUser) return;

      // Get the current total count from the current page
      const existingData = cache.readQuery<UsersQueryResult>({
        query: GET_USERS,
        variables: { page: currentPage, limit: 10 },
      });

      const newTotalCount = (existingData?.users.totalCount ?? 0) + 1;
      const totalPages = Math.ceil(newTotalCount / 10);

      // Update all existing pages in cache
      for (let page = 1; page <= totalPages; page++) {
        try {
          const pageData = cache.readQuery<UsersQueryResult>({
            query: GET_USERS,
            variables: { page, limit: 10 },
          });

          if (pageData) {
            // If this is the last page and it's not full, add the new user
            const isLastPage = page === totalPages;
            const currentPageUsers = pageData.users.users;
            let updatedUsers = [...currentPageUsers];

            if (isLastPage && currentPageUsers.length < 10) {
              updatedUsers = [...currentPageUsers, mutationData.createUser];
            }

            cache.writeQuery<UsersQueryResult>({
              query: GET_USERS,
              variables: { page, limit: 10 },
              data: {
                users: {
                  users: updatedUsers,
                  totalCount: newTotalCount,
                  hasNextPage: page < totalPages,
                },
              },
            });
          }
        } catch {
          // Skip if page data doesn't exist in cache
        }
      }
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? t('createDialog.confirm')
                  : t('createDialog.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
