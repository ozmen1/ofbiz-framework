import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  CreditCard,
  Printer,
  Calendar,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
} from 'lucide-react';
import {
  api,
  PartyFinancialStatementResponse,
} from '../services/api';
import { useTranslation } from '../i18n';

interface PartyStatementModalProps {
  partyId: string | null;
  partyName?: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'summary' | 'ledger' | 'openInvoices' | 'unappliedPayments';

export const PartyStatementModal: React.FC<PartyStatementModalProps> = ({
  partyId,
  partyName,
  isOpen,
  onClose,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.partyStatement;
  const tc = translations.common;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');

  // Statement Data
  const [statementData, setStatementData] = useState<PartyFinancialStatementResponse | null>(null);

  const fetchStatement = useCallback(async () => {
    if (!partyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getPartyFinancialStatement(
        partyId,
        fromDate || undefined,
        thruDate || undefined
      );
      setStatementData(res);
    } catch (err: any) {
      console.error('Failed to fetch party statement:', err);
      setError(err?.message || (isTr ? 'Cari hesap ekstresi yüklenemedi.' : 'Failed to load party statement.'));
    } finally {
      setLoading(false);
    }
  }, [partyId, fromDate, thruDate, isTr]);

  useEffect(() => {
    if (isOpen && partyId) {
      fetchStatement();
    } else {
      setStatementData(null);
      setError(null);
    }
  }, [isOpen, partyId, fetchStatement]);

  if (!isOpen || !partyId) return null;

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: 'TRY',
    }).format(val || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  const displayName = statementData?.party.partyName || partyName || partyId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="ds-card max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700/60 bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>{t.title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono border border-slate-700">
                  {displayName} ({partyId})
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatement}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title={tc.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{t.tabs.summary}</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t.tabs.ledger}</span>
            {statementData && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                {statementData.entries.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('openInvoices')}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'openInvoices'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{t.tabs.openInvoices}</span>
            {statementData && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {statementData.openInvoices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('unappliedPayments')}
            className={`py-3 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'unappliedPayments'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>{t.tabs.unappliedPayments}</span>
            {statementData && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                {statementData.unappliedPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && !statementData ? (
            <div className="flex items-center justify-center py-20">
              <div className="ds-spinner" />
            </div>
          ) : (
            <>
              {/* TAB 1: SUMMARY & AGING */}
              {activeTab === 'summary' && statementData && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="ds-stat-card border-l-4 border-l-blue-500">
                      <p className="ds-stat-label">{t.summary.totalInvoiced}</p>
                      <p className="ds-stat-value text-blue-400">
                        {formatCurrency(statementData.party.totalInvoiced)}
                      </p>
                    </div>
                    <div className="ds-stat-card border-l-4 border-l-emerald-500">
                      <p className="ds-stat-label">{t.summary.totalPaid}</p>
                      <p className="ds-stat-value text-emerald-400">
                        {formatCurrency(statementData.party.totalPaid)}
                      </p>
                    </div>
                    <div className="ds-stat-card border-l-4 border-l-indigo-500">
                      <p className="ds-stat-label">{t.summary.openBalance}</p>
                      <p className={`ds-stat-value font-bold ${
                        statementData.party.openBalance > 0
                          ? 'text-rose-400'
                          : statementData.party.openBalance < 0
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}>
                        {formatCurrency(statementData.party.openBalance)}
                      </p>
                    </div>
                  </div>

                  {/* Aging Breakdown Card */}
                  <div className="ds-card p-5 border border-slate-800">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{t.summary.agingTitle}</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                      <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 block mb-1">{t.summary.current}</span>
                        <span className="text-sm font-semibold text-emerald-400">
                          {formatCurrency(statementData.aging.current)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 block mb-1">{t.summary.days1_30}</span>
                        <span className="text-sm font-semibold text-amber-400">
                          {formatCurrency(statementData.aging.days1_30)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 block mb-1">{t.summary.days31_60}</span>
                        <span className="text-sm font-semibold text-orange-400">
                          {formatCurrency(statementData.aging.days31_60)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 block mb-1">{t.summary.days61_90}</span>
                        <span className="text-sm font-semibold text-rose-400">
                          {formatCurrency(statementData.aging.days61_90)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <span className="text-[11px] text-slate-400 block mb-1">{t.summary.days90Plus}</span>
                        <span className="text-sm font-bold text-rose-500">
                          {formatCurrency(statementData.aging.days90Plus)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-800/70 rounded-lg border border-indigo-500/30">
                        <span className="text-[11px] text-indigo-300 font-medium block mb-1">{t.summary.totalOverdue}</span>
                        <span className="text-sm font-bold text-indigo-400">
                          {formatCurrency(statementData.aging.totalOverdue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Quick Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="ds-card p-4 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">{t.openInvoices.title}</p>
                          <p className="text-base font-semibold text-white">
                            {statementData.openInvoices.length} {isTr ? 'Adet' : 'Items'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('openInvoices')}
                        className="ds-btn-secondary text-xs"
                      >
                        {isTr ? 'Görüntüle' : 'View'}
                      </button>
                    </div>

                    <div className="ds-card p-4 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                          <ArrowDownLeft className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">{t.unappliedPayments.title}</p>
                          <p className="text-base font-semibold text-white">
                            {statementData.unappliedPayments.length} {isTr ? 'Adet' : 'Items'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('unappliedPayments')}
                        className="ds-btn-secondary text-xs"
                      >
                        {isTr ? 'Görüntüle' : 'View'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LEDGER (CARI HAREKET DEFTERI) */}
              {activeTab === 'ledger' && statementData && (
                <div className="space-y-4">
                  {/* Filter & Print Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400">{t.ledger.dateRange}:</span>
                      </div>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="ds-input text-xs py-1 px-2 w-32"
                      />
                      <span className="text-slate-500 text-xs">-</span>
                      <input
                        type="date"
                        value={thruDate}
                        onChange={(e) => setThruDate(e.target.value)}
                        className="ds-input text-xs py-1 px-2 w-32"
                      />
                      <button
                        onClick={fetchStatement}
                        disabled={loading}
                        className="ds-btn-secondary text-xs py-1 px-3"
                      >
                        {t.ledger.filter}
                      </button>
                      {(fromDate || thruDate) && (
                        <button
                          onClick={() => {
                            setFromDate('');
                            setThruDate('');
                          }}
                          className="text-xs text-slate-400 hover:text-white underline"
                        >
                          {tc.reset}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handlePrint}
                      className="ds-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t.ledger.printLedger}</span>
                    </button>
                  </div>

                  {/* Ledger Table */}
                  <div className="ds-card overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="ds-table w-full">
                        <thead>
                          <tr className="ds-thead-row sticky top-0 bg-slate-900 z-10">
                            <th className="ds-th">{t.ledger.date}</th>
                            <th className="ds-th">{t.ledger.type}</th>
                            <th className="ds-th">{t.ledger.refNum}</th>
                            <th className="ds-th">{t.ledger.description}</th>
                            <th className="ds-th text-right">{t.ledger.debit}</th>
                            <th className="ds-th text-right">{t.ledger.credit}</th>
                            <th className="ds-th text-right">{t.ledger.balance}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementData.entries.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="ds-td text-center py-8 text-slate-500">
                                {t.ledger.noTransactions}
                              </td>
                            </tr>
                          ) : (
                            statementData.entries.map((entry, idx) => (
                              <tr key={`${entry.entryType}-${entry.id}-${idx}`} className="ds-tbody-row hover:bg-slate-800/40">
                                <td className="ds-td text-xs text-slate-300 font-mono">
                                  {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                                </td>
                                <td className="ds-td text-xs">
                                  {entry.entryType === 'INVOICE' ? (
                                    <span className="ds-badge ds-badge-blue text-[10px]">
                                      {t.ledger.invoice}
                                    </span>
                                  ) : (
                                    <span className="ds-badge ds-badge-green text-[10px]">
                                      {t.ledger.payment}
                                    </span>
                                  )}
                                </td>
                                <td className="ds-td text-xs font-mono text-slate-200">
                                  {entry.refNum || entry.id}
                                </td>
                                <td className="ds-td text-xs text-slate-300 max-w-xs truncate">
                                  {entry.description || '-'}
                                </td>
                                <td className="ds-td text-xs text-right font-mono text-blue-400">
                                  {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                                </td>
                                <td className="ds-td text-xs text-right font-mono text-emerald-400">
                                  {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                                </td>
                                <td className={`ds-td text-xs text-right font-mono font-semibold ${
                                  entry.runningBalance > 0
                                    ? 'text-rose-400'
                                    : entry.runningBalance < 0
                                    ? 'text-emerald-400'
                                    : 'text-slate-300'
                                }`}>
                                  {formatCurrency(entry.runningBalance)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: OPEN INVOICES */}
              {activeTab === 'openInvoices' && statementData && (
                <div className="space-y-4">
                  <div className="ds-card overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="ds-table w-full">
                        <thead>
                          <tr className="ds-thead-row sticky top-0 bg-slate-900 z-10">
                            <th className="ds-th">{t.openInvoices.invoiceId}</th>
                            <th className="ds-th">{t.openInvoices.date}</th>
                            <th className="ds-th">{t.openInvoices.dueDate}</th>
                            <th className="ds-th text-right">{t.openInvoices.total}</th>
                            <th className="ds-th text-right">{t.openInvoices.outstanding}</th>
                            <th className="ds-th text-center">{t.openInvoices.daysOverdue}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementData.openInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="ds-td text-center py-8 text-slate-500">
                                {t.openInvoices.noOpenInvoices}
                              </td>
                            </tr>
                          ) : (
                            statementData.openInvoices.map((inv) => (
                              <tr key={inv.invoiceId} className="ds-tbody-row hover:bg-slate-800/40">
                                <td className="ds-td text-xs font-mono text-indigo-300">
                                  {inv.invoiceId}
                                </td>
                                <td className="ds-td text-xs text-slate-300 font-mono">
                                  {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                                </td>
                                <td className="ds-td text-xs text-slate-300 font-mono">
                                  {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                                </td>
                                <td className="ds-td text-xs text-right font-mono text-slate-300">
                                  {formatCurrency(inv.total)}
                                </td>
                                <td className="ds-td text-xs text-right font-mono font-semibold text-rose-400">
                                  {formatCurrency(inv.outstandingAmount)}
                                </td>
                                <td className="ds-td text-xs text-center">
                                  {inv.daysOverdue > 0 ? (
                                    <span className="ds-badge ds-badge-red text-[10px]">
                                      {inv.daysOverdue} {isTr ? 'Gün Geçti' : 'Days Overdue'}
                                    </span>
                                  ) : (
                                    <span className="ds-badge ds-badge-green text-[10px]">
                                      {isTr ? 'Vadesinde' : 'Current'}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: UNAPPLIED PAYMENTS */}
              {activeTab === 'unappliedPayments' && statementData && (
                <div className="space-y-4">
                  <div className="ds-card overflow-hidden border border-slate-800">
                    <div className="overflow-x-auto max-h-[50vh]">
                      <table className="ds-table w-full">
                        <thead>
                          <tr className="ds-thead-row sticky top-0 bg-slate-900 z-10">
                            <th className="ds-th">{t.unappliedPayments.paymentId}</th>
                            <th className="ds-th">{t.unappliedPayments.date}</th>
                            <th className="ds-th text-right">{t.unappliedPayments.amount}</th>
                            <th className="ds-th text-right">{t.unappliedPayments.unapplied}</th>
                            <th className="ds-th text-center">{tc.status}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statementData.unappliedPayments.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="ds-td text-center py-8 text-slate-500">
                                {t.unappliedPayments.noUnapplied}
                              </td>
                            </tr>
                          ) : (
                            statementData.unappliedPayments.map((pmnt) => (
                              <tr key={pmnt.paymentId} className="ds-tbody-row hover:bg-slate-800/40">
                                <td className="ds-td text-xs font-mono text-indigo-300">
                                  {pmnt.paymentId}
                                </td>
                                <td className="ds-td text-xs text-slate-300 font-mono">
                                  {pmnt.effectiveDate ? new Date(pmnt.effectiveDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                                </td>
                                <td className="ds-td text-xs text-right font-mono text-slate-300">
                                  {formatCurrency(pmnt.amount)}
                                </td>
                                <td className="ds-td text-xs text-right font-mono font-semibold text-blue-400">
                                  {formatCurrency(pmnt.unappliedAmount)}
                                </td>
                                <td className="ds-td text-xs text-center">
                                  <span className="ds-badge ds-badge-blue text-[10px]">
                                    {pmnt.statusId}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>{statementData?.party.entryCount || 0} {isTr ? 'işlem hareketi listelendi' : 'transactions listed'}</span>
          </div>
          <button
            onClick={onClose}
            className="ds-btn-secondary text-xs py-1.5 px-4"
          >
            {tc.close}
          </button>
        </div>
      </div>
    </div>
  );
};
