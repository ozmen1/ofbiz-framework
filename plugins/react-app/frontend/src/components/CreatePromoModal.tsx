import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, Sparkles } from 'lucide-react';
import { ProductPromoItem } from '../services/pricePromoStoreService';

interface CreatePromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  promoToEdit?: ProductPromoItem | null;
  onSave: (payload: {
    productPromoId?: string;
    promoName: string;
    promoText?: string;
    userEntered?: string;
    showToCustomer?: string;
    requireCode?: string;
    useLimitPerOrder?: number;
    useLimitPerCustomer?: number;
    useLimitPerPromotion?: number;
    fromDate?: string;
    thruDate?: string;
  }) => Promise<void>;
}

export const CreatePromoModal: React.FC<CreatePromoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  promoToEdit,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  const [promoId, setPromoId] = useState('');
  const [promoName, setPromoName] = useState('');
  const [promoText, setPromoText] = useState('');
  const [userEntered, setUserEntered] = useState('Y');
  const [showToCustomer, setShowToCustomer] = useState('Y');
  const [requireCode, setRequireCode] = useState('N');
  const [useLimitPerOrder, setUseLimitPerOrder] = useState<number | ''>('');
  const [useLimitPerCustomer, setUseLimitPerCustomer] = useState<number | ''>('');
  const [useLimitPerPromotion, setUseLimitPerPromotion] = useState<number | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (promoToEdit) {
        setPromoId(promoToEdit.productPromoId);
        setPromoName(promoToEdit.promoName || '');
        setPromoText(promoToEdit.promoText || '');
        setUserEntered(promoToEdit.userEntered || 'Y');
        setShowToCustomer(promoToEdit.showToCustomer || 'Y');
        setRequireCode(promoToEdit.requireCode || 'N');
        setUseLimitPerOrder(promoToEdit.useLimitPerOrder ?? '');
        setUseLimitPerCustomer(promoToEdit.useLimitPerCustomer ?? '');
        setUseLimitPerPromotion(promoToEdit.useLimitPerPromotion ?? '');
        setFromDate(promoToEdit.fromDate ? promoToEdit.fromDate.substring(0, 10) : '');
        setThruDate(promoToEdit.thruDate ? promoToEdit.thruDate.substring(0, 10) : '');
      } else {
        setPromoId('');
        setPromoName('');
        setPromoText('');
        setUserEntered('Y');
        setShowToCustomer('Y');
        setRequireCode('N');
        setUseLimitPerOrder('');
        setUseLimitPerCustomer('');
        setUseLimitPerPromotion('');
        setFromDate('');
        setThruDate('');
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, promoToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoName.trim()) {
      setError(common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        productPromoId: promoId.trim() || undefined,
        promoName: promoName.trim(),
        promoText: promoText.trim() || undefined,
        userEntered,
        showToCustomer,
        requireCode,
        useLimitPerOrder: useLimitPerOrder === '' ? undefined : Number(useLimitPerOrder),
        useLimitPerCustomer: useLimitPerCustomer === '' ? undefined : Number(useLimitPerCustomer),
        useLimitPerPromotion: useLimitPerPromotion === '' ? undefined : Number(useLimitPerPromotion),
        fromDate: fromDate || undefined,
        thruDate: thruDate || undefined,
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
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {promoToEdit ? t.editPromo : t.createPromo}
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
              {t.promoId} {promoToEdit && `(${common.selected})`}
            </label>
            <input
              type="text"
              value={promoId}
              onChange={(e) => setPromoId(e.target.value)}
              disabled={!!promoToEdit}
              placeholder="PROMO_AUTO_GEN"
              className="ds-input font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.promoName} *
            </label>
            <input
              type="text"
              required
              value={promoName}
              onChange={(e) => setPromoName(e.target.value)}
              placeholder="Örn: 200 TL Üzeri Ücretsiz Kargo"
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.promoText}
            </label>
            <textarea
              rows={2}
              value={promoText}
              onChange={(e) => setPromoText(e.target.value)}
              placeholder="Kampanya detayları ve müşteri açıklaması..."
              className="ds-input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={requireCode === 'Y'}
                onChange={(e) => setRequireCode(e.target.checked ? 'Y' : 'N')}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/20"
              />
              <span>{t.requireCode}</span>
            </label>
            <label className="flex items-center space-x-2 text-xs font-medium text-slate-300">
              <input
                type="checkbox"
                checked={showToCustomer === 'Y'}
                onChange={(e) => setShowToCustomer(e.target.checked ? 'Y' : 'N')}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/20"
              />
              <span>{t.showToCustomer}</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
            <div>
              <label className="ds-label">
                {t.limitPerOrder}
              </label>
              <input
                type="number"
                min="0"
                value={useLimitPerOrder}
                onChange={(e) => setUseLimitPerOrder(e.target.value === '' ? '' : Number(e.target.value))}
                className="ds-input font-mono"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.limitPerCustomer}
              </label>
              <input
                type="number"
                min="0"
                value={useLimitPerCustomer}
                onChange={(e) => setUseLimitPerCustomer(e.target.value === '' ? '' : Number(e.target.value))}
                className="ds-input font-mono"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.limitPerPromo}
              </label>
              <input
                type="number"
                min="0"
                value={useLimitPerPromotion}
                onChange={(e) => setUseLimitPerPromotion(e.target.value === '' ? '' : Number(e.target.value))}
                className="ds-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="ds-label">
                {common.date} (Başlangıç)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="ds-input"
              />
            </div>
            <div>
              <label className="ds-label">
                {common.dueDate} (Bitiş)
              </label>
              <input
                type="date"
                value={thruDate}
                onChange={(e) => setThruDate(e.target.value)}
                className="ds-input"
              />
            </div>
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
