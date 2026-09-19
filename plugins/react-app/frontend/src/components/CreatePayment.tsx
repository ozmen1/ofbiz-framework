import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle, Loader2, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';
import { api, PaymentMetadataResponse } from '../services/api';

interface CreatePaymentProps {
  onCancel: () => void;
  onSave: (paymentId: string) => void;
}

const CreatePayment: React.FC<CreatePaymentProps> = ({ onCancel, onSave }) => {
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    paymentTypeId: 'CUSTOMER_PAYMENT',
    partyIdFrom: '',
    partyIdTo: 'Company',
    amount: '',
    currencyUomId: 'USD',
    paymentMethodTypeId: 'EFT_ACCOUNT',
    effectiveDate: new Date().toISOString().substring(0, 10),
    paymentRefNum: '',
    comments: '',
    statusId: 'PMNT_NOT_PAID'
  });

  const [metadata, setMetadata] = useState<PaymentMetadataResponse['metadata']>({
    paymentTypes: [],
    paymentMethodTypes: [],
    statusList: [],
    parties: [],
    currencies: []
  });

  useEffect(() => {
    api.getPaymentMetadata()
      .then(res => {
        if (res?.metadata) {
          setMetadata(res.metadata);
          // Pick first party as payer if incoming
          const nonCompany = res.metadata.parties.find(p => p.partyId !== 'Company');
          if (nonCompany) {
            setFormData(prev => ({
              ...prev,
              partyIdFrom: nonCompany.partyId
            }));
          }
        }
        setMetadataLoading(false);
      })
      .catch(err => {
        console.warn('Metadata error:', err);
        setMetadataLoading(false);
      });
  }, []);

  const handleDirectionChange = (newDirection: 'incoming' | 'outgoing') => {
    setDirection(newDirection);
    if (newDirection === 'incoming') {
      setFormData(prev => ({
        ...prev,
        paymentTypeId: 'CUSTOMER_PAYMENT',
        partyIdTo: 'Company',
        partyIdFrom: prev.partyIdFrom === 'Company' ? '' : prev.partyIdFrom,
        statusId: 'PMNT_NOT_PAID'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        paymentTypeId: 'VENDOR_PAYMENT',
        partyIdFrom: 'Company',
        partyIdTo: prev.partyIdTo === 'Company' ? '' : prev.partyIdTo,
        statusId: 'PMNT_NOT_PAID'
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
      setError('Geçerli bir ödeme tutarı giriniz.');
      return;
    }
    if (!formData.partyIdFrom || !formData.partyIdTo) {
      setError('Gönderen ve Alıcı cari hesapları zorunludur.');
      return;
    }
    if (formData.partyIdFrom === formData.partyIdTo) {
      setError('Gönderen ve Alıcı cariler aynı olamaz.');
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
        setError('Ödeme oluşturulamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'Ödeme kaydedilirken bir hata oluştu.');
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
        Ödemeler Listesine Dön
      </button>

      <div className="ds-card p-6">
        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white m-0">Yeni Ödeme Kaydı</h3>
            <p className="text-slate-400 text-sm mt-1">
              Tahsilat (Müşteri Alacağı) veya Tediye (Tedarikçi Ödemesi) girişi yapın.
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
              Tahsilat (Giriş)
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
              Tediye (Çıkış)
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
              <label className="ds-label">Ödeme Türü *</label>
              <select
                name="paymentTypeId"
                value={formData.paymentTypeId}
                onChange={handleChange}
                className="ds-select w-full"
              >
                {metadata.paymentTypes.map(t => (
                  <option key={t.paymentTypeId} value={t.paymentTypeId}>{t.description || t.paymentTypeId}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Type */}
            <div>
              <label className="ds-label">Ödeme Yöntemi *</label>
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
              <label className="ds-label">Gönderen (Borçlu / Ödeyen Cari) *</label>
              <select
                name="partyIdFrom"
                value={formData.partyIdFrom}
                onChange={handleChange}
                className="ds-select w-full"
              >
                <option value="">Seçiniz...</option>
                {metadata.parties.map(p => (
                  <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
                ))}
              </select>
            </div>

            {/* Party To */}
            <div>
              <label className="ds-label">Alıcı (Alacaklı / Tahsil Eden Cari) *</label>
              <select
                name="partyIdTo"
                value={formData.partyIdTo}
                onChange={handleChange}
                className="ds-select w-full"
              >
                <option value="">Seçiniz...</option>
                {metadata.parties.map(p => (
                  <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="ds-label">Ödeme Tutarı *</label>
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
              <label className="ds-label">Para Birimi</label>
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
              <label className="ds-label">İşlem Tarihi *</label>
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
              <label className="ds-label">Dekont / Belge Referans No</label>
              <input
                type="text"
                name="paymentRefNum"
                placeholder="Örn: DEK-2026-001, Çek No..."
                value={formData.paymentRefNum}
                onChange={handleChange}
                className="ds-input w-full"
              />
            </div>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="ds-label">Açıklama / Notlar</label>
            <textarea
              name="comments"
              rows={3}
              placeholder="Ödemeye dair detaylar..."
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
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || metadataLoading}
              className="ds-btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="ds-spinner-sm" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Ödemeyi Kaydet
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
