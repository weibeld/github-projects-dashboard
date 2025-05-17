import { logFn, logFnArgs, logFnReturn } from './log';

const TOKEN_KEY = 'github_api_token';

/*----------------------------------------------------------------------------*
 * Persistently save a GitHub API token
 * Notes:
 *   - Safe to call when there's a token already saved (idempotent), in which
 *     case, the existing token will be overwritten
 *----------------------------------------------------------------------------*/
// TODO: move to auth.ts
export function saveGitHubApiToken(token: string) {
  logFnArgs('saveGitHubApiToken', { token });
  localStorage.setItem(TOKEN_KEY, token);
}

/*----------------------------------------------------------------------------*
 * Return the stored GitHub API token
 * Notes:
 *   - If there's no saved token, null is returned
 *----------------------------------------------------------------------------*/
// TODO: move to auth.ts
export function getGitHubApiToken(): string | null {
  logFn('getGitHubApiToken');
  return logFnReturn('getGitHubApiToken', localStorage.getItem(TOKEN_KEY));
}

/*----------------------------------------------------------------------------*
 * Delete the saved GitHub API token, if existing
 * Notes:
 *   - Safe to call if there is no saved token (idempotent)
 *----------------------------------------------------------------------------*/
export function deleteGitHubApiToken() {
  logFn('deleteGitHubApiToken');
  localStorage.removeItem(TOKEN_KEY);
}


export function hasGitHubApiToken(): boolean {
  logFn('hasGitHubApiToken');
  const token = getGitHubApiToken();
  return logFnReturn('hasGitHubApiToken', !!token);
}

/*----------------------------------------------------------------------------*
 * Check whether there is a GitHub API token and that token is valid
 * Notes:
 *   - The validity of the token is checked by using it to make a simple
 *     request to the GitHub API
 *----------------------------------------------------------------------------*/
// TODO: move check to github.ts
export async function hasValidGitHubApiToken(): Promise<boolean> {
  logFn('hasValidGitHubApiToken');
  if (!hasGitHubApiToken) return false;
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${getGitHubApiToken()}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return logFnReturn('hasValidGitHubApiToken', response.ok);
}
