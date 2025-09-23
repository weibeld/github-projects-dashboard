// Base auth client - Pure auth operations
import { supabase } from './supabase';
import { isMockMode, mockDelay } from './mock/utils';
import type { AuthClientSession } from './types';

// Mock data storage (internal to client)
let mockSession: AuthClientSession | null = null;

// Mock data setter (called by the mock component)
export function initializeMockData(session: AuthClientSession | null): void {
  mockSession = session;
}

export async function login(): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    // In mock mode, login just ensures mock session is available
    if (!mockSession) {
      mockSession = {
        access_token: 'mock-token',
        user: {
          id: 'mock-user',
          userName: 'mock-user',
          avatarUrl: 'https://github.com/identicons/mock-user.png',
          email: 'mock@example.com'
        }
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

export function getSession(): AuthClientSession | null {
  if (isMockMode()) {
    return mockSession;
  }

  const session = supabase.auth.getSession().data.session;
  return session ? {
    access_token: session.access_token,
    user: {
      id: session.user.id,
      userName: session.user.user_metadata?.user_name || session.user.email?.split('@')[0] || 'unknown',
      avatarUrl: session.user.user_metadata?.avatar_url || null,
      email: session.user.email || null
    }
  } : null;
}
