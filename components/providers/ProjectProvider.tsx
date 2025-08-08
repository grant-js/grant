'use client';

import { createContext, useContext, ReactNode } from 'react';

import { Scope, Tenant } from '@/graphql/generated/types';

interface ProjectContextType {
  projectId: string;
  organizationId: string;
  projectScope: Scope;
  organizationScope: Scope;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
  projectId: string;
  organizationId: string;
}

export function ProjectProvider({ children, projectId, organizationId }: ProjectProviderProps) {
  const projectScope: Scope = {
    tenant: Tenant.Project,
    id: projectId,
  };

  const organizationScope: Scope = {
    tenant: Tenant.Organization,
    id: organizationId,
  };

  const value: ProjectContextType = {
    projectId,
    organizationId,
    projectScope,
    organizationScope,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
