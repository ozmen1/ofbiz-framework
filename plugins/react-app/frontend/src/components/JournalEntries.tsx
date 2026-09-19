import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, Plus, Eye, CheckCircle2, Clock, 
  AlertCircle, BookOpen, Layers,
  Filter, FileText, Send, X
} from 'lucide-react';
import { 
  api, 
  AcctgTransListItem, 
  AcctgTransDetailResponse, 
  GlMetadataResponse 
} from '../services/api';

interface JournalEntriesProps {
  onCreateNew?: () => void;
  initialSelectedId?: string | null;
}

export const JournalEntries: React.FC<JournalEntriesProps> = ({ onCreateNew, initialSelectedId }) => {
  const [transactions, setTransactions] = useState<AcctgTransListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPostedFilter, setIsPostedFilter] = useState<string>(''); // '', 'Y', 'N'
  const [transTypeFilter, setTransTypeFilter] = useState<string>('');
  const [viewIndex, setViewIndex] = useState<number>(0);
  const [viewSize] = useState<number>(25);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Metadata
  const [metadata, setMetadata] = useState<GlMetadataResponse['metadata'] | null>(null);

  // Detail Modal
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedDetail, setSelectedDetail] = useState<AcctgTransDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [postingLoading, setPostingLoading] = useState<boolean>(false);

  // Load Metadata
  useEffect(() => {
    api.getGlMetadata()
      .then(res => {
        if (res?.metadata) setMetadata(res.metadata);
      })
      .catch(err => console.warn('Could not load GL metadata:', err));
  }, []);

  // Fetch Transactions
  const loadTransactions = useCallback(() => {
    setLoading(true);
    setError(null);

    const payload: Record<string, any> = {
      viewIndex,
      viewSize
    };

    if (searchTerm) payload.search = searchTerm;
    if (isPostedFilter) payload.isPosted = isPostedFilter;
    if (transTypeFilter) payload.acctgTransTypeId = transTypeFilter;

    api.getAcctgTransactions(payload)
      .then(res => {
        setTransactions(res.transactions || []);
        setTotalCount(res.totalCount || 0);
      })
      .catch(err => setError(err.message || 'Yevmiye fişleri yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [viewIndex, viewSize, searchTerm, isPostedFilter, transTypeFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Open Detail Modal
  const handleOpenDetail = useCallback(async (acctgTransId: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    setSelectedDetail(null);

    try {
      const res = await api.getAcctgTransDetails(acctgTransId);
      setSelectedDetail(res);
    } catch (err: any) {
      setError(err.message || 'Fiş detayı yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Handle Initial Selected ID if navigated from outside
  useEffect(() => {
    if (initialSelectedId) {
      handleOpenDetail(initialSelectedId);
    }
  }, [initialSelectedId, handleOpenDetail]);

  // Post Transaction to General Ledger
  const handlePostTransaction = async (acctgTransId: string) => {
    if (!window.confirm(`Yevmiye Fişi #${acctgTransId} Defter-i Kebir'e (General Ledger) işlenecektir. Onaylıyor musunuz?`)) {
      return;
    }

    setPostingLoading(true);
    try {
      const res = await api.postJournalEntry(acctgTransId);
      setSuccessMsg(res._EVENT_MESSAGE_ || `Fiş #${acctgTransId} başarıyla defter-i kebir'e işlendi.`);
      setTimeout(() => setSuccessMsg(null), 3500);

      // Refresh detail if open
      if (selectedDetail && selectedDetail.transaction.acctgTransId === acctgTransId) {
        handleOpenDetail(acctgTransId);
      }
      loadTransactions();
    } catch (err: any) {
      alert('Fiş onaylanırken hata oluştu: ' + err.message);
    } finally {
      setPostingLoading(false);
    }
  };

  // Stats calculation
  const postedCount = transactions.filter(t => t.isPosted === 'Y').length;
  const draftCount = transactions.filter(t => t.isPosted !== 'Y').length;
  const totalVolume = transactions.reduce((sum, t) => sum + (Number(t.totalDebit) || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      
      {/* Header */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">
            <FileText className="text-indigo-400" size={26} />
            Yevmiye ve Mahsup Fişleri (Journal Entries)
          </h1>
          <p className="ds-page-subtitle">
            Defter-i kebir kayıtları, mahsup fişleri, açılış/kapanış ve yevmiye hareketleri
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadTransactions} 
            className="ds-btn-secondary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          {onCreateNew && (
            <button 
              onClick={onCreateNew} 
              className="ds-btn-primary"
            >
              <Plus size={18} />
              Yeni Yevmiye Fişi
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
            <Layers size={16} /> Toplam Fiş Sayısı
          </div>
          <div className="ds-stat-value">{totalCount}</div>
          <div className="ds-stat-sub">Sistemdeki tüm kayıtlar</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="ds-stat-label flex items-center gap-2 text-emerald-400">
            <CheckCircle2 size={16} /> Defter-i Kebir'e İşlenmiş
          </div>
          <div className="ds-stat-value text-emerald-400">{postedCount}</div>
          <div className="ds-stat-sub">Onaylı resmi yevmiye fişleri</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <div className="ds-stat-label flex items-center gap-2 text-amber-400">
            <Clock size={16} /> Taslak Fişler
          </div>
          <div className="ds-stat-value text-amber-400">{draftCount}</div>
          <div className="ds-stat-sub">Onay bekleyen kayıtlar</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <div className="ds-stat-label flex items-center gap-2 text-blue-400">
            <BookOpen size={16} /> Toplam İşlem Tutarı
          </div>
          <div className="ds-stat-value text-blue-400">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalVolume)}
          </div>
          <div className="ds-stat-sub">Sayfalanan fişlerin hacmi</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ds-card p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Fiş No, açıklama veya belge no ile ara..."
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
          <option value="">Tüm Durumlar (Hepsi)</option>
          <option value="Y">Yalnızca Onaylı (Posted)</option>
          <option value="N">Yalnızca Taslak (Draft)</option>
        </select>

        {/* Transaction Type Filter */}
        <select
          value={transTypeFilter}
          onChange={e => { setTransTypeFilter(e.target.value); setViewIndex(0); }}
          className="ds-select w-auto min-w-[180px] max-w-[240px]"
        >
          <option value="">Tüm Fiş Türleri</option>
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
                <th className="ds-th">Fiş No</th>
                <th className="ds-th">Tarih</th>
                <th className="ds-th">Fiş Türü</th>
                <th className="ds-th">Açıklama</th>
                <th className="ds-th">Belge / Ref</th>
                <th className="ds-th-right">Toplam Borç</th>
                <th className="ds-th-right">Toplam Alacak</th>
                <th className="ds-th text-center">Durum</th>
                <th className="ds-th-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="ds-spinner-sm" />
                      <span>Yevmiye fişleri yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <Filter size={32} className="mx-auto mb-3 opacity-40" />
                    <p>Kriterlere uygun yevmiye fişi bulunamadı.</p>
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
                          {isPosted ? 'Onaylı' : 'Taslak'}
                        </span>
                      </td>
                      <td className="ds-td-right">
                        <div className="inline-flex gap-2 items-center justify-end">
                          <button
                            onClick={() => handleOpenDetail(tr.acctgTransId)}
                            className="ds-btn-secondary px-2.5 py-1 text-xs"
                            title="Fiş Detayı ve Satırlar"
                          >
                            <Eye size={14} />
                            İncele
                          </button>
                          {!isPosted && (
                            <button
                              onClick={() => handlePostTransaction(tr.acctgTransId)}
                              title="Defter-i Kebir'e İşle (Post)"
                              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
                            >
                              <Send size={12} />
                              Onayla
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
            Toplam <strong>{totalCount}</strong> fiş kaydı (Sayfa {viewIndex + 1} / {Math.max(1, Math.ceil(totalCount / viewSize))})
          </span>
          <div className="flex gap-2">
            <button
              disabled={viewIndex === 0}
              onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Önceki
            </button>
            <button
              disabled={(viewIndex + 1) * viewSize >= totalCount}
              onClick={() => setViewIndex(prev => prev + 1)}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sonraki
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
                  Yevmiye Fişi Detayı: #{selectedDetail?.transaction.acctgTransId}
                </h2>
                {selectedDetail && (
                  <div className="text-xs text-slate-400 mt-1">
                    Tarih: {selectedDetail.transaction.transactionDate?.substring(0, 19)} | Tür: {selectedDetail.transaction.acctgTransTypeDesc}
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
                <p className="text-slate-400 text-sm">Fiş satırları getiriliyor...</p>
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
                        {selectedDetail.transaction.isPosted === 'Y' ? 'Defter-i Kebir’e Onaylandı (Posted)' : 'Taslak Kayıt (Draft)'}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedDetail.transaction.isPosted === 'Y' 
                          ? `Onay Tarihi: ${selectedDetail.transaction.postedDate?.substring(0, 19)}` 
                          : 'Bu kayıt henüz resmi defter-i kebir kayıtlarına intikal ettirilmemiştir.'}
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
                      Defter-i Kebir'e İşle (Post)
                    </button>
                  )}
                </div>

                {/* Header Information Grid */}
                <div className="ds-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mali Tür (Fiscal Type): </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.glFiscalTypeDesc || selectedDetail.transaction.glFiscalTypeId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Belge / Fiş Ref No: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.voucherRef || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">İlişkili Fatura: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.invoiceId ? `#${selectedDetail.transaction.invoiceId}` : '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">İlişkili Ödeme: </span>
                    <strong className="text-slate-200">{selectedDetail.transaction.paymentId ? `#${selectedDetail.transaction.paymentId}` : '-'}</strong>
                  </div>
                  {selectedDetail.transaction.description && (
                    <div className="sm:col-span-2 lg:col-span-4 mt-1 pt-2 border-t border-slate-700/50">
                      <span className="text-slate-400 block mb-0.5">Açıklama: </span>
                      <strong className="text-slate-200">{selectedDetail.transaction.description}</strong>
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      Yevmiye Kalemleri ({selectedDetail.entries.length} satır)
                    </h3>
                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${
                      selectedDetail.isBalanced ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {selectedDetail.isBalanced ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      {selectedDetail.isBalanced ? 'Fiş Dengeli (Borç = Alacak)' : 'Dengesiz Fiş!'}
                    </div>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table text-xs">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th text-center w-12">Sıra</th>
                          <th className="ds-th">GL Hesap Kodu</th>
                          <th className="ds-th">Hesap Adı</th>
                          <th className="ds-th">Açıklama</th>
                          <th className="ds-th-right">Borç (Debit)</th>
                          <th className="ds-th-right">Alacak (Credit)</th>
                          <th className="ds-th">Cari / İlgili</th>
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
