import React, { useState, useEffect } from 'react';
import { X, Barcode, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { createGoodIdentification, ProductMetadata } from '../services/productService';

interface GoodIdentificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  metadata: ProductMetadata;
}

export const GoodIdentificationModal: React.FC<GoodIdentificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  metadata,
}) => {
  const { translations } = useTranslation();
  const t = translations.products;
  const common = translations.common;

  const [idType, setIdType] = useState('SKU');
  const [idValue, setIdValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setIdType('SKU');
      setIdValue('');
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idValue.trim()) {
      setErrorMessage(common.error + ': ' + t.idValue);
      return;
    }

    setIsSubmitting(true);
    try {
      await createGoodIdentification({
        productId,
        goodIdentificationTypeId: idType,
        idValue: idValue.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Barcode size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">{t.addIdentification}</h2>
              <p className="text-xs text-slate-400 font-mono">{productId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="ds-label">
              {t.idType} *
            </label>
            <select
              value={idType}
              onChange={e => setIdType(e.target.value)}
              className="ds-select"
            >
              {metadata.identificationTypes.map(it => (
                <option key={it.goodIdentificationTypeId} value={it.goodIdentificationTypeId}>
                  {it.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ds-label">
              {t.idValue} *
            </label>
            <input
              type="text"
              required
              value={idValue}
              onChange={e => setIdValue(e.target.value)}
              placeholder="EAN-13, SKU, ISBN..."
              className="ds-input"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary flex items-center gap-2"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>{common.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
