import { writable, get } from 'svelte/store';
import { type SortKey, type SortDirection, type LabelColor } from './commonTypes';

/*----------------------------------------------------------------------------*
 * Types
 *----------------------------------------------------------------------------*/

export type ProjectId = string;
type NumericId = number;
export type StatusId = NumericId;
export type LabelId = NumericId;
export type ViewId = NumericId;

export interface Project {
  id: ProjectId;
  statusId: number;
  labelIds: Set<number>;
}

export interface Status {
  id: StatusId;
  title: string;
}

export interface Label {
  id: LabelId;
  title: string;
  color: LabelColor;
}

export interface View {
  id: ViewId;
  title: string;
  query: string;
  statusConfigs: Record<StatusId, {
    visible: boolean;
    sortKey: SortKey;
    sortDirection: SortDirection;
  }>;
}

export interface AppData {
  // Unordered data
  projects: Record<ProjectId, Project>;
  labels: Record<LabelId, Label>;
  // Ordered data
  statuses: Status[];
  views: View[];
}

/*----------------------------------------------------------------------------*
 * Instance
 *----------------------------------------------------------------------------*/

const DEFAULT_STATUS_ID: StatusId = 0;

export const appData = writable<AppData>({
  projects: {},
  statuses: [{ id: DEFAULT_STATUS_ID, title: 'Default' }],
  labels: [],
  views: [],
});

/*----------------------------------------------------------------------------*
 * Private helper functions
 *----------------------------------------------------------------------------*/

function getNewLabelId(): LabelId {
  return Math.max(0, ...Object.keys(get(appData).labels).map(Number)) + 1;
  //const data = get(appData);
  //return Math.max(0, ...data.statuses.map(s => s.id)) + 1;
}
function getNewStatusId(): StatusId {
  return Math.max(0, ...get(appData).statuses.map(s => s.id)) + 1;
}
function getNewViewId(): ViewId {
  return Math.max(0, ...get(appData).views.map(v => v.id)) + 1;
}

// Return a title of the form "Untitled" or "Untitled X" as follows:
//   1. If no other view with title "Untitled" exists, return "Untitled"
//   2. If another view with title "Untitled" exists, return "Untitled 2"
//   3. If another view with title "Untitled X" exists, return "Untitled X+1"k
function getNewViewTitle(): string {
  const base = 'Untitled';
  const existing = get(appData).views.map(v => v.title);
  if (!existing.includes(base)) return base;
  let i = 2;
  while (existing.includes(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}

// Add a default status config for a given status to a given view. The default
// status config has visible: true, sortKey: 'updated', sortDirection: 'desc'.
function addDefaultViewStatusConfig(viewId: ViewId, statusId: StatusId) {
  appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view) {
      view.statusConfigs[statusId] = {
        visible: true,
        sortKey: 'updated',
        sortDirection: 'desc'
      };
    }
    return data;
  });
}

/*----------------------------------------------------------------------------*
 * Query functions
 *----------------------------------------------------------------------------*/

export function isLabelTitleUnique(title: string) {
  return !Object.values(get(appData).labels).some(l => l.title === title);
}

export function isStatusTitleUnique(title: string) {
  return !get(appData).statuses.some(s => s.title === title);
}

export function isViewTitleUnique(title: string) {
  return !get(appData).views.some(v => v.title === title);
}

/*----------------------------------------------------------------------------*
 * Project functions
 *----------------------------------------------------------------------------*/

// 1. Assign Default status and empty set of labels to new projects
export function createProject(projectId: ProjectId) {
  appData.update(data => {
    data.projects[projectId] = { id: projectId, statusId: DEFAULT_STATUS_ID, labelIds: new Set() };
    return data;
  });
}

export function setProjectStatus(projectId: ProjectId, statusId: StatusId) {
  appData.update(data => {
    const project = data.projects[projectId];
    if (project) project.statusId = statusId;
    return data;
  });
}

export function addProjectLabel(projectId: ProjectId, labelId: LabelId) {
  appData.update(data => {
    data.projects[projectId].labelIds.add(labelId);
    // TODO: use below if no reactive update in UI
    /*const newLabelSet = new Set(data.projects[projectId].labelIds);
    newLabelSet.add(labelId);
    data.projects[projectId].labelIds = newLabelSet;*/
    return data;
  });
}

export function deleteProjectLabel(projectId: ProjectId, labelId: LabelId) {
  appData.update(data => {
    data.projects[projectId].labelIds.delete(labelId);
    // TODO: use below if no reactive update in UI
    /*const newLabelSet = new Set(data.projects[projectId].labelIds);
    newLabelSet.delete(labelId);
    data.projects[projectId].labelIds = newLabelSet;*/
    return data;
  });
}

export function deleteProject(projectId: ProjectId) {
  appData.update(data => {
    delete data.projects[projectId];
    return data;
  });
}

export function getProjectIds(): ProjectId[] {
  return Object.keys(get(appData).projects);
}

/*----------------------------------------------------------------------------*
 * Label manipulation functions
 *----------------------------------------------------------------------------*/

// 1. Ensure that label title is unique
export function createLabel(title: string, color: LabelColor) {
  appData.update(data => {
    if (Object.values(data.labels).some(l => l.title === title)) return data;
    const id = getNewLabelId();
    data.labels[id] = { id, title, color };
    return data;
  });
}

// 1. Ensure that label title is unique
export function setLabelTitle(labelId: LabelId, title: string) {
  appData.update(data => {
    if (Object.values(data.labels).some(l => l.title === title)) return data;
    const label = data.labels[labelId];
    if (label) label.title = title;
    return data;
  });
}

export function setLabelColor(labelId: LabelId, color: LabelColor) {
  appData.update(data => {
    const label = data.labels[labelId];
    if (label) label.color = color;
    return data;
  });
}

// 1. Call 'deleteProjectLabel()' for the deleted label on all projects that have this label
export function deleteLabel(labelId: LabelId) {
  appData.update(data => {
    delete data.labels[labelId];
    for (const projectId in data.projects) {
      deleteProjectLabel(projectId, labelId);
    }
    return data;
  });
}

/*----------------------------------------------------------------------------*
 * Status manipulation functions
 *----------------------------------------------------------------------------*/

// 1. Ensure that status title is unique
// 2. Add status to end of ordered status list
// 3. Call 'addViewStatusConfig()' for the created status on all views
export function createStatus(title: string) {
  appData.update(data => {
    if (data.statuses.some(s => s.title === title)) return data;
    const statusId = getNewStatusId();
    data.statuses.push({ statusId, title });
    for (const view of data.views) {
      addDefaultViewStatusConfig(viewId = view.id, statusId);
    }
    return data;
  });
}

// 1. Ensure that status title is unique
export function setStatusTitle(statusId: StatusId, title: string) {
  appData.update(data => {
    if (data.statuses.some(s => s.title === title)) return data;
    const status = data.statuses.find(s => s.id === statusId);
    if (status) status.title = title;
    return data;
  });
}

export function moveStatus(statusId: StatusId, index: number) {
  appData.update(data => {
    const curIndex = data.statuses.findIndex(s => s.id === statusId);
    if (curIndex === -1 || index < 0 || index >= data.statuses.length) return data;
    // Remove element from array and save in 'statusToMove'
    const [statusToMove] = data.statuses.splice(curIndex, 1);
    // Insert element at desired index (shift other elements if necessary)
    data.statuses.splice(index, 0, statusToMove);
    return data;
  });
}

// 1. Ensure that 'statusId' is not 0 (which is the "Default" status that can't be deleted)
// 2. Recompact ordered status list
// 3. Assign the "Default" status to all projects that have the deleted status by calling 'setProjectStatus(statusId = 0, ...)' for these projects
// 4. Call 'deleteViewStatusConfig()' for the deleted status on all views
export function deleteStatus(statusId: StatusId) {
  if (statusId === DEFAULT_STATUS_ID) return;
  appData.update(data => {
    data.statuses = data.statuses.filter(s => s.id !== statusId);
    for (const projectId in data.projects) {
      if (data.projects[projectId].statusId === statusId) {
        data.projects[projectId].statusId = DEFAULT_STATUS_ID;
      }
    }
    for (const view of data.views) {
      delete view.statusConfigs[statusId];
    }
    return data;
  });
}



/*----------------------------------------------------------------------------*
 * View manipulation functions
 *----------------------------------------------------------------------------*/

// 1. Get a unique new view title by calling 'getNewViewTitle()'
// 2. Create the view with an empty statusConfigs
// 3. Add the new view to the back of the ordered list of views
// 4. Add default status configs to the view by calling 'addViewStatusConfig()' on the view for every status
export function createView(query: string = '') {
  appData.update(data => {
    const id = getNewViewId();
    const title = getNewViewTitle();
    const view: View = { id, title, query, statusConfigs: {} };
    data.views.push(view);
    for (const status of data.statuses) {
      addDefaultViewStatusConfig(view.id, status.id);
    }
    return data;
  });
}

// 1. Ensure that the view title is unique
export function setViewTitle(viewId: ViewId, title: string) {
  appData.update(data => {
    if (data.views.some(v => v.title === title)) return data;
    const view = data.views.find(v => v.id === viewId);
    if (view) view.title = title;
    return data;
  });
}


export function setViewQuery(viewId: ViewId, query: string) {
  appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view) view.query = query;
    return data;
  });
}

export function setViewStatusVisibility(viewId: ViewId, statusId: StatusId, visibility: boolean) {
  appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.statusConfigs[statusId]) {
      view.statusConfigs[statusId].visible = visibility;
    }
    return data;
  });
}

export function setViewStatusSortKey(viewId: ViewId, statusId: StatusId, sortKey: SortKey) {
  appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.statusConfigs[statusId]) {
      view.statusConfigs[statusId].sortKey = sortKey;
    }
    return data;
  });
}

export function setViewStatusSortDirection(viewId: ViewId, statusId: StatusId, sortDirection: SortDirection) {
  appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.statusConfigs[statusId]) {
      view.statusConfigs[statusId].sortDirection = sortDirection;
    }
    return data;
  });
}

export function moveView(viewId: ViewId, index: number) {
  appData.update(data => {
    const curIndex = data.views.findIndex(v => v.id === viewId);
    if (curIndex === -1 || index < 0 || index >= data.views.length) return data;
    // Remove element from array and save in 'viewToMove'
    const [viewtoMove] = data.views.splice(curIndex, 1);
    // Insert element at desired index (shift other elements if necessary)
    data.views.splice(index, 0, viewToMove);
    return data;
  });
}

// 1. Prevent deletion if this is the last view
export function deleteView(viewId: ViewId) {
  appData.update(data => {
    if (data.views.length <= 1) return data;
    data.views = data.views.filter(v => v.id !== viewId);
    return data;
  });
}
