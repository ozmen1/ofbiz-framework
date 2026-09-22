import { fetchApi } from './api';

export interface FeatureTypeItem {
  productFeatureTypeId: string;
  description: string;
}

export interface FeatureCategoryItem {
  productFeatureCategoryId: string;
  description: string;
  featureCount?: number;
}

export interface FeatureApplTypeItem {
  productFeatureApplTypeId: string;
  description: string;
}

export interface AssocTypeItem {
  productAssocTypeId: string;
  description: string;
}

export interface QuickProductItem {
  productId: string;
  productName: string;
  isVirtual: string;
  isVariant: string;
}

export interface VariantAssocMetadata {
  featureTypes: FeatureTypeItem[];
  featureCategories: FeatureCategoryItem[];
  featureApplTypes: FeatureApplTypeItem[];
  assocTypes: AssocTypeItem[];
  products: QuickProductItem[];
}

export interface ProductFeatureItem {
  productFeatureId: string;
  productFeatureTypeId: string;
  productFeatureTypeDesc?: string;
  productFeatureCategoryId?: string;
  productFeatureCategoryDesc?: string;
  description: string;
  idCode?: string;
  defaultAmount?: number;
  defaultSequenceNum?: number;
  applCount: number;
}

export interface ProductFeaturesResponse {
  features: ProductFeatureItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: {
    totalFeatures: number;
    totalFeatureCategories: number;
    totalFeatureAppls: number;
    totalAssocs: number;
  };
}

export interface ProductFeatureApplItem {
  productId: string;
  productFeatureId: string;
  featureDescription: string;
  productFeatureTypeId?: string;
  productFeatureTypeDesc?: string;
  productFeatureApplTypeId: string;
  productFeatureApplTypeDesc?: string;
  fromDate?: string;
  thruDate?: string;
  sequenceNum?: number;
  amount?: number;
}

export interface ProductAssocItem {
  productId: string;
  productIdTo: string;
  targetProductName?: string;
  targetIsVirtual?: string;
  targetIsVariant?: string;
  sourceProductName?: string;
  sourceIsVirtual?: string;
  sourceIsVariant?: string;
  productAssocTypeId: string;
  productAssocTypeDesc?: string;
  fromDate?: string;
  thruDate?: string;
  sequenceNum?: number;
  reason?: string;
  quantity?: number;
}

export interface ProductAssocsResponse {
  outgoingAssocs: ProductAssocItem[];
  incomingAssocs: ProductAssocItem[];
}

// ---------------- API FUNCTIONS ----------------

export async function fetchVariantAssocMetadata(): Promise<VariantAssocMetadata> {
  const res: any = await fetchApi('/react-app/control/getVariantAssocMetadata');
  const meta = res?.metadata || res || {};
  return {
    featureTypes: meta.featureTypes || [],
    featureCategories: meta.featureCategories || [],
    featureApplTypes: meta.featureApplTypes || [],
    assocTypes: meta.assocTypes || [],
    products: meta.products || [],
  };
}

export async function fetchProductFeatures(params?: {
  searchKeyword?: string;
  productFeatureTypeId?: string;
  productFeatureCategoryId?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<ProductFeaturesResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getProductFeatures${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    features: data.features || [],
    totalCount: data.totalCount || 0,
    viewIndex: data.viewIndex || 0,
    viewSize: data.viewSize || 50,
    metrics: data.metrics || {
      totalFeatures: 0,
      totalFeatureCategories: 0,
      totalFeatureAppls: 0,
      totalAssocs: 0,
    },
  };
}

export async function createProductFeature(payload: {
  productFeatureId?: string;
  productFeatureTypeId: string;
  productFeatureCategoryId?: string;
  description: string;
  idCode?: string;
  defaultAmount?: number;
  defaultSequenceNum?: number;
}): Promise<{ message: string; productFeatureId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductFeature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductFeature(payload: {
  productFeatureId: string;
  productFeatureTypeId?: string;
  productFeatureCategoryId?: string;
  description?: string;
  idCode?: string;
  defaultAmount?: number;
  defaultSequenceNum?: number;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductFeature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductFeature(productFeatureId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ productFeatureId });
  return await fetchApi('/react-app/control/deleteProductFeature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function fetchProductFeatureCategories(): Promise<{ categories: FeatureCategoryItem[] }> {
  const res: any = await fetchApi('/react-app/control/getProductFeatureCategories');
  return {
    categories: res?.categories || [],
  };
}

export async function createProductFeatureCategory(payload: {
  productFeatureCategoryId?: string;
  description: string;
}): Promise<{ message: string; productFeatureCategoryId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductFeatureCategory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function fetchProductFeaturesAppl(productId: string): Promise<{ featureAppls: ProductFeatureApplItem[] }> {
  const res: any = await fetchApi(`/react-app/control/getProductFeaturesAppl?productId=${encodeURIComponent(productId)}`);
  return {
    featureAppls: res?.featureAppls || [],
  };
}

export async function applyFeatureToProduct(payload: {
  productId: string;
  productFeatureId: string;
  productFeatureApplTypeId?: string;
  sequenceNum?: number;
  amount?: number;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/applyFeatureToProduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function removeFeatureFromProduct(payload: {
  productId: string;
  productFeatureId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/removeFeatureFromProduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function fetchProductAssocs(params: {
  productId?: string;
  productAssocTypeId?: string;
}): Promise<ProductAssocsResponse> {
  const query = new URLSearchParams();
  if (params.productId) query.append('productId', params.productId);
  if (params.productAssocTypeId) query.append('productAssocTypeId', params.productAssocTypeId);
  const qs = query.toString();

  const raw: any = await fetchApi(`/react-app/control/getProductAssocs${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    outgoingAssocs: data.outgoingAssocs || [],
    incomingAssocs: data.incomingAssocs || [],
  };
}

export async function createProductAssoc(payload: {
  productId: string;
  productIdTo: string;
  productAssocTypeId?: string;
  sequenceNum?: number;
  reason?: string;
  quantity?: number;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductAssoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductAssoc(payload: {
  productId: string;
  productIdTo: string;
  productAssocTypeId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/deleteProductAssoc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function quickCreateVariant(payload: {
  virtualProductId: string;
  variantProductId?: string;
  variantProductName: string;
  featureIds?: string;
  price?: number;
  currencyUomId?: string;
  description?: string;
}): Promise<{ message: string; variantProductId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/quickCreateVariant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}
