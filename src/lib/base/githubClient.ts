// Base GitHub client - Pure GitHub API operations
import { isMockMode, mockDelay } from './mockMode';
import type { ProjectID, GitHubProject } from './types';

// Mock GitHub project data for testing
let mockGitHubProjectData: GitHubProject[] = [];

// Mock data setter - used by test framework
export function setMockGitHubData(data: GitHubProject[]) {
  mockGitHubProjectData = [...(data || [])];
}

// GitHub GraphQL query for fetching projects
const graphQlQuery = `
  query {
    viewer {
      projectsV2(first: 100) {
        nodes {
          id
          number
          title
          url
          isPublic: public
          isClosed: closed
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

// Fetch GitHub projects using API token
export async function githubFetchProjects(apiToken: string): Promise<GitHubProject[]> {
  if (isMockMode()) {
    await mockDelay();
    return [...mockGitHubProjectData];
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: graphQlQuery })
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('GITHUB_AUTH_EXPIRED');
    } else {
      throw new Error(`Failed to fetch projects from GitHub: ${await response.text()}`);
    }
  }

  const rawData: any[] = (await response.json())?.data?.viewer?.projectsV2?.nodes;
  return rawData.map(p => ({
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