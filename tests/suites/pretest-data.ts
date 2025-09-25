/**
 * Pretest mock data - converted from JSON to TypeScript with compile-time validation
 */

import type { MockData } from '../../src/lib/base/mock/types';

export const pretestData = {
  // Use default auth data (mock-user)
  // auth: { ... } - omitted to use defaults

  github: {
    projects: [
      {
        id: "github-proj-1",
        title: "Test Project 1",
        number: 1,
        url: "https://github.com/test/project-1",
        isPublic: true,
        isClosed: false,
        items: 5,
        updatedAt: new Date("2024-01-15T10:30:00Z"),
        createdAt: new Date("2024-01-10T08:00:00Z"),
        closedAt: null
      },
      {
        id: "github-proj-2",
        title: "Test Project 2",
        number: 2,
        url: "https://github.com/test/project-2",
        isPublic: false,
        isClosed: false,
        items: 3,
        updatedAt: new Date("2024-01-20T14:15:00Z"),
        createdAt: new Date("2024-01-18T09:30:00Z"),
        closedAt: null
      },
      {
        id: "github-proj-3",
        title: "Test Project 3",
        number: 3,
        url: "https://github.com/test/project-3",
        isPublic: true,
        isClosed: true,
        items: 8,
        updatedAt: new Date("2024-01-22T16:45:00Z"),
        createdAt: new Date("2024-01-20T11:00:00Z"),
        closedAt: new Date("2024-01-15T10:30:00Z")
      }
    ]
  },

  database: {
    columns: [
      {
        id: "col-1",
        userId: "mock-user",
        title: "Test Column 1",
        position: 0,
        isSystem: false,
        sortField: "updatedAt",
        sortDirection: "desc"
      },
      {
        id: "col-2",
        userId: "mock-user",
        title: "Test Column 2",
        position: 1,
        isSystem: false,
        sortField: "updatedAt",
        sortDirection: "desc"
      }
    ],
    projects: [
      {
        id: "proj-1",
        userId: "mock-user",
        columnId: "col-closed"
      },
      {
        id: "proj-2",
        userId: "mock-user",
        columnId: "col-no-status"
      },
      {
        id: "proj-3",
        userId: "mock-user",
        columnId: "col-no-status"
      }
    ],
    labels: [
      {
        id: "label-1",
        userId: "mock-user",
        title: "label-1",
        color: "#ff0000",
        textColor: "white"
      },
      {
        id: "label-2",
        userId: "mock-user",
        title: "label-2",
        color: "#00ff00",
        textColor: "black"
      }
    ],
    project_labels: [
      {
        projectId: "proj-1",
        labelId: "label-1",
        userId: "mock-user"
      },
      {
        projectId: "proj-2",
        labelId: "label-1",
        userId: "mock-user"
      },
      {
        projectId: "proj-4",
        labelId: "label-1",
        userId: "mock-user"
      }
    ]
  }
} satisfies MockData;
