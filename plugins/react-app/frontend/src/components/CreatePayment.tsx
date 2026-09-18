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
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <button 
        onClick={onCancel}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}
      >
        <ArrowLeft size={16} />
        Ödemeler Listesine Dön
      </button>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Yeni Ödeme Kaydı</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Tahsilat (Müşteri Alacağı) veya Tediye (Tedarikçi Ödemesi) girişi yapın.
            </p>
          </div>

          {/* Direction Toggle */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '0.25rem',
            borderRadius: '10px',
            border: '1px solid var(--glass-border)'
          }}>
            <button
              type="button"
              onClick={() => handleDirectionChange('incoming')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: direction === 'incoming' ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                color: direction === 'incoming' ? '#4ade80' : 'var(--text-muted)',
                fontWeight: direction === 'incoming' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ArrowDownLeft size={16} />
              Tahsilat (Giriş)
            </button>
            <button
              type="button"
              onClick={() => handleDirectionChange('outgoing')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: direction === 'outgoing' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: direction === 'outgoing' ? '#60a5fa' : 'var(--text-muted)',
                fontWeight: direction === 'outgoing' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ArrowUpRight size={16} />
              Tediye (Çıkış)
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Payment Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Ödeme Türü *
              </label>
              <select
                name="paymentTypeId"
                value={formData.paymentTypeId}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                {metadata.paymentTypes.map(t => (
                  <option key={t.paymentTypeId} value={t.paymentTypeId}>{t.description || t.paymentTypeId}</option>
                ))}
              </select>
            </div>

            {/* Payment Method Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Ödeme Yöntemi *
              </label>
              <select
                name="paymentMethodTypeId"
                value={formData.paymentMethodTypeId}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                {metadata.paymentMethodTypes.map(pm => (
                  <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>{pm.description || pm.paymentMethodTypeId}</option>
                ))}
              </select>
            </div>

            {/* Party From */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Gönderen (Borçlu / Ödeyen Cari) *
              </label>
              <select
                name="partyIdFrom"
                value={formData.partyIdFrom}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Seçiniz...</option>
                {metadata.parties.map(p => (
                  <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
                ))}
              </select>
            </div>

            {/* Party To */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Alıcı (Alacaklı / Tahsil Eden Cari) *
              </label>
              <select
                name="partyIdTo"
                value={formData.partyIdTo}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">Seçiniz...</option>
                {metadata.parties.map(p => (
                  <option key={p.partyId} value={p.partyId}>{p.name} ({p.partyId})</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Ödeme Tutarı *
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'white',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Para Birimi
              </label>
              <select
                name="currencyUomId"
                value={formData.currencyUomId}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                {metadata.currencies.map(c => (
                  <option key={c.uomId} value={c.uomId}>{c.description}</option>
                ))}
              </select>
            </div>

            {/* Effective Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                İşlem Tarihi *
              </label>
              <input
                type="date"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Reference Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                Dekont / Belge Referans No
              </label>
              <input
                type="text"
                name="paymentRefNum"
                placeholder="Örn: DEK-2026-001, Çek No..."
                value={formData.paymentRefNum}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Comments */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Açıklama / Notlar
            </label>
            <textarea
              name="comments"
              rows={3}
              placeholder="Ödemeye dair detaylar..."
              value={formData.comments}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'white',
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || metadataLoading}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 2rem',
                fontSize: '0.9rem'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="spin" />
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
