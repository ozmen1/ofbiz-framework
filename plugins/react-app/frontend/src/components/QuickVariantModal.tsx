import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, Wand2, Check } from 'lucide-react';
import {
  fetchProductFeatures,
  ProductFeatureItem,
  QuickProductItem,
} from '../services/variantAssocService';

interface QuickVariantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultVirtualProductId?: string;
  virtualProducts: QuickProductItem[];
  onQuickCreate: (payload: {
    virtualProductId: string;
    variantProductId?: string;
    variantProductName: string;
    featureIds?: string;
    price?: number;
    currencyUomId?: string;
    description?: string;
  }) => Promise<void>;
}

export const QuickVariantModal: React.FC<QuickVariantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultVirtualProductId,
  virtualProducts,
  onQuickCreate,
}) => {
  const { translations } = useTranslation();
  const t = translations.productVariantsAssocs;
  const common = translations.common;

  const [selectedVirtualId, setSelectedVirtualId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [price, setPrice] = useState<number | undefined>(undefined);
  const [currencyUomId, setCurrencyUomId] = useState('TRY');
  const [description, setDescription] = useState('');
  const [availableFeatures, setAvailableFeatures] = useState<ProductFeatureItem[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const initialVirtual = defaultVirtualProductId || (virtualProducts?.[0]?.productId || '');
      setSelectedVirtualId(initialVirtual);
      setVariantId('');
      setVariantName('');
      setPrice(undefined);
      setCurrencyUomId('TRY');
      setDescription('');
      setSelectedFeatureIds(new Set());
      setError(null);
      loadFeatures();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultVirtualProductId, virtualProducts]);

  const loadFeatures = async () => {
    try {
      const res = await fetchProductFeatures({ viewSize: 100 });
      setAvailableFeatures(res.features || []);
    } catch {
      // ignore
    }
  };

  const toggleFeature = (fId: string, fDesc: string) => {
    setSelectedFeatureIds((prev) => {
      const next = new Set(prev);
      if (next.has(fId)) {
        next.delete(fId);
      } else {
        next.add(fId);
        // Otomatik isim tamamlama yardımı
        if (!variantName) {
          const parent = virtualProducts.find((p) => p.productId === selectedVirtualId);
          const baseName = parent?.productName || selectedVirtualId;
          setVariantName(`${baseName} - ${fDesc}`);
        } else if (!variantName.includes(fDesc)) {
          setVariantName(`${variantName} / ${fDesc}`);
        }
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVirtualId || !variantName.trim()) {
      setError(t.virtualProduct + ' & ' + t.variantName + ' ' + common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onQuickCreate({
        virtualProductId: selectedVirtualId,
        variantProductId: variantId.trim() || undefined,
        variantProductName: variantName.trim(),
        featureIds: Array.from(selectedFeatureIds).join(','),
        price: price !== undefined && !isNaN(price) ? Number(price) : undefined,
        currencyUomId,
        description: description.trim() || undefined,
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
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 text-indigo-400 border border-indigo-500/30">
              <Wand2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t.quickVariantWizard}
              </h2>
              <p className="text-xs text-slate-400">
                Ana sanal üründen özellik miras alan yeni varyant kartı oluşturun
              </p>
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

          {/* Virtual Product Select */}
          <div>
            <label className="ds-label">
              {t.virtualProduct} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={selectedVirtualId}
              onChange={(e) => setSelectedVirtualId(e.target.value)}
              className="ds-select"
            >
              <option value="">-- Ana Sanal Ürünü Seçin --</option>
              {virtualProducts.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName} ({p.productId}) {p.isVirtual === 'Y' ? '[Virtual]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.variantName} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                placeholder="Örn: Tişört - Kırmızı / XL"
                className="ds-input"
              />
            </div>

            <div>
              <label className="ds-label">
                Varyant Ürün Kodu (Opsiyonel)
              </label>
              <input
                type="text"
                value={variantId}
                onChange={(e) => setVariantId(e.target.value)}
                placeholder="Otomatik üretilsin"
                className="ds-input font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                Varyant Fiyatı (Opsiyonel)
              </label>
              <input
                type="number"
                step="0.01"
                value={price !== undefined ? price : ''}
                onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="0.00"
                className="ds-input font-mono"
              />
            </div>

            <div>
              <label className="ds-label">
                Para Birimi
              </label>
              <select
                value={currencyUomId}
                onChange={(e) => setCurrencyUomId(e.target.value)}
                className="ds-select"
              >
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          {/* Distinguishing Features Pills Selector */}
          <div>
            <label className="ds-label mb-2">
              {t.distinguishingFeatures} (Seçiniz)
            </label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
              {availableFeatures.length === 0 ? (
                <span className="text-xs text-slate-500 italic p-2">Kayıtlı özellik bulunmuyor.</span>
              ) : (
                availableFeatures.map((f) => {
                  const isSelected = selectedFeatureIds.has(f.productFeatureId);
                  return (
                    <button
                      key={f.productFeatureId}
                      type="button"
                      onClick={() => toggleFeature(f.productFeatureId, f.description)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center space-x-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 ring-1 ring-white/20'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{f.description}</span>
                      <span className="text-[10px] opacity-70">({f.productFeatureTypeDesc || f.productFeatureTypeId})</span>
                    </button>
                  );
                })
              )}
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
              disabled={isSubmitting || !selectedVirtualId || !variantName}
              className="ds-btn-primary text-xs"
            >
              {isSubmitting ? common.loading : 'Varyantı Üret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
