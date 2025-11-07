/**
 * Search test mock data - includes projects with specific search terms like "Mem0"
 */

import type { MockData } from '../../src/lib/base/mock/types';
import { COLUMN_TYPE_USER } from '../../src/lib/business/types';

export const searchData = {
  github: {
    projects: [
      {
        id: "github-proj-1",
        title: "Mem0 Integration Project",
        number: 1,
        url: "https://github.com/test/mem0-integration",
        isPublic: true,
        isClosed: false,
        items: 5,
        updatedAt: new Date("2024-01-15T10:30:00Z"),
        createdAt: new Date("2024-01-10T08:00:00Z"),
        closedAt: null
      },
      {
        id: "github-proj-2",
        title: "React Frontend App",
        number: 2,
        url: "https://github.com/test/react-app",
        isPublic: false,
        isClosed: false,
        items: 3,
        updatedAt: new Date("2024-01-20T14:15:00Z"),
        createdAt: new Date("2024-01-18T09:30:00Z"),
        closedAt: null
      },
      {
        id: "github-proj-3",
        title: "Backend API with Mem0",
        number: 3,
        url: "https://github.com/test/backend-mem0",
        isPublic: true,
        isClosed: false,
        items: 8,
        updatedAt: new Date("2024-01-22T16:45:00Z"),
        createdAt: new Date("2024-01-20T11:00:00Z"),
        closedAt: null
      },
      {
        id: "github-proj-4",
        title: "Python Data Pipeline",
        number: 4,
        url: "https://github.com/test/python-pipeline",
        isPublic: true,
        isClosed: false,
        items: 12,
        updatedAt: new Date("2024-01-25T09:00:00Z"),
        createdAt: new Date("2024-01-22T14:30:00Z"),
        closedAt: null
      },
      {
        id: "github-proj-5",
        title: "Machine Learning Project",
        number: 5,
        url: "https://github.com/test/ml-project",
        isPublic: true,
        isClosed: true,
        items: 20,
        updatedAt: new Date("2024-01-10T12:00:00Z"),
        createdAt: new Date("2024-01-01T10:00:00Z"),
        closedAt: new Date("2024-01-10T12:00:00Z")
      }
    ]
  },

  database: {
    columns: [
      {
        id: "col-1",
        userId: "mock-user",
        title: "In Progress",
        position: 0,
        type: COLUMN_TYPE_USER,
        sortField: "updatedAt",
        sortDirection: "desc"
      },
      {
        id: "col-2",
        userId: "mock-user",
        title: "Todo",
        position: 1,
        type: COLUMN_TYPE_USER,
        sortField: "updatedAt",
        sortDirection: "desc"
      }
    ],
    projects: [
      {
        id: "github-proj-1",
        userId: "mock-user",
        columnId: "col-1"
      },
      {
        id: "github-proj-2",
        userId: "mock-user",
        columnId: "col-1"
      },
      {
        id: "github-proj-3",
        userId: "mock-user",
        columnId: "col-2"
      },
      {
        id: "github-proj-4",
        userId: "mock-user",
        columnId: "col-2"
      },
      {
        id: "github-proj-5",
        userId: "mock-user",
        columnId: "col-closed"
      }
    ],
    labels: [
      {
        id: "label-mem0",
        userId: "mock-user",
        title: "mem0",
        color: "#0366d6",
        textColor: "white"
      },
      {
        id: "label-backend",
        userId: "mock-user",
        title: "backend",
        color: "#28a745",
        textColor: "white"
      },
      {
        id: "label-frontend",
        userId: "mock-user",
        title: "frontend",
        color: "#d73a4a",
        textColor: "white"
      }
    ],
    project_labels: [
      {
        projectId: "github-proj-1",
        labelId: "label-mem0",
        userId: "mock-user"
      },
      {
        projectId: "github-proj-2",
        labelId: "label-frontend",
        userId: "mock-user"
      },
      {
        projectId: "github-proj-3",
        labelId: "label-backend",
        userId: "mock-user"
      },
      {
        projectId: "github-proj-3",
        labelId: "label-mem0",
        userId: "mock-user"
      }
    ]
  }
} satisfies MockData;
