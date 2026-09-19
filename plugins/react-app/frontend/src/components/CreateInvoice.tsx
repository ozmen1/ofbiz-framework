import React, { useState, useEffect } from 'react';
import { Save, X, Building2, User, FileText, Calendar, AlignLeft, AlertCircle, Loader2, DollarSign, Hash } from 'lucide-react';
import { api } from '../services/api';
import { useTranslation } from '../i18n';

interface CreateInvoiceProps {
  onCancel: () => void;
  onSave: (newInvoiceId?: string) => void;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ onCancel, onSave }) => {
  const { translations } = useTranslation();
  const [formData, setFormData] = useState({
    partyIdFrom: 'Company',
    partyIdTo: '',
    invoiceTypeId: 'SALES_INVOICE',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    currencyUomId: 'USD',
    referenceNumber: '',
    description: ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [parties, setParties] = useState<{ partyId: string; name: string }[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<{ invoiceTypeId: string; description: string }[]>([]);
  const [currencies, setCurrencies] = useState<{ uomId: string; description: string }[]>([]);

  useEffect(() => {
    api.getInvoiceMetadata()
      .then(res => {
        if (res?.metadata) {
          setParties(res.metadata.parties || []);
          setInvoiceTypes(res.metadata.invoiceTypes || []);
          setCurrencies(res.metadata.currencies || []);
        }
      })
      .catch(err => console.warn('Metadata loading warning:', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.createInvoice({
        partyIdFrom: formData.partyIdFrom,
        partyIdTo: formData.partyIdTo,
        invoiceTypeId: formData.invoiceTypeId,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate || undefined,
        currencyUomId: formData.currencyUomId,
        referenceNumber: formData.referenceNumber || undefined,
        description: formData.description || undefined,
      });

      setLoading(false);
      onSave(res.invoiceId);
    } catch (err: any) {
      setError(err.message || translations.common.error);
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in">

      {/* Page Header */}
      <div className="ds-page-header mb-6">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-indigo-400" />
          <h1 className="ds-page-title">{translations.invoices.newInvoice}</h1>
        </div>
        <button type="button" onClick={onCancel} className="ds-btn-secondary flex items-center gap-2">
          <X size={16} /> {translations.common.cancel}
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ds-alert-error mb-5 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <div><strong>{translations.common.error}:</strong> {error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Parties Section */}
        <div className="ds-card p-6 space-y-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-200 border-b border-slate-700/50 pb-3">
            <Building2 size={18} className="text-indigo-400" /> {translations.common.party}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="ds-label">{translations.invoices.partyFrom}</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  name="partyIdFrom"
                  list="partyList"
                  value={formData.partyIdFrom}
                  onChange={handleChange}
                  placeholder="Örn: Company"
                  className="ds-input pl-9 w-full"
                  required
                />
              </div>
            </div>

            <div>
              <label className="ds-label">{translations.invoices.partyTo}</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  name="partyIdTo"
                  list="partyList"
                  value={formData.partyIdTo}
                  onChange={handleChange}
                  placeholder="Örn: DemoCustomer"
                  className="ds-input pl-9 w-full"
                  required
                />
              </div>
            </div>
          </div>

          {/* Datalist for autocomplete */}
          <datalist id="partyList">
            {parties.map(p => (
              <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
            ))}
          </datalist>
        </div>

        {/* Invoice Details Section */}
        <div className="ds-card p-6 space-y-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-200 border-b border-slate-700/50 pb-3">
            <FileText size={18} className="text-indigo-400" /> {translations.invoices.headerInfo}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="ds-label">{translations.invoices.type}</label>
              <div className="relative">
                <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select
                  name="invoiceTypeId"
                  value={formData.invoiceTypeId}
                  onChange={handleChange}
                  className="ds-select pl-9 w-full"
                >
                  {invoiceTypes.length > 0 ? (
                    invoiceTypes.map(t => (
                      <option key={t.invoiceTypeId} value={t.invoiceTypeId}>{t.description}</option>
                    ))
                  ) : (
                    <>
                      <option value="SALES_INVOICE">{translations.invoices.salesInvoice} (SALES_INVOICE)</option>
                      <option value="PURCHASE_INVOICE">{translations.invoices.purchaseInvoice} (PURCHASE_INVOICE)</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="ds-label">Para Birimi</label>
              <div className="relative">
                <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <select
                  name="currencyUomId"
                  value={formData.currencyUomId}
                  onChange={handleChange}
                  className="ds-select pl-9 w-full"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="TRY">TRY - Turkish Lira</option>
                  <option value="GBP">GBP - British Pound</option>
                  {currencies.filter(c => !['USD', 'EUR', 'TRY', 'GBP'].includes(c.uomId)).slice(0, 20).map(c => (
                    <option key={c.uomId} value={c.uomId}>{c.description}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="ds-label">Fatura Tarihi</label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  name="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={handleChange}
                  className="ds-input pl-9 w-full [color-scheme:dark]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="ds-label">Vade Tarihi (Opsiyonel)</label>
              <div className="relative">
                <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleChange}
                  className="ds-input pl-9 w-full [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="ds-label">{translations.common.reference}</label>
            <div className="relative">
              <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                name="referenceNumber"
                value={formData.referenceNumber}
                onChange={handleChange}
                placeholder="REF-..."
                className="ds-input pl-9 w-full"
              />
            </div>
          </div>

          <div>
            <label className="ds-label">{translations.common.description}</label>
            <div className="relative">
              <AlignLeft size={15} className="absolute left-3 top-3.5 text-slate-500 pointer-events-none" />
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder={translations.invoices.descriptionPlaceholder}
                className="ds-input pl-9 w-full min-h-[100px] resize-y"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end border-t border-slate-700/50 pt-5">
          <button type="button" onClick={onCancel} className="ds-btn-secondary flex items-center gap-2" disabled={loading}>
            <X size={16} /> {translations.common.cancel}
          </button>
          <button type="submit" className="ds-btn-primary flex items-center gap-2" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? translations.invoices.creating : translations.common.create}
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateInvoice;
