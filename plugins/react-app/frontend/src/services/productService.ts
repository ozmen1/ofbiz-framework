import { fetchApi } from './api';

export interface ProductMetadata {
  productTypes: Array<{ productTypeId: string; description: string }>;
  quantityUoms: Array<{ uomId: string; description: string }>;
  currencyUoms: Array<{ uomId: string; description: string }>;
  priceTypes: Array<{ productPriceTypeId: string; description: string }>;
  pricePurposes: Array<{ productPricePurposeId: string; description: string }>;
  identificationTypes: Array<{ goodIdentificationTypeId: string; description: string }>;
  categories: Array<{ productCategoryId: string; categoryName: string }>;
}

export interface ProductListItem {
  productId: string;
  productTypeId: string;
  productTypeDesc: string;
  productName: string;
  internalName?: string;
  description?: string;
  isVirtual: string;
  isVariant: string;
  primaryProductCategoryId?: string;
  primaryCategoryName?: string;
  quantityUomId?: string;
  defaultPrice?: number;
  currencyUomId?: string;
  totalQoh: number;
  totalAtp: number;
  primarySku?: string;
  createdDate?: string;
}

export interface ProductMetrics {
  totalProducts: number;
  finishedGoods: number;
  services: number;
}

export interface ProductsResponse {
  productList: ProductListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: ProductMetrics;
}

export interface ProductPriceItem {
  productId: string;
  productPriceTypeId: string;
  productPriceTypeDesc?: string;
  productPricePurposeId: string;
  productPricePurposeDesc?: string;
  currencyUomId: string;
  productStoreGroupId?: string;
  fromDate: string;
  thruDate?: string;
  price: number;
  taxInPrice?: string;
}

export interface GoodIdentificationItem {
  goodIdentificationTypeId: string;
  goodIdentificationTypeDesc?: string;
  idValue: string;
}

export interface ProductAttributeItem {
  attrName: string;
  attrValue?: string;
  attrDescription?: string;
}

export interface FacilityInventoryItem {
  facilityId: string;
  facilityName: string;
  qoh: number;
  atp: number;
}

export interface ProductDetail {
  productId: string;
  productTypeId: string;
  productName: string;
  internalName?: string;
  description?: string;
  longDescription?: string;
  primaryProductCategoryId?: string;
  quantityUomId?: string;
  isVirtual: string;
  isVariant: string;
  taxable: string;
  chargeShipping: string;
  returnable: string;
  salesDiscontinuationDate?: string;
  createdDate?: string;
  prices: ProductPriceItem[];
  goodIdentifications: GoodIdentificationItem[];
  attributes: ProductAttributeItem[];
  inventoryByFacility: FacilityInventoryItem[];
}

export interface CreateProductPayload {
  productId?: string;
  productTypeId: string;
  productName: string;
  internalName?: string;
  description?: string;
  longDescription?: string;
  primaryProductCategoryId?: string;
  quantityUomId?: string;
  isVirtual?: string;
  isVariant?: string;
  taxable?: string;
  chargeShipping?: string;
  returnable?: string;
  defaultPrice?: number;
  currencyUomId?: string;
  taxInPrice?: string;
  primarySku?: string;
  goodIdentificationTypeId?: string;
}

export interface UpdateProductPayload {
  productId: string;
  productTypeId?: string;
  productName?: string;
  internalName?: string;
  description?: string;
  longDescription?: string;
  primaryProductCategoryId?: string;
  quantityUomId?: string;
  isVirtual?: string;
  isVariant?: string;
  taxable?: string;
  chargeShipping?: string;
  returnable?: string;
}

export async function fetchProductMetadata(): Promise<{ metadata: ProductMetadata }> {
  return await fetchApi('/react-app/control/getProductMetadata');
}

export async function fetchProducts(params: {
  searchKeyword?: string;
  productTypeId?: string;
  isVirtual?: string;
  primaryProductCategoryId?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<{ result: ProductsResponse }> {
  const query = new URLSearchParams();
  if (params.searchKeyword) query.append('searchKeyword', params.searchKeyword);
  if (params.productTypeId) query.append('productTypeId', params.productTypeId);
  if (params.isVirtual) query.append('isVirtual', params.isVirtual);
  if (params.primaryProductCategoryId) query.append('primaryProductCategoryId', params.primaryProductCategoryId);
  if (params.viewIndex !== undefined) query.append('viewIndex', String(params.viewIndex));
  if (params.viewSize !== undefined) query.append('viewSize', String(params.viewSize));

  return await fetchApi(`/react-app/control/getProducts?${query.toString()}`);
}

export async function fetchProductDetail(productId: string): Promise<{ productDetail: ProductDetail }> {
  return await fetchApi(`/react-app/control/getProductDetail?productId=${encodeURIComponent(productId)}`);
}

export async function createProduct(payload: CreateProductPayload): Promise<{ productId: string; message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProduct(payload: UpdateProductPayload): Promise<{ productId: string; message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProduct(productId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ productId });
  return await fetchApi('/react-app/control/deleteProduct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function createProductPrice(payload: {
  productId: string;
  productPriceTypeId: string;
  productPricePurposeId?: string;
  currencyUomId: string;
  price: number;
  taxInPrice?: string;
  fromDate?: string;
  thruDate?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductPrice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductPrice(payload: {
  productId: string;
  productPriceTypeId: string;
  productPricePurposeId?: string;
  currencyUomId: string;
  fromDate: string;
  price?: number;
  taxInPrice?: string;
  thruDate?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductPrice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductPrice(payload: {
  productId: string;
  productPriceTypeId: string;
  productPricePurposeId?: string;
  currencyUomId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/deleteProductPrice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function createGoodIdentification(payload: {
  productId: string;
  goodIdentificationTypeId: string;
  idValue: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/createGoodIdentification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteGoodIdentification(payload: {
  productId: string;
  goodIdentificationTypeId: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/deleteGoodIdentification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function saveProductAttribute(payload: {
  productId: string;
  attrName: string;
  attrValue?: string;
  attrDescription?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/saveProductAttribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductAttribute(payload: {
  productId: string;
  attrName: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams(payload);
  return await fetchApi('/react-app/control/deleteProductAttribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}
