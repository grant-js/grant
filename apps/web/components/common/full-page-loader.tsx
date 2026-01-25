'use client';

import { Spinner } from '../ui/spinner';

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message }: FullPageLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center space-y-4">
        <Spinner className="text-black dark:text-white size-6" />
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  );
}
