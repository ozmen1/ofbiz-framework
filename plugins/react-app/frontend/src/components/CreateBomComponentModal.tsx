import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Boxes, Loader2, AlertCircle } from 'lucide-react';
import {
  ManufacturingMetadata,
  createBomComponent
} from '../services/manufacturingService';

interface CreateBomComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetProductId?: string;
  metadata: ManufacturingMetadata | null;
}

export const CreateBomComponentModal: React.FC<CreateBomComponentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetProductId,
  metadata
}) => {
  const { translations } = useTranslation();
  const mTrans = translations.manufacturing;
  const common = translations.common;

  const [productId, setProductId] = useState(targetProductId || '');
  const [componentId, setComponentId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [scrapFactor, setScrapFactor] = useState<number>(0);
  const [sequenceNum, setSequenceNum] = useState<number>(10);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      if (targetProductId) {
        setProductId(targetProductId);
      } else if (metadata?.products && metadata.products.length > 0 && !productId) {
        setProductId(metadata.products[0].productId);
      }
      if (metadata?.products && metadata.products.length > 0 && !componentId) {
        setComponentId(metadata.products[0].productId);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, targetProductId, metadata]);

  const productOptions = useMemo(() => {
    if (!metadata?.products) return null;
    return metadata.products.map(p => (
      <option key={p.productId} value={p.productId}>
        {p.productName} ({p.productId})
      </option>
    ));
  }, [metadata?.products]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !componentId) {
      setError(mTrans.selectProduct);
      return;
    }
    if (productId === componentId) {
      setError('Bir mamul kendi kendisinin alt bileşeni olamaz.');
      return;
    }
    if (quantity <= 0) {
      setError(mTrans.requiredQty);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createBomComponent({
        productId,
        componentId,
        quantity,
        scrapFactor,
        sequenceNum
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : common.error;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 ds-overlay z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mTrans.addBomModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mTrans.addBomModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="ds-alert-error flex items-center gap-2 p-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Finished Product */}
          <div>
            <label className="ds-label">{mTrans.product} *</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="ds-select"
              disabled={Boolean(targetProductId)}
              required
            >
              {productOptions}
            </select>
          </div>

          {/* Component / Raw Material */}
          <div>
            <label className="ds-label">{mTrans.componentName} / Hammadde *</label>
            <select
              value={componentId}
              onChange={e => setComponentId(e.target.value)}
              className="ds-select"
              required
            >
              {productOptions}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Quantity */}
            <div>
              <label className="ds-label">{mTrans.requiredQty} *</label>
              <input
                type="number"
                min="0.0001"
                step="any"
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="ds-input font-mono font-bold"
                required
              />
            </div>

            {/* Scrap Factor */}
            <div>
              <label className="ds-label">{mTrans.scrapFactor}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={scrapFactor}
                onChange={e => setScrapFactor(parseFloat(e.target.value) || 0)}
                className="ds-input font-mono"
              />
            </div>

            {/* Sequence */}
            <div>
              <label className="ds-label">{mTrans.sequence}</label>
              <input
                type="number"
                min="1"
                value={sequenceNum}
                onChange={e => setSequenceNum(parseInt(e.target.value) || 10)}
                className="ds-input font-mono"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
