import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Edit3, Save, CheckCircle2, CreditCard, 
  User, Calendar, AlignLeft, Plus, Trash2, AlertCircle, Loader2, Link2, ExternalLink
} from 'lucide-react';
import { api, PaymentDetailResponse, OpenInvoiceItem, PaymentMetadataResponse } from '../services/api';

interface PaymentDetailProps {
  paymentId: string | null;
  onBack: () => void;
  onViewInvoice?: (invoiceId: string) => void;
}

const getPaymentStatusColor = (statusId: string) => {
  switch (statusId) {
    case 'PMNT_CONFIRMED': return 'rgba(168, 85, 247, 0.15)';
    case 'PMNT_RECEIVED': return 'rgba(34, 197, 94, 0.15)';
    case 'PMNT_SENT': return 'rgba(59, 130, 246, 0.15)';
    case 'PMNT_NOT_PAID': return 'rgba(234, 179, 8, 0.15)';
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return 'rgba(239, 68, 68, 0.15)';
    default: return 'var(--glass-border)';
  }
};

const getPaymentStatusTextColor = (statusId: string) => {
  switch (statusId) {
    case 'PMNT_CONFIRMED': return '#c084fc';
    case 'PMNT_RECEIVED': return '#4ade80';
    case 'PMNT_SENT': return '#60a5fa';
    case 'PMNT_NOT_PAID': return '#facc15';
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return '#f87171';
    default: return 'white';
  }
};

const formatStatus = (statusId: string) => {
  return (statusId || '').replace('PMNT_', '').replace(/_/g, ' ');
};

const PaymentDetail: React.FC<PaymentDetailProps> = ({ paymentId, onBack, onViewInvoice }) => {
  const [detail, setDetail] = useState<PaymentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Edit Header State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    paymentMethodTypeId: '',
    amount: 0,
    paymentRefNum: '',
    comments: '',
    effectiveDate: ''
  });

  // Modal State for Apply to Invoice
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<OpenInvoiceItem | null>(null);
  const [applyAmount, setApplyAmount] = useState<number>(0);

  // Metadata
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<PaymentMetadataResponse['metadata']['paymentMethodTypes']>([]);

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const loadPayment = useCallback(() => {
    if (!paymentId) return;
    setLoading(true);
    setError(null);
    api.getPaymentDetails(paymentId)
      .then(res => {
        setDetail(res);
        if (res.payment) {
          setEditForm({
            paymentMethodTypeId: res.payment.paymentMethodTypeId || '',
            amount: res.payment.amount || 0,
            paymentRefNum: res.payment.paymentRefNum || '',
            comments: res.payment.comments || '',
            effectiveDate: res.payment.effectiveDate ? res.payment.effectiveDate.substring(0, 10) : ''
          });
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Ödeme detayları alınamadı.');
        setLoading(false);
      });
  }, [paymentId]);

  useEffect(() => {
    loadPayment();
    api.getPaymentMetadata()
      .then(res => {
        if (res?.metadata?.paymentMethodTypes) {
          setPaymentMethodTypes(res.metadata.paymentMethodTypes);
        }
      })
      .catch(() => {});
  }, [loadPayment]);

  // Open apply modal
  const handleOpenApplyModal = () => {
    if (!paymentId) return;
    setShowApplyModal(true);
    setInvoicesLoading(true);
    setSelectedInvoice(null);
    setApplyAmount(0);

    api.getOpenInvoicesForPayment(paymentId)
      .then(res => {
        setOpenInvoices(res.openInvoices || []);
        setInvoicesLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Açık faturalar yüklenemedi.');
        setInvoicesLoading(false);
      });
  };

  const handleSelectInvoice = (inv: OpenInvoiceItem) => {
    setSelectedInvoice(inv);
    const maxPossible = Math.min(detail?.openAmount || 0, inv.outstandingAmount || 0);
    setApplyAmount(maxPossible > 0 ? maxPossible : 0);
  };

  const handleConfirmApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId || !selectedInvoice) return;
    if (applyAmount <= 0) {
      setError('Uygulanacak tutar sıfırdan büyük olmalıdır.');
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.createPaymentApplication({
        paymentId,
        invoiceId: selectedInvoice.invoiceId,
        amountApplied: applyAmount
      });
      flash(res._EVENT_MESSAGE_ || 'Ödeme faturaya başarıyla uygulandı.');
      setShowApplyModal(false);
      loadPayment();
    } catch (err: any) {
      setError(err.message || 'Ödeme faturaya uygulanamadı.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveApplication = async (appId: string) => {
    if (!confirm('Bu ödeme mahsubunu kaldırmak istediğinize emin misiniz?')) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.removePaymentApplication(appId);
      flash(res._EVENT_MESSAGE_ || 'Mahsup kaydı kaldırıldı.');
      loadPayment();
    } catch (err: any) {
      setError(err.message || 'Mahsup silinirken hata oluştu.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatusId: string) => {
    if (!paymentId) return;
    if (!confirm(`Ödeme durumunu "${formatStatus(newStatusId)}" olarak değiştirmek istiyor musunuz?`)) return;

    setActionLoading(true);
    setError(null);
    try {
      const res = await api.setPaymentStatus(paymentId, newStatusId);
      flash(res._EVENT_MESSAGE_ || `Durum güncellendi: ${formatStatus(newStatusId)}`);
      loadPayment();
    } catch (err: any) {
      setError(err.message || 'Durum değiştirilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId) return;

    setActionLoading(true);
    setError(null);
    try {
      await api.updatePayment({
        paymentId,
        amount: Number(editForm.amount),
        paymentMethodTypeId: editForm.paymentMethodTypeId,
        paymentRefNum: editForm.paymentRefNum,
        comments: editForm.comments,
        effectiveDate: editForm.effectiveDate
      });
      setIsEditing(false);
      flash('Ödeme bilgileri güncellendi.');
      loadPayment();
    } catch (err: any) {
      setError(err.message || 'Güncelleme başarısız oldu.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
        <div style={{ color: 'var(--text-muted)' }}>Ödeme detayları yükleniyor...</div>
      </div>
    );
  }

  if (!detail || !detail.payment) {
    return (
      <div>
        <button onClick={onBack} className="btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Geri Dön
        </button>
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: '#f87171' }}>
          Ödeme bulunamadı veya bir hata oluştu.
        </div>
      </div>
    );
  }

  const { payment, appliedAmount, openAmount, applications } = detail;
  const isIncoming = payment.paymentTypeId.includes('CUSTOMER') || payment.paymentTypeId.includes('RECEIPT');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Navigation & Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <button 
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          <ArrowLeft size={16} />
          Ödemeler Listesine Dön
        </button>

        {/* Status Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {payment.statusId === 'PMNT_NOT_PAID' && (
            <>
              <button
                onClick={() => handleStatusChange(isIncoming ? 'PMNT_RECEIVED' : 'PMNT_SENT')}
                disabled={actionLoading}
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#4ade80',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                {isIncoming ? 'Tahsil Edildi İşaretle' : 'Ödendi / Gönderildi İşaretle'}
              </button>
              <button
                onClick={() => handleStatusChange('PMNT_CANCELLED')}
                disabled={actionLoading}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                İptal Et
              </button>
            </>
          )}

          {(payment.statusId === 'PMNT_RECEIVED' || payment.statusId === 'PMNT_SENT') && (
            <>
              <button
                onClick={() => handleStatusChange('PMNT_CONFIRMED')}
                disabled={actionLoading}
                style={{
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.3)',
                  color: '#c084fc',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem'
                }}
              >
                Onayla (Confirm)
              </button>
              <button
                onClick={() => handleStatusChange('PMNT_CANCELLED')}
                disabled={actionLoading}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                İptal Et
              </button>
            </>
          )}

          {payment.statusId === 'PMNT_CONFIRMED' && (
            <button
              onClick={() => handleStatusChange('PMNT_VOID')}
              disabled={actionLoading}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Hükümsüz Kıl (Void)
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Cards & Financial Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ödeme Bilgisi
              </span>
              <h3 style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 700 }}>
                #{payment.paymentId}
              </h3>
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: getPaymentStatusColor(payment.statusId),
              color: getPaymentStatusTextColor(payment.statusId)
            }}>
              {payment.statusDesc || formatStatus(payment.statusId)}
            </span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Tür: <strong style={{ color: 'white' }}>{payment.paymentTypeDesc}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Toplam Tutar
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0' }}>
            ${payment.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>{payment.currencyUomId}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Ödeme Yöntemi: <strong style={{ color: 'white' }}>{payment.paymentMethodTypeDesc || payment.paymentMethodTypeId || '-'}</strong>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Faturalara Mahsup Edilen
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0', color: '#4ade80' }}>
            ${appliedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {applications.length} adet faturaya bağlandı
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Kalan Açık Tutar
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0', color: openAmount > 0 ? '#facc15' : '#4ade80' }}>
            ${openAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {openAmount > 0 ? 'Faturaya bağlanabilir bakiye' : 'Tamamı eşleşti'}
          </div>
        </div>
      </div>

      {/* Details Grid & Edit Section */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Ödeme Başlık Bilgileri</h4>
          {payment.statusId !== 'PMNT_CANCELLED' && payment.statusId !== 'PMNT_VOID' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'white',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              <Edit3 size={14} />
              {isEditing ? 'Düzenlemeyi Kapat' : 'Düzenle'}
            </button>
          )}
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveHeader}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Ödeme Yöntemi
                </label>
                <select
                  value={editForm.paymentMethodTypeId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, paymentMethodTypeId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'white'
                  }}
                >
                  {paymentMethodTypes.map(pm => (
                    <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>{pm.description || pm.paymentMethodTypeId}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Tutar
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={editForm.effectiveDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Referans / Dekont No
                </label>
                <input
                  type="text"
                  value={editForm.paymentRefNum}
                  onChange={(e) => setEditForm(prev => ({ ...prev, paymentRefNum: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    border: '1px solid var(--glass-border)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: 'white'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Açıklama / Notlar
              </label>
              <textarea
                rows={2}
                value={editForm.comments}
                onChange={(e) => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--glass-border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1.25rem'
                }}
              >
                <Save size={14} />
                Kaydet
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', fontSize: '0.875rem' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <User size={14} /> Gönderen (Borçlu)
              </div>
              <div style={{ fontWeight: 600, color: 'white' }}>{payment.partyNameFrom}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {payment.partyIdFrom}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <User size={14} /> Alan (Alacaklı)
              </div>
              <div style={{ fontWeight: 600, color: 'white' }}>{payment.partyNameTo}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {payment.partyIdTo}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <Calendar size={14} /> İşlem Tarihi
              </div>
              <div style={{ fontWeight: 600, color: 'white' }}>{payment.effectiveDate || '-'}</div>
            </div>

            <div>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <CreditCard size={14} /> Belge / Dekont No
              </div>
              <div style={{ fontWeight: 600, color: 'white' }}>{payment.paymentRefNum || '-'}</div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem' }}>
                <AlignLeft size={14} /> Açıklama
              </div>
              <div style={{ color: 'white' }}>{payment.comments || 'Belirtilmedi'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Applied Invoices Section (Fatura Mahsup Tablosu) */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link2 size={18} color="var(--primary)" />
              Uygulanan Faturalar (Mahsup Listesi)
            </h4>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Bu ödemenin düşüldüğü ve kapatıldığı faturalar
            </p>
          </div>

          {openAmount > 0 && payment.statusId !== 'PMNT_CANCELLED' && payment.statusId !== 'PMNT_VOID' && (
            <button
              onClick={handleOpenApplyModal}
              className="btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem'
              }}
            >
              <Plus size={16} />
              Faturaya Mahsup Et
            </button>
          )}
        </div>

        {applications.length === 0 ? (
          <div style={{ 
            padding: '2.5rem', 
            textAlign: 'center', 
            border: '1px dashed var(--glass-border)', 
            borderRadius: '12px',
            color: 'var(--text-muted)' 
          }}>
            Bu ödemeye henüz hiçbir fatura bağlanmamış.
            {openAmount > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <button onClick={handleOpenApplyModal} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                  Fatura Seç ve Eşleştir
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Eşleşme No</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fatura No</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fatura Tarihi</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Fatura Açıklaması</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Fatura Tutarı</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Uygulanan Tutar</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.paymentApplicationId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      #{app.paymentApplicationId}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      {app.invoiceId ? (
                        <span 
                          onClick={() => onViewInvoice && onViewInvoice(app.invoiceId!)}
                          style={{ color: 'var(--primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          #{app.invoiceId}
                          <ExternalLink size={12} />
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Cari Hesap ({app.billingAccountId || 'Diğer'})</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {app.invoiceDate ? app.invoiceDate.substring(0, 10) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {app.invoiceDescription || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      {app.invoiceTotal ? `$${app.invoiceTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                      ${app.amountApplied?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <button
                        onClick={() => handleRemoveApplication(app.paymentApplicationId)}
                        title="Mahsubu Kaldır"
                        disabled={actionLoading}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: 'none',
                          color: '#f87171',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Apply to Invoice */}
      {showApplyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem'
          }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 700 }}>
              Faturaya Ödeme Mahsup Et
            </h3>
            <p style={{ margin: '0 0 1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Bu ödemeden düşülecek açık bir fatura seçin. Kullanılabilir açık bakiye: <strong style={{ color: '#facc15' }}>${openAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
            </p>

            {invoicesLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 size={28} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 0.5rem' }} />
                <div style={{ color: 'var(--text-muted)' }}>Cariye ait açık faturalar taranıyor...</div>
              </div>
            ) : openInvoices.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Bu cariye ait henüz kapatılmamış / açık bir fatura bulunamadı.
              </div>
            ) : (
              <form onSubmit={handleConfirmApply}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    1. Fatura Seçiniz:
                  </label>
                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Seç</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Fatura No</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Tarih</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Toplam</th>
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Kalan Borç</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openInvoices.map(inv => (
                          <tr 
                            key={inv.invoiceId}
                            onClick={() => handleSelectInvoice(inv)}
                            style={{
                              borderTop: '1px solid var(--glass-border)',
                              background: selectedInvoice?.invoiceId === inv.invoiceId ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <td style={{ padding: '0.5rem 0.75rem' }}>
                              <input 
                                type="radio" 
                                checked={selectedInvoice?.invoiceId === inv.invoiceId} 
                                onChange={() => handleSelectInvoice(inv)} 
                              />
                            </td>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>#{inv.invoiceId}</td>
                            <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{inv.invoiceDate ? inv.invoiceDate.substring(0, 10) : '-'}</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>${inv.total.toFixed(2)}</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#facc15' }}>
                              ${inv.outstandingAmount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedInvoice && (
                  <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                      2. Uygulanacak Tutar ($):
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={Math.min(openAmount, selectedInvoice.outstandingAmount)}
                        value={applyAmount}
                        onChange={(e) => setApplyAmount(parseFloat(e.target.value) || 0)}
                        required
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--glass-border)',
                          background: 'rgba(15, 23, 42, 0.6)',
                          color: 'white',
                          fontSize: '1rem',
                          fontWeight: 600
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setApplyAmount(Math.min(openAmount, selectedInvoice.outstandingAmount))}
                        style={{
                          background: 'rgba(99, 102, 241, 0.1)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: 'var(--primary)',
                          padding: '0.6rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Tamamını Eşle
                      </button>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      Fatura Kalanı: ${selectedInvoice.outstandingAmount.toFixed(2)} | Ödeme Açık Bakiyesi: ${openAmount.toFixed(2)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedInvoice || applyAmount <= 0 || actionLoading}
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1.5rem'
                    }}
                  >
                    {actionLoading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                    Mahsubu Onayla
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentDetail;
