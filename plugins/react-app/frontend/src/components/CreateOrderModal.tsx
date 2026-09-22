import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { 
  OrderMetadata, 
  createOrder, 
  CreateOrderItemInput 
} from '../services/orderService';
import { 
  X, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  AlertCircle, 
  Save, 
  Calculator, 
  DollarSign, 
  Calendar, 
  Building2 
} from 'lucide-react';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  metadata: OrderMetadata | null;
  initialOrderType?: 'SALES_ORDER' | 'PURCHASE_ORDER';
}

interface LocalOrderItem {
  id: string;
  productId: string;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metadata,
  initialOrderType = 'SALES_ORDER',
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.orders;
  const common = translations.common;

  const [orderTypeId, setOrderTypeId] = useState<'SALES_ORDER' | 'PURCHASE_ORDER'>(initialOrderType);
  const [partyId, setPartyId] = useState('');
  const [orderName, setOrderName] = useState('');
  const [currencyUom, setCurrencyUom] = useState('USD');
  const [productStoreId, setProductStoreId] = useState('');
  const [statusId, setStatusId] = useState('ORDER_CREATED');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shippingAmount, setShippingAmount] = useState<string>('0');
  const [taxAmount, setTaxAmount] = useState<string>('0');
  const [items, setItems] = useState<LocalOrderItem[]>([
    { id: '1', productId: '', itemDescription: '', quantity: 1, unitPrice: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default product store from metadata if available
  useEffect(() => {
    if (metadata?.productStores && metadata.productStores.length > 0 && !productStoreId) {
      setProductStoreId(metadata.productStores[0].productStoreId);
    }
  }, [metadata, productStoreId]);

  // Sync initial order type when opened
  useEffect(() => {
    if (isOpen) {
      setOrderTypeId(initialOrderType);
      setError(null);
    }
  }, [isOpen, initialOrderType]);

  // Golden Invariant 2: Body Scroll Lock
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

  // Memoized parties
  const partyOptions = useMemo(() => {
    return (metadata?.parties || []).map(p => (
      <option key={p.partyId} value={p.partyId}>
        {p.name} ({p.partyId})
      </option>
    ));
  }, [metadata?.parties]);

  // Memoized products
  const productOptions = useMemo(() => {
    return (metadata?.products || []).map(prod => (
      <option key={prod.productId} value={prod.productId}>
        {prod.productName} ({prod.productId})
      </option>
    ));
  }, [metadata?.products]);

  // Calculate totals
  const subtotal = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const ship = parseFloat(shippingAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    return subtotal + ship + tax;
  }, [subtotal, shippingAmount, taxAmount]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        productId: '',
        itemDescription: '',
        quantity: 1,
        unitPrice: 0,
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof LocalOrderItem, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updated = { ...item, [field]: val };

      // If productId changed, try to auto-fill description & price from metadata
      if (field === 'productId') {
        const found = metadata?.products?.find(p => p.productId === val);
        if (found) {
          updated.itemDescription = found.productName;
          if (found.defaultPrice) {
            updated.unitPrice = found.defaultPrice;
          }
        }
      }
      return updated;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!partyId) {
      setError(t.partyRequired);
      return;
    }

    const validItems: CreateOrderItemInput[] = items
      .filter(it => it.productId.trim() !== '')
      .map(it => ({
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
      const resp = await createOrder({
        orderTypeId,
        partyId,
        orderName: orderName.trim() || undefined,
        currencyUom,
        productStoreId: orderTypeId === 'SALES_ORDER' ? (productStoreId || undefined) : undefined,
        statusId,
        orderDate,
        shippingAmount: parseFloat(shippingAmount) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        items: validItems,
      });

      onSuccess(resp.orderId);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Sipariş oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currencyUom || 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">{t.createNewOrder}</h2>
              <p className="text-xs text-slate-400">
                {orderTypeId === 'SALES_ORDER' ? t.salesOrder : t.purchaseOrder}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body - Single unified vertical scroll */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="ds-alert-error flex items-start gap-3">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Order Information */}
          <div className="ds-card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="ds-label">
                {t.orderType}
              </label>
              <select
                value={orderTypeId}
                onChange={e => setOrderTypeId(e.target.value as 'SALES_ORDER' | 'PURCHASE_ORDER')}
                className="ds-select"
              >
                <option value="SALES_ORDER">{t.salesOrder}</option>
                <option value="PURCHASE_ORDER">{t.purchaseOrder}</option>
              </select>
            </div>

            <div>
              <label className="ds-label flex items-center gap-1.5">
                <Building2 size={13} className="text-indigo-400" />
                {t.customerOrVendor} *
              </label>
              <select
                value={partyId}
                onChange={e => setPartyId(e.target.value)}
                className="ds-select"
                required
              >
                <option value="">-- {t.selectParty} --</option>
                {partyOptions}
              </select>
            </div>

            <div>
              <label className="ds-label flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-400" />
                {t.orderDate}
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={e => setOrderDate(e.target.value)}
                className="ds-input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="ds-label">
                {t.orderName}
              </label>
              <input
                type="text"
                value={orderName}
                onChange={e => setOrderName(e.target.value)}
                placeholder="Örn: 2026/09 Kurumsal Tedarik Siparişi"
                className="ds-input"
              />
            </div>

            <div>
              <label className="ds-label flex items-center gap-1.5">
                <DollarSign size={13} className="text-indigo-400" />
                {t.currency}
              </label>
              <select
                value={currencyUom}
                onChange={e => setCurrencyUom(e.target.value)}
                className="ds-select"
              >
                {(metadata?.currencyUoms || [{ uomId: 'USD', description: 'USD' }]).map(c => (
                  <option key={c.uomId} value={c.uomId}>
                    {c.description || c.uomId}
                  </option>
                ))}
              </select>
            </div>

            {orderTypeId === 'SALES_ORDER' && (
              <div>
                <label className="ds-label">
                  {t.productStore}
                </label>
                <select
                  value={productStoreId}
                  onChange={e => setProductStoreId(e.target.value)}
                  className="ds-select"
                >
                  {(metadata?.productStores || []).map(st => (
                    <option key={st.productStoreId} value={st.productStoreId}>
                      {st.storeName} ({st.productStoreId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="ds-label">
                {t.initialStatus}
              </label>
              <select
                value={statusId}
                onChange={e => setStatusId(e.target.value)}
                className="ds-select"
              >
                <option value="ORDER_CREATED">{t.kpiPending} (Created)</option>
                <option value="ORDER_APPROVED">{t.kpiApproved} (Approved)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Line Items */}
          {/* Section 2: Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calculator size={16} className="text-indigo-400" />
                {t.items} ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="ds-btn-secondary flex items-center gap-1.5 py-1 px-3 text-xs"
              >
                <Plus size={14} />
                <span>{t.addItem}</span>
              </button>
            </div>

            <div className="ds-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{t.product} *</th>
                      <th className="ds-th w-36">{t.quantity}</th>
                      <th className="ds-th w-40">{t.unitPrice} ({currencyUom})</th>
                      <th className="ds-th-right w-36">{t.lineTotal}</th>
                      <th className="ds-th w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <tr key={item.id} className="ds-tbody-row">
                          <td className="ds-td">
                            <div className="space-y-1.5">
                              <select
                                value={item.productId}
                                onChange={e => handleItemChange(item.id, 'productId', e.target.value)}
                                className="ds-select text-xs py-1"
                                required
                              >
                                <option value="">-- {t.selectProduct} --</option>
                                {productOptions}
                              </select>
                              <input
                                type="text"
                                value={item.itemDescription}
                                onChange={e => handleItemChange(item.id, 'itemDescription', e.target.value)}
                                placeholder="Kalem açıklaması (opsiyonel)"
                                className="ds-input text-xs py-1"
                              />
                            </div>
                          </td>
                          <td className="ds-td align-top">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="ds-input text-xs py-1 text-right"
                              required
                            />
                          </td>
                          <td className="ds-td align-top">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="ds-input text-xs py-1 text-right"
                              required
                            />
                          </td>
                          <td className="ds-td-right align-top pt-3 font-mono text-emerald-400">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="ds-td align-top text-center pt-2.5">
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
          </div>

          {/* Section 3: Adjustments & Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="ds-card p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {t.adjustments}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">
                    {t.shippingAmount}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={shippingAmount}
                    onChange={e => setShippingAmount(e.target.value)}
                    className="ds-input text-xs py-1.5 text-right"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.taxAmount}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={taxAmount}
                    onChange={e => setTaxAmount(e.target.value)}
                    className="ds-input text-xs py-1.5 text-right"
                  />
                </div>
              </div>
            </div>

            <div className="ds-card p-4 flex flex-col justify-center space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t.subtotal}:</span>
                <span className="font-mono text-slate-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t.shippingAmount}:</span>
                <span className="font-mono text-slate-200">
                  {formatCurrency(parseFloat(shippingAmount) || 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{t.taxAmount}:</span>
                <span className="font-mono text-slate-200">
                  {formatCurrency(parseFloat(taxAmount) || 0)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-base font-bold text-slate-100">
                <span>{t.grandTotal}:</span>
                <span className="font-mono text-emerald-400">{formatCurrency(grandTotal)}</span>
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
            className="ds-btn-secondary"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="ds-btn-primary"
          >
            <Save size={16} />
            <span>{loading ? common.loading : t.saveOrder}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
