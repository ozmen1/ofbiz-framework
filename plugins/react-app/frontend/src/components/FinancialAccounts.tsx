import React, { useState, useEffect, useCallback } from 'react';
import { 
  Landmark, Search, RefreshCw, Plus, ArrowRightLeft, 
  CheckCircle2, Clock, X, AlertCircle, Loader2, 
  ArrowUpRight, ArrowDownLeft, Eye, Edit3, Filter, 
  Wallet, FileSpreadsheet, Check, Link2, 
  Unlink2, DollarSign, Ban
} from 'lucide-react';
import { 
  api, 
  FinAccountItem, 
  FinAccountDetail, 
  FinAccountTransItem, 
  GlReconciliationItem,
  FinAccountMetadataResponse,
  CreateFinAccountPayload,
  UpdateFinAccountPayload,
  CreateFinAccountTransPayload,
  TransferFinAccountsPayload,
  CreateGlReconciliationPayload
} from '../services/api';

type FinAccountTab = 'accounts' | 'transactions' | 'reconciliation';

export const FinancialAccounts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinAccountTab>('accounts');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<FinAccountMetadataResponse['metadata'] | null>(null);

  // TAB 1: Accounts State
  const [accounts, setAccounts] = useState<FinAccountItem[]>([]);
  const [totalAccountsCount, setTotalAccountsCount] = useState<number>(0);
  const [totalActiveBalance, setTotalActiveBalance] = useState<number>(0);
  const [accSearch, setAccSearch] = useState<string>('');
  const [accTypeFilter, setAccTypeFilter] = useState<string>('');
  const [accStatusFilter, setAccStatusFilter] = useState<string>('');

  // TAB 2: Transactions State
  const [transactions, setTransactions] = useState<FinAccountTransItem[]>([]);
  const [totalTransCount, setTotalTransCount] = useState<number>(0);
  const [transSearch, setTransSearch] = useState<string>('');
  const [transAccountFilter, setTransAccountFilter] = useState<string>('');
  const [transTypeFilter, setTransTypeFilter] = useState<string>('');
  const [transStatusFilter, setTransStatusFilter] = useState<string>('');
  const [transViewIndex, setTransViewIndex] = useState<number>(0);

  // TAB 3: Reconciliations State
  const [reconciliations, setReconciliations] = useState<GlReconciliationItem[]>([]);
  const [selectedReconciliationId, setSelectedReconciliationId] = useState<string | null>(null);
  const [reconciliationDetail, setReconciliationDetail] = useState<{
    reconciliation: any;
    linkedTransactions: FinAccountTransItem[];
    unlinkedTransactions: FinAccountTransItem[];
  } | null>(null);
  const [recDetailLoading, setRecDetailLoading] = useState<boolean>(false);

  // MODALS
  const [showCreateAccountModal, setShowCreateAccountModal] = useState<boolean>(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState<boolean>(false);
  const [showAccountDetailModal, setShowAccountDetailModal] = useState<boolean>(false);
  const [showTransModal, setShowTransModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showCreateRecModal, setShowCreateRecModal] = useState<boolean>(false);

  // Selected Detail State
  const [selectedAccountDetail, setSelectedAccountDetail] = useState<FinAccountDetail | null>(null);
  const [accountTransList, setAccountTransList] = useState<FinAccountTransItem[]>([]);
  const [accountDetailLoading, setAccountDetailLoading] = useState<boolean>(false);

  // Form States
  const [createAccountForm, setCreateAccountForm] = useState<CreateFinAccountPayload>({
    finAccountId: '',
    finAccountName: '',
    finAccountTypeId: 'BANK_ACCOUNT',
    finAccountCode: '',
    currencyUomId: 'USD',
    postToGlAccountId: '111100',
    statusId: 'FNACT_ACTIVE',
    initialBalance: 0
  });

  const [editAccountForm, setEditAccountForm] = useState<UpdateFinAccountPayload>({
    finAccountId: '',
    finAccountName: '',
    finAccountCode: '',
    finAccountTypeId: '',
    statusId: 'FNACT_ACTIVE',
    currencyUomId: 'USD',
    postToGlAccountId: ''
  });

  const [transForm, setTransForm] = useState<CreateFinAccountTransPayload>({
    finAccountId: '',
    finAccountTransTypeId: 'DEPOSIT',
    amount: 0,
    transactionDate: new Date().toISOString().substring(0, 10),
    comments: '',
    statusId: 'FINACT_TRNS_APPROVED'
  });

  const [transferForm, setTransferForm] = useState<TransferFinAccountsPayload>({
    fromFinAccountId: '',
    toFinAccountId: '',
    amount: 0,
    transactionDate: new Date().toISOString().substring(0, 10),
    comments: ''
  });

  const [createRecForm, setCreateRecForm] = useState<CreateGlReconciliationPayload>({
    glReconciliationName: '',
    glAccountId: '111100',
    reconciledBalance: 0,
    openingBalance: 0,
    reconciledDate: new Date().toISOString().substring(0, 10),
    description: ''
  });

  // Action loaders
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Load Metadata once
  useEffect(() => {
    api.getFinAccountMetadata()
      .then(res => {
        if (res?.metadata) setMetadata(res.metadata);
      })
      .catch(err => console.warn('Could not load finAccount metadata:', err));
  }, []);

  // Fetch Accounts
  const loadAccounts = useCallback(() => {
    setLoading(true);
    setError(null);

    const payload: Record<string, any> = {
      organizationPartyId: 'Company',
    };
    if (accSearch) payload.search = accSearch;
    if (accTypeFilter) payload.finAccountTypeId = accTypeFilter;
    if (accStatusFilter) payload.statusId = accStatusFilter;

    api.getFinAccounts(payload)
      .then(res => {
        setAccounts(res.accounts || []);
        setTotalAccountsCount(res.totalCount || 0);
        setTotalActiveBalance(res.totalActiveBalance || 0);
      })
      .catch(err => setError(err.message || 'Hesaplar yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [accSearch, accTypeFilter, accStatusFilter]);

  // Fetch Transactions
  const loadTransactions = useCallback(() => {
    setLoading(true);
    setError(null);

    const payload: Record<string, any> = {
      viewIndex: transViewIndex,
      viewSize: 50
    };
    if (transSearch) payload.search = transSearch;
    if (transAccountFilter) payload.finAccountId = transAccountFilter;
    if (transTypeFilter) payload.finAccountTransTypeId = transTypeFilter;
    if (transStatusFilter) payload.statusId = transStatusFilter;

    api.getFinAccountTransactions(payload)
      .then(res => {
        setTransactions(res.transactions || []);
        setTotalTransCount(res.totalCount || 0);
      })
      .catch(err => setError(err.message || 'Hesap hareketleri yüklenemedi.'))
      .finally(() => setLoading(false));
  }, [transViewIndex, transSearch, transAccountFilter, transTypeFilter, transStatusFilter]);

  // Fetch Reconciliations
  const loadReconciliations = useCallback(() => {
    setLoading(true);
    setError(null);

    api.getGlReconciliations({ organizationPartyId: 'Company' })
      .then(res => {
        setReconciliations(res.reconciliations || []);
      })
      .catch(err => setError(err.message || 'Mutabakat listesi yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  // Dispatch fetch based on active tab
  useEffect(() => {
    if (activeTab === 'accounts') loadAccounts();
    else if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'reconciliation') loadReconciliations();
  }, [activeTab, loadAccounts, loadTransactions, loadReconciliations]);

  // Load single reconciliation detail
  const handleOpenReconciliationDetail = async (glReconciliationId: string) => {
    setSelectedReconciliationId(glReconciliationId);
    setRecDetailLoading(true);
    try {
      const res = await api.getGlReconciliationDetails(glReconciliationId);
      setReconciliationDetail(res);
    } catch (err: any) {
      alert('Mutabakat detayı yüklenemedi: ' + err.message);
    } finally {
      setRecDetailLoading(false);
    }
  };

  // Open Account Details
  const handleOpenAccountDetail = async (finAccountId: string) => {
    setAccountDetailLoading(true);
    setShowAccountDetailModal(true);
    setSelectedAccountDetail(null);
    setAccountTransList([]);

    try {
      const res = await api.getFinAccountDetails(finAccountId);
      setSelectedAccountDetail(res.account);
      setAccountTransList(res.transactions || []);
    } catch (err: any) {
      setError(err.message || 'Hesap detayları yüklenemedi.');
    } finally {
      setAccountDetailLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditAccount = (acc: FinAccountItem) => {
    setEditAccountForm({
      finAccountId: acc.finAccountId,
      finAccountName: acc.finAccountName,
      finAccountCode: acc.finAccountCode || '',
      finAccountTypeId: acc.finAccountTypeId,
      statusId: acc.statusId,
      currencyUomId: acc.currencyUomId,
      postToGlAccountId: acc.postToGlAccountId || ''
    });
    setShowEditAccountModal(true);
  };

  // Open Trans Modal for specific account
  const handleOpenTransModal = (finAccountId: string, defaultType: 'DEPOSIT' | 'WITHDRAWAL' = 'DEPOSIT') => {
    setTransForm({
      finAccountId,
      finAccountTransTypeId: defaultType,
      amount: 0,
      transactionDate: new Date().toISOString().substring(0, 10),
      comments: '',
      statusId: 'FINACT_TRNS_APPROVED'
    });
    setShowTransModal(true);
  };

  // Open Transfer Modal
  const handleOpenTransferModal = (defaultFromId: string = '') => {
    setTransferForm({
      fromFinAccountId: defaultFromId || (accounts[0]?.finAccountId || ''),
      toFinAccountId: accounts[1]?.finAccountId || '',
      amount: 0,
      transactionDate: new Date().toISOString().substring(0, 10),
      comments: ''
    });
    setShowTransferModal(true);
  };

  // SUBMIT: Create Account
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createFinAccount(createAccountForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'Finansal hesap başarıyla oluşturuldu.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowCreateAccountModal(false);
      setCreateAccountForm({
        finAccountId: '',
        finAccountName: '',
        finAccountTypeId: 'BANK_ACCOUNT',
        finAccountCode: '',
        currencyUomId: 'USD',
        postToGlAccountId: '111100',
        statusId: 'FNACT_ACTIVE',
        initialBalance: 0
      });
      loadAccounts();
    } catch (err: any) {
      alert('Hesap oluşturulurken hata: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SUBMIT: Edit Account
  const handleEditAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.updateFinAccount(editAccountForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'Hesap güncellendi.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowEditAccountModal(false);
      loadAccounts();
    } catch (err: any) {
      alert('Hesap güncellenirken hata: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SUBMIT: Create Transaction
  const handleCreateTransSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transForm.amount <= 0 && transForm.finAccountTransTypeId !== 'ADJUSTMENT') {
      alert('Tutar sıfırdan büyük olmalıdır.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createFinAccountTrans(transForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'İşlem başarıyla kaydedildi.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowTransModal(false);
      if (activeTab === 'accounts') loadAccounts();
      else loadTransactions();
      if (showAccountDetailModal && selectedAccountDetail) {
        handleOpenAccountDetail(selectedAccountDetail.finAccountId);
      }
    } catch (err: any) {
      alert('İşlem kaydedilirken hata: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SUBMIT: Transfer (Virman)
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromFinAccountId === transferForm.toFinAccountId) {
      alert('Kaynak ve hedef hesap aynı olamaz.');
      return;
    }
    if (transferForm.amount <= 0) {
      alert('Transfer tutarı sıfırdan büyük olmalıdır.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.transferBetweenFinAccounts(transferForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'Virman işlemi tamamlandı.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowTransferModal(false);
      if (activeTab === 'accounts') loadAccounts();
      else loadTransactions();
    } catch (err: any) {
      alert('Virman işleminde hata: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SUBMIT: Create Reconciliation
  const handleCreateRecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await api.createGlReconciliation(createRecForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || 'Mutabakat kaydı oluşturuldu.');
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowCreateRecModal(false);
      loadReconciliations();
      handleOpenReconciliationDetail(res.glReconciliationId);
    } catch (err: any) {
      alert('Mutabakat oluşturulurken hata: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ACTION: Link / Unlink transaction to reconciliation
  const handleToggleReconcileTrans = async (transId: string, isLinked: boolean) => {
    if (!selectedReconciliationId) return;
    try {
      await api.reconcileTransactions({
        glReconciliationId: selectedReconciliationId,
        finAccountTransIds: [transId],
        action: isLinked ? 'UNLINK' : 'LINK'
      });
      // Refresh reconciliation detail
      handleOpenReconciliationDetail(selectedReconciliationId);
    } catch (err: any) {
      alert('İşlem mutabakata bağlanırken hata: ' + err.message);
    }
  };

  // ACTION: Complete Reconciliation
  const handleCompleteReconciliation = async () => {
    if (!selectedReconciliationId) return;
    if (!window.confirm('Bu mutabakatı onaylayıp kapatmak istediğinize emin misiniz?')) return;

    try {
      await api.reconcileTransactions({
        glReconciliationId: selectedReconciliationId,
        finAccountTransIds: [],
        markReconciled: 'Y'
      });
      setSuccessMsg('Mutabakat başarıyla tamamlandı ve kapatıldı.');
      setTimeout(() => setSuccessMsg(null), 3500);
      handleOpenReconciliationDetail(selectedReconciliationId);
      loadReconciliations();
    } catch (err: any) {
      alert('Mutabakat kapatılırken hata: ' + err.message);
    }
  };

  // Stats calculation
  const bankAccountsCount = accounts.filter(a => a.finAccountTypeId === 'BANK_ACCOUNT').length;
  const cashAccountsCount = accounts.filter(a => a.finAccountTypeId === 'DEPOSIT_ACCOUNT' || a.finAccountName.toLowerCase().includes('kasa')).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Landmark size={28} color="var(--primary)" />
            Kasa & Banka Yönetimi (Financial Accounts)
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Banka hesapları, nakit kasalar, hesap hareketleri, virman transferleri ve banka mutabakatı
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => {
              if (activeTab === 'accounts') loadAccounts();
              else if (activeTab === 'transactions') loadTransactions();
              else loadReconciliations();
            }} 
            className="glass-card" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>
          
          <button 
            onClick={() => handleOpenTransferModal()} 
            className="glass-card" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.125rem', cursor: 'pointer', color: '#60a5fa' }}
          >
            <ArrowRightLeft size={16} />
            Virman (Transfer)
          </button>

          <button 
            onClick={() => setShowCreateAccountModal(true)} 
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

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={16} color="var(--primary)" /> Toplam Kasa & Banka Varlığı
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4ade80' }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalActiveBalance)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aktif hesapların toplam fiili bakiyesi</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Landmark size={16} color="#60a5fa" /> Banka Hesapları
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa' }}>{bankAccountsCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Vadesiz mevduat & ticari hesaplar</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wallet size={16} color="#fb923c" /> Kasa Hesapları
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fb923c' }}>{cashAccountsCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Nakit & depozito kasaları</div>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={16} color="#c084fc" /> Toplam Hesap Sayısı
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{totalAccountsCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Sistemde kayıtlı tüm hesaplar</div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'accounts', label: 'Kasa & Banka Hesapları', icon: <Landmark size={18} /> },
          { id: 'transactions', label: 'Hesap Hareketleri (Transactions)', icon: <ArrowRightLeft size={18} /> },
          { id: 'reconciliation', label: 'Banka Mutabakatı (Reconciliation)', icon: <FileSpreadsheet size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FinAccountTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === tab.id ? '#818cf8' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ACCOUNTS LIST */}
      {activeTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Filters Bar */}
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Hesap adı, kodu veya ID ile ara..."
                value={accSearch}
                onChange={e => setAccSearch(e.target.value)}
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

            <select
              value={accTypeFilter}
              onChange={e => setAccTypeFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Hesap Türleri</option>
              {metadata?.finAccountTypes?.map(t => (
                <option key={t.finAccountTypeId} value={t.finAccountTypeId}>
                  {t.description || t.finAccountTypeId}
                </option>
              ))}
            </select>

            <select
              value={accStatusFilter}
              onChange={e => setAccStatusFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Durumlar</option>
              {metadata?.finAccountStatuses?.map(s => (
                <option key={s.statusId} value={s.statusId}>
                  {s.description || s.statusId}
                </option>
              ))}
            </select>
          </div>

          {/* Accounts Grid / Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hesap No / ID</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hesap Adı</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tür</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>GL Eşlemesi</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Fiili Bakiye</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Kullanılabilir</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Durum</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                          <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                          <span>Hesaplar yükleniyor...</span>
                        </div>
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Filter size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                        <p>Kriterlere uygun finansal hesap bulunamadı.</p>
                      </td>
                    </tr>
                  ) : (
                    accounts.map(acc => {
                      const isActive = acc.statusId === 'FNACT_ACTIVE';
                      return (
                        <tr key={acc.finAccountId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.15s ease' }} className="table-row-hover">
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>
                            {acc.finAccountId}
                            {acc.finAccountCode && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                                {acc.finAccountCode}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                            {acc.finAccountName}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: acc.finAccountTypeId === 'BANK_ACCOUNT' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                              color: acc.finAccountTypeId === 'BANK_ACCOUNT' ? '#60a5fa' : '#fb923c',
                              border: `1px solid ${acc.finAccountTypeId === 'BANK_ACCOUNT' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`
                            }}>
                              {acc.finAccountTypeDesc || acc.finAccountTypeId}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            {acc.postToGlAccountName || acc.postToGlAccountId || '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 800, color: '#4ade80', fontSize: '0.9375rem' }}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currencyUomId || 'USD' }).format(acc.actualBalance)}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currencyUomId || 'USD' }).format(acc.availableBalance)}
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
                              background: isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: isActive ? '#4ade80' : '#f87171'
                            }}>
                              {isActive ? <CheckCircle2 size={12} /> : <Ban size={12} />}
                              {acc.statusDesc || acc.statusId}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                              <button
                                onClick={() => handleOpenAccountDetail(acc.finAccountId)}
                                className="glass-card"
                                title="Hesap Detayı & Hareketler"
                                style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer' }}
                              >
                                <Eye size={14} />
                                İncele
                              </button>
                              <button
                                onClick={() => handleOpenTransModal(acc.finAccountId, 'DEPOSIT')}
                                className="glass-card"
                                title="Para Girişi (Deposit)"
                                style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', color: '#4ade80' }}
                              >
                                + Giriş
                              </button>
                              <button
                                onClick={() => handleOpenTransModal(acc.finAccountId, 'WITHDRAWAL')}
                                className="glass-card"
                                title="Para Çıkışı (Withdrawal)"
                                style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', cursor: 'pointer', color: '#f87171' }}
                              >
                                - Çıkış
                              </button>
                              <button
                                onClick={() => handleOpenEditAccount(acc)}
                                className="glass-card"
                                title="Hesabı Düzenle"
                                style={{ padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
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
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LIST */}
      {activeTab === 'transactions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="İşlem No veya açıklama ara..."
                value={transSearch}
                onChange={e => setTransSearch(e.target.value)}
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

            <select
              value={transAccountFilter}
              onChange={e => setTransAccountFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Hesaplar</option>
              {accounts.map(a => (
                <option key={a.finAccountId} value={a.finAccountId}>
                  {a.finAccountName} ({a.finAccountId})
                </option>
              ))}
            </select>

            <select
              value={transTypeFilter}
              onChange={e => setTransTypeFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm İşlem Türleri</option>
              <option value="DEPOSIT">Para Girişi (Deposit)</option>
              <option value="WITHDRAWAL">Para Çıkışı (Withdrawal)</option>
              <option value="ADJUSTMENT">Bakiye Düzeltme (Adjustment)</option>
            </select>

            <select
              value={transStatusFilter}
              onChange={e => setTransStatusFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Durumlar</option>
              <option value="FINACT_TRNS_CREATED">Oluşturuldu (Created)</option>
              <option value="FINACT_TRNS_APPROVED">Onaylandı (Approved)</option>
              <option value="FINACT_TRNS_CANCELED">İptal Edildi (Canceled)</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>İşlem No</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tarih</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hesap</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>İşlem Türü</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Tutar</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Açıklama</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Cari</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Durum</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Mutabakat</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                          <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                          <span>Hareketler yükleniyor...</span>
                        </div>
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Filter size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                        <p>Kriterlere uygun hareket kaydı bulunamadı.</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tr => {
                      const isDeposit = tr.finAccountTransTypeId === 'DEPOSIT';
                      const isWithdrawal = tr.finAccountTransTypeId === 'WITHDRAWAL';
                      return (
                        <tr key={tr.finAccountTransId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>
                            #{tr.finAccountTransId}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {tr.transactionDate ? tr.transactionDate.substring(0, 10) : '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                            {tr.finAccountName || tr.finAccountId}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: isDeposit ? 'rgba(34, 197, 94, 0.15)' : isWithdrawal ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: isDeposit ? '#4ade80' : isWithdrawal ? '#f87171' : '#60a5fa'
                            }}>
                              {isDeposit ? <ArrowDownLeft size={12} /> : isWithdrawal ? <ArrowUpRight size={12} /> : <ArrowRightLeft size={12} />}
                              {tr.finAccountTransTypeDesc || tr.finAccountTransTypeId}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 800, color: isDeposit ? '#4ade80' : '#f87171' }}>
                            {isDeposit ? '+' : isWithdrawal ? '-' : ''}
                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tr.amount)}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                            {tr.comments || '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                            {tr.partyName || tr.partyId || '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: tr.statusId === 'FINACT_TRNS_APPROVED' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: tr.statusId === 'FINACT_TRNS_APPROVED' ? '#4ade80' : '#facc15'
                            }}>
                              {tr.statusDesc || tr.statusId}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            {tr.glReconciliationId ? (
                              <span style={{ color: '#4ade80', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Check size={12} /> #{tr.glReconciliationId}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Açıkta</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderTop: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Toplam <strong>{totalTransCount}</strong> hareket kaydı
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  disabled={transViewIndex === 0}
                  onClick={() => setTransViewIndex(prev => Math.max(0, prev - 1))}
                  className="glass-card"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', cursor: transViewIndex === 0 ? 'not-allowed' : 'pointer', opacity: transViewIndex === 0 ? 0.5 : 1 }}
                >
                  Önceki
                </button>
                <button
                  disabled={(transViewIndex + 1) * 50 >= totalTransCount}
                  onClick={() => setTransViewIndex(prev => prev + 1)}
                  className="glass-card"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem', cursor: (transViewIndex + 1) * 50 >= totalTransCount ? 'not-allowed' : 'pointer', opacity: (transViewIndex + 1) * 50 >= totalTransCount ? 0.5 : 1 }}
                >
                  Sonraki
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BANK RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Banka Mutabakat Listesi</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Banka hesap ekstreleri ile OFBiz defter kayıtlarını eşleştirerek mutabakat sağlayın.
              </p>
            </div>
            <button
              onClick={() => setShowCreateRecModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem' }}
            >
              <Plus size={16} />
              Yeni Mutabakat Başlat
            </button>
          </div>

          {/* Reconciliations Table */}
          <div className="glass-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mutabakat ID</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mutabakat Tanımı</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>GL Hesabı</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Hedef Bakiye</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Eşleşen Hareket</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Durum</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Loader2 className="animate-spin" size={24} color="var(--primary)" style={{ margin: '0 auto' }} />
                    </td>
                  </tr>
                ) : reconciliations.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Henüz oluşturulmuş bir banka mutabakatı bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  reconciliations.map(r => {
                    const isReconciled = r.statusId === 'GLREC_RECONCILED';
                    return (
                      <tr key={r.glReconciliationId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, fontFamily: 'monospace' }}>
                          #{r.glReconciliationId}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                          {r.glReconciliationName}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                          {r.glAccountName}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#60a5fa' }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(r.reconciledBalance)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', fontWeight: 600 }}>
                            {r.transactionCount} adet
                          </span>
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
                            background: isReconciled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                            color: isReconciled ? '#4ade80' : '#facc15'
                          }}>
                            {isReconciled ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {r.statusDesc}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenReconciliationDetail(r.glReconciliationId)}
                            className="btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <FileSpreadsheet size={14} />
                            Çalışma Ekranı
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Interactive Reconciliation Workspace (when selected) */}
          {selectedReconciliationId && reconciliationDetail && (
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              
              {/* Workspace Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileSpreadsheet size={20} color="var(--primary)" />
                    Mutabakat Çalışma Ekranı: #{reconciliationDetail.reconciliation.glReconciliationId} - {reconciliationDetail.reconciliation.glReconciliationName}
                    {recDetailLoading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--primary)', marginLeft: '0.5rem' }} />}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Hesap: {reconciliationDetail.reconciliation.glAccountName} | Durum: {reconciliationDetail.reconciliation.statusDesc}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {reconciliationDetail.reconciliation.statusId !== 'GLREC_RECONCILED' && (
                    <button
                      onClick={handleCompleteReconciliation}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <CheckCircle2 size={16} />
                      Mutabakatı Onayla ve Kapat
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedReconciliationId(null); setReconciliationDetail(null); }}
                    className="glass-card"
                    style={{ padding: '0.5rem 0.875rem', cursor: 'pointer' }}
                  >
                    Kapat
                  </button>
                </div>
              </div>

              {/* Balance Verification Strip */}
              {(() => {
                const targetBal = Number(reconciliationDetail.reconciliation.reconciledBalance) || 0;
                const totalLinked = Number(reconciliationDetail.reconciliation.totalLinkedAmount) || 0;
                const diff = targetBal - totalLinked;
                const isMatched = Math.abs(diff) < 0.01;

                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    background: isMatched ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${isMatched ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Banka Ekstresi (Hedef Bakiye)</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa' }}>
                        ${targetBal.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Eşleştirilen Toplam Tutar</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb923c' }}>
                        ${totalLinked.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kalan Mutabakat Farkı</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isMatched ? '#4ade80' : '#f87171' }}>
                        ${diff.toFixed(2)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {isMatched ? (
                        <span style={{ color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.875rem' }}>
                          <CheckCircle2 size={18} /> Tam Uyuşma Sağlandı
                        </span>
                      ) : (
                        <span style={{ color: '#f87171', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                          <AlertCircle size={16} /> Fark var, eksik işlemleri eşleştirin
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Linked vs Unlinked Split Table */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
                
                {/* Left: Linked Transactions */}
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Link2 size={16} /> Eşleşen Hareketler ({reconciliationDetail.linkedTransactions.length})
                    </h4>
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {reconciliationDetail.linkedTransactions.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Henüz eşleşen hareket bulunmuyor. Sağdaki listeden ekleyebilirsiniz.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tarih</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tür</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Tutar</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconciliationDetail.linkedTransactions.map(tr => (
                            <tr key={tr.finAccountTransId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{tr.transactionDate?.substring(0, 10)}</td>
                              <td style={{ padding: '0.5rem' }}>{tr.finAccountTransTypeId}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
                                ${Number(tr.amount).toFixed(2)}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleToggleReconcileTrans(tr.finAccountTransId, true)}
                                  title="Eşleşmeyi Kaldır"
                                  style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                >
                                  <Unlink2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Right: Unlinked Transactions */}
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fb923c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Unlink2 size={16} /> Açıkta Kalan Hareketler ({reconciliationDetail.unlinkedTransactions.length})
                    </h4>
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {reconciliationDetail.unlinkedTransactions.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        Bu hesaba ait açıkta kalan hareket bulunmuyor.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tarih</th>
                            <th style={{ padding: '0.5rem', textAlign: 'left' }}>Tür</th>
                            <th style={{ padding: '0.5rem', textAlign: 'right' }}>Tutar</th>
                            <th style={{ padding: '0.5rem', textAlign: 'center' }}>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconciliationDetail.unlinkedTransactions.map(tr => (
                            <tr key={tr.finAccountTransId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{tr.transactionDate?.substring(0, 10)}</td>
                              <td style={{ padding: '0.5rem' }}>{tr.finAccountTransTypeId}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
                                ${Number(tr.amount).toFixed(2)}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <button
                                  onClick={() => handleToggleReconcileTrans(tr.finAccountTransId, false)}
                                  className="btn-primary"
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                                >
                                  Dahil Et
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* MODAL: CREATE ACCOUNT */}
      {showCreateAccountModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--primary)" />
                Yeni Kasa / Banka Hesabı Tanımla
              </h2>
              <button onClick={() => setShowCreateAccountModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap No / ID (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: GARANTI_01"
                    value={createAccountForm.finAccountId || ''}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountId: e.target.value })}
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
                    placeholder="Örn: Garanti BBVA Ticari TL"
                    value={createAccountForm.finAccountName}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountName: e.target.value })}
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
                    Hesap Türü *
                  </label>
                  <select
                    value={createAccountForm.finAccountTypeId}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountTypeId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    {metadata?.finAccountTypes?.map(t => (
                      <option key={t.finAccountTypeId} value={t.finAccountTypeId}>
                        {t.description || t.finAccountTypeId}
                      </option>
                    )) || (
                      <>
                        <option value="BANK_ACCOUNT">Banka Hesabı</option>
                        <option value="DEPOSIT_ACCOUNT">Nakit Kasa / Depozito</option>
                        <option value="CREDIT_CARD_ACCOUNT">Kredi Kartı Hesabı</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Para Birimi
                  </label>
                  <select
                    value={createAccountForm.currencyUomId}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, currencyUomId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="TRY">TRY (₺)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap No / IBAN
                  </label>
                  <input
                    type="text"
                    placeholder="TR00 0000 0000..."
                    value={createAccountForm.finAccountCode || ''}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountCode: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Defter-i Kebir (GL) Eşlemesi
                  </label>
                  <select
                    value={createAccountForm.postToGlAccountId || ''}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, postToGlAccountId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="">-- Eşleme Yok --</option>
                    {metadata?.glAccounts?.map(g => (
                      <option key={g.glAccountId} value={g.glAccountId}>
                        {g.accountCode} - {g.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Açılış Bakiyesi ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={createAccountForm.initialBalance || ''}
                  onChange={e => setCreateAccountForm({ ...createAccountForm, initialBalance: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                    fontWeight: 700
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Açılış bakiyesi girilirse otomatik onaylı para girişi (Deposit) hareketi oluşturulur.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Hesabı Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ACCOUNT */}
      {showEditAccountModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="var(--primary)" />
                Hesabı Düzenle: {editAccountForm.finAccountId}
              </h2>
              <button onClick={() => setShowEditAccountModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Hesap Adı *
                </label>
                <input
                  type="text"
                  required
                  value={editAccountForm.finAccountName}
                  onChange={e => setEditAccountForm({ ...editAccountForm, finAccountName: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap Türü
                  </label>
                  <select
                    value={editAccountForm.finAccountTypeId}
                    onChange={e => setEditAccountForm({ ...editAccountForm, finAccountTypeId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    {metadata?.finAccountTypes?.map(t => (
                      <option key={t.finAccountTypeId} value={t.finAccountTypeId}>
                        {t.description || t.finAccountTypeId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Durum
                  </label>
                  <select
                    value={editAccountForm.statusId}
                    onChange={e => setEditAccountForm({ ...editAccountForm, statusId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="FNACT_ACTIVE">Aktif (Active)</option>
                    <option value="FNACT_MANFROZEN">Donduruldu (Frozen)</option>
                    <option value="FNACT_CANCELLED">İptal Edildi (Cancelled)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hesap No / IBAN
                  </label>
                  <input
                    type="text"
                    value={editAccountForm.finAccountCode || ''}
                    onChange={e => setEditAccountForm({ ...editAccountForm, finAccountCode: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Defter-i Kebir (GL) Eşlemesi
                  </label>
                  <select
                    value={editAccountForm.postToGlAccountId || ''}
                    onChange={e => setEditAccountForm({ ...editAccountForm, postToGlAccountId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="">-- Eşleme Yok --</option>
                    {metadata?.glAccounts?.map(g => (
                      <option key={g.glAccountId} value={g.glAccountId}>
                        {g.accountCode} - {g.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditAccountModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK TRANSACTION (DEPOSIT / WITHDRAWAL) */}
      {showTransModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {transForm.finAccountTransTypeId === 'DEPOSIT' ? (
                  <ArrowDownLeft size={20} color="#4ade80" />
                ) : (
                  <ArrowUpRight size={20} color="#f87171" />
                )}
                {transForm.finAccountTransTypeId === 'DEPOSIT' ? 'Hesaba Para Girişi (Deposit)' : 'Hesaptan Para Çıkışı (Withdrawal)'}
              </h2>
              <button onClick={() => setShowTransModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  İlgili Finansal Hesap *
                </label>
                <select
                  value={transForm.finAccountId}
                  onChange={e => setTransForm({ ...transForm, finAccountId: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                >
                  {accounts.map(a => (
                    <option key={a.finAccountId} value={a.finAccountId}>
                      {a.finAccountName} ({a.finAccountId}) - Bakiye: ${Number(a.actualBalance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    İşlem Yönü *
                  </label>
                  <select
                    value={transForm.finAccountTransTypeId}
                    onChange={e => setTransForm({ ...transForm, finAccountTransTypeId: e.target.value as any })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    <option value="DEPOSIT">Giriş (+) Deposit</option>
                    <option value="WITHDRAWAL">Çıkış (-) Withdrawal</option>
                    <option value="ADJUSTMENT">Düzeltme (Adjustment)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Tutar ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transForm.amount || ''}
                    onChange={e => setTransForm({ ...transForm, amount: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                      fontWeight: 800
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={transForm.transactionDate}
                  onChange={e => setTransForm({ ...transForm, transactionDate: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  placeholder="İşlem açıklaması giriniz..."
                  value={transForm.comments || ''}
                  onChange={e => setTransForm({ ...transForm, comments: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTransModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  İşlemi Onayla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER (VIRMAN) */}
      {showTransferModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowRightLeft size={20} color="var(--primary)" />
                Virman / Hesaplar Arası Transfer
              </h2>
              <button onClick={() => setShowTransferModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Kaynak Hesap (Çıkış Yapılacak) *
                  </label>
                  <select
                    value={transferForm.fromFinAccountId}
                    onChange={e => setTransferForm({ ...transferForm, fromFinAccountId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    {accounts.map(a => (
                      <option key={a.finAccountId} value={a.finAccountId}>
                        {a.finAccountName} (${Number(a.actualBalance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Hedef Hesap (Giriş Yapılacak) *
                  </label>
                  <select
                    value={transferForm.toFinAccountId}
                    onChange={e => setTransferForm({ ...transferForm, toFinAccountId: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  >
                    {accounts.map(a => (
                      <option key={a.finAccountId} value={a.finAccountId}>
                        {a.finAccountName} (${Number(a.actualBalance).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Transfer Tutarı ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transferForm.amount || ''}
                    onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                      fontWeight: 800
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Transfer Tarihi
                  </label>
                  <input
                    type="date"
                    value={transferForm.transactionDate}
                    onChange={e => setTransferForm({ ...transferForm, transactionDate: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Garanti'den Merkez Kasaya nakit aktarımı"
                  value={transferForm.comments || ''}
                  onChange={e => setTransferForm({ ...transferForm, comments: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Virmanı Gerçekleştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE RECONCILIATION */}
      {showCreateRecModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet size={20} color="var(--primary)" />
                Yeni Banka Mutabakatı Başlat
              </h2>
              <button onClick={() => setShowCreateRecModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRecSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Mutabakat Tanımı / Dönemi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Garanti BBVA Eylül 2026 Ekstre Mutabakatı"
                  value={createRecForm.glReconciliationName}
                  onChange={e => setCreateRecForm({ ...createRecForm, glReconciliationName: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  İlgili Defter-i Kebir (GL) Hesabı *
                </label>
                <select
                  value={createRecForm.glAccountId}
                  onChange={e => setCreateRecForm({ ...createRecForm, glAccountId: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                >
                  {metadata?.glAccounts?.map(g => (
                    <option key={g.glAccountId} value={g.glAccountId}>
                      {g.accountCode} - {g.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Ekstre Hedef Bakiye ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={createRecForm.reconciledBalance || ''}
                    onChange={e => setCreateRecForm({ ...createRecForm, reconciledBalance: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                      fontWeight: 700
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Ekstre Tarihi
                  </label>
                  <input
                    type="date"
                    value={createRecForm.reconciledDate}
                    onChange={e => setCreateRecForm({ ...createRecForm, reconciledDate: e.target.value })}
                    style={{
                      width: '100%', padding: '0.625rem', borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  rows={2}
                  value={createRecForm.description || ''}
                  onChange={e => setCreateRecForm({ ...createRecForm, description: e.target.value })}
                  style={{
                    width: '100%', padding: '0.625rem', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateRecModal(false)}
                  className="glass-card"
                  style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary"
                  style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Mutabakatı Başlat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACCOUNT DETAIL & TRANSACTIONS */}
      {showAccountDetailModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Landmark size={20} color="var(--primary)" />
                  Hesap Detayı & Hareketleri
                </h2>
                {selectedAccountDetail && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedAccountDetail.finAccountName} ({selectedAccountDetail.finAccountId})
                  </div>
                )}
              </div>
              <button onClick={() => setShowAccountDetailModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {accountDetailLoading ? (
              <div style={{ padding: '4rem', textAlign: 'center' }}>
                <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-muted)' }}>Hesap hareketleri getiriliyor...</p>
              </div>
            ) : selectedAccountDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Balance Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="glass-card" style={{ padding: '1rem', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Fiili Bakiye (Actual Balance)</div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#4ade80' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedAccountDetail.currencyUomId || 'USD' }).format(selectedAccountDetail.actualBalance)}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Kullanılabilir Bakiye</div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#60a5fa' }}>
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedAccountDetail.currencyUomId || 'USD' }).format(selectedAccountDetail.availableBalance)}
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: '1rem' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Hesap Türü</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                      {selectedAccountDetail.finAccountTypeDesc || selectedAccountDetail.finAccountTypeId}
                    </div>
                  </div>
                </div>

                {/* Account Properties */}
                <div className="glass-card" style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8125rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Hesap Kodu / IBAN: </span>
                    <strong>{selectedAccountDetail.finAccountCode || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>GL Eşlemesi: </span>
                    <strong>{selectedAccountDetail.postToGlAccountName || selectedAccountDetail.postToGlAccountId || 'Yok'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Hesap Sahibi: </span>
                    <strong>{selectedAccountDetail.ownerPartyName || selectedAccountDetail.ownerPartyId}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Durum: </span>
                    <strong style={{ color: selectedAccountDetail.statusId === 'FNACT_ACTIVE' ? '#4ade80' : '#f87171' }}>
                      {selectedAccountDetail.statusDesc}
                    </strong>
                  </div>
                </div>

                {/* Account Transactions List */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      Son Hesap Hareketleri ({accountTransList.length})
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => { setShowAccountDetailModal(false); handleOpenTransModal(selectedAccountDetail.finAccountId, 'DEPOSIT'); }}
                        className="glass-card"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#4ade80', cursor: 'pointer' }}
                      >
                        + Para Girişi
                      </button>
                      <button
                        onClick={() => { setShowAccountDetailModal(false); handleOpenTransModal(selectedAccountDetail.finAccountId, 'WITHDRAWAL'); }}
                        className="glass-card"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', color: '#f87171', cursor: 'pointer' }}
                      >
                        - Para Çıkışı
                      </button>
                    </div>
                  </div>

                  {accountTransList.length === 0 ? (
                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      Bu hesaba ait henüz bir işlem hareketi kaydedilmemiş.
                    </div>
                  ) : (
                    <div className="glass-card" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Tarih</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>İşlem No</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Tür</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Tutar</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Açıklama</th>
                            <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Durum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountTransList.map(tr => {
                            const isDep = tr.finAccountTransTypeId === 'DEPOSIT';
                            return (
                              <tr key={tr.finAccountTransId} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{tr.transactionDate?.substring(0, 10)}</td>
                                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>#{tr.finAccountTransId}</td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>{tr.finAccountTransTypeDesc || tr.finAccountTransTypeId}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 700, color: isDep ? '#4ade80' : '#f87171' }}>
                                  {isDep ? '+' : '-'}
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedAccountDetail.currencyUomId || 'USD' }).format(tr.amount)}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>{tr.comments || '-'}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                  <span style={{ fontSize: '0.75rem', color: tr.statusId === 'FINACT_TRNS_APPROVED' ? '#4ade80' : '#facc15' }}>
                                    {tr.statusDesc}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowAccountDetailModal(false)}
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
export default FinancialAccounts;
