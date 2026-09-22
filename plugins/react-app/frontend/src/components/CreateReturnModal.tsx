import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  ReturnMetadata,
  OrderMetadata,
  createReturn,
  CreateReturnItemInput,
} from '../services/orderService';
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  AlertCircle,
  Save,
  Calculator,
  Building2,
  DollarSign,
  Package,
} from 'lucide-react';

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (returnId: string) => void;
  metadata: ReturnMetadata | null;
  orderMetadata?: OrderMetadata | null;
}

interface LocalReturnItem {
  id: string;
  productId: string;
  description: string;
  returnQuantity: number;
  returnPrice: number;
  returnReasonId: string;
  returnTypeId: string;
}

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metadata,
  orderMetadata,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  const [returnHeaderTypeId, setReturnHeaderTypeId] = useState('CUSTOMER_RETURN');
  const [fromPartyId, setFromPartyId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [currencyUomId, setCurrencyUomId] = useState('USD');
  const [items, setItems] = useState<LocalReturnItem[]>([
    {
      id: '1',
      productId: '',
      description: '',
      returnQuantity: 1,
      returnPrice: 0,
      returnReasonId: 'RTN_DEFECTIVE_ITEM',
      returnTypeId: 'RTN_REFUND',
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return (orderMetadata?.parties || []).map((p) => (
      <option key={p.partyId} value={p.partyId}>
        {p.name} ({p.partyId})
      </option>
    ));
  }, [orderMetadata?.parties]);

  // Memoized products
  const productOptions = useMemo(() => {
    return (orderMetadata?.products || []).map((prod) => (
      <option key={prod.productId} value={prod.productId}>
        {prod.productName} ({prod.productId})
      </option>
    ));
  }, [orderMetadata?.products]);

  // Calculate totals
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.returnQuantity || 0) * (item.returnPrice || 0), 0);
  }, [items]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currencyUomId || 'USD',
    }).format(val);
  };

  const handleAddItem = () => {
    const defaultReason = metadata?.returnReasons?.[0]?.returnReasonId || 'RTN_DEFECTIVE_ITEM';
    const defaultType = metadata?.returnTypes?.[0]?.returnTypeId || 'RTN_REFUND';
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productId: '',
        description: '',
        returnQuantity: 1,
        returnPrice: 0,
        returnReasonId: defaultReason,
        returnTypeId: defaultType,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: keyof LocalReturnItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'productId') {
            const prod = orderMetadata?.products?.find((p) => p.productId === value);
            if (prod) {
              updated.description = prod.productName;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromPartyId) {
      setError(t.partyRequired);
      return;
    }
    const validItems = items.filter((i) => (i.productId || i.description.trim()) && i.returnQuantity > 0);
    if (validItems.length === 0) {
      setError(t.atLeastOneItem);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payloadItems: CreateReturnItemInput[] = validItems.map((i) => ({
        productId: i.productId || undefined,
        orderId: orderId.trim() || undefined,
        description: i.description || undefined,
        returnQuantity: Number(i.returnQuantity),
        returnPrice: Number(i.returnPrice),
        returnReasonId: i.returnReasonId || undefined,
        returnTypeId: i.returnTypeId || undefined,
      }));

      const res = await createReturn({
        returnHeaderTypeId,
        fromPartyId,
        currencyUomId,
        orderId: orderId.trim() || undefined,
        items: payloadItems,
      });

      onSuccess(res.returnId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {t.createNewReturn}
              </h2>
              <p className="text-xs text-slate-400">
                {t.returnDetail}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="ds-alert-error flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Header Details */}
          <div className="ds-card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ds-label">
                {t.returnHeaderType} *
              </label>
              <select
                value={returnHeaderTypeId}
                onChange={(e) => setReturnHeaderTypeId(e.target.value)}
                className="ds-select"
              >
                {metadata?.returnHeaderTypes && metadata.returnHeaderTypes.length > 0 ? (
                  metadata.returnHeaderTypes.map((type) => (
                    <option key={type.returnHeaderTypeId} value={type.returnHeaderTypeId}>
                      {type.description}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CUSTOMER_RETURN">{t.customerReturn}</option>
                    <option value="VENDOR_RETURN">{t.vendorReturn}</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="ds-label">
                {t.party} *
              </label>
              <div className="relative">
                <select
                  value={fromPartyId}
                  onChange={(e) => setFromPartyId(e.target.value)}
                  className="ds-select"
                  required
                >
                  <option value="">-- {t.selectParty} --</option>
                  {partyOptions}
                </select>
                <Building2 className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="ds-label">
                {t.orderIdOptional}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="WSCO10000..."
                  className="ds-input"
                />
                <Package className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="ds-label">
                {t.currency} *
              </label>
              <div className="relative">
                <select
                  value={currencyUomId}
                  onChange={(e) => setCurrencyUomId(e.target.value)}
                  className="ds-select"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="TRY">TRY (₺)</option>
                </select>
                <DollarSign className="w-4 h-4 text-slate-500 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items */}
          <div className="ds-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                {t.items}
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="ds-btn-secondary flex items-center gap-1.5 py-1 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.addItem}</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2">
                    <span className="font-semibold text-slate-300">
                      #{idx + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-400 hover:text-rose-300 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    {/* Product */}
                    <div className="md:col-span-4">
                      <label className="ds-label">
                        {t.product}
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(item.id, 'productId', e.target.value)}
                        className="ds-select text-xs py-1"
                      >
                        <option value="">-- {t.selectProduct} --</option>
                        {productOptions}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="md:col-span-3">
                      <label className="ds-label">
                        {t.reason} / Açıklama
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                        placeholder="Kalem açıklaması..."
                        className="ds-input text-xs py-1"
                      />
                    </div>

                    {/* Qty */}
                    <div className="md:col-span-1">
                      <label className="ds-label">
                        {t.returnQty}
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.returnQuantity}
                        onChange={(e) =>
                          handleItemChange(item.id, 'returnQuantity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="ds-input text-xs py-1 text-right"
                      />
                    </div>

                    {/* Price */}
                    <div className="md:col-span-2">
                      <label className="ds-label">
                        {t.returnPrice}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.returnPrice}
                        onChange={(e) =>
                          handleItemChange(item.id, 'returnPrice', parseFloat(e.target.value) || 0)
                        }
                        className="ds-input text-xs py-1 text-right"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="md:col-span-2">
                      <label className="ds-label">
                        {t.lineTotal}
                      </label>
                      <div className="w-full bg-slate-800/60 border border-slate-700/40 rounded-lg px-2 py-1.5 text-xs text-slate-200 text-right font-medium">
                        {formatCurrency((item.returnQuantity || 0) * (item.returnPrice || 0))}
                      </div>
                    </div>
                  </div>

                  {/* Return Reason and Return Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="ds-label">
                        {t.returnReason}
                      </label>
                      <select
                        value={item.returnReasonId}
                        onChange={(e) => handleItemChange(item.id, 'returnReasonId', e.target.value)}
                        className="ds-select text-xs py-1"
                      >
                        {(metadata?.returnReasons || []).map((r) => (
                          <option key={r.returnReasonId} value={r.returnReasonId}>
                            {r.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="ds-label">
                        {t.returnType}
                      </label>
                      <select
                        value={item.returnTypeId}
                        onChange={(e) => handleItemChange(item.id, 'returnTypeId', e.target.value)}
                        className="ds-select text-xs py-1"
                      >
                        {(metadata?.returnTypes || []).map((rt) => (
                          <option key={rt.returnTypeId} value={rt.returnTypeId}>
                            {rt.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Summary Total */}
          <div className="ds-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>{t.grandTotal}</span>
            </div>
            <span className="text-xl font-bold text-emerald-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? common.loading : t.saveReturn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
