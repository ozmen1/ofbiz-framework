import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
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

const getStatusLabel = (statusId: string, inv: any): string => {
  switch (statusId) {
    case 'INVOICE_PAID': return inv.statusPaid;
    case 'INVOICE_APPROVED': return inv.statusApproved;
    case 'INVOICE_SENT': return inv.statusSent;
    case 'INVOICE_READY': return inv.statusReady;
    case 'INVOICE_IN_PROCESS': return inv.statusInProcess;
    case 'INVOICE_CANCELLED': return inv.statusCancelled;
    default: return (statusId || '').replace('INVOICE_', '').replace(/_/g, ' ');
  }
};

interface InvoiceListProps {
  onViewInvoice?: (invoiceId: string) => void;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onViewInvoice }) => {
  const { translations, locale } = useTranslation();
  const tBatch = translations.invoiceBatch;
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

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

  const handleToggleSelect = (invId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === invoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(invoices.map(i => i.invoiceId));
    }
  };

  const handleMassStatusChange = async (statusId: string) => {
    if (selectedInvoices.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.massChangeInvoiceStatus({
        invoiceIds: selectedInvoices,
        statusId,
      });
      setSuccessMsg(res?._EVENT_MESSAGE_ || tBatch.batchSuccess);
      setSelectedInvoices([]);
      loadInvoices();
    } catch (err: any) {
      setError(err?.message || 'Toplu işlem başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.copyInvoice(invoiceId);
      setSuccessMsg((res?._EVENT_MESSAGE_ || tBatch.copySuccess) + ` (#${res.invoiceId})`);
      loadInvoices();
      if (onViewInvoice && res?.invoiceId) {
        onViewInvoice(res.invoiceId);
      }
    } catch (err: any) {
      setError(err?.message || 'Fatura kopyalanamadı.');
    } finally {
      setLoading(false);
    }
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

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <XCircle size={16} />
          </button>
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
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> {translations.common.reset}
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
            {locale === 'tr' ? 'Kayıtlar' : 'Records'} ({invoices.length} / {translations.common.total}: {totalCount})
          </h3>
          <button
            className="ds-btn-secondary text-sm py-1.5 px-3"
            onClick={() => loadInvoices(filters)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {translations.common.refresh}
          </button>
        </div>

        {/* Batch Action Toolbar */}
        {selectedInvoices.length > 0 && (
          <div className="bg-indigo-950/40 border-b border-indigo-500/30 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-indigo-200">
              <span className="font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full text-xs">
                {selectedInvoices.length}
              </span>
              <span>{tBatch.selectedCount}</span>
              <button
                type="button"
                onClick={() => setSelectedInvoices([])}
                className="text-xs text-indigo-400 hover:text-indigo-300 underline ml-2"
              >
                {tBatch.clearSelection}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMassStatusChange('INVOICE_APPROVED')}
                className="ds-btn-primary py-1 px-3 text-xs"
                disabled={loading}
              >
                {tBatch.approveSelected}
              </button>
              <button
                type="button"
                onClick={() => handleMassStatusChange('INVOICE_READY')}
                className="ds-btn-secondary py-1 px-3 text-xs"
                disabled={loading}
              >
                {tBatch.readySelected}
              </button>
              <button
                type="button"
                onClick={() => handleMassStatusChange('INVOICE_CANCELLED')}
                className="p-1.5 px-3 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-xs transition-colors font-medium"
                disabled={loading}
              >
                {tBatch.cancelSelected}
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th w-10 text-center">
                  <input
                    type="checkbox"
                    checked={invoices.length > 0 && selectedInvoices.length === invoices.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 cursor-pointer"
                  />
                </th>
                <th className="ds-th">{translations.invoices.invoiceId}</th>
                <th className="ds-th">{translations.invoices.type}</th>
                <th className="ds-th">{translations.invoices.invoiceDate}</th>
                <th className="ds-th">{translations.invoices.partyFrom}</th>
                <th className="ds-th">{translations.invoices.partyTo}</th>
                <th className="ds-th">{translations.invoices.status}</th>
                <th className="ds-th-right">{translations.invoices.totalAmount}</th>
                <th className="ds-th-right">{translations.invoices.outstandingAmount}</th>
                <th className="ds-th text-center">{translations.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>
                    <div className="flex items-center justify-center py-20">
                      <div className="ds-spinner"></div>
                    </div>
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.invoiceId} className={`ds-tbody-row ${selectedInvoices.includes(inv.invoiceId) ? 'bg-indigo-950/20' : ''}`}>
                    <td className="ds-td text-center">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.includes(inv.invoiceId)}
                        onChange={() => handleToggleSelect(inv.invoiceId)}
                        className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 cursor-pointer"
                      />
                    </td>
                    <td className="ds-td-primary">#{inv.invoiceId}</td>
                    <td className="ds-td">{(inv.invoiceTypeId || '').replace(/_/g, ' ')}</td>
                    <td className="ds-td-muted">{inv.invoiceDate || '-'}</td>
                    <td className="ds-td">{inv.partyIdFrom || '-'}</td>
                    <td className="ds-td">{inv.partyIdTo || '-'}</td>
                    <td className="ds-td">
                      <span className={getStatusBadgeClass(inv.statusId)}>
                        {getStatusIcon(inv.statusId)}
                        {getStatusLabel(inv.statusId, translations.invoices)}
                      </span>
                    </td>
                    <td className="ds-td-mono ds-td-right">
                      {inv.total.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td className={`ds-td-mono ds-td-right ${inv.outstandingAmount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {inv.outstandingAmount.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {inv.currencyUomId}
                    </td>
                    <td className="ds-td text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 transition-colors"
                          onClick={() => handleCopyInvoice(inv.invoiceId)}
                          title={tBatch.copyInvoice}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
                          onClick={() => onViewInvoice && onViewInvoice(inv.invoiceId)}
                          title={translations.common.details}
                        >
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10}>
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
