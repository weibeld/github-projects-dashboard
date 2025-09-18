/**
 * Test mode utilities for bypassing authentication in tests
 * This file can be easily removed when testing is no longer needed
 */

import type { Column, Project, Label, SortField, SortDirection } from '../../src/lib/database';
import type { GitHubProject } from '../../src/lib/api/github';
import { Page } from '@playwright/test';

// ===== PLAYWRIGHT TEST UTILITIES =====

export async function waitForAppLoad(page: Page) {
  // Wait for the main dashboard to be visible
  await page.waitForSelector('[data-testid="column"]', { timeout: 10000 });
}

// ===== MOCK DATA LOADER =====

// For now, just use the pretest data as default
// TODO: In the future, this can be enhanced to load different datasets
export function loadMockData(testName: string) {
  console.log(`Loading mock data for test: ${testName}`);
  // For now, we're using pretest data by default
  // This can be extended in the future to support different datasets
  return currentMockData;
}

// Default fallback mock data
function getDefaultMockData() {
  return {
    userInfo: {
      userName: "test-user",
      userEmail: "test@example.com",
      userAvatarUrl: "https://github.com/identicons/test-user.png"
    },
    columns: [
      {
        id: "col-no-status",
        user_id: "test-user",
        title: "No Status",
        position: 0,
        is_system: true,
        sort_field: "updatedAt",
        sort_direction: "desc"
      },
      {
        id: "col-closed",
        user_id: "test-user",
        title: "Closed",
        position: 1,
        is_system: true,
        sort_field: "closedAt",
        sort_direction: "desc"
      }
    ],
    projects: [],
    labels: [],
    project_labels: []
  };
}

// ===== TEST MODE DETECTION =====

// Check if test mode is enabled
export function isTestMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const hasTestTrue = urlParams.get('test') === 'true';
  const hasTestParam = urlParams.has('test');
  const isLocalhost = window.location.hostname === 'localhost';

  return hasTestTrue || (isLocalhost && hasTestParam);
}

// ===== MOCK DATA SETUP =====

// Import the pretest data directly
import pretestData from './suites/pretest.json' with { type: 'json' };

// Initialize with pretest data by default
let currentMockData: any = pretestData;

// Set mock data for the current test
export function setMockData(mockData: any) {
  currentMockData = mockData;
  // Reset in-memory stores with new data
  testColumns = [...(currentMockData.columns as Column[])];
  testProjects = [...(currentMockData.projects as Project[])];
  testLabels = [...(currentMockData.labels as Label[])];
  testProjectLabels = [...(currentMockData.project_labels as ProjectLabel[])];
}

// Mock user info for tests
export const mockGitHubUserInfo = currentMockData.userInfo;

// Mock database data exported with proper typing
export const mockColumns: Column[] = currentMockData.columns as Column[];
export const mockProjects: Project[] = currentMockData.projects as Project[];
export const mockLabels: Label[] = currentMockData.labels as Label[];

// Mock GitHub API data converted to proper types
export const mockGitHubProjects: GitHubProject[] = currentMockData.githubProjects ?
  currentMockData.githubProjects.map((project: any) => ({
    ...project,
    updatedAt: new Date(project.updatedAt),
    createdAt: new Date(project.createdAt),
    closedAt: project.closedAt ? new Date(project.closedAt) : null
  })) : [];

// Initialize test mode authentication state
export function initTestModeAuth() {
  if (!isTestMode()) return false;

  // Set mock localStorage values
  localStorage.setItem('github-user-info', JSON.stringify(currentMockData.userInfo));

  // Mock Supabase session
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        user_name: 'test-user',
        email: 'test@example.com',
        avatar_url: 'https://github.com/identicons/test-user.png'
      }
    }
  };

  localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
  localStorage.setItem('sb-supabase-auth-token', JSON.stringify(mockSession));

  return true;
}

// ===== MOCK DATABASE OPERATIONS =====

// Project-Label junction table interface
interface ProjectLabel {
  project_id: string;
  label_id: string;
}

// In-memory stores for test data
let testColumns: Column[] = [...mockColumns];
let testProjects: Project[] = [...mockProjects];
let testLabels: Label[] = [...mockLabels];
let testProjectLabels: ProjectLabel[] = [...(currentMockData.project_labels as ProjectLabel[])];

// Helper functions
function generateId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function delay(ms: number = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Column operations
export async function mockFetchColumns(): Promise<Column[]> {
  await delay();
  return [...testColumns];
}

export async function mockCreateColumn(title: string): Promise<Column> {
  await delay();

  const newColumn: Column = {
    id: generateId(),
    user_id: 'test-user',
    title,
    position: testColumns.length,
    is_system: false,
    sort_field: 'updatedAt',
    sort_direction: 'desc'
  };

  testColumns.push(newColumn);
  return newColumn;
}

export async function mockCreateColumnAfter(title: string, afterColumnId: string): Promise<Column> {
  await delay();

  const afterIndex = testColumns.findIndex(col => col.id === afterColumnId);
  const position = afterIndex + 1;

  // Shift positions of columns after the insertion point
  testColumns.forEach(col => {
    if (col.position >= position) {
      col.position++;
    }
  });

  const newColumn: Column = {
    id: generateId(),
    user_id: 'test-user',
    title,
    position,
    is_system: false,
    sort_field: 'updatedAt',
    sort_direction: 'desc'
  };

  testColumns.push(newColumn);
  testColumns.sort((a, b) => a.position - b.position);
  return newColumn;
}

export async function mockUpdateColumnTitle(columnId: string, title: string): Promise<void> {
  await delay();

  const column = testColumns.find(col => col.id === columnId);
  if (column) {
    column.title = title;
  }
}

export async function mockUpdateColumnSorting(columnId: string, sortField: SortField, sortDirection: SortDirection): Promise<void> {
  await delay();

  const column = testColumns.find(col => col.id === columnId);
  if (column) {
    column.sort_field = sortField;
    column.sort_direction = sortDirection;
  }
}

export async function mockDeleteColumn(columnId: string): Promise<void> {
  await delay();

  // Move all projects from deleted column to "No Status"
  const noStatusColumn = testColumns.find(col => col.title === 'No Status');
  if (noStatusColumn) {
    testProjects.forEach(project => {
      if (project.column_id === columnId) {
        project.column_id = noStatusColumn.id;
      }
    });
  }

  // Remove the column
  testColumns = testColumns.filter(col => col.id !== columnId);

  // Update positions
  testColumns.forEach((col, index) => {
    col.position = index;
  });
}

export async function mockUpdateColumnPositions(columnPositions: Array<{id: string, position: number}>): Promise<void> {
  await delay();

  columnPositions.forEach(({ id, position }) => {
    const column = testColumns.find(col => col.id === id);
    if (column) {
      column.position = position;
    }
  });

  testColumns.sort((a, b) => a.position - b.position);
}

// Project operations
export async function mockFetchProjects(): Promise<Project[]> {
  await delay();

  // Join projects with their labels (mimicking Supabase's join)
  const projectsWithLabels = testProjects.map(project => {
    // Find all label IDs for this project
    const labelIds = testProjectLabels
      .filter(pl => pl.project_id === project.id)
      .map(pl => pl.label_id);

    // Get the full label objects
    const labels = testLabels.filter(label => labelIds.includes(label.id));

    return {
      ...project,
      labels
    };
  });

  return projectsWithLabels;
}

export async function mockUpdateProjectColumn(projectId: string, columnId: string, position: number): Promise<void> {
  await delay();

  const project = testProjects.find(p => p.id === projectId);
  if (project) {
    project.column_id = columnId;
    project.position = position;
  }
}

export async function mockAddProjectLabel(projectId: string, labelId: string): Promise<void> {
  await delay();

  // Check if the relationship already exists
  const exists = testProjectLabels.some(pl =>
    pl.project_id === projectId && pl.label_id === labelId
  );

  if (!exists) {
    testProjectLabels.push({
      project_id: projectId,
      label_id: labelId
    });
  }
}

export async function mockRemoveProjectLabel(projectId: string, labelId: string): Promise<void> {
  await delay();

  testProjectLabels = testProjectLabels.filter(pl =>
    !(pl.project_id === projectId && pl.label_id === labelId)
  );
}

// Label operations
export async function mockFetchLabels(): Promise<Label[]> {
  await delay();
  return [...testLabels];
}

export async function mockCreateLabel(title: string, color: string, textColor: 'white' | 'black' = 'white'): Promise<Label> {
  await delay();

  const newLabel: Label = {
    id: generateId(),
    user_id: 'test-user',
    title,
    color,
    text_color: textColor
  };

  testLabels.push(newLabel);
  return newLabel;
}

export async function mockDeleteLabel(labelId: string): Promise<void> {
  await delay();

  // Remove all project_label relationships for this label
  testProjectLabels = testProjectLabels.filter(pl => pl.label_id !== labelId);

  // Remove the label
  testLabels = testLabels.filter(label => label.id !== labelId);
}

// Utility functions to reset test data
export function resetTestData(): void {
  testColumns = [...mockColumns];
  testProjects = [...mockProjects];
  testLabels = [...mockLabels];
  testProjectLabels = [...(currentMockData.project_labels as ProjectLabel[])];
}

export function getTestData() {
  return {
    columns: [...testColumns],
    projects: [...testProjects],
    labels: [...testLabels],
    project_labels: [...testProjectLabels]
  };
}