/**
 * Quản lý LocalStorage keys và Query keys theo chuẩn quan-ly-kho-sim-react
 */
export const STORAGE_KEYS = {
  SESSION: 'projectx_session',
  DEVICE_ID: 'projectx_device_id',
  THEME: 'projectx_theme',
  LAST_PROJECT_ID: 'projectx_last_project_id',
} as const;

export const QUERY_KEYS = {
  USER_INFO: 'USER_INFO',
  TEMPLATES: 'TEMPLATES',
  PROJECTS: 'PROJECTS',
  PROJECT_DETAIL: 'PROJECT_DETAIL',
  DASHBOARD: 'DASHBOARD',
  AI_SESSIONS: 'AI_SESSIONS',
  VOICE_ACCOUNTS: 'VOICE_ACCOUNTS',
} as const;

