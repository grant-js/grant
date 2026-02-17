'use client';

import { useMemo, useRef } from 'react';

import { useParams } from 'next/navigation';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { canAssignRole } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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
import { useEmailVerified } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';
import { useAuthStore } from '@/stores/auth.store';
import { useMembersStore } from '@/stores/members.store';

const updateMemberRoleSchema = z.object({
  roleId: z.string().min(1, 'errors.validation.roleRequired'),
});

type MemberRoleUpdateFormValues = z.infer<typeof updateMemberRoleSchema>;

interface MemberRoleUpdateDialogProps {
  member: MemberWithInvitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MemberRoleUpdateDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: MemberRoleUpdateDialogProps) {
  const t = useTranslations('members');
  const tRoot = useTranslations();
  const params = useParams();
  const organizationId = params.organizationId as string;
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope! });
  const { updateMemberRole } = useMemberMutations();
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

  const form = useForm<MemberRoleUpdateFormValues>({
    resolver: zodResolver(updateMemberRoleSchema),
    defaultValues: {
      roleId: member.roleId || '',
    },
  });
  const roleId = useWatch({ control: form.control, name: 'roleId' });

  const canUpdate = useGrant(ResourceSlug.OrganizationMember, ResourceAction.Update, {
    scope: scope!,
  });
  const isEmailVerified = useEmailVerified();

  if (!canUpdate || !isEmailVerified) {
    return null;
  }

  const selectedRole = roles.find((role) => role.id === roleId);

  const onSubmit = async (values: MemberRoleUpdateFormValues) => {
    if (!member.user?.id) {
      console.error('Member does not have a user ID');
      return;
    }

    try {
      await updateMemberRole(member.user.id, organizationId, values.roleId);
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({
        roleId: member.roleId || '',
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            {t('updateRoleDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('updateRoleDialog.description', { name: member.name })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {member.role && (
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm text-muted-foreground">
                  {t('updateRoleDialog.currentRole')}
                </div>
                <div className="mt-1 font-medium">{tRoot(member.role?.name as string)}</div>
              </div>
            )}

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('updateRoleDialog.newRole')}</FormLabel>
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
                            : t('updateRoleDialog.rolePlaceholder')}
                          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="min-w-full"
                      style={{ width: buttonRef.current?.offsetWidth + 'px' }}
                    >
                      {rolesLoading ? (
                        <DropdownMenuItem disabled>
                          {t('updateRoleDialog.rolesLoading')}
                        </DropdownMenuItem>
                      ) : roles.length === 0 ? (
                        <DropdownMenuItem disabled>
                          {t('updateRoleDialog.noRolesAvailable')}
                        </DropdownMenuItem>
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
                                <span>{tRoot(role.name as string)}</span>
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
                {t('updateRoleDialog.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || rolesLoading}>
                <UserCog className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting
                  ? t('updateRoleDialog.updating')
                  : t('updateRoleDialog.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
