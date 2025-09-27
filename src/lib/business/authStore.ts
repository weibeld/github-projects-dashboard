import { writable, get } from 'svelte/store';
import type { RawAuth } from '../base/types';
import type { Writable } from 'svelte/store';

interface AuthStore {
  auth: Writable<RawAuth | null>;
}

const authStore: AuthStore = {
  auth: writable<RawAuth | null>(null)
};

export const authStoreInit = (auth: RawAuth): void => {
  authStore.auth.set(auth);
};

export const authStoreClear = (): void => {
  authStore.auth.set(null);
};

// Used for defining uiAuth with derived()
export const authStoreGatherStores = () => [
  authStore.auth
];

// Auth (read-only)
export const authStoreGetAuth = (): RawAuth | null => get(authStore.auth);
