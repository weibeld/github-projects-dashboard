import { writable, get } from 'svelte/store';
import type { RawGitHub, RawDatabase, RawColumn, RawProject, RawLabel, RawProjectLabel } from '../base/types';
import type { Writable } from 'svelte/store';

//==============================================================================
// INTERNAL TYPES
//==============================================================================

interface DataStore {
  github: Writable<RawGitHub[]>;
  database: {
    columns: Writable<RawColumn[]>;
    projects: Writable<RawProject[]>;
    labels: Writable<RawLabel[]>;
    project_labels: Writable<RawProjectLabel[]>;
  };
}

//==============================================================================
// PRIVATE DATA STORE - Not exposed directly
//==============================================================================

const dataStore: DataStore = {
  github: writable<RawGitHub[]>([]),
  database: {
    columns: writable<RawColumn[]>([]),
    projects: writable<RawProject[]>([]),
    labels: writable<RawLabel[]>([]),
    project_labels: writable<RawProjectLabel[]>([])
  }
};

//==============================================================================
// PUBLIC API - For manipulating data store
//==============================================================================

export const dataStoreInit = (data: { github: RawGitHub[]; database: RawDatabase; }): void => {
  dataStore.github.set(data.github);
  dataStore.database.columns.set(data.database.columns);
  dataStore.database.projects.set(data.database.projects);
  dataStore.database.labels.set(data.database.labels);
  dataStore.database.project_labels.set(data.database.projectLabels);
};

export const dataStoreClear = (): void => {
  dataStore.github.set([]);
  dataStore.database.columns.set([]);
  dataStore.database.projects.set([]);
  dataStore.database.labels.set([]);
  dataStore.database.project_labels.set([]);
};

// Used for defining uiData with derived() (order doesn't matter)
export const dataStoreGatherStores = () => [
  dataStore.github,
  dataStore.database.columns,
  dataStore.database.projects,
  dataStore.database.labels,
  dataStore.database.project_labels
];

// GitHub Projects (setter can be used when refetching data from GitHub)
export const dataStoreGetGitHub = (): RawGitHub[] => get(dataStore.github);
export const dataStoreSetGitHub = (github: RawGitHub[]): void => dataStore.github.set(github);

// Database Columns
export const dataStoreGetColumns = (): RawColumn[] => get(dataStore.database.columns);
export const dataStoreSetColumns = (columns: RawColumn[]): void => dataStore.database.columns.set(columns);

// Database Projects
export const dataStoreGetProjects = (): RawProject[] => get(dataStore.database.projects);
export const dataStoreSetProjects = (projects: RawProject[]): void => dataStore.database.projects.set(projects);

// Database Labels
export const dataStoreGetLabels = (): RawLabel[] => get(dataStore.database.labels);
export const dataStoreSetLabels = (labels: RawLabel[]): void => dataStore.database.labels.set(labels);

// Database Project Labels
export const dataStoreGetProjectLabels = (): RawProjectLabel[] => get(dataStore.database.project_labels);
export const dataStoreSetProjectLabels = (projectLabels: RawProjectLabel[]): void => dataStore.database.project_labels.set(projectLabels);
