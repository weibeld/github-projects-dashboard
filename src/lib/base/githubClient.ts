// Base GitHub client - Pure GitHub API operations
// This client is "dumb" and contains no business logic

import { isMockMode, mockDelay } from './mock/utils';
import type { GitHubClientProject } from './types';

// GitHub API response type (local to this client) - array of projects
type GitHubApiData = Array<{
  id: string;
  number: number;
  title: string;
  url: string;
  public: boolean;
  closed: boolean;
  createdAt: string;
  updatedAt: string | null;
  closedAt: string | null;
  items: {
    totalCount: number;
  };
}>;

// Mock data storage (internal to client)
let mockProjects: GitHubClientProject[] = [];

// Mock data setter (called by the mock component)
export function initializeMockData(projects: GitHubClientProject[]): void {
  mockProjects = [...projects];
}

// GitHub GraphQL query
const PROJECTS_QUERY = `
  query {
    viewer {
      projectsV2(first: 100) {
        nodes {
          id
          number
          title
          url
          public
          closed
          createdAt
          updatedAt
          closedAt
          items {
            totalCount
          }
        }
      }
    }
  }`;

// Main client function - fetch user's GitHub projects
export async function queryGitHubProjects(apiToken: string): Promise<GitHubClientProject[]> {
  if (isMockMode()) {
    await mockDelay();
    return [...mockProjects];
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: PROJECTS_QUERY })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('GITHUB_AUTH_EXPIRED');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const result = await response.json();
  const apiData = result?.data?.viewer?.projectsV2?.nodes as GitHubApiData || [];

  return apiData.map((p): GitHubClientProject => ({
    id: p.id,
    number: p.number,
    title: p.title,
    url: p.url,
    isPublic: p.public,
    isClosed: p.closed,
    createdAt: new Date(p.createdAt),
    updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
    closedAt: p.closedAt ? new Date(p.closedAt) : null,
    items: p.items.totalCount
  }));
}
