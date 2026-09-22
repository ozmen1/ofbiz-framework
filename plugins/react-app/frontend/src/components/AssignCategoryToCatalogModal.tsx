import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Link as LinkIcon } from 'lucide-react';
import { CatalogItem, CatalogCategoryMetadata } from '../services/catalogCategoryService';

interface AssignCategoryToCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalog: CatalogItem | null;
  metadata: CatalogCategoryMetadata | null;
  onAssign: (payload: {
    prodCatalogId: string;
    productCategoryId: string;
    prodCatalogCategoryTypeId: string;
    sequenceNum?: number;
  }) => Promise<void>;
}

export const AssignCategoryToCatalogModal: React.FC<AssignCategoryToCatalogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  catalog,
  metadata,
  onAssign,
}) => {
  const { translations } = useTranslation();
  const t = translations.catalogCategories;
  const common = translations.common;

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryTypeId, setCategoryTypeId] = useState('PCCT_BROWSE_ROOT');
  const [sequenceNum, setSequenceNum] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedCategoryId(metadata?.allCategories?.[0]?.productCategoryId || '');
      setCategoryTypeId('PCCT_BROWSE_ROOT');
      setSequenceNum((catalog?.categories?.length || 0) + 1);
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, catalog, metadata]);

  // Memoize categories to select from
  const availableCategories = useMemo(() => {
    if (!metadata?.allCategories) return [];
    return metadata.allCategories;
  }, [metadata?.allCategories]);

  if (!isOpen || !catalog) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) {
      setError(t.categoryId + ' ' + common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAssign({
        prodCatalogId: catalog.prodCatalogId,
        productCategoryId: selectedCategoryId,
        prodCatalogCategoryTypeId: categoryTypeId,
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
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.addCategoryToCatalog}
              </h2>
              <p className="text-xs text-slate-400">{catalog.catalogName} ({catalog.prodCatalogId})</p>
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
              {t.tabCategories} <span className="text-rose-400">*</span>
            </label>
            <select
              required
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="ds-select"
            >
              {availableCategories.map((cat) => (
                <option key={cat.productCategoryId} value={cat.productCategoryId}>
                  {cat.categoryName ? `${cat.categoryName} (${cat.productCategoryId})` : cat.productCategoryId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ds-label">
              {t.catalogCategoryType}
            </label>
            <select
              value={categoryTypeId}
              onChange={(e) => setCategoryTypeId(e.target.value)}
              className="ds-select"
            >
              {metadata?.catalogCategoryTypes.map((type) => (
                <option key={type.prodCatalogCategoryTypeId} value={type.prodCatalogCategoryTypeId}>
                  {type.description || type.prodCatalogCategoryTypeId}
                </option>
              ))}
            </select>
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
              disabled={isSubmitting}
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
