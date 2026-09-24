import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, CheckCircle2, AlertCircle, Tag } from 'lucide-react';
import { createLot } from '../services/wmsService';

interface CreateLotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (lotId: string) => void;
}

export const CreateLotModal: React.FC<CreateLotModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [lotId, setLotId] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Suggest a default lot ID
      const autoId = `LOT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setLotId(autoId);
      // Default expiration date (1 year later)
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setExpirationDate(nextYear.toISOString().split('T')[0]);
      setQuantity('');
      setError(null);
    } else {
      document.body.style.overflow = '';
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setIsSubmitting(true);
      const res = await createLot({
        lotId: lotId.trim() || undefined,
        expirationDate: expirationDate || undefined,
        quantity: quantity ? parseFloat(quantity) : undefined,
      });
      onCreated(res.lotId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Lot kaydı oluşturulurken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-md flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t.createLot || 'Yeni Lot / Parti Tanımla'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.createLotDesc || 'Ürün takibi için yeni bir parti/lot numarası ve SKT belirleyin'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.lotId || 'Lot / Parti Numarası'} *
            </label>
            <input
              type="text"
              value={lotId}
              onChange={e => setLotId(e.target.value)}
              required
              placeholder="Örn: LOT-2026-001"
              className="ds-input w-full font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.expirationDate || 'Son Kullanma Tarihi (SKT)'}
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={e => setExpirationDate(e.target.value)}
              className="ds-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.initialQuantity || 'Planlanan Miktar / Parti Boyutu'}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="0.00"
              className="ds-input w-full"
            />
          </div>

          {/* Footer */}
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
                  <span>{t.saveLot || 'Lotu Kaydet'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
