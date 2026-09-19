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
import { useTranslation } from '../i18n';

type FinAccountTab = 'accounts' | 'transactions' | 'reconciliation';

export const FinancialAccounts: React.FC = () => {
  const { translations, locale } = useTranslation();

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

  // Currency & Number Formatters
  const formatCurrency = useCallback((val: number | undefined | null, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(val || 0);
  }, [locale]);

  const formatNumber = useCallback((val: number | undefined | null) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(val || 0);
  }, [locale]);

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
      .catch(err => setError(err.message || translations.financialAccounts.messages.loadAccountsError))
      .finally(() => setLoading(false));
  }, [accSearch, accTypeFilter, accStatusFilter, translations.financialAccounts.messages.loadAccountsError]);

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
      .catch(err => setError(err.message || translations.financialAccounts.messages.loadTransError))
      .finally(() => setLoading(false));
  }, [transViewIndex, transSearch, transAccountFilter, transTypeFilter, transStatusFilter, translations.financialAccounts.messages.loadTransError]);

  // Fetch Reconciliations
  const loadReconciliations = useCallback(() => {
    setLoading(true);
    setError(null);

    api.getGlReconciliations({ organizationPartyId: 'Company' })
      .then(res => {
        setReconciliations(res.reconciliations || []);
      })
      .catch(err => setError(err.message || translations.financialAccounts.messages.loadRecError))
      .finally(() => setLoading(false));
  }, [translations.financialAccounts.messages.loadRecError]);

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
      alert((locale === 'tr' ? 'Mutabakat detayı yüklenemedi: ' : 'Could not load reconciliation detail: ') + err.message);
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
      setError(err.message || (locale === 'tr' ? 'Hesap detayları yüklenemedi.' : 'Could not load account details.'));
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
      setSuccessMsg(res._EVENT_MESSAGE_ || translations.financialAccounts.messages.accountSaved);
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
      alert((locale === 'tr' ? 'Hesap oluşturulurken hata: ' : 'Error creating account: ') + err.message);
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
      setSuccessMsg(res._EVENT_MESSAGE_ || translations.financialAccounts.messages.accountUpdated);
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowEditAccountModal(false);
      loadAccounts();
    } catch (err: any) {
      alert((locale === 'tr' ? 'Hesap güncellenirken hata: ' : 'Error updating account: ') + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SUBMIT: Create Transaction
  const handleCreateTransSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transForm.amount <= 0 && transForm.finAccountTransTypeId !== 'ADJUSTMENT') {
      alert(locale === 'tr' ? 'Tutar sıfırdan büyük olmalıdır.' : 'Amount must be greater than zero.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.createFinAccountTrans(transForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || translations.financialAccounts.messages.transSaved);
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowTransModal(false);
      if (activeTab === 'accounts') loadAccounts();
      else loadTransactions();
      if (showAccountDetailModal && selectedAccountDetail) {
        handleOpenAccountDetail(selectedAccountDetail.finAccountId);
      }
    } catch (err: any) {
      alert((locale === 'tr' ? 'İşlem kaydedilirken hata: ' : 'Error recording transaction: ') + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SUBMIT: Transfer (Virman)
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.fromFinAccountId === transferForm.toFinAccountId) {
      alert(locale === 'tr' ? 'Kaynak ve hedef hesap aynı olamaz.' : 'Source and destination accounts cannot be the same.');
      return;
    }
    if (transferForm.amount <= 0) {
      alert(locale === 'tr' ? 'Transfer tutarı sıfırdan büyük olmalıdır.' : 'Transfer amount must be greater than zero.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.transferBetweenFinAccounts(transferForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || translations.financialAccounts.messages.transferSuccess);
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowTransferModal(false);
      if (activeTab === 'accounts') loadAccounts();
      else loadTransactions();
    } catch (err: any) {
      alert((locale === 'tr' ? 'Virman işleminde hata: ' : 'Error during transfer: ') + err.message);
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
      setSuccessMsg(res._EVENT_MESSAGE_ || translations.financialAccounts.messages.recSaved);
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowCreateRecModal(false);
      loadReconciliations();
      handleOpenReconciliationDetail(res.glReconciliationId);
    } catch (err: any) {
      alert((locale === 'tr' ? 'Mutabakat oluşturulurken hata: ' : 'Error creating reconciliation: ') + err.message);
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
      alert((locale === 'tr' ? 'İşlem mutabakata bağlanırken hata: ' : 'Error linking transaction to reconciliation: ') + err.message);
    }
  };

  // ACTION: Complete Reconciliation
  const handleCompleteReconciliation = async () => {
    if (!selectedReconciliationId) return;
    if (!window.confirm(locale === 'tr' ? 'Bu mutabakatı onaylayıp kapatmak istediğinize emin misiniz?' : 'Are you sure you want to approve and close this reconciliation?')) return;

    try {
      await api.reconcileTransactions({
        glReconciliationId: selectedReconciliationId,
        finAccountTransIds: [],
        markReconciled: 'Y'
      });
      setSuccessMsg(translations.financialAccounts.reconciliation.reconciledSuccess);
      setTimeout(() => setSuccessMsg(null), 3500);
      handleOpenReconciliationDetail(selectedReconciliationId);
      loadReconciliations();
    } catch (err: any) {
      alert((locale === 'tr' ? 'Mutabakat kapatılırken hata: ' : 'Error closing reconciliation: ') + err.message);
    }
  };

  // Stats calculation
  const bankAccountsCount = accounts.filter(a => a.finAccountTypeId === 'BANK_ACCOUNT').length;
  const cashAccountsCount = accounts.filter(a => a.finAccountTypeId === 'DEPOSIT_ACCOUNT' || a.finAccountName.toLowerCase().includes('kasa') || a.finAccountName.toLowerCase().includes('cash')).length;

  const transInflow = transactions
    .filter(t => t.finAccountTransTypeId === 'DEPOSIT')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const transOutflow = transactions
    .filter(t => t.finAccountTransTypeId === 'WITHDRAWAL')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
  const transNet = transInflow - transOutflow;

  const totalRecsCount = reconciliations.length;
  const openRecsCount = reconciliations.filter(r => r.statusId !== 'GLREC_RECONCILED').length;
  const totalMatchedTransCount = reconciliations.reduce((acc, r) => acc + (Number(r.transactionCount) || 0), 0);

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      
      {/* Top Header */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">
            <Landmark size={26} className="text-indigo-400" />
            {translations.financialAccounts.title}
          </h1>
          <p className="ds-page-subtitle">
            {translations.financialAccounts.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => {
              if (activeTab === 'accounts') loadAccounts();
              else if (activeTab === 'transactions') loadTransactions();
              else loadReconciliations();
            }} 
            className="ds-btn-secondary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {translations.common.refresh}
          </button>
          
          <button 
            onClick={() => handleOpenTransferModal()} 
            className="ds-btn-secondary text-blue-400 hover:text-blue-300"
          >
            <ArrowRightLeft size={16} />
            {translations.financialAccounts.transactions.transfer}
          </button>

          {activeTab === 'transactions' && (
            <button 
              onClick={() => handleOpenTransModal(accounts[0]?.finAccountId || '', 'DEPOSIT')} 
              className="ds-btn-secondary text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
            >
              <Plus size={16} />
              {translations.financialAccounts.transactions.newTrans}
            </button>
          )}

          {activeTab === 'reconciliation' && (
            <button 
              onClick={() => setShowCreateRecModal(true)} 
              className="ds-btn-primary"
            >
              <Plus size={16} />
              {translations.financialAccounts.reconciliation.newRec}
            </button>
          )}

          {activeTab === 'accounts' && (
            <button 
              onClick={() => setShowCreateAccountModal(true)} 
              className="ds-btn-primary"
            >
              <Plus size={18} />
              {translations.financialAccounts.accounts.newAccount}
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

      {/* Top Metric KPI Cards across tabs */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ds-stat-card border-l-4 border-l-emerald-500">
            <div className="ds-stat-label flex items-center gap-2 text-emerald-400">
              <DollarSign size={16} /> {translations.financialAccounts.stats.activeBalance}
            </div>
            <div className="ds-stat-value text-emerald-400">
              {formatCurrency(totalActiveBalance, 'USD')}
            </div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.activeBalanceSub}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-blue-500">
            <div className="ds-stat-label flex items-center gap-2 text-blue-400">
              <Landmark size={16} /> {locale === 'tr' ? 'Banka Hesapları' : 'Bank Accounts'}
            </div>
            <div className="ds-stat-value text-blue-400">{formatNumber(bankAccountsCount)}</div>
            <div className="ds-stat-sub">{locale === 'tr' ? 'Vadesiz mevduat & ticari hesaplar' : 'Checking & commercial accounts'}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-amber-500">
            <div className="ds-stat-label flex items-center gap-2 text-amber-400">
              <Wallet size={16} /> {locale === 'tr' ? 'Kasa Hesapları' : 'Cash Accounts'}
            </div>
            <div className="ds-stat-value text-amber-400">{formatNumber(cashAccountsCount)}</div>
            <div className="ds-stat-sub">{locale === 'tr' ? 'Nakit & depozito kasaları' : 'Cash & deposit registers'}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-purple-500">
            <div className="ds-stat-label flex items-center gap-2 text-purple-400">
              <FileSpreadsheet size={16} /> {translations.financialAccounts.stats.totalAccounts}
            </div>
            <div className="ds-stat-value">{formatNumber(totalAccountsCount)}</div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.totalAccountsSub}</div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ds-stat-card border-l-4 border-l-blue-500">
            <div className="ds-stat-label flex items-center gap-2 text-blue-400">
              <ArrowRightLeft size={16} /> {translations.financialAccounts.stats.totalTrans}
            </div>
            <div className="ds-stat-value text-blue-400">{formatNumber(totalTransCount)}</div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.totalTransSub}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-emerald-500">
            <div className="ds-stat-label flex items-center gap-2 text-emerald-400">
              <ArrowDownLeft size={16} /> {translations.financialAccounts.stats.totalInflow}
            </div>
            <div className="ds-stat-value text-emerald-400">
              {formatCurrency(transInflow, 'USD')}
            </div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.totalInflowSub}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-red-500">
            <div className="ds-stat-label flex items-center gap-2 text-red-400">
              <ArrowUpRight size={16} /> {translations.financialAccounts.stats.totalOutflow}
            </div>
            <div className="ds-stat-value text-red-400">
              {formatCurrency(transOutflow, 'USD')}
            </div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.totalOutflowSub}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-purple-500">
            <div className="ds-stat-label flex items-center gap-2 text-purple-400">
              <DollarSign size={16} /> {translations.financialAccounts.stats.netChange}
            </div>
            <div className={`ds-stat-value ${transNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(transNet, 'USD')}
            </div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.netChangeSub}</div>
          </div>
        </div>
      )}

      {activeTab === 'reconciliation' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="ds-stat-card border-l-4 border-l-purple-500">
            <div className="ds-stat-label flex items-center gap-2 text-purple-400">
              <FileSpreadsheet size={16} /> {translations.financialAccounts.stats.totalRecs}
            </div>
            <div className="ds-stat-value text-purple-400">{formatNumber(totalRecsCount)}</div>
            <div className="ds-stat-sub">{locale === 'tr' ? 'Kayıtlı banka mutabakatları' : 'All recorded reconciliations'}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-amber-500">
            <div className="ds-stat-label flex items-center gap-2 text-amber-400">
              <Clock size={16} /> {translations.financialAccounts.stats.openRecs}
            </div>
            <div className="ds-stat-value text-amber-400">{formatNumber(openRecsCount)}</div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.pendingRecSub}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-emerald-500">
            <div className="ds-stat-label flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={16} /> {translations.financialAccounts.stats.matchedTrans}
            </div>
            <div className="ds-stat-value text-emerald-400">{formatNumber(totalMatchedTransCount)}</div>
            <div className="ds-stat-sub">{locale === 'tr' ? 'Eşleştirilen toplam hareket' : 'Total reconciled transactions'}</div>
          </div>

          <div className="ds-stat-card border-l-4 border-l-blue-500">
            <div className="ds-stat-label flex items-center gap-2 text-blue-400">
              <Landmark size={16} /> {translations.financialAccounts.stats.activeBalance}
            </div>
            <div className="ds-stat-value text-blue-400">{formatCurrency(totalActiveBalance, 'USD')}</div>
            <div className="ds-stat-sub">{translations.financialAccounts.stats.activeBalanceSub}</div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="ds-tab-bar">
        {[
          { id: 'accounts', label: translations.financialAccounts.tabs.accounts, icon: <Landmark size={18} /> },
          { id: 'transactions', label: translations.financialAccounts.tabs.transactions, icon: <ArrowRightLeft size={18} /> },
          { id: 'reconciliation', label: translations.financialAccounts.tabs.reconciliation, icon: <FileSpreadsheet size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as FinAccountTab)}
            className={`ds-tab flex items-center gap-2 ${
              activeTab === tab.id ? 'ds-tab-active' : ''
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>


      {/* TAB 1: ACCOUNTS LIST */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="ds-card p-4 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder={translations.financialAccounts.accounts.searchPlaceholder}
                value={accSearch}
                onChange={e => setAccSearch(e.target.value)}
                className="ds-input pl-10"
              />
            </div>

            <select
              value={accTypeFilter}
              onChange={e => setAccTypeFilter(e.target.value)}
              className="ds-select w-auto min-w-[180px]"
            >
              <option value="">{translations.financialAccounts.accounts.allTypes}</option>
              {metadata?.finAccountTypes?.map(t => (
                <option key={t.finAccountTypeId} value={t.finAccountTypeId}>
                  {t.description || t.finAccountTypeId}
                </option>
              ))}
            </select>

            <select
              value={accStatusFilter}
              onChange={e => setAccStatusFilter(e.target.value)}
              className="ds-select w-auto min-w-[160px]"
            >
              <option value="">{translations.financialAccounts.accounts.allStatuses}</option>
              {metadata?.finAccountStatuses?.map(s => (
                <option key={s.statusId} value={s.statusId}>
                  {s.description || s.statusId}
                </option>
              ))}
            </select>
          </div>

          {/* Accounts Grid / Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{translations.financialAccounts.accounts.accountId}</th>
                    <th className="ds-th">{translations.financialAccounts.accounts.accountName}</th>
                    <th className="ds-th">{translations.financialAccounts.accounts.accountType}</th>
                    <th className="ds-th">{translations.financialAccounts.accounts.glAccount}</th>
                    <th className="ds-th-right">{translations.financialAccounts.accounts.actualBalance}</th>
                    <th className="ds-th-right">{translations.financialAccounts.accounts.availableBalance}</th>
                    <th className="ds-th text-center">{translations.common.status}</th>
                    <th className="ds-th-right">{translations.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-3">
                          <div className="ds-spinner-sm" />
                          <span>{translations.common.loading}</span>
                        </div>
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <Filter size={32} className="mx-auto mb-3 opacity-50" />
                        <p>{translations.financialAccounts.accounts.noAccounts}</p>
                      </td>
                    </tr>
                  ) : (
                    accounts.map(acc => {
                      const isActive = acc.statusId === 'FNACT_ACTIVE';
                      return (
                        <tr key={acc.finAccountId} className="ds-tbody-row">
                          <td className="ds-td font-mono font-bold text-slate-200">
                            {acc.finAccountId}
                            {acc.finAccountCode && (
                              <div className="text-xs text-slate-400 font-mono mt-0.5">
                                {acc.finAccountCode}
                              </div>
                            )}
                          </td>
                          <td className="ds-td font-semibold text-white">
                            {acc.finAccountName}
                          </td>
                          <td className="ds-td">
                            <span className={`ds-badge ${acc.finAccountTypeId === 'BANK_ACCOUNT' ? 'ds-badge-blue' : 'ds-badge-yellow'}`}>
                              {acc.finAccountTypeDesc || acc.finAccountTypeId}
                            </span>
                          </td>
                          <td className="ds-td text-slate-400 text-xs">
                            {acc.postToGlAccountName || acc.postToGlAccountId || '-'}
                          </td>
                          <td className="ds-td-right font-extrabold text-emerald-400">
                            {formatCurrency(acc.actualBalance, acc.currencyUomId || 'USD')}
                          </td>
                          <td className="ds-td-right font-semibold text-slate-300">
                            {formatCurrency(acc.availableBalance, acc.currencyUomId || 'USD')}
                          </td>
                          <td className="ds-td text-center">
                            <span className={`ds-badge ${isActive ? 'ds-badge-green' : 'ds-badge-red'}`}>
                              {isActive ? <CheckCircle2 size={12} className="mr-1" /> : <Ban size={12} className="mr-1" />}
                              {acc.statusDesc || (isActive ? translations.financialAccounts.accounts.active : translations.financialAccounts.accounts.inactive)}
                            </span>
                          </td>
                          <td className="ds-td-right">
                            <div className="inline-flex gap-1.5 items-center justify-end">
                              <button
                                onClick={() => handleOpenAccountDetail(acc.finAccountId)}
                                className="ds-btn-secondary !px-2.5 !py-1 text-xs"
                                title={translations.financialAccounts.accounts.accountDetail}
                              >
                                <Eye size={14} />
                                {translations.common.details}
                              </button>
                              <button
                                onClick={() => handleOpenTransModal(acc.finAccountId, 'DEPOSIT')}
                                className="ds-btn-secondary !px-2.5 !py-1 text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
                                title={translations.financialAccounts.transactions.deposit}
                              >
                                + {locale === 'tr' ? 'Giriş' : 'Deposit'}
                              </button>
                              <button
                                onClick={() => handleOpenTransModal(acc.finAccountId, 'WITHDRAWAL')}
                                className="ds-btn-secondary !px-2.5 !py-1 text-xs text-red-400 hover:text-red-300 border-red-500/30"
                                title={translations.financialAccounts.transactions.withdrawal}
                              >
                                - {locale === 'tr' ? 'Çıkış' : 'Withdraw'}
                              </button>
                              <button
                                onClick={() => handleOpenEditAccount(acc)}
                                className="ds-btn-secondary !px-2 !py-1 text-xs"
                                title={translations.financialAccounts.accounts.editAccount}
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
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="ds-card p-4 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder={translations.financialAccounts.transactions.searchPlaceholder}
                value={transSearch}
                onChange={e => setTransSearch(e.target.value)}
                className="ds-input pl-10"
              />
            </div>

            <select
              value={transAccountFilter}
              onChange={e => setTransAccountFilter(e.target.value)}
              className="ds-select w-auto min-w-[180px]"
            >
              <option value="">{translations.financialAccounts.transactions.allAccounts}</option>
              {accounts.map(a => (
                <option key={a.finAccountId} value={a.finAccountId}>
                  {a.finAccountName} ({a.finAccountId})
                </option>
              ))}
            </select>

            <select
              value={transTypeFilter}
              onChange={e => setTransTypeFilter(e.target.value)}
              className="ds-select w-auto min-w-[170px]"
            >
              <option value="">{translations.financialAccounts.transactions.allTypes}</option>
              <option value="DEPOSIT">{translations.financialAccounts.transactions.deposit}</option>
              <option value="WITHDRAWAL">{translations.financialAccounts.transactions.withdrawal}</option>
              <option value="ADJUSTMENT">{translations.financialAccounts.transactions.adjustment}</option>
            </select>

            <select
              value={transStatusFilter}
              onChange={e => setTransStatusFilter(e.target.value)}
              className="ds-select w-auto min-w-[160px]"
            >
              <option value="">{translations.financialAccounts.transactions.allStatuses}</option>
              <option value="FINACT_TRNS_CREATED">{locale === 'tr' ? 'Oluşturuldu (Created)' : 'Created'}</option>
              <option value="FINACT_TRNS_APPROVED">{locale === 'tr' ? 'Onaylandı (Approved)' : 'Approved'}</option>
              <option value="FINACT_TRNS_CANCELED">{locale === 'tr' ? 'İptal Edildi (Canceled)' : 'Canceled'}</option>
            </select>
          </div>

          {/* Transactions Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{translations.financialAccounts.transactions.transId}</th>
                    <th className="ds-th">{translations.financialAccounts.transactions.transDate}</th>
                    <th className="ds-th">{translations.financialAccounts.tabs.accounts}</th>
                    <th className="ds-th">{translations.financialAccounts.transactions.transType}</th>
                    <th className="ds-th-right">{translations.financialAccounts.transactions.amount}</th>
                    <th className="ds-th">{translations.financialAccounts.transactions.reason}</th>
                    <th className="ds-th">{translations.financialAccounts.transactions.party}</th>
                    <th className="ds-th text-center">{translations.common.status}</th>
                    <th className="ds-th text-center">{translations.financialAccounts.reconciliation.recId}</th>
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
                        <Filter size={32} className="mx-auto mb-3 opacity-50" />
                        <p>{translations.financialAccounts.transactions.noTrans}</p>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(tr => {
                      const isDeposit = tr.finAccountTransTypeId === 'DEPOSIT';
                      const isWithdrawal = tr.finAccountTransTypeId === 'WITHDRAWAL';
                      return (
                        <tr key={tr.finAccountTransId} className="ds-tbody-row">
                          <td className="ds-td-mono font-bold">
                            #{tr.finAccountTransId}
                          </td>
                          <td className="ds-td-muted whitespace-nowrap">
                            {tr.transactionDate ? tr.transactionDate.substring(0, 10) : '-'}
                          </td>
                          <td className="ds-td font-semibold text-white">
                            {tr.finAccountName || tr.finAccountId}
                          </td>
                          <td className="ds-td">
                            <span className={`ds-badge ${isDeposit ? 'ds-badge-green' : isWithdrawal ? 'ds-badge-red' : 'ds-badge-blue'}`}>
                              {isDeposit ? <ArrowDownLeft size={12} className="mr-1" /> : isWithdrawal ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowRightLeft size={12} className="mr-1" />}
                              {tr.finAccountTransTypeDesc || tr.finAccountTransTypeId}
                            </span>
                          </td>
                          <td className={`ds-td-right font-extrabold ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isDeposit ? '+' : isWithdrawal ? '-' : ''}
                            {formatCurrency(tr.amount, 'USD')}
                          </td>
                          <td className="ds-td-muted">
                            {tr.comments || '-'}
                          </td>
                          <td className="ds-td-muted">
                            {tr.partyName || tr.partyId || '-'}
                          </td>
                          <td className="ds-td text-center">
                            <span className={`ds-badge ${tr.statusId === 'FINACT_TRNS_APPROVED' ? 'ds-badge-green' : 'ds-badge-yellow'}`}>
                              {tr.statusDesc || tr.statusId}
                            </span>
                          </td>
                          <td className="ds-td text-center">
                            {tr.glReconciliationId ? (
                              <span className="ds-badge ds-badge-indigo">
                                <Check size={12} className="mr-1" /> #{tr.glReconciliationId}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">{locale === 'tr' ? 'Açıkta' : 'Unmatched'}</span>
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
            <div className="flex justify-between items-center px-4 py-3 border-t border-slate-700/50 text-xs text-slate-400">
              <span>
                {locale === 'tr' ? 'Toplam' : 'Total'} <strong className="text-white mx-1">{formatNumber(totalTransCount)}</strong> {locale === 'tr' ? 'hareket kaydı' : 'transactions'}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={transViewIndex === 0}
                  onClick={() => setTransViewIndex(prev => Math.max(0, prev - 1))}
                  className="ds-btn-secondary !py-1 !px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {translations.common.previous}
                </button>
                <button
                  disabled={(transViewIndex + 1) * 50 >= totalTransCount}
                  onClick={() => setTransViewIndex(prev => prev + 1)}
                  className="ds-btn-secondary !py-1 !px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {translations.common.next}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BANK RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {locale === 'tr' ? 'Banka Mutabakat Listesi' : 'Bank Reconciliation List'}
              </h2>
              <p className="text-sm text-slate-400">
                {locale === 'tr' ? 'Banka hesap ekstreleri ile OFBiz defter kayıtlarını eşleştirerek mutabakat sağlayın.' : 'Reconcile bank statements against OFBiz general ledger records.'}
              </p>
            </div>
            <button
              onClick={() => setShowCreateRecModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              {translations.financialAccounts.reconciliation.newRec}
            </button>
          </div>

          {/* Reconciliations Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{translations.financialAccounts.reconciliation.recId}</th>
                    <th className="ds-th">{translations.financialAccounts.reconciliation.recName}</th>
                    <th className="ds-th">{translations.financialAccounts.reconciliation.glAccountId}</th>
                    <th className="ds-th-right">{translations.financialAccounts.reconciliation.closingBalance}</th>
                    <th className="ds-th text-center">{translations.financialAccounts.reconciliation.linkedTrans}</th>
                    <th className="ds-th text-center">{translations.common.status}</th>
                    <th className="ds-th-right">{translations.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-3">
                          <div className="ds-spinner-sm" />
                          <span>{translations.common.loading}</span>
                        </div>
                      </td>
                    </tr>
                  ) : reconciliations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        <FileSpreadsheet size={32} className="mx-auto mb-3 opacity-50" />
                        <p>{translations.financialAccounts.reconciliation.noRecs}</p>
                      </td>
                    </tr>
                  ) : (
                    reconciliations.map(r => {
                      const isReconciled = r.statusId === 'GLREC_RECONCILED';
                      return (
                        <tr key={r.glReconciliationId} className="ds-tbody-row">
                          <td className="ds-td-mono font-bold">
                            #{r.glReconciliationId}
                          </td>
                          <td className="ds-td font-semibold text-white">
                            {r.glReconciliationName}
                          </td>
                          <td className="ds-td text-slate-400 text-xs">
                            {r.glAccountName}
                          </td>
                          <td className="ds-td-right font-bold text-blue-400">
                            {formatCurrency(r.reconciledBalance, 'USD')}
                          </td>
                          <td className="ds-td text-center">
                            <span className="ds-badge ds-badge-slate">
                              {r.transactionCount} {locale === 'tr' ? 'adet' : 'items'}
                            </span>
                          </td>
                          <td className="ds-td text-center">
                            <span className={`ds-badge ${isReconciled ? 'ds-badge-green' : 'ds-badge-yellow'}`}>
                              {isReconciled ? <CheckCircle2 size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                              {r.statusDesc}
                            </span>
                          </td>
                          <td className="ds-td-right">
                            <button
                              onClick={() => handleOpenReconciliationDetail(r.glReconciliationId)}
                              className="ds-btn-primary !px-3 !py-1.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <FileSpreadsheet size={14} />
                              {locale === 'tr' ? 'Çalışma Ekranı' : 'Workspace'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Reconciliation Workspace (when selected) */}
          {selectedReconciliationId && reconciliationDetail && (
            <div className="ds-card-elevated p-6 space-y-6 border border-indigo-500/30">
              
              {/* Workspace Header */}
              <div className="flex justify-between items-center flex-wrap gap-4 pb-4 border-b border-slate-700/50">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-indigo-400" />
                    {locale === 'tr' ? 'Mutabakat Çalışma Ekranı' : 'Reconciliation Workspace'}: #{reconciliationDetail.reconciliation.glReconciliationId} - {reconciliationDetail.reconciliation.glReconciliationName}
                    {recDetailLoading && <Loader2 size={16} className="animate-spin text-indigo-400 ml-2" />}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1">
                    {translations.financialAccounts.reconciliation.glAccountId}: <strong className="text-slate-200">{reconciliationDetail.reconciliation.glAccountName}</strong> | {translations.common.status}: <strong className="text-slate-200">{reconciliationDetail.reconciliation.statusDesc}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {reconciliationDetail.reconciliation.statusId !== 'GLREC_RECONCILED' && (
                    <button
                      onClick={handleCompleteReconciliation}
                      className="ds-btn-primary"
                    >
                      <CheckCircle2 size={16} />
                      {translations.financialAccounts.reconciliation.reconcileNow}
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedReconciliationId(null); setReconciliationDetail(null); }}
                    className="ds-btn-secondary"
                  >
                    {translations.common.close}
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
                  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border ${
                    isMatched ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div>
                      <div className="text-xs text-slate-400">{translations.financialAccounts.reconciliation.closingBalance}</div>
                      <div className="text-xl font-bold text-blue-400">
                        {formatCurrency(targetBal, 'USD')}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">{locale === 'tr' ? 'Eşleştirilen Toplam Tutar' : 'Total Reconciled Amount'}</div>
                      <div className="text-xl font-bold text-amber-400">
                        {formatCurrency(totalLinked, 'USD')}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">{translations.financialAccounts.reconciliation.difference}</div>
                      <div className={`text-xl font-bold ${isMatched ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(diff, 'USD')}
                      </div>
                    </div>

                    <div className="flex items-center">
                      {isMatched ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                          <CheckCircle2 size={18} /> {locale === 'tr' ? 'Tam Uyuşma Sağlandı' : 'Fully Balanced'}
                        </span>
                      ) : (
                        <span className="text-red-400 font-semibold flex items-center gap-1.5 text-xs">
                          <AlertCircle size={16} /> {locale === 'tr' ? 'Fark var, eksik işlemleri eşleştirin' : 'Difference detected, match pending transactions'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Linked vs Unlinked Split Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Left: Linked Transactions */}
                <div className="ds-card p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <Link2 size={16} /> {translations.financialAccounts.reconciliation.linkedTrans} ({reconciliationDetail.linkedTransactions.length})
                    </h4>
                  </div>

                  <div className="max-h-[350px] overflow-y-auto">
                    {reconciliationDetail.linkedTransactions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        {locale === 'tr' ? 'Henüz eşleşen hareket bulunmuyor. Sağdaki listeden ekleyebilirsiniz.' : 'No matched transactions yet. Add from the unmatched list.'}
                      </div>
                    ) : (
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">{translations.common.date}</th>
                            <th className="ds-th">{translations.common.type}</th>
                            <th className="ds-th-right">{translations.common.amount}</th>
                            <th className="ds-th text-center">{translations.common.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconciliationDetail.linkedTransactions.map(tr => (
                            <tr key={tr.finAccountTransId} className="ds-tbody-row">
                              <td className="ds-td-muted">{tr.transactionDate?.substring(0, 10)}</td>
                              <td className="ds-td">{tr.finAccountTransTypeId}</td>
                              <td className="ds-td-right font-bold text-white">
                                {formatCurrency(Number(tr.amount), 'USD')}
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleToggleReconcileTrans(tr.finAccountTransId, true)}
                                  title={translations.financialAccounts.reconciliation.unlinkTrans}
                                  className="text-red-400 hover:text-red-300 p-1 transition-colors"
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
                <div className="ds-card p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <Unlink2 size={16} /> {translations.financialAccounts.reconciliation.unlinkedTrans} ({reconciliationDetail.unlinkedTransactions.length})
                    </h4>
                  </div>

                  <div className="max-h-[350px] overflow-y-auto">
                    {reconciliationDetail.unlinkedTransactions.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        {locale === 'tr' ? 'Bu hesaba ait açıkta kalan hareket bulunmuyor.' : 'No unmatched transactions found for this account.'}
                      </div>
                    ) : (
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">{translations.common.date}</th>
                            <th className="ds-th">{translations.common.type}</th>
                            <th className="ds-th-right">{translations.common.amount}</th>
                            <th className="ds-th text-center">{translations.common.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reconciliationDetail.unlinkedTransactions.map(tr => (
                            <tr key={tr.finAccountTransId} className="ds-tbody-row">
                              <td className="ds-td-muted">{tr.transactionDate?.substring(0, 10)}</td>
                              <td className="ds-td">{tr.finAccountTransTypeId}</td>
                              <td className="ds-td-right font-bold text-white">
                                {formatCurrency(Number(tr.amount), 'USD')}
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleToggleReconcileTrans(tr.finAccountTransId, false)}
                                  className="ds-btn-primary !px-2 !py-1 text-xs"
                                >
                                  {translations.financialAccounts.reconciliation.linkTrans}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-indigo-400" />
                {translations.financialAccounts.accounts.newAccount}
              </h2>
              <button onClick={() => setShowCreateAccountModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.accountId} ({locale === 'tr' ? 'Opsiyonel' : 'Optional'})
                  </label>
                  <input
                    type="text"
                    placeholder={locale === 'tr' ? 'Örn: BANKA_01' : 'e.g. BANK_01'}
                    value={createAccountForm.finAccountId || ''}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountId: e.target.value })}
                    className="ds-input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.accountName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={locale === 'tr' ? 'Örn: İş Bankası Ticari TL' : 'e.g. Chase Commercial Checking'}
                    value={createAccountForm.finAccountName}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountName: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.accountType} *
                  </label>
                  <select
                    value={createAccountForm.finAccountTypeId}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountTypeId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.finAccountTypes?.map(t => (
                      <option key={t.finAccountTypeId} value={t.finAccountTypeId}>
                        {t.description || t.finAccountTypeId}
                      </option>
                    )) || (
                      <>
                        <option value="BANK_ACCOUNT">{locale === 'tr' ? 'Banka Hesabı' : 'Bank Account'}</option>
                        <option value="DEPOSIT_ACCOUNT">{locale === 'tr' ? 'Nakit Kasa / Depozito' : 'Deposit / Cash Register'}</option>
                        <option value="CREDIT_CARD_ACCOUNT">{locale === 'tr' ? 'Kredi Kartı Hesabı' : 'Credit Card Account'}</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.currency}
                  </label>
                  <select
                    value={createAccountForm.currencyUomId}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, currencyUomId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="TRY">TRY (₺)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.accountId} / IBAN
                  </label>
                  <input
                    type="text"
                    placeholder="TR00 0000 0000..."
                    value={createAccountForm.finAccountCode || ''}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, finAccountCode: e.target.value })}
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.glAccount}
                  </label>
                  <select
                    value={createAccountForm.postToGlAccountId || ''}
                    onChange={e => setCreateAccountForm({ ...createAccountForm, postToGlAccountId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="">-- {translations.common.none} --</option>
                    {metadata?.glAccounts?.map(g => (
                      <option key={g.glAccountId} value={g.glAccountId}>
                        {g.accountCode} - {g.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {locale === 'tr' ? 'Açılış Bakiyesi ($)' : 'Opening Balance ($)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={createAccountForm.initialBalance || ''}
                  onChange={e => setCreateAccountForm({ ...createAccountForm, initialBalance: parseFloat(e.target.value) || 0 })}
                  className="ds-input font-bold"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  {locale === 'tr' ? 'Açılış bakiyesi girilirse otomatik onaylı para girişi (Deposit) hareketi oluşturulur.' : 'If specified, an initial approved deposit transaction will be created.'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowCreateAccountModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT ACCOUNT */}
      {showEditAccountModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-400" />
                {translations.financialAccounts.accounts.editAccount}: {editAccountForm.finAccountId}
              </h2>
              <button onClick={() => setShowEditAccountModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditAccountSubmit} className="space-y-4">
              <div>
                <label className="ds-label">
                  {translations.financialAccounts.accounts.accountName} *
                </label>
                <input
                  type="text"
                  required
                  value={editAccountForm.finAccountName}
                  onChange={e => setEditAccountForm({ ...editAccountForm, finAccountName: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.accountType}
                  </label>
                  <select
                    value={editAccountForm.finAccountTypeId}
                    onChange={e => setEditAccountForm({ ...editAccountForm, finAccountTypeId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.finAccountTypes?.map(t => (
                      <option key={t.finAccountTypeId} value={t.finAccountTypeId}>
                        {t.description || t.finAccountTypeId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.common.status}
                  </label>
                  <select
                    value={editAccountForm.statusId}
                    onChange={e => setEditAccountForm({ ...editAccountForm, statusId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="FNACT_ACTIVE">{translations.financialAccounts.accounts.active}</option>
                    <option value="FNACT_MANFROZEN">{locale === 'tr' ? 'Donduruldu (Frozen)' : 'Frozen'}</option>
                    <option value="FNACT_CANCELLED">{locale === 'tr' ? 'İptal Edildi (Cancelled)' : 'Cancelled'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.accountId} / IBAN
                  </label>
                  <input
                    type="text"
                    value={editAccountForm.finAccountCode || ''}
                    onChange={e => setEditAccountForm({ ...editAccountForm, finAccountCode: e.target.value })}
                    className="ds-input"
                  />
                </div>

                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.accounts.glAccount}
                  </label>
                  <select
                    value={editAccountForm.postToGlAccountId || ''}
                    onChange={e => setEditAccountForm({ ...editAccountForm, postToGlAccountId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="">-- {translations.common.none} --</option>
                    {metadata?.glAccounts?.map(g => (
                      <option key={g.glAccountId} value={g.glAccountId}>
                        {g.accountCode} - {g.accountName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowEditAccountModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK TRANSACTION (DEPOSIT / WITHDRAWAL) */}
      {showTransModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {transForm.finAccountTransTypeId === 'DEPOSIT' ? (
                  <ArrowDownLeft size={20} className="text-emerald-400" />
                ) : (
                  <ArrowUpRight size={20} className="text-red-400" />
                )}
                {transForm.finAccountTransTypeId === 'DEPOSIT' ? translations.financialAccounts.transactions.deposit : translations.financialAccounts.transactions.withdrawal}
              </h2>
              <button onClick={() => setShowTransModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTransSubmit} className="space-y-4">
              <div>
                <label className="ds-label">
                  {translations.financialAccounts.tabs.accounts} *
                </label>
                <select
                  value={transForm.finAccountId}
                  onChange={e => setTransForm({ ...transForm, finAccountId: e.target.value })}
                  className="ds-select"
                >
                  {accounts.map(a => (
                    <option key={a.finAccountId} value={a.finAccountId}>
                      {a.finAccountName} ({a.finAccountId}) - {translations.financialAccounts.accounts.balance}: {formatCurrency(a.actualBalance, a.currencyUomId || 'USD')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.transactions.transType} *
                  </label>
                  <select
                    value={transForm.finAccountTransTypeId}
                    onChange={e => setTransForm({ ...transForm, finAccountTransTypeId: e.target.value as any })}
                    className="ds-select"
                  >
                    <option value="DEPOSIT">{translations.financialAccounts.transactions.deposit}</option>
                    <option value="WITHDRAWAL">{translations.financialAccounts.transactions.withdrawal}</option>
                    <option value="ADJUSTMENT">{translations.financialAccounts.transactions.adjustment}</option>
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.transactions.amount} ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transForm.amount || ''}
                    onChange={e => setTransForm({ ...transForm, amount: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {translations.financialAccounts.transactions.transDate}
                </label>
                <input
                  type="date"
                  value={transForm.transactionDate}
                  onChange={e => setTransForm({ ...transForm, transactionDate: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div>
                <label className="ds-label">
                  {translations.financialAccounts.transactions.reason}
                </label>
                <input
                  type="text"
                  placeholder={locale === 'tr' ? 'İşlem açıklaması giriniz...' : 'Enter transaction notes...'}
                  value={transForm.comments || ''}
                  onChange={e => setTransForm({ ...transForm, comments: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowTransModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {locale === 'tr' ? 'İşlemi Onayla' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER (VIRMAN) */}
      {showTransferModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-indigo-400" />
                {translations.financialAccounts.transactions.transfer}
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.transactions.fromAccount} *
                  </label>
                  <select
                    value={transferForm.fromFinAccountId}
                    onChange={e => setTransferForm({ ...transferForm, fromFinAccountId: e.target.value })}
                    className="ds-select"
                  >
                    {accounts.map(a => (
                      <option key={a.finAccountId} value={a.finAccountId}>
                        {a.finAccountName} ({formatCurrency(a.actualBalance, a.currencyUomId || 'USD')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.transactions.toAccount} *
                  </label>
                  <select
                    value={transferForm.toFinAccountId}
                    onChange={e => setTransferForm({ ...transferForm, toFinAccountId: e.target.value })}
                    className="ds-select"
                  >
                    {accounts.map(a => (
                      <option key={a.finAccountId} value={a.finAccountId}>
                        {a.finAccountName} ({formatCurrency(a.actualBalance, a.currencyUomId || 'USD')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.transactions.transferAmount} ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={transferForm.amount || ''}
                    onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-bold"
                  />
                </div>

                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.transactions.transDate}
                  </label>
                  <input
                    type="date"
                    value={transferForm.transactionDate}
                    onChange={e => setTransferForm({ ...transferForm, transactionDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {translations.financialAccounts.transactions.reason} ({locale === 'tr' ? 'Opsiyonel' : 'Optional'})
                </label>
                <input
                  type="text"
                  placeholder={locale === 'tr' ? "Örn: Garanti'den Nakit Kasaya aktarım" : 'e.g. Transfer to petty cash'}
                  value={transferForm.comments || ''}
                  onChange={e => setTransferForm({ ...transferForm, comments: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {translations.financialAccounts.transactions.transfer}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE RECONCILIATION */}
      {showCreateRecModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet size={20} className="text-indigo-400" />
                {translations.financialAccounts.reconciliation.newRec}
              </h2>
              <button onClick={() => setShowCreateRecModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRecSubmit} className="space-y-4">
              <div>
                <label className="ds-label">
                  {translations.financialAccounts.reconciliation.recName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'tr' ? 'Örn: Garanti BBVA Eylül 2026 Ekstre Mutabakatı' : 'e.g. Chase September 2026 Reconciliation'}
                  value={createRecForm.glReconciliationName}
                  onChange={e => setCreateRecForm({ ...createRecForm, glReconciliationName: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div>
                <label className="ds-label">
                  {translations.financialAccounts.reconciliation.glAccountId} *
                </label>
                <select
                  value={createRecForm.glAccountId}
                  onChange={e => setCreateRecForm({ ...createRecForm, glAccountId: e.target.value })}
                  className="ds-select"
                >
                  {metadata?.glAccounts?.map(g => (
                    <option key={g.glAccountId} value={g.glAccountId}>
                      {g.accountCode} - {g.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.financialAccounts.reconciliation.closingBalance} ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={createRecForm.reconciledBalance || ''}
                    onChange={e => setCreateRecForm({ ...createRecForm, reconciledBalance: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-bold"
                  />
                </div>

                <div>
                  <label className="ds-label">
                    {translations.common.date}
                  </label>
                  <input
                    type="date"
                    value={createRecForm.reconciledDate}
                    onChange={e => setCreateRecForm({ ...createRecForm, reconciledDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {translations.common.description} ({locale === 'tr' ? 'Opsiyonel' : 'Optional'})
                </label>
                <textarea
                  rows={2}
                  value={createRecForm.description || ''}
                  onChange={e => setCreateRecForm({ ...createRecForm, description: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowCreateRecModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="ds-btn-primary"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  {translations.financialAccounts.reconciliation.newRec}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACCOUNT DETAIL & TRANSACTIONS */}
      {showAccountDetailModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-4xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Landmark size={20} className="text-indigo-400" />
                  {translations.financialAccounts.accounts.accountDetail}
                </h2>
                {selectedAccountDetail && (
                  <div className="text-xs text-slate-400 mt-1">
                    {selectedAccountDetail.finAccountName} ({selectedAccountDetail.finAccountId})
                  </div>
                )}
              </div>
              <button onClick={() => setShowAccountDetailModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            {accountDetailLoading ? (
              <div className="py-16 text-center">
                <div className="ds-spinner mx-auto mb-3" />
                <p className="text-slate-400 text-sm">{translations.common.loading}</p>
              </div>
            ) : selectedAccountDetail ? (
              <div className="space-y-5">
                
                {/* Balance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="ds-stat-card border border-indigo-500/30">
                    <div className="ds-stat-label text-emerald-400">{translations.financialAccounts.accounts.actualBalance}</div>
                    <div className="ds-stat-value text-emerald-400">
                      {formatCurrency(selectedAccountDetail.actualBalance, selectedAccountDetail.currencyUomId || 'USD')}
                    </div>
                  </div>

                  <div className="ds-stat-card">
                    <div className="ds-stat-label text-blue-400">{translations.financialAccounts.accounts.availableBalance}</div>
                    <div className="ds-stat-value text-blue-400">
                      {formatCurrency(selectedAccountDetail.availableBalance, selectedAccountDetail.currencyUomId || 'USD')}
                    </div>
                  </div>

                  <div className="ds-stat-card">
                    <div className="ds-stat-label text-slate-400">{translations.financialAccounts.accounts.accountType}</div>
                    <div className="text-base font-bold text-white mt-1">
                      {selectedAccountDetail.finAccountTypeDesc || selectedAccountDetail.finAccountTypeId}
                    </div>
                  </div>
                </div>

                {/* Account Properties */}
                <div className="ds-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.financialAccounts.accounts.accountId} / IBAN:</span>
                    <strong className="text-white font-mono">{selectedAccountDetail.finAccountCode || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.financialAccounts.accounts.glAccount}:</span>
                    <strong className="text-white">{selectedAccountDetail.postToGlAccountName || selectedAccountDetail.postToGlAccountId || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.financialAccounts.accounts.ownerParty}:</span>
                    <strong className="text-white">{selectedAccountDetail.ownerPartyName || selectedAccountDetail.ownerPartyId || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.common.status}:</span>
                    <span className={`ds-badge ${selectedAccountDetail.statusId === 'FNACT_ACTIVE' ? 'ds-badge-green' : 'ds-badge-red'}`}>
                      {selectedAccountDetail.statusDesc}
                    </span>
                  </div>
                </div>

                {/* Account Transactions List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white">
                      {locale === 'tr' ? 'Son Hesap Hareketleri' : 'Recent Account Transactions'} ({accountTransList.length})
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowAccountDetailModal(false); handleOpenTransModal(selectedAccountDetail.finAccountId, 'DEPOSIT'); }}
                        className="ds-btn-secondary !px-2.5 !py-1 text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
                      >
                        + {locale === 'tr' ? 'Para Girişi' : 'Deposit'}
                      </button>
                      <button
                        onClick={() => { setShowAccountDetailModal(false); handleOpenTransModal(selectedAccountDetail.finAccountId, 'WITHDRAWAL'); }}
                        className="ds-btn-secondary !px-2.5 !py-1 text-xs text-red-400 hover:text-red-300 border-red-500/30"
                      >
                        - {locale === 'tr' ? 'Para Çıkışı' : 'Withdrawal'}
                      </button>
                    </div>
                  </div>

                  {accountTransList.length === 0 ? (
                    <div className="ds-card p-8 text-center text-slate-500 text-xs">
                      {locale === 'tr' ? 'Bu hesaba ait henüz bir işlem hareketi kaydedilmemiş.' : 'No transactions recorded for this account yet.'}
                    </div>
                  ) : (
                    <div className="ds-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="ds-table text-xs">
                          <thead>
                            <tr className="ds-thead-row">
                              <th className="ds-th">{translations.financialAccounts.transactions.transDate}</th>
                              <th className="ds-th">{translations.financialAccounts.transactions.transId}</th>
                              <th className="ds-th">{translations.financialAccounts.transactions.transType}</th>
                              <th className="ds-th-right">{translations.financialAccounts.transactions.amount}</th>
                              <th className="ds-th">{translations.financialAccounts.transactions.reason}</th>
                              <th className="ds-th text-center">{translations.common.status}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountTransList.map(tr => {
                              const isDep = tr.finAccountTransTypeId === 'DEPOSIT';
                              return (
                                <tr key={tr.finAccountTransId} className="ds-tbody-row">
                                  <td className="ds-td-muted">{tr.transactionDate?.substring(0, 10)}</td>
                                  <td className="ds-td-mono font-bold">#{tr.finAccountTransId}</td>
                                  <td className="ds-td">{tr.finAccountTransTypeDesc || tr.finAccountTransTypeId}</td>
                                  <td className={`ds-td-right font-bold ${isDep ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {isDep ? '+' : '-'}
                                    {formatCurrency(tr.amount, selectedAccountDetail.currencyUomId || 'USD')}
                                  </td>
                                  <td className="ds-td-muted">{tr.comments || '-'}</td>
                                  <td className="ds-td text-center">
                                    <span className={`ds-badge ${tr.statusId === 'FINACT_TRNS_APPROVED' ? 'ds-badge-green' : 'ds-badge-yellow'}`}>
                                      {tr.statusDesc || tr.statusId}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : null}

            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/50">
              <button
                onClick={() => setShowAccountDetailModal(false)}
                className="ds-btn-secondary"
              >
                {translations.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinancialAccounts;
