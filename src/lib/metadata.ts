import { writable, get, readonly } from 'svelte/store';
import { logFnArgs, logFnReturn, logStore } from './log';
import type {
  ProjectId,
  MetaStatusId, MetaLabelId, MetaViewId,
  MetaSortKey, MetaSortDirection, 
  MetaLabelColor,
  MetaColumnConfig,
  MetaProject, MetaLabel, MetaStatus, MetaView,
  MetaProjects, MetaLabels, MetaStatuses, MetaViews,
  Metadata
} from './commonTypes';
import { MetaSortKeyVals, MetaSortDirectionVals, MetaLabelColorVals } from './commonTypes';

const DEFAULT_STATUS_ID: MetaStatusId = 0;
const DEFAULT_NEW_VIEW_TITLE: string = 'Untitled';

/* Default column config for new statuses or views */
function getDefaultColumnConfig(): MetaColumnConfig {
  return {
    visible: true,
    sortKey: MetaSortKeyVals.UpdatedAt,
    sortDirection: MetaSortDirectionVals.Desc
  };
}

/* Default value for 'metadata' store */
function getDefaultMetadata(): Metadata {
  const projects: MetaProjects = {};
  const labels: MetaLabels = {};
  const statuses: MetaStatuses = [
    {
      id: DEFAULT_STATUS_ID,
      title: 'Default',
    }
  ];
  const views: MetaViews = [
    {
      id: 1,
      title: DEFAULT_NEW_VIEW_TITLE,
      query: '',
      columnConfigs: {
        [DEFAULT_STATUS_ID]: getDefaultColumnConfig()
      }
    }
  ]
  return {
    projects: projects,
    labels: labels,
    statuses: statuses,
    views: views,
  };
}

const _metadata = writable<Metadata>(getDefaultMetadata());
export const metadata = readonly(_metadata);
logStore(metadata, 'metadata');

// TODO: create function for getting a project, status, label or view by ID

/*----------------------------------------------------------------------------*
 * Private helper functions
 *----------------------------------------------------------------------------*/

function getNewLabelId(): MetaLabelId {
  logFnArgs('getNewLabelId', { });
  return logFnReturn('getNewLabelId', Math.max(0, ...Object.keys(get(_metadata).labels).map(Number)) + 1);
  //const data = get(_metadata);
  //return Math.max(0, ...data.statuses.map(s => s.id)) + 1;
}
function getNewStatusId(): MetaStatusId {
  logFnArgs('getNewStatusId', { });
  return logFnReturn('getNewStatusId', Math.max(0, ...get(_metadata).statuses.map(s => s.id)) + 1);
}
function getNewViewId(): MetaViewId {
  logFnArgs('getNewViewId', { });
  return logFnReturn('getNewViewId', Math.max(0, ...get(_metadata).views.map(v => v.id)) + 1);
}

// Return a title of the form "Untitled" or "Untitled X" as follows:
//   1. If no other view with title "Untitled" exists, return "Untitled"
//   2. If another view with title "Untitled" exists, return "Untitled 2"
//   3. If another view with title "Untitled X" exists, return "Untitled X+1"k
function getNewViewTitle(): string {
  logFnArgs('getNewViewTitle', { });
  const base = DEFAULT_NEW_VIEW_TITLE;
  const existing = get(_metadata).views.map(v => v.title);
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
function addDefaultColumnConfigForStatusToView(viewId: MetaViewId, statusId: MetaStatusId): void {
  logFnArgs('addDefaultColumnConfigForStatusToView', { viewId, statusId });
  _metadata.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view) view.columnConfigs[statusId] = getDefaultColumnConfig();
    return data;
  });
}

function isLabelTitleUnique(title: string): boolean {
  return !Object.values(get(_metadata).labels).some(l => l.title === title);
}

function isStatusTitleUnique(title: string): boolean {
  return !get(_metadata).statuses.some(s => s.title === title);
}

function isViewTitleUnique(title: string): boolean {
  return !get(_metadata).views.some(v => v.title === title);
}

/*----------------------------------------------------------------------------*
 * Project functions
 *----------------------------------------------------------------------------*/

// 1. Assign Default status and empty set of labels to new projects
export function createMetaProject(projectId: ProjectId) {
  logFnArgs('createMetaProject', { projectId });
  _metadata.update(data => {
    data.projects[projectId] = { id: projectId, statusId: DEFAULT_STATUS_ID, labelIds: new Set() };
    return data;
  });
}

export function setMetaProjectStatus(projectId: ProjectId, statusId: MetaStatusId) {
  logFnArgs('setMetaProjectStatus', { projectId, statusId });
  _metadata.update(data => {
    const project = data.projects[projectId];
    if (project) project.statusId = statusId;
    return data;
  });
}

export function addMetaProjectLabel(projectId: ProjectId, labelId: MetaLabelId) {
  logFnArgs('addMetaProjectLabel', { projectId, labelId });
  _metadata.update(data => {
    data.projects[projectId].labelIds.add(labelId);
    // TODO: use below if no reactive update in UI
    /*const newLabelSet = new Set(data.projects[projectId].labelIds);
    newLabelSet.add(labelId);
    data.projects[projectId].labelIds = newLabelSet;*/
    return data;
  });
}

export function deleteMetaProjectLabel(projectId: ProjectId, labelId: MetaLabelId) {
  logFnArgs('deleteMetaProjectLabel', { projectId, labelId });
  _metadata.update(data => {
    data.projects[projectId].labelIds.delete(labelId);
    // TODO: use below if no reactive update in UI
    /*const newLabelSet = new Set(data.projects[projectId].labelIds);
    newLabelSet.delete(labelId);
    data.projects[projectId].labelIds = newLabelSet;*/
    return data;
  });
}

export function deleteMetaProject(projectId: ProjectId) {
  logFnArgs('deleteMetaProject', { projectId });
  _metadata.update(data => {
    delete data.projects[projectId];
    return data;
  });
}

export function getMetaProjectIds(): ProjectId[] {
  logFnArgs('getMetaProjectIds', { });
  return logFnReturn('getMetaProjectIds', Object.keys(get(_metadata).projects));
}

/*----------------------------------------------------------------------------*
 * Label manipulation functions
 *----------------------------------------------------------------------------*/

// 1. Ensure that label title is unique
export function createMetaLabel(title: string, color: MetaLabelColor) {
  logFnArgs('createMetaLabel', { title, color });
  _metadata.update(data => {
    if (Object.values(data.labels).some(l => l.title === title)) return data;
    const id = getNewLabelId();
    data.labels[id] = { id, title, color };
    return data;
  });
}

// 1. Ensure that label title is unique
export function setMetaLabelTitle(labelId: MetaLabelId, title: string) {
  logFnArgs('setMetaLabelTitle', { labelId, title });
  _metadata.update(data => {
    if (Object.values(data.labels).some(l => l.title === title)) return data;
    const label = data.labels[labelId];
    if (label) label.title = title;
    return data;
  });
}

export function setMetaLabelColor(labelId: MetaLabelId, color: MetaLabelColor) {
  logFnArgs('setMetaLabelColor', { labelId, color });
  _metadata.update(data => {
    const label = data.labels[labelId];
    if (label) label.color = color;
    return data;
  });
}

// 1. Call 'deleteMetaProjectLabel()' for the deleted label on all projects that have this label
export function deleteMetaLabel(labelId: MetaLabelId) {
  logFnArgs('deleteMetaLabel', { labelId });
  _metadata.update(data => {
    delete data.labels[labelId];
    for (const projectId in data.projects) {
      deleteMetaProjectLabel(projectId, labelId);
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
export function createMetaStatus(title: string) {
  logFnArgs('createMetaStatus', { title });
  _metadata.update(data => {
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
export function setMetaStatusTitle(statusId: MetaStatusId, title: string) {
  logFnArgs('setMetaStatusTitle', { statusId, title });
  _metadata.update(data => {
    if (data.statuses.some(s => s.title === title)) return data;
    const status = data.statuses.find(s => s.id === statusId);
    if (status) status.title = title;
    return data;
  });
}

export function reorderMetaStatus(statusId: MetaStatusId, newIndex: number) {
  logFnArgs('reorderMetaStatus', { statusId, newIndex });
  _metadata.update(data => {
    const curIndex = data.statuses.findIndex(s => s.id === statusId);
    if (curIndex === -1 || newIndex < 0 || newIndex >= data.statuses.length) return data;
    // Remove element from array and save in 'statusToMove'
    const [statusToMove] = data.statuses.splice(curIndex, 1);
    // Insert element at desired index (shift other elements if necessary)
    data.statuses.splice(newIndex, 0, statusToMove);
    return data;
  });
}

// 1. Ensure that 'statusId' is not 0 (which is the "Default" status that can't be deleted)
// 2. Recompact ordered status list
// 3. Assign the "Default" status to all projects that have the deleted status by calling 'setMetaProjectStatus(statusId = 0, ...)' for these projects
// 4. Call 'deleteViewStatusConfig()' for the deleted status on all views
export function deleteMetaStatus(statusId: MetaStatusId) {
  logFnArgs('deleteMetaStatus', { statusId });
  if (statusId === DEFAULT_STATUS_ID) return;
  _metadata.update(data => {
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
export function createMetaView(query: string = '') {
  logFnArgs('createMetaView', { query });
  _metadata.update(data => {
    const id = getNewViewId();
    const title = getNewViewTitle();
    const view: MetaView = { id, title, query, columnConfigs: {} };
    data.views.push(view);
    for (const status of data.statuses) {
      addDefaultColumnConfigForStatusToView(view.id, status.id);
    }
    return data;
  });
}

// 1. Ensure that the view title is unique
export function setMetaViewTitle(viewId: MetaViewId, title: string) {
  logFnArgs('setMetaViewTitle', { viewId, title });
  _metadata.update(data => {
    if (data.views.some(v => v.title === title)) return data;
    const view = data.views.find(v => v.id === viewId);
    if (view) view.title = title;
    return data;
  });
}


export function setMetaViewQuery(viewId: MetaViewId, query: string) {
  logFnArgs('setMetaViewQuery', { viewId, query });
  _metadata.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view) view.query = query;
    return data;
  });
}

export function setColumnVisibility(viewId: MetaViewId, statusId: MetaStatusId, visibility: boolean) {
  logFnArgs('setColumnVisibility', { viewId, statusId, visibility });
  _metadata.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.columnConfigs[statusId]) {
      view.columnConfigs[statusId].visible = visibility;
    }
    return data;
  });
}

export function setColumnSortKey(viewId: MetaViewId, statusId: MetaStatusId, sortKey: MetaSortKey) {
  logFnArgs('setColumnSortKey', { viewId, statusId, sortKey });
  _metadata.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.columnConfigs[statusId]) {
      view.columnConfigs[statusId].sortKey = sortKey;
    }
    return data;
  });
}

export function setColumnSortDirection(viewId: MetaViewId, statusId: MetaStatusId, sortDirection: MetaSortDirection) {
  logFnArgs('setColumnSortDirection', { viewId, statusId, sortDirection });
  _metadata.update(data => {
    const view = data.views.find(v => v.id === viewId);
    if (view && view.columnConfigs[statusId]) {
      view.columnConfigs[statusId].sortDirection = sortDirection;
    }
    return data;
  });
}

export function reorderMetaView(viewId: MetaViewId, index: number) {
  logFnArgs('reorderMetaView', { viewId, index });
  _metadata.update(data => {
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
export function deleteMetaView(viewId: MetaViewId) {
  logFnArgs('deleteMetaView', { viewId });
  _metadata.update(data => {
    if (data.views.length <= 1) return data;
    data.views = data.views.filter(v => v.id !== viewId);
    return data;
  });
}
