import { supabase } from './supabase';
import { isMockMode, mockDelay, getMockUuid } from '../mock/utils';
import type { RawColumn, RawLabel, RawProject, RawProjectLabel } from '../types';

// Mock data storage (simple structure)
const mockData = {
  columns: [] as RawColumn[],
  projects: [] as RawProject[],
  labels: [] as RawLabel[],
  project_labels: [] as RawProjectLabel[]
};

// Mock data setter
export function initializeMockData(data: { columns: RawColumn[]; projects: RawProject[]; labels: RawLabel[]; project_labels: RawProjectLabel[]; }): void {
  mockData.columns = [...data.columns];
  mockData.projects = [...data.projects];
  mockData.labels = [...data.labels];
  mockData.project_labels = [...data.project_labels];
}

//==============================================================================
// COLUMN FUNCTIONS
//==============================================================================

// Create a new column (single operation only)
export async function columnCreate(column: Omit<RawColumn, 'id'>): Promise<RawColumn> {
  return await insertRecord<RawColumn>('columns', column);
}

export async function columnRead(userId: string): Promise<RawColumn[]> {
  return await selectRecords<RawColumn>('columns', userId, 'position');
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

// Update the position of a column (single operation only)
export async function columnUpdatePosition(columnId: string, userId: string, position: number): Promise<void> {
  await updateRecord('columns', columnId, userId, 'position', position);
}

// Delete a column (single operation only)
export async function columnDelete(columnId: string, userId: string): Promise<void> {
  await deleteRecord('columns', columnId, userId);
}

//==============================================================================
// LABEL FUNCTIONS
//==============================================================================

export async function labelCreate(label: Omit<RawLabel, 'id'>): Promise<RawLabel> {
  return await insertRecord<RawLabel>('labels', label);
}

export async function labelRead(userId: string): Promise<RawLabel[]> {
  return await selectRecords<RawLabel>('labels', userId, 'title');
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

export async function projectCreate(project: RawProject): Promise<RawProject> {
  return await insertRecord<RawProject>('projects', project);
}

export async function projectRead(userId: string): Promise<RawProject[]> {
  return await selectRecords<RawProject>('projects', userId);
}

// Update column_id field for a single project
export async function projectUpdateColumn(projectId: string, userId: string, columnId: string): Promise<void> {
  await updateRecord('projects', projectId, userId, 'columnId', columnId);
}

export async function projectDelete(projectId: string, userId: string): Promise<void> {
  await deleteRecord('projects', projectId, userId);
}

//==============================================================================
// PROJECT-LABEL JUNCTION RELATION FUNCTIONS
//==============================================================================

export async function projectLabelRelationCreate(projectLabel: RawProjectLabel): Promise<RawProjectLabel> {
  return await insertJunction<RawProjectLabel>('project_labels', projectLabel);
}

export async function projectLabelRelationRead(userId: string): Promise<RawProjectLabel[]> {
  return await selectJunctions<RawProjectLabel>('project_labels', userId);
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

    ((mockData as any)[table] as any[]).push(newRecord);
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
    const collection = (mockData as any)[table] as any[];
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
    const collection = (mockData as any)[table] as any[];
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
    const collection = (mockData as any)[table] as any[];
    return collection.filter((item: any) => item.userId === userId) as T[];
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(row => toCamelCaseFields(row) as T);
}

// Update a field value of a single record (UPDATE operation)
async function updateRecord(
  table: string,
  id: string,
  userId: string,
  field: string,
  value: string | number
): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table] as any[];
    const item = collection.find((item: any) => item.id === id && item.userId === userId);
    if (item) {
      (item as any)[field] = value;
    }
    return;
  }

  const { error } = await supabase
    .from(table)
    .update({
      [field]: value
    })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

// updateRecordIncrement function removed - multi-record operations now handled in business layer

// Delete a record (DELETE operation)
async function deleteRecord(
  table: string,
  id: string,
  userId: string
): Promise<void> {
  if (isMockMode()) {
    await mockDelay();
    const collection = (mockData as any)[table] as any[];
    const index = collection.findIndex((item: any) => item.id === id && item.userId === userId);
    if (index !== -1) {
      collection.splice(index, 1);
    }
    return;
  }

  // Real mode - simple delete (cascade deletes handled in business layer)
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
    const collection = (mockData as any)[table] as any[];
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

