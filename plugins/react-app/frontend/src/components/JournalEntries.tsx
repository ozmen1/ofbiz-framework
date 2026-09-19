import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, Plus, Eye, CheckCircle2, Clock, 
  AlertCircle, BookOpen, Layers,
  Filter, FileText, Send, X
} from 'lucide-react';
import { 
  api, 
  AcctgTransListItem, 
  AcctgTransactionsResponse,
  AcctgTransDetailResponse, 
  GlMetadataResponse 
} from '../services/api';
import { useTranslation } from '../i18n';

interface JournalEntriesProps {
  onCreateNew?: () => void;
  initialSelectedId?: string | null;
}

export const JournalEntries: React.FC<JournalEntriesProps> = ({ onCreateNew, initialSelectedId }) => {
  const { translations, locale } = useTranslation();
  const j = translations.journalEntries;
  const common = translations.common;
  const coa = translations.chartOfAccounts;

  const [transactions, setTransactions] = useState<AcctgTransListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPostedFilter, setIsPostedFilter] = useState<string>(''); // '', 'Y', 'N'
  const [transTypeFilter, setTransTypeFilter] = useState<string>('');
  const [viewIndex, setViewIndex] = useState<number>(0);
  const [viewSize] = useState<number>(20);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Stats
  const [postedCount, setPostedCount] = useState<number>(0);
  const [draftCount, setDraftCount] = useState<number>(0);
  const [totalVolume, setTotalVolume] = useState<number>(0);

  // Modal / Detail state
  const [selectedDetail, setSelectedDetail] = useState<AcctgTransDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [postingLoading, setPostingLoading] = useState<boolean>(false);

  // Metadata
  const [metadata, setMetadata] = useState<GlMetadataResponse['metadata'] | null>(null);

  const loadTransactions = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getAcctgTransactions({
      search: searchTerm || undefined,
      isPosted: isPostedFilter || undefined,
      acctgTransTypeId: transTypeFilter || undefined,
      viewIndex,
      viewSize
    })
      .then((res: AcctgTransactionsResponse) => {
        const list = res.transactions || [];
        setTransactions(list);
        setTotalCount(res.totalCount ?? list.length);
        setPostedCount(list.filter(t => t.isPosted === 'Y').length);
        setDraftCount(list.filter(t => t.isPosted !== 'Y').length);
        setTotalVolume(list.reduce((sum, t) => sum + (t.totalDebit || 0), 0));
      })
      .catch((err: any) => {
        setError(err.message || common.error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchTerm, isPostedFilter, transTypeFilter, viewIndex, viewSize, common.error]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    api.getGlMetadata()
      .then(res => {
        if (res?.metadata) setMetadata(res.metadata);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialSelectedId) {
      handleOpenDetail(initialSelectedId);
    }
  }, [initialSelectedId]);

  const handleOpenDetail = (acctgTransId: string) => {
    setShowDetailModal(true);
    setDetailLoading(true);
    api.getAcctgTransDetails(acctgTransId)
      .then((res: AcctgTransDetailResponse) => {
        setSelectedDetail(res);
      })
      .catch((err: any) => {
        setError(err.message || common.error);
        setShowDetailModal(false);
      })
      .finally(() => {
        setDetailLoading(false);
      });
  };

  const handlePostTransaction = async (acctgTransId: string) => {
    if (!confirm(j.postConfirm)) {
      return;
    }
    setPostingLoading(true);
    try {
      const res = await api.postJournalEntry(acctgTransId);
      setSuccessMsg(res._EVENT_MESSAGE_ || j.postSuccess);
      loadTransactions();
      if (selectedDetail && selectedDetail.transaction.acctgTransId === acctgTransId) {
        handleOpenDetail(acctgTransId);
      }
    } catch (err: any) {
      alert(err.message || common.error);
    } finally {
      setPostingLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title flex items-center gap-3">
            <BookOpen size={24} className="text-indigo-400" />
            {j.title}
          </h1>
          <p className="ds-page-subtitle">
            {j.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadTransactions} 
            className="ds-btn-secondary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {common.refresh}
          </button>
          {onCreateNew && (
            <button 
              onClick={onCreateNew} 
              className="ds-btn-primary"
            >
              <Plus size={18} />
              {j.newEntry}
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="ds-alert-success flex items-center gap-3">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <div className="ds-stat-label flex items-center gap-2">
            <Layers size={16} /> {j.registeredTrans}
          </div>
          <div className="ds-stat-value">{totalCount}</div>
          <div className="ds-stat-sub">{common.all}</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="ds-stat-label flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={16} /> {j.postedToGlTrans}
          </div>
          <div className="ds-stat-value text-emerald-400">{postedCount}</div>
          <div className="ds-stat-sub">{j.postedStatus}</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <div className="ds-stat-label flex items-center gap-2 text-amber-400">
            <Clock size={16} /> {j.draftTrans}
          </div>
          <div className="ds-stat-value text-amber-400">{draftCount}</div>
          <div className="ds-stat-sub">{j.draftStatus}</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <div className="ds-stat-label flex items-center gap-2 text-blue-400">
            <BookOpen size={16} /> {j.totalTransVolume}
          </div>
          <div className="ds-stat-value text-blue-400">
            {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'USD' }).format(totalVolume)}
          </div>
          <div className="ds-stat-sub">{common.total}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ds-card p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder={common.search}
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setViewIndex(0); }}
            className="ds-input pl-10"
          />
        </div>

        {/* Status Filter */}
        <select
          value={isPostedFilter}
          onChange={e => { setIsPostedFilter(e.target.value); setViewIndex(0); }}
          className="ds-select w-auto min-w-[180px]"
        >
          <option value="">{j.allStatusesAll}</option>
          <option value="Y">{j.onlyPosted}</option>
          <option value="N">{j.onlyDraft}</option>
        </select>

        {/* Transaction Type Filter */}
        <select
          value={transTypeFilter}
          onChange={e => { setTransTypeFilter(e.target.value); setViewIndex(0); }}
          className="ds-select w-auto min-w-[180px] max-w-[240px]"
        >
          <option value="">{j.allTransTypes}</option>
          {metadata?.acctgTransTypes?.map(t => (
            <option key={t.acctgTransTypeId} value={t.acctgTransTypeId}>
              {t.description || t.acctgTransTypeId}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      <div className="ds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">{translations.journalEntries.transId}</th>
                <th className="ds-th">{translations.journalEntries.transDate}</th>
                <th className="ds-th">{translations.journalEntries.transType}</th>
                <th className="ds-th">{translations.common.description}</th>
                <th className="ds-th">{translations.journalEntries.reference}</th>
                <th className="ds-th-right">{translations.journalEntries.totalDebit}</th>
                <th className="ds-th-right">{translations.journalEntries.totalCredit}</th>
                <th className="ds-th text-center">{translations.common.status}</th>
                <th className="ds-th-right">{translations.common.actions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="ds-spinner-sm" />
                      <span>{translations.common.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Filter size={32} className="mx-auto mb-3 opacity-40" />
                    <p>{translations.common.noData}</p>
                  </td>
                </tr>
              ) : (
                transactions.map(tr => {
                  const isPosted = tr.isPosted === 'Y';
                  return (
                    <tr key={tr.acctgTransId} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold">
                        #{tr.acctgTransId}
                      </td>
                      <td className="ds-td-muted whitespace-nowrap">
                        {tr.transactionDate ? tr.transactionDate.substring(0, 10) : '-'}
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-indigo">
                          {tr.acctgTransTypeDesc || tr.acctgTransTypeId}
                        </span>
                      </td>
                      <td className="ds-td max-w-[240px] truncate" title={tr.description || ''}>
                        {tr.description || '-'}
                        {tr.invoiceId && (
                          <span className="text-xs text-slate-500 ml-2">
                            (Fatura: #{tr.invoiceId})
                          </span>
                        )}
                        {tr.paymentId && (
                          <span className="text-xs text-slate-500 ml-2">
                            (Ödeme: #{tr.paymentId})
                          </span>
                        )}
                      </td>
                      <td className="ds-td-muted">
                        {tr.voucherRef || '-'}
                      </td>
                      <td className="ds-td-right text-blue-400">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tr.totalDebit || 0)}
                      </td>
                      <td className="ds-td-right text-amber-400">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tr.totalCredit || 0)}
                      </td>
                      <td className="ds-td text-center">
                        <span className={`inline-flex items-center gap-1.5 ds-badge ${isPosted ? 'ds-badge-green' : 'ds-badge-yellow'}`}>
                          {isPosted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {isPosted ? j.postedStatus : j.draftStatus}
                        </span>
                      </td>
                      <td className="ds-td-right">
                        <div className="inline-flex gap-2 items-center justify-end">
                          <button
                            onClick={() => handleOpenDetail(tr.acctgTransId)}
                            className="ds-btn-secondary px-2.5 py-1 text-xs"
                            title={j.inspect}
                          >
                            <Eye size={14} />
                            {j.inspect}
                          </button>
                          {!isPosted && (
                            <button
                              onClick={() => handlePostTransaction(tr.acctgTransId)}
                              title={j.postToGlButton}
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
                            >
                              <Send size={12} />
                              {common.confirm}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex justify-between items-center px-5 py-4 border-t border-slate-700/50 bg-slate-800/30">
          <span className="text-xs text-slate-400">
            {j.totalEntriesCount} <strong>{totalCount}</strong> {j.pageOf} ({common.page} {viewIndex + 1} / {Math.max(1, Math.ceil(totalCount / viewSize))})
          </span>
          <div className="flex gap-2">
            <button
              disabled={viewIndex === 0}
              onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {common.previous}
            </button>
            <button
              disabled={(viewIndex + 1) * viewSize >= totalCount}
              onClick={() => setViewIndex(prev => prev + 1)}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {common.next}
            </button>
          </div>
        </div>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      {showDetailModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText size={20} className="text-indigo-400" />
                  {j.title}: #{selectedDetail?.transaction.acctgTransId}
                </h2>
                {selectedDetail && (
                  <div className="text-xs text-slate-400 mt-1">
                    {common.date}: {selectedDetail.transaction.transactionDate?.substring(0, 19)} | {common.type}: {selectedDetail.transaction.acctgTransTypeDesc}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowDetailModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-16 text-center">
                <div className="ds-spinner mx-auto mb-3" />
                <p className="text-slate-400 text-sm">{j.entriesLoading}</p>
              </div>
            ) : selectedDetail ? (
              <div className="space-y-5">
                
                {/* Status & Posting Action Banner */}
                <div className={`p-4 rounded-xl border flex justify-between items-center flex-wrap gap-4 ${
                  selectedDetail.transaction.isPosted === 'Y' 
                    ? 'bg-emerald-500/10 border-emerald-500/30' 
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    {selectedDetail.transaction.isPosted === 'Y' ? (
                      <CheckCircle2 size={24} className="text-emerald-400" />
                    ) : (
                      <Clock size={24} className="text-amber-400" />
                    )}
                    <div>
                      <div className={`font-bold ${selectedDetail.transaction.isPosted === 'Y' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {selectedDetail.transaction.isPosted === 'Y' ? j.postedNotice : j.draftNotice}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedDetail.transaction.isPosted === 'Y' 
                          ? `${j.transDate}: ${selectedDetail.transaction.postedDate?.substring(0, 19)}` 
                          : j.draftNotice}
                      </div>
                    </div>
                  </div>

                  {selectedDetail.transaction.isPosted !== 'Y' && (
                    <button
                      onClick={() => handlePostTransaction(selectedDetail.transaction.acctgTransId)}
                      disabled={postingLoading}
                      className="ds-btn-primary"
                    >
                      {postingLoading ? <div className="ds-spinner-sm" /> : <Send size={16} />}
                      {j.postToGlButton}
                    </button>
                  )}
                </div>

                {/* Header Information Grid */}
                <div className="ds-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">{j.fiscalType}: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.glFiscalTypeDesc || selectedDetail.transaction.glFiscalTypeId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{j.documentRef}: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.voucherRef || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{j.relatedInvoice}: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.invoiceId ? `#${selectedDetail.transaction.invoiceId}` : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{j.relatedPayment}: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.paymentId ? `#${selectedDetail.transaction.paymentId}` : '-'}</strong>
                  </div>
                  {selectedDetail.transaction.description && (
                    <div className="sm:col-span-2 lg:col-span-4 mt-1 pt-2 border-t border-slate-700/50">
                      <span className="text-slate-400 block mb-0.5">{common.description}: </span>
                      <strong className="text-slate-200">{selectedDetail.transaction.description}</strong>
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {j.entryRows} ({selectedDetail.entries.length})
                    </h3>
                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${
                      selectedDetail.isBalanced ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {selectedDetail.isBalanced ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      {selectedDetail.isBalanced ? j.balanced : j.unbalanced}
                    </div>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th text-center w-12">{j.lineSeq}</th>
                            <th className="ds-th">{coa.accountCode}</th>
                            <th className="ds-th">{coa.accountName}</th>
                            <th className="ds-th">{common.description}</th>
                            <th className="ds-th-right">{j.totalDebit}</th>
                            <th className="ds-th-right">{j.totalCredit}</th>
                            <th className="ds-th">{common.party}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDetail.entries.map((entry, idx) => (
                            <tr key={entry.acctgTransEntrySeqId} className="ds-tbody-row">
                              <td className="ds-td text-center text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="ds-td-mono font-bold">
                                {entry.accountCode || entry.glAccountId}
                              </td>
                              <td className="ds-td-primary">
                                {entry.accountName}
                              </td>
                              <td className="ds-td-muted">
                                {entry.description || '-'}
                              </td>
                              <td className="ds-td-right text-blue-400">
                                {entry.debitCreditFlag === 'D' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: entry.currencyUomId || 'USD' }).format(entry.amount) : '-'}
                              </td>
                              <td className="ds-td-right text-amber-400">
                                {entry.debitCreditFlag === 'C' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: entry.currencyUomId || 'USD' }).format(entry.amount) : '-'}
                              </td>
                              <td className="ds-td-muted">
                                {entry.partyName || entry.partyId || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-700/40 font-bold border-t-2 border-slate-700/70">
                            <td colSpan={4} className="px-4 py-3 text-right text-slate-300">
                              GENEL TOPLAMLAR:
                            </td>
                            <td className="px-4 py-3 text-right text-blue-400 text-sm">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedDetail.totalDebit)}
                            </td>
                            <td className="px-4 py-3 text-right text-amber-400 text-sm">
                              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedDetail.totalCredit)}
                            </td>
                            <td className="px-4 py-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

              </div>
            ) : null}

            <div className="flex justify-end pt-4 border-t border-slate-700/50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="ds-btn-secondary"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default JournalEntries;
