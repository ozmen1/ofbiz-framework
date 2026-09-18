import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, ChevronRight, CreditCard, CheckCircle2, 
  Clock, XCircle, AlertCircle, Loader2, ArrowDownLeft, ArrowUpRight, Plus, Filter 
} from 'lucide-react';
import { api, PaymentListItem } from '../services/api';

const getPaymentStatusColor = (statusId: string) => {
  switch (statusId) {
    case 'PMNT_CONFIRMED': return 'rgba(168, 85, 247, 0.15)'; // Purple
    case 'PMNT_RECEIVED': return 'rgba(34, 197, 94, 0.15)'; // Green
    case 'PMNT_SENT': return 'rgba(59, 130, 246, 0.15)'; // Blue
    case 'PMNT_NOT_PAID': return 'rgba(234, 179, 8, 0.15)'; // Yellow
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return 'rgba(239, 68, 68, 0.15)'; // Red
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

const getPaymentStatusIcon = (statusId: string) => {
  switch (statusId) {
    case 'PMNT_CONFIRMED':
    case 'PMNT_RECEIVED': return <CheckCircle2 size={14} />;
    case 'PMNT_NOT_PAID': return <Clock size={14} />;
    case 'PMNT_CANCELLED':
    case 'PMNT_VOID': return <XCircle size={14} />;
    default: return <CreditCard size={14} />;
  }
};

const formatStatus = (statusId: string) => {
  return (statusId || '').replace('PMNT_', '').replace(/_/g, ' ');
};

interface PaymentListProps {
  onViewPayment: (paymentId: string) => void;
  onCreatePayment: () => void;
}

const PaymentList: React.FC<PaymentListProps> = ({ onViewPayment, onCreatePayment }) => {
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    paymentTypeId: '',
    paymentMethodTypeId: '',
    statusId: ''
  });

  // Metadata
  const [paymentTypes, setPaymentTypes] = useState<{ paymentTypeId: string; description: string }[]>([]);
  const [paymentMethodTypes, setPaymentMethodTypes] = useState<{ paymentMethodTypeId: string; description: string }[]>([]);
  const [statusList, setStatusList] = useState<{ statusId: string; description: string }[]>([]);

  // Load Metadata
  useEffect(() => {
    api.getPaymentMetadata()
      .then(res => {
        if (res?.metadata) {
          setPaymentTypes(res.metadata.paymentTypes || []);
          setPaymentMethodTypes(res.metadata.paymentMethodTypes || []);
          setStatusList(res.metadata.statusList || []);
        }
      })
      .catch(err => console.warn('Could not load payment metadata:', err));
  }, []);

  // Fetch payments
  const loadPayments = useCallback((currentFilters = filters) => {
    setLoading(true);
    setError(null);
    api.getPayments(currentFilters)
      .then(data => {
        setPayments(data.payments || []);
        setTotalCount(data.totalCount || 0);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Ödemeler yüklenirken hata oluştu.');
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    const handler = setTimeout(() => {
      loadPayments(filters);
    }, 300);
    return () => clearTimeout(handler);
  }, [filters, loadPayments]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    const reset = {
      search: '',
      paymentTypeId: '',
      paymentMethodTypeId: '',
      statusId: ''
    };
    setFilters(reset);
    loadPayments(reset);
  };

  // Metrics
  const totalReceived = payments
    .filter(p => p.statusId === 'PMNT_RECEIVED' || p.paymentTypeId === 'CUSTOMER_PAYMENT')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalSent = payments
    .filter(p => p.statusId === 'PMNT_SENT' || p.paymentTypeId === 'VENDOR_PAYMENT')
    .reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalOpen = payments
    .reduce((acc, p) => acc + (p.openAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Action Bar & Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Kayıtlı Ödemeler</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{totalCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Tüm tahsilat ve tediyeler</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Müşteri Tahsilatları</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
              <ArrowDownLeft size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#4ade80' }}>
            ${totalReceived.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Alınan ödemeler toplamı</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Tedarikçi Ödemeleri</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#60a5fa' }}>
            ${totalSent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Yapılan ödemeler toplamı</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Eşleşmemiş (Açık) Bakiye</span>
            <div style={{ padding: '0.4rem', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.1)', color: '#facc15' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#facc15' }}>
            ${totalOpen.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Faturaya bağlanmamış tutar</div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Filtreler & Arama</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={() => loadPayments(filters)} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Yenile
            </button>
            <button 
              onClick={onCreatePayment} 
              className="btn-primary" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem'
              }}
            >
              <Plus size={16} />
              Yeni Ödeme
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              name="search" 
              placeholder="Ödeme No, Cari, Açıklama..." 
              value={filters.search} 
              onChange={handleFilterChange}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Payment Type */}
          <select 
            name="paymentTypeId" 
            value={filters.paymentTypeId} 
            onChange={handleFilterChange}
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Tüm Ödeme Türleri</option>
            {paymentTypes.map(t => (
              <option key={t.paymentTypeId} value={t.paymentTypeId}>{t.description || t.paymentTypeId}</option>
            ))}
          </select>

          {/* Payment Method */}
          <select 
            name="paymentMethodTypeId" 
            value={filters.paymentMethodTypeId} 
            onChange={handleFilterChange}
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Tüm Ödeme Yöntemleri</option>
            {paymentMethodTypes.map(pm => (
              <option key={pm.paymentMethodTypeId} value={pm.paymentMethodTypeId}>{pm.description || pm.paymentMethodTypeId}</option>
            ))}
          </select>

          {/* Status */}
          <select 
            name="statusId" 
            value={filters.statusId} 
            onChange={handleFilterChange}
            style={{
              padding: '0.6rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--glass-border)',
              background: 'rgba(15, 23, 42, 0.6)',
              color: 'white',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Tüm Durumlar</option>
            {statusList.map(s => (
              <option key={s.statusId} value={s.statusId}>{s.description || s.statusId}</option>
            ))}
          </select>

          {(filters.search || filters.paymentTypeId || filters.paymentMethodTypeId || filters.statusId) && (
            <button 
              onClick={handleResetFilters}
              style={{
                background: 'transparent',
                border: '1px dashed var(--glass-border)',
                color: 'var(--text-muted)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
                padding: '0.6rem'
              }}
            >
              Filtreleri Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
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

      {/* Payments Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255, 255, 255, 0.02)' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Ödeme No</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tür</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gönderen (Borçlu)</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alan (Alacaklı)</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Yöntem</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tarih</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Toplam Tutar</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Mahsup / Açık</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Durum</th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader2 size={28} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 0.5rem' }} />
                    <div style={{ color: 'var(--text-muted)' }}>Ödemeler yükleniyor...</div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Filtreye uygun ödeme bulunamadı.
                  </td>
                </tr>
              ) : (
                payments.map(p => {
                  const isIncoming = p.paymentTypeId.includes('CUSTOMER') || p.paymentTypeId.includes('RECEIPT');
                  return (
                    <tr 
                      key={p.paymentId} 
                      onClick={() => onViewPayment(p.paymentId)}
                      style={{ 
                        borderBottom: '1px solid var(--glass-border)',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: isIncoming ? '#4ade80' : '#60a5fa' 
                          }} />
                          #{p.paymentId}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 500 }}>{p.paymentTypeDesc}</div>
                        {p.paymentRefNum && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ref: {p.paymentRefNum}</div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 500 }}>{p.partyNameFrom || p.partyIdFrom}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.partyIdFrom}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 500 }}>{p.partyNameTo || p.partyIdTo}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.partyIdTo}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                        {p.paymentMethodTypeDesc || p.paymentMethodTypeId || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {p.effectiveDate ? p.effectiveDate.substring(0, 10) : '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                        ${p.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{p.currencyUomId}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ color: p.openAmount === 0 ? '#4ade80' : '#facc15', fontWeight: 600 }}>
                          ${p.appliedAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {p.openAmount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Açık: ${p.openAmount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: getPaymentStatusColor(p.statusId),
                          color: getPaymentStatusTextColor(p.statusId)
                        }}>
                          {getPaymentStatusIcon(p.statusId)}
                          {p.statusDesc || formatStatus(p.statusId)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentList;
