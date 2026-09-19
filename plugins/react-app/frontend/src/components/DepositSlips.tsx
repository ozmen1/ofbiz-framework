import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Plus, RefreshCw, CheckCircle2, AlertCircle, 
  Search, Eye, Trash2, CheckSquare, Square, 
  ArrowDownLeft, CreditCard, DollarSign, Wallet
} from 'lucide-react';
import { 
  api, 
  DepositSlipItem, 
  DepositSlipDetailItem, 
  UndepositedPaymentItem 
} from '../services/api';
import { useTranslation } from '../i18n';

interface DepositSlipsProps {
  initialFinAccountId?: string;
}

export const DepositSlips: React.FC<DepositSlipsProps> = ({ initialFinAccountId }) => {
  const { translations, locale } = useTranslation();

  // State
  const [slips, setSlips] = useState<DepositSlipItem[]>([]);
  const [undeposited, setUndeposited] = useState<UndepositedPaymentItem[]>([]);
  const [finAccounts, setFinAccounts] = useState<{ finAccountId: string; finAccountName: string; currencyUomId: string; actualBalance: number }[]>([]);
  const [selectedFinAccountId, setSelectedFinAccountId] = useState<string>(initialFinAccountId || '');
  const [search, setSearch] = useState('');

  // Loading & notifications
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSlipDetail, setSelectedSlipDetail] = useState<DepositSlipDetailItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form state
  const [targetFinAccountId, setTargetFinAccountId] = useState('');
  const [slipCustomName, setSlipCustomName] = useState('');
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const formatCurrency = (val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [slipsRes, undepRes, metaRes] = await Promise.all([
        api.getDepositSlips({ finAccountId: selectedFinAccountId || undefined, search }),
        api.getUndepositedPayments(),
        api.getDepositSlipMetadata()
      ]);
      setSlips(slipsRes.depositSlips || []);
      setUndeposited(undepRes.payments || []);
      setFinAccounts(metaRes.finAccounts || []);

      if (!targetFinAccountId && metaRes.finAccounts?.length > 0) {
        setTargetFinAccountId(metaRes.finAccounts[0].finAccountId);
      }
    } catch (err: any) {
      console.error('Failed to load deposit slips:', err);
      setError(err.message || 'Error loading deposit slips');
    } finally {
      setLoading(false);
    }
  }, [selectedFinAccountId, search, targetFinAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Detail Modal
  const handleOpenDetail = async (paymentGroupId: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const res = await api.getDepositSlipDetail(paymentGroupId);
      setSelectedSlipDetail(res.depositSlip);
    } catch (err: any) {
      setError(err.message || 'Failed to load deposit slip details');
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Cancel Deposit Slip
  const handleCancelSlip = async (paymentGroupId: string) => {
    if (!window.confirm(translations.depositSlips.confirmCancel)) return;
    try {
      await api.cancelDepositSlip(paymentGroupId);
      showSuccessMsg(translations.depositSlips.messages.successCancelled);
      setShowDetailModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel deposit slip');
    }
  };

  // Checkbox toggle for creation modal
  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPaymentIds(prev => 
      prev.includes(paymentId) ? prev.filter(id => id !== paymentId) : [...prev, paymentId]
    );
  };

  const selectAllUndeposited = () => {
    if (selectedPaymentIds.length === undeposited.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(undeposited.map(p => p.paymentId));
    }
  };

  // Create Deposit Slip Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFinAccountId) {
      setError('Lütfen bir hedef banka hesabı seçin.');
      return;
    }
    if (selectedPaymentIds.length === 0) {
      setError(translations.depositSlips.messages.selectAtLeastOne);
      return;
    }

    setSubmitting(true);
    try {
      await api.createDepositSlip({
        finAccountId: targetFinAccountId,
        paymentIds: selectedPaymentIds,
        paymentGroupName: slipCustomName.trim() || undefined,
      });
      showSuccessMsg(translations.depositSlips.messages.successCreated);
      setShowCreateModal(false);
      setSelectedPaymentIds([]);
      setSlipCustomName('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create deposit slip');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculated Stats
  const totalSlipsCount = slips.length;
  const totalDepositedVolume = slips.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const undepositedCount = undeposited.length;
  const undepositedAmount = undeposited.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Selected Total in Modal
  const selectedPaymentsTotal = undeposited
    .filter(p => selectedPaymentIds.includes(p.paymentId))
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-indigo-400" size={26} />
            {translations.depositSlips.title}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {translations.depositSlips.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="ds-btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{translations.common.refresh}</span>
          </button>
          <button
            onClick={() => {
              setSelectedPaymentIds(undeposited.map(p => p.paymentId));
              setShowCreateModal(true);
            }}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span>{translations.depositSlips.newSlip}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-400">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">&times;</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400">
          <CheckCircle2 size={20} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ds-stat-card border-l-4 border-l-indigo-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.depositSlips.stats.totalSlips}</span>
            <Building2 className="text-indigo-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalSlipsCount}</p>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.depositSlips.stats.totalDepositedAmount}</span>
            <DollarSign className="text-emerald-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalDepositedVolume)}</p>
        </div>

        <div className="ds-stat-card border-l-4 border-l-amber-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.depositSlips.stats.undepositedCount}</span>
            <CreditCard className="text-amber-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{undepositedCount}</p>
        </div>

        <div className="ds-stat-card border-l-4 border-l-rose-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.depositSlips.stats.undepositedAmount}</span>
            <Wallet className="text-rose-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(undepositedAmount)}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="ds-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
            <input
              type="text"
              placeholder={translations.common.search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ds-input pl-9 text-xs"
            />
          </div>

          {/* Account Filter */}
          <select
            value={selectedFinAccountId}
            onChange={(e) => setSelectedFinAccountId(e.target.value)}
            className="ds-select text-xs w-full sm:w-56"
          >
            <option value="">{translations.depositSlips.bankAccount}: {translations.common.all}</option>
            {finAccounts.map(fa => (
              <option key={fa.finAccountId} value={fa.finAccountId}>
                {fa.finAccountName} ({fa.finAccountId})
              </option>
            ))}
          </select>
        </div>

        {undepositedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
            <ArrowDownLeft size={14} />
            <span>{undepositedCount} {translations.depositSlips.stats.undepositedCount} ({formatCurrency(undepositedAmount)})</span>
          </div>
        )}
      </div>

      {/* Deposit Slips Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="ds-spinner"></div>
        </div>
      ) : slips.length === 0 ? (
        <div className="ds-card text-center py-16 text-slate-400 text-sm">
          <Building2 className="mx-auto text-slate-600 mb-2" size={36} />
          <p>{translations.depositSlips.noDepositSlips}</p>
          {undepositedCount > 0 && (
            <button
              onClick={() => {
                setSelectedPaymentIds(undeposited.map(p => p.paymentId));
                setShowCreateModal(true);
              }}
              className="mt-4 ds-btn-primary inline-flex items-center gap-2 text-xs"
            >
              <Plus size={14} />
              <span>{translations.depositSlips.newSlip}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{translations.depositSlips.slipId}</th>
                  <th className="ds-th">{translations.depositSlips.slipName}</th>
                  <th className="ds-th">{translations.depositSlips.bankAccount}</th>
                  <th className="ds-th text-center">{translations.depositSlips.paymentCount}</th>
                  <th className="ds-th text-right">{translations.depositSlips.totalAmount}</th>
                  <th className="ds-th">{translations.depositSlips.createdDate}</th>
                  <th className="ds-th text-center">{translations.depositSlips.transStatus}</th>
                  <th className="ds-th text-right">{translations.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {slips.map((s) => (
                  <tr key={s.paymentGroupId} className="ds-tbody-row">
                    <td className="ds-td font-mono font-semibold text-indigo-400">
                      {s.paymentGroupId}
                    </td>
                    <td className="ds-td font-medium text-white">
                      {s.paymentGroupName}
                    </td>
                    <td className="ds-td text-slate-300">
                      <div>{s.finAccountName}</div>
                      {s.finAccountId && <span className="text-[10px] text-slate-500 font-mono">{s.finAccountId}</span>}
                    </td>
                    <td className="ds-td text-center">
                      <span className="ds-badge ds-badge-slate text-xs font-semibold">
                        {s.paymentCount} {translations.pages.payments.title}
                      </span>
                    </td>
                    <td className="ds-td text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(s.totalAmount)}
                    </td>
                    <td className="ds-td text-xs text-slate-400 font-mono">
                      {s.createdDate || '—'}
                    </td>
                    <td className="ds-td text-center">
                      <span className={`ds-badge text-xs ${
                        s.transStatusId === 'FINACT_TRNS_APPROVED' ? 'ds-badge-green' :
                        s.transStatusId === 'FINACT_TRNS_CANCELED' ? 'ds-badge-red' :
                        'ds-badge-blue'
                      }`}>
                        {s.transStatusId === 'FINACT_TRNS_APPROVED' ? 'Onaylandı' :
                         s.transStatusId === 'FINACT_TRNS_CANCELED' ? 'İptal' : 'Oluşturuldu'}
                      </span>
                    </td>
                    <td className="ds-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenDetail(s.paymentGroupId)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                          title={translations.depositSlips.viewDetail}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleCancelSlip(s.paymentGroupId)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title={translations.depositSlips.cancelSlip}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE DEPOSIT SLIP MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="ds-card p-6 w-full max-w-3xl shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="text-indigo-400" size={20} />
                {translations.depositSlips.newSlip}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.depositSlips.depositTo} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={targetFinAccountId}
                    onChange={(e) => setTargetFinAccountId(e.target.value)}
                    className="ds-select text-xs"
                  >
                    {finAccounts.map(fa => (
                      <option key={fa.finAccountId} value={fa.finAccountId}>
                        {fa.finAccountName} ({fa.finAccountId}) — Bakiye: {formatCurrency(fa.actualBalance, fa.currencyUomId)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.depositSlips.slipName} (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={slipCustomName}
                    onChange={(e) => setSlipCustomName(e.target.value)}
                    placeholder="Örn: Gün Sonu Kasa Mevduat Fişi"
                    className="ds-input text-xs"
                  />
                </div>
              </div>

              {/* Undeposited Payments List */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between text-xs pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllUndeposited}
                      className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      {selectedPaymentIds.length === undeposited.length ? <CheckSquare size={14} /> : <Square size={14} />}
                      <span>{selectedPaymentIds.length === undeposited.length ? 'Seçimi Temizle' : 'Tümünü Seç'}</span>
                    </button>
                    <span className="text-slate-400">({undeposited.length} tahsilat)</span>
                  </div>
                  <div className="font-semibold text-white">
                    {translations.depositSlips.totalSelected}: <span className="text-emerald-400 font-mono">{formatCurrency(selectedPaymentsTotal)}</span> ({selectedPaymentIds.length})
                  </div>
                </div>

                {undeposited.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-slate-800 rounded-xl bg-slate-900/40">
                    {translations.depositSlips.noUndepositedPayments}
                  </div>
                ) : (
                  <div className="overflow-y-auto border border-slate-800 rounded-xl max-h-64">
                    <table className="ds-table text-xs">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th w-10 text-center">✓</th>
                          <th className="ds-th">{translations.payments.paymentId}</th>
                          <th className="ds-th">{translations.payments.fromParty}</th>
                          <th className="ds-th">{translations.payments.paymentMethod}</th>
                          <th className="ds-th">{translations.common.date}</th>
                          <th className="ds-th text-right">{translations.common.amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {undeposited.map((p) => {
                          const isSelected = selectedPaymentIds.includes(p.paymentId);
                          return (
                            <tr
                              key={p.paymentId}
                              onClick={() => togglePaymentSelection(p.paymentId)}
                              className={`ds-tbody-row cursor-pointer ${
                                isSelected ? 'bg-indigo-600/10' : ''
                              }`}
                            >
                              <td className="ds-td text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by row click
                                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="ds-td font-mono text-indigo-400 font-semibold">
                                {p.paymentId}
                              </td>
                              <td className="ds-td text-slate-200">
                                {p.partyFromName || p.partyIdFrom}
                              </td>
                              <td className="ds-td">
                                <span className="ds-badge ds-badge-slate text-[10px]">
                                  {p.paymentMethodTypeDesc || p.paymentMethodTypeId}
                                </span>
                              </td>
                              <td className="ds-td text-slate-400 font-mono text-[11px]">
                                {p.effectiveDate || '—'}
                              </td>
                              <td className="ds-td text-right font-mono font-bold text-emerald-400">
                                {formatCurrency(p.amount, p.currencyUomId)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="ds-btn-secondary"
                  disabled={submitting}
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  className="ds-btn-primary flex items-center gap-2"
                  disabled={submitting || selectedPaymentIds.length === 0}
                >
                  {submitting ? (
                    <>
                      <div className="ds-spinner w-4 h-4 border-2"></div>
                      <span>{translations.common.loading}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{translations.depositSlips.newSlip} ({selectedPaymentIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="ds-card p-6 w-full max-w-3xl shadow-2xl border border-slate-700 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="text-indigo-400" size={20} />
                  {selectedSlipDetail?.paymentGroupName || selectedSlipDetail?.paymentGroupId}
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  ID: {selectedSlipDetail?.paymentGroupId}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                &times;
              </button>
            </div>

            {detailLoading || !selectedSlipDetail ? (
              <div className="flex items-center justify-center py-20">
                <div className="ds-spinner"></div>
              </div>
            ) : (
              <div className="space-y-4 pt-4 flex-1 flex flex-col min-h-0">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">{translations.depositSlips.bankAccount}</span>
                    <span className="text-sm font-semibold text-white">{selectedSlipDetail.finAccountName}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">{translations.depositSlips.totalAmount}</span>
                    <span className="text-sm font-mono font-bold text-emerald-400">{formatCurrency(selectedSlipDetail.totalAmount)}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">{translations.depositSlips.paymentCount}</span>
                    <span className="text-sm font-semibold text-white">{selectedSlipDetail.paymentCount} {translations.pages.payments.title}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase block">{translations.depositSlips.transStatus}</span>
                    <span className="text-xs font-semibold text-indigo-400">{selectedSlipDetail.transStatusId}</span>
                  </div>
                </div>

                {/* Member Payments Table */}
                <div className="flex-1 flex flex-col min-h-0 space-y-1">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {translations.depositSlips.memberPayments} ({selectedSlipDetail.memberPayments.length})
                  </h3>
                  <div className="overflow-y-auto border border-slate-800 rounded-xl max-h-64">
                    <table className="ds-table text-xs">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{translations.payments.paymentId}</th>
                          <th className="ds-th">{translations.payments.fromParty}</th>
                          <th className="ds-th">{translations.payments.paymentMethod}</th>
                          <th className="ds-th">{translations.common.date}</th>
                          <th className="ds-th text-right">{translations.common.amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSlipDetail.memberPayments.map((p) => (
                          <tr key={p.paymentId} className="ds-tbody-row">
                            <td className="ds-td font-mono font-semibold text-indigo-400">
                              {p.paymentId}
                            </td>
                            <td className="ds-td text-slate-200">
                              {p.partyFromName || p.partyIdFrom}
                            </td>
                            <td className="ds-td">
                              <span className="ds-badge ds-badge-slate text-[10px]">
                                {p.paymentMethodTypeDesc || p.paymentMethodTypeId}
                              </span>
                            </td>
                            <td className="ds-td text-slate-400 font-mono text-[11px]">
                              {p.effectiveDate || '—'}
                            </td>
                            <td className="ds-td text-right font-mono font-bold text-emerald-400">
                              {formatCurrency(p.amount, p.currencyUomId)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleCancelSlip(selectedSlipDetail.paymentGroupId)}
                    className="ds-btn-danger text-xs flex items-center gap-1.5"
                  >
                    <Trash2 size={14} />
                    <span>{translations.depositSlips.cancelSlip}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDetailModal(false)}
                    className="ds-btn-secondary"
                  >
                    {translations.common.close}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepositSlips;
