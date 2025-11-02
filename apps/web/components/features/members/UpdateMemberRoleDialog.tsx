'use client';

import { useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Role } from '@logusgraphics/grant-schema';
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
  FormMessage,
} from '@/components/ui/form';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';

const updateMemberRoleSchema = z.object({
  roleId: z.string().min(1, 'Please select a role'),
});

type UpdateMemberRoleFormValues = z.infer<typeof updateMemberRoleSchema>;

interface UpdateMemberRoleDialogProps {
  member: MemberWithInvitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateMemberRoleDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: UpdateMemberRoleDialogProps) {
  const t = useTranslations('members');
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope! });
  const { updateMemberRole } = useMemberMutations();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const organizationId = scope?.id || '';

  const form = useForm<UpdateMemberRoleFormValues>({
    resolver: zodResolver(updateMemberRoleSchema),
    defaultValues: {
      roleId: member.roleId || '',
    },
  });

  const onSubmit = async (values: UpdateMemberRoleFormValues) => {
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
      // Error is handled by the mutation hook
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

  const roleId = useWatch({ control: form.control, name: 'roleId' });
  const selectedRole = roles.find((role) => role.id === roleId);

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
            {/* Current Role Display */}
            {member.role && (
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm text-muted-foreground">
                  {t('updateRoleDialog.currentRole')}
                </div>
                <div className="mt-1 font-medium">{member.role.name}</div>
              </div>
            )}

            {/* Role Selection */}
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
                          {selectedRole ? selectedRole.name : t('updateRoleDialog.rolePlaceholder')}
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
