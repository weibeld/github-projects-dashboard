import { writable, get, readonly } from 'svelte/store';
import { logFnArgs, logFnReturn, logStore } from './log';
import type { ProjectID, SortKey, SortDirection, LabelColor } from './commonTypes';

/*----------------------------------------------------------------------------*
 * Types
 *----------------------------------------------------------------------------*/

// TODO: also move to commonTypes.ts?
type NumericId = number;
export type StatusId = NumericId;
export type LabelId = NumericId;
export type ViewId = NumericId;

type ColumnConfig = {
  visible: boolean;
  sortKey: SortKey;
  sortDirection: SortDirection;
}

function getColumnConfigDefault(): ColumnConfig {
  return {
    visible: true,
    sortKey: 'updatedAt',
    sortDirection: 'descending'
  };
}

function getAppDataDefault(): AppData {
  return {
    projects: {},
    statuses: [{ id: DEFAULT_STATUS_ID, title: DEFAULT_STATUS_TITLE }],
    labels: [],
    views: [],
  };
}

const DEFAULT_STATUS_ID: StatusId = 0;
const DEFAULT_STATUS_TITLE: string = 'Default';

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
  columnConfigs: Record<StatusId, ColumnConfig>;
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

const _appData = writable<AppData>(getAppDataDefault());
export const appData = readonly(_appData);
logStore(appData, 'appData');

// TODO: create function for getting a project, status, label or view by ID

/*----------------------------------------------------------------------------*
 * Private helper functions
 *----------------------------------------------------------------------------*/

function getNewLabelId(): LabelId {
  logFnArgs('getNewLabelId', { });
  return logFnReturn('getNewLabelId', Math.max(0, ...Object.keys(get(_appData).labels).map(Number)) + 1);
  //const data = get(_appData);
  //return Math.max(0, ...data.statuses.map(s => s.id)) + 1;
}
function getNewStatusId(): StatusId {
  logFnArgs('getNewStatusId', { });
  return logFnReturn('getNewStatusId', Math.max(0, ...get(_appData).statuses.map(s => s.id)) + 1);
}
function getNewViewId(): ViewId {
  logFnArgs('getNewViewId', { });
  return logFnReturn('getNewViewId', Math.max(0, ...get(_appData).views.map(v => v.id)) + 1);
}

// Return a title of the form "Untitled" or "Untitled X" as follows:
//   1. If no other view with title "Untitled" exists, return "Untitled"
//   2. If another view with title "Untitled" exists, return "Untitled 2"
//   3. If another view with title "Untitled X" exists, return "Untitled X+1"k
function getNewViewTitle(): string {
  logFnArgs('getNewViewTitle', { });
  const base = 'Untitled';
  const existing = get(_appData).views.map(v => v.title);
  if (!existing.includes(base)) {
    return logFnReturn('getNewViewTitle', base);
  }
  else {
    let i = 2;
    while (existing.includes(`${base} ${i}`)) i++;
    return logFnReturn('getNewViewTitle', `${base} ${i}`);
  }
}

// Add a default status config for a given status to a given view. The default
// status config has visible: true, sortKey: 'updated', sortDirection: 'desc'.
function addDefaultColumnConfigForStatusToView(viewId: ViewId, statusId: StatusId): void {
  logFnArgs('addDefaultColumnConfigForStatusToView', { viewId, statusId });
  _appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view) view.columnConfigs[statusId] = getColumnConfigDefault();
    return data;
  });
}

/*----------------------------------------------------------------------------*
 * Query functions
 *----------------------------------------------------------------------------*/

export function isLabelTitleUnique(title: string) {
  logFnArgs('isLabelTitleUnique', { title });
  return logFnReturn('isLabelTitleUnique', !Object.values(get(_appData).labels).some(l => l.title === title));
}

export function isStatusTitleUnique(title: string) {
  logFnArgs('isStatusTitleUnique', { title });
  return logFnReturn('isStatusTitleUnique', !get(_appData).statuses.some(s => s.title === title));
}

export function isViewTitleUnique(title: string) {
  logFnArgs('isViewTitleUnique', { title });
  return logFnReturn('isViewTitleUnique', !get(_appData).views.some(v => v.title === title));
}

/*----------------------------------------------------------------------------*
 * Project functions
 *----------------------------------------------------------------------------*/

// 1. Assign Default status and empty set of labels to new projects
export function createProject(projectId: ProjectId) {
  logFnArgs('createProject', { projectId });
  _appData.update(data => {
    data.projects[projectId] = { id: projectId, statusId: DEFAULT_STATUS_ID, labelIds: new Set() };
    return data;
  });
}

export function setProjectStatus(projectId: ProjectId, statusId: StatusId) {
  logFnArgs('setProjectStatus', { projectId, statusId });
  _appData.update(data => {
    const project = data.projects[projectId];
    if (project) project.statusId = statusId;
    return data;
  });
}

export function addProjectLabel(projectId: ProjectId, labelId: LabelId) {
  logFnArgs('addProjectLabel', { projectId, labelId });
  _appData.update(data => {
    data.projects[projectId].labelIds.add(labelId);
    // TODO: use below if no reactive update in UI
    /*const newLabelSet = new Set(data.projects[projectId].labelIds);
    newLabelSet.add(labelId);
    data.projects[projectId].labelIds = newLabelSet;*/
    return data;
  });
}

export function deleteProjectLabel(projectId: ProjectId, labelId: LabelId) {
  logFnArgs('deleteProjectLabel', { projectId, labelId });
  _appData.update(data => {
    data.projects[projectId].labelIds.delete(labelId);
    // TODO: use below if no reactive update in UI
    /*const newLabelSet = new Set(data.projects[projectId].labelIds);
    newLabelSet.delete(labelId);
    data.projects[projectId].labelIds = newLabelSet;*/
    return data;
  });
}

export function deleteProject(projectId: ProjectId) {
  logFnArgs('deleteProject', { projectId });
  _appData.update(data => {
    delete data.projects[projectId];
    return data;
  });
}

export function getProjectIds(): ProjectId[] {
  logFnArgs('getProjectIds', { });
  return logFnReturn('getProjectIds', Object.keys(get(_appData).projects));
}

/*----------------------------------------------------------------------------*
 * Label manipulation functions
 *----------------------------------------------------------------------------*/

// 1. Ensure that label title is unique
export function createLabel(title: string, color: LabelColor) {
  logFnArgs('createLabel', { title, color });
  _appData.update(data => {
    if (Object.values(data.labels).some(l => l.title === title)) return data;
    const id = getNewLabelId();
    data.labels[id] = { id, title, color };
    return data;
  });
}

// 1. Ensure that label title is unique
export function setLabelTitle(labelId: LabelId, title: string) {
  logFnArgs('setLabelTitle', { labelId, title });
  _appData.update(data => {
    if (Object.values(data.labels).some(l => l.title === title)) return data;
    const label = data.labels[labelId];
    if (label) label.title = title;
    return data;
  });
}

export function setLabelColor(labelId: LabelId, color: LabelColor) {
  logFnArgs('setLabelColor', { labelId, color });
  _appData.update(data => {
    const label = data.labels[labelId];
    if (label) label.color = color;
    return data;
  });
}

// 1. Call 'deleteProjectLabel()' for the deleted label on all projects that have this label
export function deleteLabel(labelId: LabelId) {
  logFnArgs('deleteLabel', { labelId });
  _appData.update(data => {
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
  logFnArgs('createStatus', { title });
  _appData.update(data => {
    if (data.statuses.some(s => s.title === title)) return data;
    const statusId = getNewStatusId();
    data.statuses.push({ statusId, title });
    for (const view of data.views) {
      addDefaultColumnConfigForStatusToView(viewId = view.id, statusId);
    }
    return data;
  });
}

// 1. Ensure that status title is unique
export function setStatusTitle(statusId: StatusId, title: string) {
  logFnArgs('setStatusTitle', { statusId, title });
  _appData.update(data => {
    if (data.statuses.some(s => s.title === title)) return data;
    const status = data.statuses.find(s => s.id === statusId);
    if (status) status.title = title;
    return data;
  });
}

export function moveStatus(statusId: StatusId, index: number) {
  logFnArgs('moveStatus', { statusId, index });
  _appData.update(data => {
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
  logFnArgs('deleteStatus', { statusId });
  if (statusId === DEFAULT_STATUS_ID) return;
  _appData.update(data => {
    data.statuses = data.statuses.filter(s => s.id !== statusId);
    for (const projectId in data.projects) {
      if (data.projects[projectId].statusId === statusId) {
        data.projects[projectId].statusId = DEFAULT_STATUS_ID;
      }
    }
    for (const view of data.views) {
      delete view.columnConfigs[statusId];
    }
    return data;
  });
}



/*----------------------------------------------------------------------------*
 * View manipulation functions
 *----------------------------------------------------------------------------*/

// 1. Get a unique new view title by calling 'getNewViewTitle()'
// 2. Create the view with an empty columnConfigs
// 3. Add the new view to the back of the ordered list of views
// 4. Add default status configs to the view by calling 'addViewStatusConfig()' on the view for every status
export function createView(query: string = '') {
  logFnArgs('createView', { query });
  _appData.update(data => {
    const id = getNewViewId();
    const title = getNewViewTitle();
    const view: View = { id, title, query, columnConfigs: {} };
    data.views.push(view);
    for (const status of data.statuses) {
      addDefaultColumnConfigForStatusToView(view.id, status.id);
    }
    return data;
  });
}

// 1. Ensure that the view title is unique
export function setViewTitle(viewId: ViewId, title: string) {
  logFnArgs('setViewTitle', { viewId, title });
  _appData.update(data => {
    if (data.views.some(v => v.title === title)) return data;
    const view = data.views.find(v => v.id === viewId);
    if (view) view.title = title;
    return data;
  });
}


export function setViewQuery(viewId: ViewId, query: string) {
  logFnArgs('setViewQuery', { viewId, query });
  _appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view) view.query = query;
    return data;
  });
}

export function setViewStatusVisibility(viewId: ViewId, statusId: StatusId, visibility: boolean) {
  logFnArgs('setViewStatusVisibility', { viewId, statusId, visibility });
  _appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.columnConfigs[statusId]) {
      view.columnConfigs[statusId].visible = visibility;
    }
    return data;
  });
}

export function setViewStatusSortKey(viewId: ViewId, statusId: StatusId, sortKey: SortKey) {
  logFnArgs('setViewStatusSortKey', { viewId, statusId, sortKey });
  _appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.columnConfigs[statusId]) {
      view.columnConfigs[statusId].sortKey = sortKey;
    }
    return data;
  });
}

export function setViewStatusSortDirection(viewId: ViewId, statusId: StatusId, sortDirection: SortDirection) {
  logFnArgs('setViewStatusSortDirection', { viewId, statusId, sortDirection });
  _appData.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.columnConfigs[statusId]) {
      view.columnConfigs[statusId].sortDirection = sortDirection;
    }
    return data;
  });
}

export function moveView(viewId: ViewId, index: number) {
  logFnArgs('moveView', { viewId, index });
  _appData.update(data => {
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
  logFnArgs('deleteView', { viewId });
  _appData.update(data => {
    if (data.views.length <= 1) return data;
    data.views = data.views.filter(v => v.id !== viewId);
    return data;
  });
}
