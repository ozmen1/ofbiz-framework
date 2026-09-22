import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, FolderPlus } from 'lucide-react';
import { CatalogItem } from '../services/catalogCategoryService';

interface CreateCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  catalogToEdit?: CatalogItem | null;
  onSave: (payload: {
    prodCatalogId?: string;
    catalogName: string;
    useQuickAdd?: string;
    viewAllowPermReqd?: string;
    purchaseAllowPermReqd?: string;
  }) => Promise<void>;
}

export const CreateCatalogModal: React.FC<CreateCatalogModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  catalogToEdit,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.catalogCategories;
  const common = translations.common;

  const [catalogId, setCatalogId] = useState('');
  const [catalogName, setCatalogName] = useState('');
  const [useQuickAdd, setUseQuickAdd] = useState('N');
  const [viewAllowPermReqd, setViewAllowPermReqd] = useState('N');
  const [purchaseAllowPermReqd, setPurchaseAllowPermReqd] = useState('N');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (catalogToEdit) {
        setCatalogId(catalogToEdit.prodCatalogId);
        setCatalogName(catalogToEdit.catalogName || '');
        setUseQuickAdd(catalogToEdit.useQuickAdd || 'N');
        setViewAllowPermReqd(catalogToEdit.viewAllowPermReqd || 'N');
        setPurchaseAllowPermReqd(catalogToEdit.purchaseAllowPermReqd || 'N');
      } else {
        setCatalogId('');
        setCatalogName('');
        setUseQuickAdd('N');
        setViewAllowPermReqd('N');
        setPurchaseAllowPermReqd('N');
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, catalogToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogName.trim()) {
      setError(t.catalogName + ' ' + common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        prodCatalogId: catalogId.trim() || undefined,
        catalogName: catalogName.trim(),
        useQuickAdd,
        viewAllowPermReqd,
        purchaseAllowPermReqd,
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
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {catalogToEdit ? t.editCatalog : t.createCatalog}
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
              {t.catalogId} {catalogToEdit && '(Sabit)'}
            </label>
            <input
              type="text"
              value={catalogId}
              onChange={(e) => setCatalogId(e.target.value)}
              disabled={!!catalogToEdit}
              placeholder="DemoCatalog"
              className="ds-input font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.catalogName} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={catalogName}
              onChange={(e) => setCatalogName(e.target.value)}
              placeholder="Örn: Kurumsal Satış Kataloğu"
              className="ds-input"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <span className="ds-label mb-2">{t.useQuickAdd}</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setUseQuickAdd('Y')}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                    useQuickAdd === 'Y'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {common.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setUseQuickAdd('N')}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                    useQuickAdd === 'N'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {common.no}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <span className="ds-label mb-2">{t.viewAllowPermReqd}</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setViewAllowPermReqd('Y')}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                    viewAllowPermReqd === 'Y'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {common.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setViewAllowPermReqd('N')}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                    viewAllowPermReqd === 'N'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {common.no}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col justify-between">
              <span className="ds-label mb-2">{t.purchaseAllowPermReqd}</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setPurchaseAllowPermReqd('Y')}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                    purchaseAllowPermReqd === 'Y'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {common.yes}
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseAllowPermReqd('N')}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors ${
                    purchaseAllowPermReqd === 'N'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-700/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {common.no}
                </button>
              </div>
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
