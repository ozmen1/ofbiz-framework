import { fetchApi } from './api';

export interface OrderListItem {
  orderId: string;
  orderName?: string;
  orderTypeId: 'SALES_ORDER' | 'PURCHASE_ORDER' | string;
  orderTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  orderDate?: string;
  entryDate?: string;
  grandTotal: number;
  currencyUom?: string;
  partyId?: string;
  partyName?: string;
  itemCount: number;
}

export interface OrderKPIs {
  totalCount: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  approvedCount: number;
  approvedAmount: number;
  completedCount: number;
  completedAmount: number;
}

export interface OrderProductOption {
  productId: string;
  productName: string;
  defaultPrice: number;
  currencyUomId: string;
}

export interface OrderMetadata {
  orderTypes: Array<{ orderTypeId: string; description: string }>;
  orderStatuses: Array<{ statusId: string; description: string }>;
  itemStatuses: Array<{ statusId: string; description: string }>;
  productStores: Array<{ productStoreId: string; storeName: string }>;
  currencyUoms: Array<{ uomId: string; description?: string }>;
  parties: Array<{ partyId: string; name: string }>;
  products?: OrderProductOption[];
}

export interface OrderHeaderItem {
  orderId: string;
  orderName?: string;
  orderTypeId: string;
  orderTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  orderDate?: string;
  entryDate?: string;
  grandTotal: number;
  currencyUom?: string;
  productStoreId?: string;
  originFacilityId?: string;
  createdBy?: string;
}

export interface OrderItemRecord {
  orderItemSeqId: string;
  orderItemTypeId?: string;
  productId?: string;
  itemDescription?: string;
  quantity: number;
  cancelQuantity: number;
  unitPrice: number;
  itemTotal: number;
  statusId: string;
  statusDesc?: string;
  estimatedShipDate?: string;
  estimatedDeliveryDate?: string;
}

export interface OrderAdjustmentRecord {
  orderAdjustmentId: string;
  orderAdjustmentTypeId: string;
  amount: number;
  description?: string;
  comments?: string;
}

export interface OrderRoleRecord {
  partyId: string;
  partyName?: string;
  roleTypeId: string;
}

export interface OrderStatusRecord {
  orderStatusId: string;
  statusId: string;
  statusDesc?: string;
  statusDatetime?: string;
  statusUserLogin?: string;
  changeReason?: string;
}

export interface OrderLinkedInvoice {
  invoiceId: string;
  invoiceTypeId: string;
  invoiceTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  invoiceDate?: string;
  totalAmount: number;
}

export interface OrderLinkedShipment {
  shipmentId: string;
  shipmentTypeId: string;
  shipmentTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  estimatedShipDate?: string;
  createdDate?: string;
  carrierPartyId?: string;
  trackingIdNumber?: string;
}

export interface OrderLinkedReceipt {
  receiptId: string;
  orderItemSeqId: string;
  productId: string;
  productName?: string;
  quantityAccepted: number;
  quantityRejected: number;
  datetimeReceived?: string;
  inventoryItemId?: string;
  facilityId?: string;
}

export interface OrderDetailResponse {
  orderHeader: OrderHeaderItem;
  orderItems: OrderItemRecord[];
  orderAdjustments: OrderAdjustmentRecord[];
  orderRoles: OrderRoleRecord[];
  orderStatuses: OrderStatusRecord[];
  orderInvoices?: OrderLinkedInvoice[];
  orderShipments?: OrderLinkedShipment[];
  orderReceipts?: OrderLinkedReceipt[];
}

export async function fetchOrderMetadata(): Promise<OrderMetadata> {
  return await fetchApi('/react-app/control/getOrderMetadata');
}

export async function fetchOrders(params?: {
  orderTypeId?: string;
  statusId?: string;
  searchKeyword?: string;
  partyId?: string;
  fromDate?: string;
  thruDate?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<{
  orders: OrderListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  kpis: OrderKPIs;
}> {
  const query = new URLSearchParams();
  if (params?.orderTypeId) query.append('orderTypeId', params.orderTypeId);
  if (params?.statusId) query.append('statusId', params.statusId);
  if (params?.searchKeyword) query.append('searchKeyword', params.searchKeyword);
  if (params?.partyId) query.append('partyId', params.partyId);
  if (params?.fromDate) query.append('fromDate', params.fromDate);
  if (params?.thruDate) query.append('thruDate', params.thruDate);
  if (params?.viewIndex !== undefined) query.append('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.append('viewSize', params.viewSize.toString());

  const qs = query.toString();
  return await fetchApi(`/react-app/control/findOrders${qs ? `?${qs}` : ''}`);
}

export async function fetchOrderDetail(orderId: string): Promise<OrderDetailResponse> {
  return await fetchApi(`/react-app/control/getOrderDetail?orderId=${encodeURIComponent(orderId)}`);
}

export async function changeOrderStatus(payload: {
  orderId: string;
  statusId: string;
  setItemStatus?: string;
  changeReason?: string;
}): Promise<{ successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('orderId', payload.orderId);
  form.append('statusId', payload.statusId);
  if (payload.setItemStatus) form.append('setItemStatus', payload.setItemStatus);
  if (payload.changeReason) form.append('changeReason', payload.changeReason);

  return await fetchApi('/react-app/control/changeOrderStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  itemDescription?: string;
}

export interface CreateOrderPayload {
  orderTypeId: 'SALES_ORDER' | 'PURCHASE_ORDER' | string;
  partyId: string;
  orderName?: string;
  currencyUom?: string;
  productStoreId?: string;
  statusId?: string;
  orderDate?: string;
  shippingAmount?: number;
  taxAmount?: number;
  items: CreateOrderItemInput[];
}

export async function createOrder(payload: CreateOrderPayload): Promise<{ orderId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('orderTypeId', payload.orderTypeId);
  form.append('partyId', payload.partyId);
  if (payload.orderName) form.append('orderName', payload.orderName);
  if (payload.currencyUom) form.append('currencyUom', payload.currencyUom);
  if (payload.productStoreId) form.append('productStoreId', payload.productStoreId);
  if (payload.statusId) form.append('statusId', payload.statusId);
  if (payload.orderDate) form.append('orderDate', payload.orderDate);
  if (payload.shippingAmount !== undefined) form.append('shippingAmount', payload.shippingAmount.toString());
  if (payload.taxAmount !== undefined) form.append('taxAmount', payload.taxAmount.toString());
  form.append('items', JSON.stringify(payload.items));

  return await fetchApi('/react-app/control/createOrder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

// ─── QUOTES & RFQ ─────────────────────────────────────────────────────────────
export interface QuoteListItem {
  quoteId: string;
  quoteName?: string;
  quoteTypeId: string;
  quoteTypeDesc?: string;
  statusId: string;
  statusDesc?: string;
  partyId?: string;
  partyName?: string;
  issueDate?: string;
  validThruDate?: string;
  currencyUomId?: string;
  description?: string;
  itemCount: number;
  totalAmount: number;
}

export interface QuoteKPIs {
  totalQuotes: number;
  createdQuotes: number;
  approvedQuotes: number;
  orderedQuotes: number;
}

export interface QuoteMetadata {
  quoteTypes: Array<{ quoteTypeId: string; description: string }>;
  quoteStatuses: Array<{ statusId: string; description: string }>;
  productStores: Array<{ productStoreId: string; storeName: string }>;
  currencyUoms: Array<{ uomId: string; description?: string }>;
  parties: Array<{ partyId: string; name: string }>;
  products?: OrderProductOption[];
}

export interface QuoteItemRecord {
  quoteItemSeqId: string;
  productId?: string;
  productName?: string;
  quantity: number;
  quoteUnitPrice: number;
  lineTotal: number;
  comments?: string;
}

export interface QuoteRoleRecord {
  partyId: string;
  partyName?: string;
  roleTypeId: string;
}

export interface QuoteDetailResponse {
  quote: {
    quoteId: string;
    quoteName?: string;
    quoteTypeId: string;
    quoteTypeDesc?: string;
    statusId: string;
    statusDesc?: string;
    partyId?: string;
    partyName?: string;
    issueDate?: string;
    validThruDate?: string;
    currencyUomId?: string;
    productStoreId?: string;
    description?: string;
    grandTotal: number;
  };
  quoteItems: QuoteItemRecord[];
  quoteRoles: QuoteRoleRecord[];
}

export interface CreateQuoteItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  itemDescription?: string;
}

export interface CreateQuotePayload {
  quoteName?: string;
  quoteTypeId?: string;
  partyId: string;
  currencyUomId?: string;
  productStoreId?: string;
  description?: string;
  issueDate?: string;
  validThruDate?: string;
  statusId?: string;
  items: CreateQuoteItemInput[];
}

// ─── RETURNS / RMA ────────────────────────────────────────────────────────────
export interface ReturnListItem {
  returnId: string;
  returnHeaderTypeId: string;
  statusId: string;
  statusDesc?: string;
  fromPartyId?: string;
  fromPartyName?: string;
  toPartyId?: string;
  entryDate?: string;
  currencyUomId?: string;
  itemCount: number;
  totalAmount: number;
}

export interface ReturnKPIs {
  totalReturns: number;
  requestedCount: number;
  acceptedCount: number;
  completedCount: number;
}

export interface ReturnMetadata {
  returnHeaderTypes: Array<{ returnHeaderTypeId: string; description: string }>;
  returnStatuses: Array<{ statusId: string; description: string }>;
  returnReasons: Array<{ returnReasonId: string; description: string }>;
  returnTypes: Array<{ returnTypeId: string; description: string }>;
}

export interface ReturnItemRecord {
  returnItemSeqId: string;
  orderId?: string;
  orderItemSeqId?: string;
  productId?: string;
  description?: string;
  returnQuantity: number;
  returnPrice: number;
  lineTotal: number;
  returnReasonId?: string;
  returnTypeId?: string;
}

export interface ReturnDetailResponse {
  returnHeader: {
    returnId: string;
    returnHeaderTypeId: string;
    statusId: string;
    statusDesc?: string;
    fromPartyId?: string;
    toPartyId?: string;
    entryDate?: string;
    currencyUomId?: string;
    grandTotal: number;
  };
  returnItems: ReturnItemRecord[];
}

export interface CreateReturnItemInput {
  productId?: string;
  orderId?: string;
  orderItemSeqId?: string;
  returnQuantity: number;
  returnPrice: number;
  description?: string;
  returnReasonId?: string;
  returnTypeId?: string;
}

export interface CreateReturnPayload {
  returnHeaderTypeId?: string;
  fromPartyId: string;
  toPartyId?: string;
  currencyUomId?: string;
  orderId?: string;
  items: CreateReturnItemInput[];
}

// ─── API FUNCTIONS ────────────────────────────────────────────────────────────

// Quotes
export async function fetchQuoteMetadata(): Promise<QuoteMetadata> {
  return await fetchApi('/react-app/control/getQuoteMetadata');
}

export async function fetchQuotes(params?: {
  quoteTypeId?: string;
  statusId?: string;
  partyId?: string;
  searchKeyword?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<{
  quotes: QuoteListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  kpis: QuoteKPIs;
}> {
  const query = new URLSearchParams();
  if (params?.quoteTypeId) query.append('quoteTypeId', params.quoteTypeId);
  if (params?.statusId) query.append('statusId', params.statusId);
  if (params?.partyId) query.append('partyId', params.partyId);
  if (params?.searchKeyword) query.append('searchKeyword', params.searchKeyword);
  if (params?.viewIndex !== undefined) query.append('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.append('viewSize', params.viewSize.toString());

  const qs = query.toString();
  return await fetchApi(`/react-app/control/findQuotes${qs ? `?${qs}` : ''}`);
}

export async function fetchQuoteDetail(quoteId: string): Promise<QuoteDetailResponse> {
  return await fetchApi(`/react-app/control/getQuoteDetail?quoteId=${encodeURIComponent(quoteId)}`);
}

export async function createQuote(payload: CreateQuotePayload): Promise<{ quoteId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  if (payload.quoteName) form.append('quoteName', payload.quoteName);
  if (payload.quoteTypeId) form.append('quoteTypeId', payload.quoteTypeId);
  form.append('partyId', payload.partyId);
  if (payload.currencyUomId) form.append('currencyUomId', payload.currencyUomId);
  if (payload.productStoreId) form.append('productStoreId', payload.productStoreId);
  if (payload.description) form.append('description', payload.description);
  if (payload.issueDate) form.append('issueDate', payload.issueDate);
  if (payload.validThruDate) form.append('validThruDate', payload.validThruDate);
  if (payload.statusId) form.append('statusId', payload.statusId);
  form.append('items', JSON.stringify(payload.items));

  return await fetchApi('/react-app/control/createQuote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function changeQuoteStatus(payload: {
  quoteId: string;
  statusId: string;
}): Promise<{ quoteId: string; statusId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('quoteId', payload.quoteId);
  form.append('statusId', payload.statusId);

  return await fetchApi('/react-app/control/changeQuoteStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function createOrderFromQuote(quoteId: string): Promise<{ orderId: string; quoteId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('quoteId', quoteId);

  return await fetchApi('/react-app/control/createOrderFromQuote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

// Returns
export async function fetchReturnMetadata(): Promise<ReturnMetadata> {
  return await fetchApi('/react-app/control/getReturnMetadata');
}

export async function fetchReturns(params?: {
  returnHeaderTypeId?: string;
  statusId?: string;
  searchKeyword?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<{
  returns: ReturnListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  kpis: ReturnKPIs;
}> {
  const query = new URLSearchParams();
  if (params?.returnHeaderTypeId) query.append('returnHeaderTypeId', params.returnHeaderTypeId);
  if (params?.statusId) query.append('statusId', params.statusId);
  if (params?.searchKeyword) query.append('searchKeyword', params.searchKeyword);
  if (params?.viewIndex !== undefined) query.append('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.append('viewSize', params.viewSize.toString());

  const qs = query.toString();
  return await fetchApi(`/react-app/control/findReturns${qs ? `?${qs}` : ''}`);
}

export async function fetchReturnDetail(returnId: string): Promise<ReturnDetailResponse> {
  return await fetchApi(`/react-app/control/getReturnDetail?returnId=${encodeURIComponent(returnId)}`);
}

export async function createReturn(payload: CreateReturnPayload): Promise<{ returnId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  if (payload.returnHeaderTypeId) form.append('returnHeaderTypeId', payload.returnHeaderTypeId);
  form.append('fromPartyId', payload.fromPartyId);
  if (payload.toPartyId) form.append('toPartyId', payload.toPartyId);
  if (payload.currencyUomId) form.append('currencyUomId', payload.currencyUomId);
  if (payload.orderId) form.append('orderId', payload.orderId);
  form.append('items', JSON.stringify(payload.items));

  return await fetchApi('/react-app/control/createReturn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function updateReturnStatus(payload: {
  returnId: string;
  statusId: string;
}): Promise<{ returnId: string; statusId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('returnId', payload.returnId);
  form.append('statusId', payload.statusId);

  return await fetchApi('/react-app/control/updateReturnStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

// Quick Actions
export async function quickCreateInvoiceForOrder(orderId: string): Promise<{ invoiceId: string; orderId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('orderId', orderId);

  return await fetchApi('/react-app/control/quickCreateInvoiceForOrder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}

export async function quickCreateShipmentForOrder(orderId: string): Promise<{ shipmentId: string; orderId: string; successMessage?: string }> {
  const form = new URLSearchParams();
  form.append('orderId', orderId);

  return await fetchApi('/react-app/control/quickCreateShipmentForOrder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
}


