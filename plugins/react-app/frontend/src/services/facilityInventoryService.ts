import { fetchApi } from './api';

export interface PhysicalInventoryItem {
  physicalInventoryId: string;
  physicalInventoryDate?: string;
  partyId?: string;
  generalComments?: string;
  inventoryItemId: string;
  productId?: string;
  productName?: string;
  facilityId?: string;
  facilityName?: string;
  locationSeqId?: string;
  lotId?: string;
  serialNumber?: string;
  varianceReasonId?: string;
  varianceReasonDesc?: string;
  quantityOnHandVar: number;
  availableToPromiseVar: number;
  comments?: string;
}

export interface VarianceReasonItem {
  varianceReasonId: string;
  description: string;
}

export interface FacilityItem {
  facilityId: string;
  facilityName: string;
  facilityTypeId: string;
  facilityTypeDesc?: string;
  ownerPartyId?: string;
  description?: string;
  facilitySize?: number;
  facilitySizeUomId?: string;
  openedDate?: string;
  closedDate?: string;
  locationCount: number;
  inventoryCount: number;
}

export interface FacilityTypeItem {
  facilityTypeId: string;
  description: string;
}

export interface StockAdjustmentPayload {
  inventoryItemId: string;
  varianceReasonId: string;
  countedQuantity?: number;
  quantityOnHandVar?: number;
  availableToPromiseVar?: number;
  comments?: string;
}

export interface DirectReceivePayload {
  productId: string;
  facilityId: string;
  quantityAccepted: number;
  locationSeqId?: string;
  lotId?: string;
  serialNumber?: string;
  unitCost?: number;
  comments?: string;
}

export interface FacilityPayload {
  facilityId?: string;
  facilityName: string;
  facilityTypeId: string;
  ownerPartyId?: string;
  description?: string;
  facilitySize?: number;
}

/**
 * Fetch physical inventory count and variance records
 */
export async function fetchPhysicalInventoryList(params?: {
  facilityId?: string;
  productId?: string;
  varianceReasonId?: string;
}): Promise<{ physicalInventories: PhysicalInventoryItem[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.facilityId) query.set('facilityId', params.facilityId);
  if (params?.productId) query.set('productId', params.productId);
  if (params?.varianceReasonId) query.set('varianceReasonId', params.varianceReasonId);

  const endpoint = `/control/getPhysicalInventoryList${query.toString() ? `?${query.toString()}` : ''}`;
  const res = (await fetchApi(endpoint)) as { physicalInventories?: PhysicalInventoryItem[]; totalCount?: number };
  return {
    physicalInventories: res.physicalInventories || [],
    totalCount: res.totalCount || 0,
  };
}

/**
 * Fetch all available variance reasons
 */
export async function fetchVarianceReasons(): Promise<VarianceReasonItem[]> {
  const res = (await fetchApi('/control/getVarianceReasons')) as { varianceReasons?: VarianceReasonItem[] };
  return res.varianceReasons || [];
}

/**
 * Submit a stock adjustment (physical count variance)
 */
export async function createStockAdjustment(payload: StockAdjustmentPayload): Promise<{
  physicalInventoryId: string;
  inventoryItemId: string;
  quantityOnHandVar: number;
}> {
  const res = (await fetchApi('/control/createStockAdjustment', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as {
    physicalInventoryId: string;
    inventoryItemId: string;
    quantityOnHandVar: number;
    _ERROR_MESSAGE_?: string;
  };

  if (res._ERROR_MESSAGE_) {
    throw new Error(res._ERROR_MESSAGE_);
  }
  return res;
}

/**
 * Direct receive inventory into facility
 */
export async function receiveDirectInventory(payload: DirectReceivePayload): Promise<{
  inventoryItemId: string;
}> {
  const res = (await fetchApi('/control/receiveDirectInventory', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as {
    inventoryItemId: string;
    _ERROR_MESSAGE_?: string;
  };

  if (res._ERROR_MESSAGE_) {
    throw new Error(res._ERROR_MESSAGE_);
  }
  return res;
}

/**
 * Fetch list of all facilities with counts
 */
export async function fetchFacilityList(): Promise<FacilityItem[]> {
  const res = (await fetchApi('/control/getFacilityList')) as {
    facilities?: FacilityItem[];
  };
  return res.facilities || [];
}

/**
 * Fetch list of facility types
 */
export async function fetchFacilityTypes(): Promise<FacilityTypeItem[]> {
  const res = (await fetchApi('/control/getFacilityTypes')) as {
    facilityTypes?: FacilityTypeItem[];
  };
  return res.facilityTypes || [];
}

/**
 * Create a new facility
 */
export async function createFacility(payload: FacilityPayload): Promise<{ facilityId: string }> {
  const res = (await fetchApi('/control/createFacility', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as {
    facilityId: string;
    _ERROR_MESSAGE_?: string;
  };

  if (res._ERROR_MESSAGE_) {
    throw new Error(res._ERROR_MESSAGE_);
  }
  return res;
}

/**
 * Update an existing facility
 */
export async function updateFacility(payload: FacilityPayload): Promise<void> {
  const res = (await fetchApi('/control/updateFacility', {
    method: 'POST',
    body: JSON.stringify(payload),
  })) as {
    _ERROR_MESSAGE_?: string;
  };

  if (res._ERROR_MESSAGE_) {
    throw new Error(res._ERROR_MESSAGE_);
  }
}
