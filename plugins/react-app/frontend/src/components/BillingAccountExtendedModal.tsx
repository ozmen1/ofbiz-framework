import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CreditCard,
  FileText,
  DollarSign,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Check,
  Building2,
  Calendar,
  Layers,
  Printer,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  BillingAccountStatementResponse,
  CreateBillingAccountRolePayload,
  CreateBillingAccountTermPayload,
  ApplyPaymentToBillingAccountPayload,
} from '../services/api';
import { useTranslation } from '../i18n';

interface BillingAccountExtendedModalProps {
  billingAccountId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAccountUpdated?: () => void;
}

type TabType = 'overview' | 'statement' | 'roles' | 'terms' | 'payments';

export const BillingAccountExtendedModal: React.FC<BillingAccountExtendedModalProps> = ({
  billingAccountId,
  isOpen,
  onClose,
  onAccountUpdated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.billingAccountExtended;
  const tc = translations.common;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<BillingAccountStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Statement date filters
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');

  // Modals inside tabs
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [showAddTermModal, setShowAddTermModal] = useState(false);
  const [showApplyPaymentModal, setShowApplyPaymentModal] = useState(false);

  // Form states
  const [roleForm, setRoleForm] = useState<CreateBillingAccountRolePayload>({
    billingAccountId: '',
    partyId: '',
    roleTypeId: 'BILL_TO_CUSTOMER',
    fromDate: '',
    thruDate: '',
  });

  const [termForm, setTermForm] = useState<CreateBillingAccountTermPayload>({
    billingAccountId: '',
    termTypeId: 'FIN_PAYMENT_TERM',
    termValue: 0,
    termDays: 30,
    description: '',
  });

  const [paymentForm, setPaymentForm] = useState<ApplyPaymentToBillingAccountPayload>({
    billingAccountId: '',
    paymentId: '',
    amountApplied: 0,
  });

  const fetchData = useCallback(async () => {
    if (!billingAccountId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getBillingAccountStatement(billingAccountId, fromDate || undefined, thruDate || undefined);
      setData(res);
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Cari hesap verileri alınamadı.' : 'Failed to load billing account details.'));
    } finally {
      setLoading(false);
    }
  }, [billingAccountId, fromDate, thruDate, isTr]);

  useEffect(() => {
    if (isOpen && billingAccountId) {
      fetchData();
    }
  }, [isOpen, billingAccountId, fetchData]);

  const fmt = (val?: number | null, curr = 'USD') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingAccountId || !roleForm.partyId) return;
    try {
      setLoading(true);
      const res = await api.createBillingAccountRole({
        ...roleForm,
        billingAccountId,
      });
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Rol başarıyla eklendi.' : 'Role added successfully.'));
      setShowAddRoleModal(false);
      setRoleForm({
        billingAccountId: '',
        partyId: '',
        roleTypeId: 'BILL_TO_CUSTOMER',
        fromDate: '',
        thruDate: '',
      });
      await fetchData();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Rol eklenirken hata oluştu.' : 'Failed to add role.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (partyId: string, roleTypeId: string, fDate: string) => {
    if (!billingAccountId) return;
    if (!window.confirm(t.roles.deleteRoleConfirm)) return;
    try {
      setLoading(true);
      const res = await api.removeBillingAccountRole(billingAccountId, partyId, roleTypeId, fDate);
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Rol kaldırıldı.' : 'Role removed.'));
      await fetchData();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Rol silinemedi.' : 'Failed to delete role.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingAccountId || !termForm.termTypeId) return;
    try {
      setLoading(true);
      const res = await api.createBillingAccountTerm({
        ...termForm,
        billingAccountId,
      });
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Şart başarıyla tanımlandı.' : 'Term created successfully.'));
      setShowAddTermModal(false);
      setTermForm({
        billingAccountId: '',
        termTypeId: 'FIN_PAYMENT_TERM',
        termValue: 0,
        termDays: 30,
        description: '',
      });
      await fetchData();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Şart eklenemedi.' : 'Failed to add term.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTerm = async (termId: string) => {
    if (!termId) return;
    if (!window.confirm(t.terms.deleteTermConfirm)) return;
    try {
      setLoading(true);
      const res = await api.removeBillingAccountTerm(termId);
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Şart silindi.' : 'Term deleted.'));
      await fetchData();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Şart silinemedi.' : 'Failed to delete term.'));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingAccountId || !paymentForm.paymentId || !paymentForm.amountApplied) return;
    try {
      setLoading(true);
      const res = await api.applyPaymentToBillingAccount({
        ...paymentForm,
        billingAccountId,
      });
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Ödeme cari hesaba uygulandı.' : 'Payment applied successfully.'));
      setShowApplyPaymentModal(false);
      setPaymentForm({
        billingAccountId: '',
        paymentId: '',
        amountApplied: 0,
      });
      await fetchData();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Ödeme uygulanamadı.' : 'Failed to apply payment.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePaymentApp = async (paymentAppId: string) => {
    if (!paymentAppId) return;
    if (!window.confirm(t.payments.removeApplicationConfirm)) return;
    try {
      setLoading(true);
      const res = await api.removeBillingAccountPaymentApplication(paymentAppId);
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Tahsisat kaldırıldı.' : 'Payment application removed.'));
      await fetchData();
      if (onAccountUpdated) onAccountUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Tahsisat kaldırılamadı.' : 'Failed to remove application.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const curr = data?.account?.accountCurrencyUomId || 'USD';
  const util = data?.summary?.utilizationPercent || 0;
  const utilColor =
    util > 90 ? 'bg-rose-500' : util > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="ds-overlay">
      <div className="ds-modal max-w-5xl max-h-[92vh] flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard size={22} className="text-indigo-400" />
              {t.title}: #{billingAccountId}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="ds-tab-bar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'overview' ? 'ds-tab-active' : ''}`}
          >
            <Layers size={16} />
            {t.tabs.overview}
          </button>
          <button
            onClick={() => setActiveTab('statement')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'statement' ? 'ds-tab-active' : ''}`}
          >
            <FileText size={16} />
            {t.tabs.statement}
            {data?.entries && data.entries.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {data.entries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'roles' ? 'ds-tab-active' : ''}`}
          >
            <Building2 size={16} />
            {t.tabs.roles}
            {data?.roles && data.roles.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {data.roles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'terms' ? 'ds-tab-active' : ''}`}
          >
            <Clock size={16} />
            {t.tabs.terms}
            {data?.terms && data.terms.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {data.terms.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'payments' ? 'ds-tab-active' : ''}`}
          >
            <DollarSign size={16} />
            {t.tabs.payments}
            {data?.appliedPayments && data.appliedPayments.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {data.appliedPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto min-h-[360px] pr-1">
          {loading && !data ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="animate-spin text-indigo-400" size={32} />
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && data && (
                <div className="space-y-5">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="ds-stat-card border-l-4 border-l-indigo-500">
                      <div className="ds-stat-label">{translations.advancedAccounting.billingAccounts.totalLimit}</div>
                      <div className="ds-stat-value text-indigo-400">{fmt(data.account.accountLimit, curr)}</div>
                    </div>
                    <div className="ds-stat-card border-l-4 border-l-rose-500">
                      <div className="ds-stat-label">{t.statement.totalDebits}</div>
                      <div className="ds-stat-value text-rose-400">{fmt(data.summary.totalDebits, curr)}</div>
                    </div>
                    <div className="ds-stat-card border-l-4 border-l-emerald-500">
                      <div className="ds-stat-label">{t.statement.totalCredits}</div>
                      <div className="ds-stat-value text-emerald-400">{fmt(data.summary.totalCredits, curr)}</div>
                    </div>
                    <div className="ds-stat-card border-l-4 border-l-cyan-500">
                      <div className="ds-stat-label">{t.statement.availableCredit}</div>
                      <div className="ds-stat-value text-cyan-400">{fmt(data.summary.availableBalance, curr)}</div>
                    </div>
                  </div>

                  {/* Credit Utilization Bar */}
                  <div className="ds-card p-5 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-semibold text-slate-200 flex items-center gap-2">
                        <TrendingUp size={16} className="text-indigo-400" />
                        {t.statement.utilization}
                      </span>
                      <span className="font-mono font-bold text-white">%{util.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-700/50">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${utilColor}`}
                        style={{ width: `${Math.min(util, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>{fmt(0, curr)}</span>
                      <span>
                        {t.statement.netBalance}:{' '}
                        <strong className="text-white">{fmt(data.summary.netBalance, curr)}</strong>
                      </span>
                      <span>{fmt(data.account.accountLimit, curr)}</span>
                    </div>
                  </div>

                  {/* Account Metadata Details */}
                  <div className="ds-card p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400 text-xs">{tc.description}</div>
                      <div className="font-medium text-white mt-1">
                        {data.account.description || (isTr ? 'Açıklama belirtilmemiş' : 'No description')}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">{translations.advancedAccounting.billingAccounts.currency}</div>
                      <div className="font-medium text-white mt-1">{data.account.accountCurrencyUomId}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">{translations.advancedAccounting.billingAccounts.fromDate}</div>
                      <div className="font-medium text-white mt-1">
                        {data.account.fromDate ? data.account.fromDate.substring(0, 10) : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs">{translations.advancedAccounting.billingAccounts.thruDate}</div>
                      <div className="font-medium text-white mt-1">
                        {data.account.thruDate ? data.account.thruDate.substring(0, 10) : (isTr ? 'Süresiz' : 'Open-ended')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STATEMENT LEDGER */}
              {activeTab === 'statement' && data && (
                <div className="space-y-4">
                  {/* Filters & Actions */}
                  <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-xs text-slate-300">{t.statement.dateRange}:</span>
                      </div>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="ds-input py-1 text-xs w-36"
                      />
                      <span className="text-slate-400">-</span>
                      <input
                        type="date"
                        value={thruDate}
                        onChange={(e) => setThruDate(e.target.value)}
                        className="ds-input py-1 text-xs w-36"
                      />
                      <button onClick={fetchData} className="ds-btn-primary py-1 px-3 text-xs">
                        {t.statement.filter}
                      </button>
                      {(fromDate || thruDate) && (
                        <button
                          onClick={() => {
                            setFromDate('');
                            setThruDate('');
                          }}
                          className="ds-btn-secondary py-1 px-3 text-xs"
                        >
                          {t.statement.allDates}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="ds-btn-secondary py-1 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      {t.statement.printStatement}
                    </button>
                  </div>

                  {/* Summary row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="ds-stat-card p-3 border-l-2 border-l-rose-500">
                      <div className="text-xs text-slate-400">{t.statement.totalDebits}</div>
                      <div className="text-sm font-bold text-rose-400">{fmt(data.summary.totalDebits, curr)}</div>
                    </div>
                    <div className="ds-stat-card p-3 border-l-2 border-l-emerald-500">
                      <div className="text-xs text-slate-400">{t.statement.totalCredits}</div>
                      <div className="text-sm font-bold text-emerald-400">{fmt(data.summary.totalCredits, curr)}</div>
                    </div>
                    <div className="ds-stat-card p-3 border-l-2 border-l-amber-500">
                      <div className="text-xs text-slate-400">{t.statement.netBalance}</div>
                      <div className="text-sm font-bold text-amber-400">{fmt(data.summary.netBalance, curr)}</div>
                    </div>
                    <div className="ds-stat-card p-3 border-l-2 border-l-indigo-500">
                      <div className="text-xs text-slate-400">{t.statement.availableCredit}</div>
                      <div className="text-sm font-bold text-indigo-400">{fmt(data.summary.availableBalance, curr)}</div>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.statement.entryDate}</th>
                          <th className="ds-th text-center">{t.statement.entryType}</th>
                          <th className="ds-th">{t.statement.refNum}</th>
                          <th className="ds-th">{t.statement.description}</th>
                          <th className="ds-th-right text-rose-400">{t.statement.debit}</th>
                          <th className="ds-th-right text-emerald-400">{t.statement.credit}</th>
                          <th className="ds-th-right text-indigo-300">{t.statement.balance}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.entries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="ds-td text-center text-slate-400 py-10">
                              {t.statement.noEntries}
                            </td>
                          </tr>
                        ) : (
                          data.entries.map((entry) => (
                            <tr key={entry.id} className="ds-tbody-row hover:bg-slate-800/60">
                              <td className="ds-td font-mono text-xs text-slate-300">
                                {entry.entryDate?.substring(0, 10)}
                              </td>
                              <td className="ds-td text-center">
                                <span
                                  className={`ds-badge text-xs ${
                                    entry.entryType === 'INVOICE'
                                      ? 'ds-badge-red'
                                      : 'ds-badge-green'
                                  }`}
                                >
                                  {entry.entryType === 'INVOICE' ? t.statement.invoice : t.statement.payment}
                                </span>
                              </td>
                              <td className="ds-td font-mono font-semibold text-indigo-400">
                                #{entry.refNum}
                              </td>
                              <td className="ds-td">
                                <div className="text-white text-xs font-medium">{entry.description}</div>
                                {entry.partyName && (
                                  <div className="text-[11px] text-slate-400">{entry.partyName}</div>
                                )}
                              </td>
                              <td className="ds-td-right font-mono text-xs text-rose-400 font-semibold">
                                {entry.debit > 0 ? fmt(entry.debit, curr) : '-'}
                              </td>
                              <td className="ds-td-right font-mono text-xs text-emerald-400 font-semibold">
                                {entry.credit > 0 ? fmt(entry.credit, curr) : '-'}
                              </td>
                              <td className="ds-td-right font-mono text-xs text-indigo-300 font-bold">
                                {fmt(entry.runningBalance, curr)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: ROLES */}
              {activeTab === 'roles' && data && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Building2 size={16} className="text-indigo-400" />
                      {t.roles.title} ({data.roles.length})
                    </h3>
                    <button
                      onClick={() => setShowAddRoleModal(true)}
                      className="ds-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      {t.roles.newRole}
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.roles.party}</th>
                          <th className="ds-th">{t.roles.roleType}</th>
                          <th className="ds-th">{t.roles.fromDate}</th>
                          <th className="ds-th">{t.roles.thruDate}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.roles.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="ds-td text-center text-slate-400 py-8">
                              {t.roles.noRoles}
                            </td>
                          </tr>
                        ) : (
                          data.roles.map((r, idx) => (
                            <tr key={idx} className="ds-tbody-row">
                              <td className="ds-td">
                                <div className="font-semibold text-white text-xs">{r.partyName}</div>
                                <div className="font-mono text-[11px] text-slate-400">{r.partyId}</div>
                              </td>
                              <td className="ds-td">
                                <span className="ds-badge ds-badge-blue text-xs">{r.roleTypeId}</span>
                              </td>
                              <td className="ds-td font-mono text-xs text-slate-300">
                                {r.fromDate ? r.fromDate.substring(0, 10) : '-'}
                              </td>
                              <td className="ds-td font-mono text-xs text-slate-300">
                                {r.thruDate ? r.thruDate.substring(0, 10) : (isTr ? 'Aktif' : 'Active')}
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleRemoveRole(r.partyId, r.roleTypeId, r.fromDate)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title={tc.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TERMS */}
              {activeTab === 'terms' && data && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-400" />
                      {t.terms.title} ({data.terms.length})
                    </h3>
                    <button
                      onClick={() => setShowAddTermModal(true)}
                      className="ds-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      {t.terms.newTerm}
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">ID</th>
                          <th className="ds-th">{t.terms.termType}</th>
                          <th className="ds-th-right">{t.terms.termDays}</th>
                          <th className="ds-th-right">{t.terms.termValue}</th>
                          <th className="ds-th">{t.terms.description}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.terms.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="ds-td text-center text-slate-400 py-8">
                              {t.terms.noTerms}
                            </td>
                          </tr>
                        ) : (
                          data.terms.map((term) => (
                            <tr key={term.billingAccountTermId} className="ds-tbody-row">
                              <td className="ds-td font-mono text-xs text-indigo-400">
                                #{term.billingAccountTermId}
                              </td>
                              <td className="ds-td">
                                <span className="ds-badge ds-badge-purple text-xs">{term.termTypeId}</span>
                              </td>
                              <td className="ds-td-right font-mono text-xs text-slate-200">
                                {term.termDays ? `${term.termDays} ${isTr ? 'Gün' : 'Days'}` : '-'}
                              </td>
                              <td className="ds-td-right font-mono text-xs text-slate-200">
                                {term.termValue ? term.termValue : '-'}
                              </td>
                              <td className="ds-td text-xs text-slate-300">{term.description || '-'}</td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleRemoveTerm(term.billingAccountTermId)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title={tc.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: APPLIED PAYMENTS */}
              {activeTab === 'payments' && data && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <DollarSign size={16} className="text-indigo-400" />
                      {t.payments.title} ({data.appliedPayments.length})
                    </h3>
                    <button
                      onClick={() => setShowApplyPaymentModal(true)}
                      className="ds-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      {t.payments.applyPayment}
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.payments.paymentId}</th>
                          <th className="ds-th">{t.payments.partyFrom}</th>
                          <th className="ds-th">{t.payments.effectiveDate}</th>
                          <th className="ds-th text-center">{tc.status}</th>
                          <th className="ds-th-right text-emerald-400">{t.payments.amountApplied}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.appliedPayments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="ds-td text-center text-slate-400 py-8">
                              {t.payments.noPayments}
                            </td>
                          </tr>
                        ) : (
                          data.appliedPayments.map((p) => (
                            <tr key={p.paymentApplicationId} className="ds-tbody-row">
                              <td className="ds-td font-mono font-semibold text-emerald-400 text-xs">
                                #{p.paymentId}
                              </td>
                              <td className="ds-td">
                                <div className="text-white text-xs font-medium">{p.partyNameFrom}</div>
                                <div className="text-[11px] font-mono text-slate-400">{p.partyIdFrom}</div>
                              </td>
                              <td className="ds-td font-mono text-xs text-slate-300">
                                {p.effectiveDate ? p.effectiveDate.substring(0, 10) : '-'}
                              </td>
                              <td className="ds-td text-center">
                                <span className="ds-badge ds-badge-slate text-xs">{p.statusId}</span>
                              </td>
                              <td className="ds-td-right font-mono text-xs text-emerald-400 font-bold">
                                {fmt(p.amountApplied, curr)}
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleRemovePaymentApp(p.paymentApplicationId)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title={tc.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-700/50">
          <button onClick={onClose} className="ds-btn-secondary">
            {tc.close}
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD ROLE */}
      {showAddRoleModal && (
        <div className="ds-overlay z-[60]">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Building2 size={18} className="text-indigo-400" />
                {t.roles.newRole}
              </h3>
              <button
                onClick={() => setShowAddRoleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-3 text-xs">
              <div>
                <label className="ds-label">{t.roles.party} (Party ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="DemoCustomer, 10000, etc."
                  value={roleForm.partyId}
                  onChange={(e) => setRoleForm({ ...roleForm, partyId: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">{t.roles.roleType} *</label>
                <select
                  value={roleForm.roleTypeId}
                  onChange={(e) => setRoleForm({ ...roleForm, roleTypeId: e.target.value })}
                  className="ds-select"
                >
                  <option value="BILL_TO_CUSTOMER">BILL_TO_CUSTOMER (Müşteri)</option>
                  <option value="CARRIER">CARRIER (Taşıyıcı)</option>
                  <option value="END_USER_CUSTOMER">END_USER_CUSTOMER (Son Kullanıcı)</option>
                  <option value="INTERNAL_ORGANIZATIO">INTERNAL_ORGANIZATIO (Kurum)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.roles.fromDate}</label>
                  <input
                    type="date"
                    value={roleForm.fromDate}
                    onChange={(e) => setRoleForm({ ...roleForm, fromDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.roles.thruDate}</label>
                  <input
                    type="date"
                    value={roleForm.thruDate}
                    onChange={(e) => setRoleForm({ ...roleForm, thruDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: ADD TERM */}
      {showAddTermModal && (
        <div className="ds-overlay z-[60]">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Clock size={18} className="text-indigo-400" />
                {t.terms.newTerm}
              </h3>
              <button
                onClick={() => setShowAddTermModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTerm} className="space-y-3 text-xs">
              <div>
                <label className="ds-label">{t.terms.termType} *</label>
                <select
                  value={termForm.termTypeId}
                  onChange={(e) => setTermForm({ ...termForm, termTypeId: e.target.value })}
                  className="ds-select"
                >
                  <option value="FIN_PAYMENT_TERM">FIN_PAYMENT_TERM (Ödeme Vadesi)</option>
                  <option value="FIN_PAYMENT_DISC">FIN_PAYMENT_DISC (Erken Ödeme İskontosu)</option>
                  <option value="FIN_LATE_FEE_TERM">FIN_LATE_FEE_TERM (Gecikme Faizi / Cezası)</option>
                  <option value="FIN_MAX_CREDIT">FIN_MAX_CREDIT (Maksimum Kredi)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.terms.termDays}</label>
                  <input
                    type="number"
                    value={termForm.termDays || ''}
                    onChange={(e) => setTermForm({ ...termForm, termDays: Number(e.target.value) })}
                    className="ds-input"
                    placeholder="30"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.terms.termValue}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={termForm.termValue || ''}
                    onChange={(e) => setTermForm({ ...termForm, termValue: Number(e.target.value) })}
                    className="ds-input"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="ds-label">{t.terms.description}</label>
                <input
                  type="text"
                  value={termForm.description || ''}
                  onChange={(e) => setTermForm({ ...termForm, description: e.target.value })}
                  className="ds-input"
                  placeholder="Net 30 days..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddTermModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 3: APPLY PAYMENT */}
      {showApplyPaymentModal && (
        <div className="ds-overlay z-[60]">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" />
                {t.payments.applyPayment}
              </h3>
              <button
                onClick={() => setShowApplyPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleApplyPayment} className="space-y-3 text-xs">
              <div>
                <label className="ds-label">{t.payments.paymentId} (Payment ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="10001, 8000, etc."
                  value={paymentForm.paymentId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentId: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">{t.payments.amountApplied} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amountApplied || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountApplied: Number(e.target.value) })}
                  className="ds-input"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowApplyPaymentModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingAccountExtendedModal;
