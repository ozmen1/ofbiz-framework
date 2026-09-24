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
  Plus,
} from 'lucide-react';
import {
  OrderDetailResponse,
  fetchOrderDetail,
  changeOrderStatus,
  quickCreateInvoiceForOrder,
  quickCreateShipmentForOrder,
} from '../services/orderService';
import { quickShipOrder } from '../services/shipmentService';
import { ReceiveInventoryModal } from './ReceiveInventoryModal';
import { ShipmentDetailModal } from './ShipmentDetailModal';
import { ArrowDownToLine } from 'lucide-react';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onOrderChanged?: () => void;
  onViewInvoice?: (invoiceId: string) => void;
  onViewShipment?: (shipmentId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onOrderChanged,
  onViewInvoice,
  onViewShipment,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const sTrans = translations.shipments;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<OrderDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'adjustments' | 'roles' | 'history' | 'documents'>('items');
  const [changeReason, setChangeReason] = useState('');
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);

  // Phase 1 Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);

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

  const handleQuickShipOrderAction = async () => {
    if (!orderId || !window.confirm(sTrans.fulfillShipConfirm || 'Bu siparişi depodan sevk edip stoktan düşmek ve tamamlamak istiyor musunuz?')) return;
    try {
      setIsChangingStatus(true);
      setError(null);
      setQuickSuccess(null);
      const res = await quickShipOrder({ orderId });
      setQuickSuccess(res.successMessage || 'Sipariş sevk edildi.');
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
            <div className="ds-alert-error flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          {quickSuccess && (
            <div className="ds-alert-success flex items-center justify-between">
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
              <div className="ds-spinner-sm mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* Summary Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="ds-card p-4 flex items-center space-x-3">
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

                <div className="ds-card p-4 flex items-center space-x-3">
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

                <div className="ds-card p-4 flex items-center space-x-3">
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

                <div className="ds-card p-4 flex items-center space-x-3">
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
              <div className="ds-card p-4 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex-1 w-full md:w-auto">
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder={t.changeReasonPlaceholder}
                    className="ds-input text-xs"
                  />
                </div>
                <div className="flex items-center space-x-2 w-full md:w-auto justify-end flex-wrap gap-y-2">
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

                  {/* Purchase Order: Mal Kabul Butonu */}
                  {header?.orderTypeId === 'PURCHASE_ORDER' && (currentStatusId === 'ORDER_APPROVED' || currentStatusId === 'ORDER_CREATED') && (
                    <button
                      type="button"
                      onClick={() => setIsReceiveModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>{sTrans.receiveGoodsBtn || 'Depoya Mal Kabul Et'}</span>
                    </button>
                  )}

                  {/* Sales Order: Hızlı Sevk Et & Stoktan Düş */}
                  {header?.orderTypeId === 'SALES_ORDER' && currentStatusId === 'ORDER_APPROVED' && (
                    <button
                      type="button"
                      disabled={isChangingStatus}
                      onClick={handleQuickShipOrderAction}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center space-x-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <Truck className="w-4 h-4" />
                      <span>{sTrans.fulfillShipBtn || 'Hızlı Sevk Et & Stoktan Düş'}</span>
                    </button>
                  )}

                  <div className="h-6 w-px bg-slate-700 mx-1 hidden md:block" />

                  {/* Quick Action: Fatura Oluştur */}
                  <button
                    type="button"
                    disabled={isChangingStatus}
                    onClick={handleQuickInvoice}
                    className="ds-btn-secondary flex items-center space-x-1.5 text-xs py-2 px-3"
                    title={t.createInvoiceQuick}
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>{t.createInvoiceQuick}</span>
                  </button>

                  {/* Quick Action: Sevkiyat Başlat */}
                  <button
                    type="button"
                    disabled={isChangingStatus}
                    onClick={handleQuickShipment}
                    className="ds-btn-secondary flex items-center space-x-1.5 text-xs py-2 px-3"
                    title={t.createShipmentQuick}
                  >
                    <Truck className="w-4 h-4 text-blue-400" />
                    <span>{t.createShipmentQuick}</span>
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="ds-tab-bar">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`ds-tab ${activeTab === 'items' ? 'ds-tab-active' : ''}`}
                >
                  <Package className="w-4 h-4" />
                  <span>{t.items} ({detail?.orderItems?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`ds-tab ${activeTab === 'documents' ? 'ds-tab-active' : ''}`}
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {sTrans.linkedDocuments || 'Faturalar & Sevkiyat'} (
                    {(detail?.orderInvoices?.length || 0) + (detail?.orderShipments?.length || 0)}
                    )
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('adjustments')}
                  className={`ds-tab ${activeTab === 'adjustments' ? 'ds-tab-active' : ''}`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{t.adjustments} ({detail?.orderAdjustments?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('roles')}
                  className={`ds-tab ${activeTab === 'roles' ? 'ds-tab-active' : ''}`}
                >
                  <Users className="w-4 h-4" />
                  <span>{t.roles} ({detail?.orderRoles?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`ds-tab ${activeTab === 'history' ? 'ds-tab-active' : ''}`}
                >
                  <History className="w-4 h-4" />
                  <span>{t.statusHistory} ({detail?.orderStatuses?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Items */}
              {activeTab === 'items' && (
                <div className="ds-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">#</th>
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
                </div>
              )}

              {/* Tab: Linked Invoices & Shipments */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Linked Invoices Section */}
                  <div className="ds-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {sTrans.linkedInvoices || 'İlişkili Faturalar'} ({detail?.orderInvoices?.length || 0})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickInvoice}
                        className="ds-btn-ghost text-xs !py-1 !px-2.5 text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>{t.createInvoiceQuick}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">{sTrans.invoiceId || 'Fatura No'}</th>
                            <th className="ds-th">{t.type}</th>
                            <th className="ds-th">{sTrans.invoiceDate || 'Tarih'}</th>
                            <th className="ds-th-right">{sTrans.invoiceTotal || 'Tutar'}</th>
                            <th className="ds-th">{t.status}</th>
                            <th className="ds-th-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail?.orderInvoices && detail.orderInvoices.length > 0 ? (
                            detail.orderInvoices.map(inv => (
                              <tr key={inv.invoiceId} className="ds-tbody-row">
                                <td className="ds-td-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {inv.invoiceId}
                                </td>
                                <td className="ds-td text-slate-700 dark:text-slate-300">
                                  {inv.invoiceTypeDesc || inv.invoiceTypeId}
                                </td>
                                <td className="ds-td text-slate-500 dark:text-slate-400">
                                  {formatDate(inv.invoiceDate)}
                                </td>
                                <td className="ds-td-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {formatCurrency(inv.totalAmount, header?.currencyUom)}
                                </td>
                                <td className="ds-td">
                                  {getStatusBadge(inv.statusId, inv.statusDesc)}
                                </td>
                                <td className="ds-td-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onViewInvoice?.(inv.invoiceId);
                                    }}
                                    className="ds-btn-secondary text-xs !py-1 !px-2.5 cursor-pointer"
                                  >
                                    {sTrans.viewInvoice || 'Görüntüle'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-500 italic">
                                {sTrans.noLinkedInvoices || 'Bu sipariş için henüz fatura oluşturulmamış.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Linked Shipments Section */}
                  <div className="ds-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {sTrans.linkedShipments || 'İlişkili Sevkiyat & İrsaliyeler'} ({detail?.orderShipments?.length || 0})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleQuickShipment}
                        className="ds-btn-ghost text-xs !py-1 !px-2.5 text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>{t.createShipmentQuick}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">{sTrans.shipmentId || 'İrsaliye No'}</th>
                            <th className="ds-th">{t.type}</th>
                            <th className="ds-th">{sTrans.carrierTracking || 'Kargo / Takip'}</th>
                            <th className="ds-th">{sTrans.shipDate || 'Sevk Tarihi'}</th>
                            <th className="ds-th">{t.status}</th>
                            <th className="ds-th-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail?.orderShipments && detail.orderShipments.length > 0 ? (
                            detail.orderShipments.map(s => (
                              <tr key={s.shipmentId} className="ds-tbody-row">
                                <td className="ds-td-mono font-bold text-indigo-600 dark:text-indigo-400">
                                  {s.shipmentId}
                                </td>
                                <td className="ds-td text-slate-700 dark:text-slate-300">
                                  {s.shipmentTypeDesc || s.shipmentTypeId}
                                </td>
                                <td className="ds-td">
                                  {s.carrierPartyId ? (
                                    <div className="text-xs">
                                      <span className="font-semibold text-slate-900 dark:text-white">{s.carrierPartyId}</span>
                                      {s.trackingIdNumber && <span className="text-amber-600 dark:text-amber-400 ml-1 font-mono">({s.trackingIdNumber})</span>}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500">-</span>
                                  )}
                                </td>
                                <td className="ds-td text-slate-500 dark:text-slate-400">
                                  {formatDate(s.estimatedShipDate || s.createdDate)}
                                </td>
                                <td className="ds-td">
                                  {getStatusBadge(s.statusId, s.statusDesc)}
                                </td>
                                <td className="ds-td-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (onViewShipment) {
                                        onViewShipment(s.shipmentId);
                                      } else {
                                        setSelectedShipmentId(s.shipmentId);
                                        setIsShipmentModalOpen(true);
                                      }
                                    }}
                                    className="ds-btn-secondary text-xs !py-1 !px-2.5 cursor-pointer"
                                  >
                                    {sTrans.viewShipment || 'İncele'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-500 italic">
                                {sTrans.noLinkedShipments || 'Bu sipariş için henüz sevkiyat kaydı bulunmuyor.'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Goods Receipts Section (if PO) */}
                  {header?.orderTypeId === 'PURCHASE_ORDER' && detail?.orderReceipts && detail.orderReceipts.length > 0 && (
                    <div className="ds-card p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {sTrans.shipmentReceipts || 'Depo Mal Kabul Kayıtları'} ({detail.orderReceipts.length})
                        </h3>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                        <table className="ds-table text-xs">
                          <thead>
                            <tr className="ds-thead-row">
                              <th className="ds-th">{sTrans.receiptId || 'Kabul No'}</th>
                              <th className="ds-th">Kalem #</th>
                              <th className="ds-th">{t.product}</th>
                              <th className="ds-th-right">{sTrans.acceptedQty || 'Kabul'}</th>
                              <th className="ds-th-right">{sTrans.rejectedQty || 'Red'}</th>
                              <th className="ds-th">{sTrans.receiptDate || 'Tarih'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.orderReceipts.map(rc => (
                              <tr key={rc.receiptId} className="ds-tbody-row">
                                <td className="ds-td-mono font-bold text-indigo-600 dark:text-indigo-400">{rc.receiptId}</td>
                                <td className="ds-td-mono text-slate-500 dark:text-slate-400">{rc.orderItemSeqId}</td>
                                <td className="ds-td text-slate-900 dark:text-white">{rc.productName || rc.productId}</td>
                                <td className="ds-td-right font-bold text-emerald-600 dark:text-emerald-400">{rc.quantityAccepted}</td>
                                <td className="ds-td-right font-medium text-rose-600 dark:text-rose-400">{rc.quantityRejected}</td>
                                <td className="ds-td text-slate-500 dark:text-slate-400">{formatDate(rc.datetimeReceived)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Adjustments */}
              {activeTab === 'adjustments' && (
                <div className="ds-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
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
                              {common.noData}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 3: Roles */}
              {activeTab === 'roles' && (
                <div className="ds-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.role}</th>
                          <th className="ds-th">{t.partyId}</th>
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
                              {common.noData}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: History */}
              {activeTab === 'history' && (
                <div className="ds-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
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
                              {common.noData}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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

      {/* Phase 1 Modals */}
      {isReceiveModalOpen && (
        <ReceiveInventoryModal
          isOpen={isReceiveModalOpen}
          onClose={() => setIsReceiveModalOpen(false)}
          orderId={orderId}
          items={detail?.orderItems || []}
          receipts={detail?.orderReceipts || []}
          originFacilityId={detail?.orderHeader?.originFacilityId}
          onSuccess={() => {
            loadDetail();
            onOrderChanged?.();
          }}
        />
      )}

      {isShipmentModalOpen && (
        <ShipmentDetailModal
          isOpen={isShipmentModalOpen}
          onClose={() => setIsShipmentModalOpen(false)}
          shipmentId={selectedShipmentId}
          onShipmentUpdated={() => {
            loadDetail();
            onOrderChanged?.();
          }}
        />
      )}
    </div>
  );
};
