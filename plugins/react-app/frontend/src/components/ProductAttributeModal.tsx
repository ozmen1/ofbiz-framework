import React, { useState, useEffect } from 'react';
import { X, Sliders, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { saveProductAttribute, ProductAttributeItem } from '../services/productService';

interface ProductAttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  attributeItem?: ProductAttributeItem | null;
}

export const ProductAttributeModal: React.FC<ProductAttributeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  attributeItem,
}) => {
  const { translations } = useTranslation();
  const t = translations.products;
  const common = translations.common;

  const [attrName, setAttrName] = useState('');
  const [attrValue, setAttrValue] = useState('');
  const [attrDescription, setAttrDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEdit = !!attributeItem;

  useEffect(() => {
    if (attributeItem) {
      setAttrName(attributeItem.attrName);
      setAttrValue(attributeItem.attrValue || '');
      setAttrDescription(attributeItem.attrDescription || '');
    } else {
      setAttrName('');
      setAttrValue('');
      setAttrDescription('');
    }
    setErrorMessage(null);
  }, [attributeItem, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attrName.trim()) {
      setErrorMessage(common.error + ': ' + t.attrName);
      return;
    }

    setIsSubmitting(true);
    try {
      await saveProductAttribute({
        productId,
        attrName: attrName.trim(),
        attrValue: attrValue.trim(),
        attrDescription: attrDescription.trim(),
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
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isEdit ? t.editAttribute : t.addAttribute}
              </h2>
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
              {t.attrName} *
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={attrName}
              onChange={e => setAttrName(e.target.value)}
              placeholder="e.g. COLOR, BRAND, WARRANTY..."
              className="ds-input disabled:opacity-60"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.attrValue}
            </label>
            <input
              type="text"
              value={attrValue}
              onChange={e => setAttrValue(e.target.value)}
              placeholder="e.g. Red, Samsung, 2 Years..."
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.attrDescription}
            </label>
            <input
              type="text"
              value={attrDescription}
              onChange={e => setAttrDescription(e.target.value)}
              placeholder="Description or notes"
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
