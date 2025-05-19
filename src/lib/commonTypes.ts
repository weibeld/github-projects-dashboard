export type ProjectID = string;

export const SortKeyValues = {
  UpdatedAt: 'updatedAt',
  CreatedAt: 'createdAt',
  Title: 'title',
  NumberOfItems: 'numberOfItems',
} as const;
export type SortKey = (typeof SortKeyValues)[keyof typeof SortKeyValues];

export const SortDirectionValues = {
  Ascending: 'ascending',
  Descending: 'descending',
} as const;
export type SortDirection = (typeof SortDirectionValues)[keyof typeof SortDirectionValues];

/* Label colours CSS class names (definitions in tailwind.config.js) */
export const LabelColorValues = {
  LabelColor1: 'bg-labelColor1',
  LabelColor2: 'bg-labelColor2',
  LabelColor3: 'bg-labelColor3',
  LabelColor4: 'bg-labelColor4',
  LabelColor5: 'bg-labelColor5',
  LabelColor6: 'bg-labelColor6',
  LabelColor7: 'bg-labelColor7',
  LabelColor8: 'bg-labelColor8',
} as const;
export type LabelColor = (typeof LabelColorValues)[keyof typeof LabelColorValues];
