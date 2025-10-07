'use client';

import { useState } from 'react';

import { Eye, EyeOff } from 'lucide-react';

import { Button } from './button';
import { Input } from './input';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  toggleClassName?: string;
}

export function PasswordInput({ toggleClassName, className, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative">
      <Input type={showPassword ? 'text' : 'password'} className={className} {...props} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent ${toggleClassName || ''}`}
        onClick={toggleVisibility}
        tabIndex={-1}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}
