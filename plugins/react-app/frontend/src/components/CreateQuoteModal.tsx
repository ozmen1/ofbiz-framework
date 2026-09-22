import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  QuoteMetadata,
  createQuote,
  CreateQuoteItemInput,
} from '../services/orderService';
import {
  X,
  Plus,
  Trash2,
  FileCheck,
  AlertCircle,
  Save,
  Calculator,
  Calendar,
  Building2,
  DollarSign,
} from 'lucide-react';

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (quoteId: string) => void;
  metadata: QuoteMetadata | null;
}

interface LocalQuoteItem {
  id: string;
  productId: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
}

export const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metadata,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  const [quoteName, setQuoteName] = useState('');
  const [quoteTypeId, setQuoteTypeId] = useState('PRODUCT_QUOTE');
  const [partyId, setPartyId] = useState('');
  const [currencyUomId, setCurrencyUomId] = useState('USD');
  const [productStoreId, setProductStoreId] = useState('');
  const [description, setDescription] = useState('');
  const [validThruDate, setValidThruDate] = useState('');
  const [statusId, setStatusId] = useState('QUO_CREATED');
  const [items, setItems] = useState<LocalQuoteItem[]>([
    { id: '1', productId: '', itemDescription: '', quantity: 1, unitPrice: 0 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default product store from metadata if available
  useEffect(() => {
    if (metadata?.productStores && metadata.productStores.length > 0 && !productStoreId) {
      setProductStoreId(metadata.productStores[0].productStoreId);
    }
  }, [metadata, productStoreId]);

  // Golden Invariant 2: Body Scroll Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Memoized parties
  const partyOptions = useMemo(() => {
    return (metadata?.parties || []).map((p) => (
      <option key={p.partyId} value={p.partyId}>
        {p.name} ({p.partyId})
      </option>
    ));
  }, [metadata?.parties]);

  // Memoized products
  const productOptions = useMemo(() => {
    return (metadata?.products || []).map((prod) => (
      <option key={prod.productId} value={prod.productId}>
        {prod.productName} ({prod.productId})
      </option>
    ));
  }, [metadata?.products]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        productId: '',
        itemDescription: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LocalQuoteItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'productId') {
          const found = metadata?.products?.find((p) => p.productId === val);
          if (found) {
            updated.itemDescription = found.productName;
            if (found.defaultPrice) {
              updated.unitPrice = found.defaultPrice;
            }
          }
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!partyId) {
      setError(t.partyRequired);
      return;
    }

    const validItems: CreateQuoteItemInput[] = items
      .filter((it) => it.productId.trim() !== '')
      .map((it) => ({
        productId: it.productId.trim(),
        itemDescription: it.itemDescription.trim() || undefined,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
      }));

    if (validItems.length === 0) {
      setError(t.atLeastOneItem);
      return;
    }

    setLoading(true);
    try {
      const resp = await createQuote({
        quoteName: quoteName.trim() || undefined,
        quoteTypeId,
        partyId,
        currencyUomId,
        productStoreId: productStoreId || undefined,
        description: description.trim() || undefined,
        validThruDate: validThruDate || undefined,
        statusId,
        items: validItems,
      });

      onSuccess(resp.quoteId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Teklif oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currencyUomId || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileCheck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{t.createNewQuote}</h2>
              <p className="text-xs text-slate-400">{t.quotesTab}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Quote Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.quoteType}
              </label>
              <select
                value={quoteTypeId}
                onChange={(e) => setQuoteTypeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {(metadata?.quoteTypes || [
                  { quoteTypeId: 'PRODUCT_QUOTE', description: 'Product' },
                  { quoteTypeId: 'PROPOSAL', description: 'Proposal' },
                ]).map((qt) => (
                  <option key={qt.quoteTypeId} value={qt.quoteTypeId}>
                    {qt.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 size={13} className="text-indigo-400" />
                {t.customerOrVendor} *
              </label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              >
                <option value="">-- {t.selectParty} --</option>
                {partyOptions}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                {t.validThru}
              </label>
              <input
                type="date"
                value={validThruDate}
                onChange={(e) => setValidThruDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.quoteName}
              </label>
              <input
                type="text"
                value={quoteName}
                onChange={(e) => setQuoteName(e.target.value)}
                placeholder="Örn: 2026/Q4 Kurumsal Donanım Teklifi"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign size={13} className="text-indigo-400" />
                {t.currency}
              </label>
              <select
                value={currencyUomId}
                onChange={(e) => setCurrencyUomId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {(metadata?.currencyUoms || [{ uomId: 'USD', description: 'USD' }]).map((c) => (
                  <option key={c.uomId} value={c.uomId}>
                    {c.description || c.uomId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.initialStatus}
              </label>
              <select
                value={statusId}
                onChange={(e) => setStatusId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="QUO_CREATED">{t.kpiPending} (Created)</option>
                <option value="QUO_APPROVED">{t.kpiApproved} (Approved)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.reason}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Teklif genel notları veya özel ticari koşullar..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Section 2: Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} className="text-indigo-400" />
                {t.items} ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition"
              >
                <Plus size={14} />
                {t.addItem}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase font-semibold text-slate-400 bg-slate-900">
                    <th className="py-2.5 px-3">{t.product} *</th>
                    <th className="py-2.5 px-3 w-40">{t.quantity}</th>
                    <th className="py-2.5 px-3 w-44">{t.unitPrice} ({currencyUomId})</th>
                    <th className="py-2.5 px-3 w-40 text-right">{t.lineTotal}</th>
                    <th className="py-2.5 px-2 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {items.map((item) => {
                    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition">
                        <td className="p-2.5">
                          <div className="space-y-1.5">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                              required
                            >
                              <option value="">-- {t.selectProduct} --</option>
                              {productOptions}
                            </select>
                            <input
                              type="text"
                              value={item.itemDescription}
                              onChange={(e) => handleItemChange(item.id, 'itemDescription', e.target.value)}
                              placeholder="Kalem açıklaması (opsiyonel)"
                              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 align-top">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </td>
                        <td className="p-2.5 align-top">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                            required
                          />
                        </td>
                        <td className="p-2.5 align-top text-right font-mono font-semibold text-slate-200 pt-3">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="p-2.5 align-top text-center pt-2.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={items.length <= 1}
                            className={`p-1.5 rounded-lg transition ${
                              items.length <= 1
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                            }`}
                            title={t.removeItem}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-full sm:w-72 bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-base font-bold text-slate-100">
                <span>{t.grandTotal}:</span>
                <span className="font-mono text-emerald-400">{formatCurrency(subtotal)}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm font-semibold transition"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-purple-600/30 transition"
          >
            <Save size={16} />
            {loading ? common.loading : t.saveOrder}
          </button>
        </div>

      </div>
    </div>
  );
};
