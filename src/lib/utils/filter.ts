import dayjs from 'dayjs';
import { parse, filter as liqeFilter } from 'liqe';
import type { UiData, UiProject } from '../business/uiData';

//==============================================================================
// MAIN FILTER FUNCTIONS
//==============================================================================

/**
 * Filter UI data based on a query string
 * Supports sophisticated filtering with Lucene-style syntax
 *
 * Supported syntax:
 * - Naked terms: "react" (searches title and labels in projects)
 * - Field searches: "title:frontend", "label:bug", "number:123"
 * - Date searches: "updated:>1 week ago", "created:<2025-01-01"
 * - Numeric searches: "items:>5", "number:>=100"
 * - Boolean searches: "isClosed:true"
 * - Column filtering: "column:todo" (shows/hides entire columns)
 * - Combinations: "label:bug updated:>1 month ago"
 */
export function filter(uiData: UiData, query: string): UiData {
  if (!query.trim()) {
    return uiData;
  }

  try {
    // Pre-process query to convert dates to timestamps
    const processedQuery = preprocessDates(query);

    // Parse the Lucene-style query
    const parsedQuery = parse(processedQuery);

    // First, filter columns if query contains column filtering
    let columnsToShow = uiData.columns;

    if (detectColumnFilter(query)) {
      // Transform columns to searchable format for liqe
      const searchableColumns = uiData.columns.map(column => ({
        ...column,
        column: column.title.toLowerCase() // For column:name syntax
      }));

      // Filter columns using liqe
      const filteredColumnResults = liqeFilter(parsedQuery, searchableColumns);
      columnsToShow = filteredColumnResults.map(c => uiData.columns.find(orig => orig.id === c.id)!);
    }

    // Then filter projects within the remaining columns
    const filteredColumns = columnsToShow.map(column => {
      // Get all projects from this column
      const searchableProjects = column.projects.map(transformProjectForSearch);

      // Filter projects using liqe
      const filtered = liqeFilter(parsedQuery, searchableProjects);

      // Return column with filtered projects
      return {
        ...column,
        projects: filtered.map(p => column.projects.find(orig => orig.id === p.id)!)
      };
    });

    return {
      ...uiData,
      columns: filteredColumns
    };
  } catch (error) {
    // If query is invalid, show no results (clearer than unexpected fallback behavior)
    console.warn('Invalid filter query, showing no results:', query, error);
    return {
      ...uiData,
      columns: uiData.columns.map(column => ({
        ...column,
        projects: []
      }))
    };
  }
}

//==============================================================================
// DATE PREPROCESSING HELPERS
//==============================================================================

/**
 * Preprocess relative and absolute dates in filter queries
 *
 * Examples:
 * - "updated:>1 month ago" → "updated:>1640995200"
 * - "created:<2025-01-01" → "created:<1735689600"
 * - "closed:>=14 Aug" → "closed:>=1723593600"
 */
function preprocessDates(query: string): string {
  let processedQuery = query;

  // Process relative dates first
  processedQuery = preprocessRelativeDates(processedQuery);

  // Process absolute dates
  processedQuery = preprocessAbsoluteDates(processedQuery);

  return processedQuery;
}

/**
 * Process relative date patterns like "updated:>1 month ago"
 */
function preprocessRelativeDates(query: string): string {
  const relativeDateRegex = /(\w+):(>|<|>=|<=|=)(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/gi;

  return query.replace(relativeDateRegex, (_match, field, operator, amount, unit) => {
    // Convert relative date to Unix timestamp
    const normalizedUnit = unit.toLowerCase().replace(/s$/, '') as 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
    const timestamp = Math.floor(dayjs().subtract(parseInt(amount), normalizedUnit).valueOf() / 1000);

    // Reverse operator logic for intuitive behavior:
    // "created:<1 week ago" means "more recent than 1 week ago"
    let reversedOperator = operator;
    if (operator === '<') reversedOperator = '>';
    else if (operator === '>') reversedOperator = '<';
    else if (operator === '<=') reversedOperator = '>=';
    else if (operator === '>=') reversedOperator = '<=';
    // '=' stays the same

    return `${field}:${reversedOperator}${timestamp}`;
  });
}

/**
 * Process absolute date patterns in various formats
 */
function preprocessAbsoluteDates(query: string): string {
  let processedQuery = query;

  // ISO date format (YYYY-MM-DD)
  processedQuery = processedQuery.replace(
    /(\w+):(>|<|>=|<=|=)(\d{4}-\d{2}-\d{2})/gi,
    (_match, field, operator, dateStr) => {
      const timestamp = Math.floor(dayjs(dateStr).valueOf() / 1000);
      return `${field}:${operator}${timestamp}`;
    }
  );

  // Short format with year (D MMM YYYY)
  processedQuery = processedQuery.replace(
    /(\w+):(>|<|>=|<=|=)(\d{1,2}\s+\w{3}\s+\d{4})/gi,
    (_match, field, operator, dateStr) => {
      const timestamp = Math.floor(dayjs(dateStr, 'D MMM YYYY').valueOf() / 1000);
      return `${field}:${operator}${timestamp}`;
    }
  );

  // Short format with current year (D MMM)
  processedQuery = processedQuery.replace(
    /(\w+):(>|<|>=|<=|=)(\d{1,2}\s+\w{3})/gi,
    (_match, field, operator, dateStr) => {
      const currentYear = dayjs().year();
      const timestamp = Math.floor(dayjs(`${dateStr} ${currentYear}`, 'D MMM YYYY').valueOf() / 1000);
      return `${field}:${operator}${timestamp}`;
    }
  );

  return processedQuery;
}

//==============================================================================
// PROJECT TRANSFORMATION HELPERS
//==============================================================================

/**
 * Transform a UiProject into a searchable format for liqe
 * Exposes all searchable fields with appropriate types
 */
function transformProjectForSearch(project: UiProject) {
  return {
    ...project,
    // Text fields for naked term searches and explicit field searches
    title: project.title,
    description: '', // Could be enhanced if we add descriptions

    // Label search - concatenated string of all label titles
    label: project.labels.map(l => l.title).join(' ').toLowerCase(),

    // Numeric fields
    number: project.number,
    items: project.items,

    // Boolean fields
    isClosed: !!project.closedAt,

    // Date fields (ISO strings for display)
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    closedAt: project.closedAt?.toISOString() || '',

    // Unix timestamps for numeric date comparisons
    created: Math.floor(project.createdAt.getTime() / 1000),
    updated: Math.floor(project.updatedAt.getTime() / 1000),
    closed: Math.floor((project.closedAt?.getTime() || 0) / 1000)
  };
}

//==============================================================================
// COLUMN FILTERING HELPERS
//==============================================================================

/**
 * Detect if query contains column filtering syntax
 */
function detectColumnFilter(query: string): boolean {
  return /column:/i.test(query);
}

