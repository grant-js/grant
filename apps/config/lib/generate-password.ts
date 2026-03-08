/**
 * Generates a cryptographically secure random password that meets common policy:
 * - Minimum length 16
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 */
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const SPECIAL = '!@#$%^&*()_+-=[]{}|;\':",./<>?';
const ALL = LOWERCASE + UPPERCASE + DIGITS + SPECIAL;

const MIN_LENGTH = 16;

function getRandomInt(max: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function pickOne(chars: string): string {
  return chars[getRandomInt(chars.length)];
}

/** Shuffle array in place using Fisher–Yates with crypto.getRandomValues */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateSecurePassword(): string {
  const result: string[] = [
    pickOne(LOWERCASE),
    pickOne(UPPERCASE),
    pickOne(DIGITS),
    pickOne(SPECIAL),
  ];
  for (let i = result.length; i < MIN_LENGTH; i++) {
    result.push(pickOne(ALL));
  }
  return shuffle(result).join('');
}
