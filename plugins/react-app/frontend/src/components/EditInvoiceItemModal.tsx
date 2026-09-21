import React, { useState, useEffect } from 'react';
import { X, Save, Edit3, Loader2 } from 'lucide-react';
import { api, InvoiceItem } from '../services/api';
import { useTranslation } from '../i18n';

interface EditInvoiceItemModalProps {
  isOpen: boolean;
  invoiceId: string;
  currencyUomId: string;
  item: InvoiceItem | null;
  itemTypes: { invoiceItemTypeId: string; description: string }[];
  onClose: () => void;
  onSaved: () => void;
}

export const EditInvoiceItemModal: React.FC<EditInvoiceItemModalProps> = ({
  isOpen,
  invoiceId,
  currencyUomId,
  item,
  itemTypes,
  onClose,
  onSaved
}) => {
  const { translations, locale } = useTranslation();
  const inv = translations.invoices;
  const common = translations.common;

  const [itemType, setItemType] = useState<string>('INV_PROD_ITEM');
  const [description, setDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [amount, setAmount] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Body Scroll Lock (Golden Invariant 2)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setItemType(item.invoiceItemTypeId || 'INV_PROD_ITEM');
      setDescription(item.description || '');
      setQuantity(item.quantity ?? 1);
      setAmount(item.amount ?? 0);
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const calculatedTotal = (quantity || 0) * (amount || 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currencyUomId || 'USD'
    }).format(val || 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError(locale === 'tr' ? 'Kalem açıklaması zorunludur.' : 'Item description is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await api.updateInvoiceItem({
        invoiceId,
        invoiceItemSeqId: item.invoiceItemSeqId,
        invoiceItemTypeId: itemType,
        description: description.trim(),
        quantity,
        amount
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : (locale === 'tr' ? 'Kalem güncellenemedi.' : 'Failed to update item.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Background Overlay without backdrop-blur (Golden Invariant 2) */}
      <div 
        className="fixed inset-0 bg-black/80 transition-opacity" 
        onClick={onClose} 
      />

      {/* 100% Opaque Modal Container */}
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Edit3 size={18} />
            </div>
            <div>
              <h3 className="text-white font-semibold text-base">
                {inv.editItem}
              </h3>
              <p className="text-xs text-slate-400">
                {locale === 'tr' ? 'Kalem Sırası' : 'Item Seq'}: #{item.invoiceItemSeqId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="ds-label">{inv.itemType}</label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              className="ds-select w-full"
            >
              {itemTypes.length > 0 ? (
                itemTypes.map((t) => (
                  <option key={t.invoiceItemTypeId} value={t.invoiceItemTypeId}>
                    {t.description}
                  </option>
                ))
              ) : (
                <>
                  <option value="INV_PROD_ITEM">Product Item</option>
                  <option value="INV_FEE_ITEM">Fee / Service Item</option>
                  <option value="ITM_SALES_TAX">Sales Tax</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="ds-label">{inv.itemDescOrName}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={locale === 'tr' ? 'Kalem açıklaması...' : 'Item description...'}
              className="ds-input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ds-label">{inv.quantity}</label>
              <input
                type="number"
                step="any"
                min="0.001"
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                className="ds-input w-full"
                required
              />
            </div>

            <div>
              <label className="ds-label">{inv.unitPrice} ({currencyUomId})</label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="ds-input w-full"
                required
              />
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400 font-medium">{inv.lineTotal}:</span>
            <span className="text-sm font-semibold text-indigo-400 font-mono">
              {formatCurrency(calculatedTotal)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="ds-btn-primary flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoiceItemModal;
