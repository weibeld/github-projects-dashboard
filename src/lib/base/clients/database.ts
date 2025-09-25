import { supabase } from './supabase';
import { isMockMode, mockDelay, getMockUuid } from '../mock/utils';
import type { DatabaseClientColumn, DatabaseClientLabel, DatabaseClientProject, DatabaseClientProjectLabel } from './types';

// Mock data storage with cascade delete metadata
const mockData = {
  columns: { data: [] as DatabaseClientColumn[], cascadeDeletes: [] },
  projects: { data: [] as DatabaseClientProject[], cascadeDeletes: [{ table: 'project_labels', field: 'projectId' }] },
  labels: { data: [] as DatabaseClientLabel[], cascadeDeletes: [{ table: 'project_labels', field: 'labelId' }] },
  project_labels: { data: [] as DatabaseClientProjectLabel[], cascadeDeletes: [] }
};

// Mock data setter
export function initializeMockData(data: { columns: DatabaseClientColumn[]; projects: DatabaseClientProject[]; labels: DatabaseClientLabel[]; project_labels: DatabaseClientProjectLabel[]; }): void {
  mockData.columns.data = [...data.columns];
  mockData.projects.data = [...data.projects];
  mockData.labels.data = [...data.labels];
  mockData.project_labels.data = [...data.project_labels];
}

//==============================================================================
// COLUMN FUNCTIONS
//==============================================================================

// Create a new column at specific position
export async function columnCreate(column: Omit<DatabaseClientColumn, 'id'>): Promise<DatabaseClientColumn> {
  // Shift higher-order columns to the right
  await updateRecordIncrement('columns', column.userId, 'position', column.position, undefined, 1);
  return await insertRecord<DatabaseClientColumn>('columns', column);
}

export async function columnRead(userId: string): Promise<DatabaseClientColumn[]> {
  return await selectRecords<DatabaseClientColumn>('columns', userId, 'position');
}

export async function columnUpdateTitle(columnId: string, userId: string, title: string): Promise<void> {
  await updateRecord('columns', columnId, userId, 'title', title);
}

export async function columnUpdateSortField(columnId: string, userId: string, sortField: string): Promise<void> {
  await updateRecord('columns', columnId, userId, 'sort_field', sortField);
}

export async function columnUpdateSortDirection(columnId: string, userId: string, sortDirection: string): Promise<void> {
  await updateRecord('columns', columnId, userId, 'sort_direction', sortDirection);
}

// Update the position of a column (shift other columns if necessary)
export async function columnUpdatePosition(columnId: string, userId: string, oldPosition: number, newPosition: number): Promise<void> {
  if (oldPosition === newPosition) {
    return; // No change needed
  }
  // Change position of other columns
  if (oldPosition < newPosition) {
    // Moving right: shift left between old+1 and new (inclusive)
    await updateRecordIncrement('columns', userId, 'position', oldPosition+1, newPosition, -1);
  } else {
    // Moving left: shift right between new and old-1 (inclusive)
    await updateRecordIncrement('columns', userId, 'position', newPosition, oldPosition-1, 1);
  }
  // Change position of column itself
  await updateRecord('columns', columnId, userId, 'position', newPosition);
}

// Delete a column and reorder positions
export async function columnDelete(columnId: string, userId: string, position: number): Promise<void> {
  await deleteRecord('columns', columnId, userId);
  // Shift higher-order columns to the left
  await updateRecordIncrement('columns', userId, 'position', position + 1, undefined, -1);
}

//==============================================================================
// LABEL FUNCTIONS
//==============================================================================

export async function labelCreate(label: Omit<DatabaseClientLabel, 'id'>): Promise<DatabaseClientLabel> {
  return await insertRecord<DatabaseClientLabel>('labels', label);
}

export async function labelRead(userId: string): Promise<DatabaseClientLabel[]> {
  return await selectRecords<DatabaseClientLabel>('labels', userId, 'title');
}

export async function labelUpdateTitle(labelId: string, userId: string, title: string): Promise<void> {
  await updateRecord('labels', labelId, userId, 'title', title);
}

export async function labelUpdateColor(labelId: string, userId: string, color: string): Promise<void> {
  await updateRecord('labels', labelId, userId, 'color', color);
}

export async function labelUpdateTextColor(labelId: string, userId: string, textColor: string): Promise<void> {
  await updateRecord('labels', labelId, userId, 'text_color', textColor);
}

export async function labelDelete(labelId: string, userId: string): Promise<void> {
  await deleteRecord('labels', labelId, userId);
}

//==============================================================================
// PROJECT FUNCTIONS
//==============================================================================

export async function projectCreate(project: DatabaseClientProject): Promise<DatabaseClientProject> {
  return await insertRecord<DatabaseClientProject>('projects', project);
}

export async function projectRead(userId: string): Promise<DatabaseClientProject[]> {
  return await selectRecords<DatabaseClientProject>('projects', userId);
}

// Update column_id field for one or multiple projects
export async function projectUpdateColumn(projectIds: string[], userId: string, columnId: string): Promise<void> {
  if (projectIds.length === 0) return;
  await updateRecord('projects', projectIds, userId, 'columnId', columnId);
}

export async function projectDelete(projectId: string, userId: string): Promise<void> {
  await deleteRecord('projects', projectId, userId);
}

//==============================================================================
// PROJECT-LABEL JUNCTION RELATION FUNCTIONS
//==============================================================================

export async function projectLabelRelationCreate(projectLabel: DatabaseClientProjectLabel): Promise<DatabaseClientProjectLabel> {
  return await insertJunction<DatabaseClientProjectLabel>('project_labels', projectLabel);
}

export async function projectLabelRelationRead(userId: string): Promise<DatabaseClientProjectLabel[]> {
  return await selectJunctions<DatabaseClientProjectLabel>('project_labels', userId);
}

export async function projectLabelRelationDelete(projectId: string, labelId: string, userId: string): Promise<void> {
  await deleteJunction('project_labels', userId, 'project_id', projectId, 'label_id', labelId);
}

//==============================================================================
// HELPER FUNCTIONS
//==============================================================================

// Create a new record (INSERT operation)
async function insertRecord<T extends Record<string, any>>(
  table: string,
  data: Omit<T, 'id'>
): Promise<T> {
  if (isMockMode()) {
    await mockDelay();

    const newRecord = {
      ...data,
      id: getMockUuid()
    } as unknown as T;

    ((mockData as any)[table].data as any[]).push(newRecord);
    return newRecord;
  }

  const { data: result, error } = await supabase
    .from(table)
    .insert(toSnakeCaseFields(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCaseFields(result) as T;
}

// Create a new junction table entry (INSERT operation)
async function insertJunction<T extends Record<string, any>>(
  table: string,
  data: T
): Promise<T> {
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table].data as any[];
    // Check if junction already exists (compare all fields)
    const exists = collection.some((item: any) => {
      return Object.keys(data).every(key => item[key] === data[key]);
    });
    if (!exists) {
      collection.push(data);
    }
    return data;
  }

  // Real mode - convert to snake_case for database
  const { data: result, error } = await supabase
    .from(table)
    .insert(toSnakeCaseFields(data))
    .select()
    .single();

  if (error) throw error;
  return toCamelCaseFields(result) as T;
}

// Retrieve all records (SELECT operation)
async function selectRecords<T extends Record<string, any>>(
  table: string,
  userId: string,
  orderBy?: string
): Promise<T[]> {
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table].data as any[];
    let filtered = collection.filter((item: any) => item.userId === userId);
    if (orderBy) {
      filtered = filtered.sort((a: any, b: any) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        return typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      });
    }
    return filtered as T[];
  }

  const query = supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);
  if (orderBy) {
    query.order(orderBy);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(row => toCamelCaseFields(row) as T);
}

// Retrieve all junction table entries (SELECT operation)
async function selectJunctions<T extends Record<string, any>>(
  table: string,
  userId: string
): Promise<T[]> {
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table].data as any[];
    return collection.filter((item: any) => item.userId === userId) as T[];
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(row => toCamelCaseFields(row) as T);
}

// Update a field value of one or more records (UPDATE operation)
async function updateRecord(
  table: string,
  ids: string | string[],
  userId: string,
  field: string,
  value: string | number
): Promise<void> {
  const idArray = Array.isArray(ids) ? ids : [ids];
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table].data as any[];
    idArray.forEach(id => {
      const item = collection.find((item: any) => item.id === id && item.userId === userId);
      if (item) {
        (item as any)[field] = value;
      }
    });
    return;
  }

  const { error } = await supabase
    .from(table)
    .update({
      [field]: value
    })
    .in('id', idArray)
    .eq('user_id', userId);
  if (error) throw error;
}

// Increment/decrement the field value of all records where the value of this
// field is between 'fromFieldValue' and 'toFieldValue' (inclusive).
// This is primarily used on 'position' fields to "shift" an ordered block of
// items left or right. The 'increment' param may be negative for decrements.
async function updateRecordIncrement(
  table: string,
  userId: string,
  field: string,
  fromFieldValue: number | undefined,
  toFieldValue: number | undefined,
  increment: number
): Promise<void> {
  if (isMockMode()) {
    const collection = (mockData as any)[table].data as any[];
    for (const item of collection) {
      if (item.userId === userId) {
        const position = item[field];
        const afterFrom = fromFieldValue === undefined || position >= fromFieldValue;
        const beforeTo = toFieldValue === undefined || position <= toFieldValue;
        if (afterFrom && beforeTo) {
          await updateRecord(table, item.id, userId, field, position + increment);
        }
      }
    }
    return;
  }

  let query = supabase
    .from(table)
    .select('id, ' + field)
    .eq('user_id', userId);
  if (fromFieldValue !== undefined) {
    query = query.gte(field, fromFieldValue);
  }
  if (toFieldValue !== undefined) {
    query = query.lte(field, toFieldValue);
  }
  const { data: itemsToUpdate } = await query;
  if (itemsToUpdate) {
    for (const item of itemsToUpdate) {
      await updateRecord(table, (item as any).id, userId, field, (item as any)[field] + increment);
    }
  }
}

// Delete a record (DELETE operation)
async function deleteRecord(
  table: string,
  id: string,
  userId: string
): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    // Handle cascade deletes for mock mode using metadata
    const tableConfig = (mockData as any)[table];
    if (tableConfig?.cascadeDeletes) {
      for (const cascade of tableConfig.cascadeDeletes) {
        const targetTableData = (mockData as any)[cascade.table].data;
        (mockData as any)[cascade.table].data = targetTableData.filter((item: any) => item[cascade.field] !== id);
      }
    }
    const collection = (mockData as any)[table].data as any[];
    const index = collection.findIndex((item: any) => item.id === id && item.userId === userId);
    if (index !== -1) {
      collection.splice(index, 1);
    }
    return;
  }

  // Real mode - database handles cascade deletes automatically
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

// Delete a junction table entry (DELETE operation)
async function deleteJunction(
  table: string,
  userId: string,
  field1Name: string,
  field1Value: string,
  field2Name: string,
  field2Value: string
): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table].data as any[];
    const index = collection.findIndex((item: any) =>
      item.userId === userId &&
      item[toCamelCase(field1Name)] === field1Value &&
      item[toCamelCase(field2Name)] === field2Value
    );
    if (index !== -1) {
      collection.splice(index, 1);
    }
    return;
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq(field1Name, field1Value)
    .eq(field2Name, field2Value);
  if (error) throw error;
}

// Converts the field names of a record from camelCase to snake_case
function toSnakeCaseFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toSnakeCase(key)] = value;
  }
  return result;
}

// Converts the field names of a record from snake_case to camelCase
function toCamelCaseFields<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value;
  }
  return result;
}

// Converts a string from camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Converts a string from snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

