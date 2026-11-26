// Mock sign-in (D1): phone → OTP → PIN. Demo values only; the Dev panel and login screen show them.
import type { Role } from './types';

export const MOCK_OTP = '123456';
export const MOCK_PIN = '1234';

/** Shared PCs lock after 5 minutes without activity (PLAN.md section 3). */
export const IDLE_LOCK_MS = 5 * 60_000;
/** Dev panel option, so testers don't wait 5 minutes. */
export const QUICK_LOCK_MS = 30_000;

const PHONES: Record<string, Role> = {
  '01711000001': 'manager', // Habib Rahman
  '01711000002': 'desk', // Salma Khatun
};

/** Keeps digits only and drops a leading +88 / 88. */
export function normalisePhone(input: string) {
  const digits = input.replace(/\D/g, '');
  return digits.startsWith('880') ? digits.slice(2) : digits;
}

export const isValidPhone = (phone: string) => /^01\d{9}$/.test(phone);

export const roleForPhone = (phone: string): Role | undefined => PHONES[phone];

/** "01711-000001" → "01711-•••001", for the "code sent to" line. */
export const maskPhone = (phone: string) => `${phone.slice(0, 5)}-•••${phone.slice(-3)}`;
