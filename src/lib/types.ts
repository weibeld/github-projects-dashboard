/* ID types */
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
  colorCssClass: string;
}

export type SortKey = 'updated' | 'created' | 'title' | 'items';
export type SortDirection = 'asc' | 'desc';
export interface View {
  id: ViewId;
  title: string;
  query: string;
  statusConfigs: Record<StatusId, {
    visible: boolean;
    // TODO: rename to sortKey
    sortBy: SortKey;
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
