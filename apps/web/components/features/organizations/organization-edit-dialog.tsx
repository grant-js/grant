'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tag, Tenant } from '@grantjs/schema';
import { DefaultValues } from 'react-hook-form';

import { DialogField, EditDialog } from '@/components/common';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { EditOrganizationFormValues, editOrganizationSchema } from './organization-types';

export function OrganizationEditDialog() {
  const { updateOrganization } = useOrganizationMutations();

  const organizationToEdit = useOrganizationsStore((state) => state.organizationToEdit);
  const setOrganizationToEdit = useOrganizationsStore((state) => state.setOrganizationToEdit);

  // Scope permissions to this organization
  const scope = organizationToEdit?.id
    ? { tenant: Tenant.Organization, id: organizationToEdit.id }
    : null;

  // Hook automatically waits for scope to become valid when provided
  const canUpdate = useGrant(ResourceSlug.Organization, ResourceAction.Update, { scope });
  
  if (!scope || !canUpdate) {
    return null;
  }

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.name',
      type: 'text',
      required: true,
    },
  ];

  const defaultValues: DefaultValues<EditOrganizationFormValues> = {
    name: organizationToEdit?.name || '',
    tagIds: organizationToEdit?.tags?.map((tag: Tag) => tag.id) || [],
  };

  const mapOrganizationToFormValues = (organization: Organization): EditOrganizationFormValues => ({
    name: organization.name,
    tagIds: organization.tags?.map((tag: Tag) => tag.id),
  });

  const handleUpdate = async (id: string, values: EditOrganizationFormValues) => {
    await updateOrganization(id, {
      scope: {
        id,
        tenant: Tenant.Organization,
      },
      name: values.name,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOrganizationToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={organizationToEdit}
      open={!!organizationToEdit}
      schema={editOrganizationSchema}
      defaultValues={defaultValues}
      fields={fields}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      updatingText="editDialog.updating"
      translationNamespace="organizations"
      mapEntityToFormValues={mapOrganizationToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
