import { writable, readonly } from 'svelte/store';
import { supabase } from './supabase';
import { saveGitHubApiToken } from './githubApiTokenStore';
import { logRaw, logFn, logFnReturn, logStore } from './log';

// Detect ongoing login on page load
function isRedirectFromOAuth(): boolean {
  logFn('isRedirectFromOAuth');
  return logFnReturn('isRedirectFromOAuth', window.location.hash.includes('access_token'));
}

// Cross-pageload cache for login state to enable smooth page reloads
const FLAG_IS_LOGGED_IN = 'is_logged_in';

const _isLoggedIn = writable(localStorage.getItem(FLAG_IS_LOGGED_IN) !== null);
const _isLoggingInInit = writable(false);
const _isLoggingInAfterOAuth = writable(isRedirectFromOAuth());
const _isLoggingOut = writable(false);

export const isLoggedIn = readonly(_isLoggedIn);
export const isLoggingInInit = readonly(_isLoggingInInit);
export const isLoggingInAfterOAuth = readonly(_isLoggingInAfterOAuth);
export const isLoggingOut = readonly(_isLoggingOut);

isLoggedIn.subscribe(val => { logStore('isLoggedIn', val); })
isLoggingInInit.subscribe(val => { logStore('isLoggingInInit', val); })
isLoggingInAfterOAuth.subscribe(val => { logStore('isLoggingInAfterOAuth', val); })
isLoggingOut.subscribe(val => { logStore('isLoggingOut', val); })

function setIsLoggingOut(state: boolean): void {
  _isLoggingOut.set(state);
}

function setIsLoggedIn(state: boolean): void {
  _isLoggedIn.set(state);
  // Set persistent flag to determine status immediately on page reload
  if (state) localStorage.setItem(FLAG_IS_LOGGED_IN, '1');
  else localStorage.removeItem(FLAG_IS_LOGGED_IN);
}

function setIsLoggingInInit(state: boolean): void {
  _isLoggingInInit.set(state);
}

function setIsLoggingInAfterOAuth(state: boolean): void {
  _isLoggingInAfterOAuth.set(state);
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
    // Executed on page load if there is a session (i.e. user is logged in)
    if (event === 'INITIAL_SESSION' && session) {
      logRaw('onAuthStateChange Handler', 'INITIAL_SESSION', session);
      if (session.provider_token) saveGitHubApiToken(session.provider_token);
      setIsLoggingInAfterOAuth(false);
      setIsLoggedIn(true);
    }
    // Executed when logout is complete (no reload)
    if (event === 'SIGNED_OUT') {
      logRaw('onAuthStateChange Handler', 'SIGNED_OUT');
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
  logFn('login');
  setIsLoggingInInit(true);
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
  logFn('logout');
  setIsLoggingOut(true);
  await supabase.auth.signOut();  // Triggers SIGNED_OUT in onAuthStateChange
}
