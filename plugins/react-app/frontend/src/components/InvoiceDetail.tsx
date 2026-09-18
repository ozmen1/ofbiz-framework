import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Save, Edit3, CheckCircle2, Clock, XCircle, FileText, Building2, User, 
  Calendar, AlignLeft, Plus, Trash2, Copy, AlertCircle, Check, Loader2,
  Tag, ShieldAlert, CreditCard
} from 'lucide-react';
import { api, InvoiceDetailResponse } from '../services/api';
import InvoiceNotesAndTerms from './InvoiceNotesAndTerms';


interface InvoiceDetailProps {
  invoiceId: string | null;
  onBack: () => void;
  onViewInvoice?: (newId: string) => void;
  onViewPayment?: (paymentId: string) => void;
}

const getStatusColor = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return 'rgba(34, 197, 94, 0.15)';
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return 'rgba(59, 130, 246, 0.15)';
    case 'INVOICE_READY': return 'rgba(168, 85, 247, 0.15)';
    case 'INVOICE_IN_PROCESS': return 'rgba(234, 179, 8, 0.15)';
    case 'INVOICE_CANCELLED': return 'rgba(239, 68, 68, 0.15)';
    default: return 'var(--glass-border)';
  }
};

const getStatusTextColor = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return '#4ade80';
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return '#60a5fa';
    case 'INVOICE_READY': return '#c084fc';
    case 'INVOICE_IN_PROCESS': return '#facc15';
    case 'INVOICE_CANCELLED': return '#f87171';
    default: return 'white';
  }
};

const getStatusIcon = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return <CheckCircle2 size={16} />;
    case 'INVOICE_IN_PROCESS': return <Clock size={16} />;
    case 'INVOICE_CANCELLED': return <XCircle size={16} />;
    default: return <FileText size={16} />;
  }
};

const formatStatus = (statusId: string) => {
  return (statusId || '').replace('INVOICE_', '').replace(/_/g, ' ');
};

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack, onViewInvoice, onViewPayment }) => {
  const [detail, setDetail] = useState<InvoiceDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Edit Header State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({
    description: '',
    dueDate: '',
    invoiceDate: '',
    referenceNumber: '',
    currencyUomId: 'USD'
  });

  // Add Item State
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({
    invoiceItemTypeId: 'INV_PROD_ITEM',
    productId: '',
    description: '',
    quantity: 1,
    amount: 0
  });

  // Metadata for item types
  const [itemTypes, setItemTypes] = useState<{ invoiceItemTypeId: string; description: string }[]>([]);

  // Load Invoice Details
  const loadInvoice = useCallback(() => {
    if (!invoiceId) return;
    setLoading(true);
    setError(null);
    api.getInvoiceDetails(invoiceId)
      .then(data => {
        setDetail(data);
        if (data.invoice) {
          setHeaderForm({
            description: data.invoice.description || '',
            dueDate: data.invoice.dueDate || '',
            invoiceDate: data.invoice.invoiceDate || '',
            referenceNumber: data.invoice.referenceNumber || '',
            currencyUomId: data.invoice.currencyUomId || 'USD'
          });
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Fatura detayları yüklenemedi.');
        setLoading(false);
      });
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
    api.getInvoiceMetadata()
      .then(res => {
        if (res?.metadata?.invoiceItemTypes) {
          setItemTypes(res.metadata.invoiceItemTypes);
        }
      })
      .catch(() => {});
  }, [loadInvoice]);

  // Flash message helper
  const flashMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  // Header Save
  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    setActionLoading(true);
    setError(null);
    try {
      await api.updateInvoice({
        invoiceId,
        description: headerForm.description,
        dueDate: headerForm.dueDate,
        invoiceDate: headerForm.invoiceDate,
        referenceNumber: headerForm.referenceNumber,
        currencyUomId: headerForm.currencyUomId
      });
      setIsEditingHeader(false);
      flashMessage('Fatura başlığı başarıyla güncellendi.');
      loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Başlık güncellenirken hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatusId: string) => {
    if (!invoiceId) return;
    if (!confirm(`Fatura durumunu "${formatStatus(newStatusId)}" olarak değiştirmek istediğinize emin misiniz?`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.setInvoiceStatus(invoiceId, newStatusId);
      flashMessage(res._EVENT_MESSAGE_ || `Fatura durumu güncellendi: ${formatStatus(newStatusId)}`);
      loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Durum değiştirilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  // Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) return;
    if (!itemForm.description) {
      setError('Kalem açıklaması zorunludur.');
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.createInvoiceItem({
        invoiceId,
        invoiceItemTypeId: itemForm.invoiceItemTypeId,
        productId: itemForm.productId || undefined,
        description: itemForm.description,
        quantity: itemForm.quantity,
        amount: itemForm.amount
      });
      setShowAddItem(false);
      setItemForm({ invoiceItemTypeId: 'INV_PROD_ITEM', productId: '', description: '', quantity: 1, amount: 0 });
      flashMessage('Yeni kalem başarıyla eklendi.');
      loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Kalem eklenemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (seqId: string) => {
    if (!invoiceId) return;
    if (!confirm(`${seqId} nolu faturanın kalemini silmek istiyor musunuz?`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      await api.removeInvoiceItem(invoiceId, seqId);
      flashMessage('Kalem silindi.');
      loadInvoice();
    } catch (err: any) {
      setError(err.message || 'Kalem silinirken hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Invoice
  const handleCopyInvoice = async () => {
    if (!invoiceId) return;
    if (!confirm(`"${invoiceId}" nolu faturayı kopyalamak istiyor musunuz?`)) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.copyInvoice(invoiceId);
      flashMessage(`Fatura kopyalandı! Yeni Fatura: ${res.invoiceId}`);
      if (onViewInvoice && res.invoiceId) {
        onViewInvoice(res.invoiceId);
      } else {
        loadInvoice();
      }
    } catch (err: any) {
      setError(err.message || 'Fatura kopyalanamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '1rem' }}>
        <Loader2 size={36} className="animate-spin" color="var(--primary)" />
        <span style={{ color: 'var(--text-muted)' }}>Fatura detayları OFBiz'den yükleniyor...</span>
      </div>
    );
  }

  if (!detail || !detail.invoice) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <ShieldAlert size={48} color="#f87171" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{ margin: 0, marginBottom: '1rem' }}>Fatura Bulunamadı</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || 'Belirtilen fatura sistemde mevcut değil.'}</p>
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Faturalara Geri Dön
        </button>
      </div>
    );
  }

  const { invoice, items, totals, statusHistory, paymentsApplied } = detail;
  const isEditable = invoice.statusId === 'INVOICE_IN_PROCESS';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Top Bar / Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={18} /> Faturalar Listesine Dön
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn-secondary" 
            onClick={handleCopyInvoice} 
            disabled={actionLoading}
            title="Bu faturanın bir kopyasını oluştur"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Copy size={16} /> Faturayı Kopyala
          </button>
          
          <span className="status-badge" style={{ 
            background: getStatusColor(invoice.statusId),
            color: getStatusTextColor(invoice.statusId),
            border: `1px solid ${getStatusTextColor(invoice.statusId)}40`,
            fontSize: '0.875rem',
            padding: '0.5rem 1rem'
          }}>
            {getStatusIcon(invoice.statusId)}
            {formatStatus(invoice.statusId)}
          </span>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>#{invoice.invoiceId}</h2>
        </div>
      </div>

      {/* Messages / Alerts */}
      {message && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Check size={20} />
          <div>{message}</div>
        </div>
      )}

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <div><strong>Hata:</strong> {error}</div>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ara Toplam (KDV Hariç)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem' }}>
            {totals.subTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Vergi / KDV</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem', color: '#93c5fd' }}>
            {totals.taxTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>Genel Toplam</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem', color: 'white' }}>
            {totals.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Kalan Açık Bakiye</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.5rem', color: totals.outstandingAmount > 0 ? '#facc15' : '#4ade80' }}>
            {totals.outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
          </div>
        </div>
      </div>

      {/* Invoice Status Action Bar */}
      <div className="glass-card animate-fade-in" style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block' }}>Fatura Durumu İşlemleri</span>
          <span style={{ fontWeight: 600 }}>Mevcut Aşama: {formatStatus(invoice.statusId)}</span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {invoice.statusId === 'INVOICE_IN_PROCESS' && (
            <>
              <button 
                className="btn-primary" 
                onClick={() => handleStatusChange('INVOICE_APPROVED')}
                disabled={actionLoading}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
              >
                <CheckCircle2 size={16} /> Faturayı Onayla (Approved)
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleStatusChange('INVOICE_READY')}
                disabled={actionLoading}
              >
                Hazır Olarak İşaretle (Ready)
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleStatusChange('INVOICE_CANCELLED')}
                disabled={actionLoading}
                style={{ color: '#f87171' }}
              >
                <XCircle size={16} /> İptal Et
              </button>
            </>
          )}

          {(invoice.statusId === 'INVOICE_APPROVED' || invoice.statusId === 'INVOICE_READY') && (
            <>
              <button 
                className="btn-primary" 
                onClick={() => handleStatusChange('INVOICE_SENT')}
                disabled={actionLoading}
                style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
              >
                <FileText size={16} /> Gönderildi Yap (Sent)
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleStatusChange('INVOICE_PAID')}
                disabled={actionLoading}
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                <CheckCircle2 size={16} /> Ödendi Olarak Kapat (Paid)
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleStatusChange('INVOICE_CANCELLED')}
                disabled={actionLoading}
                style={{ color: '#f87171' }}
              >
                <XCircle size={16} /> İptal Et
              </button>
            </>
          )}

          {invoice.statusId === 'INVOICE_SENT' && (
            <>
              <button 
                className="btn-primary" 
                onClick={() => handleStatusChange('INVOICE_PAID')}
                disabled={actionLoading}
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                <CheckCircle2 size={16} /> Ödendi Olarak Kapat (Paid)
              </button>
              <button 
                className="btn-secondary" 
                onClick={() => handleStatusChange('INVOICE_CANCELLED')}
                disabled={actionLoading}
                style={{ color: '#f87171' }}
              >
                <XCircle size={16} /> İptal Et
              </button>
            </>
          )}

          {invoice.statusId === 'INVOICE_PAID' && (
            <span style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <CheckCircle2 size={18} /> Fatura tahsilatı tamamlandı ve kapandı.
            </span>
          )}

          {invoice.statusId === 'INVOICE_CANCELLED' && (
            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <XCircle size={18} /> Bu fatura iptal edilmiştir.
            </span>
          )}
        </div>
      </div>

      {/* Invoice Header Details */}
      <div className="glass-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={20} color="var(--primary)" /> Fatura Başlık Bilgileri
          </h3>
          {!isEditingHeader && isEditable && (
            <button className="btn-secondary" onClick={() => setIsEditingHeader(true)}>
              <Edit3 size={16} /> Başlığı Düzenle
            </button>
          )}
        </div>

        <form onSubmit={handleSaveHeader}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            
            {/* Parties Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gönderen Cari (Party From)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  <Building2 size={18} color="var(--primary)" /> {invoice.partyIdFrom}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Alıcı Cari (Party To)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  <User size={18} color="var(--primary)" /> {invoice.partyIdTo}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fatura Türü</span>
                <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>
                  <Tag size={16} style={{ display: 'inline', marginRight: '0.35rem' }} />
                  {invoice.invoiceTypeId.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            {/* Dates & Reference */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Fatura Tarihi</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="date" 
                      name="invoiceDate" 
                      value={headerForm.invoiceDate} 
                      onChange={(e) => setHeaderForm({ ...headerForm, invoiceDate: e.target.value })} 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
                      disabled={!isEditingHeader}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Vade Tarihi</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="date" 
                      name="dueDate" 
                      value={headerForm.dueDate} 
                      onChange={(e) => setHeaderForm({ ...headerForm, dueDate: e.target.value })} 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
                      disabled={!isEditingHeader}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Referans No (Belge No)</label>
                <input 
                  type="text" 
                  name="referenceNumber" 
                  value={headerForm.referenceNumber} 
                  onChange={(e) => setHeaderForm({ ...headerForm, referenceNumber: e.target.value })} 
                  className="glass-input" 
                  placeholder="Opsiyonel referans numarası"
                  disabled={!isEditingHeader}
                />
              </div>

              <div className="form-group">
                <label>Açıklama</label>
                <div style={{ position: 'relative' }}>
                  <AlignLeft size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                  <textarea 
                    name="description" 
                    value={headerForm.description} 
                    onChange={(e) => setHeaderForm({ ...headerForm, description: e.target.value })} 
                    className="glass-input" 
                    placeholder="Fatura açıklaması..."
                    style={{ paddingLeft: '2.5rem', width: '100%', minHeight: '70px', boxSizing: 'border-box' }}
                    disabled={!isEditingHeader}
                  />
                </div>
              </div>

              {isEditingHeader && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsEditingHeader(false)} className="btn-secondary">
                    İptal
                  </button>
                  <button type="submit" className="btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Save size={16} /> Değişiklikleri Kaydet
                  </button>
                </div>
              )}
            </div>

          </div>
        </form>
      </div>

      {/* Invoice Line Items Section */}
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem 0' }}>
        <div style={{ padding: '0 2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Fatura Kalemleri ({items.length})</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Faturaya dahil edilen ürün, hizmet ve masraflar</span>
          </div>
          {isEditable && !showAddItem && (
            <button 
              className="btn-primary" 
              onClick={() => setShowAddItem(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
            >
              <Plus size={16} /> Yeni Kalem Ekle
            </button>
          )}
        </div>

        {/* Add Item Inline Form */}
        {showAddItem && (
          <div style={{ margin: '0 2rem 1.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', color: 'var(--primary)' }}>Yeni Kalem Ekle</h4>
            <form onSubmit={handleAddItem}>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="form-group">
                  <label>Kalem Tipi</label>
                  <select 
                    value={itemForm.invoiceItemTypeId} 
                    onChange={(e) => setItemForm({ ...itemForm, invoiceItemTypeId: e.target.value })}
                    className="glass-input"
                  >
                    {itemTypes.length > 0 ? (
                      itemTypes.map(t => (
                        <option key={t.invoiceItemTypeId} value={t.invoiceItemTypeId}>{t.description}</option>
                      ))
                    ) : (
                      <>
                        <option value="INV_PROD_ITEM">Ürün Satışı (INV_PROD_ITEM)</option>
                        <option value="INV_FEE_ITEM">Hizmet / Masraf (INV_FEE_ITEM)</option>
                        <option value="ITM_SALES_TAX">Satış Vergisi / KDV (ITM_SALES_TAX)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>Açıklama / Ürün Adı</label>
                  <input 
                    type="text" 
                    value={itemForm.description} 
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                    placeholder="Örn: Danışmanlık Hizmeti"
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Miktar</label>
                  <input 
                    type="number" 
                    step="any"
                    value={itemForm.quantity} 
                    onChange={(e) => setItemForm({ ...itemForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Birim Fiyat ({invoice.currencyUomId})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={itemForm.amount} 
                    onChange={(e) => setItemForm({ ...itemForm, amount: parseFloat(e.target.value) || 0 })}
                    className="glass-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem' }}>
                <button type="button" onClick={() => setShowAddItem(false)} className="btn-secondary">
                  Vazgeç
                </button>
                <button type="submit" className="btn-primary" disabled={actionLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Plus size={16} /> Kalemi Kaydet
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table of items */}
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Sıra No</th>
                <th>Kalem Tipi</th>
                <th>Açıklama</th>
                <th style={{ textAlign: 'right' }}>Miktar</th>
                <th style={{ textAlign: 'right' }}>Birim Fiyat</th>
                <th style={{ textAlign: 'right' }}>Tutar</th>
                {isEditable && <th style={{ textAlign: 'center' }}>İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((it) => (
                  <tr key={it.invoiceItemSeqId}>
                    <td style={{ fontWeight: 600 }}>{it.invoiceItemSeqId}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{it.invoiceItemTypeId.replace('INV_', '').replace(/_/g, ' ')}</td>
                    <td>{it.description || '-'}</td>
                    <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right' }}>
                      {it.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {it.itemTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
                    </td>
                    {isEditable && (
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn-icon" 
                          onClick={() => handleDeleteItem(it.invoiceItemSeqId)}
                          disabled={actionLoading}
                          title="Kalemi Sil"
                          style={{ color: '#f87171' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isEditable ? 7 : 6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    Bu faturaya henüz bir kalem eklenmemiş.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Applied Payments & Status History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        
        {/* Applied Payments */}
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} color="var(--primary)" /> Eşleşen Ödemeler ({paymentsApplied.length})
          </h3>
          {paymentsApplied.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {paymentsApplied.map((pa) => (
                <div key={pa.paymentApplicationId} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div>
                    <div 
                      onClick={() => onViewPayment && onViewPayment(pa.paymentId)}
                      style={{ 
                        fontWeight: 600, 
                        color: onViewPayment ? 'var(--primary)' : 'white', 
                        cursor: onViewPayment ? 'pointer' : 'default',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}
                    >
                      Ödeme No: #{pa.paymentId}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Uygulama ID: {pa.paymentApplicationId}</div>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: '#4ade80' }}>
                    {pa.amountApplied.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currencyUomId}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Henüz bu fatura ile eşleştirilmiş bir ödeme kaydı bulunmuyor.
            </div>
          )}
        </div>

        {/* Status History Timeline */}
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} color="var(--primary)" /> Durum Değişiklik Geçmişi
          </h3>
          {statusHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {statusHistory.map((sh, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', borderBottom: idx < statusHistory.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatStatus(sh.statusId)}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {sh.statusDate} {sh.changeByUserLoginId ? `• ${sh.changeByUserLoginId}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Geçmiş durum kaydı bulunmuyor.
            </div>
          )}
        </div>

        {/* Faz 7: Notlar & Vade Şartları */}
        {invoice.invoiceId && (
          <InvoiceNotesAndTerms invoiceId={invoice.invoiceId} />
        )}

      </div>

    </div>
  );
};

export default InvoiceDetail;
