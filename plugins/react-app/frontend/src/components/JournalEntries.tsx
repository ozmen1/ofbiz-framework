import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, Plus, Eye, CheckCircle2, Clock, 
  AlertCircle, Loader2, BookOpen, Layers,
  Filter, FileText, Send 
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText size={28} color="var(--primary)" />
            Yevmiye ve Mahsup Fişleri (Journal Entries)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Defter-i kebir kayıtları, mahsup fişleri, açılış/kapanış ve yevmiye hareketleri
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={loadTransactions} 
            className="glass-card" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          {onCreateNew && (
            <button 
              onClick={onCreateNew} 
              className="btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem' }}
            >
              <Plus size={18} />
              Yeni Yevmiye Fişi
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.15)', 
          border: '1px solid rgba(34, 197, 94, 0.3)', 
          color: '#4ade80', 
          padding: '0.875rem 1.25rem', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem' 
        }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div style={{ 
          background: 'rgba(239, 68, 68, 0.15)', 
          border: '1px solid rgba(239, 68, 68, 0.3)', 
          color: '#f87171', 
          padding: '0.875rem 1.25rem', 
          borderRadius: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.75rem' 
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} /> Toplam Fiş Sayısı
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sistemdeki tüm kayıtlar</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#4ade80" /> Defter-i Kebir'e İşlenmiş
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>{postedCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Onaylı resmi yevmiye fişleri</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="#facc15" /> Taslak Fişler
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#facc15' }}>{draftCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Onay bekleyen kayıtlar</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={16} color="#60a5fa" /> Toplam İşlem Tutarı
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalVolume)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sayfalanan fişlerin hacmi</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            placeholder="Fiş No, açıklama veya belge no ile ara..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setViewIndex(0); }}
            style={{
              width: '100%',
              padding: '0.625rem 1rem 0.625rem 2.75rem',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--glass-border)',
              borderRadius: '8px',
              color: 'white',
              outline: 'none',
              fontSize: '0.875rem'
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={isPostedFilter}
          onChange={e => { setIsPostedFilter(e.target.value); setViewIndex(0); }}
          style={{
            padding: '0.625rem 1rem',
            background: '#1e293b',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.875rem'
          }}
        >
          <option value="">Tüm Durumlar (Hepsi)</option>
          <option value="Y">Yalnızca Onaylı (Posted)</option>
          <option value="N">Yalnızca Taslak (Draft)</option>
        </select>

        {/* Transaction Type Filter */}
        <select
          value={transTypeFilter}
          onChange={e => { setTransTypeFilter(e.target.value); setViewIndex(0); }}
          style={{
            padding: '0.625rem 1rem',
            background: '#1e293b',
            border: '1px solid var(--glass-border)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '0.875rem',
            maxWidth: '220px'
          }}
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
      <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fiş No</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tarih</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Fiş Türü</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Açıklama</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Belge / Ref</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Toplam Borç</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Toplam Alacak</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Durum</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                      <span>Yevmiye fişleri yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Filter size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p>Kriterlere uygun yevmiye fişi bulunamadı.</p>
                  </td>
                </tr>
              ) : (
                transactions.map(tr => {
                  const isPosted = tr.isPosted === 'Y';
                  return (
                    <tr 
                      key={tr.acctgTransId}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s ease' }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>
                        #{tr.acctgTransId}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {tr.transactionDate ? tr.transactionDate.substring(0, 10) : '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: '#818cf8',
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}>
                          {tr.acctgTransTypeDesc || tr.acctgTransTypeId}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tr.description || '-'}
                        {tr.invoiceId && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            (Fatura: #{tr.invoiceId})
                          </span>
                        )}
                        {tr.paymentId && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            (Ödeme: #{tr.paymentId})
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {tr.voucherRef || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tr.totalDebit || 0)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#fb923c' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tr.totalCredit || 0)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: isPosted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                          color: isPosted ? '#4ade80' : '#facc15',
                          border: `1px solid ${isPosted ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`
                        }}>
                          {isPosted ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {isPosted ? 'Onaylı (Posted)' : 'Taslak (Draft)'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenDetail(tr.acctgTransId)}
                            className="glass-card"
                            title="Fiş Detayı ve Satırlar"
                            style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                            İncele
                          </button>
                          {!isPosted && (
                            <button
                              onClick={() => handlePostTransaction(tr.acctgTransId)}
                              title="Defter-i Kebir'e İşle (Post)"
                              style={{
                                padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                                fontSize: '0.75rem', cursor: 'pointer', borderRadius: '8px', border: 'none',
                                background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', fontWeight: 600
                              }}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--glass-border)' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Toplam <strong>{totalCount}</strong> fiş kaydı (Sayfa {viewIndex + 1} / {Math.max(1, Math.ceil(totalCount / viewSize))})
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              disabled={viewIndex === 0}
              onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
              className="glass-card"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', cursor: viewIndex === 0 ? 'not-allowed' : 'pointer', opacity: viewIndex === 0 ? 0.5 : 1 }}
            >
              Önceki
            </button>
            <button
              disabled={(viewIndex + 1) * viewSize >= totalCount}
              onClick={() => setViewIndex(prev => prev + 1)}
              className="glass-card"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', cursor: (viewIndex + 1) * viewSize >= totalCount ? 'not-allowed' : 'pointer', opacity: (viewIndex + 1) * viewSize >= totalCount ? 0.5 : 1 }}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      {showDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '950px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={20} color="var(--primary)" />
                  Yevmiye Fişi Detayı: #{selectedDetail?.transaction.acctgTransId}
                </h2>
                {selectedDetail && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Tarih: {selectedDetail.transaction.transactionDate?.substring(0, 19)} | Tür: {selectedDetail.transaction.acctgTransTypeDesc}
                  </div>
                )}
              </div>
              <button 
                onClick={() => setShowDetailModal(false)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Fiş satırları getiriliyor...</p>
              </div>
            ) : selectedDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Status & Posting Action Banner */}
                <div style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: selectedDetail.transaction.isPosted === 'Y' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                  border: `1px solid ${selectedDetail.transaction.isPosted === 'Y' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {selectedDetail.transaction.isPosted === 'Y' ? (
                      <CheckCircle2 size={24} color="#4ade80" />
                    ) : (
                      <Clock size={24} color="#facc15" />
                    )}
                    <div>
                      <div style={{ fontWeight: 700, color: selectedDetail.transaction.isPosted === 'Y' ? '#4ade80' : '#facc15' }}>
                        {selectedDetail.transaction.isPosted === 'Y' ? 'Defter-i Kebir’e Onaylandı (Posted)' : 'Taslak Kayıt (Draft)'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
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
                      className="btn-primary"
                      style={{ padding: '0.625rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                      {postingLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      Defter-i Kebir'e İşle (Post)
                    </button>
                  )}
                </div>

                {/* Header Information Grid */}
                <div className="glass-card" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Mali Tür (Fiscal Type): </span>
                    <strong>{selectedDetail.transaction.glFiscalTypeDesc || selectedDetail.transaction.glFiscalTypeId}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Belge / Fiş Ref No: </span>
                    <strong>{selectedDetail.transaction.voucherRef || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>İlişkili Fatura: </span>
                    <strong>{selectedDetail.transaction.invoiceId ? `#${selectedDetail.transaction.invoiceId}` : '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>İlişkili Ödeme: </span>
                    <strong>{selectedDetail.transaction.paymentId ? `#${selectedDetail.transaction.paymentId}` : '-'}</strong>
                  </div>
                  {selectedDetail.transaction.description && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Açıklama: </span>
                      <strong>{selectedDetail.transaction.description}</strong>
                    </div>
                  )}
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Yevmiye Kalemleri ({selectedDetail.entries.length} satır)
                    </h3>
                    <div style={{ 
                      fontSize: '0.8125rem', 
                      fontWeight: 600, 
                      color: selectedDetail.isBalanced ? '#4ade80' : '#f87171',
                      display: 'flex', alignItems: 'center', gap: '0.35rem' 
                    }}>
                      {selectedDetail.isBalanced ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                      {selectedDetail.isBalanced ? 'Fiş Dengeli (Borç = Alacak)' : 'Dengesiz Fiş!'}
                    </div>
                  </div>

                  <div className="glass-card" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: '50px' }}>Sıra</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>GL Hesap Kodu</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Hesap Adı</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Açıklama</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Borç (Debit)</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Alacak (Credit)</th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Cari / İlgili</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDetail.entries.map((entry, idx) => (
                          <tr key={entry.acctgTransEntrySeqId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>
                              {entry.accountCode || entry.glAccountId}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                              {entry.accountName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                              {entry.description || '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: entry.debitCreditFlag === 'D' ? '#60a5fa' : 'var(--text-muted)' }}>
                              {entry.debitCreditFlag === 'D' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: entry.currencyUomId || 'USD' }).format(entry.amount) : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: entry.debitCreditFlag === 'C' ? '#fb923c' : 'var(--text-muted)' }}>
                              {entry.debitCreditFlag === 'C' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: entry.currencyUomId || 'USD' }).format(entry.amount) : '-'}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                              {entry.partyName || entry.partyId || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', fontWeight: 800, borderTop: '2px solid var(--glass-border)' }}>
                          <td colSpan={4} style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                            GENEL TOPLAMLAR:
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#60a5fa', fontSize: '0.9375rem' }}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedDetail.totalDebit)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#fb923c', fontSize: '0.9375rem' }}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedDetail.totalCredit)}
                          </td>
                          <td style={{ padding: '0.875rem 1rem' }}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowDetailModal(false)}
                className="glass-card"
                style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
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
