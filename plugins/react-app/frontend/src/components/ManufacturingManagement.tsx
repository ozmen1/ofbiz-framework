import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  Factory,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  PlayCircle,
  Boxes,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Calendar,
  Building2
} from 'lucide-react';
import type { ViewType } from '../App';
import {
  ProductionRunListItem,
  ProductionRunKPIs,
  ProductBomGroup,
  RoutingItem,
  ManufacturingMetadata,
  fetchManufacturingMetadata,
  fetchProductionRuns,
  fetchProductBoms,
  fetchRoutings,
  deleteBomComponent
} from '../services/manufacturingService';
import { CreateProductionRunModal } from './CreateProductionRunModal';
import { ProductionRunDetailModal } from './ProductionRunDetailModal';
import { CreateBomComponentModal } from './CreateBomComponentModal';
import { CreateRoutingModal } from './CreateRoutingModal';

interface ManufacturingManagementProps {
  onNavigate?: (view: ViewType, id?: string) => void;
}

export const ManufacturingManagement: React.FC<ManufacturingManagementProps> = () => {
  const { translations } = useTranslation();
  const mTrans = translations.manufacturing;
  const common = translations.common;

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'productionRuns' | 'boms' | 'routings'>('productionRuns');

  // Metadata
  const [metadata, setMetadata] = useState<ManufacturingMetadata | null>(null);

  // Production Runs State
  const [runs, setRuns] = useState<ProductionRunListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [viewIndex, setViewIndex] = useState<number>(0);
  const [viewSize] = useState<number>(25);
  const [kpis, setKpis] = useState<ProductionRunKPIs>({
    totalRuns: 0,
    createdCount: 0,
    scheduledCount: 0,
    runningCount: 0,
    completedCount: 0
  });

  // Filter State
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');

  // BOMs State
  const [boms, setBoms] = useState<ProductBomGroup[]>([]);
  const [selectedBomProduct, setSelectedBomProduct] = useState<string>('');

  // Routings State
  const [routings, setRoutings] = useState<RoutingItem[]>([]);

  // Loading & Modals
  const [loading, setLoading] = useState<boolean>(false);
  const [isCreateRunOpen, setIsCreateRunOpen] = useState<boolean>(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [isAddBomOpen, setIsAddBomOpen] = useState<boolean>(false);
  const [isAddRoutingOpen, setIsAddRoutingOpen] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setViewIndex(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Metadata
  useEffect(() => {
    fetchManufacturingMetadata()
      .then(setMetadata)
      .catch(err => console.error('Failed to load manufacturing metadata:', err));
  }, []);

  // Load Production Runs
  const loadProductionRuns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProductionRuns({
        viewIndex,
        viewSize,
        statusId: statusFilter || undefined,
        facilityId: facilityFilter || undefined,
        query: debouncedQuery || undefined
      });
      setRuns(res.productionRuns);
      setTotalCount(res.totalCount);
      setKpis(res.kpis);
    } catch (err) {
      console.error('Failed to load production runs:', err);
    } finally {
      setLoading(false);
    }
  }, [viewIndex, viewSize, statusFilter, facilityFilter, debouncedQuery]);

  // Load BOMs
  const loadBoms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchProductBoms(selectedBomProduct || undefined);
      setBoms(res);
    } catch (err) {
      console.error('Failed to load BOMs:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBomProduct]);

  // Load Routings
  const loadRoutings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchRoutings();
      setRoutings(res);
    } catch (err) {
      console.error('Failed to load routings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger loads based on active tab
  useEffect(() => {
    if (activeTab === 'productionRuns') {
      loadProductionRuns();
    } else if (activeTab === 'boms') {
      loadBoms();
    } else if (activeTab === 'routings') {
      loadRoutings();
    }
  }, [activeTab, loadProductionRuns, loadBoms, loadRoutings]);

  // Memoized Filter Options
  const facilityFilterOptions = useMemo(() => {
    if (!metadata?.facilities) return null;
    return metadata.facilities.map(f => (
      <option key={f.facilityId} value={f.facilityId}>
        {f.facilityName}
      </option>
    ));
  }, [metadata?.facilities]);

  const statusFilterOptions = useMemo(() => {
    if (!metadata?.statuses) return null;
    return metadata.statuses.map(s => (
      <option key={s.statusId} value={s.statusId}>
        {s.description}
      </option>
    ));
  }, [metadata?.statuses]);

  // Helper for Status Badge
  const getStatusBadge = (statusId: string, desc: string) => {
    switch (statusId) {
      case 'PRUN_CREATED':
        return <span className="ds-badge ds-badge-neutral">{desc || mTrans.statusCreated}</span>;
      case 'PRUN_SCHEDULED':
      case 'PRUN_DOC_PRINTED':
        return <span className="ds-badge ds-badge-warning">{desc || mTrans.statusPrinted}</span>;
      case 'PRUN_RUNNING':
        return <span className="ds-badge ds-badge-info">{desc || mTrans.statusRunning}</span>;
      case 'PRUN_COMPLETED':
      case 'PRUN_CLOSED':
        return <span className="ds-badge ds-badge-success">{desc || mTrans.statusCompleted}</span>;
      case 'PRUN_CANCELLED':
        return <span className="ds-badge ds-badge-danger">{desc || mTrans.statusCancelled}</span>;
      default:
        return <span className="ds-badge ds-badge-neutral">{desc || statusId}</span>;
    }
  };

  const handleDeleteBomComponent = async (productId: string, componentId: string, fromDate: string) => {
    if (!window.confirm(mTrans.deleteBomConfirm)) return;
    try {
      await deleteBomComponent({ productId, componentId, fromDate });
      loadBoms();
    } catch (err) {
      console.error('Failed to delete BOM component:', err);
    }
  };

  const totalPages = Math.ceil(totalCount / viewSize) || 1;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title flex items-center gap-2.5">
            <Factory className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>{mTrans.title}</span>
          </h1>
          <p className="ds-page-subtitle">{mTrans.subtitle}</p>
        </div>

        <div className="ds-page-actions">
          {activeTab === 'productionRuns' && (
            <button
              type="button"
              onClick={() => setIsCreateRunOpen(true)}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{mTrans.newProductionRun}</span>
            </button>
          )}
          {activeTab === 'boms' && (
            <button
              type="button"
              onClick={() => setIsAddBomOpen(true)}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{mTrans.addComponent}</span>
            </button>
          )}
          {activeTab === 'routings' && (
            <button
              type="button"
              onClick={() => setIsAddRoutingOpen(true)}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{mTrans.addRouting}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards (Oracle Redwood Theme) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{mTrans.totalRuns}</span>
            <Factory className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="ds-stat-value text-indigo-600 dark:text-indigo-400">
            {kpis.totalRuns}
          </span>
          <span className="ds-stat-sub">{common.all}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-slate-400">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{mTrans.createdCount}</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="ds-stat-value text-slate-700 dark:text-slate-200">
            {kpis.createdCount}
          </span>
          <span className="ds-stat-sub">{mTrans.statusCreated}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{mTrans.scheduledCount}</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <span className="ds-stat-value text-amber-600 dark:text-amber-400">
            {kpis.scheduledCount}
          </span>
          <span className="ds-stat-sub">{mTrans.statusPrinted}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{mTrans.runningCount}</span>
            <PlayCircle className="w-4 h-4 text-blue-500" />
          </div>
          <span className="ds-stat-value text-blue-600 dark:text-blue-400">
            {kpis.runningCount}
          </span>
          <span className="ds-stat-sub">{mTrans.statusRunning}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{mTrans.completedCount}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="ds-stat-value text-emerald-600 dark:text-emerald-400">
            {kpis.completedCount}
          </span>
          <span className="ds-stat-sub">{mTrans.statusCompleted}</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="ds-tab-bar">
        <button
          type="button"
          onClick={() => setActiveTab('productionRuns')}
          className={`ds-tab ${activeTab === 'productionRuns' ? 'ds-tab-active' : ''}`}
        >
          <Factory className="w-4 h-4 mr-2 inline" />
          {mTrans.tabProductionRuns}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('boms')}
          className={`ds-tab ${activeTab === 'boms' ? 'ds-tab-active' : ''}`}
        >
          <Boxes className="w-4 h-4 mr-2 inline" />
          {mTrans.tabBoms}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('routings')}
          className={`ds-tab ${activeTab === 'routings' ? 'ds-tab-active' : ''}`}
        >
          <GitBranch className="w-4 h-4 mr-2 inline" />
          {mTrans.tabRoutings}
        </button>
      </div>

      {/* TAB 1: PRODUCTION RUNS */}
      {activeTab === 'productionRuns' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search Query */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`${common.search}...`}
                  className="ds-input pl-9"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-select w-auto min-w-[150px]"
              >
                <option value="">{mTrans.allStatuses}</option>
                {statusFilterOptions}
              </select>

              {/* Facility Filter */}
              <select
                value={facilityFilter}
                onChange={e => {
                  setFacilityFilter(e.target.value);
                  setViewIndex(0);
                }}
                className="ds-select w-auto min-w-[160px]"
              >
                <option value="">{mTrans.allFacilities}</option>
                {facilityFilterOptions}
              </select>
            </div>

            <button
              type="button"
              onClick={loadProductionRuns}
              className="ds-btn-ghost flex items-center gap-1.5 text-xs"
              title={common.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{common.refresh}</span>
            </button>
          </div>

          {/* Production Runs Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{mTrans.productionRunId}</th>
                    <th className="ds-th">{mTrans.workEffortName}</th>
                    <th className="ds-th">{mTrans.product}</th>
                    <th className="ds-th">{mTrans.facility}</th>
                    <th className="ds-th text-right">{mTrans.quantity}</th>
                    <th className="ds-th text-right">{mTrans.produced}</th>
                    <th className="ds-th">{mTrans.startDate}</th>
                    <th className="ds-th">{mTrans.status}</th>
                    <th className="ds-th text-right">{mTrans.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length > 0 ? (
                    runs.map(run => (
                      <tr key={run.productionRunId} className="ds-tbody-row">
                        <td className="ds-td ds-td-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {run.productionRunId}
                        </td>
                        <td className="ds-td font-medium text-slate-900 dark:text-white">
                          {run.workEffortName}
                        </td>
                        <td className="ds-td text-slate-900 dark:text-white">
                          <div>{run.productName || run.productId}</div>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {run.productId}
                          </span>
                        </td>
                        <td className="ds-td text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{run.facilityName || run.facilityId}</span>
                          </div>
                        </td>
                        <td className="ds-td text-right font-mono font-bold text-slate-900 dark:text-white">
                          {run.quantity}
                        </td>
                        <td className="ds-td text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {run.quantityProduced}
                        </td>
                        <td className="ds-td text-slate-500 dark:text-slate-400 font-mono text-xs">
                          {run.estimatedStartDate ? run.estimatedStartDate.slice(0, 16) : '-'}
                        </td>
                        <td className="ds-td">
                          {getStatusBadge(run.statusId, run.statusDesc)}
                        </td>
                        <td className="ds-td text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRunId(run.productionRunId);
                              setIsDetailOpen(true);
                            }}
                            className="ds-btn-secondary text-xs !py-1 !px-2.5 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{common.details}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                        {mTrans.noProductionRuns}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {mTrans.showing}: {viewIndex * viewSize + 1} -{' '}
                  {Math.min((viewIndex + 1) * viewSize, totalCount)} / {totalCount}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={viewIndex === 0}
                    onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
                    className="ds-btn-secondary !p-1.5 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {viewIndex + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={viewIndex >= totalPages - 1}
                    onClick={() => setViewIndex(prev => prev + 1)}
                    className="ds-btn-secondary !p-1.5 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BILL OF MATERIALS (BOM) */}
      {activeTab === 'boms' && (
        <div className="space-y-4">
          <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                {mTrans.selectFinishedGood}:
              </label>
              <select
                value={selectedBomProduct}
                onChange={e => setSelectedBomProduct(e.target.value)}
                className="ds-select w-auto min-w-[240px]"
              >
                <option value="">{mTrans.allFinishedGoods}</option>
                {boms.map(b => (
                  <option key={b.productId} value={b.productId}>
                    {b.productName} ({b.productId})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={loadBoms}
              className="ds-btn-ghost flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{common.refresh}</span>
            </button>
          </div>

          {/* BOM Groups List */}
          <div className="space-y-4">
            {boms.length > 0 ? (
              boms.map(bom => (
                <div key={bom.productId} className="ds-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {bom.productName}
                      </h3>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        ({bom.productId})
                      </span>
                      <span className="ds-badge ds-badge-neutral text-[11px]">
                        {bom.componentCount} {mTrans.componentCount}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddBomOpen(true)}
                      className="ds-btn-secondary text-xs !py-1 !px-2.5 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{mTrans.addComponent}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th w-16">{mTrans.sequence}</th>
                          <th className="ds-th">{mTrans.componentCode}</th>
                          <th className="ds-th">{mTrans.componentName}</th>
                          <th className="ds-th text-right">{mTrans.requiredQty}</th>
                          <th className="ds-th text-right">{mTrans.scrapFactor}</th>
                          <th className="ds-th text-right">{mTrans.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bom.components.map((comp, cIdx) => (
                          <tr key={`${comp.componentId}-${cIdx}`} className="ds-tbody-row">
                            <td className="ds-td ds-td-mono">{comp.sequenceNum}</td>
                            <td className="ds-td ds-td-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {comp.componentId}
                            </td>
                            <td className="ds-td text-slate-900 dark:text-white font-medium">
                              {comp.componentName}
                            </td>
                            <td className="ds-td text-right font-mono font-bold text-slate-900 dark:text-white">
                              {comp.quantity}
                            </td>
                            <td className="ds-td text-right font-mono text-slate-500 dark:text-slate-400">
                              {comp.scrapFactor}
                            </td>
                            <td className="ds-td text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteBomComponent(
                                    comp.productId,
                                    comp.componentId,
                                    comp.fromDate
                                  )
                                }
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title={common.delete}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="ds-card p-12 text-center text-slate-500 italic">
                {mTrans.noBoms}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ROUTINGS & WORK CENTERS */}
      {activeTab === 'routings' && (
        <div className="space-y-4">
          <div className="ds-card p-4 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {mTrans.routingSubtitle}
            </div>
            <button
              type="button"
              onClick={loadRoutings}
              className="ds-btn-ghost flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{common.refresh}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routings.length > 0 ? (
              routings.map(routing => (
                <div key={routing.routingId} className="ds-card overflow-hidden flex flex-col">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {routing.routingName}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {routing.description || routing.routingId}
                      </p>
                    </div>
                    <span className="ds-badge ds-badge-neutral text-xs">
                      {routing.taskCount} {mTrans.stepCount}
                    </span>
                  </div>

                  <div className="p-4 flex-1">
                    {routing.tasks.length > 0 ? (
                      <div className="space-y-3">
                        {routing.tasks.map((task, tIdx) => (
                          <div
                            key={task.taskId}
                            className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/50 text-xs"
                          >
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 w-6">
                              {task.sequenceNum || tIdx + 1}.
                            </span>
                            <div className="flex-1">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {task.taskName}
                              </div>
                              {task.description && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {task.description}
                                </div>
                              )}
                            </div>
                            <div className="text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {Math.round((task.estimatedSetupMillis + task.estimatedMilliSeconds) / 60000)} dk
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-500 italic text-xs">
                        {mTrans.noTasks}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="ds-card p-12 text-center text-slate-500 italic col-span-2">
                {mTrans.noRoutings}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Production Run Modal */}
      {isCreateRunOpen && (
        <CreateProductionRunModal
          isOpen={isCreateRunOpen}
          onClose={() => setIsCreateRunOpen(false)}
          onSuccess={newRunId => {
            loadProductionRuns();
            setSelectedRunId(newRunId);
            setIsDetailOpen(true);
          }}
          metadata={metadata}
        />
      )}

      {/* Production Run Detail Modal */}
      {isDetailOpen && selectedRunId && (
        <ProductionRunDetailModal
          productionRunId={selectedRunId}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedRunId(null);
          }}
          onStatusChanged={loadProductionRuns}
        />
      )}

      {/* Create BOM Component Modal */}
      {isAddBomOpen && (
        <CreateBomComponentModal
          isOpen={isAddBomOpen}
          onClose={() => setIsAddBomOpen(false)}
          onSuccess={loadBoms}
          targetProductId={selectedBomProduct || undefined}
          metadata={metadata}
        />
      )}

      {/* Create Routing Modal */}
      {isAddRoutingOpen && (
        <CreateRoutingModal
          isOpen={isAddRoutingOpen}
          onClose={() => setIsAddRoutingOpen(false)}
          onSuccess={loadRoutings}
        />
      )}
    </div>
  );
};
