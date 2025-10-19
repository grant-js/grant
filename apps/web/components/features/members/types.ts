import { OrganizationInvitation } from '@logusgraphics/grant-schema';
import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Please select a role'),
});

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export interface InviteMemberDialogProps {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface RevokeInvitationDialogProps {
  invitation: OrganizationInvitation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
