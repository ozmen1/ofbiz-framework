import { ViewType } from '../App';
import { RouteMatch } from './types';

export const APP_BASE_PREFIX = '/app';

interface RouteDefinition {
  pattern: RegExp;
  view: ViewType;
  hasId?: boolean;
  buildPath: (id?: string) => string;
}

export const ROUTES: RouteDefinition[] = [
  // Dashboard
  {
    pattern: /^\/app\/dashboard\/?$/,
    view: 'dashboard',
    buildPath: () => '/app/dashboard'
  },

  // Invoices
  {
    pattern: /^\/app\/accounting\/invoices\/new\/?$/,
    view: 'create-invoice',
    buildPath: () => '/app/accounting/invoices/new'
  },
  {
    pattern: /^\/app\/accounting\/invoices\/([^/?#]+)\/?$/,
    view: 'invoice-detail',
    hasId: true,
    buildPath: (id) => `/app/accounting/invoices/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^\/app\/accounting\/invoices\/?$/,
    view: 'invoices',
    buildPath: () => '/app/accounting/invoices'
  },

  // Payments
  {
    pattern: /^\/app\/accounting\/payments\/new\/?$/,
    view: 'create-payment',
    buildPath: () => '/app/accounting/payments/new'
  },
  {
    pattern: /^\/app\/accounting\/payments\/([^/?#]+)\/?$/,
    view: 'payment-detail',
    hasId: true,
    buildPath: (id) => `/app/accounting/payments/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^\/app\/accounting\/payments\/?$/,
    view: 'payments',
    buildPath: () => '/app/accounting/payments'
  },

  // Payment Groups
  {
    pattern: /^\/app\/accounting\/payment-groups\/?$/,
    view: 'payment-groups',
    buildPath: () => '/app/accounting/payment-groups'
  },

  // Financial Accounts
  {
    pattern: /^\/app\/accounting\/financial-accounts\/?$/,
    view: 'financial-accounts',
    buildPath: () => '/app/accounting/financial-accounts'
  },

  // Deposit Slips
  {
    pattern: /^\/app\/accounting\/deposit-slips\/?$/,
    view: 'deposit-slips',
    buildPath: () => '/app/accounting/deposit-slips'
  },

  // Reports
  {
    pattern: /^\/app\/accounting\/reports\/?$/,
    view: 'reports',
    buildPath: () => '/app/accounting/reports'
  },

  // Advanced Accounting
  {
    pattern: /^\/app\/accounting\/advanced\/?$/,
    view: 'advanced-accounting',
    buildPath: () => '/app/accounting/advanced'
  },

  // Tax and GL Mapping
  {
    pattern: /^\/app\/accounting\/tax-mapping\/?$/,
    view: 'tax-and-gl-mapping',
    buildPath: () => '/app/accounting/tax-mapping'
  },

  // Chart of Accounts
  {
    pattern: /^\/app\/accounting\/chart-of-accounts\/?$/,
    view: 'chart-of-accounts',
    buildPath: () => '/app/accounting/chart-of-accounts'
  },

  // Journal Entries
  {
    pattern: /^\/app\/accounting\/journal-entries\/new\/?$/,
    view: 'create-journal-entry',
    buildPath: () => '/app/accounting/journal-entries/new'
  },
  {
    pattern: /^\/app\/accounting\/journal-entries\/([^/?#]+)\/?$/,
    view: 'journal-entries',
    hasId: true,
    buildPath: (id) => `/app/accounting/journal-entries/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^\/app\/accounting\/journal-entries\/?$/,
    view: 'journal-entries',
    buildPath: () => '/app/accounting/journal-entries'
  },

  // Fiscal Periods
  {
    pattern: /^\/app\/accounting\/fiscal-periods\/?$/,
    view: 'fiscal-periods',
    buildPath: () => '/app/accounting/fiscal-periods'
  },

  // FX Rates
  {
    pattern: /^\/app\/accounting\/fx-rates\/?$/,
    view: 'fx-rates',
    buildPath: () => '/app/accounting/fx-rates'
  },

  // Cost Centers
  {
    pattern: /^\/app\/accounting\/cost-centers\/?$/,
    view: 'cost-centers',
    buildPath: () => '/app/accounting/cost-centers'
  },

  // Accounting Preferences
  {
    pattern: /^\/app\/accounting\/preferences\/?$/,
    view: 'accounting-preferences',
    buildPath: () => '/app/accounting/preferences'
  },

  // Payment Gateways
  {
    pattern: /^\/app\/accounting\/payment-gateways\/?$/,
    view: 'payment-gateways',
    buildPath: () => '/app/accounting/payment-gateways'
  },

  // Check Run
  {
    pattern: /^\/app\/accounting\/check-run\/?$/,
    view: 'check-run',
    buildPath: () => '/app/accounting/check-run'
  },

  // Commission Run
  {
    pattern: /^\/app\/accounting\/commission-run\/?$/,
    view: 'commission-run',
    buildPath: () => '/app/accounting/commission-run'
  },

  // Parties
  {
    pattern: /^\/app\/parties\/([^/?#]+)\/?$/,
    view: 'parties',
    hasId: true,
    buildPath: (id) => `/app/parties/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^\/app\/parties\/?$/,
    view: 'parties',
    buildPath: () => '/app/parties'
  },

  // System - Users
  {
    pattern: /^\/app\/system\/users\/?$/,
    view: 'users',
    buildPath: () => '/app/system/users'
  },

  // System - Admin
  {
    pattern: /^\/app\/system\/admin\/?$/,
    view: 'system-admin',
    buildPath: () => '/app/system/admin'
  },

  // Orders
  {
    pattern: /^\/app\/orders\/?$/,
    view: 'orders',
    buildPath: () => '/app/orders'
  },

  // Manufacturing
  {
    pattern: /^\/app\/manufacturing\/?$/,
    view: 'manufacturing',
    buildPath: () => '/app/manufacturing'
  },

  // Inventory
  {
    pattern: /^\/app\/inventory\/?$/,
    view: 'inventory',
    buildPath: () => '/app/inventory'
  },

  // Test Page
  {
    pattern: /^\/app\/test\/?$/,
    view: 'test-page',
    buildPath: () => '/app/test'
  }
];

/**
 * Parses query string from standard or hash search
 */
export function parseQueryString(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!queryString) return result;
  
  const cleanQuery = queryString.startsWith('?') ? queryString.substring(1) : queryString;
  const searchParams = new URLSearchParams(cleanQuery);
  searchParams.forEach((val, key) => {
    // Exclude any sensitive keys if accidentally present
    const lowerKey = key.toLowerCase();
    if (!lowerKey.includes('password') && !lowerKey.includes('token') && !lowerKey.includes('secret')) {
      result[key] = val;
    }
  });
  return result;
}

/**
 * Builds query string from key-value map
 */
export function buildQueryString(params?: Record<string, string | null | undefined>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      searchParams.set(key, val);
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Extract clean application route path from browser URL.
 * Handles both `/react-app/app/...` and `.../#/app/...`.
 */
export function extractAppPath(location: Location): { path: string; queryString: string } {
  // 1. Check hash first (#/app/...)
  const hash = location.hash || '';
  if (hash.startsWith('#/app') || hash.startsWith('#/')) {
    const withoutHash = hash.substring(1); // removes '#'
    const [hPath, hQuery] = withoutHash.split('?');
    const normalizedPath = hPath.startsWith('/app') ? hPath : `/app${hPath}`;
    return {
      path: normalizedPath,
      queryString: hQuery || ''
    };
  }

  // 2. Check pathname (/react-app/app/... or /app/...)
  const pathname = location.pathname || '';
  const search = location.search || '';
  
  if (pathname.includes('/app/')) {
    const appIndex = pathname.indexOf('/app/');
    const appPath = pathname.substring(appIndex);
    return {
      path: appPath,
      queryString: search.startsWith('?') ? search.substring(1) : search
    };
  }

  if (pathname.endsWith('/app')) {
    return {
      path: '/app/dashboard',
      queryString: search.startsWith('?') ? search.substring(1) : search
    };
  }

  // Default fallback
  return {
    path: '/app/dashboard',
    queryString: search.startsWith('?') ? search.substring(1) : search
  };
}

/**
 * Matches extracted application path to a ViewType and ID
 */
export function matchRoute(path: string, queryString: string): RouteMatch {
  const queryParams = parseQueryString(queryString);
  const normalizedPath = path.endsWith('/') && path.length > 5 ? path.slice(0, -1) : path;

  for (const route of ROUTES) {
    const match = normalizedPath.match(route.pattern);
    if (match) {
      const id = route.hasId && match[1] ? decodeURIComponent(match[1]) : undefined;
      return {
        view: route.view,
        id,
        queryParams,
        path: normalizedPath
      };
    }
  }

  // Default fallback to dashboard
  return {
    view: 'dashboard',
    queryParams,
    path: '/app/dashboard'
  };
}

/**
 * Build canonical application URL from ViewType, ID, and Query Params
 */
export function buildAppUrl(view: ViewType, id?: string, queryParams?: Record<string, string | null | undefined>): string {
  const route = ROUTES.find(r => {
    if (r.view !== view) return false;
    if (id !== undefined && id !== null && id !== '') {
      return r.hasId === true;
    }
    return !r.hasId;
  });

  const path = route ? route.buildPath(id) : '/app/dashboard';
  const qs = buildQueryString(queryParams);
  return `${path}${qs}`;
}
