import React, { useState } from 'react';
import { Save, X, Building2, User, FileText, Calendar, AlignLeft } from 'lucide-react';

interface CreateInvoiceProps {
  onCancel: () => void;
  onSave: () => void;
}

const CreateInvoice: React.FC<CreateInvoiceProps> = ({ onCancel, onSave }) => {
  const [formData, setFormData] = useState({
    partyIdFrom: '',
    partyIdTo: '',
    invoiceType: 'SALES_INVOICE',
    invoiceDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call to create invoice
    console.log('Creating invoice:', formData);
    // Return to list after saving
    onSave();
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit}>
        
        <div style={{ display: 'grid', gap: '2rem' }}>
          
          {/* Parties Section */}
          <div>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building2 size={20} color="var(--primary)" /> Party Information
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Organization (From Party)</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="partyIdFrom" 
                    value={formData.partyIdFrom} 
                    onChange={handleChange} 
                    placeholder="e.g. Company" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                    required 
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Party To (To Party)</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="partyIdTo" 
                    value={formData.partyIdTo} 
                    onChange={handleChange} 
                    placeholder="e.g. Acme Corp" 
                    className="glass-input" 
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                    required 
                  />
                </div>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)' }} />

          {/* Invoice Details Section */}
          <div>
            <h3 style={{ margin: '0 0 1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="var(--primary)" /> Invoice Details
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Invoice Type</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <select 
                    name="invoiceType" 
                    value={formData.invoiceType} 
                    onChange={handleChange} 
                    className="glass-input"
                    style={{ paddingLeft: '2.5rem', width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="SALES_INVOICE">Sales Invoice</option>
                    <option value="PURCHASE_INVOICE">Purchase Invoice</option>
                  </select>
                </div>
              </div>
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
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <label>Description</label>
              <div style={{ position: 'relative' }}>
                <AlignLeft size={16} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-muted)' }} />
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Optional invoice description or notes..." 
                  className="glass-input" 
                  style={{ paddingLeft: '2.5rem', width: '100%', minHeight: '100px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>
          
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '3rem' }}>
          <button type="button" onClick={onCancel} className="btn-secondary">
            <X size={18} /> Cancel
          </button>
          <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Save size={18} /> Create Invoice
          </button>
        </div>
        
      </form>
    </div>
  );
};

export default CreateInvoice;
