// Base auth client - Pure auth operations
import { supabase } from './supabase';
import { isMockMode, mockDelay } from '../mock/utils';
import type { RawAuth } from '../types';

// Mock data storage (internal to client)
let mockSession: RawAuth | null = null;

// Mock data setter (called by the mock component)
export function initializeMockData(session: RawAuth | null): void {
  mockSession = session;
}

export async function login(): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    // In mock mode, login just ensures mock session is available
    if (!mockSession) {
      mockSession = {
        githubToken: 'mock-token',
        githubUsername: 'mock-user',
        githubAvatarUrl: 'https://github.com/identicons/mock-user.png'
      };
    }
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo read:user read:project',
      redirectTo: `${window.location.origin}/github-projects-dashboard/`
    }
  });

  if (error) throw error;
  // Function returns, OAuth redirect happens
}

export async function logout(): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    // In mock mode, logout doesn't actually change the mock data
    // The test framework controls the mock data state
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<RawAuth | null> {
  if (isMockMode()) {
    return mockSession;
  }

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  return session ? {
    githubToken: session.access_token,
    githubUsername: session.user.user_metadata.user_name,
    githubAvatarUrl: session.user.user_metadata.avatar_url
  } : null;
}
