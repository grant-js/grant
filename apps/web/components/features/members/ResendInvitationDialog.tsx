'use client';

import { useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Role } from '@logusgraphics/grant-schema';
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
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';

const resendInvitationSchema = z.object({
  roleId: z.string().min(1, 'Please select a role'),
});

type ResendInvitationFormValues = z.infer<typeof resendInvitationSchema>;

interface ResendInvitationDialogProps {
  member: MemberWithInvitation;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ResendInvitationDialog({
  member,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: ResendInvitationDialogProps) {
  const t = useTranslations('members');
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

  const onSubmit = async (values: ResendInvitationFormValues) => {
    if (!member.email) {
      console.error('Member does not have an email');
      return;
    }

    try {
      await resendInvitation({
        organizationId,
        email: member.email,
        roleId: values.roleId,
      });
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the mutation hook
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

  const roleId = useWatch({ control: form.control, name: 'roleId' });
  const selectedRole = roles.find((role) => role.id === roleId);

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
            {/* Role Selection */}
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
                            ? selectedRole.name
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
