'use client';

import { useMemo, useRef } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { canAssignRole } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
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
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useEmailVerified } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useMemberMutations } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';
import { useAuthStore } from '@/stores/auth.store';
import { useMembersStore } from '@/stores/members.store';

import {
  MemberInviteDialogProps,
  MemberInviteFormValues,
  inviteMemberSchema,
} from './member-types';

export function MemberInviteDialog({ open, onOpenChange, onSuccess }: MemberInviteDialogProps) {
  const t = useTranslations('members');
  const tRoot = useTranslations();
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope! });
  const { inviteMember } = useMemberMutations();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { getCurrentAccount } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const members = useMembersStore((state) => state.members);

  const currentUserRole = useMemo(() => {
    const ownerId = currentAccount?.ownerId;
    if (!ownerId || !members.length) return null;
    const currentMember = members.find((m) => m.type === 'member' && m.user?.id === ownerId);
    return currentMember?.role?.name || null;
  }, [currentAccount, members]);

  const form = useForm<MemberInviteFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      roleId: '',
    },
  });
  const roleId = useWatch({ control: form.control, name: 'roleId' });

  const canInvite = useGrant(ResourceSlug.OrganizationInvitation, ResourceAction.Create, {
    scope: scope!,
  });
  const isEmailVerified = useEmailVerified();

  if (!canInvite || !isEmailVerified) {
    return null;
  }

  const selectedRole = roles.find((role) => role.id === roleId);

  const onSubmit = async (values: MemberInviteFormValues) => {
    try {
      await inviteMember({
        scope: scope!,
        email: values.email,
        roleId: values.roleId,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

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
                  <TranslatedFormMessage />
                </FormItem>
              )}
            />

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
                          {selectedRole
                            ? tRoot(selectedRole.name as string)
                            : t('form.rolePlaceholder')}
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
                        roles.map((role: Role) => {
                          // Check if current user can assign this role based on hierarchy
                          const canAssign = currentUserRole
                            ? canAssignRole(currentUserRole, role.name)
                            : true;

                          return (
                            <DropdownMenuItem
                              key={role.id}
                              onClick={() => canAssign && field.onChange(role.id)}
                              disabled={!canAssign}
                              className={!canAssign ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <div className="flex flex-col">
                                <span>{tRoot(role.name)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {tRoot(role.description as string)}
                                </span>
                              </div>
                            </DropdownMenuItem>
                          );
                        })
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TranslatedFormMessage />
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
