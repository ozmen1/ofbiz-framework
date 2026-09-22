import React, { useState, useEffect } from 'react';
import { X, Tag, Loader2, DollarSign } from 'lucide-react';
import { useTranslation } from '../i18n';
import { createProductPrice, updateProductPrice, ProductPriceItem, ProductMetadata } from '../services/productService';

interface ProductPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productId: string;
  priceItem?: ProductPriceItem | null;
  metadata: ProductMetadata;
}

export const ProductPriceModal: React.FC<ProductPriceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productId,
  priceItem,
  metadata,
}) => {
  const { translations } = useTranslation();
  const t = translations.products;
  const common = translations.common;

  const [priceType, setPriceType] = useState('DEFAULT_PRICE');
  const [pricePurpose, setPricePurpose] = useState('PURCHASE');
  const [currencyUom, setCurrencyUom] = useState('TRY');
  const [price, setPrice] = useState<string>('');
  const [taxInPrice, setTaxInPrice] = useState<string>('N');
  const [fromDate, setFromDate] = useState<string>('');
  const [thruDate, setThruDate] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEdit = !!priceItem;

  useEffect(() => {
    if (priceItem) {
      setPriceType(priceItem.productPriceTypeId);
      setPricePurpose(priceItem.productPricePurposeId || 'PURCHASE');
      setCurrencyUom(priceItem.currencyUomId);
      setPrice(String(priceItem.price || ''));
      setTaxInPrice(priceItem.taxInPrice || 'N');
      setFromDate(priceItem.fromDate ? priceItem.fromDate.substring(0, 10) : '');
      setThruDate(priceItem.thruDate ? priceItem.thruDate.substring(0, 10) : '');
    } else {
      setPriceType('DEFAULT_PRICE');
      setPricePurpose('PURCHASE');
      setCurrencyUom('TRY');
      setPrice('');
      setTaxInPrice('N');
      setFromDate('');
      setThruDate('');
    }
  }, [priceItem, isOpen]);

  // Body scroll lock
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
    setErrorMessage(null);

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setErrorMessage(common.error + ': ' + t.price);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updateProductPrice({
          productId,
          productPriceTypeId: priceType,
          productPricePurposeId: pricePurpose,
          currencyUomId: currencyUom,
          fromDate: priceItem!.fromDate,
          price: numPrice,
          taxInPrice,
          thruDate: thruDate ? thruDate + ' 23:59:59.0' : undefined,
        });
      } else {
        await createProductPrice({
          productId,
          productPriceTypeId: priceType,
          productPricePurposeId: pricePurpose,
          currencyUomId: currencyUom,
          price: numPrice,
          taxInPrice,
          fromDate: fromDate ? fromDate + ' 00:00:00.0' : undefined,
          thruDate: thruDate ? thruDate + ' 23:59:59.0' : undefined,
        });
      }
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
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Tag size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {isEdit ? t.editPrice : t.addPrice}
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

        {/* Error Notification */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {errorMessage}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.priceType} *
              </label>
              <select
                disabled={isEdit}
                value={priceType}
                onChange={e => setPriceType(e.target.value)}
                className="ds-select disabled:opacity-60"
              >
                {metadata.priceTypes.map(pt => (
                  <option key={pt.productPriceTypeId} value={pt.productPriceTypeId}>
                    {pt.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="ds-label">
                {common.currency} *
              </label>
              <select
                disabled={isEdit}
                value={currencyUom}
                onChange={e => setCurrencyUom(e.target.value)}
                className="ds-select disabled:opacity-60"
              >
                {metadata.currencyUoms.map(cu => (
                  <option key={cu.uomId} value={cu.uomId}>
                    {cu.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.price} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="ds-input pl-8"
                />
                <DollarSign size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="ds-label">
                {t.pricePurpose}
              </label>
              <select
                disabled={isEdit}
                value={pricePurpose}
                onChange={e => setPricePurpose(e.target.value)}
                className="ds-select disabled:opacity-60"
              >
                {metadata.pricePurposes.map(pp => (
                  <option key={pp.productPricePurposeId} value={pp.productPricePurposeId}>
                    {pp.description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="taxInPrice"
              checked={taxInPrice === 'Y'}
              onChange={e => setTaxInPrice(e.target.checked ? 'Y' : 'N')}
              className="w-4 h-4 rounded-sm border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="taxInPrice" className="text-xs text-slate-300 cursor-pointer">
              {t.taxInPrice}
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.fromDate}
              </label>
              <input
                type="date"
                disabled={isEdit}
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="ds-input disabled:opacity-60"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.thruDate}
              </label>
              <input
                type="date"
                value={thruDate}
                onChange={e => setThruDate(e.target.value)}
                className="ds-input"
              />
            </div>
          </div>

          {/* Footer Actions */}
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
