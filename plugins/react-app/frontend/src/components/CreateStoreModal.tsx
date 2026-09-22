import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Store } from 'lucide-react';
import {
  ProductStoreItem,
  PricePromoStoreMetadata,
} from '../services/pricePromoStoreService';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  metadata: PricePromoStoreMetadata;
  storeToEdit?: ProductStoreItem | null;
  onSave: (payload: {
    productStoreId?: string;
    storeName: string;
    companyName?: string;
    title?: string;
    subtitle?: string;
    inventoryFacilityId?: string;
    defaultCurrencyUomId?: string;
    defaultLocaleString?: string;
  }) => Promise<void>;
}

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metadata,
  storeToEdit,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [inventoryFacilityId, setInventoryFacilityId] = useState('');
  const [defaultCurrencyUomId, setDefaultCurrencyUomId] = useState('USD');
  const [defaultLocaleString, setDefaultLocaleString] = useState('en_US');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized options
  const facilities = useMemo(() => metadata.facilities || [], [metadata.facilities]);
  const currencies = useMemo(() => metadata.currencies || [], [metadata.currencies]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (storeToEdit) {
        setStoreId(storeToEdit.productStoreId);
        setStoreName(storeToEdit.storeName || '');
        setCompanyName(storeToEdit.companyName || '');
        setTitle(storeToEdit.title || '');
        setSubtitle(storeToEdit.subtitle || '');
        setInventoryFacilityId(storeToEdit.inventoryFacilityId || '');
        setDefaultCurrencyUomId(storeToEdit.defaultCurrencyUomId || 'USD');
        setDefaultLocaleString(storeToEdit.defaultLocaleString || 'en_US');
      } else {
        setStoreId('');
        setStoreName('');
        setCompanyName('');
        setTitle('');
        setSubtitle('');
        setInventoryFacilityId(facilities[0]?.facilityId || '');
        setDefaultCurrencyUomId('USD');
        setDefaultLocaleString('en_US');
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, storeToEdit, facilities]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError(common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        productStoreId: storeId.trim() || undefined,
        storeName: storeName.trim(),
        companyName: companyName.trim() || undefined,
        title: title.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        inventoryFacilityId: inventoryFacilityId || undefined,
        defaultCurrencyUomId: defaultCurrencyUomId || undefined,
        defaultLocaleString: defaultLocaleString || undefined,
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
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {storeToEdit ? t.editStore : t.createStore}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="ds-label">
              {t.storeId} {storeToEdit && `(${common.selected})`}
            </label>
            <input
              type="text"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={!!storeToEdit}
              placeholder="STORE_AUTO_GEN"
              className="ds-input font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.storeName} *
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Örn: E-Ticaret Ana Mağaza"
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.companyName}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Örn: Open For Business Corp."
              className="ds-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                Başlık (Title)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: OFBiz Online Store"
                className="ds-input"
              />
            </div>
            <div>
              <label className="ds-label">
                Alt Başlık
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="Örn: The Enterprise Solution"
                className="ds-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                {t.warehouse}
              </label>
              <select
                value={inventoryFacilityId}
                onChange={(e) => setInventoryFacilityId(e.target.value)}
                className="ds-select"
              >
                <option value="">{common.select}</option>
                {facilities.map((fac) => (
                  <option key={fac.facilityId} value={fac.facilityId}>
                    {fac.facilityName || fac.facilityId}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="ds-label">
                {t.defaultCurrency}
              </label>
              <select
                value={defaultCurrencyUomId}
                onChange={(e) => setDefaultCurrencyUomId(e.target.value)}
                className="ds-select"
              >
                {currencies.map((c) => (
                  <option key={c.uomId} value={c.uomId}>
                    {c.uomId}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
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
