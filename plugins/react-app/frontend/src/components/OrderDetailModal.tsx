import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Clock,
  PauseCircle,
  Package,
  Layers,
  Users,
  History,
  Building,
  Store,
  DollarSign,
  FileText,
  Truck,
} from 'lucide-react';
import {
  OrderDetailResponse,
  fetchOrderDetail,
  changeOrderStatus,
  quickCreateInvoiceForOrder,
  quickCreateShipmentForOrder,
} from '../services/orderService';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onOrderChanged?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onOrderChanged,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrderDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'adjustments' | 'roles' | 'history'>('items');
  const [changeReason, setChangeReason] = useState('');
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchOrderDetail(orderId);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [orderId, common.error]);

  useEffect(() => {
    if (isOpen && orderId) {
      document.body.style.overflow = 'hidden';
      loadDetail();
      setActiveTab('items');
      setChangeReason('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, orderId, loadDetail]);

  if (!isOpen || !orderId) return null;

  const formatCurrency = (val: number, uom?: string) => {
    const curr = uom || 'USD';
    try {
      return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
        style: 'currency',
        currency: curr,
      }).format(val);
    } catch {
      return `${val.toFixed(2)} ${curr}`;
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr.substring(0, 16);
    }
  };

  const handleStatusChange = async (newStatusId: string, confirmMessage: string) => {
    if (!window.confirm(confirmMessage)) return;

    try {
      setIsChangingStatus(true);
      setError(null);
      await changeOrderStatus({
        orderId,
        statusId: newStatusId,
        setItemStatus: 'Y',
        changeReason: changeReason.trim() || undefined,
      });
      setChangeReason('');
      await loadDetail();
      onOrderChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleQuickInvoice = async () => {
    if (!orderId || !window.confirm(t.confirmCreateInvoice)) return;
    try {
      setIsChangingStatus(true);
      setError(null);
      setQuickSuccess(null);
      const res = await quickCreateInvoiceForOrder(orderId);
      setQuickSuccess(res.successMessage || t.invoiceCreatedSuccess);
      onOrderChanged?.();
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleQuickShipment = async () => {
    if (!orderId || !window.confirm(t.confirmCreateShipment)) return;
    try {
      setIsChangingStatus(true);
      setError(null);
      setQuickSuccess(null);
      const res = await quickCreateShipmentForOrder(orderId);
      setQuickSuccess(res.successMessage || t.shipmentCreatedSuccess);
      onOrderChanged?.();
      await loadDetail();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsChangingStatus(false);
    }
  };

  const getStatusBadge = (statusId: string, desc?: string) => {
    const text = desc || statusId;
    switch (statusId) {
      case 'ORDER_COMPLETED':
      case 'ITEM_COMPLETED':
        return <span className="ds-badge ds-badge-green">{text}</span>;
      case 'ORDER_APPROVED':
      case 'ITEM_APPROVED':
        return <span className="ds-badge ds-badge-blue">{text}</span>;
      case 'ORDER_CREATED':
      case 'ORDER_PROCESSING':
      case 'ITEM_CREATED':
        return <span className="ds-badge ds-badge-yellow">{text}</span>;
      case 'ORDER_CANCELLED':
      case 'ITEM_CANCELLED':
      case 'ORDER_REJECTED':
      case 'ITEM_REJECTED':
        return <span className="ds-badge ds-badge-red">{text}</span>;
      case 'ORDER_HOLD':
        return <span className="ds-badge ds-badge-purple">{text}</span>;
      default:
        return <span className="ds-badge ds-badge-slate">{text}</span>;
    }
  };

  const header = detail?.orderHeader;
  const currentStatusId = header?.statusId;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      {/* 60fps rule: solid overlay without backdrop-blur */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog container */}
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {header?.orderName ? `${header.orderName} (${header.orderId})` : header?.orderId || orderId}
                </h2>
                {header && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {header.orderTypeDesc || header.orderTypeId}
                  </span>
                )}
                {header && getStatusBadge(header.statusId, header.statusDesc)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.orderDate}: {formatDate(header?.orderDate)}
                {header?.currencyUom && ` • ${header.currencyUom}`}
                {header?.createdBy && ` • ${t.createdBy}: ${header.createdBy}`}
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

        {/* Modal Body - Single Unified Vertical Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {quickSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
              <span>{quickSuccess}</span>
              <button
                type="button"
                onClick={() => setQuickSuccess(null)}
                className="text-emerald-400 hover:text-emerald-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex items-center justify-center text-slate-400">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* Summary Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.totalAmount}</span>
                    <p className="text-base font-bold text-white mt-0.5">
                      {formatCurrency(header?.grandTotal || 0, header?.currencyUom)}
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
                      {detail?.orderItems?.length || 0} {t.items.toLowerCase()}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.productStore}</span>
                    <p className="text-sm font-semibold text-white mt-0.5 truncate">
                      {header?.productStoreId || '-'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{t.originFacility}</span>
                    <p className="text-sm font-semibold text-white mt-0.5 truncate">
                      {header?.originFacilityId || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Action Toolbar */}
              <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full md:w-auto">
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder={t.changeReasonPlaceholder}
                    className="ds-input text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                  {/* Durum butonları */}
                  {(currentStatusId === 'ORDER_CREATED' || currentStatusId === 'ORDER_PROCESSING' || currentStatusId === 'ORDER_HOLD') && (
                    <button
                      type="button"
                      disabled={isChangingStatus}
                      onClick={() => handleStatusChange('ORDER_APPROVED', t.confirmApproveOrder)}
                      className="ds-btn-primary flex items-center space-x-1.5 text-xs py-2 px-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>{t.approveOrder}</span>
                    </button>
                  )}

                  {currentStatusId === 'ORDER_APPROVED' && (
                    <button
                      type="button"
                      disabled={isChangingStatus}
                      onClick={() => handleStatusChange('ORDER_COMPLETED', t.confirmCompleteOrder)}
                      className="ds-btn-primary flex items-center space-x-1.5 text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.completeOrder}</span>
                    </button>
                  )}

                  {currentStatusId !== 'ORDER_COMPLETED' && currentStatusId !== 'ORDER_CANCELLED' && (
                    <button
                      type="button"
                      disabled={isChangingStatus}
                      onClick={() => handleStatusChange('ORDER_HOLD', t.confirmHoldOrder)}
                      className="ds-btn-secondary flex items-center space-x-1.5 text-xs py-2 px-3"
                    >
                      <PauseCircle className="w-4 h-4 text-purple-400" />
                      <span>{t.holdOrder}</span>
                    </button>
                  )}

                  {currentStatusId !== 'ORDER_COMPLETED' && currentStatusId !== 'ORDER_CANCELLED' && (
                    <button
                      type="button"
                      disabled={isChangingStatus}
                      onClick={() => handleStatusChange('ORDER_CANCELLED', t.confirmCancelOrder)}
                      className="ds-btn-danger flex items-center space-x-1.5 text-xs py-2 px-3"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>{t.cancelOrder}</span>
                    </button>
                  )}

                  <div className="h-6 w-px bg-slate-700 mx-1 hidden md:block" />

                  {/* Quick Action: Fatura Oluştur */}
                  <button
                    type="button"
                    disabled={isChangingStatus}
                    onClick={handleQuickInvoice}
                    className="flex items-center space-x-1.5 text-xs py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold transition"
                    title={t.createInvoiceQuick}
                  >
                    <FileText className="w-4 h-4 text-emerald-300" />
                    <span>{t.createInvoiceQuick}</span>
                  </button>

                  {/* Quick Action: Sevkiyat Başlat */}
                  <button
                    type="button"
                    disabled={isChangingStatus}
                    onClick={handleQuickShipment}
                    className="flex items-center space-x-1.5 text-xs py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-semibold transition"
                    title={t.createShipmentQuick}
                  >
                    <Truck className="w-4 h-4 text-blue-300" />
                    <span>{t.createShipmentQuick}</span>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-slate-800 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                    activeTab === 'items'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>{t.items} ({detail?.orderItems?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('adjustments')}
                  className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                    activeTab === 'adjustments'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{t.adjustments} ({detail?.orderAdjustments?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                    activeTab === 'roles'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{t.roles} ({detail?.orderRoles?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 px-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-indigo-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>{t.statusHistory} ({detail?.orderStatuses?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Order Items */}
              {activeTab === 'items' && (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">Sıra</th>
                        <th className="ds-th">{t.product}</th>
                        <th className="ds-th">{common.description}</th>
                        <th className="ds-th-right">{t.quantity}</th>
                        <th className="ds-th-right">{t.unitPrice}</th>
                        <th className="ds-th-right">{t.lineTotal}</th>
                        <th className="ds-th">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.orderItems && detail.orderItems.length > 0 ? (
                        detail.orderItems.map((item) => (
                          <tr key={item.orderItemSeqId} className="ds-tbody-row">
                            <td className="ds-td-mono text-slate-400">
                              {item.orderItemSeqId}
                            </td>
                            <td className="ds-td-mono font-bold text-indigo-300">
                              {item.productId || '-'}
                            </td>
                            <td className="ds-td text-white font-medium">
                              {item.itemDescription || '-'}
                            </td>
                            <td className="ds-td-right font-mono text-white">
                              {item.quantity}
                              {item.cancelQuantity > 0 && (
                                <span className="text-xs text-rose-400 block">(-{item.cancelQuantity})</span>
                              )}
                            </td>
                            <td className="ds-td-right font-mono text-slate-300">
                              {formatCurrency(item.unitPrice, header?.currencyUom)}
                            </td>
                            <td className="ds-td-right font-mono font-bold text-emerald-400">
                              {formatCurrency(item.itemTotal, header?.currencyUom)}
                            </td>
                            <td className="ds-td">
                              {getStatusBadge(item.statusId, item.statusDesc)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                            {common.noData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Adjustments */}
              {activeTab === 'adjustments' && (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">ID</th>
                        <th className="ds-th">{t.type}</th>
                        <th className="ds-th">{common.description}</th>
                        <th className="ds-th-right">{t.amount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.orderAdjustments && detail.orderAdjustments.length > 0 ? (
                        detail.orderAdjustments.map((adj) => (
                          <tr key={adj.orderAdjustmentId} className="ds-tbody-row">
                            <td className="ds-td-mono text-slate-400">
                              {adj.orderAdjustmentId}
                            </td>
                            <td className="ds-td font-semibold text-slate-200">
                              {adj.orderAdjustmentTypeId}
                            </td>
                            <td className="ds-td text-slate-400">
                              {adj.description || adj.comments || '-'}
                            </td>
                            <td className={`ds-td-right font-mono font-bold ${
                              adj.amount < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {formatCurrency(adj.amount, header?.currencyUom)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                            Herhangi bir vergi, indirim veya ek masraf bulunmuyor.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 3: Roles */}
              {activeTab === 'roles' && (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">{t.role}</th>
                        <th className="ds-th">Cari ID</th>
                        <th className="ds-th">{t.party}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.orderRoles && detail.orderRoles.length > 0 ? (
                        detail.orderRoles.map((role, idx) => (
                          <tr key={`${role.partyId}-${role.roleTypeId}-${idx}`} className="ds-tbody-row">
                            <td className="ds-td font-semibold text-indigo-300">
                              {role.roleTypeId}
                            </td>
                            <td className="ds-td-mono text-slate-400">
                              {role.partyId}
                            </td>
                            <td className="ds-td text-white font-medium">
                              {role.partyName || role.partyId}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500 italic">
                            Tanımlı taraf rolü bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 4: History */}
              {activeTab === 'history' && (
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">{t.status}</th>
                        <th className="ds-th"><Clock className="w-3.5 h-3.5 inline mr-1" />{common.date}</th>
                        <th className="ds-th">{t.user}</th>
                        <th className="ds-th">{t.reason}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.orderStatuses && detail.orderStatuses.length > 0 ? (
                        detail.orderStatuses.map((st) => (
                          <tr key={st.orderStatusId} className="ds-tbody-row">
                            <td className="ds-td">
                              {getStatusBadge(st.statusId, st.statusDesc)}
                            </td>
                            <td className="ds-td-mono text-slate-300">
                              {formatDate(st.statusDatetime)}
                            </td>
                            <td className="ds-td font-mono text-indigo-300">
                              {st.statusUserLogin || '-'}
                            </td>
                            <td className="ds-td text-slate-400 italic">
                              {st.changeReason || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                            Durum geçmişi kaydı bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-900">
          <button
            onClick={onClose}
            className="ds-btn-secondary text-xs"
          >
            {common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
