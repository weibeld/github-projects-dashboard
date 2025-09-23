/**
 * Mock mode test suite interface
 * Single function to initialize all mock data with sensible defaults
 */

import type { MockData } from './types';
import type { AuthClientSession } from '../types';
import { initializeMockData as initializeMockDataAuth } from '../authClient';
import { initializeMockData as initializeMockDataGitHub } from '../githubClient';
import { initializeMockData as initializeMockDataDatabase } from '../databaseClient';

// Single mock data setup function - initializes all clients with defaults
export function defineMockData(data: MockData = {}): void {
  // Auth data - always initialize with defaults for complete session
  const authData = {
    userName: data.auth?.userName ?? 'mock-user',
    email: data.auth?.email ?? 'mock@example.com',
    avatarUrl: data.auth?.avatarUrl ?? 'https://github.com/identicons/mock-user.png',
    id: data.auth?.id ?? 'mock-user'
  };

  const fullSession: AuthClientSession = {
    access_token: 'mock-token',
    user: authData
  };

  // GitHub data - default to empty projects
  const githubProjects = data.github?.projects ?? [];

  // Database data - default to empty arrays (fresh database state)
  const databaseData = {
    columns: data.database?.columns ?? [],
    projects: data.database?.projects ?? [],
    labels: data.database?.labels ?? [],
    project_labels: data.database?.project_labels ?? []
  };

  // Initialize all clients
  initializeMockDataAuth(fullSession);
  initializeMockDataGitHub(githubProjects);
  initializeMockDataDatabase(databaseData);
}

/**
 * Sets up mock mode by reading mock data file and initializing all clients
 * Should be called once at app startup
 */
export async function setupMockMode(): Promise<void> {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const mockDataFile = urlParams.get('mock-data');

  // Only proceed if mock-data parameter exists and has a value
  if (mockDataFile && mockDataFile.trim()) {
    try {
      // Read mock data file using absolute path
      const mockDataModule = await import(/* @vite-ignore */ `${mockDataFile}.ts`);
      const mockData = mockDataModule.default || mockDataModule[Object.keys(mockDataModule)[0]];

      // Process and install mock data in all clients
      defineMockData(mockData);

    } catch (error) {
      console.error('Failed to setup mock mode:', error);
      throw error;
    }
  }
}
