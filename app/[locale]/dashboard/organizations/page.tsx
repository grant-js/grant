'use client';

import { usePageTitle } from '@/hooks';

export default function DashboardPage() {
  usePageTitle('organizations');

  // TODO: Create OrganizationsPage component
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Organizations</h1>
      <p>Organizations page will be implemented here.</p>
    </div>
  );
}
