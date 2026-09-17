/**
 * Quản lý các route và hash navigation trong client-app
 */
export const APP_ROUTES = {
  LOGIN: '#/login',
  OVERVIEW: '#/overview',
  TEMPLATES: '#/templates',
  WORKSPACE: '#/workspace',
  ACCOUNTS: '#/accounts',
} as const;

export type AppRoute = typeof APP_ROUTES[keyof typeof APP_ROUTES];

