import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The dialog uploads a CDM import by reference: mint an upload URL, PUT the file to it,
 * start the job from the returned id. These tests run the real dialog and the real hook
 * against a mocked Apollo and a mocked `fetch`, so what they assert is the sequence of
 * requests the browser would make, not what the component happens to call.
 */

const MIB = 1024 * 1024;

vi.mock('next-intl', () => ({
  // Returns the key (with its values), so assertions are on which message was chosen.
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
}));

// `@/components/common` reaches `@/i18n/navigation`, whose `createNavigation` imports
// `next/navigation` in a form the test runner cannot resolve. Nothing here navigates.
vi.mock('@/i18n/navigation', () => ({
  Link: 'a',
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@grantjs/client/react', () => ({
  useGrant: () => ({ isGranted: true, isLoading: false }),
}));

vi.mock('@/hooks/auth', () => ({
  useRequiresEmailVerificationForMutation: () => false,
}));

const scope = { tenant: 'organizationProject', id: 'org-1:project-1' };
vi.mock('@/hooks/common', () => ({
  useScopeFromParams: () => scope,
  useDirectUploadMessage: () => (error: { failure: string }) => `upload:${error.failure}`,
}));

const runtimeConfig = { cdmUploadMaxBytes: 64 * MIB };
vi.mock('@/components/providers/runtime-config-provider', () => ({
  useRuntimeConfig: () => runtimeConfig,
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

const mint = vi.fn();
const start = vi.fn();
// Told apart by operation name: components may not import `*Document` (AGENTS.md § Web app
// layer boundaries), and the point is to drive the real hook, which does.
vi.mock('@apollo/client/react', () => ({
  useMutation: (document: { definitions: Array<{ name?: { value: string } }> }) => [
    document.definitions[0]?.name?.value === 'RequestProjectSyncUploadUrl' ? mint : start,
    { loading: false, error: undefined, data: undefined, reset: vi.fn() },
  ],
  useQuery: vi.fn(),
}));

const { ProjectSyncJobStartDialog } = await import('./project-sync-job-start-dialog');
const { useProjectSyncJobsStore } = await import('@/stores/project-sync-jobs.store');

const ticket = {
  uploadId: '0b4f3a52-3f0e-4c07-9d4f-4d3a2f6a1b11',
  url: 'https://bucket.example/imports/projects/project-1/0b4f3a52.json?sig=s',
  method: 'PUT',
  expiresAt: new Date(Date.now() + 60_000),
  headers: [{ name: 'Content-Type', value: 'application/json' }],
};

const job = { id: 'job-1', status: 'PENDING' };

const cdm = {
  version: 1,
  id: 'nightly-sync',
  mode: { strategy: 'merge', onConflict: 'update' },
  roles: [{ key: 'r1' }, { key: 'r2' }],
  users: [{ key: { value: 'u1' }, apiKeys: [{ key: 'k1' }] }],
  groups: [{ key: 'g1' }],
  tags: [{ key: 't1' }],
};

function jsonFile(content: unknown, name = 'cdm.json'): File {
  return new File([JSON.stringify(content)], name, { type: 'application/json' });
}

/** A file whose reported size is `size`, without allocating that many bytes. */
function fileOfSize(size: number, content = 'not parsed', name = 'big.json'): File {
  const file = new File([content], name, { type: 'application/json' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

async function drop(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  runtimeConfig.cdmUploadMaxBytes = 64 * MIB;
  mint.mockResolvedValue({ data: { requestProjectSyncUploadUrl: ticket } });
  start.mockResolvedValue({ data: { startProjectSync: job } });
  fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  useProjectSyncJobsStore.setState({ isStartDialogOpen: true, jobs: [], refetch: null });
});

describe('ProjectSyncJobStartDialog, importing by reference', () => {
  it('mints an upload URL, PUTs the file as it is, then starts the job from the upload id', async () => {
    render(<ProjectSyncJobStartDialog />);
    const file = jsonFile(cdm);
    await drop(file);

    // The preview is unchanged for a file the browser can parse.
    await screen.findByText('summary.jobParameters');
    expect(screen.getByText('nightly-sync')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));

    expect(mint).toHaveBeenCalledWith({
      variables: {
        id: 'project-1',
        scope,
        input: { contentLength: file.size, contentType: 'application/json' },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ticket.url);
    expect(init.method).toBe('PUT');
    expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
    // The bytes of the file, not a re-serialised copy of what was parsed from it.
    expect(init.body).toBe(file);
    expect(init.credentials).toBe('omit');

    // The start request carries the reference and what the caller is asking for, never
    // the document. The hint is 2 roles + 1 user + 1 group + 1 tag.
    const [startCall] = start.mock.calls[0] as [
      { variables: { id: string; scope: unknown; input: Record<string, unknown> } },
    ];
    expect(startCall.variables).toEqual({
      id: 'project-1',
      scope,
      input: {
        id: 'nightly-sync',
        version: 1,
        mode: { strategy: 'merge', onConflict: 'update' },
        source: { uploadId: ticket.uploadId, entityCount: 5 },
      },
    });
    expect(startCall.variables.input).not.toHaveProperty('roles');
    expect(startCall.variables.input).not.toHaveProperty('users');

    // The order matters: the job may only start once the bytes are in the store.
    expect(mint.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(start.mock.invocationCallOrder[0]);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('startSuccess'));
  });

  it('names the job after a UUID when the document does not name it', async () => {
    render(<ProjectSyncJobStartDialog />);
    const { id: _id, ...unnamed } = cdm;
    await drop(jsonFile(unnamed));
    await screen.findByText('summary.jobParameters');

    fireEvent.click(screen.getByRole('button', { name: 'submit' }));
    await waitFor(() => expect(start).toHaveBeenCalledTimes(1));

    const input = (start.mock.calls[0] as [{ variables: { input: { id: string } } }])[0].variables
      .input;
    expect(input.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('refuses a file over the server limit before asking for an upload URL', async () => {
    runtimeConfig.cdmUploadMaxBytes = 5 * MIB;
    render(<ProjectSyncJobStartDialog />);

    await drop(fileOfSize(6 * MIB));

    expect(await screen.findByText('errors.fileTooLarge:{"maxSize":"5"}')).toBeInTheDocument();
    expect(mint).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
  });

  it('takes the limit it advertises from the runtime config, not a constant', async () => {
    runtimeConfig.cdmUploadMaxBytes = 100 * MIB;
    render(<ProjectSyncJobStartDialog />);

    expect(screen.getByText('dropzone.hint:{"maxSize":"100"}')).toBeInTheDocument();
  });

  describe('above the browser parse threshold', () => {
    it('does not read the file, sends no hint, and asks for the mode the file cannot be asked', async () => {
      const readAsText = vi.spyOn(FileReader.prototype, 'readAsText');
      render(<ProjectSyncJobStartDialog />);

      // Not JSON at all: if the browser tried to parse it the dialog would say so.
      const file = fileOfSize(9 * MIB);
      await drop(file);

      expect(await screen.findByText(/largeFile\.note/)).toBeInTheDocument();
      expect(readAsText).not.toHaveBeenCalled();
      expect(screen.queryByText('errors.invalidJson')).not.toBeInTheDocument();

      // Without the document there is no mode to send, so the user has to say.
      const submit = screen.getByRole('button', { name: 'submit' });
      expect(submit).toBeDisabled();
      fireEvent.click(screen.getByRole('radio', { name: 'summary.strategy.merge' }));
      expect(submit).toBeEnabled();

      fireEvent.click(submit);
      await waitFor(() => expect(start).toHaveBeenCalledTimes(1));

      expect(mint).toHaveBeenCalledWith({
        variables: {
          id: 'project-1',
          scope,
          input: { contentLength: 9 * MIB, contentType: 'application/json' },
        },
      });
      const { input } = (
        start.mock.calls[0] as [{ variables: { input: Record<string, unknown> } }]
      )[0].variables;
      expect(input.mode).toEqual({ strategy: 'merge' });
      expect(input.source).toEqual({ uploadId: ticket.uploadId });
      expect(input).not.toHaveProperty('version');
      expect(input.id).toMatch(/^[0-9a-f-]{36}$/);

      readAsText.mockRestore();
    });

    it('asks for the replace confirmation the server requires on the request', async () => {
      render(<ProjectSyncJobStartDialog />);
      await drop(fileOfSize(9 * MIB));
      await screen.findByText(/largeFile\.note/);

      fireEvent.click(screen.getByRole('radio', { name: 'summary.strategy.replace' }));
      const submit = screen.getByRole('button', { name: 'submit' });
      expect(submit).toBeDisabled();

      fireEvent.click(screen.getByRole('checkbox'));
      expect(submit).toBeEnabled();

      fireEvent.click(submit);
      await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
      const { input } = (
        start.mock.calls[0] as [{ variables: { input: Record<string, unknown> } }]
      )[0].variables;
      expect(input.mode).toEqual({ strategy: 'replace', confirmDestructive: true });
    });

    it('still parses a file at the threshold', async () => {
      const readAsText = vi.spyOn(FileReader.prototype, 'readAsText');
      render(<ProjectSyncJobStartDialog />);

      await drop(fileOfSize(8 * MIB, JSON.stringify(cdm)));

      await screen.findByText('summary.jobParameters');
      expect(readAsText).toHaveBeenCalledTimes(1);
      readAsText.mockRestore();
    });
  });

  describe('when something fails', () => {
    it('says the file is too large, with the limit the API reported, when the mint refuses its size', async () => {
      mint.mockRejectedValue({
        errors: [{ extensions: { code: 'PAYLOAD_TOO_LARGE', limitBytes: 32 * MIB } }],
      });
      render(<ProjectSyncJobStartDialog />);
      await drop(jsonFile(cdm));
      await screen.findByText('summary.jobParameters');

      fireEvent.click(screen.getByRole('button', { name: 'submit' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('errors.fileTooLarge:{"maxSize":"32"}')
      );
      expect(toast.error).not.toHaveBeenCalledWith('startError', expect.anything());
      expect(fetchMock).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
    });

    it('does not start the job when the store refuses the upload', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
      render(<ProjectSyncJobStartDialog />);
      await drop(jsonFile(cdm));
      await screen.findByText('summary.jobParameters');

      fireEvent.click(screen.getByRole('button', { name: 'submit' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('startError', { description: 'upload:rejected' })
      );
      expect(start).not.toHaveBeenCalled();
    });

    it('keeps the generic failure for anything else', async () => {
      start.mockRejectedValue(new Error('Project sync jobs are unavailable'));
      render(<ProjectSyncJobStartDialog />);
      await drop(jsonFile(cdm));
      await screen.findByText('summary.jobParameters');

      fireEvent.click(screen.getByRole('button', { name: 'submit' }));

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('startError', {
          description: 'Project sync jobs are unavailable',
        })
      );
    });
  });
});
