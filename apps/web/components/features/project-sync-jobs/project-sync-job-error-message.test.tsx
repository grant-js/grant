import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CDM_IMPORT_ERROR_CODES } from '@/lib/cdm-import';

vi.mock('next-intl', () => ({
  // Returns the key, so the assertion is on which message was chosen, not on its wording.
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

const { ProjectSyncJobErrorMessage } = await import('./project-sync-job-error-message');

describe('ProjectSyncJobErrorMessage', () => {
  it.each(CDM_IMPORT_ERROR_CODES)(
    'renders the translated message for %s, with the server sentence beneath it',
    (code) => {
      render(<ProjectSyncJobErrorMessage errorMessage={`${code}: 6000 entities, limit 5000`} />);

      expect(screen.getByText(`projectSyncJobs.importErrors.${code}`)).toBeInTheDocument();
      expect(screen.getByText('6000 entities, limit 5000')).toBeInTheDocument();
      // The raw code is not what the user reads.
      expect(screen.queryByText(new RegExp(`^${code}`))).not.toBeInTheDocument();
    }
  );

  it('shows any other message exactly as the server sent it', () => {
    render(<ProjectSyncJobErrorMessage errorMessage="Import failed: deadlock detected" />);

    expect(screen.getByText('Import failed: deadlock detected')).toBeInTheDocument();
  });
});
