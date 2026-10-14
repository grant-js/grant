'use client';

import { useTranslations } from 'next-intl';

import { parseCdmImportError } from '@/lib/cdm-import';

interface ProjectSyncJobErrorMessageProps {
  errorMessage: string;
}

/**
 * A failed job's error. A by-reference import the worker refused starts its message with a
 * code (`CDM_IMPORT_TOO_MANY_ENTITIES: …`); that code is shown as translated text, with the
 * server's own sentence beneath it, because the sentence carries the numbers (how many
 * entities, what limit) and the validation messages the translation cannot. Any other
 * message is shown as the server sent it.
 */
export function ProjectSyncJobErrorMessage({ errorMessage }: ProjectSyncJobErrorMessageProps) {
  const t = useTranslations('projectSyncJobs.importErrors');
  const parsed = parseCdmImportError(errorMessage);

  if (!parsed) {
    return <p className="break-words">{errorMessage}</p>;
  }

  return (
    <>
      <p className="break-words">{t(parsed.code)}</p>
      {parsed.detail ? (
        <p className="mt-1 break-words text-xs opacity-80">{parsed.detail}</p>
      ) : null}
    </>
  );
}
