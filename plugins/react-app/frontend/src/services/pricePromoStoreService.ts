import { fetchApi } from './api';

// ---------------- INTERFACES ----------------

export interface PriceActionTypeItem {
  productPriceActionTypeId: string;
  description: string;
}

export interface EnumItem {
  enumId: string;
  description: string;
}

export interface CategoryQuickItem {
  productCategoryId: string;
  categoryName: string;
}

export interface CatalogQuickItem {
  prodCatalogId: string;
  catalogName: string;
}

export interface FacilityQuickItem {
  facilityId: string;
  facilityName: string;
}

export interface CurrencyItem {
  uomId: string;
}

export interface StoreQuickItem {
  productStoreId: string;
  storeName: string;
  companyName?: string;
  defaultCurrencyUomId?: string;
}

export interface PricePromoStoreMetadata {
  priceActionTypes: PriceActionTypeItem[];
  priceCondTypes: EnumItem[];
  promoActions: EnumItem[];
  promoConds: EnumItem[];
  promoOperators: EnumItem[];
  categories: CategoryQuickItem[];
  catalogs: CatalogQuickItem[];
  stores: StoreQuickItem[];
  facilities: FacilityQuickItem[];
  currencies: CurrencyItem[];
}

// Price Rules
export interface PriceRuleCondItem {
  productPriceRuleId: string;
  productPriceCondSeqId: string;
  inputParamEnumId: string;
  inputParamDesc?: string;
  operatorEnumId: string;
  operatorDesc?: string;
  condValue: string;
}

export interface PriceRuleActionItem {
  productPriceRuleId: string;
  productPriceActionSeqId: string;
  productPriceActionTypeId: string;
  actionTypeDesc?: string;
  amount: number;
  rateCode?: string;
}

export interface ProductPriceRuleItem {
  productPriceRuleId: string;
  ruleName: string;
  description?: string;
  isSale?: string;
  fromDate?: string;
  thruDate?: string;
  condCount: number;
  actionCount: number;
  createdStamp?: string;
}

export interface PriceRulesResponse {
  rules: ProductPriceRuleItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: {
    totalRules: number;
    saleRules: number;
    totalPromos: number;
    totalStores: number;
  };
}

export interface PriceRuleDetail {
  rule: ProductPriceRuleItem;
  conditions: PriceRuleCondItem[];
  actions: PriceRuleActionItem[];
}

// Promos
export interface PromoRuleActionItem {
  productPromoId: string;
  productPromoRuleId: string;
  productPromoActionSeqId: string;
  productPromoActionEnumId: string;
  actionDesc?: string;
  quantity?: number;
  amount?: number;
  productId?: string;
}

export interface PromoRuleCondItem {
  productPromoId: string;
  productPromoRuleId: string;
  productPromoCondSeqId: string;
  inputParamEnumId: string;
  inputParamDesc?: string;
  operatorEnumId: string;
  operatorDesc?: string;
  condValue?: string;
}

export interface PromoRuleItem {
  productPromoId: string;
  productPromoRuleId: string;
  ruleName: string;
  conds: PromoRuleCondItem[];
  actions: PromoRuleActionItem[];
}

export interface PromoCodeItem {
  productPromoCodeId: string;
  productPromoId: string;
  userEntered?: string;
  requireEmailOrParty?: string;
  useLimitPerCode?: number;
  useLimitPerCustomer?: number;
  fromDate?: string;
  thruDate?: string;
  createdStamp?: string;
}

export interface ProductPromoItem {
  productPromoId: string;
  promoName: string;
  promoText?: string;
  userEntered?: string;
  showToCustomer?: string;
  requireCode?: string;
  useLimitPerOrder?: number;
  useLimitPerCustomer?: number;
  useLimitPerPromotion?: number;
  fromDate?: string;
  thruDate?: string;
  codeCount: number;
  ruleCount: number;
  createdStamp?: string;
}

export interface ProductPromosResponse {
  promos: ProductPromoItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface ProductPromoDetail {
  promo: ProductPromoItem;
  rules: PromoRuleItem[];
  codes: PromoCodeItem[];
}

// Stores
export interface StoreCatalogItem {
  productStoreId: string;
  prodCatalogId: string;
  catalogName?: string;
  fromDate: string;
  thruDate?: string;
  sequenceNum?: number;
}

export interface ProductStoreItem {
  productStoreId: string;
  storeName: string;
  companyName?: string;
  title?: string;
  subtitle?: string;
  inventoryFacilityId?: string;
  facilityName?: string;
  payToPartyId?: string;
  defaultCurrencyUomId?: string;
  defaultLocaleString?: string;
  isDemoStore?: string;
  catalogCount: number;
  createdStamp?: string;
}

export interface ProductStoreDetail {
  store: ProductStoreItem;
  catalogs: StoreCatalogItem[];
}

// ---------------- API FUNCTIONS ----------------

export async function fetchPricePromoStoreMetadata(): Promise<PricePromoStoreMetadata> {
  const res: any = await fetchApi('/react-app/control/getPricePromoStoreMetadata');
  const meta = res?.metadata || res || {};
  return {
    priceActionTypes: meta.priceActionTypes || [],
    priceCondTypes: meta.priceCondTypes || [],
    promoActions: meta.promoActions || [],
    promoConds: meta.promoConds || [],
    promoOperators: meta.promoOperators || [],
    categories: meta.categories || [],
    catalogs: meta.catalogs || [],
    stores: meta.stores || [],
    facilities: meta.facilities || [],
    currencies: meta.currencies || [],
  };
}

// Price Rules
export async function fetchProductPriceRules(params?: {
  searchKeyword?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<PriceRulesResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getProductPriceRules${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    rules: data.rules || [],
    totalCount: data.totalCount || 0,
    viewIndex: data.viewIndex || 0,
    viewSize: data.viewSize || 50,
    metrics: data.metrics || {
      totalRules: 0,
      saleRules: 0,
      totalPromos: 0,
      totalStores: 0,
    },
  };
}

export async function fetchPriceRuleDetail(productPriceRuleId: string): Promise<PriceRuleDetail> {
  const query = new URLSearchParams({ productPriceRuleId });
  const raw: any = await fetchApi(`/react-app/control/getPriceRuleDetail?${query.toString()}`);
  return {
    rule: raw?.rule || {},
    conditions: raw?.conditions || [],
    actions: raw?.actions || [],
  };
}

export async function createProductPriceRule(payload: {
  productPriceRuleId?: string;
  ruleName: string;
  description?: string;
  isSale?: string;
  fromDate?: string;
  thruDate?: string;
}): Promise<{ message: string; productPriceRuleId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductPriceRule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductPriceRule(payload: {
  productPriceRuleId: string;
  ruleName?: string;
  description?: string;
  isSale?: string;
  fromDate?: string;
  thruDate?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductPriceRule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductPriceRule(productPriceRuleId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ productPriceRuleId });
  return await fetchApi('/react-app/control/deleteProductPriceRule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function createProductPriceCond(payload: {
  productPriceRuleId: string;
  inputParamEnumId: string;
  operatorEnumId: string;
  condValue: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductPriceCond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductPriceCond(
  productPriceRuleId: string,
  productPriceCondSeqId: string
): Promise<{ message: string }> {
  const body = new URLSearchParams({ productPriceRuleId, productPriceCondSeqId });
  return await fetchApi('/react-app/control/deleteProductPriceCond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function createProductPriceAction(payload: {
  productPriceRuleId: string;
  productPriceActionTypeId: string;
  amount: number;
  rateCode?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductPriceAction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductPriceAction(
  productPriceRuleId: string,
  productPriceActionSeqId: string
): Promise<{ message: string }> {
  const body = new URLSearchParams({ productPriceRuleId, productPriceActionSeqId });
  return await fetchApi('/react-app/control/deleteProductPriceAction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// Promos
export async function fetchProductPromos(params?: {
  searchKeyword?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<ProductPromosResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getProductPromos${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    promos: data.promos || [],
    totalCount: data.totalCount || 0,
    viewIndex: data.viewIndex || 0,
    viewSize: data.viewSize || 50,
  };
}

export async function fetchProductPromoDetail(productPromoId: string): Promise<ProductPromoDetail> {
  const query = new URLSearchParams({ productPromoId });
  const raw: any = await fetchApi(`/react-app/control/getProductPromoDetail?${query.toString()}`);
  return {
    promo: raw?.promo || {},
    rules: raw?.rules || [],
    codes: raw?.codes || [],
  };
}

export async function createProductPromo(payload: {
  productPromoId?: string;
  promoName: string;
  promoText?: string;
  userEntered?: string;
  showToCustomer?: string;
  requireCode?: string;
  useLimitPerOrder?: number;
  useLimitPerCustomer?: number;
  useLimitPerPromotion?: number;
  fromDate?: string;
  thruDate?: string;
}): Promise<{ message: string; productPromoId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductPromo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductPromo(payload: {
  productPromoId: string;
  promoName?: string;
  promoText?: string;
  userEntered?: string;
  showToCustomer?: string;
  requireCode?: string;
  useLimitPerOrder?: number;
  useLimitPerCustomer?: number;
  useLimitPerPromotion?: number;
  fromDate?: string;
  thruDate?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductPromo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductPromo(productPromoId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ productPromoId });
  return await fetchApi('/react-app/control/deleteProductPromo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function createProductPromoCode(payload: {
  productPromoId: string;
  productPromoCodeId: string;
  userEntered?: string;
  requireEmailOrParty?: string;
  useLimitPerCode?: number;
  useLimitPerCustomer?: number;
  fromDate?: string;
  thruDate?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductPromoCode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductPromoCode(productPromoCodeId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ productPromoCodeId });
  return await fetchApi('/react-app/control/deleteProductPromoCode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// Stores
export async function fetchProductStores(params?: {
  searchKeyword?: string;
}): Promise<{ stores: ProductStoreItem[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.searchKeyword) {
    query.append('searchKeyword', params.searchKeyword);
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getProductStores${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  const storeList = data.stores || raw?.stores || [];
  return {
    stores: storeList,
    totalCount: data.totalCount ?? raw?.totalCount ?? storeList.length,
  };
}

export async function fetchProductStoreDetail(productStoreId: string): Promise<ProductStoreDetail> {
  const query = new URLSearchParams({ productStoreId });
  const raw: any = await fetchApi(`/react-app/control/getProductStoreDetail?${query.toString()}`);
  return {
    store: raw?.store || {},
    catalogs: raw?.catalogs || [],
  };
}

export async function createProductStore(payload: {
  productStoreId?: string;
  storeName: string;
  companyName?: string;
  title?: string;
  subtitle?: string;
  inventoryFacilityId?: string;
  payToPartyId?: string;
  defaultCurrencyUomId?: string;
  defaultLocaleString?: string;
  isDemoStore?: string;
}): Promise<{ message: string; productStoreId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductStore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductStore(payload: {
  productStoreId: string;
  storeName?: string;
  companyName?: string;
  title?: string;
  subtitle?: string;
  inventoryFacilityId?: string;
  payToPartyId?: string;
  defaultCurrencyUomId?: string;
  defaultLocaleString?: string;
  isDemoStore?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductStore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function assignCatalogToStore(payload: {
  productStoreId: string;
  prodCatalogId: string;
  fromDate?: string;
  thruDate?: string;
  sequenceNum?: number;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/assignCatalogToStore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function removeCatalogFromStore(payload: {
  productStoreId: string;
  prodCatalogId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/removeCatalogFromStore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}
