//==============================================================================
// UI DATA LAYER - Transform raw data store into UI-optimized structures
//==============================================================================

import { derived } from 'svelte/store';
import { dataStoreGetGitHub, dataStoreGetColumns, dataStoreGetProjects, dataStoreGetLabels, dataStoreGetProjectLabels, dataStoreGatherStores } from './dataStore';

//==============================================================================
// UI DATA TYPES
//==============================================================================

export interface UiData {
  columns: UiColumn[];
}

export interface UiColumn {
  id: string;
  title: string;
  position: number;
  type: string; // Column type: managed by business layer
  sortField: string;
  sortDirection: string;
  projects: UiProject[];
}

export interface UiProject {
  id: string;
  title: string;
  number: number;
  updatedAt: Date;
  closedAt?: Date;
  createdAt: Date;
  items: number;
  url: string;
  labels: UiLabel[];
}

export interface UiLabel {
  id: string;
  title: string;
  color: string;
  textColor: string;
}

export const uiData = derived(dataStoreGatherStores(), () => buildUiData());

function buildUiData(): UiData {

  // Create simple lookup: project ID → column ID
  const projects = dataStoreGetProjects();
  const projectColumnMap: Record<string, string> = {};
  for (const dbProject of projects) {
    projectColumnMap[dbProject.id] = dbProject.columnId;
  }

  // Create labels lookup map
  const labels = dataStoreGetLabels();
  const labelsMap: Record<string, UiLabel> = {};
  for (const label of labels) {
    labelsMap[label.id] = {
      id: label.id,
      title: label.title,
      color: label.color,
      textColor: label.textColor
    };
  }

  // Create project-labels lookup
  const projectLabels = dataStoreGetProjectLabels();
  const projectLabelsMap: Record<string, string[]> = {};
  for (const rel of projectLabels) {
    if (!projectLabelsMap[rel.projectId]) {
      projectLabelsMap[rel.projectId] = [];
    }
    projectLabelsMap[rel.projectId].push(rel.labelId);
  }

  // Get GitHub data and build columns
  const github = dataStoreGetGitHub();
  const columns = dataStoreGetColumns();
  const columnsWithProjects: UiColumn[] = columns
    .sort((a, b) => a.position - b.position)
    .map(column => {
      // Get GitHub projects that belong to this column
      const columnProjects: UiProject[] = github
        .filter(ghProject => projectColumnMap[ghProject.id] === column.id)
        .map(ghProject => {
          // Get labels for this project
          const labelIds = projectLabelsMap[ghProject.id] || [];
          const projectLabels = labelIds
            .map(labelId => labelsMap[labelId])
            .filter(Boolean);

          return {
            // All data comes from GitHub
            id: ghProject.id,
            title: ghProject.title,
            number: ghProject.number,
            updatedAt: ghProject.updatedAt,
            closedAt: ghProject.closedAt,
            createdAt: ghProject.createdAt,
            items: ghProject.items,
            url: ghProject.url,

            // Denormalized labels
            labels: projectLabels
          } as UiProject;
        })
        .sort((a, b) => compareProjectsBy(a, b, column.sortField, column.sortDirection));

      return {
        id: column.id,
        title: column.title,
        position: column.position,
        type: column.type,
        sortField: column.sortField,
        sortDirection: column.sortDirection,
        projects: columnProjects
      };
    });

  return {
    columns: columnsWithProjects
  };
}

function compareProjectsBy(a: UiProject, b: UiProject, sortField: string, sortDirection: string): number {

  let valueA: any;
  let valueB: any;

  switch (sortField) {
    case 'title':
      valueA = a.title.toLowerCase();
      valueB = b.title.toLowerCase();
      break;
    case 'number':
      valueA = a.number;
      valueB = b.number;
      break;
    case 'items':
      valueA = a.items;
      valueB = b.items;
      break;
    case 'updatedAt':
      valueA = a.updatedAt.getTime();
      valueB = b.updatedAt.getTime();
      break;
    case 'closedAt':
      valueA = a.closedAt?.getTime() || 0;
      valueB = b.closedAt?.getTime() || 0;
      break;
    case 'createdAt':
      valueA = a.createdAt.getTime();
      valueB = b.createdAt.getTime();
      break;
    default:
      return 0;
  }

  // Handle string comparison
  if (typeof valueA === 'string' && typeof valueB === 'string') {
    const comparison = valueA.localeCompare(valueB);
    return sortDirection === 'asc' ? comparison : -comparison;
  }

  // Handle numeric comparison
  if (sortDirection === 'asc') {
    return valueA - valueB;
  } else {
    return valueB - valueA;
  }
}
