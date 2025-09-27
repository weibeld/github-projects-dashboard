//==============================================================================
// UI AUTH LAYER - Transform auth store into UI-optimized structure
//==============================================================================

import { derived } from 'svelte/store';
import { authStoreGetAuth, authStoreGatherStores } from './authStore';

//==============================================================================
// UI AUTH TYPES
//==============================================================================

export interface UiAuth {
  githubUsername: string;
  githubAvatarUrl: string;
  githubProfileUrl: string;
}

export const uiAuth = derived(authStoreGatherStores(), () => {
  const auth = authStoreGetAuth();
  return auth ? {
    githubUsername: auth.githubUsername,
    githubAvatarUrl: auth.githubAvatarUrl,
    githubProfileUrl: `https://github.com/${auth.githubUsername}`
  } : null;
});