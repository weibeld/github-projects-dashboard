import { get } from 'svelte/store';
import type { Project } from './types';
import { appData } from './appDataStore';
import { logFn, logRaw, logErr } from './log';
import { logout, githubUserInfo } from '../lib/auth';

/*type GitHubProject = {
  id: string;
  number: number;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string;
};*/

const query = `
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
    body: JSON.stringify({ query: query })
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

  const projects = (await response.json())?.data?.viewer?.projectsV2?.nodes;
  logRaw('Loaded projects:', projects)
  // TODO: temporarily only handle open projects (include closed projects later)
  //const openProjects = projectsRaw.filter((p: any) => !p.closed);

  // Adapt GitHub projects to your app's `Project` model
  const parsedProjects: Project[] = projects.map((p: any) => ({
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
