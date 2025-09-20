// Base auth client - Pure auth operations
import { supabase } from './supabase';
import { isMockMode, mockDelay } from './mockMode';
import type { UserInfo, AuthSession } from './types';

// Mock auth state (similar to mock database arrays)
let mockUser: UserInfo | null = null;
let mockSession: AuthSession | null = null;

// CORE AUTH OPERATIONS

export async function authLogin(): Promise<AuthSession> {
  if (isMockMode()) {
    await mockDelay();
    mockSession = {
      access_token: 'mock-token',
      user: { id: 'mock-user' }
    };
    mockUser = {
      id: 'mock-user',
      userName: 'mockuser',
      avatarUrl: null,
      email: 'mock@example.com'
    };
    return mockSession;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      scopes: 'repo read:user read:project',
      redirectTo: `${window.location.origin}/github-projects-dashboard/`
    }
  });

  if (error) throw error;
  return data.session!;
}

export async function authLogout(): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    mockSession = null;
    mockUser = null;
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function authGetCurrentSession(): AuthSession | null {
  if (isMockMode()) {
    return mockSession;
  }

  const session = supabase.auth.getSession().data.session;
  return session;
}

export async function authGetCurrentUser(): Promise<UserInfo | null> {
  if (isMockMode()) {
    await mockDelay();
    return mockUser;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  return data.user ? {
    id: data.user.id,
    userName: data.user.user_metadata?.user_name || data.user.email?.split('@')[0] || 'unknown',
    avatarUrl: data.user.user_metadata?.avatar_url || null,
    email: data.user.email || null
  } : null;
}

export async function authRefreshSession(): Promise<AuthSession> {
  if (isMockMode()) {
    await mockDelay();
    if (!mockSession) throw new Error('No mock session to refresh');
    return mockSession;
  }

  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data.session!;
}

export function authGetUserId(): string | null {
  if (isMockMode()) {
    return mockUser?.id || null;
  }

  const session = authGetCurrentSession();
  return session?.user?.id || null;
}

// Set mock data for testing
export function setMockAuthData(user: UserInfo | null, session: AuthSession | null) {
  mockUser = user;
  mockSession = session;
}