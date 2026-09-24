export interface ProductionRunKPIs {
  totalRuns: number;
  createdCount: number;
  scheduledCount: number;
  runningCount: number;
  completedCount: number;
}

export interface ProductionRunListItem {
  productionRunId: string;
  workEffortName: string;
  description: string;
  statusId: string;
  statusDesc: string;
  productId: string;
  productName: string;
  facilityId: string;
  facilityName: string;
  quantity: number;
  quantityProduced: number;
  quantityRejected: number;
  estimatedStartDate: string;
  estimatedCompletionDate: string;
  actualStartDate: string;
  actualCompletionDate: string;
  createdDate: string;
}

export interface ProductionRunTask {
  workEffortId: string;
  workEffortName: string;
  description: string;
  statusId: string;
  statusDesc: string;
  sequenceNum: number;
  estimatedSetupMillis: number;
  estimatedMilliSeconds: number;
  actualSetupMillis: number;
  actualMilliSeconds: number;
}

export interface ProductionRunComponent {
  workEffortId: string;
  productId: string;
  productName: string;
  estimatedQuantity: number;
  issuedQuantity: number;
  fromDate: string;
}

export interface ProductionRunDetailData {
  productionRun: ProductionRunListItem;
  tasks: ProductionRunTask[];
  components: ProductionRunComponent[];
}

export interface BomComponentItem {
  productId: string;
  componentId: string;
  componentName: string;
  quantity: number;
  scrapFactor: number;
  sequenceNum: number;
  fromDate: string;
  thruDate: string;
}

export interface ProductBomGroup {
  productId: string;
  productName: string;
  componentCount: number;
  components: BomComponentItem[];
}

export interface RoutingTaskItem {
  taskId: string;
  taskName: string;
  description: string;
  sequenceNum: number;
  estimatedSetupMillis: number;
  estimatedMilliSeconds: number;
}

export interface RoutingItem {
  routingId: string;
  routingName: string;
  description: string;
  taskCount: number;
  tasks: RoutingTaskItem[];
}

export interface ManufacturingMetadata {
  statuses: { statusId: string; description: string }[];
  facilities: { facilityId: string; facilityName: string }[];
  routings: { routingId: string; routingName: string; description: string }[];
  products: { productId: string; productName: string; productTypeId: string }[];
}

export interface ProductionRunFilterParams {
  viewIndex?: number;
  viewSize?: number;
  statusId?: string;
  productId?: string;
  facilityId?: string;
  query?: string;
}

const cleanJson = (text: string) => {
  return text.replace(/^\/\/\s*/, '');
};

export async function fetchManufacturingMetadata(): Promise<ManufacturingMetadata> {
  const resp = await fetch('/react-app/control/getManufacturingMetadata');
  if (!resp.ok) throw new Error('Metadata fetch failed');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  return {
    statuses: data.statuses || [],
    facilities: data.facilities || [],
    routings: data.routings || [],
    products: data.products || []
  };
}

export async function fetchProductionRuns(params: ProductionRunFilterParams = {}): Promise<{
  productionRuns: ProductionRunListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  kpis: ProductionRunKPIs;
}> {
  const query = new URLSearchParams();
  if (params.viewIndex !== undefined) query.set('viewIndex', String(params.viewIndex));
  if (params.viewSize !== undefined) query.set('viewSize', String(params.viewSize));
  if (params.statusId) query.set('statusId', params.statusId);
  if (params.productId) query.set('productId', params.productId);
  if (params.facilityId) query.set('facilityId', params.facilityId);
  if (params.query) query.set('query', params.query);

  const resp = await fetch(`/react-app/control/findProductionRuns?${query.toString()}`);
  if (!resp.ok) throw new Error('Production runs fetch failed');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  return {
    productionRuns: data.productionRuns || [],
    totalCount: data.totalCount || 0,
    viewIndex: data.viewIndex || 0,
    viewSize: data.viewSize || 25,
    kpis: data.kpis || {
      totalRuns: 0,
      createdCount: 0,
      scheduledCount: 0,
      runningCount: 0,
      completedCount: 0
    }
  };
}

export async function fetchProductionRunDetails(productionRunId: string): Promise<ProductionRunDetailData> {
  const resp = await fetch(`/react-app/control/getProductionRunDetails?productionRunId=${encodeURIComponent(productionRunId)}`);
  if (!resp.ok) throw new Error('Production run details fetch failed');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return {
    productionRun: data.productionRun,
    tasks: data.tasks || [],
    components: data.components || []
  };
}

export async function createProductionRun(payload: {
  productId: string;
  facilityId: string;
  quantity: number;
  startDate?: string;
  routingId?: string;
  workEffortName?: string;
  description?: string;
}): Promise<{ productionRunId: string; successMessage: string }> {
  const resp = await fetch('/react-app/control/createProductionRun', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to create production run');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return {
    productionRunId: data.productionRunId,
    successMessage: data.successMessage
  };
}

export async function changeProductionRunStatus(
  productionRunId: string,
  statusId: string
): Promise<{ newStatusId: string; successMessage: string }> {
  const resp = await fetch('/react-app/control/changeProductionRunStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productionRunId, statusId })
  });
  if (!resp.ok) throw new Error('Failed to update status');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return {
    newStatusId: data.newStatusId,
    successMessage: data.successMessage
  };
}

export async function declareProductionRunCompletion(payload: {
  productionRunId: string;
  quantity: number;
  lotId?: string;
}): Promise<{ inventoryItemIds: string[]; successMessage: string }> {
  const resp = await fetch('/react-app/control/declareProductionRunCompletion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to declare completion');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return {
    inventoryItemIds: data.inventoryItemIds || [],
    successMessage: data.successMessage
  };
}

export async function fetchProductBoms(productId?: string): Promise<ProductBomGroup[]> {
  const url = productId
    ? `/react-app/control/findProductBoms?productId=${encodeURIComponent(productId)}`
    : '/react-app/control/findProductBoms';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('Failed to fetch BOMs');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  return data.boms || [];
}

export async function createBomComponent(payload: {
  productId: string;
  componentId: string;
  quantity: number;
  scrapFactor?: number;
  sequenceNum?: number;
  fromDate?: string;
}): Promise<{ successMessage: string }> {
  const resp = await fetch('/react-app/control/createBomComponent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to create BOM component');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return { successMessage: data.successMessage };
}

export async function deleteBomComponent(payload: {
  productId: string;
  componentId: string;
  fromDate: string;
}): Promise<{ successMessage: string }> {
  const resp = await fetch('/react-app/control/deleteBomComponent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to delete BOM component');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return { successMessage: data.successMessage };
}

export async function fetchRoutings(): Promise<RoutingItem[]> {
  const resp = await fetch('/react-app/control/findRoutings');
  if (!resp.ok) throw new Error('Failed to fetch routings');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  return data.routings || [];
}

export async function createRouting(payload: {
  routingName: string;
  description?: string;
}): Promise<{ routingId: string; successMessage: string }> {
  const resp = await fetch('/react-app/control/createRouting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('Failed to create routing');
  const raw = await resp.text();
  const data = JSON.parse(cleanJson(raw));
  if (data._ERROR_MESSAGE_) throw new Error(data._ERROR_MESSAGE_);
  return {
    routingId: data.routingId,
    successMessage: data.successMessage
  };
}
