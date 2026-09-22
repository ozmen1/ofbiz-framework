import { fetchApi } from './api';

export interface CatalogCategoryMetadata {
  catalogCategoryTypes: Array<{ prodCatalogCategoryTypeId: string; description: string }>;
  categoryTypes: Array<{ productCategoryTypeId: string; description: string }>;
  allCategories: Array<{ productCategoryId: string; categoryName: string }>;
  allCatalogs: Array<{ prodCatalogId: string; catalogName: string }>;
}

export interface CatalogCategoryItem {
  prodCatalogCategoryTypeId: string;
  prodCatalogCategoryTypeDesc?: string;
  productCategoryId: string;
  categoryName?: string;
  fromDate: string;
  thruDate?: string;
  sequenceNum?: number;
}

export interface CatalogItem {
  prodCatalogId: string;
  catalogName: string;
  useQuickAdd: string;
  viewAllowPermReqd: string;
  purchaseAllowPermReqd: string;
  categoryCount: number;
  categories: CatalogCategoryItem[];
}

export interface CategoryParentInfo {
  parentProductCategoryId: string;
  parentCategoryName: string;
  fromDate: string;
  thruDate?: string;
  sequenceNum?: number;
}

export interface CategoryListItem {
  productCategoryId: string;
  productCategoryTypeId: string;
  productCategoryTypeDesc?: string;
  categoryName: string;
  description?: string;
  longDescription?: string;
  memberCount: number;
  childCount: number;
  parentCategories: CategoryParentInfo[];
}

export interface CategoryTreeNode {
  productCategoryId: string;
  categoryName: string;
  description?: string;
  productCategoryTypeId: string;
  memberCount: number;
  children: CategoryTreeNode[];
}

export interface CategoryMemberItem {
  productCategoryId: string;
  productId: string;
  productName: string;
  productTypeId: string;
  productTypeDesc?: string;
  fromDate: string;
  thruDate?: string;
  sequenceNum?: number;
  quantity?: number;
}

export interface CategoryDetail {
  productCategoryId: string;
  productCategoryTypeId: string;
  productCategoryTypeDesc?: string;
  categoryName: string;
  description?: string;
  longDescription?: string;
  parentRollups: CategoryParentInfo[];
  childRollups: Array<{
    productCategoryId: string;
    categoryName: string;
    fromDate: string;
    thruDate?: string;
    sequenceNum?: number;
  }>;
  members: CategoryMemberItem[];
}

export interface CatalogsResponse {
  catalogs: CatalogItem[];
}

export interface CategoriesResponse {
  categories: CategoryListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: {
    totalCategories: number;
    rootCategories: number;
    totalMembers: number;
  };
}

export interface CategoryTreeResponse {
  categoryTree: CategoryTreeNode[];
}

// ---------------- API FUNCTIONS ----------------

export async function fetchCatalogCategoryMetadata(): Promise<CatalogCategoryMetadata> {
  const res: any = await fetchApi('/react-app/control/getCatalogCategoryMetadata');
  const meta = res?.metadata || res || {};
  return {
    catalogCategoryTypes: meta.catalogCategoryTypes || [],
    categoryTypes: meta.categoryTypes || [],
    allCategories: meta.categories || meta.allCategories || [],
    allCatalogs: meta.catalogs || meta.allCatalogs || [],
  };
}

export async function fetchCatalogs(): Promise<CatalogsResponse> {
  return await fetchApi('/react-app/control/getCatalogs');
}

export async function createProdCatalog(payload: {
  prodCatalogId?: string;
  catalogName: string;
  useQuickAdd?: string;
  viewAllowPermReqd?: string;
  purchaseAllowPermReqd?: string;
}): Promise<{ message: string; prodCatalogId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProdCatalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProdCatalog(payload: {
  prodCatalogId: string;
  catalogName: string;
  useQuickAdd?: string;
  viewAllowPermReqd?: string;
  purchaseAllowPermReqd?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProdCatalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProdCatalog(prodCatalogId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ prodCatalogId });
  return await fetchApi('/react-app/control/deleteProdCatalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function addCategoryToProdCatalog(payload: {
  prodCatalogId: string;
  productCategoryId: string;
  prodCatalogCategoryTypeId: string;
  fromDate?: string;
  sequenceNum?: number;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/addCategoryToProdCatalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function removeCategoryFromProdCatalog(payload: {
  prodCatalogId: string;
  productCategoryId: string;
  prodCatalogCategoryTypeId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/removeCategoryFromProdCatalog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function fetchCategories(params?: {
  productCategoryId?: string;
  categoryName?: string;
  productCategoryTypeId?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<CategoriesResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getCategories${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    categories: data.categoryList || data.categories || [],
    totalCount: data.totalCount || 0,
    viewIndex: data.viewIndex || 0,
    viewSize: data.viewSize || 20,
    metrics: {
      totalCategories: data.metrics?.totalCategories || 0,
      rootCategories: data.metrics?.rootCategories || 0,
      totalMembers: data.metrics?.totalMembers || 0,
    },
  };
}

export async function fetchCategoryTree(): Promise<CategoryTreeResponse> {
  return await fetchApi('/react-app/control/getCategoryTree');
}

export async function fetchCategoryDetail(productCategoryId: string): Promise<CategoryDetail> {
  const res: any = await fetchApi(`/react-app/control/getCategoryDetail?productCategoryId=${encodeURIComponent(productCategoryId)}`);
  return res?.categoryDetail || res;
}

export async function createProductCategory(payload: {
  productCategoryId?: string;
  productCategoryTypeId?: string;
  categoryName: string;
  description?: string;
  longDescription?: string;
  parentProductCategoryId?: string;
}): Promise<{ message: string; productCategoryId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductCategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductCategory(payload: {
  productCategoryId: string;
  productCategoryTypeId?: string;
  categoryName: string;
  description?: string;
  longDescription?: string;
  parentProductCategoryId?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductCategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductCategory(productCategoryId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ productCategoryId });
  return await fetchApi('/react-app/control/deleteProductCategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function addCategoryProductMember(payload: {
  productCategoryId: string;
  productId: string;
  fromDate?: string;
  sequenceNum?: number;
  quantity?: number;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/addCategoryProductMember', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function removeCategoryProductMember(payload: {
  productCategoryId: string;
  productId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/removeCategoryProductMember', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}
