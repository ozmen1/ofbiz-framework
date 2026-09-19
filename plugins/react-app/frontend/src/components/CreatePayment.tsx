import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, DollarSign, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { api, PaymentMetadataResponse } from '../services/api';
import { useTranslation } from '../i18n';

interface CreatePaymentProps {
  onSave: (paymentId: string) => void;
  onCancel: () => void;
  initialPartyIdFrom?: string;
  initialPartyIdTo?: string;
}

export const CreatePayment: React.FC<CreatePaymentProps> = ({
  onSave,
  onCancel,
  initialPartyIdFrom = '',
  initialPartyIdTo = ''
}) => {
  const { translations } = useTranslation();
  const t = translations.payments;
  const common = translations.common;

  const [loading, setLoading] = useState<boolean>(false);
  const [metadataLoading, setMetadataLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<PaymentMetadataResponse['metadata']>({
    paymentTypes: [],
    paymentMethodTypes: [],
    statusList: [],
    parties: [],
    currencies: []
  });

  // Direction: 'incoming' = receipt (customer pays us), 'outgoing' = disbursement (we pay vendor)
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');

  const [formData, setFormData] = useState({
    paymentTypeId: 'CUSTOMER_PAYMENT',
    partyIdFrom: initialPartyIdFrom,
    partyIdTo: initialPartyIdTo || 'Company',
    amount: '',
    currencyUomId: 'USD',
    paymentMethodTypeId: 'COMPANY_CHECK',
    effectiveDate: new Date().toISOString().split('T')[0],
    paymentRefNum: '',
    comments: '',
    statusId: 'PMNT_NOT_PAID'
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setMetadataLoading(true);
        const res = await api.getPaymentMetadata();
        if (res.metadata) {
          setMetadata(res.metadata);
          if (res.metadata.paymentTypes.length > 0 && !formData.paymentTypeId) {
            setFormData(prev => ({ ...prev, paymentTypeId: res.metadata.paymentTypes[0].paymentTypeId }));
          }
        }
      } catch (err: any) {
        console.error('Metadata fetch error:', err);
      } finally {
        setMetadataLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleDirectionChange = (newDir: 'incoming' | 'outgoing') => {
    setDirection(newDir);
    if (newDir === 'incoming') {
      setFormData(prev => ({
        ...prev,
        paymentTypeId: 'CUSTOMER_PAYMENT',
        partyIdFrom: '',
        partyIdTo: 'Company'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        paymentTypeId: 'VENDOR_PAYMENT',
        partyIdFrom: 'Company',
        partyIdTo: ''
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError(t.amountRequired);
      return;
    }
    if (!formData.partyIdFrom || !formData.partyIdTo) {
      setError(t.partiesRequired);
      return;
    }
    if (formData.partyIdFrom === formData.partyIdTo) {
      setError(t.partiesCannotBeSame);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.createPayment({
        paymentTypeId: formData.paymentTypeId,
        partyIdFrom: formData.partyIdFrom,
        partyIdTo: formData.partyIdTo,
        amount: parseFloat(formData.amount),
        currencyUomId: formData.currencyUomId,
        paymentMethodTypeId: formData.paymentMethodTypeId,
        effectiveDate: formData.effectiveDate,
        paymentRefNum: formData.paymentRefNum,
        comments: formData.comments,
        statusId: formData.statusId
      });

      if (res.paymentId) {
        onSave(res.paymentId);
      } else {
        setError(t.paymentCreateError);
      }
    } catch (err: any) {
      setError(err.message || t.paymentCreateError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-sm bg-transparent border-none cursor-pointer"
      >
        <ArrowLeft size={16} />
        {t.backToList}
      </button>

      <div className="ds-card p-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white m-0">{t.paymentDetailsTitle}</h3>
            <p className="text-slate-400 text-sm mt-1">
              {t.paymentDetailsSubtitle}
            </p>
          </div>

          {/* Direction Toggle */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => handleDirectionChange('incoming')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-none text-sm font-medium transition-all cursor-pointer ${
                direction === 'incoming'
                  ? 'bg-emerald-600/20 text-emerald-400 font-semibold'
                  : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDownLeft size={16} />
              {t.receiptIn}
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('outgoing')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-none text-sm font-medium transition-all cursor-pointer ${
                direction === 'outgoing'
                  ? 'bg-blue-600/20 text-blue-400 font-semibold'
                  : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpRight size={16} />
              {t.disbursementOut}
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="ds-alert-error flex items-center gap-3 mb-5">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Payment Type */}
            <div>
              <label className="ds-label">{t.paymentType} *</label>
              <select
                name="paymentTypeId"
                value={formData.paymentTypeId}
                onChange={handleChange}
                className="ds-select w-full"
              >
                {metadata.paymentTypes.map(item => (
                  <option key={item.paymentTypeId} value={item.paymentTypeId}>{item.description || item.paymentTypeId}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Type */}
            <div>
              <label className="ds-label">{t.paymentMethod} *</label>
              <select
                name="paymentMethodTypeId"
                value={formData.paymentMethodTypeId}
                onChange={handleChange}
                className="ds-select w-full"
              >
                {metadata.paymentMethodTypes.map(pm => (
                  <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>{pm.description || pm.paymentMethodTypeId}</option>
                ))}
              </select>
            </div>

            {/* Party From */}
            <div>
              <label className="ds-label">{t.senderPayer} *</label>
              <select
                name="partyIdFrom"
                value={formData.partyIdFrom}
                onChange={handleChange}
                className="ds-select w-full"
              >
                <option value="">{t.selectPartyPrompt}</option>
                {metadata.parties.map(p => (
                  <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
                ))}
              </select>
            </div>

            {/* Party To */}
            <div>
              <label className="ds-label">{t.receiverPayee} *</label>
              <select
                name="partyIdTo"
                value={formData.partyIdTo}
                onChange={handleChange}
                className="ds-select w-full"
              >
                <option value="">{t.selectPartyPrompt}</option>
                {metadata.parties.map(p => (
                  <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="ds-label">{t.paymentAmount} *</label>
              <div className="relative">
                <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  className="ds-input pl-9 w-full"
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="ds-label">{common.currency}</label>
              <select
                name="currencyUomId"
                value={formData.currencyUomId}
                onChange={handleChange}
                className="ds-select w-full"
              >
                {metadata.currencies.map(c => (
                  <option key={c.uomId} value={c.uomId}>{c.description}</option>
                ))}
              </select>
            </div>

            {/* Effective Date */}
            <div>
              <label className="ds-label">{t.effectiveDate} *</label>
              <input
                type="date"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleChange}
                className="ds-input w-full"
              />
            </div>

            {/* Reference Number */}
            <div>
              <label className="ds-label">{t.paymentRef}</label>
              <input
                type="text"
                name="paymentRefNum"
                placeholder="REF-..."
                value={formData.paymentRefNum}
                onChange={handleChange}
                className="ds-input w-full"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="ds-label">{t.notesDesc}</label>
            <textarea
              name="comments"
              rows={3}
              placeholder="..."
              value={formData.comments}
              onChange={handleChange}
              className="ds-input w-full resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || metadataLoading}
              className="ds-btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="ds-spinner-sm" />
                  {common.loading}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {common.save}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePayment;
