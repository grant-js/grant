'use client';

import { Tenant } from '@grantjs/schema';

import {
  SettingImageUploadDialog,
  type SettingImageUploadDialogProps,
} from '@/components/features/settings';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationPictureUploadDialog() {
  const organization = useOrganizationsStore((state) => state.organizationForPictureUpload);
  const setOrganizationForPictureUpload = useOrganizationsStore(
    (state) => state.setOrganizationForPictureUpload
  );
  const setOrganizationToEdit = useOrganizationsStore((state) => state.setOrganizationToEdit);
  const setOrganizations = useOrganizationsStore((state) => state.setOrganizations);
  const setCurrentOrganization = useOrganizationsStore((state) => state.setCurrentOrganization);
  const { uploadOrganizationPictureDirect } = useOrganizationMutations();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOrganizationForPictureUpload(null);
    }
  };

  const handleUpload: SettingImageUploadDialogProps['onUpload'] = async (file) => {
    if (!organization) return;
    const result = await uploadOrganizationPictureDirect(
      {
        scope: { tenant: Tenant.Organization, id: organization.id },
        organizationId: organization.id,
      },
      file
    );

    if (!result?.url) return;

    const patch = { pictureUrl: result.url, updatedAt: new Date() };
    const state = useOrganizationsStore.getState();
    setOrganizations(
      state.organizations.map((org) => (org.id === organization.id ? { ...org, ...patch } : org))
    );
    if (state.organizationToEdit?.id === organization.id) {
      setOrganizationToEdit({ ...state.organizationToEdit, ...patch });
    }
    if (state.currentOrganization?.id === organization.id) {
      setCurrentOrganization({ ...state.currentOrganization, ...patch });
    }
  };

  return (
    <SettingImageUploadDialog
      open={!!organization}
      onOpenChange={handleOpenChange}
      onUpload={handleUpload}
      currentImageUrl={organization?.pictureUrl || undefined}
      translationNamespace="organizations.upload"
    />
  );
}
