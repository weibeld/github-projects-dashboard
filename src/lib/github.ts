import { writable, readonly, get } from 'svelte/store';
import { appData } from './appData';
import { logFn, logRaw, logErr, logStore } from './log';
import { logout, githubUserInfo } from './auth';
import type { ProjectID } from './commonTypes';

// TODO: include linked repositories
export type GitHubProject = {
  id: ProjectID,
  number: number;
  title: string;
  url: string;
  isPublic: boolean;
  isClosed: boolean;
  shortDescription: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  closedAt: Date | null;
  items: number;
};

// Data returned by the GitHub API for each project (see GraphQL query)
type GitHubApiData = {
  id: string;
  number: number;
  title: string;
  url: string;
  public: boolean;
  closed: boolean;
  shortDescription: string | null;
  createdAt: string;
  updatedAt: string | null;
  closedAt: string | null;
  items: { totalCount: number };
};

const graphQlQuery = `
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
          shortDescription
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

const _githubProjects = writable<Record<ProjectID, GitHubProject>>({});
export const githubProjects = readonly(_githubProjects);
logStore(githubProjects, 'githubProjects');

function setGitHubProjects(projects: GitHubApiData[] | null | undefined): void {
  const data: Record<ProjectID, GitHubProject> = {};
  if (projects) {
    for (const p of projects) {
      data[p.id] = {
        id: p.id,
        number: p.number,
        title: p.title,
        url: p.url,
        isPublic: p.public,
        isClosed: p.closed,
        shortDescription: p.shortDescription,
        createdAt: new Date(p.createdAt),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
        closedAt: p.closedAt ? new Date(p.closedAt) : null,
        items: p.items.totalCount
      };
    }
  }
  _githubProjects.set(data);
}

// TODO: include synchronisation with app data (appDataStore.ts)
export async function loadProjectsFromGitHub() {
  logFn('loadProjectsFromGitHub');
  const apiToken = get(githubUserInfo)?.apiToken;
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: graphQlQuery })
  });
  if (!response.ok) {
    // Most likely cause: expired GitHub API token
    if (response.status === 401) {
      // TODO: show toast message saying that reauthentication is necessary
      logout();
    }
    else {
      throw new Error(`Failed to fetch projects from GitHub: ${await response.text()}`);
    }
    return;
  }
  const data: GitHubApiData[] = (await response.json())?.data?.viewer?.projectsV2?.nodes;
  logRaw('Fetched projects:', data);
  setGitHubProjects(data);
}
