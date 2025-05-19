import type { Project } from './types';
import { appData } from './appDataStore';
import { get } from 'svelte/store';
import { logFn, logFnArgs, logFnReturn } from './log';
import { githubUserInfo } from '../lib/auth';

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_GRAPHQL_QUERY = `
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
  }
`;


// TODO: include check for validity of token when request is to be made (or
// just optimistically try request with whatever token is found and handle 
// errors). If the token is found to be invalid (e.g. expired), the user should
// be automatically logged out and redirected to the login page for reauthentication.
/*async function hasValidGitHubApiToken(): Promise<boolean> {
  logFn('hasValidGitHubApiToken');
  if (!hasGitHubApiToken) return false;
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${getGitHubApiToken()}`,
      Accept: 'application/vnd.github+json',
    },
  });
  return logFnReturn('hasValidGitHubApiToken', response.ok);
}*/

// TODO: include synchronisation with app data (appDataStore.ts)
export async function loadProjectsFromGitHub() {
  logFnArgs('loadProjectsFromGitHub', { });
  const apiToken = get(githubUserInfo)?.apiToken;
  if (!apiToken) throw new Error('No GitHub token available');
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: GITHUB_GRAPHQL_QUERY })
  });

  if (!response.ok) {
    console.error(await response.text());
    throw new Error('Failed to fetch projects from GitHub');
  }

  const json = await response.json();

  const projectsRaw = json?.data?.viewer?.projectsV2?.nodes;
  logFn('loadProjectsFromGitHub', projectsRaw)
  if (!Array.isArray(projectsRaw)) {
    throw new Error('Invalid response format from GitHub');
  }

  // TODO: temporarily only handle open projects (include closed projects later)
  const openProjects = projectsRaw.filter((p: any) => !p.closed);

  // Adapt GitHub projects to your app's `Project` model
  const parsedProjects: Project[] = openProjects.map((p: any) => ({
    id: p.id,
    statusId: null,
    labelIds: [],
    isNew: true,
  }));

  // Set app state
  /*appData.update(data => {
    parsedProjects.forEach(project => {
      data.projects[project.id] = project;
    });
    return data;
  });*/
  //console.log("appData update: ", get(appData));
}

/*
const fetchProjects = async () => {
  // TODO: fetching repositories always returns an empty list
  const query = `{
    viewer {
      projectsV2(first: 50) {
        nodes {
          id
          number
          title
          url
          closed
          createdAt
          updatedAt
          closedAt
          public
          shortDescription
          items {
            totalCount
          }
        }
      }
    }
  }`;
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });

  const json = await res.json();
  console.log("GitHub response:", json);
  projects = json.data.viewer.projectsV2.nodes;
  loadStatusMap();
  //setupSortables();
};
*/
