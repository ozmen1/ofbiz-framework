import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, ChevronRight, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { api, InvoiceListItem } from '../services/api';

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
          <h3 className="text-white text-lg font-semibold m-0">Faturaları Ara &amp; Filtrele</h3>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <label className="ds-label">Fatura No (ID)</label>
              <input
                type="text"
                name="invoiceId"
                value={filters.invoiceId}
                onChange={handleFilterChange}
                placeholder="Örn: 8010 veya CI1"
                className="ds-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">Fatura Türü</label>
              <select
                name="invoiceTypeId"
                value={filters.invoiceTypeId}
                onChange={handleFilterChange}
                className="ds-select"
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
            <div className="flex flex-col gap-1">
              <label className="ds-label">Gönderen Cari (From Party)</label>
              <input
                type="text"
                name="partyIdFrom"
                value={filters.partyIdFrom}
                onChange={handleFilterChange}
                placeholder="Örn: Company"
                className="ds-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">Alıcı Cari (To Party)</label>
              <input
                type="text"
                name="partyIdTo"
                value={filters.partyIdTo}
                onChange={handleFilterChange}
                placeholder="Örn: DemoCustomer"
                className="ds-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="ds-label">Fatura Durumu</label>
              <select
                name="statusId"
                value={filters.statusId}
                onChange={handleFilterChange}
                className="ds-select"
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

          <div className="flex justify-end gap-3 mt-1">
            <button type="button" onClick={handleReset} className="ds-btn-secondary" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Sıfırla
            </button>
            <button type="submit" className="ds-btn-primary flex items-center gap-2" disabled={loading}>
              <Search size={18} /> Filtrele
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="ds-card overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700/50">
          <h3 className="text-white text-lg font-semibold m-0">
            Kayıtlar ({invoices.length} / Toplam: {totalCount})
          </h3>
          <button
            className="ds-btn-secondary text-sm py-1.5 px-3"
            onClick={() => loadInvoices(filters)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Yenile
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">Fatura No</th>
                <th className="ds-th">Tür</th>
                <th className="ds-th">Tarih</th>
                <th className="ds-th">Gönderen</th>
                <th className="ds-th">Alıcı</th>
                <th className="ds-th">Durum</th>
                <th className="ds-th-right">Toplam Tutar</th>
                <th className="ds-th-right">Kalan Bakiye</th>
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
                        {formatStatus(inv.statusId)}
                      </span>
                    </td>
                    <td className="ds-td-mono ds-td-right">
                      {inv.total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td className={`ds-td-mono ds-td-right ${inv.outstandingAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {inv.outstandingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td className="ds-td text-center">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
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
                  <td colSpan={9}>
                    <div className="ds-empty">
                      <FileText size={40} className="mx-auto mb-3 text-slate-600" />
                      <p className="text-slate-400">Kriterlere uygun fatura bulunamadı.</p>
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
