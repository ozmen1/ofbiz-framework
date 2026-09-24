import { fetchApi } from './api';

export interface ShipmentListItem {
  shipmentId: string;
  shipmentTypeId: string;
  shipmentTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  primaryOrderId?: string;
  partyIdFrom?: string;
  partyIdTo?: string;
  originFacilityId?: string;
  originFacilityName?: string;
  destinationFacilityId?: string;
  destinationFacilityName?: string;
  estimatedShipDate?: string;
  estimatedArrivalDate?: string;
  createdDate?: string;
  itemCount: number;
  carrierPartyId?: string;
  trackingIdNumber?: string;
}

export interface ShipmentKPIs {
  totalShipments: number;
  salesShipments: number;
  purchaseShipments: number;
  inTransitCount: number;
  deliveredCount: number;
  pendingCount: number;
}

export interface ShipmentMetadata {
  shipmentTypes: Array<{ shipmentTypeId: string; description: string }>;
  shipmentStatuses: Array<{ statusId: string; description: string; statusTypeId: string }>;
  facilities: Array<{ facilityId: string; facilityName: string }>;
  parties: Array<{ partyId: string; name: string }>;
  carriers: Array<{ carrierPartyId: string; carrierName: string }>;
}

export interface ShipmentItemRecord {
  shipmentItemSeqId: string;
  productId: string;
  productName?: string;
  quantity: number;
}

export interface ShipmentRouteRecord {
  shipmentRouteSegmentId: string;
  carrierPartyId?: string;
  carrierServiceCode?: string;
  shipmentMethodTypeId?: string;
  trackingIdNumber?: string;
  actualStartDate?: string;
  actualArrivalDate?: string;
  actualCost: number;
}

export interface ShipmentReceiptRecord {
  receiptId: string;
  productId: string;
  orderId?: string;
  orderItemSeqId?: string;
  inventoryItemId?: string;
  quantityAccepted: number;
  quantityRejected: number;
  datetimeReceived?: string;
}

export interface ShipmentHeaderRecord {
  shipmentId: string;
  shipmentTypeId: string;
  shipmentTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  primaryOrderId?: string;
  partyIdFrom?: string;
  partyIdTo?: string;
  originFacilityId?: string;
  originFacilityName?: string;
  destinationFacilityId?: string;
  destinationFacilityName?: string;
  estimatedShipDate?: string;
  estimatedArrivalDate?: string;
  handlingInstructions?: string;
  createdDate?: string;
}

export interface ShipmentDetailResponse {
  shipmentHeader: ShipmentHeaderRecord;
  shipmentItems: ShipmentItemRecord[];
  shipmentRoutes: ShipmentRouteRecord[];
  shipmentReceipts: ShipmentReceiptRecord[];
}

export interface CreateShipmentPayload {
  shipmentTypeId: string;
  primaryOrderId?: string;
  partyIdFrom?: string;
  partyIdTo?: string;
  originFacilityId?: string;
  destinationFacilityId?: string;
  estimatedShipDate?: string;
  estimatedArrivalDate?: string;
  handlingInstructions?: string;
  carrierPartyId?: string;
  trackingIdNumber?: string;
  items: Array<{ productId: string; quantity: number }>;
}

export interface ReceivePOItemInput {
  orderItemSeqId: string;
  productId: string;
  quantityAccepted: number;
  quantityRejected?: number;
}

export interface ReceivePOInventoryPayload {
  orderId: string;
  facilityId: string;
  locationSeqId?: string;
  comments?: string;
  items: ReceivePOItemInput[];
}

// ─── API CALLS ────────────────────────────────────────────────────────────────

export async function fetchShipmentMetadata(): Promise<ShipmentMetadata> {
  return await fetchApi('/react-app/control/getShipmentMetadata');
}

export async function fetchShipments(params?: {
  shipmentTypeId?: string;
  statusId?: string;
  primaryOrderId?: string;
  searchKeyword?: string;
  originFacilityId?: string;
  destinationFacilityId?: string;
  fromDate?: string;
  thruDate?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<{
  shipments: ShipmentListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  kpis: ShipmentKPIs;
}> {
  const query = new URLSearchParams();
  if (params?.shipmentTypeId) query.append('shipmentTypeId', params.shipmentTypeId);
  if (params?.statusId) query.append('statusId', params.statusId);
  if (params?.primaryOrderId) query.append('primaryOrderId', params.primaryOrderId);
  if (params?.searchKeyword) query.append('searchKeyword', params.searchKeyword);
  if (params?.originFacilityId) query.append('originFacilityId', params.originFacilityId);
  if (params?.destinationFacilityId) query.append('destinationFacilityId', params.destinationFacilityId);
  if (params?.fromDate) query.append('fromDate', params.fromDate);
  if (params?.thruDate) query.append('thruDate', params.thruDate);
  if (params?.viewIndex !== undefined) query.append('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.append('viewSize', params.viewSize.toString());

  const qs = query.toString();
  return await fetchApi(`/react-app/control/findShipments${qs ? `?${qs}` : ''}`);
}

export async function fetchShipmentDetail(shipmentId: string): Promise<ShipmentDetailResponse> {
  return await fetchApi(`/react-app/control/getShipmentDetail?shipmentId=${encodeURIComponent(shipmentId)}`);
}

export async function createShipment(payload: CreateShipmentPayload): Promise<{ shipmentId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('shipmentTypeId', payload.shipmentTypeId);
  if (payload.primaryOrderId) form.append('primaryOrderId', payload.primaryOrderId);
  if (payload.partyIdFrom) form.append('partyIdFrom', payload.partyIdFrom);
  if (payload.partyIdTo) form.append('partyIdTo', payload.partyIdTo);
  if (payload.originFacilityId) form.append('originFacilityId', payload.originFacilityId);
  if (payload.destinationFacilityId) form.append('destinationFacilityId', payload.destinationFacilityId);
  if (payload.estimatedShipDate) form.append('estimatedShipDate', payload.estimatedShipDate);
  if (payload.estimatedArrivalDate) form.append('estimatedArrivalDate', payload.estimatedArrivalDate);
  if (payload.handlingInstructions) form.append('handlingInstructions', payload.handlingInstructions);
  if (payload.carrierPartyId) form.append('carrierPartyId', payload.carrierPartyId);
  if (payload.trackingIdNumber) form.append('trackingIdNumber', payload.trackingIdNumber);
  form.append('items', JSON.stringify(payload.items));

  return await fetchApi('/react-app/control/createShipment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function updateShipmentStatus(payload: {
  shipmentId: string;
  statusId: string;
}): Promise<{ shipmentId: string; statusId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('shipmentId', payload.shipmentId);
  form.append('statusId', payload.statusId);

  return await fetchApi('/react-app/control/updateShipmentStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function updateShipmentRoute(payload: {
  shipmentId: string;
  carrierPartyId?: string;
  trackingIdNumber?: string;
  carrierServiceCode?: string;
}): Promise<{ shipmentId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('shipmentId', payload.shipmentId);
  if (payload.carrierPartyId) form.append('carrierPartyId', payload.carrierPartyId);
  if (payload.trackingIdNumber) form.append('trackingIdNumber', payload.trackingIdNumber);
  if (payload.carrierServiceCode) form.append('carrierServiceCode', payload.carrierServiceCode);

  return await fetchApi('/react-app/control/updateShipmentRoute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function receivePOInventory(payload: ReceivePOInventoryPayload): Promise<{ orderId: string; receiptCount: number; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('orderId', payload.orderId);
  form.append('facilityId', payload.facilityId);
  if (payload.locationSeqId) form.append('locationSeqId', payload.locationSeqId);
  if (payload.comments) form.append('comments', payload.comments);
  form.append('items', JSON.stringify(payload.items));

  return await fetchApi('/react-app/control/receivePOInventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function quickShipOrder(payload: {
  orderId: string;
  originFacilityId?: string;
}): Promise<{ orderId: string; shipmentIds: string[]; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('orderId', payload.orderId);
  if (payload.originFacilityId) form.append('originFacilityId', payload.originFacilityId);

  return await fetchApi('/react-app/control/quickShipOrder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}
