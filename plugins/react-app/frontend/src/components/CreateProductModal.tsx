import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Loader2, DollarSign, Barcode, Layers } from 'lucide-react';
import { useTranslation } from '../i18n';
import { createProduct, CreateProductPayload, ProductMetadata } from '../services/productService';

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (productId: string) => void;
  metadata: ProductMetadata;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metadata,
}) => {
  const { translations } = useTranslation();
  const t = translations.products;
  const common = translations.common;

  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [internalName, setInternalName] = useState('');
  const [productTypeId, setProductTypeId] = useState('FINISHED_GOOD');
  const [primaryProductCategoryId, setPrimaryProductCategoryId] = useState('');
  const [quantityUomId, setQuantityUomId] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [currencyUomId, setCurrencyUomId] = useState('TRY');
  const [taxInPrice, setTaxInPrice] = useState('N');
  const [primarySku, setPrimarySku] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [isVirtual, setIsVirtual] = useState('N');
  const [isVariant, setIsVariant] = useState('N');
  const [taxable, setTaxable] = useState('Y');
  const [chargeShipping, setChargeShipping] = useState('Y');
  const [returnable, setReturnable] = useState('Y');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setProductId('');
      setProductName('');
      setInternalName('');
      setProductTypeId('FINISHED_GOOD');
      setPrimaryProductCategoryId('');
      setQuantityUomId('');
      setDefaultPrice('');
      setCurrencyUomId('TRY');
      setTaxInPrice('N');
      setPrimarySku('');
      setDescription('');
      setLongDescription('');
      setIsVirtual('N');
      setIsVariant('N');
      setTaxable('Y');
      setChargeShipping('Y');
      setReturnable('Y');
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Memoized large selects for 60 FPS performance
  const memoizedCategories = useMemo(() => metadata.categories, [metadata.categories]);
  const memoizedUoms = useMemo(() => metadata.quantityUoms, [metadata.quantityUoms]);
  const memoizedProductTypes = useMemo(() => metadata.productTypes, [metadata.productTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() && !internalName.trim()) {
      setErrorMessage(common.error + ': ' + t.productName);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateProductPayload = {
        productId: productId.trim() || undefined,
        productTypeId,
        productName: productName.trim(),
        internalName: internalName.trim() || productName.trim(),
        description: description.trim() || undefined,
        longDescription: longDescription.trim() || undefined,
        primaryProductCategoryId: primaryProductCategoryId || undefined,
        quantityUomId: quantityUomId || undefined,
        isVirtual,
        isVariant,
        taxable,
        chargeShipping,
        returnable,
        defaultPrice: defaultPrice ? parseFloat(defaultPrice) : undefined,
        currencyUomId,
        taxInPrice,
        primarySku: primarySku.trim() || undefined,
        goodIdentificationTypeId: 'SKU',
      };

      const res = await createProduct(payload);
      onSuccess(res.productId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {t.createProduct}
              </h2>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
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

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs shrink-0">
            {errorMessage}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Bölüm 1: Temel Tanımlayıcılar */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3 flex items-center gap-2">
              <Package size={14} />
              <span>{t.tabs.general}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.productId} <span className="text-slate-500 font-normal">({common.none})</span>
                </label>
                <input
                  type="text"
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  placeholder="Otomatik (Boş Bırakılabilir)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.productType} *
                </label>
                <select
                  value={productTypeId}
                  onChange={e => setProductTypeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  {memoizedProductTypes.map(pt => (
                    <option key={pt.productTypeId} value={pt.productTypeId}>
                      {pt.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.productName} *
                </label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={e => {
                    setProductName(e.target.value);
                    if (!internalName) setInternalName(e.target.value);
                  }}
                  placeholder="Örn: 15.6 inç Laptop Sırt Çantası"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.internalName}
                </label>
                <input
                  type="text"
                  value={internalName}
                  onChange={e => setInternalName(e.target.value)}
                  placeholder="Dahili SKU / Takip Adı"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.primaryCategory}
                </label>
                <select
                  value={primaryProductCategoryId}
                  onChange={e => setPrimaryProductCategoryId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">{common.select}</option>
                  {memoizedCategories.map(c => (
                    <option key={c.productCategoryId} value={c.productCategoryId}>
                      {c.categoryName} ({c.productCategoryId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.uom}
                </label>
                <select
                  value={quantityUomId}
                  onChange={e => setQuantityUomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="">{common.select}</option>
                  {memoizedUoms.map(u => (
                    <option key={u.uomId} value={u.uomId}>
                      {u.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Barcode size={13} className="text-cyan-400" />
                  <span>{t.identifications} (SKU / Barkod)</span>
                </label>
                <input
                  type="text"
                  value={primarySku}
                  onChange={e => setPrimarySku(e.target.value)}
                  placeholder="EAN-13, Barkod veya SKU"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Bölüm 2: Başlangıç Fiyatlandırması */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
              <DollarSign size={14} />
              <span>{t.pricing}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.price} ({t.tabs.prices})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={defaultPrice}
                    onChange={e => setDefaultPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                  />
                  <DollarSign size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {common.currency}
                </label>
                <select
                  value={currencyUomId}
                  onChange={e => setCurrencyUomId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                >
                  {metadata.currencyUoms.map(cu => (
                    <option key={cu.uomId} value={cu.uomId}>
                      {cu.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createTaxInPrice"
                  checked={taxInPrice === 'Y'}
                  onChange={e => setTaxInPrice(e.target.checked ? 'Y' : 'N')}
                  className="w-4 h-4 rounded-sm border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="createTaxInPrice" className="text-xs text-slate-300 cursor-pointer">
                  {t.taxInPrice}
                </label>
              </div>
            </div>
          </div>

          {/* Bölüm 3: Açıklamalar ve Seçenekler */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-2">
              <Layers size={14} />
              <span>{common.details}</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.description}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Kısa tanıtıcı ürün açıklaması"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.longDescription}
                </label>
                <textarea
                  rows={2}
                  value={longDescription}
                  onChange={e => setLongDescription(e.target.value)}
                  placeholder="Detaylı teknik veya ticari açıklama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxable === 'Y'}
                    onChange={e => setTaxable(e.target.checked ? 'Y' : 'N')}
                    className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-300">{t.taxable}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chargeShipping === 'Y'}
                    onChange={e => setChargeShipping(e.target.checked ? 'Y' : 'N')}
                    className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-300">{t.chargeShipping}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnable === 'Y'}
                    onChange={e => setReturnable(e.target.checked ? 'Y' : 'N')}
                    className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-300">{t.returnable}</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVirtual === 'Y'}
                    onChange={e => {
                      const val = e.target.checked ? 'Y' : 'N';
                      setIsVirtual(val);
                      if (val === 'Y') setIsVariant('N');
                    }}
                    className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                  />
                  <span className="text-[11px] text-slate-300">{t.isVirtual}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
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
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              <span>{common.create}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
