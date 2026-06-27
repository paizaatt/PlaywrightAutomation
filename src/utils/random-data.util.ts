import type { CustomAccountData } from '../types/custom-account.types';

function randomAlphanumeric(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10).toString()).join('');
}

export function generateRandomUsername(): string {
  return `user_${randomAlphanumeric(8)}`;
}

export function generateRandomBankNumber(): string {
  return randomDigits(4);
}

export function generateRandomSite(): string {
  return `SC${randomDigits(2)}`;
}

export function generateCustomAccountData(): CustomAccountData {
  return {
    username: generateRandomUsername(),
    bankNumber: generateRandomBankNumber(),
    site: generateRandomSite(),
  };
}
