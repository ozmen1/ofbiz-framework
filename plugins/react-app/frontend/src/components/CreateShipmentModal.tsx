import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Truck, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
  createShipment,
  fetchShipmentMetadata,
  ShipmentMetadata,
} from '../services/shipmentService';

interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (shipmentId: string) => void;
  initialOrderId?: string;
  initialShipmentType?: string;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialOrderId,
  initialShipmentType,
}) => {
  const { translations } = useTranslation();
  const common = translations.common;
  const sTrans = translations.shipments;

  const [metadata, setMetadata] = useState<ShipmentMetadata | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [shipmentTypeId, setShipmentTypeId] = useState<string>(initialShipmentType || 'SALES_SHIPMENT');
  const [primaryOrderId, setPrimaryOrderId] = useState<string>(initialOrderId || '');
  const [partyIdFrom, setPartyIdFrom] = useState<string>('Company');
  const [partyIdTo, setPartyIdTo] = useState<string>('');
  const [originFacilityId, setOriginFacilityId] = useState<string>('');
  const [destinationFacilityId, setDestinationFacilityId] = useState<string>('');
  const [estimatedShipDate, setEstimatedShipDate] = useState<string>('');
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState<string>('');
  const [handlingInstructions, setHandlingInstructions] = useState<string>('');
  const [carrierPartyId, setCarrierPartyId] = useState<string>('_NA_');
  const [trackingIdNumber, setTrackingIdNumber] = useState<string>('');

  // Items
  const [items, setItems] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 }
  ]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setPrimaryOrderId(initialOrderId || '');
      setShipmentTypeId(initialShipmentType || 'SALES_SHIPMENT');
      setItems([{ productId: '', quantity: 1 }]);

      // Default today
      const today = new Date().toISOString().substring(0, 10);
      setEstimatedShipDate(today);

      fetchShipmentMetadata()
        .then(meta => {
          setMetadata(meta);
          if (meta.facilities?.length > 0) {
            setOriginFacilityId(meta.facilities[0].facilityId);
          }
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : common.error);
        });
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialOrderId, initialShipmentType, common.error]);

  const facilityOptions = useMemo(() => {
    if (!metadata?.facilities) return [];
    return metadata.facilities.map(f => (
      <option key={f.facilityId} value={f.facilityId}>
        {f.facilityName} ({f.facilityId})
      </option>
    ));
  }, [metadata]);

  const partyOptions = useMemo(() => {
    if (!metadata?.parties) return [];
    return metadata.parties.map(p => (
      <option key={p.partyId} value={p.partyId}>
        {p.name} ({p.partyId})
      </option>
    ));
  }, [metadata]);

  const carrierOptions = useMemo(() => {
    if (!metadata?.carriers) return [];
    return metadata.carriers.map(c => (
      <option key={c.carrierPartyId} value={c.carrierPartyId}>
        {c.carrierName} ({c.carrierPartyId})
      </option>
    ));
  }, [metadata]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems(prev => [...prev, { productId: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', val: string | number) => {
    setItems(prev => {
      const copy = [...prev];
      if (field === 'productId') {
        copy[index].productId = val as string;
      } else {
        copy[index].quantity = Math.max(1, Number(val) || 1);
      }
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(it => it.productId.trim().length > 0 && it.quantity > 0);
    if (validItems.length === 0) {
      setError(sTrans.addItemError || 'En az bir ürün ve miktar eklemelisiniz.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await createShipment({
        shipmentTypeId,
        primaryOrderId: primaryOrderId.trim() || undefined,
        partyIdFrom: partyIdFrom.trim() || undefined,
        partyIdTo: partyIdTo.trim() || undefined,
        originFacilityId: originFacilityId || undefined,
        destinationFacilityId: destinationFacilityId || undefined,
        estimatedShipDate: estimatedShipDate || undefined,
        estimatedArrivalDate: estimatedArrivalDate || undefined,
        handlingInstructions: handlingInstructions.trim() || undefined,
        carrierPartyId: carrierPartyId || undefined,
        trackingIdNumber: trackingIdNumber.trim() || undefined,
        items: validItems,
      });

      onSuccess(res.shipmentId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/80 flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 dark:text-indigo-400">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {sTrans.createShipmentTitle || 'Yeni Sevkiyat & İrsaliye Kaydı'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {sTrans.createShipmentSubtitle || 'Giden veya gelen ürünler için irsaliye kaydı ve kargo bilgisi oluşturun'}
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
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="ds-alert-error flex items-center gap-2.5 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Shipment Type & Order ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {sTrans.shipmentType || 'Sevkiyat Türü'} <span className="text-rose-500">*</span>
              </label>
              <select
                value={shipmentTypeId}
                onChange={e => setShipmentTypeId(e.target.value)}
                className="ds-select"
              >
                <option value="SALES_SHIPMENT">{sTrans.salesShipment || 'Satış Sevkiyatı (Giden İrsaliye)'}</option>
                <option value="PURCHASE_SHIPMENT">{sTrans.purchaseShipment || 'Satın Alma Sevkiyatı (Gelen İrsaliye)'}</option>
                <option value="TRANSFER">{sTrans.transferShipment || 'Depolar Arası Transfer İrsaliyesi'}</option>
              </select>
            </div>

            <div>
              <label className="ds-label">
                {sTrans.linkedOrderId || 'İlişkili Sipariş No'}
              </label>
              <input
                type="text"
                value={primaryOrderId}
                onChange={e => setPrimaryOrderId(e.target.value)}
                placeholder="Örn: 10001"
                className="ds-input font-mono"
              />
            </div>
          </div>

          {/* Row 2: Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {sTrans.partyFrom || 'Gönderen / Çıkış Tarafı'}
              </label>
              <input
                type="text"
                value={partyIdFrom}
                onChange={e => setPartyIdFrom(e.target.value)}
                placeholder="Company, tedarikçi vb."
                list="parties-list"
                className="ds-input"
              />
            </div>

            <div>
              <label className="ds-label">
                {sTrans.partyTo || 'Alıcı / Varış Tarafı'}
              </label>
              <input
                type="text"
                value={partyIdTo}
                onChange={e => setPartyIdTo(e.target.value)}
                placeholder="Müşteri, şube vb."
                list="parties-list"
                className="ds-input"
              />
              <datalist id="parties-list">
                {partyOptions}
              </datalist>
            </div>
          </div>

          {/* Row 3: Facilities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {sTrans.originFacility || 'Çıkış Deposu'}
              </label>
              <select
                value={originFacilityId}
                onChange={e => setOriginFacilityId(e.target.value)}
                className="ds-select"
              >
                <option value="">-- Depo Seçiniz --</option>
                {facilityOptions}
              </select>
            </div>

            <div>
              <label className="ds-label">
                {sTrans.destFacility || 'Varış Deposu (Opsiyonel)'}
              </label>
              <select
                value={destinationFacilityId}
                onChange={e => setDestinationFacilityId(e.target.value)}
                className="ds-select"
              >
                <option value="">-- Seçilmedi --</option>
                {facilityOptions}
              </select>
            </div>
          </div>

          {/* Row 4: Carrier & Tracking */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {sTrans.carrier || 'Kargo / Taşıyıcı'}
              </label>
              <select
                value={carrierPartyId}
                onChange={e => setCarrierPartyId(e.target.value)}
                className="ds-select"
              >
                {carrierOptions}
              </select>
            </div>

            <div>
              <label className="ds-label">
                {sTrans.trackingNumber || 'Takip Numarası'}
              </label>
              <input
                type="text"
                value={trackingIdNumber}
                onChange={e => setTrackingIdNumber(e.target.value)}
                placeholder="Örn: TR12345678"
                className="ds-input font-mono"
              />
            </div>
          </div>

          {/* Row 5: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {sTrans.estimatedShipDate || 'Tahmini Sevk Tarihi'}
              </label>
              <input
                type="date"
                value={estimatedShipDate}
                onChange={e => setEstimatedShipDate(e.target.value)}
                className="ds-input min-w-[140px]"
              />
            </div>

            <div>
              <label className="ds-label">
                {sTrans.estimatedArrivalDate || 'Tahmini Varış Tarihi'}
              </label>
              <input
                type="date"
                value={estimatedArrivalDate}
                onChange={e => setEstimatedArrivalDate(e.target.value)}
                className="ds-input min-w-[140px]"
              />
            </div>
          </div>

          {/* Handling Instructions */}
          <div>
            <label className="ds-label">
              {sTrans.handlingInstructions || 'Özel Taşıma / Sevkiyat Notları'}
            </label>
            <input
              type="text"
              value={handlingInstructions}
              onChange={e => setHandlingInstructions(e.target.value)}
              placeholder="Örn: Kırılabilir ürün, dikkatli taşıyınız..."
              className="ds-input"
            />
          </div>

          {/* Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="ds-label font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {sTrans.shipmentItems || 'Sevkiyat Kalemleri'} <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="ds-btn-ghost text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} />
                <span>{sTrans.addItem || 'Ürün Ekle'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder={sTrans.productIdPlaceholder || 'Ürün Kodu (Örn: 10000)'}
                    value={item.productId}
                    onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                    className="ds-input font-mono flex-1"
                  />
                  <input
                    type="number"
                    min="1"
                    required
                    value={item.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                    className="ds-input w-24 text-center font-bold"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title={common.delete}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
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
              disabled={submitting}
              className="ds-btn-primary text-sm shadow-lg shadow-indigo-600/20"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{sTrans.createShipmentBtn || 'Sevkiyatı Oluştur'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
