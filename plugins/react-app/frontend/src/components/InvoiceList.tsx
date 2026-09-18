import React, { useState } from 'react';
import { Search, Filter, RefreshCw, ChevronRight, FileText, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Invoice {
  invoiceId: string;
  invoiceType: string;
  partyIdFrom: string;
  partyIdTo: string;
  invoiceDate: string;
  statusId: string;
  total: number;
  currency: string;
}

const mockInvoices: Invoice[] = [
  { invoiceId: 'INV-10045', invoiceType: 'SALES_INVOICE', partyIdFrom: 'Company', partyIdTo: 'Acme Corp', invoiceDate: '2026-05-01', statusId: 'INVOICE_PAID', total: 1250.00, currency: 'USD' },
  { invoiceId: 'INV-10046', invoiceType: 'SALES_INVOICE', partyIdFrom: 'Company', partyIdTo: 'Globex', invoiceDate: '2026-05-02', statusId: 'INVOICE_APPROVED', total: 3400.50, currency: 'USD' },
  { invoiceId: 'INV-10047', invoiceType: 'PURCHASE_INVOICE', partyIdFrom: 'Supplier Inc', partyIdTo: 'Company', invoiceDate: '2026-05-03', statusId: 'INVOICE_IN_PROCESS', total: 850.00, currency: 'USD' },
  { invoiceId: 'INV-10048', invoiceType: 'SALES_INVOICE', partyIdFrom: 'Company', partyIdTo: 'Stark Ind', invoiceDate: '2026-05-04', statusId: 'INVOICE_CANCELLED', total: 5000.00, currency: 'USD' },
  { invoiceId: 'INV-10049', invoiceType: 'SALES_INVOICE', partyIdFrom: 'Company', partyIdTo: 'Wayne Ent', invoiceDate: '2026-05-05', statusId: 'INVOICE_SENT', total: 2100.00, currency: 'USD' },
];

const getStatusColor = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return 'rgba(34, 197, 94, 0.15)'; // Green
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return 'rgba(59, 130, 246, 0.15)'; // Blue
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
  return statusId.replace('INVOICE_', '').replace('_', ' ');
};

interface InvoiceListProps {
  onViewInvoice?: (invoiceId: string) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onViewInvoice }) => {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [filters, setFilters] = useState({
    invoiceId: '',
    invoiceType: '',
    partyIdFrom: '',
    partyIdTo: '',
    statusId: ''
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate filtering
    let filtered = mockInvoices;
    if (filters.invoiceId) filtered = filtered.filter(i => i.invoiceId.toLowerCase().includes(filters.invoiceId.toLowerCase()));
    if (filters.invoiceType) filtered = filtered.filter(i => i.invoiceType === filters.invoiceType);
    if (filters.partyIdFrom) filtered = filtered.filter(i => i.partyIdFrom.toLowerCase().includes(filters.partyIdFrom.toLowerCase()));
    if (filters.partyIdTo) filtered = filtered.filter(i => i.partyIdTo.toLowerCase().includes(filters.partyIdTo.toLowerCase()));
    if (filters.statusId) filtered = filtered.filter(i => i.statusId === filters.statusId);
    
    setInvoices(filtered);
  };

  const handleReset = () => {
    setFilters({ invoiceId: '', invoiceType: '', partyIdFrom: '', partyIdTo: '', statusId: '' });
    setInvoices(mockInvoices);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Filters Section */}
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Filter size={20} color="var(--primary)" />
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Find Invoices</h3>
        </div>
        
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Invoice ID</label>
              <input type="text" name="invoiceId" value={filters.invoiceId} onChange={handleFilterChange} placeholder="e.g. INV-10045" className="glass-input" />
            </div>
            <div className="form-group">
              <label>Invoice Type</label>
              <select name="invoiceType" value={filters.invoiceType} onChange={handleFilterChange} className="glass-input">
                <option value="">All Types</option>
                <option value="SALES_INVOICE">Sales Invoice</option>
                <option value="PURCHASE_INVOICE">Purchase Invoice</option>
              </select>
            </div>
            <div className="form-group">
              <label>From Party</label>
              <input type="text" name="partyIdFrom" value={filters.partyIdFrom} onChange={handleFilterChange} placeholder="Sender" className="glass-input" />
            </div>
            <div className="form-group">
              <label>To Party</label>
              <input type="text" name="partyIdTo" value={filters.partyIdTo} onChange={handleFilterChange} placeholder="Receiver" className="glass-input" />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select name="statusId" value={filters.statusId} onChange={handleFilterChange} className="glass-input">
                <option value="">All Statuses</option>
                <option value="INVOICE_IN_PROCESS">In Process</option>
                <option value="INVOICE_APPROVED">Approved</option>
                <option value="INVOICE_SENT">Sent</option>
                <option value="INVOICE_PAID">Paid</option>
                <option value="INVOICE_CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={handleReset} className="btn-secondary">
              <RefreshCw size={18} /> Reset
            </button>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} /> Search
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="glass-card animate-fade-in" style={{ padding: '1.5rem 0', animationDelay: '0.1s' }}>
        <div style={{ padding: '0 2rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Results ({invoices.length})</h3>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="glass-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Type</th>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.invoiceId}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceId}</td>
                    <td>{inv.invoiceType.replace('_', ' ')}</td>
                    <td>{inv.invoiceDate}</td>
                    <td>{inv.partyIdFrom}</td>
                    <td>{inv.partyIdTo}</td>
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
                      ${inv.total.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-icon" onClick={() => onViewInvoice && onViewInvoice(inv.invoiceId)}>
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No invoices found matching your criteria.
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
