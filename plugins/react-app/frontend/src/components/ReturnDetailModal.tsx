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
                    className={
                      isCompleted
                        ? 'ds-badge ds-badge-green'
                        : isAccepted
                        ? 'ds-badge ds-badge-blue'
                        : isCancelled
                        ? 'ds-badge ds-badge-red'
                        : 'ds-badge ds-badge-yellow'
                    }
                  >
                    {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                    {isAccepted && <Clock className="w-3.5 h-3.5 mr-1" />}
                    {isCancelled && <XCircle className="w-3.5 h-3.5 mr-1" />}
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
            <div className="ds-alert-error flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="ds-alert-success flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="ds-spinner-sm" />
              <span className="text-sm">{common.loading}</span>
            </div>
          ) : detail ? (
            <>
              {/* Header Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="ds-card p-4 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-amber-400" />
                    {t.party}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {header?.fromPartyId || '-'}
                  </p>
                </div>

                <div className="ds-card p-4 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {t.orderDate}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {header?.entryDate ? new Date(header.entryDate).toLocaleDateString() : '-'}
                  </p>
                </div>

                <div className="ds-card p-4 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    {t.itemCount}
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {detail.returnItems.length}
                  </p>
                </div>

                <div className="ds-card p-4 space-y-1">
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
              <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {t.changeStatus}:
                </span>
                <div className="flex items-center gap-2">
                  {isRequested && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate('RETURN_ACCEPTED', t.confirmAcceptReturn)}
                      className="ds-btn-primary text-xs py-1.5 px-3"
                    >
                      {t.acceptReturn}
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate('RETURN_COMPLETED', t.confirmCompleteReturn)}
                      className="ds-btn-primary text-xs py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500"
                    >
                      {t.completeReturn}
                    </button>
                  )}

                  {!isCompleted && !isCancelled && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleStatusUpdate('RETURN_CANCELLED', t.confirmCancelReturn)}
                      className="ds-btn-danger text-xs py-1.5 px-3"
                    >
                      {t.cancelReturn}
                    </button>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="ds-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">#</th>
                        <th className="ds-th">{t.product}</th>
                        <th className="ds-th">{t.orderId}</th>
                        <th className="ds-th-right">{t.quantity}</th>
                        <th className="ds-th-right">{t.unitPrice}</th>
                        <th className="ds-th-right">{t.lineTotal}</th>
                        <th className="ds-th">{t.returnReason}</th>
                        <th className="ds-th">{t.returnType}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.returnItems.map((item, idx) => (
                        <tr key={item.returnItemSeqId || idx} className="ds-tbody-row">
                          <td className="ds-td text-xs text-slate-500">{item.returnItemSeqId || idx + 1}</td>
                          <td className="ds-td">
                            <span className="font-medium text-white">{item.productId || '-'}</span>
                            {item.description && (
                              <p className="text-xs text-slate-400">{item.description}</p>
                            )}
                          </td>
                          <td className="ds-td-mono font-bold text-amber-400">
                            {item.orderId ? `#${item.orderId}` : '-'}
                          </td>
                          <td className="ds-td-right text-slate-300 font-semibold">
                            {item.returnQuantity}
                          </td>
                          <td className="ds-td-right text-slate-300">
                            {formatCurrency(item.returnPrice, header?.currencyUomId)}
                          </td>
                          <td className="ds-td-right text-emerald-400">
                            {formatCurrency(item.lineTotal || (item.returnQuantity * item.returnPrice), header?.currencyUomId)}
                          </td>
                          <td className="ds-td">
                            <span className="ds-badge ds-badge-slate">
                              {item.returnReasonId || '-'}
                            </span>
                          </td>
                          <td className="ds-td">
                            <span className="ds-badge ds-badge-slate">
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
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900 shrink-0">
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
