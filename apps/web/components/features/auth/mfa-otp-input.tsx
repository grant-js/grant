'use client';

import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface MfaOtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  containerClassName?: string;
  id?: string;
}

export function MfaOtpInput({
  value,
  onChange,
  disabled,
  containerClassName,
  id,
}: MfaOtpInputProps) {
  return (
    <InputOTP
      id={id}
      value={value}
      onChange={onChange}
      maxLength={6}
      disabled={disabled}
      containerClassName={containerClassName}
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}
