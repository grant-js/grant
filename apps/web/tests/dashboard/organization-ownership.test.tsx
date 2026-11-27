import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const grants: Record<string, boolean> = { TransferOwnership: true };
const transferOwnership = vi.fn();
const push = vi.fn();
let emailVerified = true;

const CALLER = 'user-caller';
const members = [
  {
    id: 'm1',
    type: 'member',
    name: 'Caller Owner',
    email: 'caller@example.test',
    user: { id: CALLER },
  },
  {
    id: 'm2',
    type: 'member',
    name: 'Ada Admin',
    email: 'ada@example.test',
    user: { id: 'user-ada' },
  },
  { id: 'm3', type: 'invitation', name: 'Pending Pat', email: 'pat@example.test', user: null },
];
const roles = [
  { id: 'r-owner', name: 'roles.names.organizationOwner' },
  { id: 'r-admin', name: 'roles.names.organizationAdmin' },
  { id: 'r-dev', name: 'roles.names.organizationDev' },
  { id: 'r-viewer', name: 'roles.names.organizationViewer' },
  { id: 'r-custom', name: 'a custom role' },
];

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, string>) =>
    `${namespace ? `${namespace}.` : ''}${key}${values?.name ? `(${values.name})` : ''}`,
}));
vi.mock('@grantjs/client/react', () => ({
  useGrant: (_resource: string, action: string) => ({
    isGranted: grants[action] ?? false,
    isLoading: false,
  }),
}));
vi.mock('@/hooks/auth', () => ({ useEmailVerified: () => emailVerified }));
vi.mock('@/hooks/members', () => ({ useMembers: () => ({ members, loading: false }) }));
vi.mock('@/hooks/roles', () => ({ useRoles: () => ({ roles, loading: false }) }));
vi.mock('@/hooks/organizations', () => ({
  useTransferOrganizationOwnership: () => ({ transferOwnership }),
}));
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: unknown) => unknown) =>
    selector({ getCurrentAccount: () => ({ ownerId: CALLER }) }),
}));
// Radix Select needs pointer APIs jsdom lacks; a native select keeps the same value contract.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const { OrganizationOwnershipSettings, LEAVE_ORGANIZATION } =
  await import('@/components/features/organizations/organization-ownership-settings');

const organization = { id: 'org-1', name: 'Acme GmbH' } as never;
const onTransferred = vi.fn();

function selects() {
  const [owner, role] = screen.getAllByRole('combobox');
  return { owner, role };
}

function choose(ownerValue: string, roleValue: string) {
  const { owner, role } = selects();
  fireEvent.change(owner, { target: { value: ownerValue } });
  fireEvent.change(role, { target: { value: roleValue } });
}

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'organizations.settings.ownership.action' }));
  return {
    input: screen.getByRole('textbox'),
    confirm: screen.getByRole('button', {
      name: 'organizations.settings.ownership.dialog.confirm',
    }),
  };
}

beforeEach(() => {
  grants.TransferOwnership = true;
  emailVerified = true;
  transferOwnership.mockReset().mockResolvedValue({});
  onTransferred.mockReset();
  push.mockReset();
});

describe('organization settings: ownership', () => {
  it('is hidden from a caller who may not transfer ownership', () => {
    grants.TransferOwnership = false;

    render(<OrganizationOwnershipSettings organization={organization} />);

    expect(screen.queryByTestId('organization-ownership-settings')).not.toBeInTheDocument();
  });

  it('offers members other than the caller, and no pending invitation', () => {
    render(<OrganizationOwnershipSettings organization={organization} />);

    const { owner } = selects();
    const options = Array.from(owner.querySelectorAll('option')).map((o) =>
      o.getAttribute('value')
    );
    expect(options).toEqual(['', 'user-ada']);
  });

  it('offers Admin, Dev and Viewer and leaving, never Owner or a custom role', () => {
    render(<OrganizationOwnershipSettings organization={organization} />);

    const { role } = selects();
    const options = Array.from(role.querySelectorAll('option')).map((o) => o.getAttribute('value'));
    expect(options).toEqual(['', 'r-admin', 'r-dev', 'r-viewer', LEAVE_ORGANIZATION]);
  });

  it('keeps the action disabled until a member and a role are chosen', () => {
    render(<OrganizationOwnershipSettings organization={organization} />);
    const action = screen.getByRole('button', { name: 'organizations.settings.ownership.action' });

    expect(action).toBeDisabled();
    fireEvent.change(selects().owner, { target: { value: 'user-ada' } });
    expect(action).toBeDisabled();
    fireEvent.change(selects().role, { target: { value: 'r-viewer' } });
    expect(action).toBeEnabled();
  });

  it('asks for the organization name, exactly, before it transfers', () => {
    render(<OrganizationOwnershipSettings organization={organization} />);
    choose('user-ada', 'r-admin');

    const { input, confirm } = openDialog();

    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'acme gmbh' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    expect(confirm).toBeEnabled();
  });

  it('transfers keeping the chosen role, and stays on the page', async () => {
    render(
      <OrganizationOwnershipSettings organization={organization} onTransferred={onTransferred} />
    );
    choose('user-ada', 'r-viewer');
    const { input, confirm } = openDialog();

    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(onTransferred).toHaveBeenCalledOnce());
    expect(transferOwnership).toHaveBeenCalledWith({
      scope: { tenant: 'organization', id: 'org-1' },
      newOwnerId: 'user-ada',
      previousOwnerRoleId: 'r-viewer',
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('transfers and leaves, then returns to the organizations list', async () => {
    render(
      <OrganizationOwnershipSettings organization={organization} onTransferred={onTransferred} />
    );
    choose('user-ada', LEAVE_ORGANIZATION);
    const { input, confirm } = openDialog();

    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    fireEvent.click(confirm);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/organizations'));
    expect(transferOwnership).toHaveBeenCalledWith({
      scope: { tenant: 'organization', id: 'org-1' },
      newOwnerId: 'user-ada',
      leaveOrganization: true,
    });
    expect(onTransferred).toHaveBeenCalledOnce();
  });

  it('stays open and does not navigate when the API refuses', async () => {
    transferOwnership.mockRejectedValueOnce(new Error('refused'));
    render(
      <OrganizationOwnershipSettings organization={organization} onTransferred={onTransferred} />
    );
    choose('user-ada', LEAVE_ORGANIZATION);
    const { input, confirm } = openDialog();

    fireEvent.change(input, { target: { value: 'Acme GmbH' } });
    await act(async () => {
      fireEvent.click(confirm);
    });

    await waitFor(() => expect(transferOwnership).toHaveBeenCalledOnce());
    expect(push).not.toHaveBeenCalled();
    expect(onTransferred).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('keeps the action disabled while the email is unverified', () => {
    emailVerified = false;
    render(<OrganizationOwnershipSettings organization={organization} />);
    choose('user-ada', 'r-admin');

    expect(
      screen.getByRole('button', { name: 'organizations.settings.ownership.action' })
    ).toBeDisabled();
  });
});
