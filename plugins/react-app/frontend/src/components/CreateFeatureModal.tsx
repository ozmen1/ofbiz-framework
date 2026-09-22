import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Sparkles } from 'lucide-react';
import {
  ProductFeatureItem,
  VariantAssocMetadata,
} from '../services/variantAssocService';

interface CreateFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  featureToEdit?: ProductFeatureItem | null;
  metadata: VariantAssocMetadata | null;
  onSave: (payload: {
    productFeatureId?: string;
    productFeatureTypeId: string;
    productFeatureCategoryId?: string;
    description: string;
    idCode?: string;
    defaultAmount?: number;
    defaultSequenceNum?: number;
  }) => Promise<void>;
}

export const CreateFeatureModal: React.FC<CreateFeatureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  featureToEdit,
  metadata,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.productVariantsAssocs;
  const common = translations.common;

  const [featureId, setFeatureId] = useState('');
  const [featureTypeId, setFeatureTypeId] = useState('COLOR');
  const [featureCategoryId, setFeatureCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [idCode, setIdCode] = useState('');
  const [defaultAmount, setDefaultAmount] = useState<number | undefined>(undefined);
  const [defaultSequenceNum, setDefaultSequenceNum] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (featureToEdit) {
        setFeatureId(featureToEdit.productFeatureId);
        setFeatureTypeId(featureToEdit.productFeatureTypeId || 'COLOR');
        setFeatureCategoryId(featureToEdit.productFeatureCategoryId || '');
        setDescription(featureToEdit.description || '');
        setIdCode(featureToEdit.idCode || '');
        setDefaultAmount(featureToEdit.defaultAmount);
        setDefaultSequenceNum(featureToEdit.defaultSequenceNum);
      } else {
        setFeatureId('');
        setFeatureTypeId('COLOR');
        setFeatureCategoryId(metadata?.featureCategories?.[0]?.productFeatureCategoryId || '');
        setDescription('');
        setIdCode('');
        setDefaultAmount(undefined);
        setDefaultSequenceNum(undefined);
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, featureToEdit, metadata]);

  // Memoize feature types & categories
  const featureTypeOptions = useMemo(() => metadata?.featureTypes || [], [metadata?.featureTypes]);
  const featureCategoryOptions = useMemo(() => metadata?.featureCategories || [], [metadata?.featureCategories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(t.featureName + ' ' + common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        productFeatureId: featureId.trim() || undefined,
        productFeatureTypeId: featureTypeId,
        productFeatureCategoryId: featureCategoryId || undefined,
        description: description.trim(),
        idCode: idCode.trim() || undefined,
        defaultAmount: defaultAmount !== undefined && !isNaN(defaultAmount) ? Number(defaultAmount) : undefined,
        defaultSequenceNum: defaultSequenceNum !== undefined && !isNaN(defaultSequenceNum) ? Number(defaultSequenceNum) : undefined,
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
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {featureToEdit ? t.featureUpdatedSuccess : t.createFeature}
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                Özellik Kodu (ID) {featureToEdit && '(Sabit)'}
              </label>
              <input
                type="text"
                value={featureId}
                onChange={(e) => setFeatureId(e.target.value)}
                disabled={!!featureToEdit}
                placeholder="Örn: COLOR_RED"
                className="ds-input font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label className="ds-label">
                {t.featureType} <span className="text-rose-400">*</span>
              </label>
              <select
                value={featureTypeId}
                onChange={(e) => setFeatureTypeId(e.target.value)}
                className="ds-select"
              >
                {featureTypeOptions.map((type) => (
                  <option key={type.productFeatureTypeId} value={type.productFeatureTypeId}>
                    {type.description || type.productFeatureTypeId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="ds-label">
              {t.featureName} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Kırmızı, 42 Numara, Pamuklu vb."
              className="ds-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.featureCategory}
              </label>
              <select
                value={featureCategoryId}
                onChange={(e) => setFeatureCategoryId(e.target.value)}
                className="ds-select"
              >
                <option value="">-- Kategori Yok --</option>
                {featureCategoryOptions.map((cat) => (
                  <option key={cat.productFeatureCategoryId} value={cat.productFeatureCategoryId}>
                    {cat.description || cat.productFeatureCategoryId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ds-label">
                {t.idCode}
              </label>
              <input
                type="text"
                value={idCode}
                onChange={(e) => setIdCode(e.target.value)}
                placeholder="Örn: -RED, -42"
                className="ds-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.defaultAmount}
              </label>
              <input
                type="number"
                step="0.01"
                value={defaultAmount !== undefined ? defaultAmount : ''}
                onChange={(e) => setDefaultAmount(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="ds-input font-mono"
              />
            </div>

            <div>
              <label className="ds-label">
                {t.defaultSequence}
              </label>
              <input
                type="number"
                min={1}
                value={defaultSequenceNum !== undefined ? defaultSequenceNum : ''}
                onChange={(e) => setDefaultSequenceNum(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1"
                className="ds-input font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
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
