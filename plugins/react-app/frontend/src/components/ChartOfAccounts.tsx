import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, Plus, Edit3, Eye, CheckCircle2, 
  X, AlertCircle, Loader2, BookOpen, Layers,
  Filter, Building, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { 
  api, 
  GlAccountItem, 
  GlAccountDetail, 
  GlAccountEntryItem, 
  GlMetadataResponse,
  CreateGlAccountPayload,
  UpdateGlAccountPayload 
} from '../services/api';

const getClassBadgeStyle = (classId: string) => {
  const c = classId.toUpperCase();
  if (c.includes('ASSET') || c.includes('CASH')) {
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
  }
  if (c.includes('LIABILITY')) {
    return { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' };
  }
  if (c.includes('EQUITY')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
  }
  if (c.includes('REVENUE') || c.includes('INCOME')) {
    return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
  }
  if (c.includes('EXPENSE')) {
    return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
  }
  return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
};

type QuickClassFilter = 'ALL' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface ChartOfAccountsProps {
  onSelectTransaction?: (acctgTransId: string) => void;
}

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ onSelectTransaction }) => {
  const [accounts, setAccounts] = useState<GlAccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [classFilter, setClassFilter] = useState<QuickClassFilter>('ALL');
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);
  const [viewIndex, setViewIndex] = useState<number>(0);
  const [viewSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Metadata
  const [metadata, setMetadata] = useState<GlMetadataResponse['metadata'] | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // Detail Modal State
  const [selectedAccountDetail, setSelectedAccountDetail] = useState<GlAccountDetail | null>(null);
  const [accountEntries, setAccountEntries] = useState<GlAccountEntryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateGlAccountPayload>({
    accountCode: '',
    accountName: '',
    glAccountClassId: 'CURRENT_ASSET',
    glAccountTypeId: '_NA_',
    glResourceTypeId: 'MONEY',
    parentGlAccountId: '',
    description: '',
    organizationPartyId: 'Company'
  });
  const [createLoading, setCreateLoading] = useState<boolean>(false);

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateGlAccountPayload>({
    glAccountId: '',
    accountName: '',
    glAccountClassId: '',
    glAccountTypeId: '',
    parentGlAccountId: '',
    description: '',
    isAssigned: 'Y'
  });
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Load Metadata
  useEffect(() => {
    api.getGlMetadata()
      .then(res => {
        if (res?.metadata) setMetadata(res.metadata);
      })
      .catch(err => console.warn('Could not load GL metadata:', err));
  }, []);

  // Fetch Accounts
  const loadAccounts = useCallback(() => {
    setLoading(true);
    setError(null);

    const payload: Record<string, any> = {
      viewIndex,
      viewSize,
      organizationPartyId: 'Company',
    };

    if (searchTerm) payload.search = searchTerm;
    if (assignedOnly) payload.assignedOnly = 'Y';
    if (classFilter !== 'ALL') {
      payload.glAccountClassId = classFilter;
    }

    api.getGlAccounts(payload)
      .then(res => {
        setAccounts(res.accounts || []);
        setTotalCount(res.totalCount || 0);
      })
      .catch(err => setError(err.message || 'Hesap planı yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [viewIndex, viewSize, searchTerm, classFilter, assignedOnly]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Open Account Details
  const handleOpenDetail = async (glAccountId: string) => {
    setDetailLoading(true);
    setShowDetailModal(true);
    setSelectedAccountDetail(null);
    setAccountEntries([]);

    try {
      const res = await api.getGlAccountDetails(glAccountId, 'Company');
      setSelectedAccountDetail(res.account);
      setAccountEntries(res.recentEntries || []);
    } catch (err: any) {
      setError(err.message || 'Hesap detayı yüklenemedi.');
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (acc: GlAccountItem) => {
    setEditForm({
      glAccountId: acc.glAccountId,
      accountName: acc.accountName,
      glAccountClassId: acc.glAccountClassId,
      glAccountTypeId: acc.glAccountTypeId,
      parentGlAccountId: acc.parentGlAccountId || '',
      description: acc.description || '',
      isAssigned: acc.isAssigned ? 'Y' : 'N'
    });
    setShowEditModal(true);
  };

  // Toggle Organization Assignment
  const handleToggleAssign = async (glAccountId: string, currentAssigned: boolean) => {
    try {
      const targetAssign = currentAssigned ? 'N' : 'Y';
      await api.assignGlAccountToOrg(glAccountId, targetAssign, 'Company');
      setSuccessMsg(targetAssign === 'Y' ? 'Hesap şirkete atandı.' : 'Hesap şirket ataması kaldırıldı.');
      setTimeout(() => setSuccessMsg(null), 3000);
      
      // Update local state
      setAccounts(prev => prev.map(a => a.glAccountId === glAccountId ? { ...a, isAssigned: targetAssign === 'Y' } : a));
      if (selectedAccountDetail && selectedAccountDetail.glAccountId === glAccountId) {
        setSelectedAccountDetail(prev => prev ? { ...prev, isAssigned: targetAssign === 'Y' } : null);
      }
    } catch (err: any) {
      alert('Atama durumu değiştirilemedi: ' + err.message);
    }
  };

  // Submit Create Account
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await api.createGlAccount(createForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'Yeni hesap başarıyla oluşturuldu.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowCreateModal(false);
      setCreateForm({
        accountCode: '',
        accountName: '',
        glAccountClassId: 'CURRENT_ASSET',
        glAccountTypeId: '_NA_',
        glResourceTypeId: 'MONEY',
        parentGlAccountId: '',
        description: '',
        organizationPartyId: 'Company'
      });
      loadAccounts();
    } catch (err: any) {
      alert('Hesap oluşturulurken hata: ' + err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  // Submit Edit Account
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const res = await api.updateGlAccount(editForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'Hesap güncellendi.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowEditModal(false);
      loadAccounts();
    } catch (err: any) {
      alert('Hesap güncellenirken hata: ' + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Stats calculation
  const totalAssignedCount = accounts.filter(a => a.isAssigned).length;
  const assetCount = accounts.filter(a => a.glAccountClassId.includes('ASSET')).length;
  const expenseCount = accounts.filter(a => a.glAccountClassId.includes('EXPENSE')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={28} color="var(--primary)" />
            Hesap Planı (Chart of Accounts)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Tekdüzen hesap planı, muhasebe sınıfları ve şirket defter-i kebir hesap tanımları
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={loadAccounts} 
            className="glass-card" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem' }}
          >
            <Plus size={18} />
            Yeni Hesap Ekle
          </button>
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
            <Layers size={16} /> Toplam Hesap
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sistemde kayıtlı hesaplar</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={16} color="#60a5fa" /> Şirkete Atanan
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa' }}>{totalAssignedCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aktif kullanılan hesaplar</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpRight size={16} color="#4ade80" /> Varlık Hesapları
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>{assetCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Kasa, banka, alacaklar vb.</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowDownLeft size={16} color="#f87171" /> Gider Hesapları
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f87171' }}>{expenseCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Maliyet ve faaliyet giderleri</div>
        </div>
      </div>

      {/* Filter Bar & Class Tabs */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Class Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'Tüm Hesaplar' },
            { id: 'ASSET', label: '1 - Varlıklar (Asset)' },
            { id: 'LIABILITY', label: '2 - Yabancı Kaynaklar (Liability)' },
            { id: 'EQUITY', label: '3 - Özkaynaklar (Equity)' },
            { id: 'REVENUE', label: '4 - Gelirler (Revenue)' },
            { id: 'EXPENSE', label: '5 - Giderler (Expense)' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setClassFilter(tab.id as QuickClassFilter); setViewIndex(0); }}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: classFilter === tab.id ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                background: classFilter === tab.id ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                color: classFilter === tab.id ? '#818cf8' : 'var(--text-muted)',
                fontWeight: classFilter === tab.id ? 700 : 500,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Checkbox */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text"
              placeholder="Hesap kodu, hesap adı veya açıklama ile ara..."
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

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <input 
              type="checkbox"
              checked={assignedOnly}
              onChange={e => { setAssignedOnly(e.target.checked); setViewIndex(0); }}
              style={{ cursor: 'pointer' }}
            />
            <span>Yalnızca Şirkete Atananlar</span>
          </label>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="glass-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hesap Kodu</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hesap Adı</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sınıf (Class)</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tür (Type)</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Üst Hesap</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Şirket Durumu</th>
                <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                      <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                      <span>Hesap planı yükleniyor...</span>
                    </div>
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Filter size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p>Kriterlere uygun GL hesabı bulunamadı.</p>
                  </td>
                </tr>
              ) : (
                accounts.map(acc => {
                  const badgeStyle = getClassBadgeStyle(acc.glAccountClassId);
                  return (
                    <tr 
                      key={acc.glAccountId}
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>
                        {acc.accountCode}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                        {acc.accountName}
                        {acc.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {acc.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span style={{ 
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: badgeStyle.bg,
                          color: badgeStyle.text,
                          border: `1px solid ${badgeStyle.border}`
                        }}>
                          {acc.glAccountClassDesc || acc.glAccountClassId}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {acc.glAccountTypeDesc || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                        {acc.parentGlAccountId || '-'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleAssign(acc.glAccountId, acc.isAssigned)}
                          title="Şirket atamasını aç/kapat"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: 'none',
                            background: acc.isAssigned ? 'rgba(34, 197, 94, 0.15)' : 'rgba(148, 163, 184, 0.1)',
                            color: acc.isAssigned ? '#4ade80' : '#94a3b8'
                          }}
                        >
                          {acc.isAssigned ? (
                            <>
                              <CheckCircle2 size={12} />
                              Atandı
                            </>
                          ) : (
                            <span>Boşta</span>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            onClick={() => handleOpenDetail(acc.glAccountId)}
                            className="glass-card"
                            title="Hesap Detayı ve Hareketleri"
                            style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            <Eye size={14} />
                            İncele
                          </button>
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="glass-card"
                            title="Hesabı Düzenle"
                            style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}
                          >
                            <Edit3 size={14} />
                          </button>
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
            Toplam <strong>{totalCount}</strong> hesap (Sayfa {viewIndex + 1} / {Math.max(1, Math.ceil(totalCount / viewSize))})
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

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--primary)" />
                Yeni Hesap Tanımla
              </h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Kodu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 102100"
                    value={createForm.accountCode}
                    onChange={e => setCreateForm({ ...createForm, accountCode: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Adı *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: Garanti Bankası Vadesiz TL"
                    value={createForm.accountName}
                    onChange={e => setCreateForm({ ...createForm, accountName: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Sınıfı (Class) *
                  </label>
                  <select
                    value={createForm.glAccountClassId}
                    onChange={e => setCreateForm({ ...createForm, glAccountClassId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    {metadata?.glAccountClasses?.map(c => (
                      <option key={c.glAccountClassId} value={c.glAccountClassId}>
                        {c.description || c.glAccountClassId}
                      </option>
                    )) || (
                      <>
                        <option value="CURRENT_ASSET">Current Asset (Dönen Varlık)</option>
                        <option value="CASH_EQUIVALENT">Cash and Equivalent (Nakit ve Benzerleri)</option>
                        <option value="LONGTERM_ASSET">Long Term Asset (Duran Varlık)</option>
                        <option value="CURRENT_LIABILITY">Current Liability (Kısa Vadeli Yükümlülük)</option>
                        <option value="LONGTERM_LIABILITY">Long Term Liability (Uzun Vadeli Yükümlülük)</option>
                        <option value="EQUITY">Equity (Özkaynak)</option>
                        <option value="REVENUE">Revenue (Gelir)</option>
                        <option value="EXPENSE">Expense (Gider)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Türü (Type)
                  </label>
                  <select
                    value={createForm.glAccountTypeId}
                    onChange={e => setCreateForm({ ...createForm, glAccountTypeId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="_NA_">-- Seçiniz / _NA_ --</option>
                    {metadata?.glAccountTypes?.map(t => (
                      <option key={t.glAccountTypeId} value={t.glAccountTypeId}>
                        {t.description || t.glAccountTypeId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Üst Hesap (Bağlı Olduğu Ana Hesap)
                </label>
                <select
                  value={createForm.parentGlAccountId}
                  onChange={e => setCreateForm({ ...createForm, parentGlAccountId: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                >
                  <option value="">-- Yok (Ana Hesap) --</option>
                  {metadata?.accounts?.map(a => (
                    <option key={a.glAccountId} value={a.glAccountId}>
                      {a.accountCode} - {a.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  placeholder="Hesabın muhasebe tanımı ve kullanım amacı..."
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {createLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Hesabı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="var(--primary)" />
                Hesabı Düzenle: {editForm.glAccountId}
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Hesap Adı *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.accountName}
                  onChange={e => setEditForm({ ...editForm, accountName: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Sınıfı (Class)
                  </label>
                  <select
                    value={editForm.glAccountClassId}
                    onChange={e => setEditForm({ ...editForm, glAccountClassId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    {metadata?.glAccountClasses?.map(c => (
                      <option key={c.glAccountClassId} value={c.glAccountClassId}>
                        {c.description || c.glAccountClassId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Türü (Type)
                  </label>
                  <select
                    value={editForm.glAccountTypeId}
                    onChange={e => setEditForm({ ...editForm, glAccountTypeId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="_NA_">-- _NA_ --</option>
                    {metadata?.glAccountTypes?.map(t => (
                      <option key={t.glAccountTypeId} value={t.glAccountTypeId}>
                        {t.description || t.glAccountTypeId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Üst Hesap
                </label>
                <select
                  value={editForm.parentGlAccountId}
                  onChange={e => setEditForm({ ...editForm, parentGlAccountId: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                >
                  <option value="">-- Yok (Ana Hesap) --</option>
                  {metadata?.accounts?.filter(a => a.glAccountId !== editForm.glAccountId).map(a => (
                    <option key={a.glAccountId} value={a.glAccountId}>
                      {a.accountCode} - {a.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={editForm.isAssigned === 'Y'}
                    onChange={e => setEditForm({ ...editForm, isAssigned: e.target.checked ? 'Y' : 'N' })}
                  />
                  <span>Şirket (Company) defterinde aktif hesap olarak kullan</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {editLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & RECENT ENTRIES MODAL */}
      {showDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={20} color="var(--primary)" />
                  Hesap Özeti & Defter-i Kebir Hareketleri
                </h2>
                {selectedAccountDetail && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedAccountDetail.accountCode} - {selectedAccountDetail.accountName}
                  </div>
                )}
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Hesap hareketleri getiriliyor...</p>
              </div>
            ) : selectedAccountDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Balance Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Normal Bakiye Yönü</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                      {selectedAccountDetail.normalSide === 'D' ? 'Borç Bakiyeli (Debit)' : 'Alacak Bakiyeli (Credit)'}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Toplam Borç (Debit)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedAccountDetail.totalDebits || 0)}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Toplam Alacak (Credit)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb923c' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedAccountDetail.totalCredits || 0)}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Net Bakiye</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedAccountDetail.balance || 0)}
                    </div>
                  </div>
                </div>

                {/* Account Properties */}
                <div className="glass-card" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Sınıf: </span>
                    <strong>{selectedAccountDetail.glAccountClassDesc || selectedAccountDetail.glAccountClassId}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Tür: </span>
                    <strong>{selectedAccountDetail.glAccountTypeDesc || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Üst Hesap: </span>
                    <strong>{selectedAccountDetail.parentAccountName || selectedAccountDetail.parentGlAccountId || 'Yok'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Şirket Durumu: </span>
                    <strong style={{ color: selectedAccountDetail.isAssigned ? '#4ade80' : '#94a3b8' }}>
                      {selectedAccountDetail.isAssigned ? 'Atandı (Aktif)' : 'Boşta'}
                    </strong>
                  </div>
                </div>

                {/* Recent Entries Table */}
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                    Son Yevmiye Hareketleri ({accountEntries.length})
                  </h3>

                  {accountEntries.length === 0 ? (
                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Bu hesaba ait henüz onaylı bir yevmiye kaydı bulunmuyor.
                    </div>
                  ) : (
                    <div className="glass-card" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Tarih</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Fiş No</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>İşlem Türü</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Açıklama</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Borç (Debit)</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Alacak (Credit)</th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Cari / İlgili</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountEntries.map(e => (
                            <tr key={`${e.acctgTransId}-${e.acctgTransEntrySeqId}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {e.transactionDate ? e.transactionDate.substring(0, 10) : '-'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                                {onSelectTransaction ? (
                                  <button
                                    onClick={() => {
                                      setShowDetailModal(false);
                                      onSelectTransaction(e.acctgTransId);
                                    }}
                                    style={{
                                      background: 'none', border: 'none', color: '#818cf8',
                                      cursor: 'pointer', textDecoration: 'underline', padding: 0, font: 'inherit', fontWeight: 700
                                    }}
                                  >
                                    #{e.acctgTransId}
                                  </button>
                                ) : (
                                  <span>#{e.acctgTransId}</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>{e.transTypeDescription || e.acctgTransTypeId}</td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{e.description || '-'}</td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: e.debitCreditFlag === 'D' ? '#60a5fa' : 'var(--text-muted)' }}>
                                {e.debitCreditFlag === 'D' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: e.currencyUomId || 'USD' }).format(e.amount) : '-'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: e.debitCreditFlag === 'C' ? '#fb923c' : 'var(--text-muted)' }}>
                                {e.debitCreditFlag === 'C' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: e.currencyUomId || 'USD' }).format(e.amount) : '-'}
                              </td>
                              <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>{e.partyName || e.partyId || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
export default ChartOfAccounts;
