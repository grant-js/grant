import { isProjectOAuthThemeMode, type ProjectOAuthThemeMode } from '@grantjs/schema';

/** Hex brand color stored on projects and project apps. */
export const PRIMARY_COLOR_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export type BrandingFields = {
  pictureUrl?: string | null;
  primaryColor?: string | null;
  showHelpPanel?: boolean | null;
  themeMode?: string | null;
};

export type ResolvedOAuthBranding = {
  pictureUrl: string | null;
  primaryColor: string | null;
  showHelpPanel: boolean;
  themeMode: ProjectOAuthThemeMode | null;
  projectName: string | null;
};

/**
 * App overrides project. Missing/null app fields inherit the project.
 * Project unset uses Grant defaults: no picture, no custom color, help panel on.
 * Theme mode is app-only: null keeps the visitor's Grant theme.
 */
export function resolveOAuthBranding(
  app: BrandingFields,
  project: BrandingFields & { name?: string | null }
): ResolvedOAuthBranding {
  return {
    pictureUrl: app.pictureUrl || project.pictureUrl || null,
    primaryColor: app.primaryColor || project.primaryColor || null,
    showHelpPanel: app.showHelpPanel ?? project.showHelpPanel ?? true,
    themeMode: isProjectOAuthThemeMode(app.themeMode) ? app.themeMode : null,
    projectName: project.name?.trim() || null,
  };
}
