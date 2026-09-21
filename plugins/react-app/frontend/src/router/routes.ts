import { ViewType } from '../App';
import { RouteMatch } from './types';

interface RouteDefinition {
  pattern: RegExp;
  view: ViewType;
  hasId?: boolean;
  buildPath: (id?: string) => string;
}

export const ROUTES: RouteDefinition[] = [
  // Dashboard
  {
    pattern: /^(?:\/app)?\/dashboard\/?$/,
    view: 'dashboard',
    buildPath: () => '/dashboard'
  },

  // Invoices
  {
    pattern: /^(?:\/app)?\/accounting\/invoices\/new\/?$/,
    view: 'create-invoice',
    buildPath: () => '/accounting/invoices/new'
  },
  {
    pattern: /^(?:\/app)?\/accounting\/invoices\/([^/?#]+)\/?$/,
    view: 'invoice-detail',
    hasId: true,
    buildPath: (id) => `/accounting/invoices/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^(?:\/app)?\/accounting\/invoices\/?$/,
    view: 'invoices',
    buildPath: () => '/accounting/invoices'
  },

  // Payments
  {
    pattern: /^(?:\/app)?\/accounting\/payments\/new\/?$/,
    view: 'create-payment',
    buildPath: () => '/accounting/payments/new'
  },
  {
    pattern: /^(?:\/app)?\/accounting\/payments\/([^/?#]+)\/?$/,
    view: 'payment-detail',
    hasId: true,
    buildPath: (id) => `/accounting/payments/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^(?:\/app)?\/accounting\/payments\/?$/,
    view: 'payments',
    buildPath: () => '/accounting/payments'
  },

  // Payment Groups
  {
    pattern: /^(?:\/app)?\/accounting\/payment-groups\/?$/,
    view: 'payment-groups',
    buildPath: () => '/accounting/payment-groups'
  },

  // Financial Accounts
  {
    pattern: /^(?:\/app)?\/accounting\/financial-accounts\/?$/,
    view: 'financial-accounts',
    buildPath: () => '/accounting/financial-accounts'
  },

  // Deposit Slips
  {
    pattern: /^(?:\/app)?\/accounting\/deposit-slips\/?$/,
    view: 'deposit-slips',
    buildPath: () => '/accounting/deposit-slips'
  },

  // Reports
  {
    pattern: /^(?:\/app)?\/accounting\/reports\/?$/,
    view: 'reports',
    buildPath: () => '/accounting/reports'
  },

  // Advanced Accounting
  {
    pattern: /^(?:\/app)?\/accounting\/advanced\/?$/,
    view: 'advanced-accounting',
    buildPath: () => '/accounting/advanced'
  },

  // Tax and GL Mapping
  {
    pattern: /^(?:\/app)?\/accounting\/tax-mapping\/?$/,
    view: 'tax-and-gl-mapping',
    buildPath: () => '/accounting/tax-mapping'
  },

  // Chart of Accounts
  {
    pattern: /^(?:\/app)?\/accounting\/chart-of-accounts\/?$/,
    view: 'chart-of-accounts',
    buildPath: () => '/accounting/chart-of-accounts'
  },

  // Journal Entries
  {
    pattern: /^(?:\/app)?\/accounting\/journal-entries\/new\/?$/,
    view: 'create-journal-entry',
    buildPath: () => '/accounting/journal-entries/new'
  },
  {
    pattern: /^(?:\/app)?\/accounting\/journal-entries\/([^/?#]+)\/?$/,
    view: 'journal-entries',
    hasId: true,
    buildPath: (id) => `/accounting/journal-entries/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^(?:\/app)?\/accounting\/journal-entries\/?$/,
    view: 'journal-entries',
    buildPath: () => '/accounting/journal-entries'
  },

  // Fiscal Periods
  {
    pattern: /^(?:\/app)?\/accounting\/fiscal-periods\/?$/,
    view: 'fiscal-periods',
    buildPath: () => '/accounting/fiscal-periods'
  },

  // FX Rates
  {
    pattern: /^(?:\/app)?\/accounting\/fx-rates\/?$/,
    view: 'fx-rates',
    buildPath: () => '/accounting/fx-rates'
  },

  // Cost Centers
  {
    pattern: /^(?:\/app)?\/accounting\/cost-centers\/?$/,
    view: 'cost-centers',
    buildPath: () => '/accounting/cost-centers'
  },

  // Accounting Preferences
  {
    pattern: /^(?:\/app)?\/accounting\/preferences\/?$/,
    view: 'accounting-preferences',
    buildPath: () => '/accounting/preferences'
  },

  // Payment Gateways
  {
    pattern: /^(?:\/app)?\/accounting\/payment-gateways\/?$/,
    view: 'payment-gateways',
    buildPath: () => '/accounting/payment-gateways'
  },

  // Check Run
  {
    pattern: /^(?:\/app)?\/accounting\/check-run\/?$/,
    view: 'check-run',
    buildPath: () => '/accounting/check-run'
  },

  // Commission Run
  {
    pattern: /^(?:\/app)?\/accounting\/commission-run\/?$/,
    view: 'commission-run',
    buildPath: () => '/accounting/commission-run'
  },

  // Parties
  {
    pattern: /^(?:\/app)?\/parties\/([^/?#]+)\/?$/,
    view: 'parties',
    hasId: true,
    buildPath: (id) => `/parties/${encodeURIComponent(id || '')}`
  },
  {
    pattern: /^(?:\/app)?\/parties\/?$/,
    view: 'parties',
    buildPath: () => '/parties'
  },

  // System - Users
  {
    pattern: /^(?:\/app)?\/system\/users\/?$/,
    view: 'users',
    buildPath: () => '/system/users'
  },

  // System - Admin
  {
    pattern: /^(?:\/app)?\/system\/admin\/?$/,
    view: 'system-admin',
    buildPath: () => '/system/admin'
  },

  // Orders
  {
    pattern: /^(?:\/app)?\/orders\/?$/,
    view: 'orders',
    buildPath: () => '/orders'
  },

  // Manufacturing
  {
    pattern: /^(?:\/app)?\/manufacturing\/?$/,
    view: 'manufacturing',
    buildPath: () => '/manufacturing'
  },

  // Inventory
  {
    pattern: /^(?:\/app)?\/inventory\/?$/,
    view: 'inventory',
    buildPath: () => '/inventory'
  },

  // Test Page
  {
    pattern: /^(?:\/app)?\/test\/?$/,
    view: 'test-page',
    buildPath: () => '/test'
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
 * Supports:
 * - Direct paths: `/react-app/accounting/invoices/10000` -> `/accounting/invoices/10000`
 * - Hash paths: `/react-app/#/accounting/invoices/10000` -> `/accounting/invoices/10000`
 * - Backward compat: `#/app/accounting/...` -> `/accounting/...`
 */
export function extractAppPath(location: Location): { path: string; queryString: string } {
  // 1. Check hash first (#/accounting/...)
  const hash = location.hash || '';
  if (hash.startsWith('#/')) {
    const withoutHash = hash.substring(1); // removes '#'
    const [hPath, hQuery] = withoutHash.split('?');
    // Strip leading /app if present for backward compatibility
    let normalized = hPath;
    if (normalized.startsWith('/app/')) {
      normalized = normalized.substring(4);
    } else if (normalized === '/app') {
      normalized = '/dashboard';
    }
    return {
      path: normalized || '/dashboard',
      queryString: hQuery || ''
    };
  }

  // 2. Check pathname (/react-app/accounting/... or /accounting/...)
  const pathname = location.pathname || '';
  const search = location.search || '';
  
  let cleanPath = pathname;
  // Remove /react-app base path if present
  if (cleanPath.startsWith('/react-app')) {
    cleanPath = cleanPath.substring('/react-app'.length);
  }
  // Strip /app prefix if present
  if (cleanPath.startsWith('/app/')) {
    cleanPath = cleanPath.substring(4);
  } else if (cleanPath === '/app') {
    cleanPath = '/dashboard';
  }

  if (!cleanPath || cleanPath === '/' || cleanPath === '') {
    cleanPath = '/dashboard';
  }

  return {
    path: cleanPath,
    queryString: search.startsWith('?') ? search.substring(1) : search
  };
}

/**
 * Matches extracted application path to a ViewType and ID
 */
export function matchRoute(path: string, queryString: string): RouteMatch {
  const queryParams = parseQueryString(queryString);
  let normalizedPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  if (normalizedPath.startsWith('/app/')) {
    normalizedPath = normalizedPath.substring(4);
  } else if (normalizedPath === '/app') {
    normalizedPath = '/dashboard';
  }
  if (!normalizedPath || normalizedPath === '/') {
    normalizedPath = '/dashboard';
  }

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
    path: '/dashboard'
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

  const path = route ? route.buildPath(id) : '/dashboard';
  const qs = buildQueryString(queryParams);
  return `${path}${qs}`;
}
