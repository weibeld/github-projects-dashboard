// Business Layer - Public API
// Pure interface - all implementation is in backend.ts

// Export reactive stores
export {
  uiData
} from './uiData';

export {
  uiAuth
} from './uiAuth';


// Export all business operations
export {
  // Auth operations
  checkAuthAndInitAuthStore,
  login,
  logout,

  // Data loading
  loadDataAndInitDataStore,

  // Column operations
  createColumn,
  deleteColumn,

  // Project operations
  moveProjectToColumn
} from './backend';
