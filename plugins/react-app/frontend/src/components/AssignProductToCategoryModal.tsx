import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, PackagePlus, Search } from 'lucide-react';
import { fetchProducts, ProductListItem } from '../services/productService';

interface AssignProductToCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryId: string;
  categoryName: string;
  onAssign: (payload: {
    productCategoryId: string;
    productId: string;
    sequenceNum?: number;
    quantity?: number;
  }) => Promise<void>;
}

export const AssignProductToCategoryModal: React.FC<AssignProductToCategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categoryId,
  categoryName,
  onAssign,
}) => {
  const { translations } = useTranslation();
  const t = translations.catalogCategories;
  const common = translations.common;

  const [selectedProductId, setSelectedProductId] = useState('');
  const [sequenceNum, setSequenceNum] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedProductId('');
      setSequenceNum(1);
      setSearchQuery('');
      setError(null);
      loadInitialProducts();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const loadInitialProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetchProducts({ viewSize: 50 });
      setProducts(res.result?.productList || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleSearchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetchProducts({
        searchKeyword: searchQuery.trim() || undefined,
        viewSize: 50,
      });
      setProducts(res.result?.productList || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingProducts(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId.trim()) {
      setError(t.selectProduct);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAssign({
        productCategoryId: categoryId,
        productId: selectedProductId.trim(),
        sequenceNum: Number(sequenceNum) || 1,
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
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.addMemberProduct}
              </h2>
              <p className="text-xs text-slate-400">{categoryName} ({categoryId})</p>
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

          {/* Search bar */}
          <div>
            <label className="ds-label">
              {t.searchProductsPlaceholder}
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchProducts())}
                  placeholder="Ürün adı veya kodu yazıp arayın..."
                  className="ds-input pl-9"
                />
              </div>
              <button
                type="button"
                onClick={handleSearchProducts}
                className="ds-btn-secondary text-xs"
              >
                {common.search}
              </button>
            </div>
          </div>

          {/* Product Select */}
          <div>
            <label className="ds-label">
              {t.selectProduct} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isLoadingProducts}
              className="ds-select disabled:opacity-50"
            >
              <option value="">-- {t.selectProduct} --</option>
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productName || p.internalName || p.productId} ({p.productId}) - {p.productTypeDesc || p.productTypeId}
                </option>
              ))}
            </select>
            {isLoadingProducts && (
              <p className="text-xs text-slate-500 mt-1">{common.loading}</p>
            )}
          </div>

          <div>
            <label className="ds-label">
              {t.sequenceNum}
            </label>
            <input
              type="number"
              min={1}
              value={sequenceNum}
              onChange={(e) => setSequenceNum(parseInt(e.target.value) || 1)}
              className="ds-input"
            />
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
              disabled={isSubmitting || !selectedProductId}
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
