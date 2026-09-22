import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, GitFork } from 'lucide-react';
import { VariantAssocMetadata } from '../services/variantAssocService';
import {
  fetchProducts,
  ProductListItem,
} from '../services/productService';

interface CreateProductAssocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultProductId?: string;
  defaultAssocTypeId?: string;
  metadata: VariantAssocMetadata | null;
  onSave: (payload: {
    productId: string;
    productIdTo: string;
    productAssocTypeId?: string;
    sequenceNum?: number;
    reason?: string;
    quantity?: number;
  }) => Promise<void>;
}

export const CreateProductAssocModal: React.FC<CreateProductAssocModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultProductId,
  defaultAssocTypeId,
  metadata,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.productVariantsAssocs;
  const common = translations.common;

  const [productId, setProductId] = useState('');
  const [productIdTo, setProductIdTo] = useState('');
  const [productAssocTypeId, setProductAssocTypeId] = useState('PRODUCT_VARIANT');
  const [sequenceNum, setSequenceNum] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState<number | undefined>(undefined);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setProductId(defaultProductId || '');
      setProductIdTo('');
      setProductAssocTypeId(defaultAssocTypeId || 'PRODUCT_VARIANT');
      setSequenceNum(1);
      setReason('');
      setQuantity(undefined);
      setError(null);
      loadProducts();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultProductId, defaultAssocTypeId]);

  const loadProducts = async () => {
    try {
      const res = await fetchProducts({ viewSize: 100 });
      setProducts(res.result?.productList || []);
    } catch {
      // ignore
    }
  };

  const assocTypeOptions = useMemo(() => metadata?.assocTypes || [], [metadata?.assocTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId.trim() || !productIdTo.trim()) {
      setError(t.sourceProduct + ' & ' + t.targetProduct + ' ' + common.error);
      return;
    }

    if (productId.trim() === productIdTo.trim()) {
      setError('Bir ürünün kendisiyle ilişki kurulamaz.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        productId: productId.trim(),
        productIdTo: productIdTo.trim(),
        productAssocTypeId,
        sequenceNum: Number(sequenceNum) || 1,
        reason: reason.trim() || undefined,
        quantity: quantity !== undefined && !isNaN(quantity) ? Number(quantity) : undefined,
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
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.createAssoc}
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

          <div>
            <label className="ds-label">
              {t.sourceProduct} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="ds-select"
            >
              <option value="">-- Kaynak Ürünü Seçin --</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName || p.internalName || p.productId} ({p.productId}) {p.isVirtual === 'Y' ? '[Virtual]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ds-label">
              {t.assocType} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={productAssocTypeId}
              onChange={(e) => setProductAssocTypeId(e.target.value)}
              className="ds-select"
            >
              {assocTypeOptions.map((type) => (
                <option key={type.productAssocTypeId} value={type.productAssocTypeId}>
                  {type.description || type.productAssocTypeId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ds-label">
              {t.targetProduct} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={productIdTo}
              onChange={(e) => setProductIdTo(e.target.value)}
              className="ds-select"
            >
              <option value="">-- Hedef / Bağlanacak Ürünü Seçin --</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName || p.internalName || p.productId} ({p.productId}) {p.isVariant === 'Y' ? '[Variant]' : ''}
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
                className="ds-input font-mono"
              />
            </div>

            <div>
              <label className="ds-label">
                {t.quantity}
              </label>
              <input
                type="number"
                step="1"
                min={1}
                value={quantity !== undefined ? quantity : ''}
                onChange={(e) => setQuantity(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="1"
                className="ds-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="ds-label">
              {t.reason}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="İlişki gerekçesi veya açıklaması"
              className="ds-input"
            />
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
              disabled={isSubmitting || !productId || !productIdTo}
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
