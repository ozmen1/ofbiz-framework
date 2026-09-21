import React, { createContext, useContext, useState, useEffect, useCallback, useTransition } from 'react';
import { ViewType } from '../App';
import { RouterContextType, NavigationOptions } from './types';
import { extractAppPath, matchRoute, buildAppUrl, buildQueryString, parseQueryString } from './routes';

const RouterContext = createContext<RouterContextType | null>(null);

export const useRouter = (): RouterContextType => {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error('useRouter must be used within a RouterProvider');
  }
  return ctx;
};

interface RouterProviderProps {
  children: React.ReactNode;
  onViewChange?: (view: ViewType, id?: string) => void;
}

export const RouterProvider: React.FC<RouterProviderProps> = ({ children, onViewChange }) => {
  const [, startTransition] = useTransition();

  // Initial state derived from window.location
  const initialMatch = matchRoute(
    extractAppPath(window.location).path,
    extractAppPath(window.location).queryString
  );

  const [currentPath, setCurrentPath] = useState<string>(initialMatch.path);
  const [currentView, setCurrentView] = useState<ViewType>(initialMatch.view);
  const [currentId, setCurrentId] = useState<string | null>(initialMatch.id || null);
  const [queryParams, setQueryParamsState] = useState<Record<string, string>>(initialMatch.queryParams);

  // Sync internal state with browser URL
  const syncFromLocation = useCallback(() => {
    const { path, queryString } = extractAppPath(window.location);
    const matched = matchRoute(path, queryString);

    startTransition(() => {
      setCurrentPath(matched.path);
      setCurrentView(matched.view);
      setCurrentId(matched.id || null);
      setQueryParamsState(matched.queryParams);
    });

    if (onViewChange) {
      onViewChange(matched.view, matched.id);
    }
  }, [onViewChange]);

  // Listen to browser Back/Forward (popstate & hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      syncFromLocation();
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    // Initial sync
    syncFromLocation();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [syncFromLocation]);

  // Navigate to a specific View and optional ID
  const navigate = useCallback((view: ViewType, id?: string, options?: NavigationOptions) => {
    const targetParams = options?.params !== undefined ? options.params : queryParams;
    const cleanAppUrl = buildAppUrl(view, id, targetParams);
    
    // Construct canonical browser URL with hash-safe SPA support:
    // e.g. /react-app/#/app/accounting/invoices/10000?tab=attachments
    const targetBrowserUrl = `${window.location.pathname.replace(/\/+$/, '')}/#${cleanAppUrl}`;

    if (options?.replace) {
      window.history.replaceState({ view, id }, '', targetBrowserUrl);
    } else {
      window.history.pushState({ view, id }, '', targetBrowserUrl);
    }

    startTransition(() => {
      setCurrentPath(cleanAppUrl.split('?')[0]);
      setCurrentView(view);
      setCurrentId(id || null);
      if (options?.params !== undefined) {
        // Clean out undefined/null/empty
        const cleaned: Record<string, string> = {};
        Object.entries(options.params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') cleaned[k] = v;
        });
        setQueryParamsState(cleaned);
      }
    });

    if (onViewChange) {
      onViewChange(view, id);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [queryParams, onViewChange]);

  // Navigate to raw path e.g. /app/accounting/invoices/10000
  const navigateToPath = useCallback((fullPath: string, options?: NavigationOptions) => {
    const [pathPart, queryPart] = fullPath.split('?');
    const matched = matchRoute(pathPart, queryPart || '');
    navigate(matched.view, matched.id, {
      replace: options?.replace,
      params: queryPart ? parseQueryString(queryPart) : options?.params
    });
  }, [navigate]);

  // Update a single query parameter (e.g. status filter or active tab)
  const setQueryParam = useCallback((key: string, value: string | null | undefined, replace: boolean = true) => {
    const nextParams = { ...queryParams };
    if (value === null || value === undefined || value === '') {
      delete nextParams[key];
    } else {
      nextParams[key] = value;
    }

    const cleanPath = currentPath;
    const qs = buildQueryString(nextParams);
    const targetAppUrl = `${cleanPath}${qs}`;
    const targetBrowserUrl = `${window.location.pathname.replace(/\/+$/, '')}/#${targetAppUrl}`;

    if (replace) {
      window.history.replaceState({ view: currentView, id: currentId }, '', targetBrowserUrl);
    } else {
      window.history.pushState({ view: currentView, id: currentId }, '', targetBrowserUrl);
    }

    setQueryParamsState(nextParams);
  }, [currentPath, currentView, currentId, queryParams]);

  // Update multiple query parameters
  const setQueryParams = useCallback((params: Record<string, string | null | undefined>, replace: boolean = true) => {
    const nextParams = { ...queryParams };
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        delete nextParams[key];
      } else {
        nextParams[key] = value;
      }
    });

    const cleanPath = currentPath;
    const qs = buildQueryString(nextParams);
    const targetAppUrl = `${cleanPath}${qs}`;
    const targetBrowserUrl = `${window.location.pathname.replace(/\/+$/, '')}/#${targetAppUrl}`;

    if (replace) {
      window.history.replaceState({ view: currentView, id: currentId }, '', targetBrowserUrl);
    } else {
      window.history.pushState({ view: currentView, id: currentId }, '', targetBrowserUrl);
    }

    setQueryParamsState(nextParams);
  }, [currentPath, currentView, currentId, queryParams]);

  // Generate full shareable URL to copy and send to colleagues
  const getShareableUrl = useCallback(() => {
    const qs = buildQueryString(queryParams);
    const cleanAppUrl = `${currentPath}${qs}`;
    return `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}/#${cleanAppUrl}`;
  }, [currentPath, queryParams]);

  const contextValue: RouterContextType = {
    currentPath,
    currentView,
    currentId,
    queryParams,
    navigate,
    navigateToPath,
    setQueryParam,
    setQueryParams,
    getShareableUrl
  };

  return (
    <RouterContext.Provider value={contextValue}>
      {children}
    </RouterContext.Provider>
  );
};
