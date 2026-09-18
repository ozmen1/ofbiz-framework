import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, ChevronRight, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { api, InvoiceListItem } from '../services/api';

const getStatusColor = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return 'rgba(34, 197, 94, 0.15)'; // Green
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return 'rgba(59, 130, 246, 0.15)'; // Blue
    case 'INVOICE_READY': return 'rgba(168, 85, 247, 0.15)'; // Purple
    case 'INVOICE_IN_PROCESS': return 'rgba(234, 179, 8, 0.15)'; // Yellow
    case 'INVOICE_CANCELLED': return 'rgba(239, 68, 68, 0.15)'; // Red
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
    case 'INVOICE_PAID': return <CheckCircle2 size={14} />;
    case 'INVOICE_IN_PROCESS': return <Clock size={14} />;
    case 'INVOICE_CANCELLED': return <XCircle size={14} />;
    default: return <FileText size={14} />;
  }
};

const formatStatus = (statusId: string) => {
  return (statusId || '').replace('INVOICE_', '').replace(/_/g, ' ');
};

interface InvoiceListProps {
  onViewInvoice?: (invoiceId: string) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onViewInvoice }) => {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    invoiceId: '',
    invoiceTypeId: '',
    partyIdFrom: '',
    partyIdTo: '',
    statusId: ''
  });

  // Metadata dropdowns
  const [invoiceTypes, setInvoiceTypes] = useState<{ invoiceTypeId: string; description: string }[]>([]);
  const [statusList, setStatusList] = useState<{ statusId: string; description: string }[]>([]);

  // Fetch metadata once on mount
  useEffect(() => {
    api.getInvoiceMetadata()
      .then(res => {
        if (res?.metadata) {
          setInvoiceTypes(res.metadata.invoiceTypes || []);
          setStatusList(res.metadata.statusList || []);
        }
      })
      .catch(err => console.warn('Could not load metadata:', err));
  }, []);

  // Fetch invoices function
  const loadInvoices = useCallback((currentFilters = filters) => {
    setLoading(true);
    setError(null);
    api.getInvoices(currentFilters)
      .then(res => {
        setInvoices(res.invoices || []);
        setTotalCount(res.totalCount || (res.invoices ? res.invoices.length : 0));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Faturalar yüklenirken bir hata oluştu.');
        setLoading(false);
      });
  }, [filters]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices(filters);
  };

  const handleReset = () => {
    const emptyFilters = { invoiceId: '', invoiceTypeId: '', partyIdFrom: '', partyIdTo: '', statusId: '' };
    setFilters(emptyFilters);
    loadInvoices(emptyFilters);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Error Alert */}
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
          <div>
            <strong>Hata:</strong> {error}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Filter size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Faturaları Ara & Filtrele</h3>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Fatura No (ID)</label>
              <input 
                type="text" 
                name="invoiceId" 
                value={filters.invoiceId} 
                onChange={handleFilterChange} 
                placeholder="Örn: 8010 veya CI1" 
                className="glass-input" 
              />
            </div>
            <div className="form-group">
              <label>Fatura Türü</label>
              <select 
                name="invoiceTypeId" 
                value={filters.invoiceTypeId} 
                onChange={handleFilterChange} 
                className="glass-input"
              >
                <option value="">Tüm Türler</option>
                {invoiceTypes.length > 0 ? (
                  invoiceTypes.map(t => (
                    <option key={t.invoiceTypeId} value={t.invoiceTypeId}>{t.description}</option>
                  ))
                ) : (
                  <>
                    <option value="SALES_INVOICE">Satış Faturası (Sales Invoice)</option>
                    <option value="PURCHASE_INVOICE">Alış Faturası (Purchase Invoice)</option>
                  </>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Gönderen Cari (From Party)</label>
              <input 
                type="text" 
                name="partyIdFrom" 
                value={filters.partyIdFrom} 
                onChange={handleFilterChange} 
                placeholder="Örn: Company" 
                className="glass-input" 
              />
            </div>
            <div className="form-group">
              <label>Alıcı Cari (To Party)</label>
              <input 
                type="text" 
                name="partyIdTo" 
                value={filters.partyIdTo} 
                onChange={handleFilterChange} 
                placeholder="Örn: DemoCustomer" 
                className="glass-input" 
              />
            </div>
            <div className="form-group">
              <label>Fatura Durumu</label>
              <select 
                name="statusId" 
                value={filters.statusId} 
                onChange={handleFilterChange} 
                className="glass-input"
              >
                <option value="">Tüm Durumlar</option>
                {statusList.length > 0 ? (
                  statusList.map(s => (
                    <option key={s.statusId} value={s.statusId}>{s.description}</option>
                  ))
                ) : (
                  <>
                    <option value="INVOICE_IN_PROCESS">In Process</option>
                    <option value="INVOICE_APPROVED">Approved</option>
                    <option value="INVOICE_READY">Ready</option>
                    <option value="INVOICE_SENT">Sent</option>
                    <option value="INVOICE_PAID">Paid</option>
                    <option value="INVOICE_CANCELLED">Cancelled</option>
                  </>
                )}
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={handleReset} className="btn-secondary" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sıfırla
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} /> Filtrele
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem 0', animationDelay: '0.1s' }}>
        <div style={{ padding: '0 2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            Kayıtlar ({invoices.length} / Toplam: {totalCount})
          </h3>
          <button 
            className="btn-secondary" 
            onClick={() => loadInvoices(filters)} 
            disabled={loading}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Tür</th>
                <th>Tarih</th>
                <th>Gönderen</th>
                <th>Alıcı</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>Toplam Tutar</th>
                <th style={{ textAlign: 'right' }}>Kalan Bakiye</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 size={24} className="animate-spin" color="var(--primary)" />
                      <span>OFBiz'den faturalar yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.invoiceId}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceId}</td>
                    <td>{(inv.invoiceTypeId || '').replace(/_/g, ' ')}</td>
                    <td>{inv.invoiceDate || '-'}</td>
                    <td>{inv.partyIdFrom || '-'}</td>
                    <td>{inv.partyIdTo || '-'}</td>
                    <td>
                      <span className="status-badge" style={{ 
                        background: getStatusColor(inv.statusId),
                        color: getStatusTextColor(inv.statusId),
                        border: `1px solid ${getStatusTextColor(inv.statusId)}40`
                      }}>
                        {getStatusIcon(inv.statusId)}
                        {formatStatus(inv.statusId)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {inv.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td style={{ textAlign: 'right', color: inv.outstandingAmount > 0 ? '#facc15' : 'var(--text-muted)' }}>
                      {inv.outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="btn-icon" 
                        onClick={() => onViewInvoice && onViewInvoice(inv.invoiceId)}
                        title="Fatura Detayını Gör"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Kriterlere uygun fatura bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default InvoiceList;
