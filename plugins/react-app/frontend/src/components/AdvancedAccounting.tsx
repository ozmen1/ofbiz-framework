import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Search, RefreshCw, Plus, Eye, Edit3,
  CheckCircle2, Clock, X, AlertCircle, Loader2,
  Briefcase, Landmark, Building2, FileText, Check,
  BarChart3, TrendingUp
} from 'lucide-react';
import {
  api,
  AdvancedAccountingMetadata,
  BillingAccountItem,
  BillingAccountDetailResponse,
  CreateBillingAccountPayload,
  UpdateBillingAccountPayload,
  FixedAssetItem,
  FixedAssetDetailResponse,
  CreateFixedAssetPayload,
  UpdateFixedAssetPayload,
  BudgetItemSummary,
  BudgetDetailResponse,
  CreateBudgetPayload,
  CreateBudgetItemPayload,
  AgreementSummary,
  AgreementDetailResponse,
  CreateAgreementPayload
} from '../services/api';

type AdvancedTab = 'billing-accounts' | 'fixed-assets' | 'budgets' | 'agreements';

export const AdvancedAccounting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdvancedTab>('billing-accounts');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<AdvancedAccountingMetadata | null>(null);

  // ==========================================
  // TAB 1: BILLING ACCOUNTS STATE
  // ==========================================
  const [billingAccounts, setBillingAccounts] = useState<BillingAccountItem[]>([]);
  const [totalBaCount, setTotalBaCount] = useState<number>(0);
  const [totalBaLimit, setTotalBaLimit] = useState<number>(0);
  const [totalBaAvailable, setTotalBaAvailable] = useState<number>(0);
  const [totalBaBilled, setTotalBaBilled] = useState<number>(0);
  const [baSearch, setBaSearch] = useState<string>('');
  const [baPartyFilter, setBaPartyFilter] = useState<string>('');

  // Modals for Billing Accounts
  const [showCreateBaModal, setShowCreateBaModal] = useState<boolean>(false);
  const [showEditBaModal, setShowEditBaModal] = useState<boolean>(false);
  const [showBaDetailModal, setShowBaDetailModal] = useState<boolean>(false);
  const [selectedBaDetail, setSelectedBaDetail] = useState<BillingAccountDetailResponse | null>(null);
  const [editingBa, setEditingBa] = useState<BillingAccountItem | null>(null);
  const [createBaForm, setCreateBaForm] = useState<CreateBillingAccountPayload>({
    accountLimit: 10000,
    accountCurrencyUomId: 'USD',
    description: '',
    partyId: '',
    roleTypeId: 'BILL_TO_CUSTOMER'
  });

  // ==========================================
  // TAB 2: FIXED ASSETS STATE
  // ==========================================
  const [fixedAssets, setFixedAssets] = useState<FixedAssetItem[]>([]);
  const [totalFaCount, setTotalFaCount] = useState<number>(0);
  const [totalFaCost, setTotalFaCost] = useState<number>(0);
  const [totalFaDep, setTotalFaDep] = useState<number>(0);
  const [totalFaNbv, setTotalFaNbv] = useState<number>(0);
  const [faSearch, setFaSearch] = useState<string>('');
  const [faTypeFilter, setFaTypeFilter] = useState<string>('');

  // Modals for Fixed Assets
  const [showCreateFaModal, setShowCreateFaModal] = useState<boolean>(false);
  const [showEditFaModal, setShowEditFaModal] = useState<boolean>(false);
  const [showFaDetailModal, setShowFaDetailModal] = useState<boolean>(false);
  const [showDepModal, setShowDepModal] = useState<boolean>(false);
  const [selectedFaDetail, setSelectedFaDetail] = useState<FixedAssetDetailResponse | null>(null);
  const [editingFa, setEditingFa] = useState<FixedAssetItem | null>(null);
  const [depAssetId, setDepAssetId] = useState<string>('');
  const [depAmountInput, setDepAmountInput] = useState<string>('');
  const [createFaForm, setCreateFaForm] = useState<CreateFixedAssetPayload>({
    fixedAssetName: '',
    fixedAssetTypeId: 'EQUIPMENT',
    purchaseCost: 0,
    purchaseCostUomId: 'USD',
    salvageValue: 0,
    serialNumber: ''
  });

  // ==========================================
  // TAB 3: BUDGETS STATE
  // ==========================================
  const [budgets, setBudgets] = useState<BudgetItemSummary[]>([]);
  const [totalBgtCount, setTotalBgtCount] = useState<number>(0);
  const [totalBgtAmount, setTotalBgtAmount] = useState<number>(0);
  const [bgtSearch, setBgtSearch] = useState<string>('');
  const [bgtTypeFilter, setBgtTypeFilter] = useState<string>('');
  const [bgtStatusFilter, setBgtStatusFilter] = useState<string>('');

  // Modals for Budgets
  const [showCreateBgtModal, setShowCreateBgtModal] = useState<boolean>(false);
  const [showBgtDetailModal, setShowBgtDetailModal] = useState<boolean>(false);
  const [showAddBgtItemModal, setShowAddBgtItemModal] = useState<boolean>(false);
  const [selectedBgtDetail, setSelectedBgtDetail] = useState<BudgetDetailResponse | null>(null);
  const [createBgtForm, setCreateBgtForm] = useState<CreateBudgetPayload>({
    budgetTypeId: 'OPERATING_BUDGET',
    comments: ''
  });
  const [createBgtItemForm, setCreateBgtItemForm] = useState<CreateBudgetItemPayload>({
    budgetId: '',
    budgetItemTypeId: 'REQUIREMENT_BUDGET_A',
    amount: 1000,
    purpose: '',
    justification: ''
  });

  // ==========================================
  // TAB 4: AGREEMENTS STATE
  // ==========================================
  const [agreements, setAgreements] = useState<AgreementSummary[]>([]);
  const [totalAgrCount, setTotalAgrCount] = useState<number>(0);
  const [agrSearch, setAgrSearch] = useState<string>('');
  const [agrTypeFilter, setAgrTypeFilter] = useState<string>('');

  // Modals for Agreements
  const [showCreateAgrModal, setShowCreateAgrModal] = useState<boolean>(false);
  const [showAgrDetailModal, setShowAgrDetailModal] = useState<boolean>(false);
  const [selectedAgrDetail, setSelectedAgrDetail] = useState<AgreementDetailResponse | null>(null);
  const [createAgrForm, setCreateAgrForm] = useState<CreateAgreementPayload>({
    agreementTypeId: 'SALES_AGREEMENT',
    partyIdFrom: 'Company',
    partyIdTo: '',
    description: '',
    textData: ''
  });

  // Load Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const res = await api.getAdvancedAccountingMetadata();
      if (res && res.metadata) {
        setMetadata(res.metadata);
      }
    } catch (e: any) {
      console.error('Metadata load error:', e);
    }
  }, []);

  // Fetch Billing Accounts
  const fetchBillingAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (baSearch) params.search = baSearch;
      if (baPartyFilter) params.partyId = baPartyFilter;
      const res = await api.getBillingAccounts(params);
      setBillingAccounts(res.accounts || []);
      setTotalBaCount(res.totalCount || 0);
      setTotalBaLimit(res.totalLimit || 0);
      setTotalBaAvailable(res.totalAvailable || 0);
      setTotalBaBilled(res.totalBilled || 0);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Cari hesaplar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [baSearch, baPartyFilter]);

  // Fetch Fixed Assets
  const fetchFixedAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (faSearch) params.search = faSearch;
      if (faTypeFilter) params.fixedAssetTypeId = faTypeFilter;
      const res = await api.getFixedAssets(params);
      setFixedAssets(res.assets || []);
      setTotalFaCount(res.totalCount || 0);
      setTotalFaCost(res.totalPurchaseCost || 0);
      setTotalFaDep(res.totalDepreciation || 0);
      setTotalFaNbv(res.totalNetBookValue || 0);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Duran varlıklar yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [faSearch, faTypeFilter]);

  // Fetch Budgets
  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (bgtSearch) params.search = bgtSearch;
      if (bgtTypeFilter) params.budgetTypeId = bgtTypeFilter;
      if (bgtStatusFilter) params.statusId = bgtStatusFilter;
      const res = await api.getBudgets(params);
      setBudgets(res.budgets || []);
      setTotalBgtCount(res.totalCount || 0);
      setTotalBgtAmount(res.totalBudgetedAmount || 0);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Bütçeler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [bgtSearch, bgtTypeFilter, bgtStatusFilter]);

  // Fetch Agreements
  const fetchAgreements = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (agrSearch) params.search = agrSearch;
      if (agrTypeFilter) params.agreementTypeId = agrTypeFilter;
      const res = await api.getAgreements(params);
      setAgreements(res.agreements || []);
      setTotalAgrCount(res.totalCount || 0);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Sözleşmeler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [agrSearch, agrTypeFilter]);

  // Load initial data
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Load active tab data
  useEffect(() => {
    if (activeTab === 'billing-accounts') {
      fetchBillingAccounts();
    } else if (activeTab === 'fixed-assets') {
      fetchFixedAssets();
    } else if (activeTab === 'budgets') {
      fetchBudgets();
    } else if (activeTab === 'agreements') {
      fetchAgreements();
    }
  }, [activeTab, fetchBillingAccounts, fetchFixedAssets, fetchBudgets, fetchAgreements]);

  // Helper clear message
  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // ==========================================
  // HANDLERS: BILLING ACCOUNTS
  // ==========================================
  const handleOpenBaDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getBillingAccountDetails(id);
      setSelectedBaDetail(res);
      setShowBaDetailModal(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBillingAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createBillingAccount(createBaForm);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Cari hesap limiti başarıyla kaydedildi.');
      setShowCreateBaModal(false);
      setCreateBaForm({
        accountLimit: 10000,
        accountCurrencyUomId: 'USD',
        description: '',
        partyId: '',
        roleTypeId: 'BILL_TO_CUSTOMER'
      });
      fetchBillingAccounts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBillingAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBa) return;
    try {
      setLoading(true);
      const payload: UpdateBillingAccountPayload = {
        billingAccountId: editingBa.billingAccountId,
        accountLimit: editingBa.accountLimit,
        description: editingBa.description,
        thruDate: editingBa.thruDate
      };
      const res = await api.updateBillingAccount(payload);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Cari hesap limiti güncellendi.');
      setShowEditBaModal(false);
      setEditingBa(null);
      fetchBillingAccounts();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: FIXED ASSETS
  // ==========================================
  const handleOpenFaDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getFixedAssetDetails(id);
      setSelectedFaDetail(res);
      setShowFaDetailModal(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFixedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createFixedAsset(createFaForm);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Duran varlık kaydedildi.');
      setShowCreateFaModal(false);
      setCreateFaForm({
        fixedAssetName: '',
        fixedAssetTypeId: 'EQUIPMENT',
        purchaseCost: 0,
        purchaseCostUomId: 'USD',
        salvageValue: 0,
        serialNumber: ''
      });
      fetchFixedAssets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFixedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFa) return;
    try {
      setLoading(true);
      const payload: UpdateFixedAssetPayload = {
        fixedAssetId: editingFa.fixedAssetId,
        fixedAssetName: editingFa.fixedAssetName,
        fixedAssetTypeId: editingFa.fixedAssetTypeId,
        purchaseCost: editingFa.purchaseCost,
        salvageValue: editingFa.salvageValue,
        depreciation: editingFa.depreciation,
        serialNumber: editingFa.serialNumber
      };
      const res = await api.updateFixedAsset(payload);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Duran varlık güncellendi.');
      setShowEditFaModal(false);
      setEditingFa(null);
      fetchFixedAssets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAssetId) return;
    try {
      setLoading(true);
      const amt = depAmountInput ? parseFloat(depAmountInput) : undefined;
      const res = await api.calculateDepreciation(depAssetId, amt);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Amortisman kaydedildi.');
      setShowDepModal(false);
      setDepAssetId('');
      setDepAmountInput('');
      fetchFixedAssets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: BUDGETS
  // ==========================================
  const handleOpenBgtDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getBudgetDetails(id);
      setSelectedBgtDetail(res);
      setShowBgtDetailModal(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createBudget(createBgtForm);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Bütçe oluşturuldu.');
      setShowCreateBgtModal(false);
      setCreateBgtForm({ budgetTypeId: 'OPERATING_BUDGET', comments: '' });
      fetchBudgets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudgetItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createBudgetItem(createBgtItemForm);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Bütçe kalemi eklendi.');
      setShowAddBgtItemModal(false);
      if (selectedBgtDetail) {
        handleOpenBgtDetail(selectedBgtDetail.budget.budgetId);
      }
      fetchBudgets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudgetStatus = async (budgetId: string, statusId: string) => {
    try {
      setLoading(true);
      const res = await api.setBudgetStatus(budgetId, statusId);
      triggerSuccess(res._EVENT_MESSAGE_ || `Bütçe durumu güncellendi: ${statusId}`);
      if (selectedBgtDetail && selectedBgtDetail.budget.budgetId === budgetId) {
        handleOpenBgtDetail(budgetId);
      }
      fetchBudgets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: AGREEMENTS
  // ==========================================
  const handleOpenAgrDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getAgreementDetails(id);
      setSelectedAgrDetail(res);
      setShowAgrDetailModal(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createAgreement(createAgrForm);
      triggerSuccess(res._EVENT_MESSAGE_ || 'Sözleşme oluşturuldu.');
      setShowCreateAgrModal(false);
      setCreateAgrForm({
        agreementTypeId: 'SALES_AGREEMENT',
        partyIdFrom: 'Company',
        partyIdTo: '',
        description: '',
        textData: ''
      });
      fetchAgreements();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Format Helpers
  const fmt = (val: number | undefined, curr = 'USD') => {
    if (val === undefined || isNaN(val)) return '0.00';
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' ' + curr;
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      
      {/* HEADER */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">
            <Layers className="text-indigo-400" size={26} />
            İleri Düzey Muhasebe (Advanced Accounting)
          </h1>
          <p className="ds-page-subtitle">
            Cari Limitler (Billing Accounts), Duran Varlıklar (Fixed Assets), Bütçeler (Budgets) ve Sözleşmeler (Agreements)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              if (activeTab === 'billing-accounts') fetchBillingAccounts();
              else if (activeTab === 'fixed-assets') fetchFixedAssets();
              else if (activeTab === 'budgets') fetchBudgets();
              else if (activeTab === 'agreements') fetchAgreements();
            }}
            className="ds-btn-secondary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Yenile
          </button>

          {activeTab === 'billing-accounts' && (
            <button
              onClick={() => setShowCreateBaModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              Yeni Cari Limit Tanımla
            </button>
          )}

          {activeTab === 'fixed-assets' && (
            <button
              onClick={() => setShowCreateFaModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              Yeni Duran Varlık Ekle
            </button>
          )}

          {activeTab === 'budgets' && (
            <button
              onClick={() => setShowCreateBgtModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              Yeni Bütçe Oluştur
            </button>
          )}

          {activeTab === 'agreements' && (
            <button
              onClick={() => setShowCreateAgrModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              Yeni Sözleşme Ekle
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white"><X size={16} /></button>
        </div>
      )}
      {successMsg && (
        <div className="ds-alert-success flex items-center gap-3">
          <CheckCircle2 size={20} />
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white"><X size={16} /></button>
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="ds-tab-bar">
        <button
          onClick={() => setActiveTab('billing-accounts')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'billing-accounts' ? 'ds-tab-active' : ''}`}
        >
          <Landmark size={18} />
          Cari Kredi Limitleri (Billing Accounts)
          <span className="ds-badge ds-badge-slate ml-1">
            {totalBaCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fixed-assets')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'fixed-assets' ? 'ds-tab-active' : ''}`}
        >
          <Building2 size={18} />
          Duran Varlıklar & Amortisman (Fixed Assets)
          <span className="ds-badge ds-badge-slate ml-1">
            {totalFaCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'budgets' ? 'ds-tab-active' : ''}`}
        >
          <BarChart3 size={18} />
          Bütçeler (Budgets)
          <span className="ds-badge ds-badge-slate ml-1">
            {totalBgtCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agreements')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'agreements' ? 'ds-tab-active' : ''}`}
        >
          <Briefcase size={18} />
          Sözleşmeler (Agreements)
          <span className="ds-badge ds-badge-slate ml-1">
            {totalAgrCount}
          </span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: BILLING ACCOUNTS CONTENT            */}
      {/* ========================================== */}


      {/* ========================================== */}
      {/* TAB 1: BILLING ACCOUNTS CONTENT            */}
      {/* ========================================== */}
      {activeTab === 'billing-accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toplam Kredi Limiti</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#818cf8' }}>
                {fmt(totalBaLimit)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Kullanılan / Faturalanan</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#fb7185' }}>
                {fmt(totalBaBilled)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Kullanılabilir Kalan Bakiye</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#4ade80' }}>
                {fmt(totalBaAvailable)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Tanımlı Hesap Sayısı</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {totalBaCount}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Hesap No veya açıklama ara..."
                value={baSearch}
                onChange={e => setBaSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <select
              value={baPartyFilter}
              onChange={e => setBaPartyFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Müşteriler / Cariler</option>
              {metadata?.parties.map(p => (
                <option key={p.partyId} value={p.partyId}>{p.partyName} ({p.partyId})</option>
              ))}
            </select>
          </div>

          {/* Accounts Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hesap No</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Müşteri / Cari</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Açıklama</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Kredi Limiti</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Kullanılan</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Kalan Limit</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Faturalar</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {billingAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Cari hesap kredi limiti kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    billingAccounts.map(ba => (
                      <tr key={ba.billingAccountId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                          #{ba.billingAccountId}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{ba.customerName || ba.partyId || '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ba.roleTypeId}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                          {ba.description || '-'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#818cf8' }}>
                          {fmt(ba.accountLimit, ba.accountCurrencyUomId)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#fb7185' }}>
                          {fmt(ba.accountBalance, ba.accountCurrencyUomId)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                          {fmt(ba.availableBalance, ba.accountCurrencyUomId)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {ba.invoiceCount} fatura
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenBaDetail(ba.billingAccountId)}
                              className="glass-card"
                              title="Detay Görüntüle"
                              style={{ padding: '0.4rem', cursor: 'pointer', color: '#818cf8' }}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => { setEditingBa(ba); setShowEditBaModal(true); }}
                              className="glass-card"
                              title="Limiti Düzenle"
                              style={{ padding: '0.4rem', cursor: 'pointer', color: '#38bdf8' }}
                            >
                              <Edit3 size={15} />
                            </button>
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
      )}

      {/* ========================================== */}
      {/* TAB 2: FIXED ASSETS CONTENT                */}
      {/* ========================================== */}
      {activeTab === 'fixed-assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toplam Varlık Sayısı</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {totalFaCount}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toplam Alış Maliyeti</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#818cf8' }}>
                {fmt(totalFaCost)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Birikmiş Amortisman</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#fb7185' }}>
                {fmt(totalFaDep)}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Net Defter Değeri (NBV)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#4ade80' }}>
                {fmt(totalFaNbv)}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Varlık No, Adı veya Seri No ara..."
                value={faSearch}
                onChange={e => setFaSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <select
              value={faTypeFilter}
              onChange={e => setFaTypeFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Varlık Türleri</option>
              {metadata?.fixedAssetTypes.map(t => (
                <option key={t.fixedAssetTypeId} value={t.fixedAssetTypeId}>{t.description}</option>
              ))}
            </select>
          </div>

          {/* Assets Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Varlık No</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Varlık Adı</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tür</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Maliyet</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Amortisman</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Net Defter Değeri</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alış Tarihi</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Kayıtlı duran varlık bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    fixedAssets.map(fa => (
                      <tr key={fa.fixedAssetId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {fa.fixedAssetId}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{fa.fixedAssetName}</div>
                          {fa.serialNumber && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SN: {fa.serialNumber}</div>}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {fa.fixedAssetTypeDesc}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700 }}>
                          {fmt(fa.purchaseCost, fa.purchaseCostUomId)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#fb7185' }}>
                          {fmt(fa.depreciation, fa.purchaseCostUomId)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                          {fmt(fa.netBookValue, fa.purchaseCostUomId)}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                          {fa.dateAcquired ? fa.dateAcquired.substring(0, 10) : '-'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleOpenFaDetail(fa.fixedAssetId)}
                              className="glass-card"
                              title="Detay & Amortisman Tablosu"
                              style={{ padding: '0.4rem', cursor: 'pointer', color: '#818cf8' }}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setDepAssetId(fa.fixedAssetId);
                                setDepAmountInput('');
                                setShowDepModal(true);
                              }}
                              className="glass-card"
                              title="Amortisman Ayır / Hesapla"
                              style={{ padding: '0.4rem', cursor: 'pointer', color: '#fb7185' }}
                            >
                              <TrendingUp size={15} />
                            </button>
                            <button
                              onClick={() => { setEditingFa(fa); setShowEditFaModal(true); }}
                              className="glass-card"
                              title="Düzenle"
                              style={{ padding: '0.4rem', cursor: 'pointer', color: '#38bdf8' }}
                            >
                              <Edit3 size={15} />
                            </button>
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
      )}

      {/* ========================================== */}
      {/* TAB 3: BUDGETS CONTENT                     */}
      {/* ========================================== */}
      {activeTab === 'budgets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toplam Bütçe Sayısı</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {totalBgtCount}
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toplam Bütçelenen Tutar</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: '#4ade80' }}>
                {fmt(totalBgtAmount)}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Bütçe No veya yorum ara..."
                value={bgtSearch}
                onChange={e => setBgtSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <select
              value={bgtTypeFilter}
              onChange={e => setBgtTypeFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Bütçe Türleri</option>
              {metadata?.budgetTypes.map(t => (
                <option key={t.budgetTypeId} value={t.budgetTypeId}>{t.description}</option>
              ))}
            </select>

            <select
              value={bgtStatusFilter}
              onChange={e => setBgtStatusFilter(e.target.value)}
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
              <option value="BG_CREATED">Oluşturuldu (Created)</option>
              <option value="BG_REVIEWED">İncelendi (Reviewed)</option>
              <option value="BG_APPROVED">Onaylandı (Approved)</option>
              <option value="BG_REJECTED">Reddedildi (Rejected)</option>
            </select>
          </div>

          {/* Budgets Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Bütçe No</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tür</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mali Dönem</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Açıklama</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Kalem Sayısı</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Toplam Tutar</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Durum</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Kayıtlı bütçe bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    budgets.map(b => {
                      const isApproved = b.statusId === 'BG_APPROVED';
                      const isReviewed = b.statusId === 'BG_REVIEWED';
                      return (
                        <tr key={b.budgetId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                            {b.budgetId}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                            {b.budgetTypeDesc}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                            {b.periodDesc || '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                            {b.comments || '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                            <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                              {b.itemCount} kalem
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                            {fmt(b.totalAmount)}
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
                              background: isApproved ? 'rgba(34, 197, 94, 0.15)' : isReviewed ? 'rgba(56, 189, 248, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                              color: isApproved ? '#4ade80' : isReviewed ? '#38bdf8' : '#facc15'
                            }}>
                              {isApproved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {b.statusDesc}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleOpenBgtDetail(b.budgetId)}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <Eye size={14} />
                              Kalemler & Detay
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
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 4: AGREEMENTS CONTENT                  */}
      {/* ========================================== */}
      {activeTab === 'agreements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Toplam Sözleşme Sayısı</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {totalAgrCount}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Sözleşme No veya açıklama ara..."
                value={agrSearch}
                onChange={e => setAgrSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem 0.625rem 2.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <select
              value={agrTypeFilter}
              onChange={e => setAgrTypeFilter(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: '#1e293b',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tüm Sözleşme Türleri</option>
              {metadata?.agreementTypes.map(t => (
                <option key={t.agreementTypeId} value={t.agreementTypeId}>{t.description}</option>
              ))}
            </select>
          </div>

          {/* Agreements Table */}
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Sözleşme No</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tür</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Veren Taraf</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Alan Taraf</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Açıklama</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)' }}>Geçerlilik Tarihleri</th>
                    <th style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Kayıtlı sözleşme bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    agreements.map(ag => (
                      <tr key={ag.agreementId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {ag.agreementId}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                            {ag.agreementTypeDesc}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{ag.partyFromDesc || ag.partyIdFrom}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600 }}>{ag.partyToDesc || ag.partyIdTo}</div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)' }}>
                          {ag.description || '-'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          {ag.fromDate ? ag.fromDate.substring(0, 10) : 'Başlangıç yok'}
                          {ag.thruDate ? ` - ${ag.thruDate.substring(0, 10)}` : ' (Süresiz)'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenAgrDetail(ag.agreementId)}
                            className="glass-card"
                            title="Detay Görüntüle"
                            style={{ padding: '0.4rem', cursor: 'pointer', color: '#818cf8' }}
                          >
                            <Eye size={15} />
                          </button>
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

      {/* ========================================== */}
      {/* MODAL 1: CREATE BILLING ACCOUNT            */}
      {/* ========================================== */}
      {showCreateBaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Landmark size={20} color="var(--primary)" />
                Yeni Cari Kredi Limiti Tanımla
              </h2>
              <button onClick={() => setShowCreateBaModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateBillingAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Müşteri / Cari Seçimi
                </label>
                <select
                  value={createBaForm.partyId}
                  onChange={e => setCreateBaForm({ ...createBaForm, partyId: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                >
                  <option value="">Seçiniz (İsteğe Bağlı)</option>
                  {metadata?.parties.map(p => (
                    <option key={p.partyId} value={p.partyId}>{p.partyName} ({p.partyId})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Kredi Limiti *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={createBaForm.accountLimit}
                    onChange={e => setCreateBaForm({ ...createBaForm, accountLimit: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Para Birimi
                  </label>
                  <select
                    value={createBaForm.accountCurrencyUomId}
                    onChange={e => setCreateBaForm({ ...createBaForm, accountCurrencyUomId: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  >
                    {metadata?.currencies.map(c => (
                      <option key={c.uomId} value={c.uomId}>{c.uomId}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Açıklama
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2026 Yıllık Ticari Kredi Limiti"
                  value={createBaForm.description || ''}
                  onChange={e => setCreateBaForm({ ...createBaForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateBaModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 2: BILLING ACCOUNT DETAIL DRAWER     */}
      {/* ========================================== */}
      {showBaDetailModal && selectedBaDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Landmark size={20} color="var(--primary)" />
                  Cari Hesap Kredi Detayı: #{selectedBaDetail.account.billingAccountId}
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedBaDetail.account.description || 'Açıklama belirtilmemiş'}</div>
              </div>
              <button onClick={() => setShowBaDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Financial Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kredi Limiti</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8', marginTop: '0.2rem' }}>
                  {fmt(selectedBaDetail.account.accountLimit, selectedBaDetail.account.accountCurrencyUomId)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kullanılan / Bakiye</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185', marginTop: '0.2rem' }}>
                  {fmt(selectedBaDetail.account.accountBalance, selectedBaDetail.account.accountCurrencyUomId)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Kalan Kullanılabilir</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', marginTop: '0.2rem' }}>
                  {fmt(selectedBaDetail.account.availableBalance, selectedBaDetail.account.accountCurrencyUomId)}
                </div>
              </div>
            </div>

            {/* Linked Invoices */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} color="var(--primary)" />
              İlişkili Faturalar ({selectedBaDetail.invoices.length})
            </h3>
            {selectedBaDetail.invoices.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Bu kredi hesabına bağlı kesilmiş fatura bulunmamaktadır.
              </div>
            ) : (
              <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Fatura No</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Tarih</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>Durum</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Toplam Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBaDetail.invoices.map(inv => (
                      <tr key={inv.invoiceId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '0.6rem 1rem', fontWeight: 600, color: 'var(--primary)' }}>#{inv.invoiceId}</td>
                        <td style={{ padding: '0.6rem 1rem' }}>{inv.invoiceDate?.substring(0, 10)}</td>
                        <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>{inv.statusId}</td>
                        <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700 }}>{fmt(inv.total, inv.currencyUomId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowBaDetailModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: CREATE FIXED ASSET                */}
      {/* ========================================== */}
      {showCreateFaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="var(--primary)" />
                Yeni Duran Varlık Kartı Ekle
              </h2>
              <button onClick={() => setShowCreateFaModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateFixedAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Varlık No (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="Otomatik veya örn: DEMO_PC_01"
                    value={createFaForm.fixedAssetId || ''}
                    onChange={e => setCreateFaForm({ ...createFaForm, fixedAssetId: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Varlık Türü *
                  </label>
                  <select
                    value={createFaForm.fixedAssetTypeId}
                    onChange={e => setCreateFaForm({ ...createFaForm, fixedAssetTypeId: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  >
                    {metadata?.fixedAssetTypes.map(t => (
                      <option key={t.fixedAssetTypeId} value={t.fixedAssetTypeId}>{t.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Varlık Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Dell PowerEdge Sunucu"
                  value={createFaForm.fixedAssetName}
                  onChange={e => setCreateFaForm({ ...createFaForm, fixedAssetName: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Alış Maliyeti
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createFaForm.purchaseCost || 0}
                    onChange={e => setCreateFaForm({ ...createFaForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Hurda Değeri (Salvage)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createFaForm.salvageValue || 0}
                    onChange={e => setCreateFaForm({ ...createFaForm, salvageValue: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Seri Numarası
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: SN-987654321"
                    value={createFaForm.serialNumber || ''}
                    onChange={e => setCreateFaForm({ ...createFaForm, serialNumber: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Tahmini Faydalı Ömür Sonu
                  </label>
                  <input
                    type="date"
                    value={createFaForm.expectedEndOfLife || ''}
                    onChange={e => setCreateFaForm({ ...createFaForm, expectedEndOfLife: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateFaModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: RECORD DEPRECIATION               */}
      {/* ========================================== */}
      {showDepModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="#fb7185" />
                Amortisman Payı Kaydet: {depAssetId}
              </h2>
              <button onClick={() => setShowDepModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleRecordDepreciation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Aşağıya doğrudan amortisman tutarı girebilir veya boş bırakırsanız doğrusal (straight-line) 5 yıllık periyotta hesaplanan 1 yıllık tutarın otomatik işlenmesini sağlayabilirsiniz.
              </p>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Amortisman Tutarı (Boş ise otomatik hesaplanır)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Örn: 5000.00"
                  value={depAmountInput}
                  onChange={e => setDepAmountInput(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowDepModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Amortismanı İşle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 5: FIXED ASSET DETAIL & SCHEDULE     */}
      {/* ========================================== */}
      {showFaDetailModal && selectedFaDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={20} color="var(--primary)" />
                  Duran Varlık Kartı: {selectedFaDetail.asset.fixedAssetName} ({selectedFaDetail.asset.fixedAssetId})
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedFaDetail.asset.fixedAssetTypeDesc}</div>
              </div>
              <button onClick={() => setShowFaDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Asset Numbers Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Alış Maliyeti</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#818cf8', marginTop: '0.2rem' }}>
                  {fmt(selectedFaDetail.asset.purchaseCost, selectedFaDetail.asset.purchaseCostUomId)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Birikmiş Amortisman</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185', marginTop: '0.2rem' }}>
                  {fmt(selectedFaDetail.asset.depreciation, selectedFaDetail.asset.purchaseCostUomId)}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Defter Değeri</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', marginTop: '0.2rem' }}>
                  {fmt(selectedFaDetail.asset.netBookValue, selectedFaDetail.asset.purchaseCostUomId)}
                </div>
              </div>
            </div>

            {/* Depreciation Schedule */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={16} color="var(--primary)" />
              Doğrusal Amortisman İtfa Projeksiyonu
            </h3>
            {selectedFaDetail.depreciationSchedule.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Maliyet girilmediği için itfa tablosu hesaplanamadı.
              </div>
            ) : (
              <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Yıl</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Takvim Yılı</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Yıllık Amortisman</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Kümülatif Amortisman</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Kalan Defter Değeri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFaDetail.depreciationSchedule.map(s => (
                      <tr key={s.yearNum} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>{s.yearNum}. Yıl</td>
                        <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)' }}>{s.calendarYear}</td>
                        <td style={{ padding: '0.6rem 1rem', textAlign: 'right', color: '#fb7185' }}>{fmt(s.depreciationAmount)}</td>
                        <td style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>{fmt(s.accumulatedDepreciation)}</td>
                        <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>{fmt(s.endingBookValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowFaDetailModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 6: CREATE BUDGET                     */}
      {/* ========================================== */}
      {showCreateBgtModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={20} color="var(--primary)" />
                Yeni Bütçe Oluştur
              </h2>
              <button onClick={() => setShowCreateBgtModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateBudget} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Bütçe Türü *
                </label>
                <select
                  value={createBgtForm.budgetTypeId}
                  onChange={e => setCreateBgtForm({ ...createBgtForm, budgetTypeId: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                >
                  {metadata?.budgetTypes.map(t => (
                    <option key={t.budgetTypeId} value={t.budgetTypeId}>{t.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Mali Dönem (Zaman Periyodu)
                </label>
                <select
                  value={createBgtForm.customTimePeriodId || ''}
                  onChange={e => setCreateBgtForm({ ...createBgtForm, customTimePeriodId: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                >
                  <option value="">Seçiniz</option>
                  {metadata?.customTimePeriods.map(p => (
                    <option key={p.customTimePeriodId} value={p.customTimePeriodId}>{p.periodName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Açıklama / Başlık
                </label>
                <input
                  type="text"
                  placeholder="Örn: 2026 1. Çeyrek Operasyonel Bütçe"
                  value={createBgtForm.comments || ''}
                  onChange={e => setCreateBgtForm({ ...createBgtForm, comments: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateBgtModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Bütçeyi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 7: BUDGET DETAIL & ITEMS             */}
      {/* ========================================== */}
      {showBgtDetailModal && selectedBgtDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={20} color="var(--primary)" />
                  Bütçe Detayı: {selectedBgtDetail.budget.budgetId} ({selectedBgtDetail.budget.budgetTypeDesc})
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {selectedBgtDetail.budget.periodDesc} | Durum: {selectedBgtDetail.budget.statusDesc}
                </div>
              </div>
              <button onClick={() => setShowBgtDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            {/* Status Flow Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Durumu İlerlet:</span>
              <button
                onClick={() => handleSetBudgetStatus(selectedBgtDetail.budget.budgetId, 'BG_REVIEWED')}
                className="glass-card"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', color: '#38bdf8' }}
              >
                İncelemeye Al (Reviewed)
              </button>
              <button
                onClick={() => handleSetBudgetStatus(selectedBgtDetail.budget.budgetId, 'BG_APPROVED')}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
              >
                Onayla (Approved)
              </button>
              <button
                onClick={() => handleSetBudgetStatus(selectedBgtDetail.budget.budgetId, 'BG_REJECTED')}
                className="glass-card"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', color: '#fb7185' }}
              >
                Reddet (Rejected)
              </button>
            </div>

            {/* Budget Items Header with Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Layers size={16} color="var(--primary)" />
                Bütçe Kalemleri ({selectedBgtDetail.items.length}) | Toplam: {fmt(selectedBgtDetail.budget.totalAmount)}
              </h3>
              <button
                onClick={() => {
                  setCreateBgtItemForm({
                    budgetId: selectedBgtDetail.budget.budgetId,
                    budgetItemTypeId: 'REQUIREMENT_BUDGET_A',
                    amount: 1000,
                    purpose: '',
                    justification: ''
                  });
                  setShowAddBgtItemModal(true);
                }}
                className="btn-primary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Plus size={14} />
                Kalem Ekle
              </button>
            </div>

            {/* Items Table */}
            {selectedBgtDetail.items.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Bu bütçeye henüz kalem eklenmemiştir.
              </div>
            ) : (
              <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Sıra</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Kalem Türü</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>Gerekçe / Amaç</th>
                      <th style={{ padding: '0.6rem 1rem', textAlign: 'right' }}>Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBgtDetail.items.map(item => (
                      <tr key={item.budgetItemSeqId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>#{item.budgetItemSeqId}</td>
                        <td style={{ padding: '0.6rem 1rem' }}>{item.budgetItemTypeDesc}</td>
                        <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)' }}>{item.purpose || item.justification || '-'}</td>
                        <td style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowBgtDetailModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 8: ADD BUDGET ITEM                   */}
      {/* ========================================== */}
      {showAddBgtItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="var(--primary)" />
                Bütçe Kalemi Ekle
              </h2>
              <button onClick={() => setShowAddBgtItemModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateBudgetItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Kalem Türü
                </label>
                <select
                  value={createBgtItemForm.budgetItemTypeId}
                  onChange={e => setCreateBgtItemForm({ ...createBgtItemForm, budgetItemTypeId: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                >
                  {metadata?.budgetItemTypes.map(t => (
                    <option key={t.budgetItemTypeId} value={t.budgetItemTypeId}>{t.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Tutar *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={createBgtItemForm.amount}
                  onChange={e => setCreateBgtItemForm({ ...createBgtItemForm, amount: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Amaç (Purpose)
                </label>
                <input
                  type="text"
                  placeholder="Örn: Donanım Alımı"
                  value={createBgtItemForm.purpose || ''}
                  onChange={e => setCreateBgtItemForm({ ...createBgtItemForm, purpose: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowAddBgtItemModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Kalemi Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 9: CREATE AGREEMENT                  */}
      {/* ========================================== */}
      {showCreateAgrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={20} color="var(--primary)" />
                Yeni Sözleşme Tanımla
              </h2>
              <button onClick={() => setShowCreateAgrModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateAgreement} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Sözleşme No (İsteğe Bağlı)
                  </label>
                  <input
                    type="text"
                    placeholder="Otomatik veya örn: AGR-2026-01"
                    value={createAgrForm.agreementId || ''}
                    onChange={e => setCreateAgrForm({ ...createAgrForm, agreementId: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Sözleşme Türü *
                  </label>
                  <select
                    value={createAgrForm.agreementTypeId}
                    onChange={e => setCreateAgrForm({ ...createAgrForm, agreementTypeId: e.target.value })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  >
                    {metadata?.agreementTypes.map(t => (
                      <option key={t.agreementTypeId} value={t.agreementTypeId}>{t.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Karşı Taraf (Müşteri / Tedarikçi) *
                </label>
                <select
                  required
                  value={createAgrForm.partyIdTo}
                  onChange={e => setCreateAgrForm({ ...createAgrForm, partyIdTo: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                >
                  <option value="">Seçiniz</option>
                  {metadata?.parties.map(p => (
                    <option key={p.partyId} value={p.partyId}>{p.partyName} ({p.partyId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Açıklama / Konu
                </label>
                <input
                  type="text"
                  placeholder="Örn: Yıllık Ürün Tedarik ve Dağıtım Anlaşması"
                  value={createAgrForm.description || ''}
                  onChange={e => setCreateAgrForm({ ...createAgrForm, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowCreateAgrModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Sözleşmeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 10: AGREEMENT DETAIL                */}
      {/* ========================================== */}
      {showAgrDetailModal && selectedAgrDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={20} color="var(--primary)" />
                  Sözleşme #{selectedAgrDetail.agreement.agreementId}: {selectedAgrDetail.agreement.agreementTypeDesc}
                </h2>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedAgrDetail.agreement.description}</div>
              </div>
              <button onClick={() => setShowAgrDetailModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sözleşmeyi Veren Taraf</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {selectedAgrDetail.agreement.partyFromDesc || selectedAgrDetail.agreement.partyIdFrom}
                </div>
              </div>
              <div className="glass-card" style={{ padding: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sözleşmeyi Alan Taraf</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.2rem' }}>
                  {selectedAgrDetail.agreement.partyToDesc || selectedAgrDetail.agreement.partyIdTo}
                </div>
              </div>
            </div>

            {selectedAgrDetail.agreement.textData && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem' }}>Sözleşme Metni / Notlar:</div>
                <div className="glass-card" style={{ padding: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {selectedAgrDetail.agreement.textData}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setShowAgrDetailModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT BILLING ACCOUNT                */}
      {/* ========================================== */}
      {showEditBaModal && editingBa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="#38bdf8" />
                Cari Limiti Düzenle: #{editingBa.billingAccountId}
              </h2>
              <button onClick={() => setShowEditBaModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateBillingAccount} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Kredi Limiti *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingBa.accountLimit}
                  onChange={e => setEditingBa({ ...editingBa, accountLimit: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Açıklama
                </label>
                <input
                  type="text"
                  value={editingBa.description || ''}
                  onChange={e => setEditingBa({ ...editingBa, description: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditBaModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: EDIT FIXED ASSET                    */}
      {/* ========================================== */}
      {showEditFaModal && editingFa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '1.75rem', background: '#0f172a', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="#38bdf8" />
                Varlık Kartını Düzenle: #{editingFa.fixedAssetId}
              </h2>
              <button onClick={() => setShowEditFaModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>

            <form onSubmit={handleUpdateFixedAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Varlık Adı *
                </label>
                <input
                  type="text"
                  required
                  value={editingFa.fixedAssetName}
                  onChange={e => setEditingFa({ ...editingFa, fixedAssetName: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Alış Maliyeti
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingFa.purchaseCost}
                    onChange={e => setEditingFa({ ...editingFa, purchaseCost: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                    Hurda Değeri
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingFa.salvageValue}
                    onChange={e => setEditingFa({ ...editingFa, salvageValue: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                  Seri Numarası
                </label>
                <input
                  type="text"
                  value={editingFa.serialNumber || ''}
                  onChange={e => setEditingFa({ ...editingFa, serialNumber: e.target.value })}
                  style={{ width: '100%', padding: '0.625rem', background: '#1e293b', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'white' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditFaModal(false)} className="glass-card" style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}>Vazgeç</button>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.625rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdvancedAccounting;
