'use client';

import { toast, Toaster } from 'sonner';

// Re-export toast function with our default configuration
export { toast };

// Export a configured Toaster component
export function Toast() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
          borderRadius: '0.5rem',
          padding: '1rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        },
        className: 'font-sans',
      }}
      richColors
    />
  );
}
