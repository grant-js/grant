'use client';

import { useRef } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Mail } from 'lucide-react';
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
import { useScopeFromParams } from '@/hooks/common';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';

const resendInvitationSchema = z.object({
  roleId: z.string().min(1, 'Please select a role'),
});

type ResendInvitationFormValues = z.infer<typeof resendInvitationSchema>;

interface MemberInvitationResendDialogProps {
  member: MemberWithInvitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MemberInvitationResendDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: MemberInvitationResendDialogProps) {
  const t = useTranslations('members');
  const tRoot = useTranslations();
  const scope = useScopeFromParams();
  const { roles, loading: rolesLoading } = useRoles({ scope: scope! });
  const { resendInvitation } = useMemberMutations();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const form = useForm<ResendInvitationFormValues>({
    resolver: zodResolver(resendInvitationSchema),
    defaultValues: {
      roleId: member.roleId || '',
    },
  });
  const roleId = useWatch({ control: form.control, name: 'roleId' });

  const canResend = useGrant(ResourceSlug.OrganizationInvitation, ResourceAction.Create, {
    scope: scope!,
  });

  if (!canResend) {
    return null;
  }

  const selectedRole = roles.find((role) => role.id === roleId);

  const onSubmit = async (values: ResendInvitationFormValues) => {
    if (!member.email) {
      console.error('Member does not have an email');
      return;
    }

    try {
      await resendInvitation({
        scope: scope!,
        email: member.email,
        roleId: values.roleId,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to resend invitation:', error);
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
            <Mail className="h-5 w-5" />
            {t('resendInvitationDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('resendInvitationDialog.description', { email: member.email || '' })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('resendInvitationDialog.role')}</FormLabel>
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
                            ? tRoot(selectedRole.name)
                            : t('resendInvitationDialog.rolePlaceholder')}
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
                          {t('resendInvitationDialog.rolesLoading')}
                        </DropdownMenuItem>
                      ) : roles.length === 0 ? (
                        <DropdownMenuItem disabled>
                          {t('resendInvitationDialog.noRolesAvailable')}
                        </DropdownMenuItem>
                      ) : (
                        roles.map((role: Role) => {
                          const translatedName = tRoot(role.name);
                          const translatedDescription = tRoot(role.description!);
                          return (
                            <DropdownMenuItem key={role.id} onClick={() => field.onChange(role.id)}>
                              <div className="flex flex-col">
                                <span>{translatedName}</span>
                                {translatedDescription && (
                                  <span className="text-xs text-muted-foreground">
                                    {translatedDescription}
                                  </span>
                                )}
                              </div>
                            </DropdownMenuItem>
                          );
                        })
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
                {t('resendInvitationDialog.cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || rolesLoading}>
                <Mail className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting
                  ? t('resendInvitationDialog.sending')
                  : t('resendInvitationDialog.confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
