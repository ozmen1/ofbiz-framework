import { ViewType } from '../App';

export interface RouteMatch {
  view: ViewType;
  id?: string;
  queryParams: Record<string, string>;
  path: string;
}

export interface NavigationOptions {
  replace?: boolean;
  params?: Record<string, string | null | undefined>;
}

export interface RouterContextType {
  currentPath: string;
  currentView: ViewType;
  currentId: string | null;
  queryParams: Record<string, string>;
  navigate: (view: ViewType, id?: string, options?: NavigationOptions) => void;
  navigateToPath: (path: string, options?: NavigationOptions) => void;
  setQueryParam: (key: string, value: string | null | undefined, replace?: boolean) => void;
  setQueryParams: (params: Record<string, string | null | undefined>, replace?: boolean) => void;
  getShareableUrl: () => string;
}
