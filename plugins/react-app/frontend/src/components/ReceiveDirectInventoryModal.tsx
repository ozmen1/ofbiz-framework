import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  ArrowDownToLine,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import {
  receiveDirectInventory,
} from '../services/facilityInventoryService';

interface ReceiveDirectInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  products?: Array<{ productId: string; productName?: string; internalName?: string }>;
  facilities: Array<{ facilityId: string; facilityName?: string }>;
  locations?: Array<{ facilityId: string; locationSeqId: string }>;
  lots?: Array<{ lotId: string }>;
}

export const ReceiveDirectInventoryModal: React.FC<ReceiveDirectInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  products = [],
  facilities,
  locations = [],
  lots = [],
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [productId, setProductId] = useState<string>('');
  const [facilityId, setFacilityId] = useState<string>('');
  const [locationSeqId, setLocationSeqId] = useState<string>('');
  const [lotId, setLotId] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [unitCost, setUnitCost] = useState<string>('');
  const [comments, setComments] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (products.length > 0 && !productId) {
        setProductId(products[0].productId);
      }
      if (facilities.length > 0 && !facilityId) {
        setFacilityId(facilities[0].facilityId);
      }
    } else {
      document.body.style.overflow = '';
      setError(null);
      setQuantity('');
      setUnitCost('');
      setSerialNumber('');
      setComments('');
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, products, facilities]);

  // Locations filtered by facility
  const filteredLocations = useMemo(() => {
    if (!facilityId) return [];
    return locations.filter((l) => l.facilityId === facilityId);
  }, [facilityId, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !facilityId) {
      setError(t.productAndFacilityRequired || 'Ürün ve Tesis alanları zorunludur.');
      return;
    }

    const qtyNum = parseFloat(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError(t.invalidQuantity || 'Lütfen 0 dan büyük geçerli bir miktar giriniz.');
      return;
    }

    const costNum = unitCost ? parseFloat(unitCost) : undefined;

    try {
      setIsSubmitting(true);
      setError(null);
      await receiveDirectInventory({
        productId,
        facilityId,
        quantityAccepted: qtyNum,
        locationSeqId: locationSeqId || undefined,
        lotId: lotId || undefined,
        serialNumber: serialNumber || undefined,
        unitCost: costNum,
        comments: comments || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Stok kabulü işlenirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-3 sm:p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
              <ArrowDownToLine size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t.directReceiveTitle || 'Doğrudan Depo Stok Kabulü'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.directReceiveDesc || 'Siparişsiz stok girişi, açılış bakiyesi veya devir kabulü yapın'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Product Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.product || 'Ürün'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="ds-select text-xs w-full"
              required
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.internalName || p.productName || p.productId} ({p.productId})
                </option>
              ))}
            </select>
          </div>

          {/* Facility & Location Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.facility || 'Depo / Tesis'} <span className="text-rose-500">*</span>
              </label>
              <select
                value={facilityId}
                onChange={(e) => {
                  setFacilityId(e.target.value);
                  setLocationSeqId('');
                }}
                className="ds-select text-xs w-full"
                required
              >
                {facilities.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.facilityName || f.facilityId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.location || 'Raf / Lokasyon'}
              </label>
              <select
                value={locationSeqId}
                onChange={(e) => setLocationSeqId(e.target.value)}
                className="ds-select text-xs w-full"
              >
                <option value="">{t.noLocation || '-- Lokasyonsuz --'}</option>
                {filteredLocations.map((l) => (
                  <option key={l.locationSeqId} value={l.locationSeqId}>
                    {l.locationSeqId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.quantityAccepted || 'Kabul Edilen Miktar'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="ds-input text-xs font-mono"
                placeholder="Örn: 50"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.unitCost || 'Birim Maliyet (Opsiyonel)'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="ds-input text-xs font-mono"
                placeholder="Örn: 12.50"
              />
            </div>
          </div>

          {/* Lot & Serial Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.lotId || 'Lot / Parti No'}
              </label>
              <input
                type="text"
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                list="lot-suggestions"
                className="ds-input text-xs font-mono"
                placeholder="Örn: LOT-2026-01"
              />
              <datalist id="lot-suggestions">
                {lots.map((l) => (
                  <option key={l.lotId} value={l.lotId} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.serialNumber || 'Seri Numarası'}
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="ds-input text-xs font-mono"
                placeholder="Örn: SN-998822"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.comments || 'Açıklama / Kabul Notu'}
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
              className="ds-input text-xs"
              placeholder={t.directReceiveNotePlaceholder || 'Örn: Açılış devir stoğu veya bedelsiz numune girişi'}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ds-btn-secondary px-4 py-2 text-xs"
            >
              {common?.cancel || 'İptal'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary px-4 py-2 text-xs flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{common?.saving || 'İşleniyor...'}</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{t.receiveInventoryBtn || 'Stok Girişini Onayla'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
