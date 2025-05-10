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
