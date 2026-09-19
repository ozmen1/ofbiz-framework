import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCheck,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Eye,
  Printer,
  Ban,
  CheckSquare,
  Square,
  DollarSign,
  AlertTriangle,
  X,
  CreditCard,
} from 'lucide-react';
import {
  api,
  CheckRunItem,
  CheckRunStats,
  CheckRunDetail,
  PayableInvoiceItem,
  CheckVoucherItem,
  CheckRunMetadataResponse,
} from '../services/api';
import { useTranslation } from '../i18n';

export const CheckRun: React.FC = () => {
  const { translations, locale } = useTranslation();
  const t = translations.checkRun;
  const common = translations.common;

  // Active Tab: 'check-runs' or 'new-run'
  const [activeTab, setActiveTab] = useState<'check-runs' | 'new-run'>('check-runs');

  // State
  const [runs, setRuns] = useState<CheckRunItem[]>([]);
  const [stats, setStats] = useState<CheckRunStats>({
    totalCheckRuns: 0,
    totalChecksIssued: 0,
    totalVoidedChecks: 0,
    totalCheckVolume: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail Modal State
  const [selectedRunDetail, setSelectedRunDetail] = useState<CheckRunDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Print Modal State
  const [vouchers, setVouchers] = useState<CheckVoucherItem[]>([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  // Wizard / New Run State
  const [metadata, setMetadata] = useState<CheckRunMetadataResponse['metadata'] | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [startCheckNumber, setStartCheckNumber] = useState<number>(100101);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [runName, setRunName] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState('');
  const [payableInvoices, setPayableInvoices] = useState<PayableInvoiceItem[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [creatingRun, setCreatingRun] = useState(false);

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

  // Load Check Runs List
  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCheckRuns(search);
      setRuns(res.checkRuns || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setLoading(false);
    }
  }, [search, common.error]);

  // Load Wizard Invoices & Metadata
  const loadWizardData = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const [metaRes, invRes] = await Promise.all([
        api.getCheckRunMetadata(),
        api.getPayableInvoicesForCheckRun({
          vendorPartyId: vendorFilter || undefined,
          asOfDate: dueDateFilter || undefined,
        }),
      ]);

      if (metaRes.metadata) {
        setMetadata(metaRes.metadata);
        if (metaRes.metadata.paymentMethods.length > 0 && !selectedPaymentMethodId) {
          setSelectedPaymentMethodId(metaRes.metadata.paymentMethods[0].paymentMethodId);
        }
        if (metaRes.metadata.nextCheckNumber) {
          setStartCheckNumber(metaRes.metadata.nextCheckNumber);
        }
      }

      setPayableInvoices(invRes.payableInvoices || []);
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setInvoicesLoading(false);
    }
  }, [vendorFilter, dueDateFilter, selectedPaymentMethodId, common.error]);

  useEffect(() => {
    if (activeTab === 'check-runs') {
      loadRuns();
    } else {
      loadWizardData();
    }
  }, [activeTab, loadRuns, loadWizardData]);

  // View Details of a Run
  const handleViewDetail = async (paymentGroupId: string) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await api.getCheckRunDetail(paymentGroupId);
      setSelectedRunDetail(res.checkRun);
    } catch (err: any) {
      setError(err.message || common.error);
      setShowDetailModal(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Cancel entire check run
  const handleCancelCheckRun = async (paymentGroupId: string) => {
    if (!window.confirm(t.detail.confirmCancelRun)) return;
    setActionLoading(true);
    try {
      const res = await api.cancelCheckRun(paymentGroupId);
      showSuccessMsg(res._EVENT_MESSAGE_ || t.messages.cancelledSuccess);
      loadRuns();
      if (showDetailModal) {
        setShowDetailModal(false);
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setActionLoading(false);
    }
  };

  // Void single check
  const handleVoidCheck = async (paymentId: string) => {
    if (!window.confirm(t.detail.confirmVoidCheck)) return;
    setActionLoading(true);
    try {
      const res = await api.voidPaymentRecord(paymentId);
      showSuccessMsg(res._EVENT_MESSAGE_ || t.messages.voidedSuccess);
      if (selectedRunDetail) {
        const updated = await api.getCheckRunDetail(selectedRunDetail.paymentGroupId);
        setSelectedRunDetail(updated.checkRun);
      }
      loadRuns();
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Print Modal for check run or check
  const handleOpenPrintModal = async (params: { paymentGroupId?: string; paymentId?: string }) => {
    setPrintLoading(true);
    setShowPrintModal(true);
    try {
      const res = await api.getCheckPrintData(params);
      setVouchers(res.vouchers || []);
    } catch (err: any) {
      setError(err.message || common.error);
      setShowPrintModal(false);
    } finally {
      setPrintLoading(false);
    }
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Toggle invoice selection in wizard
  const toggleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(invoiceId) ? prev.filter(id => id !== invoiceId) : [...prev, invoiceId]
    );
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoiceIds.length === payableInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(payableInvoices.map(i => i.invoiceId));
    }
  };

  // Calculate selected total in wizard
  const selectedInvoicesTotal = payableInvoices
    .filter(i => selectedInvoiceIds.includes(i.invoiceId))
    .reduce((acc, curr) => acc + (curr.outstandingAmount || 0), 0);

  // Submit Check Run Wizard
  const handleCreateCheckRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentMethodId) {
      setError(t.messages.selectBank);
      return;
    }
    if (selectedInvoiceIds.length === 0) {
      setError(t.messages.selectAtLeastOne);
      return;
    }

    setCreatingRun(true);
    setError(null);
    try {
      const res = await api.createCheckRun({
        paymentMethodId: selectedPaymentMethodId,
        invoiceIds: selectedInvoiceIds,
        checkStartNumber: Number(startCheckNumber),
        paymentGroupName: runName || undefined,
      });

      showSuccessMsg(res._EVENT_MESSAGE_ || t.messages.createdSuccess);
      setSelectedInvoiceIds([]);
      setRunName('');
      setActiveTab('check-runs');

      // Optionally offer to print right away
      if (res.paymentGroupId) {
        handleOpenPrintModal({ paymentGroupId: res.paymentGroupId });
      }
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setCreatingRun(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileCheck className="text-emerald-400" size={26} />
            {t.title}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeTab === 'check-runs') loadRuns();
              else loadWizardData();
            }}
            className="ds-btn-secondary flex items-center gap-2"
            disabled={loading || invoicesLoading}
          >
            <RefreshCw size={16} className={loading || invoicesLoading ? 'animate-spin' : ''} />
            {common.refresh}
          </button>

          {activeTab === 'check-runs' ? (
            <button
              onClick={() => setActiveTab('new-run')}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              {t.tabs.newCheckRun}
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('check-runs')}
              className="ds-btn-secondary flex items-center gap-2"
            >
              <FileCheck size={16} />
              {t.tabs.checkRuns}
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="ds-alert-success flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="ds-alert-error flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.stats.totalRuns}</span>
            <FileCheck className="text-emerald-400/60" size={20} />
          </div>
          <p className="ds-stat-value text-emerald-400">{stats.totalCheckRuns}</p>
          <span className="ds-stat-sub">{common.all}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.stats.issuedChecks}</span>
            <CheckCircle2 className="text-blue-400/60" size={20} />
          </div>
          <p className="ds-stat-value text-blue-400">{stats.totalChecksIssued}</p>
          <span className="ds-stat-sub">{common.active}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.stats.voidedChecks}</span>
            <AlertTriangle className="text-rose-400/60" size={20} />
          </div>
          <p className="ds-stat-value text-rose-400">{stats.totalVoidedChecks}</p>
          <span className="ds-stat-sub">{locale === 'tr' ? 'Hükümsüz / İptal' : 'Voided'}</span>
        </div>

        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.stats.totalVolume}</span>
            <DollarSign className="text-indigo-400/60" size={20} />
          </div>
          <p className="ds-stat-value text-indigo-300">
            {formatCurrency(stats.totalCheckVolume)}
          </p>
          <span className="ds-stat-sub">{common.total}</span>
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'check-runs' ? (
        /* TAB 1: Check Runs List */
        <div className="space-y-4">
          {/* Search bar */}
          <div className="ds-card p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`${common.search}...`}
                className="ds-input pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{t.table.groupId}</th>
                    <th className="ds-th">{t.table.name}</th>
                    <th className="ds-th">{t.table.date}</th>
                    <th className="ds-th text-center">{t.table.checkCount}</th>
                    <th className="ds-th text-right">{t.table.amount}</th>
                    <th className="ds-th text-center">{t.table.status}</th>
                    <th className="ds-th text-right">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12">
                        <div className="ds-spinner mx-auto mb-2" />
                        <span className="text-sm text-slate-400">{common.loading}</span>
                      </td>
                    </tr>
                  ) : runs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        {t.table.noRuns}
                      </td>
                    </tr>
                  ) : (
                    runs.map(r => (
                      <tr key={r.paymentGroupId} className="ds-tbody-row hover:bg-slate-800/40 transition-colors">
                        <td className="ds-td font-mono font-medium text-emerald-400">
                          #{r.paymentGroupId}
                        </td>
                        <td className="ds-td">
                          <span className="font-semibold text-white">{r.paymentGroupName}</span>
                          {r.paymentMethodId && (
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {r.paymentMethodId}
                            </p>
                          )}
                        </td>
                        <td className="ds-td text-sm text-slate-300">
                          {r.fromDate || '—'}
                        </td>
                        <td className="ds-td text-center">
                          <span className="ds-badge ds-badge-blue">
                            {r.checkCount} {locale === 'tr' ? 'çek' : 'checks'}
                          </span>
                          {r.voidedCheckCount > 0 && (
                            <span className="ds-badge ds-badge-red ml-1.5 text-xs">
                              {r.voidedCheckCount} {locale === 'tr' ? 'iptal' : 'void'}
                            </span>
                          )}
                        </td>
                        <td className="ds-td text-right font-semibold text-emerald-400">
                          {formatCurrency(r.totalAmount)}
                        </td>
                        <td className="ds-td text-center">
                          <span
                            className={`ds-badge ${
                              r.status === 'ACTIVE' ? 'ds-badge-green' : 'ds-badge-red'
                            }`}
                          >
                            {r.status === 'ACTIVE' ? common.active : (locale === 'tr' ? 'İptal Edildi' : 'Cancelled')}
                          </span>
                        </td>
                        <td className="ds-td text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetail(r.paymentGroupId)}
                              className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 hover:text-white transition-colors"
                              title={common.details}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenPrintModal({ paymentGroupId: r.paymentGroupId })}
                              className="p-1.5 hover:bg-slate-700/60 rounded text-indigo-300 hover:text-indigo-200 transition-colors"
                              title={t.detail.printChecks}
                            >
                              <Printer size={16} />
                            </button>
                            {r.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleCancelCheckRun(r.paymentGroupId)}
                                className="p-1.5 hover:bg-rose-500/20 rounded text-rose-400 hover:text-rose-300 transition-colors"
                                title={t.detail.cancelRun}
                                disabled={actionLoading}
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: New Check Run Wizard */
        <form onSubmit={handleCreateCheckRun} className="space-y-6">
          <div className="ds-card p-6 space-y-5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-700/60 pb-3">
              <CreditCard className="text-emerald-400" size={20} />
              {t.wizard.title}
            </h2>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="ds-label">{t.wizard.bankAccount} *</label>
                <select
                  value={selectedPaymentMethodId}
                  onChange={e => setSelectedPaymentMethodId(e.target.value)}
                  className="ds-select"
                  required
                >
                  <option value="">{t.wizard.selectBankAccount}</option>
                  {metadata?.paymentMethods.map(pm => (
                    <option key={pm.paymentMethodId} value={pm.paymentMethodId}>
                      {pm.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">{t.wizard.startCheckNumber} *</label>
                <input
                  type="number"
                  value={startCheckNumber}
                  onChange={e => setStartCheckNumber(Number(e.target.value))}
                  className="ds-input font-mono"
                  required
                />
                <span className="text-xs text-slate-400 mt-1 block">
                  {t.wizard.startCheckNumberHelp}
                </span>
              </div>

              <div>
                <label className="ds-label">{t.wizard.paymentDate} *</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="ds-input"
                  required
                />
              </div>

              <div>
                <label className="ds-label">{t.wizard.runName}</label>
                <input
                  type="text"
                  value={runName}
                  onChange={e => setRunName(e.target.value)}
                  placeholder={t.wizard.runNamePlaceholder}
                  className="ds-input"
                />
              </div>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <label className="ds-label">{t.wizard.filterVendor}</label>
                <select
                  value={vendorFilter}
                  onChange={e => setVendorFilter(e.target.value)}
                  className="ds-select"
                >
                  <option value="">{t.wizard.allVendors}</option>
                  {metadata?.vendors.map(v => (
                    <option key={v.partyId} value={v.partyId}>
                      {v.name} ({v.partyId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">{t.wizard.dueDateBefore}</label>
                <input
                  type="date"
                  value={dueDateFilter}
                  onChange={e => setDueDateFilter(e.target.value)}
                  className="ds-input"
                />
              </div>
            </div>
          </div>

          {/* Invoices Selection Card */}
          <div className="ds-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <div>
                <h3 className="text-md font-semibold text-white">
                  {t.wizard.availableInvoices} ({payableInvoices.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.wizard.selectedCount}:{' '}
                  <span className="text-emerald-400 font-bold">{selectedInvoiceIds.length}</span> |{' '}
                  {t.wizard.selectedTotal}:{' '}
                  <span className="text-emerald-400 font-bold">
                    {formatCurrency(selectedInvoicesTotal)}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleSelectAllInvoices}
                className="ds-btn-secondary text-xs flex items-center gap-1.5"
                disabled={payableInvoices.length === 0}
              >
                {selectedInvoiceIds.length === payableInvoices.length ? (
                  <>
                    <Square size={14} />
                    {t.wizard.deselectAll}
                  </>
                ) : (
                  <>
                    <CheckSquare size={14} />
                    {t.wizard.selectAll}
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th w-12 text-center">
                      <span className="sr-only">Select</span>
                    </th>
                    <th className="ds-th">{t.wizard.invoiceId}</th>
                    <th className="ds-th">{t.wizard.vendor}</th>
                    <th className="ds-th">{t.wizard.invoiceDate}</th>
                    <th className="ds-th">{t.wizard.dueDate}</th>
                    <th className="ds-th text-right">{t.wizard.openAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10">
                        <div className="ds-spinner mx-auto mb-2" />
                        <span className="text-sm text-slate-400">{common.loading}</span>
                      </td>
                    </tr>
                  ) : payableInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        {t.wizard.noPayableInvoices}
                      </td>
                    </tr>
                  ) : (
                    payableInvoices.map(inv => {
                      const isSelected = selectedInvoiceIds.includes(inv.invoiceId);
                      return (
                        <tr
                          key={inv.invoiceId}
                          onClick={() => toggleSelectInvoice(inv.invoiceId)}
                          className={`ds-tbody-row cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-950/30' : 'hover:bg-slate-800/40'
                          }`}
                        >
                          <td className="ds-td text-center">
                            {isSelected ? (
                              <CheckSquare className="text-emerald-400 mx-auto" size={18} />
                            ) : (
                              <Square className="text-slate-500 mx-auto" size={18} />
                            )}
                          </td>
                          <td className="ds-td font-mono font-medium text-emerald-400">
                            #{inv.invoiceId}
                          </td>
                          <td className="ds-td">
                            <span className="font-semibold text-white">{inv.vendorName}</span>
                            <span className="text-xs text-slate-400 font-mono block">
                              {inv.partyIdFrom}
                            </span>
                          </td>
                          <td className="ds-td text-sm text-slate-300">
                            {inv.invoiceDate || '—'}
                          </td>
                          <td className="ds-td text-sm text-slate-300">
                            {inv.dueDate || '—'}
                          </td>
                          <td className="ds-td text-right font-semibold text-white">
                            {formatCurrency(inv.outstandingAmount, inv.currencyUomId)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 ds-card p-5 bg-slate-900/90 border border-emerald-500/30">
            <div>
              <p className="text-sm text-slate-300">
                {locale === 'tr'
                  ? 'Çekler oluşturulduktan sonra çek numaraları atanacak ve faturalarla kapatılacaktır.'
                  : 'Checks will be generated with sequential check numbers and applied to the selected invoices.'}
              </p>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                {selectedInvoiceIds.length} {t.wizard.selectedCount} &bull;{' '}
                {formatCurrency(selectedInvoicesTotal)} {t.wizard.selectedTotal}
              </p>
            </div>

            <button
              type="submit"
              disabled={creatingRun || selectedInvoiceIds.length === 0}
              className="ds-btn-primary px-6 py-2.5 flex items-center gap-2 disabled:opacity-50"
            >
              {creatingRun ? (
                <div className="ds-spinner mr-2" />
              ) : (
                <FileCheck size={18} />
              )}
              {t.wizard.createRunButton}
            </button>
          </div>
        </form>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="ds-card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCheck className="text-emerald-400" size={22} />
                {t.detail.title} #{selectedRunDetail?.paymentGroupId}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 text-center">
                <div className="ds-spinner mx-auto mb-2" />
                <span className="text-sm text-slate-400">{common.loading}</span>
              </div>
            ) : selectedRunDetail ? (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-700/40">
                  <div>
                    <span className="text-xs text-slate-400 block">{t.table.name}</span>
                    <strong className="text-white text-base">
                      {selectedRunDetail.paymentGroupName}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">{t.table.date}</span>
                    <strong className="text-white text-base">
                      {selectedRunDetail.fromDate || '—'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">{t.table.amount}</span>
                    <strong className="text-emerald-400 text-lg">
                      {formatCurrency(selectedRunDetail.totalAmount)}
                    </strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() =>
                      handleOpenPrintModal({
                        paymentGroupId: selectedRunDetail.paymentGroupId,
                      })
                    }
                    className="ds-btn-secondary flex items-center gap-2 text-xs"
                  >
                    <Printer size={15} />
                    {t.detail.printChecks}
                  </button>

                  {!selectedRunDetail.thruDate && (
                    <button
                      onClick={() => handleCancelCheckRun(selectedRunDetail.paymentGroupId)}
                      className="ds-btn-danger flex items-center gap-2 text-xs"
                      disabled={actionLoading}
                    >
                      <Ban size={15} />
                      {t.detail.cancelRun}
                    </button>
                  )}
                </div>

                {/* Checks List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-slate-300">
                    {t.detail.checksList} ({selectedRunDetail.checks.length})
                  </h4>

                  <div className="overflow-x-auto border border-slate-700/50 rounded-xl">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.detail.checkNumber}</th>
                          <th className="ds-th">{t.detail.payee}</th>
                          <th className="ds-th text-right">{t.detail.amount}</th>
                          <th className="ds-th text-center">{t.detail.status}</th>
                          <th className="ds-th">{t.detail.appliedInvoices}</th>
                          <th className="ds-th text-right">{t.table.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRunDetail.checks.map(chk => (
                          <tr key={chk.paymentId} className="ds-tbody-row">
                            <td className="ds-td font-mono font-bold text-indigo-400">
                              #{chk.paymentRefNum}
                            </td>
                            <td className="ds-td">
                              <span className="font-semibold text-white">{chk.payeeName}</span>
                              <span className="text-xs text-slate-400 font-mono block">
                                {chk.partyIdTo}
                              </span>
                            </td>
                            <td className="ds-td text-right font-semibold text-emerald-400">
                              {formatCurrency(chk.amount, chk.currencyUomId)}
                            </td>
                            <td className="ds-td text-center">
                              <span
                                className={`ds-badge ${
                                  chk.statusId === 'PMNT_VOID'
                                    ? 'ds-badge-red'
                                    : chk.statusId === 'PMNT_SENT'
                                    ? 'ds-badge-green'
                                    : 'ds-badge-slate'
                                }`}
                              >
                                {chk.statusDesc}
                              </span>
                            </td>
                            <td className="ds-td text-xs text-slate-300">
                              {chk.appliedInvoices.length > 0 ? (
                                <div className="space-y-1">
                                  {chk.appliedInvoices.map(inv => (
                                    <div key={inv.paymentApplicationId} className="flex gap-2 font-mono">
                                      <span className="text-indigo-300">#{inv.invoiceId}</span>
                                      <span className="text-slate-400">
                                        ({formatCurrency(inv.amountApplied, chk.currencyUomId)})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="ds-td text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleOpenPrintModal({ paymentId: chk.paymentId })}
                                  className="p-1 hover:bg-slate-700/60 rounded text-indigo-300 hover:text-white transition-colors"
                                  title={common.print}
                                >
                                  <Printer size={14} />
                                </button>
                                {chk.statusId !== 'PMNT_VOID' && chk.statusId !== 'PMNT_CANCELLED' && (
                                  <button
                                    onClick={() => handleVoidCheck(chk.paymentId)}
                                    className="p-1 hover:bg-rose-500/20 rounded text-rose-400 hover:text-rose-300 transition-colors"
                                    title={t.detail.voidCheck}
                                    disabled={actionLoading}
                                  >
                                    <Ban size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Print Voucher Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="ds-card w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-6 bg-slate-900 border border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 no-print">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Printer className="text-emerald-400" size={22} />
                {t.voucher.title} ({vouchers.length})
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={handlePrint} className="ds-btn-primary flex items-center gap-1.5 text-xs">
                  <Printer size={14} />
                  {t.voucher.print}
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {printLoading ? (
              <div className="py-16 text-center">
                <div className="ds-spinner mx-auto mb-2" />
                <span className="text-sm text-slate-400">{common.loading}</span>
              </div>
            ) : vouchers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                {common.noData}
              </div>
            ) : (
              <div className="space-y-8 print-container">
                {vouchers.map(v => (
                  <div
                    key={v.paymentId}
                    className="border-2 border-slate-600 rounded-xl p-6 bg-slate-950 text-slate-100 shadow-2xl space-y-6 font-serif page-break-after"
                  >
                    {/* Top Check Row: Payer & Check Info */}
                    <div className="flex justify-between items-start border-b border-slate-700 pb-4">
                      <div>
                        <h2 className="text-lg font-bold tracking-wider uppercase text-white font-sans">
                          {v.payer.name}
                        </h2>
                        <p className="text-xs text-slate-400 font-sans mt-0.5">
                          {v.payer.bankName} &bull; Acc: {v.payer.accountNumber}
                        </p>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-emerald-400 tracking-wider">
                          CHECK NO. {v.checkNumber}
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                          DATE: {v.date}
                        </div>
                      </div>
                    </div>

                    {/* Pay To Order Row */}
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                        <div className="flex-1 border-b-2 border-slate-700 pb-1">
                          <span className="text-xs uppercase tracking-widest text-slate-400 font-sans block">
                            {t.voucher.payToOrderOf}
                          </span>
                          <span className="text-lg font-bold text-white tracking-wide font-sans">
                            {v.payee.name}
                          </span>
                        </div>

                        <div className="border-2 border-emerald-500/60 bg-emerald-950/40 px-4 py-1.5 rounded-lg text-right font-mono">
                          <span className="text-xs text-slate-400 block font-sans">
                            {t.voucher.dollars}
                          </span>
                          <span className="text-xl font-bold text-emerald-300">
                            {formatCurrency(v.amount, v.currencyUomId)}
                          </span>
                        </div>
                      </div>

                      {/* Words Row */}
                      <div className="border-b-2 border-slate-700 pb-1">
                        <span className="text-xs uppercase tracking-widest text-slate-400 font-sans block">
                          {t.voucher.amountWords}
                        </span>
                        <span className="text-sm italic font-medium text-slate-200">
                          {locale === 'tr' ? v.amountInWordsTr : v.amountInWordsEn}
                        </span>
                      </div>
                    </div>

                    {/* Memo & Signature */}
                    <div className="flex justify-between items-end pt-3">
                      <div className="max-w-xs text-xs font-sans text-slate-300">
                        <span className="text-slate-400 uppercase font-semibold block">
                          {t.voucher.memo}:
                        </span>
                        <p className="italic text-slate-200 mt-0.5">{v.memo || '—'}</p>
                      </div>

                      <div className="w-56 text-center border-t-2 border-slate-600 pt-1 font-sans">
                        <span className="text-xs text-slate-400 block uppercase">
                          {t.voucher.authorizedSignature}
                        </span>
                      </div>
                    </div>

                    {/* Remittance Stub below check */}
                    <div className="border-t-2 border-dashed border-slate-700 pt-4 font-sans space-y-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        {t.voucher.voucherStub}
                      </span>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="py-1.5">{t.voucher.invoiceRef}</th>
                              <th className="py-1.5">{common.date}</th>
                              <th className="py-1.5">{common.description}</th>
                              <th className="py-1.5 text-right">{t.voucher.paidAmount}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.invoices.map((inv, idx) => (
                              <tr key={idx} className="border-b border-slate-900 text-slate-300">
                                <td className="py-1.5 font-mono">#{inv.invoiceId}</td>
                                <td className="py-1.5">{inv.invoiceDate || '—'}</td>
                                <td className="py-1.5">{inv.description || 'Vendor invoice payment'}</td>
                                <td className="py-1.5 text-right font-mono font-semibold text-emerald-400">
                                  {formatCurrency(inv.amountApplied, v.currencyUomId)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default CheckRun;
