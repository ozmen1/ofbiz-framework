import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  PlayCircle,
  CheckCircle2,
  Clock,
  Layers,
  Boxes,
  Loader2,
  AlertCircle,
  Calendar,
  Building2,
  PackageCheck
} from 'lucide-react';
import {
  ProductionRunDetailData,
  fetchProductionRunDetails,
  changeProductionRunStatus,
  declareProductionRunCompletion
} from '../services/manufacturingService';

interface ProductionRunDetailModalProps {
  productionRunId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export const ProductionRunDetailModal: React.FC<ProductionRunDetailModalProps> = ({
  productionRunId,
  isOpen,
  onClose,
  onStatusChanged
}) => {
  const { translations } = useTranslation();
  const mTrans = translations.manufacturing;
  const common = translations.common;

  const [detail, setDetail] = useState<ProductionRunDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'tasks' | 'components' | 'declare'>('tasks');
  const [actionLoading, setActionLoading] = useState(false);

  // Declare & Produce form state
  const [declareQty, setDeclareQty] = useState<number>(0);
  const [declareLotId, setDeclareLotId] = useState<string>('');

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setSuccessMessage(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const loadDetails = useCallback(async () => {
    if (!productionRunId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProductionRunDetails(productionRunId);
      setDetail(data);
      const remaining = Math.max(0, data.productionRun.quantity - data.productionRun.quantityProduced);
      setDeclareQty(remaining > 0 ? remaining : data.productionRun.quantity);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : common.error;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [productionRunId, common.error]);

  useEffect(() => {
    if (isOpen && productionRunId) {
      loadDetails();
    }
  }, [isOpen, productionRunId, loadDetails]);

  if (!isOpen || !productionRunId) return null;

  const handleStatusChange = async (targetStatusId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      const res = await changeProductionRunStatus(productionRunId, targetStatusId);
      setSuccessMessage(res.successMessage);
      await loadDetails();
      onStatusChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : common.error;
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclareProduce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (declareQty <= 0) {
      setError(mTrans.declareQuantity);
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      const res = await declareProductionRunCompletion({
        productionRunId,
        quantity: declareQty,
        lotId: declareLotId.trim() || undefined
      });
      setSuccessMessage(res.successMessage);
      await loadDetails();
      onStatusChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : common.error;
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

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

  const run = detail?.productionRun;

  return (
    <div className="fixed inset-0 ds-overlay z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {run?.workEffortName || productionRunId}
                </h2>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  #{productionRunId}
                </span>
                {run && getStatusBadge(run.statusId, run.statusDesc)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {run?.productName || run?.productId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="ds-alert-error flex items-center gap-2 p-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-xs">{common.loading}</span>
            </div>
          ) : run ? (
            <>
              {/* Lifecycle Actions Bar */}
              <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {mTrans.lifecycleActions}:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {run.statusId === 'PRUN_CREATED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('PRUN_DOC_PRINTED')}
                      className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      {mTrans.confirmRun}
                    </button>
                  )}

                  {['PRUN_CREATED', 'PRUN_SCHEDULED', 'PRUN_DOC_PRINTED'].includes(run.statusId) && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('PRUN_RUNNING')}
                      className="ds-btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1.5"
                    >
                      <PlayCircle size={14} />
                      {mTrans.startRun}
                    </button>
                  )}

                  {run.statusId === 'PRUN_RUNNING' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('declare')}
                      className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5"
                    >
                      <PackageCheck size={14} />
                      {mTrans.declareProduce}
                    </button>
                  )}

                  {!['PRUN_COMPLETED', 'PRUN_CLOSED', 'PRUN_CANCELLED'].includes(run.statusId) && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('PRUN_CANCELLED')}
                      className="ds-btn-danger text-xs !py-1.5 !px-3 flex items-center gap-1.5"
                    >
                      {mTrans.cancelRun}
                    </button>
                  )}
                </div>
              </div>

              {/* General Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="ds-card p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {mTrans.product}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {run.productName || run.productId}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    {run.productId}
                  </div>
                </div>

                <div className="ds-card p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {mTrans.facility}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{run.facilityName || run.facilityId}</span>
                  </div>
                </div>

                <div className="ds-card p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {mTrans.quantity} / {mTrans.produced}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    <span className="text-emerald-600 dark:text-emerald-400">{run.quantityProduced}</span>
                    <span className="text-slate-400 font-normal"> / {run.quantity}</span>
                  </div>
                </div>

                <div className="ds-card p-4 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {mTrans.startDate}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{run.estimatedStartDate ? run.estimatedStartDate.slice(0, 16) : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Sub-tab Navigation */}
              <div className="ds-tab-bar">
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`ds-tab ${activeTab === 'tasks' ? 'ds-tab-active' : ''}`}
                >
                  <Clock className="w-4 h-4 mr-2 inline" />
                  {mTrans.tabTasks} ({detail?.tasks.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('components')}
                  className={`ds-tab ${activeTab === 'components' ? 'ds-tab-active' : ''}`}
                >
                  <Boxes className="w-4 h-4 mr-2 inline" />
                  {mTrans.tabComponents} ({detail?.components.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('declare')}
                  className={`ds-tab ${activeTab === 'declare' ? 'ds-tab-active' : ''}`}
                >
                  <PackageCheck className="w-4 h-4 mr-2 inline" />
                  {mTrans.tabDeclare}
                </button>
              </div>

              {/* Tab 1: Routing Tasks */}
              {activeTab === 'tasks' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th w-16">{mTrans.taskSequence}</th>
                          <th className="ds-th">{mTrans.taskName}</th>
                          <th className="ds-th">{mTrans.status}</th>
                          <th className="ds-th text-right">{mTrans.taskEstimatedTime}</th>
                          <th className="ds-th text-right">{mTrans.taskActualTime}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail?.tasks && detail.tasks.length > 0 ? (
                          detail.tasks.map(task => (
                            <tr key={task.workEffortId} className="ds-tbody-row">
                              <td className="ds-td ds-td-mono">{task.sequenceNum || '-'}</td>
                              <td className="ds-td font-medium text-slate-900 dark:text-white">
                                {task.workEffortName}
                                {task.description && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                    {task.description}
                                  </div>
                                )}
                              </td>
                              <td className="ds-td">
                                {getStatusBadge(task.statusId, task.statusDesc)}
                              </td>
                              <td className="ds-td text-right font-mono">
                                {Math.round((task.estimatedSetupMillis + task.estimatedMilliSeconds) / 60000)} dk
                              </td>
                              <td className="ds-td text-right font-mono">
                                {Math.round((task.actualSetupMillis + task.actualMilliSeconds) / 60000)} dk
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                              {mTrans.noTasks}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 2: BOM Components */}
              {activeTab === 'components' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{mTrans.componentCode}</th>
                          <th className="ds-th">{mTrans.componentName}</th>
                          <th className="ds-th text-right">{mTrans.requiredQty}</th>
                          <th className="ds-th text-right">{mTrans.issuedQty}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail?.components && detail.components.length > 0 ? (
                          detail.components.map((comp, idx) => (
                            <tr key={`${comp.productId}-${idx}`} className="ds-tbody-row">
                              <td className="ds-td ds-td-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                {comp.productId}
                              </td>
                              <td className="ds-td text-slate-900 dark:text-white">
                                {comp.productName}
                              </td>
                              <td className="ds-td text-right font-bold text-slate-900 dark:text-white font-mono">
                                {comp.estimatedQuantity}
                              </td>
                              <td className="ds-td text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {comp.issuedQuantity}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500 italic">
                              {mTrans.noComponents}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Declare & Produce */}
              {activeTab === 'declare' && (
                <div className="ds-card p-6 space-y-4 max-w-xl mx-auto">
                  <div className="flex items-center gap-2">
                    <PackageCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {mTrans.declareProduce}
                    </h3>
                  </div>

                  <form onSubmit={handleDeclareProduce} className="space-y-4 pt-2">
                    <div>
                      <label className="ds-label">{mTrans.declareQuantity} *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={declareQty}
                        onChange={e => setDeclareQty(parseFloat(e.target.value) || 0)}
                        className="ds-input font-mono font-bold text-base"
                        required
                      />
                    </div>

                    <div>
                      <label className="ds-label">{mTrans.declareLotId}</label>
                      <input
                        type="text"
                        value={declareLotId}
                        onChange={e => setDeclareLotId(e.target.value)}
                        placeholder="Örn: LOT-2026-09"
                        className="ds-input font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="ds-btn-primary w-full py-2.5 flex items-center justify-center gap-2"
                    >
                      {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Layers className="w-4 h-4" />
                      <span>{mTrans.declareButton}</span>
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ds-btn-secondary"
          >
            {common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
