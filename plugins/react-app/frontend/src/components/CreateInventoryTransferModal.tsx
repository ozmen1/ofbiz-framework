import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, ArrowRightLeft } from 'lucide-react';
import {
  FacilityQuickItem,
  InventoryItemRow,
  FacilityLocationItem,
  createInventoryTransfer,
} from '../services/inventoryMediaConfigService';

interface CreateInventoryTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItem?: InventoryItemRow | null;
  items: InventoryItemRow[];
  facilities: FacilityQuickItem[];
  locations: FacilityLocationItem[];
}

export const CreateInventoryTransferModal: React.FC<CreateInventoryTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedItem,
  items,
  facilities,
  locations,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [inventoryItemId, setInventoryItemId] = useState('');
  const [facilityIdTo, setFacilityIdTo] = useState('');
  const [locationSeqIdTo, setLocationSeqIdTo] = useState('');
  const [xferQty, setXferQty] = useState<number | ''>('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facilityOptions = useMemo(() => facilities || [], [facilities]);
  const itemOptions = useMemo(() => items || [], [items]);

  // Derived current item
  const currentItem = useMemo(() => {
    return itemOptions.find((i) => i.inventoryItemId === inventoryItemId) || selectedItem || null;
  }, [inventoryItemId, itemOptions, selectedItem]);

  // Filter locations for destination facility
  const destLocations = useMemo(() => {
    return locations.filter((loc) => loc.facilityId === facilityIdTo);
  }, [locations, facilityIdTo]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const initialItemId = selectedItem ? selectedItem.inventoryItemId : (itemOptions[0]?.inventoryItemId || '');
      setInventoryItemId(initialItemId);

      // Default destination facility (choose a different one if available)
      const srcFac = selectedItem?.facilityId || itemOptions[0]?.facilityId;
      const otherFac = facilityOptions.find((f) => f.facilityId !== srcFac);
      setFacilityIdTo(otherFac?.facilityId || facilityOptions[0]?.facilityId || '');
      setLocationSeqIdTo('');
      setXferQty('');
      setComments('');
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, selectedItem, itemOptions, facilityOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryItemId || !facilityIdTo || xferQty === '' || Number(xferQty) <= 0) {
      setError('Lütfen geçerli bir envanter kalemi, hedef depo ve transfer miktarı giriniz.');
      return;
    }

    if (currentItem && Number(xferQty) > currentItem.availableToPromiseTotal) {
      setError(`Transfer miktarı kullanılabilir miktarı (${currentItem.availableToPromiseTotal}) aşamaz.`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createInventoryTransfer({
        inventoryItemId,
        facilityId: currentItem?.facilityId,
        facilityIdTo,
        locationSeqId: currentItem?.locationSeqId,
        locationSeqIdTo: locationSeqIdTo || undefined,
        xferQty: Number(xferQty),
        comments: comments.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 60fps rule: solid overlay */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.createTransfer}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="ds-label">
              {t.inventoryItemId} *
            </label>
            <select
              value={inventoryItemId}
              onChange={(e) => setInventoryItemId(e.target.value)}
              disabled={!!selectedItem}
              className="ds-select disabled:opacity-60"
            >
              {itemOptions.map((i) => (
                <option key={i.inventoryItemId} value={i.inventoryItemId}>
                  #{i.inventoryItemId} - {i.productName || i.productId} ({i.facilityName || i.facilityId}, ATP: {i.availableToPromiseTotal})
                </option>
              ))}
            </select>
          </div>

          {currentItem && (
            <div className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Kaynak Depo:</span>{' '}
                <span className="font-semibold text-white">{currentItem.facilityName || currentItem.facilityId}</span>
              </div>
              <div>
                <span className="text-slate-400">Kullanılabilir:</span>{' '}
                <span className="font-bold text-emerald-400">{currentItem.availableToPromiseTotal}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                {t.toFacility} *
              </label>
              <select
                value={facilityIdTo}
                onChange={(e) => setFacilityIdTo(e.target.value)}
                className="ds-select"
              >
                {facilityOptions.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.facilityName || f.facilityId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ds-label">
                Hedef Lokasyon (Opsiyonel)
              </label>
              <select
                value={locationSeqIdTo}
                onChange={(e) => setLocationSeqIdTo(e.target.value)}
                className="ds-select"
              >
                <option value="">(Belirtilmedi)</option>
                {destLocations.map((loc) => (
                  <option key={loc.locationSeqId} value={loc.locationSeqId}>
                    {loc.locationSeqId} {loc.aisleId ? `(Koridor: ${loc.aisleId})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="ds-label">
              {t.transferQty} *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Örn: 10"
              value={xferQty}
              onChange={(e) => setXferQty(e.target.value === '' ? '' : Number(e.target.value))}
              className="ds-input font-mono"
            />
          </div>

          <div>
            <label className="ds-label">
              {common.description} / Not
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Transfer nedeni, sevk irsaliyesi no..."
              className="ds-input resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary text-xs"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary text-xs"
            >
              {isSubmitting ? common.loading : common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
