import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GrantClient } from '../../../grant-client';
import { GrantProvider } from '../../context';
import { GrantGate } from '../GrantGate';

describe('GrantGate', () => {
  let mockClient: GrantClient;
  let mockIsAuthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockIsAuthorized = vi.fn();
    mockClient = {
      isAuthorized: mockIsAuthorized,
    } as unknown as GrantClient;

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <GrantProvider client={mockClient}>{children}</GrantProvider>
  );

  it('should render children when authorized', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    render(
      <GrantGate resource="Document" action="Update">
        <div>Edit Button</div>
      </GrantGate>,
      { wrapper }
    );

    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalled();
      expect(screen.getByText('Edit Button')).toBeInTheDocument();
    });
  });

  it('should render fallback when not authorized', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: false,
    });

    render(
      <GrantGate resource="Document" action="Delete" fallback={<div>Access Denied</div>}>
        <div>Delete Button</div>
      </GrantGate>,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.queryByText('Delete Button')).not.toBeInTheDocument();
    });
  });

  it('should render nothing when not authorized and no fallback', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: false,
    });

    const { container } = render(
      <GrantGate resource="Document" action="Delete">
        <div>Delete Button</div>
      </GrantGate>,
      { wrapper }
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should render loading state while checking permission', async () => {
    mockIsAuthorized.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <GrantGate
        resource="Document"
        action="Update"
        loading={<div>Checking permissions...</div>}
      >
        <div>Edit Button</div>
      </GrantGate>,
      { wrapper }
    );

    // Wait for hook to start loading
    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalled();
    });

    expect(screen.getByText('Checking permissions...')).toBeInTheDocument();
    expect(screen.queryByText('Edit Button')).not.toBeInTheDocument();
  });

  it('should not render loading when loading prop is null', () => {
    mockIsAuthorized.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { container } = render(
      <GrantGate resource="Document" action="Update" loading={null}>
        <div>Edit Button</div>
      </GrantGate>,
      { wrapper }
    );

    expect(container.firstChild).toBeNull();
  });

  it('should pass scope to permission check', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    const scope = { tenant: 'organization', id: 'org-123' };

    render(
      <GrantGate resource="Project" action="Delete" scope={scope}>
        <div>Delete Project</div>
      </GrantGate>,
      { wrapper }
    );

    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalledWith('Project', 'Delete', {
        scope,
        useCache: true,
      });
    });
  });

  it('should respect enabled prop', () => {
    render(
      <GrantGate resource="Document" action="Update" enabled={false}>
        <div>Edit Button</div>
      </GrantGate>,
      { wrapper }
    );

    expect(mockIsAuthorized).not.toHaveBeenCalled();
  });

  it('should respect useCache prop', async () => {
    mockIsAuthorized.mockResolvedValue({
      authorized: true,
    });

    render(
      <GrantGate resource="Document" action="Update" useCache={false}>
        <div>Edit Button</div>
      </GrantGate>,
      { wrapper }
    );

    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalled();
      expect(mockIsAuthorized).toHaveBeenCalledWith('Document', 'Update', {
        scope: undefined,
        useCache: false,
      });
    });
  });

  it('should handle multiple permission gates', async () => {
    mockIsAuthorized
      .mockResolvedValueOnce({ authorized: true })
      .mockResolvedValueOnce({ authorized: false });

    render(
      <>
        <GrantGate resource="Document" action="Update">
          <div>Can Update</div>
        </GrantGate>
        <GrantGate resource="Document" action="Delete" fallback={<div>Cannot Delete</div>}>
          <div>Can Delete</div>
        </GrantGate>
      </>,
      { wrapper }
    );

    await waitFor(() => {
      expect(mockIsAuthorized).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Can Update')).toBeInTheDocument();
      expect(screen.getByText('Cannot Delete')).toBeInTheDocument();
      expect(screen.queryByText('Can Delete')).not.toBeInTheDocument();
    });
  });
});
