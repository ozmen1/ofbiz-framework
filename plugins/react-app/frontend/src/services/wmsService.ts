import { fetchApi } from './api';

export interface WmsMetadata {
  facilities: Array<{
    facilityId: string;
    facilityName: string;
    facilityTypeId?: string;
  }>;
  picklistStatuses: Array<{
    statusId: string;
    description: string;
    sequenceId?: string;
  }>;
  picklistItemStatuses: Array<{
    statusId: string;
    description: string;
  }>;
  shipmentMethods: Array<{
    shipmentMethodTypeId: string;
    description: string;
  }>;
  locations: Array<{
    facilityId: string;
    locationSeqId: string;
    locationTypeEnumId?: string;
    areaId?: string;
    aisleId?: string;
    sectionId?: string;
    levelId?: string;
    positionId?: string;
  }>;
}

export interface PicklistRow {
  picklistId: string;
  description: string;
  facilityId: string;
  facilityName: string;
  statusId: string;
  statusDescription: string;
  shipmentMethodTypeId?: string;
  picklistDate: string;
  createdDate: string;
  createdByUserLogin: string;
  binCount: number;
  itemCount: number;
  completedItemCount: number;
}

export interface PicklistsResponse {
  picklists: PicklistRow[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: {
    total: number;
    input: number;
    assigned: number;
    printed: number;
    picked: number;
    cancelled: number;
  };
}

export interface PicklistBinItem {
  picklistBinId: string;
  picklistId: string;
  binLocationNumber: number;
  primaryOrderId: string;
  primaryShipGroupSeqId: string;
}

export interface PicklistItemDetail {
  picklistBinId: string;
  orderId: string;
  orderItemSeqId: string;
  shipGroupSeqId: string;
  inventoryItemId: string;
  itemStatusId: string;
  itemStatusDescription: string;
  quantity: number;
  productId: string;
  productName: string;
  locationSeqId: string;
  aisleId: string;
  sectionId: string;
  levelId: string;
  positionId: string;
  lotId: string;
  serialNumber: string;
  expireDate: string;
}

export interface PicklistStatusHistoryItem {
  statusId: string;
  statusIdTo: string;
  fromDescription: string;
  toDescription: string;
  statusDate: string;
  changeByUserLoginId: string;
}

export interface PicklistDetailResponse {
  picklist: {
    picklistId: string;
    description: string;
    facilityId: string;
    facilityName: string;
    statusId: string;
    statusDescription: string;
    shipmentMethodTypeId: string;
    picklistDate: string;
    createdDate: string;
    createdByUserLogin: string;
    lastModifiedDate: string;
    lastModifiedByUserLogin: string;
  };
  bins: PicklistBinItem[];
  items: PicklistItemDetail[];
  statusHistory: PicklistStatusHistoryItem[];
}

export interface PickableOrder {
  orderId: string;
  orderName: string;
  orderDate: string;
  customerName: string;
  grandTotal: number;
  currencyUom: string;
  itemCount: number;
  totalQuantity: number;
  items: Array<{
    productId: string;
    itemDescription: string;
    quantity: number;
  }>;
}

export interface LotRow {
  lotId: string;
  creationDate: string;
  expirationDate: string;
  quantity: number;
  totalQoh: number;
  totalAtp: number;
  itemCount: number;
  productCount: number;
}

export interface LotsResponse {
  lots: LotRow[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: {
    totalLots: number;
    expiringCount: number;
  };
}

export interface InventoryItemHistoryRow {
  inventoryItemDetailSeqId: string;
  effectiveDate: string;
  quantityOnHandDiff: number;
  availableToPromiseDiff: number;
  unitCost: number | null;
  orderId: string;
  orderItemSeqId: string;
  shipmentId: string;
  workEffortId: string;
  receiptId: string;
  physicalInventoryId: string;
  description: string;
}

export interface InventoryItemHistoryResponse {
  item: {
    inventoryItemId: string;
    productId: string;
    productName: string;
    facilityId: string;
    locationSeqId: string;
    lotId: string;
    serialNumber: string;
    quantityOnHandTotal: number;
    availableToPromiseTotal: number;
    expireDate: string;
  };
  history: InventoryItemHistoryRow[];
}

// ---------------- API CALLS ----------------

export async function fetchWmsMetadata(): Promise<WmsMetadata> {
  const json: any = await fetchApi('/react-app/control/getWmsMetadata');
  return json.wmsMetadata;
}

export async function fetchPicklists(params?: {
  facilityId?: string;
  statusId?: string;
  search?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<PicklistsResponse> {
  const query = new URLSearchParams();
  if (params?.facilityId) query.set('facilityId', params.facilityId);
  if (params?.statusId) query.set('statusId', params.statusId);
  if (params?.search) query.set('search', params.search);
  if (params?.viewIndex !== undefined) query.set('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.set('viewSize', params.viewSize.toString());

  const json: any = await fetchApi(
    `/react-app/control/findPicklists?${query.toString()}`
  );
  return json.picklistData;
}

export async function fetchPicklistDetails(picklistId: string): Promise<PicklistDetailResponse> {
  const json: any = await fetchApi(
    `/react-app/control/getPicklistDetails?picklistId=${encodeURIComponent(picklistId)}`
  );
  return json.picklistDetail;
}

export async function fetchPickableOrders(facilityId?: string): Promise<PickableOrder[]> {
  const query = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : '';
  const json: any = await fetchApi(
    `/react-app/control/getPickableOrders${query}`
  );
  return json.pickableOrders?.orders || [];
}

export async function createPicklist(data: {
  facilityId: string;
  description: string;
  shipmentMethodTypeId?: string;
  orderIds?: string[];
}): Promise<{ picklistId: string }> {
  const formBody = new URLSearchParams();
  formBody.set('facilityId', data.facilityId);
  formBody.set('description', data.description);
  if (data.shipmentMethodTypeId) formBody.set('shipmentMethodTypeId', data.shipmentMethodTypeId);
  if (data.orderIds && data.orderIds.length > 0) {
    formBody.set('orderIds', data.orderIds.join(','));
  }

  const json: any = await fetchApi(
    '/react-app/control/createPicklist',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    }
  );
  return json.picklistResult;
}

export async function updatePicklistStatus(
  picklistId: string,
  statusId: string
): Promise<{ picklistId: string; statusId: string }> {
  const formBody = new URLSearchParams();
  formBody.set('picklistId', picklistId);
  formBody.set('statusId', statusId);

  const json: any = await fetchApi(
    '/react-app/control/updatePicklistStatus',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    }
  );
  return json.picklistResult;
}

export async function completePicklistItem(params: {
  picklistBinId: string;
  orderId: string;
  orderItemSeqId: string;
  shipGroupSeqId?: string;
  inventoryItemId?: string;
}): Promise<void> {
  const formBody = new URLSearchParams();
  formBody.set('picklistBinId', params.picklistBinId);
  formBody.set('orderId', params.orderId);
  formBody.set('orderItemSeqId', params.orderItemSeqId);
  if (params.shipGroupSeqId) formBody.set('shipGroupSeqId', params.shipGroupSeqId);
  if (params.inventoryItemId) formBody.set('inventoryItemId', params.inventoryItemId);

  await fetchApi('/react-app/control/completePicklistItem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
}

export async function fetchLots(params?: {
  search?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<LotsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.viewIndex !== undefined) query.set('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.set('viewSize', params.viewSize.toString());

  const json: any = await fetchApi(
    `/react-app/control/findLots?${query.toString()}`
  );
  return json.lotData;
}

export async function createLot(data: {
  lotId?: string;
  expirationDate?: string;
  quantity?: number;
}): Promise<{ lotId: string }> {
  const formBody = new URLSearchParams();
  if (data.lotId) formBody.set('lotId', data.lotId);
  if (data.expirationDate) formBody.set('expirationDate', data.expirationDate);
  if (data.quantity !== undefined) formBody.set('quantity', data.quantity.toString());

  const json: any = await fetchApi(
    '/react-app/control/createLot',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    }
  );
  return json.lotResult;
}

export async function fetchInventoryItemHistory(
  inventoryItemId: string
): Promise<InventoryItemHistoryResponse> {
  const json: any = await fetchApi(
    `/react-app/control/getInventoryItemHistory?inventoryItemId=${encodeURIComponent(inventoryItemId)}`
  );
  return json.inventoryItemHistory;
}

export async function updateInventoryItemTracking(data: {
  inventoryItemId: string;
  lotId?: string;
  serialNumber?: string;
  expireDate?: string;
  locationSeqId?: string;
}): Promise<void> {
  const formBody = new URLSearchParams();
  formBody.set('inventoryItemId', data.inventoryItemId);
  if (data.lotId !== undefined) formBody.set('lotId', data.lotId);
  if (data.serialNumber !== undefined) formBody.set('serialNumber', data.serialNumber);
  if (data.expireDate !== undefined) formBody.set('expireDate', data.expireDate);
  if (data.locationSeqId !== undefined) formBody.set('locationSeqId', data.locationSeqId);

  await fetchApi('/react-app/control/updateInventoryItemTracking', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
}
