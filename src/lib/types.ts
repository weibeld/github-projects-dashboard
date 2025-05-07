// ID types
export type ProjectId = string;
export type StatusId = string;
export type LabelId = string;
export type ViewId = string;

// Label color type
export type LabelColor = `#${string}` | `bg-${string}`;

// Project
export interface Project {
  id: ProjectId;
  statusId: StatusId | null;
  labelIds: LabelId[];
  isNew: boolean;
}

// Status
export interface Status {
  id: StatusId;
  name: string;
}

// Label
export interface Label {
  id: LabelId;
  name: string;
  color: LabelColor;
}

// View
export interface View {
  id: ViewId;
  name: string;

  // Which statuses are shown in this view
  statusVisibility: Record<StatusId, boolean>;

  // Ordered project IDs within each status
  projectOrderByStatus: Record<StatusId, ProjectId[]>;

  // Placeholder for view-specific filters or queries
  query: string;
}

// Root data model
export interface AppData {
  projects: Record<ProjectId, Project>;
  labels: Record<LabelId, Label>;
  statuses: Status[]; // Global ordered list of statuses
  views: View[];      // Global ordered list of views
}
