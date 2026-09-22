import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  ReturnDetailResponse,
  fetchReturnDetail,
  updateReturnStatus,
} from '../services/orderService';
import {
  X,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Building,
  DollarSign,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface ReturnDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnId: string | null;
  onReturnChanged?: () => void;
}

export const ReturnDetailModal: React.FC<ReturnDetailModalProps> = ({
  isOpen,
  onClose,
  returnId,
  onReturnChanged,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ReturnDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!returnId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchReturnDetail(returnId);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [returnId, common.error]);

  useEffect(() => {
    if (isOpen && returnId) {
      document.body.style.overflow = 'hidden';
      setActionSuccess(null);
      loadDetail();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, returnId, loadDetail]);

  if (!isOpen || !returnId) return null;

  const handleStatusUpdate = async (newStatusId: string, confirmMsg: string) => {
    if (!window.confirm(confirmMsg)) return;
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      await updateReturnStatus({ returnId, statusId: newStatusId });
      setActionSuccess(t.statusUpdatedSuccess);
      onReturnChanged?.();
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (val: number, cur = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: cur,
    }).format(val || 0);
  };

  const header = detail?.returnHeader;
  const isRequested = header?.statusId === 'RETURN_REQUESTED';
  const isAccepted = header?.statusId === 'RETURN_ACCEPTED';
  const isCompleted = header?.statusId === 'RETURN_COMPLETED';
  const isCancelled = header?.statusId === 'RETURN_CANCELLED';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {t.returnDetail}: #{returnId}
                </h2>
                {header && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isAccepted
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : isCancelled
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {isAccepted && <Clock className="w-3.5 h-3.5" />}
                    {isCancelled && <XCircle className="w-3.5 h-3.5" />}
                    {header.statusDesc || header.statusId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {header?.returnHeaderTypeId === 'CUSTOMER_RETURN' ? t.customerReturn : t.vendorReturn}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-sm">{common.loading}</span>
            </div>
          ) : detail ? (
            <>
              {/* Header Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    {t.party}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {header?.fromPartyId || '-'}
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {t.orderDate}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {header?.entryDate ? new Date(header.entryDate).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    {t.itemCount}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {detail.returnItems.length}
                  </p>
                </div>

                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    {t.grandTotal}
                  </span>
                  <p className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(header?.grandTotal || 0, header?.currencyUomId)}
                  </p>
                </div>
              </div>

              {/* Status Action Workflow Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 border border-slate-800 rounded-xl">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.changeStatus}:
                </span>
                <div className="flex items-center gap-2">
                  {isRequested && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate('RETURN_ACCEPTED', t.confirmAcceptReturn)}
                      className="px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {t.acceptReturn}
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate('RETURN_COMPLETED', t.confirmCompleteReturn)}
                      className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {t.completeReturn}
                    </button>
                  )}

                  {!isCompleted && !isCancelled && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate('RETURN_CANCELLED', t.confirmCancelReturn)}
                      className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-medium transition disabled:opacity-50"
                    >
                      {t.cancelReturn}
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4 font-semibold">#</th>
                        <th className="py-3 px-4 font-semibold">{t.product}</th>
                        <th className="py-3 px-4 font-semibold">{t.orderId}</th>
                        <th className="py-3 px-4 font-semibold text-right">{t.quantity}</th>
                        <th className="py-3 px-4 font-semibold text-right">{t.unitPrice}</th>
                        <th className="py-3 px-4 font-semibold text-right">{t.lineTotal}</th>
                        <th className="py-3 px-4 font-semibold">{t.returnReason}</th>
                        <th className="py-3 px-4 font-semibold">{t.returnType}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {detail.returnItems.map((item, idx) => (
                        <tr key={item.returnItemSeqId || idx} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 text-xs text-slate-500">{item.returnItemSeqId || idx + 1}</td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-white">{item.productId || '-'}</span>
                            {item.description && (
                              <p className="text-xs text-slate-400">{item.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-amber-400 font-mono">
                            {item.orderId ? `#${item.orderId}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300 font-semibold">
                            {item.returnQuantity}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {formatCurrency(item.returnPrice, header?.currencyUomId)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400">
                            {formatCurrency(item.lineTotal || (item.returnQuantity * item.returnPrice), header?.currencyUomId)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.returnReasonId || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {item.returnTypeId || '-'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            {common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
