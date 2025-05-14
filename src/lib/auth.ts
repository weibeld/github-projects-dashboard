import { writable, readonly } from 'svelte/store';
import { supabase } from './supabase';
import { logFn, logFnArgs, logFnReturn } from './log';
import { saveGitHubApiToken, deleteGitHubApiToken, hasValidGitHubApiToken } from './githubApiTokenStore';

/*----------------------------------------------------------------------------*
 * Indicate whether there is currently a valid session or not. A valid session
 * exists if and only if all of the following conditions are met:
 *   1. The user is logged in
 *   2. There is a GitHub API token
 *   3. The GitHub API token is valid (e.g. not expired)
 *----------------------------------------------------------------------------*/
const _isSession = writable(false);             // Read/write (internal)
export const isSession = readonly(_isSession);  // Read-only (exported)

/*----------------------------------------------------------------------------*
 * Register handlers for login and logout events
 * Notes:
 *   - On login, the GitHub API token is saved and a session is established
 *     by calling checkSession()
 *   - On logout, the session is destroyed by calling checkSession()
 *   - MUST be called once at app startup to enable session behaviour
/*----------------------------------------------------------------------------*/
export function setupAuth(): void {
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Login: complete creation of session
    //if (event === 'INITIAL_SESSION') {
    if (event === 'SIGNED_IN') {
      logFn('onAuthStateChange', 'SIGNED_IN');
      console.log(session);
      const token = session?.provider_token;
      if (!token) throw new Error('No GitHub API token found upon login');
      saveGitHubApiToken(token);
      await checkSession();
    }
    // Logout: destroy rest of session
    if (event === 'SIGNED_OUT') {
      logFn('onAuthStateChange', 'SIGNED_OUT');
      await checkSession();
    }
  });
}

/*----------------------------------------------------------------------------*
 * Validate whether there is currently a valid session or not
 * Notes:
 *   - A valid session exists if and only if all session conditions are true
 *   - After validation, the isSession store is set
 *   - In the negative case (if there is no valid session), all session
 *     remainders are torn down (i.e. all session conditions are made false)
 *   - Protected by a mutex to prevent parallel executions due to side-effects
 *     (logout() triggers SIGNED_OUT handler which calls checkSession() again)
 *   - MUST be called at app startup to determine initial session state
 *   - The isSession store is written to ONLY by this function
/*----------------------------------------------------------------------------*/
let checkSessionMutex = false;
export async function checkSession(): Promise<void> {
  logFnArgs('checkSession', { });
  if (checkSessionMutex) return;
  logFn('checkSession', 'Entered critical section');
  checkSessionMutex = true;
  try {
    // Check if all three session conditions are met (see isSession)
    if (await isLoggedIn() && await hasValidGitHubApiToken()) {
      setSession(true);
    } else {
      deleteGitHubApiToken();
      await logout();
      setSession(false);
    }
  } finally {
    checkSessionMutex = false;
    logFn('checkSession', 'Left critical section');
  }
}
function setSession(state: boolean): void {
  logFnArgs('setSession', { state });
  _isSession.set(state);
}

/*----------------------------------------------------------------------------*
 * Log in
 * Notes:
 *   - This function is ONLY user-triggerd (click on Login button)
 *   - Triggers the INITIAL_SESSION event in the setupAuth() handler
 *  (((- Safe to call when the user is already logged in (idempotent), but this
 *     should never happen since it can be only triggered through the UI))
/*----------------------------------------------------------------------------*/
export async function login(): Promise<void> {
  logFnArgs('login', { });
  //if (await isLoggedIn()) return
  await supabase.auth.signInWithOAuth({
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
  logFnArgs('logout', { });
  await supabase.auth.signOut();
  logFn('logout', 'Return');
}

/*----------------------------------------------------------------------------*
 * Check whether the user is currently logged in
 * Notes:
 *   - Internal helper function
 *   - Note that being logged in (with GitHub through Supabase) constitutes only
 *     one of several part of a valid session (see isSession store)
/*----------------------------------------------------------------------------*/
async function isLoggedIn(): Promise<boolean> {
  logFnArgs('isLoggedIn', { });
  console.log('Calling supabase.auth.getSession()');
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Returning from supabase.auth.getSession()');
  const ret = !!session;
  logFnReturn('isLoggedIn', ret);
  return ret;
}
