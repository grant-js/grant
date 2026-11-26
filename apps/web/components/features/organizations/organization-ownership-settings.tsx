'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import {
  ORGANIZATION_ROLE_DEFINITIONS,
  ResourceAction,
  ResourceSlug,
  RoleKey,
} from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';
import { AlertTriangle } from 'lucide-react';

import { SettingCard } from '@/components/features/settings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmailVerified } from '@/hooks/auth';
import { useMembers } from '@/hooks/members';
import { useTransferOrganizationOwnership } from '@/hooks/organizations';
import { useRoles } from '@/hooks/roles';
import { useRouter } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

/** Value of the role select that stands for leaving the organization. */
export const LEAVE_ORGANIZATION = '__leave__';

/** The roles an outgoing owner may keep, from the standard organization roles below Owner. */
const KEEPABLE_ROLE_NAMES: string[] = [
  RoleKey.OrganizationAdmin,
  RoleKey.OrganizationDev,
  RoleKey.OrganizationViewer,
].map((key) => ORGANIZATION_ROLE_DEFINITIONS[key].name);

interface OrganizationOwnershipSettingsProps {
  organization: Organization;
  /** Called after a successful transfer, so the page can re-check what the caller may do. */
  onTransferred?: () => void;
}

export function OrganizationOwnershipSettings({
  organization,
  onTransferred,
}: OrganizationOwnershipSettingsProps) {
  const t = useTranslations('organizations.settings.ownership');
  const tRoot = useTranslations();
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { transferOwnership } = useTransferOrganizationOwnership();
  const isEmailVerified = useEmailVerified();
  const currentUserId = useAuthStore((state) => state.getCurrentAccount()?.ownerId);

  const scope = useMemo(
    () => ({ tenant: Tenant.Organization, id: organization.id }),
    [organization.id]
  );

  const { isGranted: canTransfer, isLoading } = useGrant(
    ResourceSlug.Organization,
    ResourceAction.TransferOwnership,
    { scope, returnLoading: true }
  ) as UseGrantResult;

  const { members } = useMembers({ organizationId: organization.id, limit: 100 });
  const { roles } = useRoles({ scope });

  const [newOwnerId, setNewOwnerId] = useState('');
  const [roleChoice, setRoleChoice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Eligible: a current member other than the caller. Whether an email is verified is not part of
  // the member data, so the API refuses an unverified member and its reason is shown.
  const candidates = useMemo(
    () =>
      members.filter(
        (member) => member.type === 'member' && member.user?.id && member.user.id !== currentUserId
      ),
    [members, currentUserId]
  );

  const keepableRoles = useMemo(
    () =>
      KEEPABLE_ROLE_NAMES.map((name) => roles.find((role) => role.name === name)).filter(
        (role): role is NonNullable<typeof role> => !!role
      ),
    [roles]
  );

  if (isLoading || !canTransfer) {
    return null;
  }

  const newOwner = candidates.find((member) => member.user?.id === newOwnerId);
  const canSubmit = !!newOwnerId && !!roleChoice;
  const nameMatches = confirmName === organization.name;

  const handleDialogChange = (open: boolean) => {
    if (isTransferring) return;
    setDialogOpen(open);
    if (!open) setConfirmName('');
  };

  const handleTransfer = async () => {
    if (!canSubmit || !nameMatches) return;
    const leaves = roleChoice === LEAVE_ORGANIZATION;

    setIsTransferring(true);
    try {
      await transferOwnership({
        scope,
        newOwnerId,
        ...(leaves ? { leaveOrganization: true } : { previousOwnerRoleId: roleChoice }),
      });
      setDialogOpen(false);
      setConfirmName('');
      setNewOwnerId('');
      setRoleChoice('');
      onTransferred?.();
      if (leaves) {
        router.push('/dashboard/organizations');
      }
    } catch {
      // The mutation hook already showed the API's reason; keep the dialog open to retry.
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div data-testid="organization-ownership-settings">
      <SettingCard title={t('title')} description={t('description')} collapsible>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organization-new-owner">{t('newOwner.label')}</Label>
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger id="organization-new-owner">
                <SelectValue placeholder={t('newOwner.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {candidates.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {t('newOwner.empty')}
                  </div>
                ) : (
                  candidates.map((member) => (
                    <SelectItem key={member.id} value={member.user!.id}>
                      {member.email ? `${member.name} (${member.email})` : member.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{t('newOwner.hint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-previous-owner-role">{t('role.label')}</Label>
            <Select value={roleChoice} onValueChange={setRoleChoice}>
              <SelectTrigger id="organization-previous-owner-role">
                <SelectValue placeholder={t('role.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {keepableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {tRoot(role.name as string)}
                  </SelectItem>
                ))}
                <SelectItem value={LEAVE_ORGANIZATION}>{t('role.leave')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            disabled={!canSubmit || !isEmailVerified}
            onClick={() => setDialogOpen(true)}
          >
            {t('action')}
          </Button>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={handleDialogChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('dialog.description', { name: newOwner?.name ?? '' })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {roleChoice === LEAVE_ORGANIZATION
                    ? t('dialog.warningLeave')
                    : t('dialog.warning')}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="transfer-org-name">
                  {t('dialog.confirmNameLabel', { name: organization.name })}
                </Label>
                <Input
                  id="transfer-org-name"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={organization.name}
                  disabled={isTransferring}
                  autoComplete="off"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isTransferring} onClick={() => setConfirmName('')}>
                {tCommon('actions.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                // Radix closes an AlertDialog on action click; keep it open until the call settles.
                onClick={(event) => {
                  event.preventDefault();
                  void handleTransfer();
                }}
                disabled={!nameMatches || isTransferring}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isTransferring ? t('dialog.transferring') : t('dialog.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingCard>
    </div>
  );
}
