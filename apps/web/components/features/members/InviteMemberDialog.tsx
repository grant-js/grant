'use client';

import { useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Role } from '@logusgraphics/grant-schema';
import { ChevronDown, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useMemberMutations } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';

import { InviteMemberDialogProps, InviteMemberFormValues, inviteMemberSchema } from './types';

export function InviteMemberDialog({
  organizationId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const t = useTranslations('members');
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope! });
  const { inviteMember } = useMemberMutations();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      roleId: '',
    },
  });

  const onSubmit = async (values: InviteMemberFormValues) => {
    try {
      await inviteMember({
        organizationId,
        email: values.email,
        roleId: values.roleId,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to invite member:', error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  const roleId = useWatch({ control: form.control, name: 'roleId' });
  const selectedRole = roles.find((role) => role.id === roleId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('inviteDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('inviteDialog.description')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.email')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('form.emailPlaceholder')}
                      disabled={form.formState.isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role Selection */}
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('form.role')}</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <FormControl>
                        <Button
                          ref={buttonRef}
                          variant="outline"
                          className="w-full justify-between"
                          disabled={form.formState.isSubmitting || rolesLoading}
                        >
                          {selectedRole ? selectedRole.name : t('form.rolePlaceholder')}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="min-w-full"
                      style={{ width: buttonRef.current?.offsetWidth + 'px' }}
                    >
                      {rolesLoading ? (
                        <DropdownMenuItem disabled>{t('form.rolesLoading')}</DropdownMenuItem>
                      ) : roles.length === 0 ? (
                        <DropdownMenuItem disabled>{t('form.noRolesAvailable')}</DropdownMenuItem>
                      ) : (
                        roles.map((role: Role) => (
                          <DropdownMenuItem key={role.id} onClick={() => field.onChange(role.id)}>
                            <div className="flex flex-col">
                              <span>{role.name}</span>
                              {role.description && (
                                <span className="text-xs text-muted-foreground">
                                  {role.description}
                                </span>
                              )}
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                {t('inviteDialog.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || rolesLoading}>
                <Mail className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting
                  ? t('inviteDialog.sending')
                  : t('inviteDialog.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
