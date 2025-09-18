import { writable, readonly } from 'svelte/store';
import { supabase, Session } from './api/supabase';



// TODO: move to separate module
function getPersistentValue(name: string, fromJson: boolean = false): unknown {
  const value = localStorage.getItem(name);
  if (value === null) return null;
  return fromJson ? JSON.parse(value) : value;
}
function setPersistentValue(name: string, value: unknown, toJson: boolean = false): void {
  const data = toJson ? JSON.stringify(value) : String(value);
  localStorage.setItem(name, data);
}
function deletePersistentValue(name: string): void {
  localStorage.removeItem(name);
}

// Detect ongoing login on page load

type GitHubUserInfo = {
  userName: string;
  fullName: string;
  avatarUrl: string;
  profileUrl: string;
  projectsUrl: string;
  apiToken: string;
} | null;

// Cross-pageload cache for login state to enable smooth page reloads
const FLAG_IS_LOGGED_IN = 'is_logged_in';
const GITHUB_USER_INFO = 'github_user_info';

// Internal read-write
const _isLoggedIn = writable(getPersistentValue(FLAG_IS_LOGGED_IN) !== null);
const _isLoggingIn = writable(false);
const _isLoggingOut = writable(false);
const _githubUserInfo = writable<GitHubUserInfo>(getPersistentValue(GITHUB_USER_INFO, true));

// External read-only
export const isLoggedIn = readonly(_isLoggedIn);
export const isLoggingIn = readonly(_isLoggingIn);
export const isLoggingOut = readonly(_isLoggingOut);
export const githubUserInfo = readonly(_githubUserInfo);


function setIsLoggingIn(state: boolean): void {
  _isLoggingIn.set(state);
}

function setIsLoggingOut(state: boolean): void {
  _isLoggingOut.set(state);
}

function setIsLoggedIn(state: boolean): void {
  _isLoggedIn.set(state);
  if (state) setPersistentValue(FLAG_IS_LOGGED_IN, '1');
  else deletePersistentValue(FLAG_IS_LOGGED_IN);
}


function setGitHubUserInfo(session: Session): void {
  const m = session.user.user_metadata;
  const githubUserInfo: GitHubUserInfo = {
    userName: m.user_name,
    fullName: m.full_name,
    avatarUrl: m.avatar_url,
    profileUrl: `https://github.com/${m.user_name}`,
    projectsUrl: `https://github.com/${m.user_name}?tab=projects`,
    apiToken: session.provider_token
  }
  _githubUserInfo.set(githubUserInfo);
  setPersistentValue(GITHUB_USER_INFO, githubUserInfo, true);
}

/*----------------------------------------------------------------------------*
 * Register handlers for login and logout events
 * Notes:
 *   - On login, the GitHub API token is saved and a session is established
 *     by calling checkSession()
 *   - On logout, the session is destroyed by calling checkSession()
 *   - MUST be called once at app startup to enable session behaviour
/*----------------------------------------------------------------------------*/
export async function setupAuth(): void {
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Executed on page load after logging in
    if (event === 'INITIAL_SESSION' && session && session.provider_token) {
      //saveGitHubApiToken(session.provider_token);
      setGitHubUserInfo(session);
      setIsLoggedIn(true);
      setIsLoggingIn(false);
    }
    // Executed when logout is complete (no reload)
    if (event === 'SIGNED_OUT') {
      deletePersistentValue(GITHUB_USER_INFO);
      setIsLoggingOut(false);
      setIsLoggedIn(false);
    }
  });
}

/*----------------------------------------------------------------------------*
 * Log in
 * Notes:
 *   - This function is ONLY user-triggerd (click on Login button)
 *   - Triggers the INITIAL_SESSION event in the setupAuth() handler
 *  (((- Safe to call when the user is already logged in (idempotent), but this
 *     should never happen since it can be only triggered through the UI))
 *     Note: if called when the user is already logged in, triggers a new login
/*----------------------------------------------------------------------------*/
export async function login(): Promise<void> {
  setIsLoggingIn(true);
  await supabase.auth.signInWithOAuth({  // Triggers redirect/page load
    provider: 'github',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
      scopes: 'repo read:user read:project'
    },
  });
}

/*----------------------------------------------------------------------------*
 * Log out
 * Notes:
 *   - May be user-triggered (click on Logout button) or be called by
 *     checkSession() when tearing down the session
 *   - Safe to call when the user is already logged out (idempotent)
 *   - Triggers the SIGNED_OUT event in the onAuthStateChange handler
/*----------------------------------------------------------------------------*/
export async function logout(): Promise<void> {
  setIsLoggingOut(true);
  await supabase.auth.signOut();  // Triggers SIGNED_OUT in onAuthStateChange
}
