import {
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
  UserSession,
} from '@grantjs/schema';
import type { ReactNode } from 'react';
import { z } from 'zod';

import {
  addEmailAuthMethodSchema,
  profileSettingsSchema,
  projectMembershipProfileSchema,
} from './setting-schemas';

export interface SettingAccountDetailsCardProps {
  accountType: 'personal' | 'organization';
  hasComplementaryAccount: boolean;
  accountCount: number;
}

export interface SettingActiveSessionsListProps {
  sessions: UserSession[];
  loading: boolean;
  currentSessionId?: string;
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRefresh?: () => void;
  totalCount: number;
  limit: number;
}

type PasswordFormMode = 'set' | 'change';

export type PasswordChangeFormValues = {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
};

export interface PasswordChangeFormProps {
  mode?: PasswordFormMode;
  onSubmit: (values: PasswordChangeFormValues) => Promise<void>;
  onCancel?: () => void;
}

export interface SettingAuthenticationMethodActionsProps {
  method: UserAuthenticationMethod | null;
  provider: UserAuthenticationMethodProvider;
  isPrimary: boolean;
  isLastMethod: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSetPrimary: () => void;
  onChangePassword?: () => void;
  onSetPassword?: () => void;
}

export interface SettingAuthenticationMethodsListProps {
  loading?: boolean;
  onChangePassword?: () => void;
  onSetPassword?: () => void;
}

export interface SettingProfileInformationFormProps {
  defaultValues: SettingProfileFormValues;
  onSubmit: (values: SettingProfileFormValues) => Promise<void>;
  onUploadPicture: (file: string, filename: string, contentType: string) => Promise<void>;
  currentPictureUrl?: string;
  currentPictureUpdatedAt?: string;
}

export interface SettingImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: string, filename: string, contentType: string) => Promise<void>;
  currentImageUrl?: string;
  translationNamespace?: string;
}

export type SettingEmailAuthMethodAddFormValues = z.infer<typeof addEmailAuthMethodSchema>;

export type SettingProfileFormValues = z.infer<typeof profileSettingsSchema>;

export type SettingProjectMembershipProfileFormValues = z.infer<
  typeof projectMembershipProfileSchema
>;

export interface SettingEmailAuthMethodAddFormProps {
  onSubmit: (values: SettingEmailAuthMethodAddFormValues) => Promise<void>;
  onCancel?: () => void;
}

export interface SettingCardProps {
  title: string;
  /** Renders inline next to the title (e.g. info popover). */
  titleAdornment?: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  headerActions?: ReactNode;
}
