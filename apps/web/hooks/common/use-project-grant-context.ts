import { useMemo } from 'react';
import { useParams } from 'next/navigation';

export function useProjectGrantContext() {
  const params = useParams();
  const projectId = params.projectId as string | undefined;

  return useMemo(
    () =>
      projectId ? { resource: { id: projectId, scope: { projects: [projectId] } } } : undefined,
    [projectId]
  );
}
