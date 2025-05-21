export type ProjectId = string;

/*----------------------------------------------------------------------------*
 * Metadata types
 *----------------------------------------------------------------------------*/

export type MetaStatusId = number;
export type MetaLabelId = number;
export type MetaViewId = number;

export const MetaSortKeyVals = {
  UpdatedAt: 'updatedAt',
  CreatedAt: 'createdAt',
  Title: 'title',
  NumberOfItems: 'numberOfItems',
} as const;
export type MetaSortKey = (typeof MetaSortKeyVals)[keyof typeof MetaSortKeyVals];

export const MetaSortDirectionVals = {
  Asc: 'asc',
  Desc: 'desc',
} as const;
export type MetaSortDirection = (typeof MetaSortDirectionVals)[keyof typeof MetaSortDirectionVals];

/* MetaLabel colours CSS class names (definitions in tailwind.config.js) */
export const MetaLabelColorVals = {
  Color1: 'bg-labelColor1',
  Color2: 'bg-labelColor2',
  Color3: 'bg-labelColor3',
  Color4: 'bg-labelColor4',
  Color5: 'bg-labelColor5',
  Color6: 'bg-labelColor6',
  Color7: 'bg-labelColor7',
  Color8: 'bg-labelColor8',
} as const;
export type MetaLabelColor = (typeof MetaLabelColorVals)[keyof typeof MetaLabelColorVals];

export type MetaColumnConfig = {
  visible: boolean;
  sortKey: MetaSortKey;
  sortDirection: MetaSortDirection;
}

export interface MetaProject {
  id: ProjectId;
  statusId: MetaStatusId;
  labelIds: Set<MetaLabelId>;
}

export interface MetaStatus {
  id: MetaStatusId;
  title: string;
}

export interface MetaLabel {
  id: MetaLabelId;
  title: string;
  color: LabelColor;
}

export interface MetaView {
  id: MetaViewId;
  title: string;
  query: string;
  columnConfigs: Record<MetaStatusId, MetaColumnConfig>;
}

export type MetaProjects = Record<ProjectId, MetaProject>;
export type MetaLabels = Record<MetaLabelId, MetaLabel>;
export type MetaStatuses = MetaStatus[]; // Ordered
export type MetaViews = MetaView[];  // Ordered

export interface Metadata {
  projects: MetaProjects;
  labels: MetaLabels;
  statuses: MetaStatuses;
  views: MetaViews;
}
