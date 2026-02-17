import { OrganizationInvitation } from '@grantjs/schema';
import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.email('errors.validation.invalidEmail'),
  roleId: z.string().min(1, 'errors.validation.roleRequired'),
});

export type MemberInviteFormValues = z.infer<typeof inviteMemberSchema>;

export interface MemberInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export interface MemberInvitationRevokeDialogProps {
  invitation: OrganizationInvitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export enum MemberView {
  CARD = 'card',
  TABLE = 'table',
}
