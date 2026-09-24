import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, CheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';
import {
  WmsMetadata,
  PickableOrder,
  fetchPickableOrders,
  createPicklist,
} from '../services/wmsService';

interface CreatePicklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (picklistId: string) => void;
  metadata: WmsMetadata | null;
}

export const CreatePicklistModal: React.FC<CreatePicklistModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  metadata,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [facilityId, setFacilityId] = useState('WebStoreWarehouse');
  const [description, setDescription] = useState('');
  const [shipmentMethodTypeId, setShipmentMethodTypeId] = useState('STANDARD');

  const [pickableOrders, setPickableOrders] = useState<PickableOrder[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load pickable orders
      setIsLoadingOrders(true);
      fetchPickableOrders(facilityId)
        .then(orders => {
          setPickableOrders(orders);
          // By default select all ready orders if any
          setSelectedOrderIds(orders.map(o => o.orderId));
        })
        .catch(err => {
          console.error('Failed to load pickable orders', err);
        })
        .finally(() => {
          setIsLoadingOrders(false);
        });
    } else {
      document.body.style.overflow = '';
      setError(null);
      setDescription('');
      setSelectedOrderIds([]);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, facilityId]);

  // Memoized Facility Options
  const facilityOptions = useMemo(() => {
    return (metadata?.facilities || []).map(f => (
      <option key={f.facilityId} value={f.facilityId}>
        {f.facilityName} ({f.facilityId})
      </option>
    ));
  }, [metadata?.facilities]);

  // Memoized Shipment Method Options
  const shipmentMethodOptions = useMemo(() => {
    return (metadata?.shipmentMethods || []).map(sm => (
      <option key={sm.shipmentMethodTypeId} value={sm.shipmentMethodTypeId}>
        {sm.description || sm.shipmentMethodTypeId}
      </option>
    ));
  }, [metadata?.shipmentMethods]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === pickableOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(pickableOrders.map(o => o.orderId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!facilityId) {
      setError(t.facilityRequired || 'Tesis seçilmelidir');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createPicklist({
        facilityId,
        description: description.trim() || `${t.pickSheet || 'Toplama Listesi'} - ${new Date().toLocaleDateString()}`,
        shipmentMethodTypeId,
        orderIds: selectedOrderIds,
      });
      onCreated(res.picklistId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Toplama listesi oluşturulurken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ShoppingCart size={20} className="text-cyan-500" />
              {t.createPicklist || 'Yeni Toplama Listesi (Picklist)'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.createPicklistDesc || 'Onaylanmış siparişleri depodan toplamak üzere yeni bir toplama listesi oluşturun'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Facility */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.facility || 'Depo / Tesis'} *
              </label>
              <select
                value={facilityId}
                onChange={e => setFacilityId(e.target.value)}
                required
                className="ds-select w-full"
              >
                {facilityOptions}
              </select>
            </div>

            {/* Shipment Method */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.shipmentMethod || 'Sevkiyat Yöntemi'}
              </label>
              <select
                value={shipmentMethodTypeId}
                onChange={e => setShipmentMethodTypeId(e.target.value)}
                className="ds-select w-full"
              >
                {shipmentMethodOptions}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.description || 'Açıklama / Not'}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Örn: Sabah Toplama Turu - Web Siparişleri"
              className="ds-input w-full"
            />
          </div>

          {/* Pickable Orders Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t.pickableOrders || 'Toplama Bekleyen Siparişler'} ({selectedOrderIds.length}/{pickableOrders.length})
              </label>
              {pickableOrders.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
                >
                  {selectedOrderIds.length === pickableOrders.length ? (common?.reset || 'Seçimi Kaldır') : (common?.all || 'Tümünü Seç')}
                </button>
              )}
            </div>

            {isLoadingOrders ? (
              <div className="p-6 text-center text-xs text-slate-500">
                {common?.loading || 'Siparişler taranıyor...'}
              </div>
            ) : pickableOrders.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                {t.noPickableOrders || 'Bu depoda toplanmayı bekleyen onaylı satış siparişi bulunamadı. Boş bir toplama listesi oluşturabilirsiniz.'}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80">
                <table className="ds-table w-full text-left">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th w-10 text-center">#</th>
                      <th className="ds-th">{t.orderId || 'Sipariş No'}</th>
                      <th className="ds-th">{t.customer || 'Müşteri'}</th>
                      <th className="ds-th">{t.itemCount || 'Kalemler'}</th>
                      <th className="ds-th text-right">{t.amount || 'Tutar'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickableOrders.map(order => {
                      const isSelected = selectedOrderIds.includes(order.orderId);
                      return (
                        <tr
                          key={order.orderId}
                          onClick={() => toggleOrderSelection(order.orderId)}
                          className={`ds-tbody-row cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-50/60 dark:bg-cyan-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="ds-td text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by tr click
                              className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                          </td>
                          <td className="ds-td font-semibold text-slate-900 dark:text-slate-100">
                            {order.orderId}
                          </td>
                          <td className="ds-td text-slate-700 dark:text-slate-300 text-xs">
                            {order.customerName || '-'}
                          </td>
                          <td className="ds-td text-xs text-slate-600 dark:text-slate-400">
                            {order.itemCount} kalem ({order.totalQuantity} adet)
                          </td>
                          <td className="ds-td text-right font-medium text-slate-900 dark:text-slate-100 text-xs">
                            {order.grandTotal.toFixed(2)} {order.currencyUom}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary px-4 py-2 text-xs"
            >
              {common?.cancel || 'İptal'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary px-5 py-2 text-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>{common?.loading || 'Oluşturuluyor...'}</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{t.createPicklist || 'Listeyi Oluştur'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
