import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Download,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Printer,
} from 'lucide-react';
import { api, InvoiceListItem } from '../services/api';
import { useTranslation } from '../i18n';
import { useRouter } from '../router';
import { PartyStatementModal } from './PartyStatementModal';
import InvoicePrintModal from './InvoicePrintModal';

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

type InvoiceSegment = 'ALL' | 'SALES' | 'PURCHASE' | 'PAST_DUE' | 'DUE_SOON' | 'IN_PROCESS';

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
  const [selectedStatementPartyId, setSelectedStatementPartyId] = useState<string | null>(null);
  const [showStatementModal, setShowStatementModal] = useState<boolean>(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);

  const { queryParams, setQueryParams } = useRouter();
  const validSegments: InvoiceSegment[] = ['ALL', 'SALES', 'PURCHASE', 'PAST_DUE', 'DUE_SOON', 'IN_PROCESS'];
  const initialSegment = (queryParams.segment && validSegments.includes(queryParams.segment as InvoiceSegment))
    ? (queryParams.segment as InvoiceSegment)
    : 'ALL';
  const [activeSegment, setActiveSegment] = useState<InvoiceSegment>(initialSegment);
  const [searchQuery, setSearchQuery] = useState<string>(queryParams.q || '');

  const handleSegmentChange = (segment: InvoiceSegment) => {
    setActiveSegment(segment);
    setQueryParams({ segment: segment === 'ALL' ? undefined : segment });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setQueryParams({ q: q || undefined });
  };

  useEffect(() => {
    if (queryParams.segment && validSegments.includes(queryParams.segment as InvoiceSegment)) {
      setActiveSegment(queryParams.segment as InvoiceSegment);
    } else if (!queryParams.segment) {
      setActiveSegment('ALL');
    }
    if (queryParams.q !== undefined) {
      setSearchQuery(queryParams.q);
    }
  }, [queryParams.segment, queryParams.q]);

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

  const formatCurrency = useCallback((val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(val || 0);
  }, [locale]);

  // KPI Metrics Calculation
  const kpiMetrics = useMemo(() => {
    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let pastDueAmount = 0;
    let pastDueCount = 0;
    let inProcessCount = 0;
    const now = new Date().toISOString().slice(0, 10);

    for (const inv of invoices) {
      totalInvoiced += (inv.total || 0);
      totalOutstanding += (inv.outstandingAmount || 0);
      if (inv.statusId === 'INVOICE_IN_PROCESS') {
        inProcessCount++;
      }
      if (inv.dueDate && inv.dueDate < now && inv.statusId !== 'INVOICE_PAID' && inv.statusId !== 'INVOICE_CANCELLED' && (inv.outstandingAmount || 0) > 0) {
        pastDueAmount += (inv.outstandingAmount || 0);
        pastDueCount++;
      }
    }

    return {
      totalInvoiced,
      totalOutstanding,
      pastDueAmount,
      pastDueCount,
      inProcessCount
    };
  }, [invoices]);

  // Filtered invoices according to active segment tab & quick search query
  const displayedInvoices = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10);
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const q = searchQuery.trim().toLowerCase();

    return invoices.filter(inv => {
      // Segment filter
      if (activeSegment === 'SALES') {
        if (!inv.invoiceTypeId?.startsWith('SALES') && inv.invoiceTypeId !== 'CUST_RTN_INVOICE') return false;
      } else if (activeSegment === 'PURCHASE') {
        if (!inv.invoiceTypeId?.startsWith('PURCHASE')) return false;
      } else if (activeSegment === 'PAST_DUE') {
        const isPastDue = Boolean(inv.dueDate && inv.dueDate < now && inv.statusId !== 'INVOICE_PAID' && inv.statusId !== 'INVOICE_CANCELLED' && (inv.outstandingAmount || 0) > 0);
        if (!isPastDue) return false;
      } else if (activeSegment === 'DUE_SOON') {
        const isDueSoon = Boolean(inv.dueDate && inv.dueDate >= now && inv.dueDate <= sevenDaysLater && inv.statusId !== 'INVOICE_PAID' && inv.statusId !== 'INVOICE_CANCELLED' && (inv.outstandingAmount || 0) > 0);
        if (!isDueSoon) return false;
      } else if (activeSegment === 'IN_PROCESS') {
        if (inv.statusId !== 'INVOICE_IN_PROCESS') return false;
      }

      // Live quick search
      if (q) {
        const matchId = inv.invoiceId?.toLowerCase().includes(q);
        const matchPartyFrom = inv.partyIdFrom?.toLowerCase().includes(q);
        const matchPartyTo = inv.partyIdTo?.toLowerCase().includes(q);
        const matchDesc = inv.description?.toLowerCase().includes(q);
        const matchType = inv.invoiceTypeId?.toLowerCase().includes(q);
        if (!matchId && !matchPartyFrom && !matchPartyTo && !matchDesc && !matchType) return false;
      }

      return true;
    });
  }, [invoices, activeSegment, searchQuery]);

  const handleToggleSelect = (invId: string) => {
    setSelectedInvoices(prev =>
      prev.includes(invId) ? prev.filter(id => id !== invId) : [...prev, invId]
    );
  };

  const handleSelectAll = () => {
    if (selectedInvoices.length === displayedInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(displayedInvoices.map(i => i.invoiceId));
    }
  };

  const handleExportCsv = () => {
    const itemsToExport = selectedInvoices.length > 0
      ? invoices.filter(i => selectedInvoices.includes(i.invoiceId))
      : displayedInvoices;

    if (itemsToExport.length === 0) return;

    const headers = [
      translations.invoices.invoiceId,
      translations.invoices.type,
      translations.invoices.partyFrom,
      translations.invoices.partyTo,
      translations.invoices.invoiceDate,
      translations.invoices.dueDate,
      translations.invoices.status,
      translations.invoices.totalAmount,
      translations.invoices.outstandingAmount,
      locale === 'tr' ? 'Para Birimi' : 'Currency'
    ];

    const csvRows = [
      headers.join(';'),
      ...itemsToExport.map(i => [
        `"${i.invoiceId}"`,
        `"${(i.invoiceTypeId || '').replace(/_/g, ' ')}"`,
        `"${i.partyIdFrom || ''}"`,
        `"${i.partyIdTo || ''}"`,
        `"${i.invoiceDate || ''}"`,
        `"${i.dueDate || ''}"`,
        `"${getStatusLabel(i.statusId, translations.invoices)}"`,
        (i.total || 0).toString().replace('.', ','),
        (i.outstandingAmount || 0).toString().replace('.', ','),
        `"${i.currencyUomId || 'USD'}"`
      ].join(';'))
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `faturalar_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setSuccessMsg(translations.invoices.exportSuccess);
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

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <div className="ds-stat-card border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{translations.invoices.kpiTotalInvoiced}</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-white mt-1">
            {formatCurrency(kpiMetrics.totalInvoiced)}
          </div>
          <div className="ds-stat-sub text-slate-400 mt-0.5">
            {invoices.length} {translations.invoices.countUnit}
          </div>
        </div>

        <div className="ds-stat-card border border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{translations.invoices.kpiOutstanding}</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-amber-400 mt-1">
            {formatCurrency(kpiMetrics.totalOutstanding)}
          </div>
          <div className="ds-stat-sub text-slate-400 mt-0.5">
            {kpiMetrics.totalOutstanding > 0 
              ? (locale === 'tr' ? 'Tahsilat / Ödeme Bekliyor' : 'Awaiting Settlement')
              : (locale === 'tr' ? 'Tümü Kapalı' : 'Fully Settled')}
          </div>
        </div>

        <div className={`ds-stat-card border ${kpiMetrics.pastDueCount > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between">
            <span className="ds-stat-label text-rose-300">{translations.invoices.kpiPastDue}</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-rose-400 mt-1">
            {formatCurrency(kpiMetrics.pastDueAmount)}
          </div>
          <div className="ds-stat-sub text-slate-400 mt-0.5">
            {kpiMetrics.pastDueCount > 0 ? (
              <span className="text-rose-400 font-medium">
                {kpiMetrics.pastDueCount} {translations.invoices.countUnit} {locale === 'tr' ? 'vadesi geçmiş' : 'overdue'}
              </span>
            ) : (
              <span>{locale === 'tr' ? 'Vadesi geçmiş fatura yok' : 'No overdue invoices'}</span>
            )}
          </div>
        </div>

        <div className="ds-stat-card border border-sky-500/20">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{translations.invoices.kpiPendingApproval}</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400">
              <Clock size={18} />
            </div>
          </div>
          <div className="ds-stat-value text-sky-400 mt-1">
            {kpiMetrics.inProcessCount} <span className="text-sm font-normal text-slate-400">{translations.invoices.countUnit}</span>
          </div>
          <div className="ds-stat-sub text-slate-400 mt-0.5">
            {locale === 'tr' ? 'Taslak & Onay aşamasında' : 'In process & draft stage'}
          </div>
        </div>
      </div>

      {/* Quick Segment Filter Tabs & Export CSV */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-2.5 sm:p-3 rounded-xl border border-slate-800 animate-fade-in">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => handleSegmentChange('ALL')}
            className={`ds-pill-tab ${activeSegment === 'ALL' ? 'ds-pill-tab-active' : ''}`}
          >
            <span>{translations.invoices.tabAll}</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleSegmentChange('SALES')}
            className={`ds-pill-tab ${activeSegment === 'SALES' ? 'ds-pill-tab-active' : ''}`}
          >
            <ArrowUpRight size={14} className="text-emerald-400" />
            <span>{translations.invoices.tabSales}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSegmentChange('PURCHASE')}
            className={`ds-pill-tab ${activeSegment === 'PURCHASE' ? 'ds-pill-tab-active' : ''}`}
          >
            <ArrowDownLeft size={14} className="text-amber-400" />
            <span>{translations.invoices.tabPurchase}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSegmentChange('PAST_DUE')}
            className={`ds-pill-tab ${activeSegment === 'PAST_DUE' ? 'ds-pill-tab-active' : ''}`}
          >
            <AlertTriangle size={14} className="text-rose-400" />
            <span>{translations.invoices.tabPastDue}</span>
            {kpiMetrics.pastDueCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-mono font-bold">
                {kpiMetrics.pastDueCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSegmentChange('DUE_SOON')}
            className={`ds-pill-tab ${activeSegment === 'DUE_SOON' ? 'ds-pill-tab-active' : ''}`}
          >
            <Clock size={14} className="text-blue-400" />
            <span>{translations.invoices.tabDueSoon}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSegmentChange('IN_PROCESS')}
            className={`ds-pill-tab ${activeSegment === 'IN_PROCESS' ? 'ds-pill-tab-active' : ''}`}
          >
            <span>{translations.invoices.tabInProcess}</span>
            {kpiMetrics.inProcessCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                {kpiMetrics.inProcessCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={displayedInvoices.length === 0}
            className="ds-btn-secondary text-xs sm:text-sm py-1.5 px-3 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            title={translations.invoices.exportCsv}
          >
            <Download size={15} />
            <span>{translations.invoices.exportCsv}</span>
          </button>
        </div>
      </div>

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
        <div className="flex flex-wrap justify-between items-center px-6 py-4 border-b border-slate-700/50 gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-white text-lg font-semibold m-0">
              {locale === 'tr' ? 'Kayıtlar' : 'Records'} ({displayedInvoices.length} / {translations.common.total}: {totalCount})
            </h3>
            {activeSegment !== 'ALL' && (
              <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md font-mono">
                {activeSegment}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={translations.invoices.searchPlaceholder}
                className="ds-input pl-8 py-1.5 text-xs w-48 sm:w-64"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <XCircle size={13} />
                </button>
              )}
            </div>

            <button
              className="ds-btn-secondary text-sm py-1.5 px-3"
              onClick={() => loadInvoices(filters)}
              disabled={loading}
              title={translations.common.refresh}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
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
                    checked={displayedInvoices.length > 0 && selectedInvoices.length === displayedInvoices.length}
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
              ) : displayedInvoices.length > 0 ? (
                displayedInvoices.map((inv) => (
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
                    <td className="ds-td-muted">
                      <div>{inv.invoiceDate || '-'}</div>
                      {inv.dueDate && (
                        <div className={`text-[11px] font-mono mt-0.5 flex items-center gap-1 ${
                          inv.dueDate < new Date().toISOString().slice(0, 10) && inv.statusId !== 'INVOICE_PAID' && inv.statusId !== 'INVOICE_CANCELLED' && (inv.outstandingAmount || 0) > 0
                            ? 'text-rose-400 font-medium'
                            : 'text-slate-500'
                        }`}>
                          <span>{translations.invoices.dueDate}: {inv.dueDate}</span>
                        </div>
                      )}
                    </td>
                    <td className="ds-td">
                      {inv.partyIdFrom ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStatementPartyId(inv.partyIdFrom);
                            setShowStatementModal(true);
                          }}
                          className="text-slate-300 hover:text-indigo-400 hover:underline transition-colors inline-flex items-center gap-1 font-mono text-xs cursor-pointer"
                          title={locale === 'tr' ? 'Cari Hesap Ekstresini Görüntüle' : 'View Party Statement'}
                        >
                          <span>{inv.partyIdFrom}</span>
                        </button>
                      ) : '-'}
                    </td>
                    <td className="ds-td">
                      {inv.partyIdTo ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStatementPartyId(inv.partyIdTo);
                            setShowStatementModal(true);
                          }}
                          className="text-slate-300 hover:text-indigo-400 hover:underline transition-colors inline-flex items-center gap-1 font-mono text-xs cursor-pointer"
                          title={locale === 'tr' ? 'Cari Hesap Ekstresini Görüntüle' : 'View Party Statement'}
                        >
                          <span>{inv.partyIdTo}</span>
                        </button>
                      ) : '-'}
                    </td>
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
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                          onClick={() => {
                            const target = inv.partyIdTo || inv.partyIdFrom;
                            if (target) {
                              setSelectedStatementPartyId(target);
                              setShowStatementModal(true);
                            }
                          }}
                          title={locale === 'tr' ? 'Cari Hesap Ekstresi' : 'Party Statement'}
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                          onClick={() => setPrintInvoiceId(inv.invoiceId)}
                          title={translations.invoices.printInvoice}
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                          onClick={() => handleCopyInvoice(inv.invoiceId)}
                          title={tBatch.copyInvoice}
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
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

      {/* Party Statement Modal (Customer/Vendor Ledger & Aging) */}
      <PartyStatementModal
        partyId={selectedStatementPartyId}
        isOpen={showStatementModal}
        onClose={() => {
          setShowStatementModal(false);
          setSelectedStatementPartyId(null);
        }}
      />

      {/* Invoice Print & PDF Preview Modal (Faz 2) */}
      {printInvoiceId && (
        <InvoicePrintModal
          invoiceId={printInvoiceId}
          isOpen={Boolean(printInvoiceId)}
          onClose={() => setPrintInvoiceId(null)}
        />
      )}
    </div>
  );
};

export default InvoiceList;
