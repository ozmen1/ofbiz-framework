import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Warehouse, CheckCircle2, AlertCircle, ArrowDownToLine, Loader2 } from 'lucide-react';
import { receivePOInventory, ReceivePOItemInput, fetchShipmentMetadata, ShipmentMetadata } from '../services/shipmentService';
import { OrderItemRecord, OrderLinkedReceipt } from '../services/orderService';

interface ReceiveInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  items: OrderItemRecord[];
  receipts?: OrderLinkedReceipt[];
  originFacilityId?: string;
  onSuccess: () => void;
}

export const ReceiveInventoryModal: React.FC<ReceiveInventoryModalProps> = ({
  isOpen,
  onClose,
  orderId,
  items,
  receipts = [],
  originFacilityId,
  onSuccess,
}) => {
  const { translations } = useTranslation();
  const common = translations.common;

  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadata, setMetadata] = useState<ShipmentMetadata | null>(null);
  const [facilityId, setFacilityId] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for item receipt entries: orderItemSeqId -> { accepted, rejected }
  const [itemInputs, setItemInputs] = useState<Record<string, { accepted: number; rejected: number }>>({});

  // Calculate previously received quantity per item
  const alreadyReceivedMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of receipts) {
      if (r.orderItemSeqId) {
        map[r.orderItemSeqId] = (map[r.orderItemSeqId] || 0) + (r.quantityAccepted || 0);
      }
    }
    return map;
  }, [receipts]);

  // Initialize receipt quantities with remaining amounts
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const initial: Record<string, { accepted: number; rejected: number }> = {};
      for (const item of items) {
        const netOrdered = (item.quantity || 0) - (item.cancelQuantity || 0);
        const alreadyReceived = alreadyReceivedMap[item.orderItemSeqId] || 0;
        const remaining = Math.max(0, netOrdered - alreadyReceived);
        initial[item.orderItemSeqId] = {
          accepted: remaining,
          rejected: 0,
        };
      }
      setItemInputs(initial);
      setError(null);
      setComments('');

      // Fetch facilities
      setLoadingMetadata(true);
      fetchShipmentMetadata()
        .then(meta => {
          setMetadata(meta);
          if (originFacilityId && meta.facilities.some(f => f.facilityId === originFacilityId)) {
            setFacilityId(originFacilityId);
          } else if (meta.facilities.length > 0) {
            setFacilityId(meta.facilities[0].facilityId);
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : common.error);
        })
        .finally(() => {
          setLoadingMetadata(false);
        });
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, items, alreadyReceivedMap, originFacilityId, common.error]);

  const facilityOptions = useMemo(() => {
    if (!metadata?.facilities) return [];
    return metadata.facilities.map(f => (
      <option key={f.facilityId} value={f.facilityId}>
        {f.facilityName} ({f.facilityId})
      </option>
    ));
  }, [metadata]);

  if (!isOpen) return null;

  const handleQuantityChange = (seqId: string, field: 'accepted' | 'rejected', val: number) => {
    setItemInputs(prev => ({
      ...prev,
      [seqId]: {
        ...prev[seqId],
        [field]: isNaN(val) || val < 0 ? 0 : val,
      },
    }));
  };

  const handleReceiveAll = () => {
    const updated: Record<string, { accepted: number; rejected: number }> = {};
    for (const item of items) {
      const netOrdered = (item.quantity || 0) - (item.cancelQuantity || 0);
      const alreadyReceived = alreadyReceivedMap[item.orderItemSeqId] || 0;
      const remaining = Math.max(0, netOrdered - alreadyReceived);
      updated[item.orderItemSeqId] = {
        accepted: remaining,
        rejected: 0,
      };
    }
    setItemInputs(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) {
      setError(translations.shipments.selectFacilityError || 'Lütfen mal kabul yapılacak depoyu seçin.');
      return;
    }

    const payloadItems: ReceivePOItemInput[] = [];
    for (const item of items) {
      const input = itemInputs[item.orderItemSeqId];
      if (input && (input.accepted > 0 || input.rejected > 0)) {
        payloadItems.push({
          orderItemSeqId: item.orderItemSeqId,
          productId: item.productId || '',
          quantityAccepted: input.accepted,
          quantityRejected: input.rejected,
        });
      }
    }

    if (payloadItems.length === 0) {
      setError(translations.shipments.noItemsToReceiveError || 'Kabul edilecek miktar girilmedi.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await receivePOInventory({
        orderId,
        facilityId,
        comments: comments.trim() || undefined,
        items: payloadItems,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <ArrowDownToLine size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {translations.shipments.receiveInventoryTitle || 'Depoya Mal Kabul Et'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {translations.shipments.receiveInventorySubtitle || 'Satın alma siparişindeki ürünleri depoya alıp stok miktarını güncelleyin'} &bull; <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{orderId}</span>
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

        {/* Form Body - Single vertical scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="ds-alert-error flex items-center gap-2.5 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Facility & Comments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ds-label flex items-center gap-1.5">
                <Warehouse size={14} className="text-emerald-500 dark:text-emerald-400" />
                <span>{translations.shipments.targetFacility || 'Hedef Depo (Tesis)'}</span> <span className="text-rose-500">*</span>
              </label>
              <select
                value={facilityId}
                onChange={e => setFacilityId(e.target.value)}
                required
                disabled={loadingMetadata}
                className="ds-select"
              >
                {facilityOptions}
              </select>
            </div>

            <div>
              <label className="ds-label">
                {translations.shipments.receiptComments || 'Kabul Notu / İrsaliye Açıklaması'}
              </label>
              <input
                type="text"
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder={translations.shipments.receiptCommentsPlaceholder || 'Örn: İrsaliye No: 2026-0901'}
                className="ds-input"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {translations.shipments.itemsToReceive || 'Kabul Edilecek Sipariş Kalemleri'}
              </h3>
              <button
                type="button"
                onClick={handleReceiveAll}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                {translations.shipments.fillRemaining || 'Kalan Miktarları Doldur'}
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/60 rounded-xl">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{translations.shipments.itemSeq || '#'}</th>
                    <th className="ds-th">{translations.shipments.product || 'Ürün'}</th>
                    <th className="ds-th-right">{translations.shipments.orderedQty || 'Sipariş'}</th>
                    <th className="ds-th-right">{translations.shipments.receivedQty || 'Kabul Edilen'}</th>
                    <th className="ds-th-right">{translations.shipments.remainingQty || 'Kalan'}</th>
                    <th className="ds-th text-center w-32">{translations.shipments.acceptQty || 'Kabul (Adet)'}</th>
                    <th className="ds-th text-center w-28">{translations.shipments.rejectQty || 'Fire/Red'}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => {
                    const netOrdered = (it.quantity || 0) - (it.cancelQuantity || 0);
                    const alreadyReceived = alreadyReceivedMap[it.orderItemSeqId] || 0;
                    const remaining = Math.max(0, netOrdered - alreadyReceived);
                    const currentInput = itemInputs[it.orderItemSeqId] || { accepted: 0, rejected: 0 };
                    const isFullyReceived = remaining <= 0;

                    return (
                      <tr key={it.orderItemSeqId} className={`ds-tbody-row ${isFullyReceived ? 'opacity-50' : ''}`}>
                        <td className="ds-td-mono">{it.orderItemSeqId}</td>
                        <td className="ds-td">
                          <div className="font-semibold text-slate-900 dark:text-white">{it.itemDescription || it.productId}</div>
                          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">{it.productId}</div>
                        </td>
                        <td className="ds-td-right">{netOrdered}</td>
                        <td className="ds-td-right font-medium text-emerald-600 dark:text-emerald-400">{alreadyReceived}</td>
                        <td className="ds-td-right font-bold text-amber-600 dark:text-amber-400">{remaining}</td>
                        <td className="ds-td text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isFullyReceived}
                            value={currentInput.accepted}
                            onChange={e => handleQuantityChange(it.orderItemSeqId, 'accepted', parseFloat(e.target.value))}
                            className="ds-input w-24 py-1 text-center font-bold disabled:opacity-40"
                          />
                        </td>
                        <td className="ds-td text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={isFullyReceived}
                            value={currentInput.rejected}
                            onChange={e => handleQuantityChange(it.orderItemSeqId, 'rejected', parseFloat(e.target.value))}
                            className="ds-input w-20 py-1 text-center font-medium text-rose-500 disabled:opacity-40"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="ds-btn-secondary text-sm"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={submitting || loadingMetadata}
              className="ds-btn-primary text-sm bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40 shadow-emerald-950/20"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{translations.shipments.confirmReceipt || 'Mal Kabulü Tamamla ve Stoğa Al'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
