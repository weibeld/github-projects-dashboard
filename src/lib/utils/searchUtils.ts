import dayjs from 'dayjs';
import { parse, filter } from 'liqe';
import type { Project } from '../business/types';
import type { GitHubProject } from '../business/types';

/**
 * Function to preprocess relative and absolute dates in search queries
 */
export function preprocessDates(query: string): string {
  let processedQuery = query;

  // Process relative dates first
  // Regular expression to match relative date patterns like:
  // "updated:>1 month ago", "created:<2 weeks ago", "closed:>=3 days ago"
  const relativeDateRegex = /(\w+):(>|<|>=|<=|=)(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/gi;

  processedQuery = processedQuery.replace(relativeDateRegex, (_match, field, operator, amount, unit) => {
    // Convert relative date to Unix timestamp
    // Normalize unit (remove 's' if plural) and ensure it's a valid dayjs unit
    const normalizedUnit = unit.toLowerCase().replace(/s$/, '') as 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
    const timestamp = Math.floor(dayjs().subtract(parseInt(amount), normalizedUnit).valueOf() / 1000);

    // Reverse the operator logic for intuitive behavior:
    // "created:<1 week ago" should mean "created less than 1 week ago" (more recent)
    // So we need to search for timestamps greater than the calculated timestamp
    let reversedOperator = operator;
    if (operator === '<') reversedOperator = '>';
    else if (operator === '>') reversedOperator = '<';
    else if (operator === '<=') reversedOperator = '>=';
    else if (operator === '>=') reversedOperator = '<=';
    // '=' stays the same

    return `${field}:${reversedOperator}${timestamp}`;
  });

  // Process absolute dates
  // Regular expressions for different absolute date formats:
  // 1. ISO format: "updated:>2025-08-14", "created:<2025-06-01"
  // 2. Short format with current year: "updated:>14 Aug", "created:<1 Jun"
  // 3. Short format with year: "updated:>1 Oct 2024", "created:<14 Aug 2023"

  // ISO date format (YYYY-MM-DD)
  const isoDateRegex = /(\w+):(>|<|>=|<=|=)(\d{4}-\d{2}-\d{2})/gi;
  processedQuery = processedQuery.replace(isoDateRegex, (_match, field, operator, dateStr) => {
    const timestamp = Math.floor(dayjs(dateStr).valueOf() / 1000);
    return `${field}:${operator}${timestamp}`;
  });

  // Short format with year (D MMM YYYY)
  const shortDateWithYearRegex = /(\w+):(>|<|>=|<=|=)(\d{1,2}\s+\w{3}\s+\d{4})/gi;
  processedQuery = processedQuery.replace(shortDateWithYearRegex, (_match, field, operator, dateStr) => {
    const timestamp = Math.floor(dayjs(dateStr, 'D MMM YYYY').valueOf() / 1000);
    return `${field}:${operator}${timestamp}`;
  });

  // Short format with current year (D MMM)
  const shortDateRegex = /(\w+):(>|<|>=|<=|=)(\d{1,2}\s+\w{3})/gi;
  processedQuery = processedQuery.replace(shortDateRegex, (_match, field, operator, dateStr) => {
    const currentYear = dayjs().year();
    const timestamp = Math.floor(dayjs(`${dateStr} ${currentYear}`, 'D MMM YYYY').valueOf() / 1000);
    return `${field}:${operator}${timestamp}`;
  });

  return processedQuery;
}

/**
 * Apply search filtering using liqe
 */
export function filterProjects(
  searchQuery: string,
  projects: Project[],
  githubProjectsData: Record<string, GitHubProject>
): Project[] {
  if (!searchQuery.trim()) {
    return projects;
  }

  try {
    // Pre-process query to convert relative and absolute dates to timestamps
    const processedQuery = preprocessDates(searchQuery);

    // Parse the Lucene-style query
    const query = parse(processedQuery);

    // Transform projects to searchable format for liqe
    // Naked terms will search across all text fields
    // Explicit field syntax like "title:foo" or "label:bar" for precise targeting
    const searchableProjects = projects.map(project => {
      const githubProject = githubProjectsData[project.id];
      const projectLabels: string[] = []; // TODO: Implement proper label lookup via project-label relationships

      return {
        ...project,
        // All searchable text fields (for naked terms and explicit field searches)
        title: githubProject?.title || '',
        description: '',
        visibility: githubProject?.isPublic ? 'public' : 'private',
        // Concatenated labels string for label field searches
        label: projectLabels.join(' ').toLowerCase(),
        // Keep numeric and boolean fields for specific searches
        number: githubProject?.number || 0,
        items: githubProject?.items || 0,
        isClosed: githubProject?.isClosed || false,
        // Date fields for temporal searches
        createdAt: githubProject?.createdAt?.toISOString() || '',
        updatedAt: githubProject?.updatedAt?.toISOString() || '',
        closedAt: githubProject?.closedAt?.toISOString() || '',
        // Helper fields for easier date searching
        created: Math.floor((githubProject?.createdAt?.getTime() || 0) / 1000), // Unix timestamp
        updated: Math.floor((githubProject?.updatedAt?.getTime() || 0) / 1000),
        closed: Math.floor((githubProject?.closedAt?.getTime() || 0) / 1000)
      };
    });

    // Filter using liqe
    const filtered = filter(query, searchableProjects);

    // Return original project objects
    return filtered.map(p => projects.find(orig => orig.id === p.id)!);
  } catch (error) {
    // If query is invalid, show all projects
    console.warn('Invalid search query:', searchQuery, error);
    return projects;
  }
}