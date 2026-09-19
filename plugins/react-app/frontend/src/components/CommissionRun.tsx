import React, { useState, useEffect, useCallback } from 'react';
import {
  BadgePercent,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
  DollarSign,
  AlertTriangle,
  X,
  Boxes,
  Clock,
  UserCheck,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  api,
  CommissionRunItem,
  CommissionStats,
  EligibleSalesInvoiceItem,
  InventoryValuationItem,
  InventoryValuationSummary,
  PastDueInvoiceItem,
  PastDueSummary,
  CommissionMetadataResponse,
} from '../services/api';
import { useTranslation } from '../i18n';

export const CommissionRun: React.FC = () => {
  const { translations, locale } = useTranslation();
  const t = translations.commissionRun;
  const common = translations.common;

  // Active Tab: 'invoices' | 'newRun' | 'inventoryValuation' | 'pastDue'
  const [activeTab, setActiveTab] = useState<'invoices' | 'newRun' | 'inventoryValuation' | 'pastDue'>('invoices');

  // Global notification states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<CommissionMetadataResponse['metadata'] | null>(null);

  // Tab 1: Commission Invoices List
  const [commissionRuns, setCommissionRuns] = useState<CommissionRunItem[]>([]);
  const [stats, setStats] = useState<CommissionStats>({
    totalCommissionVolume: 0,
    totalInvoicesGenerated: 0,
    activeSalesReps: 0,
    pendingSalesInvoices: 0,
  });
  const [commissionSearch, setCommissionSearch] = useState('');
  const [commissionLoading, setCommissionLoading] = useState(true);

  // Detail Modal for Commission Invoice
  const [selectedRun, setSelectedRun] = useState<CommissionRunItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Tab 2: New Commission Run Wizard
  const [selectedSalesRep, setSelectedSalesRep] = useState('');
  const [customRate, setCustomRate] = useState<string>('');
  const [description, setDescription] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleSalesInvoiceItem[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);

  // Tab 3: Inventory Valuation
  const [inventoryFacility, setInventoryFacility] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryValuationItem[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventoryValuationSummary>({
    totalSkuCount: 0,
    totalQuantityOnHand: 0,
    totalInventoryValue: 0,
    itemCount: 0,
  });
  const [inventoryLoading, setInventoryLoading] = useState(false);

  // Tab 4: Past Due Aging
  const [pastDueType, setPastDueType] = useState<'ALL' | 'SALES_INVOICE' | 'PURCHASE_INVOICE'>('ALL');
  const [pastDueInvoices, setPastDueInvoices] = useState<PastDueInvoiceItem[]>([]);
  const [pastDueSummary, setPastDueSummary] = useState<PastDueSummary>({
    totalPastDueCount: 0,
    totalPastDueAmount: 0,
    totalDueSoonCount: 0,
    totalDueSoonAmount: 0,
    buckets: {
      '1_30': 0,
      '31_60': 0,
      '61_90': 0,
      '90_plus': 0,
    },
  });
  const [pastDueLoading, setPastDueLoading] = useState(false);

  const formatCurrency = (val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Load Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const res = await api.getCommissionMetadata();
      if (res?.metadata) {
        setMetadata(res.metadata);
        if (res.metadata.defaultCommissionRate && !customRate) {
          setCustomRate(String(res.metadata.defaultCommissionRate));
        }
      }
    } catch (err: any) {
      console.warn('Could not load commission metadata:', err);
    }
  }, [customRate]);

  // Load Commission Runs (Tab 1)
  const loadCommissionRuns = useCallback(async () => {
    setCommissionLoading(true);
    setError(null);
    try {
      const res = await api.getCommissionRuns({ search: commissionSearch });
      setCommissionRuns(res.commissionRuns || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setCommissionLoading(false);
    }
  }, [commissionSearch, common.error]);

  // Load Eligible Sales Invoices (Tab 2)
  const loadEligibleInvoices = useCallback(async () => {
    setEligibleLoading(true);
    setError(null);
    try {
      const res = await api.getEligibleSalesInvoices({
        salesRepPartyId: selectedSalesRep || undefined,
        fromDate: fromDate || undefined,
        thruDate: thruDate || undefined,
      });
      setEligibleInvoices(res.eligibleInvoices || []);
      setSelectedInvoiceIds([]);
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setEligibleLoading(false);
    }
  }, [selectedSalesRep, fromDate, thruDate, common.error]);

  // Load Inventory Valuation (Tab 3)
  const loadInventoryValuation = useCallback(async () => {
    setInventoryLoading(true);
    setError(null);
    try {
      const res = await api.getInventoryValuationReport({
        facilityId: inventoryFacility || undefined,
        search: inventorySearch || undefined,
      });
      setInventoryItems(res.valuationList || []);
      if (res.summary) {
        setInventorySummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setInventoryLoading(false);
    }
  }, [inventoryFacility, inventorySearch, common.error]);

  // Load Past Due Report (Tab 4)
  const loadPastDue = useCallback(async () => {
    setPastDueLoading(true);
    setError(null);
    try {
      const res = await api.getPastDueInvoicesReport(
        pastDueType === 'ALL' ? undefined : { invoiceTypeId: pastDueType }
      );
      setPastDueInvoices(res.pastDueInvoices || []);
      if (res.summary) {
        setPastDueSummary(res.summary);
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setPastDueLoading(false);
    }
  }, [pastDueType, common.error]);

  // Initial load
  useEffect(() => {
    loadMetadata();
    loadCommissionRuns();
  }, [loadMetadata, loadCommissionRuns]);

  // Load on tab switch
  useEffect(() => {
    if (activeTab === 'invoices') {
      loadCommissionRuns();
    } else if (activeTab === 'newRun') {
      loadEligibleInvoices();
    } else if (activeTab === 'inventoryValuation') {
      loadInventoryValuation();
    } else if (activeTab === 'pastDue') {
      loadPastDue();
    }
  }, [activeTab, loadCommissionRuns, loadEligibleInvoices, loadInventoryValuation, loadPastDue]);

  // Selection handlers for Tab 2
  const handleSelectAll = () => {
    if (selectedInvoiceIds.length === eligibleInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(eligibleInvoices.map((inv) => inv.invoiceId));
    }
  };

  const handleToggleInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) =>
      prev.includes(invoiceId) ? prev.filter((id) => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  // Calculation for Tab 2 selected summary
  const selectedInvoices = eligibleInvoices.filter((inv) => selectedInvoiceIds.includes(inv.invoiceId));
  const rateMultiplier = customRate ? parseFloat(customRate) / 100 : 0.05;
  const totalSelectedCommission = selectedInvoices.reduce((acc, inv) => {
    const itemComm = inv.estimatedCommission || (inv.totalAmount * rateMultiplier);
    return acc + itemComm;
  }, 0);

  // Execute Commission Run (Tab 2)
  const handleExecuteCommissionRun = async () => {
    if (selectedInvoiceIds.length === 0) {
      setError(t.messages.selectAtLeastOne);
      return;
    }
    setCreatingRun(true);
    setError(null);
    try {
      const rateNum = customRate ? parseFloat(customRate) : undefined;
      const res = await api.createCommissionRun({
        salesRepPartyId: selectedSalesRep || undefined,
        invoiceIds: selectedInvoiceIds,
        commissionRate: rateNum,
        description: description || undefined,
      });

      showSuccessMsg(res._EVENT_MESSAGE_ || t.messages.createdSuccess);
      setActiveTab('invoices');
      loadCommissionRuns();
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setCreatingRun(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-red-400 animate-fadeIn">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/20 rounded-lg text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg text-emerald-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="ds-tab-bar flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BadgePercent className="w-4 h-4" />
          {t.tabs.invoices}
        </button>
        <button
          onClick={() => setActiveTab('newRun')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'newRun'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Plus className="w-4 h-4" />
          {t.tabs.newRun}
        </button>
        <button
          onClick={() => setActiveTab('inventoryValuation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'inventoryValuation'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          {t.tabs.inventoryValuation}
        </button>
        <button
          onClick={() => setActiveTab('pastDue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'pastDue'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          {t.tabs.pastDue}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMMISSION INVOICES LIST                                           */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-5">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ds-stat-card border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.stats.totalVolume}</p>
                  <p className="ds-stat-value text-indigo-400 mt-1">{formatCurrency(stats.totalCommissionVolume)}</p>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="ds-stat-card border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.stats.invoicesGenerated}</p>
                  <p className="ds-stat-value text-blue-400 mt-1">{stats.totalInvoicesGenerated}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="ds-stat-card border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.stats.activeReps}</p>
                  <p className="ds-stat-value text-emerald-400 mt-1">{stats.activeSalesReps}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="ds-stat-card border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.stats.pendingSales}</p>
                  <p className="ds-stat-value text-amber-400 mt-1">{stats.pendingSalesInvoices}</p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                  <BadgePercent className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="ds-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={common.search}
                value={commissionSearch}
                onChange={(e) => setCommissionSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadCommissionRuns()}
                className="ds-input pl-9 w-full"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={loadCommissionRuns}
                disabled={commissionLoading}
                className="ds-btn-secondary flex items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${commissionLoading ? 'animate-spin' : ''}`} />
                {common.refresh}
              </button>
              <button
                onClick={() => setActiveTab('newRun')}
                className="ds-btn-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {t.tabs.newRun}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="ds-card overflow-hidden">
            {commissionLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="ds-spinner"></div>
              </div>
            ) : commissionRuns.length === 0 ? (
              <div className="ds-empty py-16 text-center text-slate-500">
                <BadgePercent className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                <p className="text-base font-medium">{t.table.noInvoices}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table w-full">
                  <thead>
                    <tr className="ds-thead-row text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                      <th className="ds-th py-3.5 px-4">{t.table.invoiceId}</th>
                      <th className="ds-th py-3.5 px-4">{t.table.salesRep}</th>
                      <th className="ds-th py-3.5 px-4">{t.table.date}</th>
                      <th className="ds-th py-3.5 px-4 text-right">{t.table.amount}</th>
                      <th className="ds-th py-3.5 px-4">{t.table.status}</th>
                      <th className="ds-th py-3.5 px-4 text-center">{t.table.sources}</th>
                      <th className="ds-th py-3.5 px-4 text-right">{t.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {commissionRuns.map((item) => (
                      <tr key={item.invoiceId} className="ds-tbody-row hover:bg-slate-800/30 transition-colors">
                        <td className="ds-td py-3 px-4 font-semibold text-indigo-400">{item.invoiceId}</td>
                        <td className="ds-td py-3 px-4 text-white">
                          <span className="font-medium">{item.salesRepPartyId}</span>
                          {item.salesRepName && (
                            <span className="text-xs text-slate-400 block">{item.salesRepName}</span>
                          )}
                        </td>
                        <td className="ds-td py-3 px-4 text-slate-300">
                          {item.invoiceDate ? item.invoiceDate.substring(0, 10) : '-'}
                        </td>
                        <td className="ds-td py-3 px-4 text-right font-medium text-emerald-400">
                          {formatCurrency(item.totalAmount, item.currencyUomId)}
                        </td>
                        <td className="ds-td py-3 px-4">
                          <span
                            className={`ds-badge ${
                              item.statusId === 'INVOICE_PAID'
                                ? 'ds-badge-green'
                                : item.statusId === 'INVOICE_CANCELLED'
                                ? 'ds-badge-red'
                                : 'ds-badge-blue'
                            }`}
                          >
                            {item.statusId}
                          </span>
                        </td>
                        <td className="ds-td py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-300 font-mono">
                            {item.sourceInvoiceCount || 0}
                          </span>
                        </td>
                        <td className="ds-td py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedRun(item);
                              setShowDetailModal(true);
                            }}
                            className="ds-btn-ghost p-1.5 hover:text-indigo-400 rounded-lg"
                            title={common.details}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NEW COMMISSION RUN WIZARD                                          */}
      {/* ========================================================================= */}
      {activeTab === 'newRun' && (
        <div className="space-y-6">
          {/* Header & Filter Card */}
          <div className="ds-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-indigo-400" />
              {t.wizard.title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sales Rep Selector */}
              <div>
                <label className="ds-label block text-xs font-medium text-slate-400 mb-1.5">
                  {t.wizard.salesRep}
                </label>
                <select
                  value={selectedSalesRep}
                  onChange={(e) => setSelectedSalesRep(e.target.value)}
                  className="ds-select w-full"
                >
                  <option value="">{t.wizard.allReps}</option>
                  {metadata?.salesReps?.map((rep) => (
                    <option key={rep.partyId} value={rep.partyId}>
                      {rep.name ? `${rep.name} (${rep.partyId})` : rep.partyId}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commission Rate (%) */}
              <div>
                <label className="ds-label block text-xs font-medium text-slate-400 mb-1.5">
                  {t.wizard.commissionRate}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value)}
                  placeholder="5.0"
                  className="ds-input w-full"
                />
              </div>

              {/* From Date */}
              <div>
                <label className="ds-label block text-xs font-medium text-slate-400 mb-1.5">
                  {t.wizard.fromDate}
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="ds-input w-full"
                />
              </div>

              {/* Thru Date */}
              <div>
                <label className="ds-label block text-xs font-medium text-slate-400 mb-1.5">
                  {t.wizard.thruDate}
                </label>
                <input
                  type="date"
                  value={thruDate}
                  onChange={(e) => setThruDate(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="ds-label block text-xs font-medium text-slate-400 mb-1.5">
                  {t.wizard.description}
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.wizard.descriptionPlaceholder}
                  className="ds-input w-full"
                />
              </div>
              <div className="flex items-end justify-end">
                <button
                  onClick={loadEligibleInvoices}
                  disabled={eligibleLoading}
                  className="ds-btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${eligibleLoading ? 'animate-spin' : ''}`} />
                  {common.filter}
                </button>
              </div>
            </div>
          </div>

          {/* Eligible Sales Invoices Table */}
          <div className="ds-card overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">{t.wizard.availableInvoices}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-xs text-slate-400 font-mono">
                  {eligibleInvoices.length}
                </span>
              </div>
              {eligibleInvoices.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
                >
                  {selectedInvoiceIds.length === eligibleInvoices.length ? (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      {t.wizard.deselectAll}
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" />
                      {t.wizard.selectAll}
                    </>
                  )}
                </button>
              )}
            </div>

            {eligibleLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="ds-spinner"></div>
              </div>
            ) : eligibleInvoices.length === 0 ? (
              <div className="ds-empty py-16 text-center text-slate-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
                <p className="text-base font-medium">{t.wizard.noEligibleInvoices}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table w-full">
                  <thead>
                    <tr className="ds-thead-row text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                      <th className="ds-th py-3 px-4 w-10 text-center">#</th>
                      <th className="ds-th py-3 px-4">{t.wizard.invoiceId}</th>
                      <th className="ds-th py-3 px-4">{t.wizard.customer}</th>
                      <th className="ds-th py-3 px-4">{t.wizard.salesRep}</th>
                      <th className="ds-th py-3 px-4 text-right">{t.wizard.salesAmount}</th>
                      <th className="ds-th py-3 px-4 text-center">{t.wizard.rate}</th>
                      <th className="ds-th py-3 px-4 text-right">{t.wizard.commission}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {eligibleInvoices.map((inv) => {
                      const isSelected = selectedInvoiceIds.includes(inv.invoiceId);
                      const displayCommission = inv.estimatedCommission || (inv.totalAmount * rateMultiplier);
                      return (
                        <tr
                          key={inv.invoiceId}
                          onClick={() => handleToggleInvoice(inv.invoiceId)}
                          className={`ds-tbody-row cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-600/10 hover:bg-indigo-600/15' : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td className="ds-td py-3 px-4 text-center">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-400 mx-auto" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 mx-auto" />
                            )}
                          </td>
                          <td className="ds-td py-3 px-4 font-mono font-medium text-indigo-300">{inv.invoiceId}</td>
                          <td className="ds-td py-3 px-4 text-white">
                            <span>{inv.customerName || inv.partyId}</span>
                            {inv.invoiceDate && (
                              <span className="text-xs text-slate-400 block">{inv.invoiceDate.substring(0, 10)}</span>
                            )}
                          </td>
                          <td className="ds-td py-3 px-4 text-slate-300">
                            {inv.salesRepPartyId ? (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-xs">
                                {inv.salesRepName || inv.salesRepPartyId}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">-</span>
                            )}
                          </td>
                          <td className="ds-td py-3 px-4 text-right font-medium text-slate-200">
                            {formatCurrency(inv.totalAmount, inv.currencyUomId)}
                          </td>
                          <td className="ds-td py-3 px-4 text-center font-mono text-xs text-amber-400">
                            {customRate ? `${customRate}%` : `${inv.commissionRate || 5}%`}
                          </td>
                          <td className="ds-td py-3 px-4 text-right font-bold text-emerald-400">
                            {formatCurrency(displayCommission, inv.currencyUomId)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sticky Execution Footer */}
          <div className="ds-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-500/20 bg-gradient-to-r from-slate-900 to-indigo-950/40">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs text-slate-400">{t.wizard.selectedCount}</p>
                <p className="text-xl font-bold text-white">{selectedInvoiceIds.length}</p>
              </div>
              <div className="h-8 w-px bg-slate-800"></div>
              <div>
                <p className="text-xs text-slate-400">{t.wizard.selectedCommission}</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalSelectedCommission)}</p>
              </div>
            </div>

            <button
              onClick={handleExecuteCommissionRun}
              disabled={creatingRun || selectedInvoiceIds.length === 0}
              className="ds-btn-primary flex items-center gap-2 px-6 py-2.5 text-base w-full sm:w-auto justify-center disabled:opacity-50"
            >
              {creatingRun ? <div className="ds-spinner w-4 h-4"></div> : <BadgePercent className="w-5 h-5" />}
              {t.wizard.executeButton}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVENTORY VALUATION REPORT                                         */}
      {/* ========================================================================= */}
      {activeTab === 'inventoryValuation' && (
        <div className="space-y-5">
          {/* KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="ds-stat-card border-l-4 border-l-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.inventory.totalSkus}</p>
                  <p className="ds-stat-value text-indigo-400 mt-1">{inventorySummary.totalSkuCount}</p>
                </div>
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <Boxes className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="ds-stat-card border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.inventory.totalQty}</p>
                  <p className="ds-stat-value text-blue-400 mt-1">
                    {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(
                      inventorySummary.totalQuantityOnHand
                    )}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="ds-stat-card border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="ds-stat-label">{t.inventory.totalValuation}</p>
                  <p className="ds-stat-value text-emerald-400 mt-1">
                    {formatCurrency(inventorySummary.totalInventoryValue)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="ds-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={common.search}
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadInventoryValuation()}
                  className="ds-input pl-9 w-full"
                />
              </div>

              <select
                value={inventoryFacility}
                onChange={(e) => setInventoryFacility(e.target.value)}
                className="ds-select w-full sm:w-56"
              >
                <option value="">{t.inventory.allFacilities}</option>
                {metadata?.facilities?.map((fac) => (
                  <option key={fac.facilityId} value={fac.facilityId}>
                    {fac.facilityName ? `${fac.facilityName} (${fac.facilityId})` : fac.facilityId}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadInventoryValuation}
              disabled={inventoryLoading}
              className="ds-btn-secondary flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${inventoryLoading ? 'animate-spin' : ''}`} />
              {common.refresh}
            </button>
          </div>

          {/* Table */}
          <div className="ds-card overflow-hidden">
            {inventoryLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="ds-spinner"></div>
              </div>
            ) : inventoryItems.length === 0 ? (
              <div className="ds-empty py-16 text-center text-slate-500">
                <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                <p className="text-base font-medium">{t.inventory.noInventory}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table w-full">
                  <thead>
                    <tr className="ds-thead-row text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                      <th className="ds-th py-3.5 px-4">{t.inventory.productId}</th>
                      <th className="ds-th py-3.5 px-4">{t.inventory.productName}</th>
                      <th className="ds-th py-3.5 px-4">{t.inventory.warehouse}</th>
                      <th className="ds-th py-3.5 px-4 text-right">{t.inventory.quantity}</th>
                      <th className="ds-th py-3.5 px-4 text-right">{t.inventory.unitCost}</th>
                      <th className="ds-th py-3.5 px-4 text-right">{t.inventory.valuation}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {inventoryItems.map((item, idx) => (
                      <tr key={`${item.productId}-${item.facilityId}-${idx}`} className="ds-tbody-row hover:bg-slate-800/30 transition-colors">
                        <td className="ds-td py-3 px-4 font-mono font-semibold text-indigo-400">{item.productId}</td>
                        <td className="ds-td py-3 px-4 text-white font-medium">{item.productName || item.productId}</td>
                        <td className="ds-td py-3 px-4 text-slate-400">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-xs">
                            {item.facilityName || item.facilityId}
                          </span>
                        </td>
                        <td className="ds-td py-3 px-4 text-right font-medium text-slate-200">
                          {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(item.quantityOnHand)}
                        </td>
                        <td className="ds-td py-3 px-4 text-right text-slate-300">
                          {formatCurrency(item.unitCost, item.currencyUomId)}
                        </td>
                        <td className="ds-td py-3 px-4 text-right font-bold text-emerald-400">
                          {formatCurrency(item.totalValuation, item.currencyUomId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PAST DUE INVOICES & AGING                                          */}
      {/* ========================================================================= */}
      {activeTab === 'pastDue' && (
        <div className="space-y-5">
          {/* Aging KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="ds-stat-card border-l-4 border-l-red-500">
              <p className="ds-stat-label text-red-400 font-semibold">{t.pastDue.totalPastDue}</p>
              <p className="ds-stat-value text-red-400 mt-1 text-base sm:text-lg">
                {formatCurrency(pastDueSummary.totalPastDueAmount)}
              </p>
            </div>

            <div className="ds-stat-card border-l-4 border-l-amber-500">
              <p className="ds-stat-label text-amber-400 font-semibold">{t.pastDue.totalDueSoon}</p>
              <p className="ds-stat-value text-amber-400 mt-1 text-base sm:text-lg">
                {formatCurrency(pastDueSummary.totalDueSoonAmount)}
              </p>
            </div>

            <div className="ds-stat-card border-l-4 border-l-yellow-500">
              <p className="ds-stat-label">{t.pastDue.aging1_30}</p>
              <p className="ds-stat-value text-yellow-300 mt-1 text-base sm:text-lg">
                {formatCurrency(pastDueSummary.buckets['1_30'])}
              </p>
            </div>

            <div className="ds-stat-card border-l-4 border-l-orange-500">
              <p className="ds-stat-label">{t.pastDue.aging31_60}</p>
              <p className="ds-stat-value text-orange-400 mt-1 text-base sm:text-lg">
                {formatCurrency(pastDueSummary.buckets['31_60'])}
              </p>
            </div>

            <div className="ds-stat-card border-l-4 border-l-red-400">
              <p className="ds-stat-label">{t.pastDue.aging61_90}</p>
              <p className="ds-stat-value text-red-400 mt-1 text-base sm:text-lg">
                {formatCurrency(pastDueSummary.buckets['61_90'])}
              </p>
            </div>

            <div className="ds-stat-card border-l-4 border-l-rose-600">
              <p className="ds-stat-label">{t.pastDue.aging90_plus}</p>
              <p className="ds-stat-value text-rose-500 mt-1 text-base sm:text-lg">
                {formatCurrency(pastDueSummary.buckets['90_plus'])}
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="ds-card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs text-slate-400">{t.pastDue.invoiceType}:</label>
              <select
                value={pastDueType}
                onChange={(e) => setPastDueType(e.target.value as any)}
                className="ds-select w-full sm:w-56"
              >
                <option value="ALL">{t.pastDue.allTypes}</option>
                <option value="SALES_INVOICE">{translations.invoices.salesInvoice} (AR)</option>
                <option value="PURCHASE_INVOICE">{translations.invoices.purchaseInvoice} (AP)</option>
              </select>
            </div>

            <button
              onClick={loadPastDue}
              disabled={pastDueLoading}
              className="ds-btn-secondary flex items-center gap-2 text-sm w-full sm:w-auto justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${pastDueLoading ? 'animate-spin' : ''}`} />
              {common.refresh}
            </button>
          </div>

          {/* Table */}
          <div className="ds-card overflow-hidden">
            {pastDueLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="ds-spinner"></div>
              </div>
            ) : pastDueInvoices.length === 0 ? (
              <div className="ds-empty py-16 text-center text-slate-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                <p className="text-base font-medium">{t.pastDue.noPastDue}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table w-full">
                  <thead>
                    <tr className="ds-thead-row text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                      <th className="ds-th py-3.5 px-4">{translations.invoices.invoiceId}</th>
                      <th className="ds-th py-3.5 px-4">{t.pastDue.invoiceType}</th>
                      <th className="ds-th py-3.5 px-4">{t.pastDue.partner}</th>
                      <th className="ds-th py-3.5 px-4">{t.pastDue.dueDate}</th>
                      <th className="ds-th py-3.5 px-4 text-center">{t.pastDue.daysOverdue}</th>
                      <th className="ds-th py-3.5 px-4 text-right">{t.pastDue.openAmount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {pastDueInvoices.map((inv) => (
                      <tr key={inv.invoiceId} className="ds-tbody-row hover:bg-slate-800/30 transition-colors">
                        <td className="ds-td py-3 px-4 font-mono font-semibold text-indigo-400">{inv.invoiceId}</td>
                        <td className="ds-td py-3 px-4">
                          <span
                            className={`ds-badge ${
                              inv.invoiceTypeId === 'SALES_INVOICE' ? 'ds-badge-blue' : 'ds-badge-yellow'
                            }`}
                          >
                            {inv.invoiceTypeId === 'SALES_INVOICE' ? 'AR' : 'AP'}
                          </span>
                        </td>
                        <td className="ds-td py-3 px-4 text-white">
                          <span className="font-medium">{inv.partnerName || inv.partnerPartyId}</span>
                        </td>
                        <td className="ds-td py-3 px-4 text-slate-300">
                          {inv.dueDate ? inv.dueDate.substring(0, 10) : '-'}
                        </td>
                        <td className="ds-td py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              inv.daysOverdue > 60
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : inv.daysOverdue > 30
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            +{inv.daysOverdue} d
                          </span>
                        </td>
                        <td className="ds-td py-3 px-4 text-right font-bold text-rose-400">
                          {formatCurrency(inv.outstandingAmount, inv.currencyUomId)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMMISSION INVOICE DETAIL                                          */}
      {/* ========================================================================= */}
      {showDetailModal && selectedRun && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="ds-card w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BadgePercent className="w-5 h-5 text-indigo-400" />
                <h3 className="font-semibold text-white">
                  {t.table.invoiceId}: {selectedRun.invoiceId}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="ds-stat-card">
                  <p className="ds-stat-label">{t.table.salesRep}</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {selectedRun.salesRepPartyId}
                  </p>
                </div>
                <div className="ds-stat-card">
                  <p className="ds-stat-label">{t.table.date}</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    {selectedRun.invoiceDate ? selectedRun.invoiceDate.substring(0, 10) : '-'}
                  </p>
                </div>
                <div className="ds-stat-card">
                  <p className="ds-stat-label">{t.table.amount}</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">
                    {formatCurrency(selectedRun.totalAmount, selectedRun.currencyUomId)}
                  </p>
                </div>
                <div className="ds-stat-card">
                  <p className="ds-stat-label">{t.table.status}</p>
                  <p className="text-sm font-semibold text-blue-400 mt-1">
                    {selectedRun.statusId}
                  </p>
                </div>
              </div>

              {selectedRun.description && (
                <div className="p-3 rounded-lg bg-slate-800/40 text-xs text-slate-300">
                  <span className="font-semibold text-slate-400">{t.wizard.description}: </span>
                  {selectedRun.description}
                </div>
              )}

              {/* Source Invoices */}
              <div>
                <h4 className="text-xs uppercase font-semibold text-slate-400 mb-2">
                  {t.table.sources} ({selectedRun.sourceInvoiceCount || 0})
                </h4>
                {selectedRun.sourceInvoiceIds && selectedRun.sourceInvoiceIds.length > 0 ? (
                  <div className="rounded-lg border border-slate-800 p-3 bg-slate-900/50 flex flex-wrap gap-2">
                    {selectedRun.sourceInvoiceIds.map((srcId) => (
                      <span key={srcId} className="px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-indigo-300 border border-slate-700/50">
                        #{srcId}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No associated source invoices recorded.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="ds-btn-secondary text-sm"
              >
                {common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
