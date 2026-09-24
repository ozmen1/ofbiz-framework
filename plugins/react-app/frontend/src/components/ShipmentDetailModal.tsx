import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Package,
  Edit2,
  Save,
  Loader2,
  FileText
} from 'lucide-react';
import {
  ShipmentDetailResponse,
  fetchShipmentDetail,
  updateShipmentStatus,
  updateShipmentRoute,
  fetchShipmentMetadata,
  ShipmentMetadata
} from '../services/shipmentService';

interface ShipmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string | null;
  onShipmentUpdated?: () => void;
  onViewOrder?: (orderId: string) => void;
}

export const ShipmentDetailModal: React.FC<ShipmentDetailModalProps> = ({
  isOpen,
  onClose,
  shipmentId,
  onShipmentUpdated,
  onViewOrder,
}) => {
  const { translations, locale } = useTranslation();
  const common = translations.common;
  const sTrans = translations.shipments;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ShipmentDetailResponse | null>(null);
  const [metadata, setMetadata] = useState<ShipmentMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Edit Route / Tracking
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [carrierPartyId, setCarrierPartyId] = useState('');
  const [trackingIdNumber, setTrackingIdNumber] = useState('');
  const [savingRoute, setSavingRoute] = useState(false);

  const loadData = useCallback(async () => {
    if (!shipmentId) return;
    try {
      setLoading(true);
      setError(null);
      setActionSuccess(null);
      const [resDetail, resMeta] = await Promise.all([
        fetchShipmentDetail(shipmentId),
        fetchShipmentMetadata()
      ]);
      setDetail(resDetail);
      setMetadata(resMeta);

      const firstRoute = resDetail.shipmentRoutes?.[0];
      setCarrierPartyId(firstRoute?.carrierPartyId || '_NA_');
      setTrackingIdNumber(firstRoute?.trackingIdNumber || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [shipmentId, common.error]);

  useEffect(() => {
    if (isOpen && shipmentId) {
      document.body.style.overflow = 'hidden';
      loadData();
      setIsEditingRoute(false);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, shipmentId, loadData]);

  const carrierOptions = useMemo(() => {
    if (!metadata?.carriers) return [];
    return metadata.carriers.map(c => (
      <option key={c.carrierPartyId} value={c.carrierPartyId}>
        {c.carrierName} ({c.carrierPartyId})
      </option>
    ));
  }, [metadata]);

  if (!isOpen || !shipmentId) return null;

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

  const handleStatusChange = async (newStatusId: string) => {
    if (!window.confirm(`${sTrans.confirmStatusChange || 'Sevkiyat durumunu değiştirmek istediğinize emin misiniz?'} -> ${newStatusId}`)) {
      return;
    }
    try {
      setUpdatingStatus(true);
      setError(null);
      setActionSuccess(null);
      const res = await updateShipmentStatus({
        shipmentId,
        statusId: newStatusId,
      });
      setActionSuccess(res.successMessage || 'Durum başarıyla güncellendi.');
      await loadData();
      onShipmentUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveRoute = async () => {
    try {
      setSavingRoute(true);
      setError(null);
      setActionSuccess(null);
      const res = await updateShipmentRoute({
        shipmentId,
        carrierPartyId: carrierPartyId.trim() || undefined,
        trackingIdNumber: trackingIdNumber.trim() || undefined,
      });
      setActionSuccess(res.successMessage || 'Kargo ve takip bilgisi kaydedildi.');
      setIsEditingRoute(false);
      await loadData();
      onShipmentUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setSavingRoute(false);
    }
  };

  const header = detail?.shipmentHeader;
  const isSales = header?.shipmentTypeId === 'SALES_SHIPMENT';
  const statusId = header?.statusId || '';

  const getStatusBadgeClass = (sId: string) => {
    switch (sId) {
      case 'SHIPMENT_SHIPPED':
      case 'PURCH_SHIP_SHIPPED':
        return 'ds-badge ds-badge-blue';
      case 'SHIPMENT_DELIVERED':
      case 'PURCH_SHIP_RECEIVED':
        return 'ds-badge ds-badge-green';
      case 'SHIPMENT_CANCELLED':
        return 'ds-badge ds-badge-red';
      case 'SHIPMENT_PACKED':
      case 'SHIPMENT_PICKED':
      case 'SHIPMENT_SCHEDULED':
        return 'ds-badge ds-badge-yellow';
      default:
        return 'ds-badge ds-badge-slate';
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400">
              <Truck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {sTrans.shipmentDetailTitle || 'Sevkiyat & İrsaliye Detayı'}
                </h2>
                <span className="font-mono text-sm px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-slate-700">
                  {shipmentId}
                </span>
                {header && (
                  <span className={getStatusBadgeClass(header.statusId)}>
                    {header.statusDesc || header.statusId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {header?.shipmentTypeDesc} &bull; {sTrans.createdDate || 'Kayıt Tarihi'}: {formatDate(header?.createdDate)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2.5 text-xs text-rose-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2.5 text-xs text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={28} className="animate-spin text-indigo-500" />
              <span className="text-xs">{common.loading}</span>
            </div>
          ) : detail && header ? (
            <>
              {/* Status Action Bar */}
              <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {sTrans.changeStatusTo || 'Aksiyonlar'}:
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isSales ? (
                    <>
                      {['SHIPMENT_INPUT', 'SHIPMENT_SCHEDULED'].includes(statusId) && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('SHIPMENT_PACKED')}
                          className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Package size={14} />
                          {sTrans.markPacked || 'Paketlendi'}
                        </button>
                      )}
                      {['SHIPMENT_INPUT', 'SHIPMENT_SCHEDULED', 'SHIPMENT_PACKED', 'SHIPMENT_PICKED'].includes(statusId) && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('SHIPMENT_SHIPPED')}
                          className="ds-btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Truck size={14} />
                          {sTrans.markShipped || 'Sevk Edildi (Yola Çıktı)'}
                        </button>
                      )}
                      {statusId === 'SHIPMENT_SHIPPED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('SHIPMENT_DELIVERED')}
                          className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          {sTrans.markDelivered || 'Teslim Edildi'}
                        </button>
                      )}
                      {statusId !== 'SHIPMENT_CANCELLED' && statusId !== 'SHIPMENT_DELIVERED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('SHIPMENT_CANCELLED')}
                          className="ds-btn-danger text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer"
                        >
                          {sTrans.cancelShipment || 'İptal Et'}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {statusId === 'PURCH_SHIP_CREATED' && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('PURCH_SHIP_SHIPPED')}
                          className="ds-btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Truck size={14} />
                          {sTrans.markShipped || 'Tedarikçi Sevk Etti'}
                        </button>
                      )}
                      {['PURCH_SHIP_CREATED', 'PURCH_SHIP_SHIPPED'].includes(statusId) && (
                        <button
                          type="button"
                          disabled={updatingStatus}
                          onClick={() => handleStatusChange('PURCH_SHIP_RECEIVED')}
                          className="ds-btn-secondary text-xs !py-1.5 !px-3 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          {sTrans.markReceived || 'Depoya Teslim Alındı'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* General Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ds-card p-4 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {sTrans.parties || 'Taraflar'}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{sTrans.partyFrom || 'Çıkış'}:</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{header.partyIdFrom || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{sTrans.partyTo || 'Varış'}:</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{header.partyIdTo || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card p-4 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {sTrans.warehouses || 'Tesis & Depolar'}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{sTrans.originFacility || 'Çıkış Deposu'}:</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{header.originFacilityName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{sTrans.destFacility || 'Varış Deposu'}:</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{header.destinationFacilityName || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="ds-card p-4 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {sTrans.linkedOrder || 'İlişkili Sipariş'}
                  </div>
                  <div>
                    {header.primaryOrderId ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onViewOrder?.(header.primaryOrderId!);
                        }}
                        className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={14} />
                        {header.primaryOrderId}
                        <ExternalLink size={12} />
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Carrier & Tracking Segment */}
              <div className="ds-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {sTrans.carrierAndTracking || 'Taşıyıcı Kargo & Takip Bilgileri'}
                    </h3>
                  </div>
                  {!isEditingRoute ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingRoute(true)}
                      className="ds-btn-ghost text-xs !py-1 !px-2.5 text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 size={13} />
                      {common.edit}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingRoute(false)}
                        className="ds-btn-secondary text-xs !py-1 !px-2.5"
                      >
                        {common.cancel}
                      </button>
                      <button
                        type="button"
                        disabled={savingRoute}
                        onClick={handleSaveRoute}
                        className="ds-btn-primary text-xs !py-1 !px-2.5 flex items-center gap-1"
                      >
                        {savingRoute ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        {common.save}
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingRoute ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{sTrans.carrier || 'Kargo Firması'}:</span>{' '}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {carrierPartyId === '_NA_' ? 'Özel / Mağaza Teslim' : carrierPartyId || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{sTrans.trackingNumber || 'Takip Numarası'}:</span>{' '}
                      {trackingIdNumber ? (
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{trackingIdNumber}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">{sTrans.noTracking || 'Takip no girilmedi'}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {sTrans.carrier || 'Taşıyıcı / Kargo'}
                      </label>
                      <select
                        value={carrierPartyId}
                        onChange={e => setCarrierPartyId(e.target.value)}
                        className="ds-select !py-1.5 !text-xs"
                      >
                        {carrierOptions}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {sTrans.trackingNumber || 'Takip Numarası'}
                      </label>
                      <input
                        type="text"
                        value={trackingIdNumber}
                        onChange={e => setTrackingIdNumber(e.target.value)}
                        placeholder="Örn: 1Z9999999999999999"
                        className="ds-input !py-1.5 !text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {sTrans.shipmentItems || 'Sevkiyat Kalemleri'} ({detail.shipmentItems?.length || 0})
                  </h3>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th w-16">#</th>
                        <th className="ds-th">{sTrans.productId || 'Ürün Kodu'}</th>
                        <th className="ds-th">{sTrans.productName || 'Ürün Adı'}</th>
                        <th className="ds-th text-right">{sTrans.quantity || 'Miktar'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.shipmentItems?.length ? (
                        detail.shipmentItems.map(item => (
                          <tr key={item.shipmentItemSeqId} className="ds-tbody-row">
                            <td className="ds-td ds-td-mono">{item.shipmentItemSeqId}</td>
                            <td className="ds-td ds-td-mono font-semibold text-indigo-600 dark:text-indigo-400">{item.productId}</td>
                            <td className="ds-td">{item.productName || item.productId}</td>
                            <td className="ds-td text-right font-bold text-slate-900 dark:text-white">{item.quantity}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-500">
                            {sTrans.noItemsInShipment || 'Bu sevkiyatta kalem bulunamadı.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Receipts if any */}
              {detail.shipmentReceipts && detail.shipmentReceipts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      {sTrans.shipmentReceipts || 'Depo Mal Kabul Kayıtları'}
                    </h3>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{sTrans.receiptId || 'Kabul No'}</th>
                          <th className="ds-th">{sTrans.product || 'Ürün'}</th>
                          <th className="ds-th text-right">{sTrans.acceptedQty || 'Kabul'}</th>
                          <th className="ds-th text-right">{sTrans.rejectedQty || 'Red'}</th>
                          <th className="ds-th">{sTrans.receiptDate || 'Kabul Tarihi'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.shipmentReceipts.map(rc => (
                          <tr key={rc.receiptId} className="ds-tbody-row">
                            <td className="ds-td ds-td-mono">{rc.receiptId}</td>
                            <td className="ds-td ds-td-mono font-semibold text-indigo-600 dark:text-indigo-400">{rc.productId}</td>
                            <td className="ds-td text-right font-bold text-emerald-600 dark:text-emerald-400">{rc.quantityAccepted}</td>
                            <td className="ds-td text-right font-medium text-rose-600 dark:text-rose-400">{rc.quantityRejected}</td>
                            <td className="ds-td">{formatDate(rc.datetimeReceived)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
