'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function ThemeExample() {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <Button onClick={toggleTheme} variant="outline">
          Toggle theme
        </Button>
        <Button variant="default">Primary Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="destructive">Destructive Button</Button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-primary-100 rounded-lg">Primary 100</div>
        <div className="p-4 bg-primary-200 rounded-lg">Primary 200</div>
        <div className="p-4 bg-primary-300 rounded-lg">Primary 300</div>
        <div className="p-4 bg-primary-400 rounded-lg text-white">Primary 400</div>
        <div className="p-4 bg-primary-500 rounded-lg text-white">Primary 500</div>
        <div className="p-4 bg-primary-600 rounded-lg text-white">Primary 600</div>
      </div>
    </div>
  );
}
