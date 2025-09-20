import type { Column, Project, Label, ProjectLabel, SortField, SortDirection, GitHubProject } from '../src/lib/base/types';
import { Page } from '@playwright/test';
import { setMockDatabaseData } from '../src/lib/base/databaseClient';
import { setMockGitHubData } from '../src/lib/base/githubClient';
import { isMockMode } from '../src/lib/base/mockMode';

export async function waitForAppLoad(page: Page) {
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
}

export function loadMockData(testSuiteData: any) {
  setMockData(testSuiteData);
  return currentMockData;
}


import pretestData from './suites/pretest.json' with { type: 'json' };

let currentMockData: any = {
  ...pretestData
};

// Initialize mock data at startup
setMockDatabaseData(currentMockData.columns || [], currentMockData.projects, currentMockData.labels, currentMockData.project_labels);
setMockGitHubData(currentMockData.githubProjects);

export function setMockData(mockData: any) {
  currentMockData = {
    ...mockData
  };
  setMockDatabaseData(
    currentMockData.columns || [],
    currentMockData.projects,
    currentMockData.labels,
    currentMockData.project_labels
  );
  setMockGitHubData(currentMockData.githubProjects);
}

export function initTestModeAuth() {
  if (!isMockMode()) return false;

  const mockUserInfo = {
    userName: 'mock-user',
    userEmail: 'mock@example.com',
    userAvatarUrl: 'https://github.com/identicons/mock-user.png'
  };

  localStorage.setItem('github-user-info', JSON.stringify(mockUserInfo));

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'mock-user-id',
      email: 'mock@example.com',
      user_metadata: {
        user_name: 'mock-user',
        email: 'mock@example.com',
        avatar_url: 'https://github.com/identicons/mock-user.png'
      }
    }
  };

  localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
  localStorage.setItem('sb-supabase-auth-token', JSON.stringify(mockSession));

  return true;
}


