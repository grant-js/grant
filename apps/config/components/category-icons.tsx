import {
  AppWindow,
  Box,
  Database,
  Github,
  Globe,
  KeyRound,
  Server,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

import type { EnvCategoryId } from '@/lib/env-metadata';

export const CATEGORY_ICONS: Record<EnvCategoryId, React.ComponentType<{ className?: string }>> = {
  main: AppWindow,
  docker: Server,
  database: Database,
  cache: Box,
  auth: KeyRound,
  github: Github,
  security: ShieldCheck,
  web: Globe,
  optional: SlidersHorizontal,
};
