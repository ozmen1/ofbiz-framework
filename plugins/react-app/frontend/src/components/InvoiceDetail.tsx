import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Edit3, CheckCircle2, Clock, XCircle, FileText, Building2, User, Calendar, AlignLeft } from 'lucide-react';

interface InvoiceDetailProps {
  invoiceId: string | null;
  onBack: () => void;
}

// Re-using mock data structure for demo purposes
const mockInvoiceDetails: Record<string, any> = {
  'INV-10045': { invoiceId: 'INV-10045', invoiceType: 'SALES_INVOICE', partyIdFrom: 'Company', partyIdTo: 'Acme Corp', invoiceDate: '2026-05-01', dueDate: '2026-05-31', statusId: 'INVOICE_PAID', description: 'Monthly subscription services', total: 1250.00, currency: 'USD' },
  'INV-10046': { invoiceId: 'INV-10046', invoiceType: 'SALES_INVOICE', partyIdFrom: 'Company', partyIdTo: 'Globex', invoiceDate: '2026-05-02', dueDate: '2026-06-02', statusId: 'INVOICE_APPROVED', description: 'Consulting fees', total: 3400.50, currency: 'USD' },
  'INV-10047': { invoiceId: 'INV-10047', invoiceType: 'PURCHASE_INVOICE', partyIdFrom: 'Supplier Inc', partyIdTo: 'Company', invoiceDate: '2026-05-03', dueDate: '2026-06-03', statusId: 'INVOICE_IN_PROCESS', description: 'Office supplies', total: 850.00, currency: 'USD' },
};

const getStatusColor = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID': return 'rgba(34, 197, 94, 0.15)';
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT': return 'rgba(59, 130, 246, 0.15)';
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
  return statusId.replace('INVOICE_', '').replace('_', ' ');
};

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoiceId, onBack }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    // Simulate fetching data
    if (invoiceId && mockInvoiceDetails[invoiceId]) {
      setFormData(mockInvoiceDetails[invoiceId]);
    } else {
      // Fallback for new/unknown mock invoices
      setFormData({
        invoiceId: invoiceId || 'UNKNOWN',
        invoiceType: 'SALES_INVOICE',
        partyIdFrom: 'Unknown',
        partyIdTo: 'Unknown',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        statusId: 'INVOICE_IN_PROCESS',
        description: '',
        total: 0,
        currency: 'USD'
      });
    }
  }, [invoiceId]);

  if (!formData) return <div>Loading...</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saving invoice header updates:', formData);
    setIsEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-secondary" onClick={onBack} style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={18} /> Back to Invoices
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="status-badge" style={{ 
            background: getStatusColor(formData.statusId),
            color: getStatusTextColor(formData.statusId),
            border: `1px solid ${getStatusTextColor(formData.statusId)}40`,
            fontSize: '0.875rem',
            padding: '0.5rem 1rem'
          }}>
            {getStatusIcon(formData.statusId)}
            {formatStatus(formData.statusId)}
          </span>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{formData.invoiceId}</h2>
        </div>
      </div>

      {/* Invoice Header Component */}
      <div className="glass-card animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={20} color="var(--primary)" /> Invoice Header
          </h3>
          {!isEditing ? (
            <button className="btn-secondary" onClick={() => setIsEditing(true)}>
              <Edit3 size={18} /> Edit Header
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            
            {/* Read-only Information */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>From Organization</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  <Building2 size={18} color="var(--primary)" /> {formData.partyIdFrom}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>To Party</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                  <User size={18} color="var(--primary)" /> {formData.partyIdTo}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Type</span>
                <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{formData.invoiceType.replace('_', ' ')}</div>
              </div>
            </div>

            {/* Editable Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Invoice Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="date" 
                      name="invoiceDate" 
                      value={formData.invoiceDate} 
                      onChange={handleChange} 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <div style={{ position: 'relative' }}>
                    <Calendar size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="date" 
                      name="dueDate" 
                      value={formData.dueDate || ''} 
                      onChange={handleChange} 
                      className="glass-input" 
                      style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box', colorScheme: 'dark' }}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select 
                    name="statusId" 
                    value={formData.statusId} 
                    onChange={handleChange} 
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                    disabled={!isEditing}
                  >
                    <option value="INVOICE_IN_PROCESS">In Process</option>
                    <option value="INVOICE_APPROVED">Approved</option>
                    <option value="INVOICE_SENT">Sent</option>
                    <option value="INVOICE_PAID">Paid</option>
                    <option value="INVOICE_CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <div style={{ position: 'relative' }}>
                  <AlignLeft size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                  <textarea 
                    name="description" 
                    value={formData.description || ''} 
                    onChange={handleChange} 
                    placeholder="Invoice description or notes..." 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' }}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </div>

          {isEditing && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
              <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary">
                <XCircle size={18} /> Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={18} /> Save Changes
              </button>
            </div>
          )}
        </form>
      </div>

    </div>
  );
};

export default InvoiceDetail;
