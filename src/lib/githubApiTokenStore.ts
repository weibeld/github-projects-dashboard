import { logFnArgs, logFnReturn } from './log';

const TOKEN_KEY = 'github_api_token';

/*----------------------------------------------------------------------------*
 * Persistently save a GitHub API token
 * Notes:
 *   - Safe to call when there's a token already saved (idempotent), in which
 *     case, the existing token will be overwritten
 *----------------------------------------------------------------------------*/
export function saveGitHubApiToken(token: string) {
  logFnArgs('saveGitHubApiToken', { token });
  localStorage.setItem(TOKEN_KEY, token);
}

/*----------------------------------------------------------------------------*
 * Return the stored GitHub API token
 * Notes:
 *   - If there's no saved token, null is returned
 *----------------------------------------------------------------------------*/
export function getGitHubApiToken(): string | null {
  const ret = localStorage.getItem(TOKEN_KEY);
  logFnReturn('getGitHubApiToken', ret);
  return ret;
}

/*----------------------------------------------------------------------------*
 * Delete the saved GitHub API token, if existing
 * Notes:
 *   - Safe to call if there is no saved token (idempotent)
 *----------------------------------------------------------------------------*/
export function deleteGitHubApiToken() {
  logFnArgs('deleteGitHubApiToken', { });
  localStorage.removeItem(TOKEN_KEY);
}

/*----------------------------------------------------------------------------*
 * Check whether there is a GitHub API token and that token is valid
 * Notes:
 *   - The validity of the token is checked by using it to make a simple
 *     request to the GitHub API
 *----------------------------------------------------------------------------*/
export async function hasValidGitHubApiToken(): Promise<boolean> {
  logFnArgs('hasValidGitHubApiToken', { });
  const token = getGitHubApiToken();
  if (!token) return false;
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  const ret = response.ok;
  logFnReturn('hasValidGitHubApiToken', ret);
  return ret;
}
