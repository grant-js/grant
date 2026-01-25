'use client';

import { getPasswordRequirements, getPasswordStrength } from '@/lib/validation/password-policy';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const passwordStrength = getPasswordStrength(password);
  const passwordRequirements = getPasswordRequirements();

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength Indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Strength:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`h-2 w-8 rounded transition-colors ${
                passwordStrength.score >= bar * 2
                  ? passwordStrength.strength === 'weak'
                    ? 'bg-destructive'
                    : passwordStrength.strength === 'fair'
                      ? 'bg-warning'
                      : passwordStrength.strength === 'good'
                        ? 'bg-info'
                        : 'bg-success'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-sm font-medium capitalize ${
            passwordStrength.strength === 'weak'
              ? 'text-destructive'
              : passwordStrength.strength === 'fair'
                ? 'text-warning'
                : passwordStrength.strength === 'good'
                  ? 'text-info'
                  : 'text-success'
          }`}
        >
          {passwordStrength.strength}
        </span>
      </div>

      {/* Password Requirements */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Password must have:</p>
        <ul className="text-sm space-y-1">
          {passwordRequirements.map((requirement, index) => {
            const isMet = Object.values(passwordStrength.checks)[index];
            return (
              <li
                key={index}
                className={`flex items-center gap-2 ${isMet ? 'text-success' : 'text-gray-500'}`}
              >
                <span className={isMet ? 'text-success' : 'text-gray-400'}>
                  {isMet ? '✓' : '○'}
                </span>
                {requirement}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
