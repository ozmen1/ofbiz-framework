import { fetchApi } from './api';

// ---------------- INTERFACES ----------------

export interface FacilityQuickItem {
  facilityId: string;
  facilityName: string;
  facilityTypeId?: string;
}

export interface FacilityLocationItem {
  facilityId: string;
  locationSeqId: string;
  locationTypeEnumId?: string;
  areaId?: string;
  aisleId?: string;
  sectionId?: string;
  levelId?: string;
  positionId?: string;
  itemCount?: number;
}

export interface StatusItemQuick {
  statusId: string;
  description: string;
}

export interface VarianceReasonItem {
  varianceReasonId: string;
  description: string;
}

export interface ProductContentTypeItem {
  productContentTypeId: string;
  description: string;
}

export interface ProductQuickItem {
  productId: string;
  productName: string;
}

export interface InventoryMediaConfigMetadata {
  facilities: FacilityQuickItem[];
  locations: FacilityLocationItem[];
  transferStatuses: StatusItemQuick[];
  varianceReasons: VarianceReasonItem[];
  contentTypes: ProductContentTypeItem[];
  products: ProductQuickItem[];
}

// Inventory Items
export interface InventoryItemRow {
  inventoryItemId: string;
  inventoryItemTypeId: string;
  productId?: string;
  productName?: string;
  facilityId?: string;
  facilityName?: string;
  locationSeqId?: string;
  quantityOnHandTotal: number;
  availableToPromiseTotal: number;
  unitCost?: number;
  currencyUomId?: string;
  serialNumber?: string;
  lotId?: string;
  softIdentifier?: string;
  statusId?: string;
  datetimeReceived?: string;
  expireDate?: string;
}

export interface InventoryItemsResponse {
  items: InventoryItemRow[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: {
    totalInventoryItems: number;
    totalQoh: number;
    totalAtp: number;
    totalInventoryValue: number;
  };
}

// Inventory Transfers
export interface InventoryTransferRow {
  inventoryTransferId: string;
  statusId: string;
  inventoryItemId: string;
  productId?: string;
  productName?: string;
  facilityId?: string;
  facilityName?: string;
  locationSeqId?: string;
  facilityIdTo?: string;
  facilityNameTo?: string;
  locationSeqIdTo?: string;
  xferQty: number;
  sendDate?: string;
  receiveDate?: string;
  comments?: string;
}

export interface InventoryTransfersResponse {
  transfers: InventoryTransferRow[];
  totalCount: number;
}

// Product Media
export interface ProductStandardImages {
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  detailImageUrl?: string;
  originalImageUrl?: string;
}

export interface ProductContentRow {
  productId: string;
  contentId: string;
  productContentTypeId: string;
  fromDate?: string;
  thruDate?: string;
  sequenceNum?: number;
  contentName?: string;
  dataResourceId?: string;
  objectInfo?: string;
}

export interface ProductMediaResponse {
  productId: string;
  productName: string;
  standardImages: ProductStandardImages;
  contents: ProductContentRow[];
}

// Product Config Items
export interface ProductConfigOptionRow {
  configItemId: string;
  configOptionId: string;
  configOptionName: string;
  description?: string;
  sequenceNum?: number;
  fromDate?: string;
  thruDate?: string;
}

export interface ProductConfigItemRow {
  configItemId: string;
  configItemTypeId: string;
  configItemName: string;
  description?: string;
  longDescription?: string;
  imageUrl?: string;
  optionCount: number;
}

export interface ProductConfigItemsResponse {
  configItems: ProductConfigItemRow[];
  totalCount: number;
}

export interface ProductConfigItemDetailResponse {
  configItem: {
    configItemId: string;
    configItemTypeId: string;
    configItemName: string;
    description?: string;
    longDescription?: string;
    imageUrl?: string;
  };
  options: ProductConfigOptionRow[];
}

// ---------------- API FUNCTIONS ----------------

// 1. Metadata
export async function fetchInventoryMediaConfigMetadata(): Promise<InventoryMediaConfigMetadata> {
  const res: any = await fetchApi('/react-app/control/getInventoryMediaConfigMetadata');
  const meta = res?.metadata || res || {};
  return {
    facilities: meta.facilities || [],
    locations: meta.locations || [],
    transferStatuses: meta.transferStatuses || [],
    varianceReasons: meta.varianceReasons || [],
    contentTypes: meta.contentTypes || [],
    products: meta.products || [],
  };
}

// 2. Inventory Items
export async function fetchInventoryItems(params?: {
  facilityId?: string;
  productId?: string;
  locationSeqId?: string;
  searchKeyword?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<InventoryItemsResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getInventoryItems${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    items: data.items || [],
    totalCount: data.totalCount || 0,
    viewIndex: data.viewIndex || 0,
    viewSize: data.viewSize || 50,
    metrics: data.metrics || {
      totalInventoryItems: 0,
      totalQoh: 0,
      totalAtp: 0,
      totalInventoryValue: 0,
    },
  };
}

export async function createInventoryVariance(payload: {
  inventoryItemId: string;
  quantityOnHandVar?: number;
  availableToPromiseVar?: number;
  varianceReasonId: string;
  comments?: string;
}): Promise<{ message: string; physicalInventoryId?: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createInventoryVariance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// 3. Inventory Transfers
export async function fetchInventoryTransfers(params?: {
  statusId?: string;
  facilityId?: string;
}): Promise<InventoryTransfersResponse> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getInventoryTransfers${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    transfers: data.transfers || [],
    totalCount: data.totalCount || 0,
  };
}

export async function createInventoryTransfer(payload: {
  inventoryItemId: string;
  facilityId?: string;
  facilityIdTo: string;
  locationSeqId?: string;
  locationSeqIdTo?: string;
  xferQty: number;
  statusId?: string;
  comments?: string;
}): Promise<{ message: string; inventoryTransferId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createInventoryTransfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateInventoryTransferStatus(payload: {
  inventoryTransferId: string;
  statusId: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateInventoryTransferStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// 4. Facility Locations
export async function fetchFacilityLocations(facilityId?: string): Promise<{ locations: FacilityLocationItem[] }> {
  const query = new URLSearchParams();
  if (facilityId) query.append('facilityId', facilityId);
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getFacilityLocations${qs ? '?' + qs : ''}`);
  return {
    locations: raw?.locations || [],
  };
}

export async function createFacilityLocation(payload: {
  facilityId: string;
  locationSeqId?: string;
  locationTypeEnumId?: string;
  areaId?: string;
  aisleId?: string;
  sectionId?: string;
  levelId?: string;
  positionId?: string;
}): Promise<{ message: string; facilityId: string; locationSeqId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createFacilityLocation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteFacilityLocation(payload: {
  facilityId: string;
  locationSeqId: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams({
    facilityId: payload.facilityId,
    locationSeqId: payload.locationSeqId,
  });

  return await fetchApi('/react-app/control/deleteFacilityLocation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// 5. Product Media & Content
export async function fetchProductMedia(productId: string): Promise<ProductMediaResponse> {
  const query = new URLSearchParams({ productId });
  const raw: any = await fetchApi(`/react-app/control/getProductMedia?${query.toString()}`);
  const data = raw?.result || raw || {};
  return {
    productId: data.productId || productId,
    productName: data.productName || productId,
    standardImages: data.standardImages || {},
    contents: data.contents || [],
  };
}

export async function updateProductMediaUrls(payload: {
  productId: string;
  smallImageUrl?: string;
  mediumImageUrl?: string;
  largeImageUrl?: string;
  detailImageUrl?: string;
  originalImageUrl?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductMediaUrls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function addProductContent(payload: {
  productId: string;
  productContentTypeId?: string;
  contentName?: string;
  objectInfo: string;
  sequenceNum?: number;
}): Promise<{ message: string; contentId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/addProductContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function removeProductContent(payload: {
  productId: string;
  contentId: string;
  productContentTypeId: string;
  fromDate: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams({
    productId: payload.productId,
    contentId: payload.contentId,
    productContentTypeId: payload.productContentTypeId,
    fromDate: payload.fromDate,
  });

  return await fetchApi('/react-app/control/removeProductContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// 6. Product Config Items & Options
export async function fetchProductConfigItems(params?: {
  searchKeyword?: string;
}): Promise<ProductConfigItemsResponse> {
  const query = new URLSearchParams();
  if (params?.searchKeyword) {
    query.append('searchKeyword', params.searchKeyword);
  }
  const qs = query.toString();
  const raw: any = await fetchApi(`/react-app/control/getProductConfigItems${qs ? '?' + qs : ''}`);
  const data = raw?.result || raw || {};
  return {
    configItems: data.configItems || [],
    totalCount: data.totalCount || 0,
  };
}

export async function fetchProductConfigItemDetail(configItemId: string): Promise<ProductConfigItemDetailResponse> {
  const query = new URLSearchParams({ configItemId });
  const raw: any = await fetchApi(`/react-app/control/getProductConfigItemDetail?${query.toString()}`);
  const data = raw?.result || raw || {};
  return {
    configItem: data.configItem || {
      configItemId,
      configItemTypeId: 'MULTIPLE',
      configItemName: configItemId,
    },
    options: data.options || [],
  };
}

export async function createProductConfigItem(payload: {
  configItemId?: string;
  configItemTypeId?: string;
  configItemName: string;
  description?: string;
  longDescription?: string;
  imageUrl?: string;
}): Promise<{ message: string; configItemId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductConfigItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function updateProductConfigItem(payload: {
  configItemId: string;
  configItemTypeId?: string;
  configItemName?: string;
  description?: string;
  longDescription?: string;
  imageUrl?: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/updateProductConfigItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductConfigItem(configItemId: string): Promise<{ message: string }> {
  const body = new URLSearchParams({ configItemId });
  return await fetchApi('/react-app/control/deleteProductConfigItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function createProductConfigOption(payload: {
  configItemId: string;
  configOptionId?: string;
  configOptionName: string;
  description?: string;
  sequenceNum?: number;
}): Promise<{ message: string; configOptionId: string }> {
  const body = new URLSearchParams();
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      body.append(k, String(v));
    }
  });

  return await fetchApi('/react-app/control/createProductConfigOption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

export async function deleteProductConfigOption(payload: {
  configItemId: string;
  configOptionId: string;
}): Promise<{ message: string }> {
  const body = new URLSearchParams({
    configItemId: payload.configItemId,
    configOptionId: payload.configOptionId,
  });

  return await fetchApi('/react-app/control/deleteProductConfigOption', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}
