import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Sparkles } from 'lucide-react';
import {
  VariantAssocMetadata,
  ProductFeatureItem,
  fetchProductFeatures,
} from '../services/variantAssocService';

interface ApplyFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  productName: string;
  metadata: VariantAssocMetadata | null;
  onApply: (payload: {
    productId: string;
    productFeatureId: string;
    productFeatureApplTypeId?: string;
    sequenceNum?: number;
    amount?: number;
  }) => Promise<void>;
}

export const ApplyFeatureModal: React.FC<ApplyFeatureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  productName,
  metadata,
  onApply,
}) => {
  const { translations } = useTranslation();
  const t = translations.productVariantsAssocs;
  const common = translations.common;

  const [features, setFeatures] = useState<ProductFeatureItem[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState('');
  const [applTypeId, setApplTypeId] = useState('STANDARD_FEATURE');
  const [sequenceNum, setSequenceNum] = useState<number>(1);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedFeatureId('');
      setApplTypeId('STANDARD_FEATURE');
      setSequenceNum(1);
      setAmount(undefined);
      setError(null);
      loadFeatures();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const loadFeatures = async () => {
    try {
      const res = await fetchProductFeatures({ viewSize: 100 });
      setFeatures(res.features || []);
      if (res.features?.length) {
        setSelectedFeatureId(res.features[0].productFeatureId);
      }
    } catch {
      // ignore
    }
  };

  const applTypeOptions = useMemo(() => metadata?.featureApplTypes || [], [metadata?.featureApplTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeatureId) {
      setError(t.featureName + ' ' + common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onApply({
        productId,
        productFeatureId: selectedFeatureId,
        productFeatureApplTypeId: applTypeId,
        sequenceNum: Number(sequenceNum) || 1,
        amount: amount !== undefined && !isNaN(amount) ? Number(amount) : undefined,
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
      {/* 60fps rule: solid overlay without backdrop-blur */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog container */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.applyFeature}
              </h2>
              <p className="text-xs text-slate-400">{productName} ({productId})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="ds-label">
              {t.tabFeatures} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={selectedFeatureId}
              onChange={(e) => setSelectedFeatureId(e.target.value)}
              className="ds-select"
            >
              {features.map((f) => (
                <option key={f.productFeatureId} value={f.productFeatureId}>
                  {f.description} ({f.productFeatureTypeDesc || f.productFeatureTypeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ds-label">
              {t.applType}
            </label>
            <select
              value={applTypeId}
              onChange={(e) => setApplTypeId(e.target.value)}
              className="ds-select"
            >
              {applTypeOptions.map((type) => (
                <option key={type.productFeatureApplTypeId} value={type.productFeatureApplTypeId}>
                  {type.description || type.productFeatureApplTypeId}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                {t.defaultSequence}
              </label>
              <input
                type="number"
                min={1}
                value={sequenceNum}
                onChange={(e) => setSequenceNum(parseInt(e.target.value) || 1)}
                className="ds-input"
              />
            </div>

            <div>
              <label className="ds-label">
                Ek Fiyat / Tutar
              </label>
              <input
                type="number"
                step="0.01"
                value={amount !== undefined ? amount : ''}
                onChange={(e) => setAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="ds-input"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFeatureId}
              className="ds-btn-primary"
            >
              {isSubmitting ? common.loading : common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
