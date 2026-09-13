'use client';

import { Tenant } from '@grantjs/schema';

import {
  SettingImageUploadDialog,
  type SettingImageUploadDialogProps,
} from '@/components/features/settings';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

/**
 * The dialog hands out a `Blob` since the direct-upload slices landed; the organization
 * picture mutation still takes a base64 data URL, which is what it received when
 * `resizeImage` returned a string. Bridging here keeps #431 behaving exactly as it did
 * on `main` across the merge — organizations are the one upload target without a
 * request/confirm pair, and the bridge goes away when they get one.
 */
const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image'));
    reader.readAsDataURL(blob);
  });

export function OrganizationPictureUploadDialog() {
  const organization = useOrganizationsStore((state) => state.organizationForPictureUpload);
  const setOrganizationForPictureUpload = useOrganizationsStore(
    (state) => state.setOrganizationForPictureUpload
  );
  const setOrganizationToEdit = useOrganizationsStore((state) => state.setOrganizationToEdit);
  const setOrganizations = useOrganizationsStore((state) => state.setOrganizations);
  const setCurrentOrganization = useOrganizationsStore((state) => state.setCurrentOrganization);
  const { uploadOrganizationPicture } = useOrganizationMutations();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOrganizationForPictureUpload(null);
    }
  };

  const handleUpload: SettingImageUploadDialogProps['onUpload'] = async (file) => {
    if (!organization) return;
    const result = await uploadOrganizationPicture({
      scope: { tenant: Tenant.Organization, id: organization.id },
      organizationId: organization.id,
      file: await toDataUrl(file.body),
      filename: file.filename,
      contentType: file.contentType,
    });

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
