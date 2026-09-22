import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  QuoteDetailResponse,
  fetchQuoteDetail,
  changeQuoteStatus,
  createOrderFromQuote,
} from '../services/orderService';
import {
  X,
  FileCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Package,
  Building,
  DollarSign,
} from 'lucide-react';

interface QuoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteId: string | null;
  onQuoteChanged?: () => void;
  onOrderCreated?: (orderId: string) => void;
}

export const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  isOpen,
  onClose,
  quoteId,
  onQuoteChanged,
  onOrderCreated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<QuoteDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!quoteId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchQuoteDetail(quoteId);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [quoteId, common.error]);

  useEffect(() => {
    if (isOpen && quoteId) {
      document.body.style.overflow = 'hidden';
      setActionSuccess(null);
      loadDetail();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, quoteId, loadDetail]);

  if (!isOpen || !quoteId) return null;

  const handleStatusChange = async (newStatusId: string) => {
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      await changeQuoteStatus({ quoteId, statusId: newStatusId });
      setActionSuccess(t.statusUpdatedSuccess);
      onQuoteChanged?.();
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!window.confirm(t.confirmConvertToOrder)) return;
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      const res = await createOrderFromQuote(quoteId);
      setActionSuccess(res.successMessage || t.quoteConvertedSuccess);
      onQuoteChanged?.();
      await loadDetail();
      if (res.orderId && onOrderCreated) {
        onOrderCreated(res.orderId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number, uom?: string) => {
    const curr = uom || 'USD';
    try {
      return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
        style: 'currency',
        currency: curr,
        minimumFractionDigits: 2,
      }).format(val);
    } catch {
      return `${val?.toFixed(2)} ${curr}`;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr.substring(0, 10);
    }
  };

  const getStatusBadge = (statusId: string, desc?: string) => {
    const text = desc || statusId;
    switch (statusId) {
      case 'QUO_APPROVED':
        return <span className="ds-badge ds-badge-green">{text}</span>;
      case 'QUO_ORDERED':
        return <span className="ds-badge ds-badge-blue">{text}</span>;
      case 'QUO_CREATED':
        return <span className="ds-badge ds-badge-amber">{text}</span>;
      case 'QUO_REJECTED':
        return <span className="ds-badge ds-badge-red">{text}</span>;
      default:
        return <span className="ds-badge ds-badge-slate">{text}</span>;
    }
  };

  const q = detail?.quote;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {q?.quoteName ? `${q.quoteName} (#${q.quoteId})` : `#${q?.quoteId || quoteId}`}
                </h2>
                {q && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {q.quoteTypeDesc || q.quoteTypeId}
                  </span>
                )}
                {q && getStatusBadge(q.statusId, q.statusDesc)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.customerOrVendor}: <span className="text-slate-200 font-medium">{q?.partyName || q?.partyId}</span>
                {q?.issueDate && ` • ${t.issueDate}: ${formatDate(q.issueDate)}`}
                {q?.validThruDate && ` • ${t.validThru}: ${formatDate(q.validThruDate)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button
                type="button"
                onClick={() => setActionSuccess(null)}
                className="text-emerald-400 hover:text-emerald-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex items-center justify-center text-slate-400">
              <div className="w-7 h-7 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.totalAmount}</span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {formatCurrency(q?.grandTotal || 0, q?.currencyUomId)}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.itemCount}</span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {detail?.quoteItems?.length || 0} {t.items.toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.customerOrVendor}</span>
                    <p className="text-sm font-semibold text-white mt-0.5 truncate">
                      {q?.partyName || q?.partyId || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  {q?.description && <p className="italic">"{q.description}"</p>}
                </div>
                <div className="flex items-center space-x-2">
                  {q?.statusId === 'QUO_CREATED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('QUO_APPROVED')}
                      className="ds-btn-primary flex items-center space-x-1.5 text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.approveOrder}</span>
                    </button>
                  )}

                  {q?.statusId !== 'QUO_ORDERED' && q?.statusId !== 'QUO_REJECTED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('QUO_REJECTED')}
                      className="ds-btn-danger flex items-center space-x-1.5 text-xs py-2 px-3"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t.cancelOrder}</span>
                    </button>
                  )}

                  {/* Primary Convert Button */}
                  {q?.statusId !== 'QUO_ORDERED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleConvertToOrder}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>{t.convertToOrder}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quote Items Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  {t.items}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs uppercase font-semibold text-slate-400 bg-slate-900">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">{t.product}</th>
                        <th className="py-2.5 px-3">{t.quantity}</th>
                        <th className="py-2.5 px-3">{t.unitPrice}</th>
                        <th className="py-2.5 px-3 text-right">{t.lineTotal}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {detail?.quoteItems?.map((it) => (
                        <tr key={it.quoteItemSeqId} className="hover:bg-slate-800/30 transition">
                          <td className="p-3 text-xs font-mono text-slate-500">{it.quoteItemSeqId}</td>
                          <td className="p-3">
                            <span className="font-semibold text-slate-200">{it.productName || it.productId}</span>
                            {it.comments && <p className="text-xs text-slate-400 mt-0.5">{it.comments}</p>}
                          </td>
                          <td className="p-3 font-mono text-slate-300">{it.quantity}</td>
                          <td className="p-3 font-mono text-slate-300">{formatCurrency(it.quoteUnitPrice, q?.currencyUomId)}</td>
                          <td className="p-3 font-mono font-semibold text-right text-emerald-400">
                            {formatCurrency(it.lineTotal, q?.currencyUomId)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-semibold transition"
          >
            {common.cancel}
          </button>
        </div>

      </div>
    </div>
  );
};
