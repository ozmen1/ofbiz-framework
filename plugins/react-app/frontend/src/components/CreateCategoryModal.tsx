import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Layers } from 'lucide-react';
import { CategoryListItem, CatalogCategoryMetadata } from '../services/catalogCategoryService';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoryToEdit?: CategoryListItem | null;
  defaultParentId?: string;
  metadata: CatalogCategoryMetadata | null;
  onSave: (payload: {
    productCategoryId?: string;
    productCategoryTypeId?: string;
    categoryName: string;
    description?: string;
    longDescription?: string;
    parentProductCategoryId?: string;
  }) => Promise<void>;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categoryToEdit,
  defaultParentId,
  metadata,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.catalogCategories;
  const common = translations.common;
  const products = translations.products;

  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categoryTypeId, setCategoryTypeId] = useState('CATALOG_CATEGORY');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (categoryToEdit) {
        setCategoryId(categoryToEdit.productCategoryId);
        setCategoryName(categoryToEdit.categoryName || '');
        setCategoryTypeId(categoryToEdit.productCategoryTypeId || 'CATALOG_CATEGORY');
        setDescription(categoryToEdit.description || '');
        setLongDescription(categoryToEdit.longDescription || '');
        const parent = categoryToEdit.parentCategories?.[0]?.parentProductCategoryId || '';
        setParentCategoryId(parent);
      } else {
        setCategoryId('');
        setCategoryName('');
        setCategoryTypeId('CATALOG_CATEGORY');
        setDescription('');
        setLongDescription('');
        setParentCategoryId(defaultParentId || '');
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, categoryToEdit, defaultParentId]);

  // Memoize parent categories dropdown to avoid re-rendering heavy select
  const parentOptions = useMemo(() => {
    if (!metadata?.allCategories) return [];
    // Filter out current category itself when editing to avoid circular rollup
    return metadata.allCategories.filter(
      (c) => !categoryToEdit || c.productCategoryId !== categoryToEdit.productCategoryId
    );
  }, [metadata?.allCategories, categoryToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError(t.categoryName + ' ' + common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        productCategoryId: categoryId.trim() || undefined,
        productCategoryTypeId: categoryTypeId,
        categoryName: categoryName.trim(),
        description: description.trim() || undefined,
        longDescription: longDescription.trim() || undefined,
        parentProductCategoryId: parentCategoryId || undefined,
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
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {categoryToEdit ? t.editCategory : t.createCategory}
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
                {t.categoryId} {categoryToEdit && '(Sabit)'}
              </label>
              <input
                type="text"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={!!categoryToEdit}
                placeholder="Örn: ELEKTRONIK_01"
                className="ds-input font-mono disabled:opacity-50"
              />
            </div>

            <div>
              <label className="ds-label">
                {t.categoryType}
              </label>
              <select
                value={categoryTypeId}
                onChange={(e) => setCategoryTypeId(e.target.value)}
                className="ds-select"
              >
                {metadata?.categoryTypes.map((type) => (
                  <option key={type.productCategoryTypeId} value={type.productCategoryTypeId}>
                    {type.description || type.productCategoryTypeId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="ds-label">
              {t.categoryName} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="Örn: Bilgisayar & Donanım"
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.parentCategory}
            </label>
            <select
              value={parentCategoryId}
              onChange={(e) => setParentCategoryId(e.target.value)}
              className="ds-select"
            >
              <option value="">{t.noParentCategory}</option>
              {parentOptions.map((cat) => (
                <option key={cat.productCategoryId} value={cat.productCategoryId}>
                  {cat.categoryName ? `${cat.categoryName} (${cat.productCategoryId})` : cat.productCategoryId}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Kök kategori olarak tanımlamak için boş bırakabilirsiniz.
            </p>
          </div>

          <div>
            <label className="ds-label">
              {common.description}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa özet açıklama"
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {products.longDescription}
            </label>
            <textarea
              rows={3}
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              placeholder="Kategori hakkında detaylı açıklama..."
              className="ds-input resize-none"
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
