import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, ChevronRight, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { api, InvoiceListItem } from '../services/api';
import { useTranslation } from '../i18n';

const getStatusBadgeClass = (statusId: string): string => {
  switch (statusId) {
    case 'INVOICE_PAID':         return 'ds-badge ds-badge-green';
    case 'INVOICE_APPROVED':
    case 'INVOICE_SENT':         return 'ds-badge ds-badge-blue';
    case 'INVOICE_READY':        return 'ds-badge ds-badge-purple';
    case 'INVOICE_IN_PROCESS':   return 'ds-badge ds-badge-yellow';
    case 'INVOICE_CANCELLED':    return 'ds-badge ds-badge-red';
    default:                     return 'ds-badge ds-badge-slate';
  }
};

const getStatusIcon = (statusId: string) => {
  switch (statusId) {
    case 'INVOICE_PAID':         return <CheckCircle2 size={14} />;
    case 'INVOICE_IN_PROCESS':   return <Clock size={14} />;
    case 'INVOICE_CANCELLED':    return <XCircle size={14} />;
    default:                     return <FileText size={14} />;
  }
};

const getStatusLabel = (statusId: string, locale: string): string => {
  if (locale === 'tr') {
    switch (statusId) {
      case 'INVOICE_PAID': return 'Ödendi';
      case 'INVOICE_APPROVED': return 'Onaylandı';
      case 'INVOICE_SENT': return 'Gönderildi';
      case 'INVOICE_READY': return 'Hazır';
      case 'INVOICE_IN_PROCESS': return 'Hazırlanıyor';
      case 'INVOICE_CANCELLED': return 'İptal Edildi';
      default: return (statusId || '').replace('INVOICE_', '').replace(/_/g, ' ');
    }
  } else {
    switch (statusId) {
      case 'INVOICE_PAID': return 'Paid';
      case 'INVOICE_APPROVED': return 'Approved';
      case 'INVOICE_SENT': return 'Sent';
      case 'INVOICE_READY': return 'Ready';
      case 'INVOICE_IN_PROCESS': return 'In Process';
      case 'INVOICE_CANCELLED': return 'Cancelled';
      default: return (statusId || '').replace('INVOICE_', '').replace(/_/g, ' ');
    }
  }
};

interface InvoiceListProps {
  onViewInvoice?: (invoiceId: string) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onViewInvoice }) => {
  const { translations, locale } = useTranslation();
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
    <div className="space-y-5">

      {/* Error Alert */}
      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={20} />
          <div>
            <strong>Hata:</strong> {error}
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="ds-card p-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-5">
          <Filter size={20} className="text-indigo-400" />
          <h3 className="text-white text-lg font-semibold m-0">{translations.common.filter}</h3>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <label className="ds-label">{translations.invoices.invoiceId}</label>
              <input
                type="text"
                name="invoiceId"
                value={filters.invoiceId}
                onChange={handleFilterChange}
                placeholder="Örn: 8010"
                className="ds-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">{translations.invoices.type}</label>
              <select
                name="invoiceTypeId"
                value={filters.invoiceTypeId}
                onChange={handleFilterChange}
                className="ds-select"
              >
                <option value="">{translations.invoices.allTypes}</option>
                {invoiceTypes.length > 0 ? (
                  invoiceTypes.map(t => (
                    <option key={t.invoiceTypeId} value={t.invoiceTypeId}>{t.description}</option>
                  ))
                ) : (
                  <>
                    <option value="SALES_INVOICE">{translations.invoices.salesInvoice}</option>
                    <option value="PURCHASE_INVOICE">{translations.invoices.purchaseInvoice}</option>
                  </>
                )}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">{translations.invoices.partyFrom}</label>
              <input
                type="text"
                name="partyIdFrom"
                value={filters.partyIdFrom}
                onChange={handleFilterChange}
                placeholder="Company"
                className="ds-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">{translations.invoices.partyTo}</label>
              <input
                type="text"
                name="partyIdTo"
                value={filters.partyIdTo}
                onChange={handleFilterChange}
                placeholder="DemoCustomer"
                className="ds-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">{translations.invoices.status}</label>
              <select
                name="statusId"
                value={filters.statusId}
                onChange={handleFilterChange}
                className="ds-select"
              >
                <option value="">{translations.invoices.allStatuses}</option>
                {statusList.length > 0 ? (
                  statusList.map(s => (
                    <option key={s.statusId} value={s.statusId}>{s.description}</option>
                  ))
                ) : (
                  <>
                    <option value="INVOICE_IN_PROCESS">{translations.invoices.statusInProcess}</option>
                    <option value="INVOICE_APPROVED">{translations.invoices.statusApproved}</option>
                    <option value="INVOICE_READY">{translations.invoices.statusReady}</option>
                    <option value="INVOICE_PAID">{translations.invoices.statusPaid}</option>
                    <option value="INVOICE_CANCELLED">{translations.invoices.statusCancelled}</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-1">
            <button type="button" onClick={handleReset} className="ds-btn-secondary" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> {locale === 'tr' ? 'Sıfırla' : 'Reset'}
            </button>
            <button type="submit" className="ds-btn-primary flex items-center gap-2" disabled={loading}>
              <Search size={18} /> {translations.common.filter}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="ds-card overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-white text-lg font-semibold m-0">
            {locale === 'tr' ? `Kayıtlar (${invoices.length} / Toplam: ${totalCount})` : `Records (${invoices.length} / Total: ${totalCount})`}
          </h3>
          <button
            className="ds-btn-secondary text-sm py-1.5 px-3"
            onClick={() => loadInvoices(filters)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translations.common.refresh}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">{translations.invoices.invoiceId}</th>
                <th className="ds-th">{translations.invoices.type}</th>
                <th className="ds-th">{translations.invoices.invoiceDate}</th>
                <th className="ds-th">{translations.invoices.partyFrom}</th>
                <th className="ds-th">{translations.invoices.partyTo}</th>
                <th className="ds-th">{translations.invoices.status}</th>
                <th className="ds-th-right">{translations.invoices.totalAmount}</th>
                <th className="ds-th-right">{translations.invoices.outstandingAmount}</th>
                <th className="ds-th"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex items-center justify-center py-20">
                      <div className="ds-spinner"></div>
                    </div>
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="ds-tbody-row">
                    <td className="ds-td-primary">{inv.invoiceId}</td>
                    <td className="ds-td">{(inv.invoiceTypeId || '').replace(/_/g, ' ')}</td>
                    <td className="ds-td-muted">{inv.invoiceDate || '-'}</td>
                    <td className="ds-td">{inv.partyIdFrom || '-'}</td>
                    <td className="ds-td">{inv.partyIdTo || '-'}</td>
                    <td className="ds-td">
                      <span className={getStatusBadgeClass(inv.statusId)}>
                        {getStatusIcon(inv.statusId)}
                        {getStatusLabel(inv.statusId, locale)}
                      </span>
                    </td>
                    <td className="ds-td-mono ds-td-right">
                      {inv.total.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td className={`ds-td-mono ds-td-right ${inv.outstandingAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {inv.outstandingAmount.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td className="ds-td text-center">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                        onClick={() => onViewInvoice && onViewInvoice(inv.invoiceId)}
                        title={translations.common.details}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className="ds-empty">
                      <FileText size={40} className="mx-auto mb-3 text-slate-600" />
                      <p className="text-slate-400">{translations.common.noData}</p>
                    </div>
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
