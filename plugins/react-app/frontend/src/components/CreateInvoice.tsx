import React, { useState, useEffect } from 'react';
import { Save, X, Building2, User, FileText, Calendar, AlignLeft, AlertCircle, Loader2, DollarSign, Hash } from 'lucide-react';
import { api } from '../services/api';

interface CreateInvoiceProps {
  onCancel: () => void;
  onSave: (newInvoiceId?: string) => void;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ onCancel, onSave }) => {
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
      setError(err.message || 'Fatura oluşturulurken bir hata meydana geldi.');
      setLoading(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText size={24} color="var(--primary)" /> Yeni Fatura Oluştur
        </h2>
        <button type="button" onClick={onCancel} className="btn-icon" title="İptal">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          color: '#fca5a5',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <div>
            <strong>Hata:</strong> {error}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gap: '2rem' }}>
          
          {/* Parties Section */}
          <div>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <Building2 size={18} color="var(--primary)" /> Cari Bilgileri
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Gönderen Cari (Party From)</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="partyIdFrom" 
                    list="partyList"
                    value={formData.partyIdFrom} 
                    onChange={handleChange} 
                    placeholder="Örn: Company" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Alıcı Cari (Party To)</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="partyIdTo" 
                    list="partyList"
                    value={formData.partyIdTo} 
                    onChange={handleChange} 
                    placeholder="Örn: DemoCustomer" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
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
          <div>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <FileText size={18} color="var(--primary)" /> Fatura Detayları
            </h3>
            
            <div className="form-grid">
              <div className="form-group">
                <label>Fatura Türü</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select 
                    name="invoiceTypeId" 
                    value={formData.invoiceTypeId} 
                    onChange={handleChange} 
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                  >
                    {invoiceTypes.length > 0 ? (
                      invoiceTypes.map(t => (
                        <option key={t.invoiceTypeId} value={t.invoiceTypeId}>{t.description}</option>
                      ))
                    ) : (
                      <>
                        <option value="SALES_INVOICE">Satış Faturası (SALES_INVOICE)</option>
                        <option value="PURCHASE_INVOICE">Alış Faturası (PURCHASE_INVOICE)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Para Birimi</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select 
                    name="currencyUomId" 
                    value={formData.currencyUomId} 
                    onChange={handleChange} 
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
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

              <div className="form-group">
                <label>Fatura Tarihi</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    name="invoiceDate" 
                    value={formData.invoiceDate} 
                    onChange={handleChange} 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Vade Tarihi (Opsiyonel)</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date" 
                    name="dueDate" 
                    value={formData.dueDate} 
                    onChange={handleChange} 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Referans Numarası (Belge No / İrsaliye No)</label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  name="referenceNumber" 
                  value={formData.referenceNumber} 
                  onChange={handleChange} 
                  placeholder="Örn: REF-2026-001" 
                  className="glass-input" 
                  style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Açıklama / Notlar</label>
              <div style={{ position: 'relative' }}>
                <AlignLeft size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Faturaya dair genel açıklama veya proje detayı..." 
                  className="glass-input" 
                  style={{ paddingLeft: '2.5rem', width: '100%', minHeight: '100px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
              <X size={18} /> İptal
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Oluşturuluyor...' : 'Faturayı Oluştur'}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default CreateInvoice;
