import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, CheckCircle2, AlertCircle, Edit, Tag, Barcode, Calendar, MapPin } from 'lucide-react';
import { updateInventoryItemTracking } from '../services/wmsService';
import { InventoryItemRow } from '../services/inventoryMediaConfigService';

interface EditInventoryTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItemRow | null;
  onUpdated: () => void;
}

export const EditInventoryTrackingModal: React.FC<EditInventoryTrackingModalProps> = ({
  isOpen,
  onClose,
  item,
  onUpdated,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [lotId, setLotId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [locationSeqId, setLocationSeqId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      document.body.style.overflow = 'hidden';
      setLotId(item.lotId || '');
      setSerialNumber(item.serialNumber || '');
      setLocationSeqId(item.locationSeqId || '');
      setExpireDate(item.expireDate ? item.expireDate.split(' ')[0] : '');
      setError(null);
    } else {
      document.body.style.overflow = '';
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setError(null);

    try {
      setIsSubmitting(true);
      await updateInventoryItemTracking({
        inventoryItemId: item.inventoryItemId,
        lotId: lotId.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        expireDate: expireDate || undefined,
        locationSeqId: locationSeqId.trim() || undefined,
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Stok takibi bilgileri güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Edit size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.editTracking || 'Stok Takip Bilgilerini Düzenle'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stok #{item.inventoryItemId} • {item.productName || item.productId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Lot ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag size={13} className="text-indigo-500" />
              <span>{t.lotId || 'Lot / Parti Numarası'}</span>
            </label>
            <input
              type="text"
              value={lotId}
              onChange={e => setLotId(e.target.value)}
              placeholder="Örn: LOT-2026-X1"
              className="ds-input w-full font-mono"
            />
          </div>

          {/* Serial Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Barcode size={13} className="text-purple-500" />
              <span>{t.serialNumber || 'Seri Numarası'}</span>
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="Örn: SN-9001-XYZ"
              className="ds-input w-full font-mono"
            />
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} className="text-amber-500" />
              <span>{t.expirationDate || 'Son Kullanma Tarihi (SKT)'}</span>
            </label>
            <input
              type="date"
              value={expireDate}
              onChange={e => setExpireDate(e.target.value)}
              className="ds-input w-full"
            />
          </div>

          {/* Location Seq ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-cyan-500" />
              <span>{t.locationSeqId || 'Raf / Lokasyon Kodu'}</span>
            </label>
            <input
              type="text"
              value={locationSeqId}
              onChange={e => setLocationSeqId(e.target.value)}
              placeholder="Örn: TLTLTLUL01"
              className="ds-input w-full font-mono"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                <span>{common?.loading || 'Kaydediliyor...'}</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{common?.save || 'Kaydet'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
