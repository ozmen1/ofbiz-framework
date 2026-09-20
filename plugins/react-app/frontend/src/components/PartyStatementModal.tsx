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

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6 bg-black/85 overscroll-contain">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header - Solid Opaque Background */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t.title}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono border border-slate-700 shrink-0">
                  {displayName} ({partyId})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            <button
              onClick={fetchStatement}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={tc.refresh}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={tc.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation - Solid Background */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950 shrink-0 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'summary'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{t.tabs.summary}</span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'ledger'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
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
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'openInvoices'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
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
            className={`py-3 px-3.5 text-xs sm:text-sm font-medium border-b-2 transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'unappliedPayments'
                ? 'border-indigo-500 text-indigo-400 font-semibold'
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

        {/* Modal Body - Unified Single Scroll Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-900 overscroll-contain">
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loading && !statementData ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="ds-spinner mb-2" />
              <span className="text-xs">{tc.loading}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: SUMMARY & AGING */}
              {activeTab === 'summary' && statementData && (
                <div className="space-y-6">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 border-l-4 border-l-blue-500">
                      <p className="text-xs font-medium text-slate-400 mb-1">{t.summary.totalInvoiced}</p>
                      <p className="text-xl sm:text-2xl font-bold font-mono text-blue-400 tracking-tight">
                        {formatCurrency(statementData.party.totalInvoiced)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 border-l-4 border-l-emerald-500">
                      <p className="text-xs font-medium text-slate-400 mb-1">{t.summary.totalPaid}</p>
                      <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tracking-tight">
                        {formatCurrency(statementData.party.totalPaid)}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 border-l-4 border-l-indigo-500">
                      <p className="text-xs font-medium text-slate-400 mb-1">{t.summary.openBalance}</p>
                      <p className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${
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
                  <div className="rounded-xl p-5 border border-slate-800 bg-slate-950/50 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{t.summary.agingTitle}</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-400 font-medium truncate block mb-1">{t.summary.current}</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400 block truncate">
                          {formatCurrency(statementData.aging.current)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-400 font-medium truncate block mb-1">{t.summary.days1_30}</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-amber-400 block truncate">
                          {formatCurrency(statementData.aging.days1_30)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-400 font-medium truncate block mb-1">{t.summary.days31_60}</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-orange-400 block truncate">
                          {formatCurrency(statementData.aging.days31_60)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-400 font-medium truncate block mb-1">{t.summary.days61_90}</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-rose-400 block truncate">
                          {formatCurrency(statementData.aging.days61_90)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                        <span className="text-[11px] text-slate-400 font-medium truncate block mb-1">{t.summary.days90Plus}</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-rose-500 block truncate">
                          {formatCurrency(statementData.aging.days90Plus)}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-indigo-500/30 text-center">
                        <span className="text-[11px] text-indigo-300 font-medium truncate block mb-1">{t.summary.totalOverdue}</span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-indigo-400 block truncate">
                          {formatCurrency(statementData.aging.totalOverdue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Summary Quick Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                          <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">{t.openInvoices.title}</p>
                          <p className="text-base font-bold text-white">
                            {statementData.openInvoices.length} {isTr ? 'Adet' : 'Items'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('openInvoices')}
                        className="ds-btn-secondary text-xs py-1.5 px-3"
                      >
                        {isTr ? 'Görüntüle' : 'View'}
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                          <ArrowDownLeft className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">{t.unappliedPayments.title}</p>
                          <p className="text-base font-bold text-white">
                            {statementData.unappliedPayments.length} {isTr ? 'Adet' : 'Items'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('unappliedPayments')}
                        className="ds-btn-secondary text-xs py-1.5 px-3"
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
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span>{t.ledger.dateRange}:</span>
                      </div>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-2.5 text-white min-w-[140px] focus:outline-none focus:border-indigo-500"
                      />
                      <span className="text-slate-500 text-xs">-</span>
                      <input
                        type="date"
                        value={thruDate}
                        onChange={(e) => setThruDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg text-xs py-1.5 px-2.5 text-white min-w-[140px] focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={fetchStatement}
                        disabled={loading}
                        className="ds-btn-secondary text-xs py-1.5 px-3"
                      >
                        {t.ledger.filter}
                      </button>
                      {(fromDate || thruDate) && (
                        <button
                          onClick={() => {
                            setFromDate('');
                            setThruDate('');
                          }}
                          className="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-1"
                        >
                          {tc.reset}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handlePrint}
                      className="ds-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-300 hover:text-white ml-auto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{t.ledger.printLedger}</span>
                    </button>
                  </div>

                  {/* Ledger Table - Solid Header & Single Scroll */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-x-auto">
                    <table className="w-full text-xs min-w-[700px] border-collapse">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700">
                          <th className="px-3.5 py-2.5 text-left w-28 whitespace-nowrap">{t.ledger.date}</th>
                          <th className="px-3.5 py-2.5 text-left w-24 whitespace-nowrap">{t.ledger.type}</th>
                          <th className="px-3.5 py-2.5 text-left w-32 whitespace-nowrap">{t.ledger.refNum}</th>
                          <th className="px-3.5 py-2.5 text-left min-w-[180px]">{t.ledger.description}</th>
                          <th className="px-3.5 py-2.5 text-right w-32 whitespace-nowrap">{t.ledger.debit}</th>
                          <th className="px-3.5 py-2.5 text-right w-32 whitespace-nowrap">{t.ledger.credit}</th>
                          <th className="px-3.5 py-2.5 text-right w-36 whitespace-nowrap">{t.ledger.balance}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {statementData.entries.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-500 italic">
                              {t.ledger.noTransactions}
                            </td>
                          </tr>
                        ) : (
                          statementData.entries.map((entry, idx) => (
                            <tr key={`${entry.entryType}-${entry.id}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono whitespace-nowrap">
                                {entry.entryDate ? new Date(entry.entryDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                              </td>
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                {entry.entryType === 'INVOICE' ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                    {t.ledger.invoice}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                    {t.ledger.payment}
                                  </span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-slate-300 whitespace-nowrap">
                                {entry.refNum || entry.id}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-300 max-w-xs truncate">
                                {entry.description || '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-blue-400 whitespace-nowrap">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-emerald-400 whitespace-nowrap">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                              </td>
                              <td className={`px-3.5 py-2.5 text-right font-mono font-bold whitespace-nowrap ${
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
              )}

              {/* TAB 3: OPEN INVOICES */}
              {activeTab === 'openInvoices' && statementData && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-x-auto">
                    <table className="w-full text-xs min-w-[650px] border-collapse">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700">
                          <th className="px-3.5 py-2.5 text-left w-32 whitespace-nowrap">{t.openInvoices.invoiceId}</th>
                          <th className="px-3.5 py-2.5 text-left w-28 whitespace-nowrap">{t.openInvoices.date}</th>
                          <th className="px-3.5 py-2.5 text-left w-28 whitespace-nowrap">{t.openInvoices.dueDate}</th>
                          <th className="px-3.5 py-2.5 text-right w-32 whitespace-nowrap">{t.openInvoices.total}</th>
                          <th className="px-3.5 py-2.5 text-right w-32 whitespace-nowrap">{t.openInvoices.outstanding}</th>
                          <th className="px-3.5 py-2.5 text-center w-32 whitespace-nowrap">{t.openInvoices.daysOverdue}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {statementData.openInvoices.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-500 italic">
                              {t.openInvoices.noOpenInvoices}
                            </td>
                          </tr>
                        ) : (
                          statementData.openInvoices.map((inv) => (
                            <tr key={inv.invoiceId} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono text-indigo-300 font-medium whitespace-nowrap">
                                {inv.invoiceId}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono whitespace-nowrap">
                                {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono whitespace-nowrap">
                                {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-slate-300 whitespace-nowrap">
                                {formatCurrency(inv.total)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                                {formatCurrency(inv.outstandingAmount)}
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                {inv.daysOverdue > 0 ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                    {inv.daysOverdue} {isTr ? 'Gün Geçti' : 'Days Overdue'}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
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
              )}

              {/* TAB 4: UNAPPLIED PAYMENTS */}
              {activeTab === 'unappliedPayments' && statementData && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-x-auto">
                    <table className="w-full text-xs min-w-[650px] border-collapse">
                      <thead>
                        <tr className="bg-slate-800/90 text-slate-300 font-semibold border-b border-slate-700">
                          <th className="px-3.5 py-2.5 text-left w-32 whitespace-nowrap">{t.unappliedPayments.paymentId}</th>
                          <th className="px-3.5 py-2.5 text-left w-28 whitespace-nowrap">{t.unappliedPayments.date}</th>
                          <th className="px-3.5 py-2.5 text-right w-32 whitespace-nowrap">{t.unappliedPayments.amount}</th>
                          <th className="px-3.5 py-2.5 text-right w-32 whitespace-nowrap">{t.unappliedPayments.unapplied}</th>
                          <th className="px-3.5 py-2.5 text-center w-28 whitespace-nowrap">{tc.status}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {statementData.unappliedPayments.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-500 italic">
                              {t.unappliedPayments.noUnapplied}
                            </td>
                          </tr>
                        ) : (
                          statementData.unappliedPayments.map((pmnt) => (
                            <tr key={pmnt.paymentId} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono text-indigo-300 font-medium whitespace-nowrap">
                                {pmnt.paymentId}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-400 font-mono whitespace-nowrap">
                                {pmnt.effectiveDate ? new Date(pmnt.effectiveDate).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono text-slate-300 whitespace-nowrap">
                                {formatCurrency(pmnt.amount)}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-mono font-bold text-blue-400 whitespace-nowrap">
                                {formatCurrency(pmnt.unappliedAmount)}
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
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
              )}
            </>
          )}
        </div>

        {/* Footer - Solid Background */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 shrink-0">
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
