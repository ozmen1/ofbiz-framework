import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  TrendingUp,
  BarChart3,
  DollarSign,
  AlertCircle,
  Plus,
  RefreshCw,
  Check,
  History,
} from 'lucide-react';
import {
  api,
  BudgetVarianceReportResponse,
  BudgetRevisionItem,
  CreateBudgetRevisionPayload,
} from '../services/api';
import { useTranslation } from '../i18n';

interface BudgetVarianceModalProps {
  budgetId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onBudgetUpdated?: () => void;
}

export const BudgetVarianceModal: React.FC<BudgetVarianceModalProps> = ({
  budgetId,
  isOpen,
  onClose,
  onBudgetUpdated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.budgetAndAgreement.budget;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<'variance' | 'revisions'>('variance');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [varianceData, setVarianceData] = useState<BudgetVarianceReportResponse | null>(null);
  const [revisions, setRevisions] = useState<BudgetRevisionItem[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Revision modal form
  const [showRevForm, setShowRevForm] = useState<boolean>(false);
  const [revForm, setRevForm] = useState<CreateBudgetRevisionPayload>({
    budgetId: '',
    budgetItemSeqId: '',
    revisedAmount: 0,
    revisionReason: '',
    comments: '',
  });

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const fmt = useCallback((amount?: number | null) => {
    if (amount === undefined || amount === null) return '0.00';
    return new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 2,
    }).format(amount);
  }, [isTr]);

  const loadData = useCallback(async (bId: string) => {
    setLoading(true);
    try {
      const [vRes, rRes] = await Promise.allSettled([
        api.getBudgetVarianceReport(bId),
        api.getBudgetRevisions(bId),
      ]);
      if (vRes.status === 'fulfilled') {
        setVarianceData(vRes.value);
        if (vRes.value.items?.length > 0) {
          setRevForm(prev => ({ ...prev, budgetItemSeqId: vRes.value.items[0].budgetItemSeqId }));
        }
      }
      if (rRes.status === 'fulfilled') {
        setRevisions(rRes.value.revisions || []);
      }
    } catch (err: any) {
      triggerError(err.message || 'Error loading budget variance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && budgetId) {
      setSuccessMsg(null);
      setErrorMsg(null);
      setActiveTab('variance');
      setRevForm({
        budgetId,
        budgetItemSeqId: '',
        revisedAmount: 0,
        revisionReason: '',
        comments: '',
      });
      loadData(budgetId);
    }
  }, [isOpen, budgetId, loadData]);

  if (!isOpen || !budgetId) return null;

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revForm.budgetItemSeqId) {
      triggerError(isTr ? 'Lütfen revize edilecek bütçe kalemini seçiniz.' : 'Please select a budget line item.');
      return;
    }
    const amt = Number(revForm.revisedAmount);
    if (isNaN(amt) || amt < 0) {
      triggerError(isTr ? 'Geçerli bir tutar giriniz.' : 'Please enter a valid amount.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createBudgetRevision({
        ...revForm,
        budgetId,
        revisedAmount: amt,
      });
      triggerSuccess(res._EVENT_MESSAGE_ || (isTr ? 'Bütçe revizyonu başarıyla kaydedildi.' : 'Revision recorded successfully.'));
      setShowRevForm(false);
      setRevForm({
        budgetId,
        budgetItemSeqId: varianceData?.items?.[0]?.budgetItemSeqId || '',
        revisedAmount: 0,
        revisionReason: '',
        comments: '',
      });
      await loadData(budgetId);
      if (onBudgetUpdated) onBudgetUpdated();
    } catch (err: any) {
      triggerError(err.message || 'Revision failed');
    } finally {
      setActionLoading(false);
    }
  };

  const overallPct = varianceData?.overallUsagePct ?? 0;
  const isOver = overallPct > 100;
  const isWarn = overallPct > 85 && overallPct <= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="ds-card border-slate-700/80 w-full max-w-5xl bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto rounded-2xl">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/90 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <BarChart3 size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {t.varianceTitle}
                  </h2>
                  <span className="ds-badge ds-badge-blue font-mono text-xs">
                    #{budgetId}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  {t.varianceSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(budgetId)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isTr ? 'Yenile' : 'Refresh'}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/50 flex overflow-x-auto no-scrollbar gap-1 pt-2">
          <button
            onClick={() => setActiveTab('variance')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'variance'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 size={16} />
            {t.varianceReportBtn}
          </button>

          <button
            onClick={() => setActiveTab('revisions')}
            className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'revisions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History size={16} />
            {t.revisionsBtn}
            {revisions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                {revisions.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ================= TAB 1: VARIANCE ANALYSIS ================= */}
          {activeTab === 'variance' && (
            <div className="space-y-6">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="ds-card p-4 border-l-4 border-l-indigo-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.totalBudget}</div>
                  <div className="text-2xl font-bold text-white tracking-tight">{fmt(varianceData?.totalBudget)}</div>
                  <div className="text-xs text-slate-400">{isTr ? 'Tahsis Edilen Ödenek' : 'Allocated Funds'}</div>
                </div>

                <div className="ds-card p-4 border-l-4 border-l-rose-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.totalActual}</div>
                  <div className="text-2xl font-bold text-rose-400 tracking-tight">{fmt(varianceData?.totalActual)}</div>
                  <div className="text-xs text-slate-400">{isTr ? 'Fiili Gerçekleşen Gider' : 'Actual Spent'}</div>
                </div>

                <div className="ds-card p-4 border-l-4 border-l-emerald-500 space-y-1">
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.totalVariance}</div>
                  <div className={`text-2xl font-bold tracking-tight ${(varianceData?.totalVariance ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {fmt(varianceData?.totalVariance)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {(varianceData?.totalVariance ?? 0) < 0 ? (isTr ? 'Ödenek Aşıldı' : 'Deficit') : (isTr ? 'Kalan Bütçe Payı' : 'Available Balance')}
                  </div>
                </div>

                <div className={`ds-card p-4 border-l-4 ${isOver ? 'border-l-rose-500' : isWarn ? 'border-l-amber-500' : 'border-l-indigo-500'} space-y-1`}>
                  <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{t.overallUsage}</div>
                  <div className={`text-2xl font-bold tracking-tight ${isOver ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-indigo-400'}`}>
                    %{overallPct}
                  </div>
                  <div className="text-xs">
                    {isOver ? (
                      <span className="text-rose-400 font-medium">{t.overBudget}</span>
                    ) : isWarn ? (
                      <span className="text-amber-400 font-medium">{t.warning}</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">{t.onTrack}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Consumption Progress Bar */}
              <div className="ds-card p-5 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-300 font-medium flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-400" />
                    {isTr ? 'Kümülatif Bütçe Tüketim İlerlemesi' : 'Cumulative Budget Consumption'}
                  </span>
                  <span className={`font-bold ${isOver ? 'text-rose-400' : 'text-indigo-400'}`}>
                    %{overallPct}
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, overallPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-1">
                  <span>{isTr ? 'Harcanan: ' : 'Spent: '}{fmt(varianceData?.totalActual)}</span>
                  <span>{isTr ? 'Kalan Ödenek: ' : 'Remaining: '}{fmt(varianceData?.totalVariance)}</span>
                </div>
              </div>

              {/* Variance Items Breakdown Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={15} className="text-indigo-400" />
                    {isTr ? 'Bütçe Kalemleri Bazında Sapma Dökümü' : 'Line Item Variance Breakdown'}
                  </h4>
                  <button
                    onClick={() => {
                      if (varianceData?.items?.length) {
                        setRevForm(prev => ({ ...prev, budgetItemSeqId: varianceData.items[0].budgetItemSeqId }));
                      }
                      setShowRevForm(true);
                    }}
                    className="ds-btn-secondary text-xs py-1.5 px-3"
                  >
                    <Plus size={14} />
                    {t.newRevision}
                  </button>
                </div>

                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">#</th>
                        <th className="ds-th">{isTr ? 'Kalem Türü & Açıklama' : 'Item Type & Purpose'}</th>
                        <th className="ds-th-right">{t.totalBudget}</th>
                        <th className="ds-th-right">{t.totalActual}</th>
                        <th className="ds-th-right">{t.totalVariance}</th>
                        <th className="ds-th-right">{t.overallUsage}</th>
                        <th className="ds-th text-center">{isTr ? 'Durum' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {varianceData?.items?.length ? (
                        varianceData.items.map((itm) => (
                          <tr key={itm.budgetItemSeqId} className="ds-tbody-row hover:bg-slate-800/40">
                            <td className="ds-td font-mono text-slate-400">#{itm.budgetItemSeqId}</td>
                            <td className="ds-td">
                              <div className="font-medium text-white">{itm.budgetItemTypeDesc}</div>
                              {itm.purpose && <div className="text-xs text-slate-400">{itm.purpose}</div>}
                            </td>
                            <td className="ds-td-right font-medium text-white">
                              {fmt(itm.budgetAmount)}
                            </td>
                            <td className="ds-td-right font-medium text-rose-400">
                              {fmt(itm.actualAmount)}
                            </td>
                            <td className={`ds-td-right font-bold ${itm.varianceAmount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {fmt(itm.varianceAmount)}
                            </td>
                            <td className="ds-td-right font-mono font-medium">
                              %{itm.usagePercentage}
                            </td>
                            <td className="ds-td text-center">
                              {itm.statusIndicator === 'OVER_BUDGET' ? (
                                <span className="ds-badge ds-badge-red">{t.overBudget}</span>
                              ) : itm.statusIndicator === 'WARNING' ? (
                                <span className="ds-badge ds-badge-yellow">{t.warning}</span>
                              ) : (
                                <span className="ds-badge ds-badge-green">{t.onTrack}</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="ds-td text-center py-8 text-slate-400">
                            {isTr ? 'Bütçe kalemi bulunamadı.' : 'No budget items found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: REVISIONS ================= */}
          {activeTab === 'revisions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">{t.revisionsTitle}</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {isTr ? 'Dönem içi yapılan ek ödenek ve aktarma revizyonlarının denetim kaydı.' : 'History of approved budget revisions and reallocations.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowRevForm(true)}
                  className="ds-btn-primary"
                >
                  <Plus size={16} />
                  {t.newRevision}
                </button>
              </div>

              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{t.revisionSeq}</th>
                      <th className="ds-th">{t.dateRevised}</th>
                      <th className="ds-th">{t.revisionReason}</th>
                      <th className="ds-th">{isTr ? 'Etkilenen Kalemler' : 'Impacted Items'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.length ? (
                      revisions.map((rev) => (
                        <tr key={rev.revisionSeqId} className="ds-tbody-row hover:bg-slate-800/40">
                          <td className="ds-td font-mono text-indigo-400 font-bold">
                            #{rev.revisionSeqId}
                          </td>
                          <td className="ds-td text-slate-300">{rev.dateRevised}</td>
                          <td className="ds-td font-medium text-white">{rev.revisionReason}</td>
                          <td className="ds-td">
                            <div className="flex flex-wrap gap-1.5">
                              {rev.impacts.map((imp, idx) => (
                                <span key={idx} className="ds-badge ds-badge-indigo text-xs">
                                  Item #{imp.budgetItemSeqId}: {fmt(imp.revisedAmount)}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="ds-td text-center py-8 text-slate-400">
                          {t.noRevisions}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end gap-3">
          <button onClick={onClose} className="ds-btn-secondary">
            {isTr ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>

      {/* ================= MODAL: CREATE REVISION ================= */}
      {showRevForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-md bg-slate-900 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History size={18} className="text-indigo-400" />
                {t.newRevision}
              </h3>
              <button onClick={() => setShowRevForm(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRevision} className="space-y-4">
              <div>
                <label className="ds-label">{isTr ? 'Revize Edilecek Bütçe Kalemi' : 'Target Budget Item'} *</label>
                <select
                  required
                  value={revForm.budgetItemSeqId}
                  onChange={(e) => setRevForm({ ...revForm, budgetItemSeqId: e.target.value })}
                  className="ds-select"
                >
                  <option value="">{isTr ? '-- Kalem Seçiniz --' : '-- Select Item --'}</option>
                  {varianceData?.items?.map((itm) => (
                    <option key={itm.budgetItemSeqId} value={itm.budgetItemSeqId}>
                      #{itm.budgetItemSeqId} - {itm.budgetItemTypeDesc} ({fmt(itm.budgetAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">{t.revisedAmount} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={revForm.revisedAmount || ''}
                  onChange={(e) => setRevForm({ ...revForm, revisedAmount: parseFloat(e.target.value) || 0 })}
                  className="ds-input font-mono text-base"
                  placeholder="50000"
                />
              </div>

              <div>
                <label className="ds-label">{t.revisionReason} *</label>
                <input
                  type="text"
                  required
                  value={revForm.revisionReason || ''}
                  onChange={(e) => setRevForm({ ...revForm, revisionReason: e.target.value })}
                  className="ds-input"
                  placeholder="Ek ödenek aktarımı veya maliyet artışı"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRevForm(false)}
                  className="ds-btn-secondary"
                >
                  {isTr ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Revizyonu Kaydet' : 'Save Revision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
