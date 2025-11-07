# Search Feature Guide

## Overview

The GitHub Projects Dashboard includes a powerful search and filter feature that allows you to quickly find projects matching specific criteria. The search box is located at the top of the dashboard.

## How to Search for "Mem0" (or any term)

### Simple Text Search

1. **Basic search**: Just type `Mem0` in the search box
   - This will find all projects that have "Mem0" in their **title** or **labels**
   - The search is **case-insensitive**, so `Mem0`, `mem0`, and `MEM0` all work the same

2. **Results**: The dashboard will immediately filter to show only matching projects
   - You'll see a count like "Showing 2 of 10 projects" with "8 hidden"
   - Projects not matching the search will be hidden
   - Columns with no matching projects will still be visible (but empty)

### Advanced Search Options

#### Search Only in Titles
```
title:Mem0
```
This searches only in project titles, not in labels.

#### Search Only in Labels
```
label:mem0
```
This searches only in project labels, not in titles.

#### Search by Project Number
```
number:123
```
This finds the project with number 123.

#### Combine Multiple Criteria
```
Mem0 updated:>1 week ago
```
This finds projects with "Mem0" that were updated in the last week.

### More Search Examples

#### Date-based searches
- `updated:>1 month ago` - Projects updated in the last month
- `created:<2025-01-01` - Projects created before January 1, 2025
- `closed:>14 Aug` - Projects closed after August 14

#### Numeric searches
- `items:>5` - Projects with more than 5 items
- `number:>=100` - Projects with number 100 or higher

#### Boolean searches
- `isClosed:true` - Only show closed projects
- `isClosed:false` - Only show open projects

#### Column filtering
- `column:todo` - Show only the "Todo" column
- `column:progress` - Show only columns matching "progress"

#### Complex queries
```
label:bug updated:>1 month ago items:>3
```
This finds projects with the "bug" label, updated in the last month, with more than 3 items.

## Clearing the Search

Click the "✕" button next to the search box to clear the filter and see all projects again.

## Technical Details

The search feature uses the [liqe](https://github.com/gajus/liqe) library, which provides Lucene-style query parsing. This means:

- **Case-insensitive by default**: All searches ignore case
- **Fast filtering**: Results update immediately as you type
- **Flexible syntax**: Supports field-specific searches, ranges, wildcards, and boolean operators
- **Smart date parsing**: Understands relative dates like "1 week ago" and absolute dates like "2025-01-01"

## Example Use Case: Finding all Mem0-related projects

To answer the question "In which of my GitHub Projects is Mem0 mentioned?":

1. Open your GitHub Projects Dashboard
2. Type `Mem0` in the search box at the top
3. The dashboard will show only projects with "Mem0" in their title or labels
4. You'll see a summary like "Showing 2 of 10 projects" if you have 2 projects mentioning Mem0

That's it! The search is designed to be simple and intuitive while being powerful enough for complex queries.
