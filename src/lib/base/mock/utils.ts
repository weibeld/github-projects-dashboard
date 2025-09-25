/**
 * Mock mode utility functions
 * Used exclusively by base layer clients (src/lib/base/*)
 */

export function isMockMode(): boolean {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('mock-data');
}

export function mockDelay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getMockUuid(): string {
  return crypto.randomUUID();
}

export function getMockCurrentDateString(): string {
  return new Date().toISOString();
}
