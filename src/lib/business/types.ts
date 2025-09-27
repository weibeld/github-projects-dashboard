// Business layer types (helper types)

// Sort fields
export const SORT_FIELD_TITLE = 'title';
export const SORT_FIELD_NUMBER = 'number';
export const SORT_FIELD_ITEMS = 'items';
export const SORT_FIELD_UPDATED_AT = 'updatedAt';
export const SORT_FIELD_CLOSED_AT = 'closedAt';
export const SORT_FIELD_CREATED_AT = 'createdAt';

// Sort directions
export const SORT_DIRECTION_ASC = 'asc';
export const SORT_DIRECTION_DESC = 'desc';

// Default sort configuration for new columns
export const DEFAULT_SORT_FIELD = SORT_FIELD_UPDATED_AT;
export const DEFAULT_SORT_DIRECTION = SORT_DIRECTION_DESC;

// Column types
export const COLUMN_TYPE_UNASSIGNED = 'system_unassigned';
export const COLUMN_TYPE_CLOSED = 'system_closed';
export const COLUMN_TYPE_USER = 'user';

// Column titles
export const TITLE_UNASSIGNED_COLUMN = 'No Status';
export const TITLE_CLOSED_COLUMN = 'Closed';
