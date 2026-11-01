import type { Client } from '@/lib/storage';

export type DuplicateMatch = { client: Client; reason: 'phone' | 'name' };

export const normalizePhone = (value: string): string => value.replace(/\D/g, '');
export const normalizeName = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function findDuplicateClient(clients: Client[], name: string, phone: string): DuplicateMatch | undefined {
  const phoneKey = normalizePhone(phone);
  if (phoneKey) {
    const byPhone = clients.find((client) => normalizePhone(client.phone) === phoneKey);
    if (byPhone) return { client: byPhone, reason: 'phone' };
  }
  const nameKey = normalizeName(name);
  if (!nameKey) return undefined;
  const byName = clients.find((client) => normalizeName(client.name) === nameKey);
  return byName ? { client: byName, reason: 'name' } : undefined;
}
