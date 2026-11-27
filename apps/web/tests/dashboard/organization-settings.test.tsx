import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOrganizationsStore } from '@/stores/organizations.store';

const grants: Record<string, boolean> = { Update: true, Delete: true };
const updateOrganization = vi.fn();
const deleteOrganization = vi.fn();
const push = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    `${namespace}.${key}${values?.name ? `(${values.name})` : ''}`,
}));
vi.mock('@grantjs/client/react', () => ({
  useGrant: (_resource: string, action: string) => ({
    isGranted: grants[action] ?? false,
    isLoading: false,
  }),
}));
vi.mock('@/hooks/auth', () => ({ useEmailVerified: () => true }));
vi.mock('@/hooks/organizations', () => ({
  useOrganizationMutations: () => ({ updateOrganization, deleteOrganization }),
}));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push }) }));

const { OrganizationGeneralSettings } =
  await import('@/components/features/organizations/organization-general-settings');
const { OrganizationSecuritySettings } =
  await import('@/components/features/organizations/organization-security-settings');
const { OrganizationDangerZone } =
  await import('@/components/features/organizations/organization-danger-zone');
const { OrganizationDeleteDialog } =
  await import('@/components/features/organizations/organization-delete-dialog');

const organization = {
  id: 'org-1',
  name: 'Acme GmbH',
  requireMfaForSensitiveActions: false,
} as never;

beforeEach(() => {
  grants.Update = true;
  grants.Delete = true;
  updateOrganization.mockReset().mockResolvedValue(undefined);
  deleteOrganization.mockReset().mockResolvedValue(undefined);
  push.mockReset();
  act(() => {
    useOrganizationsStore.getState().setOrganizationToDelete(null);
  });
});

describe('organization settings: general', () => {
  it('saves only the new name, scoped to the organization', async () => {
    render(<OrganizationGeneralSettings organization={organization} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Acme AG' } });
    fireEvent.click(screen.getByRole('button', { name: 'common.actions.save' }));

    await waitFor(() => expect(updateOrganization).toHaveBeenCalledOnce());
    expect(updateOrganization).toHaveBeenCalledWith('org-1', {
      scope: { tenant: 'organization', id: 'org-1' },
      name: 'Acme AG',
    });
  });

  it('is read-only with a hint when the caller may not update the organization', () => {
    grants.Update = false;

    render(<OrganizationGeneralSettings organization={organization} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'common.actions.save' })).not.toBeInTheDocument();
    expect(screen.getByText('organizations.settings.general.readOnlyHint')).toBeInTheDocument();
  });
});

describe('organization settings: security', () => {
  it('sends only the MFA flag, scoped to the organization', async () => {
    render(<OrganizationSecuritySettings organization={organization} />);

    fireEvent.click(screen.getByRole('switch'));

    await waitFor(() => expect(updateOrganization).toHaveBeenCalledOnce());
    expect(updateOrganization).toHaveBeenCalledWith('org-1', {
      scope: { tenant: 'organization', id: 'org-1' },
      requireMfaForSensitiveActions: true,
    });
  });

  it('collapses its body from the header toggle, like other detail cards', () => {
    render(<OrganizationSecuritySettings organization={organization} />);

    expect(screen.getByRole('switch')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle section' }));

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('is read-only with a hint when the caller may not update the organization', () => {
    grants.Update = false;

    render(<OrganizationSecuritySettings organization={organization} />);

    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByText('organizations.settings.security.readOnlyHint')).toBeInTheDocument();
  });
});

describe('organization settings: danger zone', () => {
  it('is shown to a caller who may delete the organization', () => {
    render(<OrganizationDangerZone organization={organization} />);

    expect(screen.getByTestId('organization-danger-zone')).toBeInTheDocument();
  });

  it('is hidden from a caller who may not delete the organization', () => {
    grants.Delete = false;

    render(<OrganizationDangerZone organization={organization} />);

    expect(screen.queryByTestId('organization-danger-zone')).not.toBeInTheDocument();
  });

  it('opens the delete confirmation for this organization', () => {
    render(<OrganizationDangerZone organization={organization} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'organizations.settings.dangerZone.delete.action' })
    );

    expect(useOrganizationsStore.getState().organizationToDelete).toEqual({
      id: 'org-1',
      name: 'Acme GmbH',
    });
  });
});

describe('organization delete dialog: typed confirmation', () => {
  function openDialog() {
    act(() => {
      useOrganizationsStore.getState().setOrganizationToDelete({ id: 'org-1', name: 'Acme GmbH' });
    });
    render(<OrganizationDeleteDialog />);
    return {
      input: screen.getByRole('textbox'),
      confirm: screen.getByRole('button', { name: 'organizations.deleteDialog.confirm' }),
    };
  }

  it('asks for the name, not the id, and keeps Delete disabled until it matches exactly', () => {
    const { input, confirm } = openDialog();

    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'org-1' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'acme gmbh' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    expect(confirm).toBeEnabled();
  });

  it('deletes the organization and returns to the organizations list', async () => {
    const { input, confirm } = openDialog();

    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/organizations'));
    expect(deleteOrganization).toHaveBeenCalledWith(
      { id: 'org-1', scope: { id: 'org-1', tenant: 'organization' } },
      'Acme GmbH'
    );
  });

  it('stays on the page when the delete fails', async () => {
    deleteOrganization.mockRejectedValueOnce(new Error('boom'));
    const { input, confirm } = openDialog();

    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(deleteOrganization).toHaveBeenCalledOnce());
    expect(push).not.toHaveBeenCalled();
  });
});
