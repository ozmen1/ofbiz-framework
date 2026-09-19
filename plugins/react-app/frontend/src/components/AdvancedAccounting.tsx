import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers, Search, RefreshCw, Plus, Eye, Edit3,
  CheckCircle2, Clock, X, AlertCircle, Loader2,
  Briefcase, Landmark, Building2, FileText, Check,
  BarChart3, TrendingUp, Zap
} from 'lucide-react';
import { useTranslation } from '../i18n';
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
  BatchDepreciationResponse,
  BudgetItemSummary,
  BudgetDetailResponse,
  CreateBudgetPayload,
  CreateBudgetItemPayload,
  AgreementSummary,
  AgreementDetailResponse,
  CreateAgreementPayload
} from '../services/api';
import { FixedAssetLifecycleModal } from './FixedAssetLifecycleModal';

type AdvancedTab = 'billing-accounts' | 'fixed-assets' | 'budgets' | 'agreements';

export const AdvancedAccounting: React.FC = () => {
  const { translations, locale } = useTranslation();
  const t = translations.advancedAccounting;
  const tc = translations.common;
  const isTr = locale === 'tr';

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

  // Fixed Asset Lifecycle & Batch Depreciation
  const [selectedLifecycleAsset, setSelectedLifecycleAsset] = useState<FixedAssetItem | null>(null);
  const [showLifecycleModal, setShowLifecycleModal] = useState<boolean>(false);
  const [showBatchDepModal, setShowBatchDepModal] = useState<boolean>(false);
  const [batchSubmitting, setBatchSubmitting] = useState<boolean>(false);
  const [batchResult, setBatchResult] = useState<BatchDepreciationResponse | null>(null);
  const [batchOrgId, setBatchOrgId] = useState<string>('Company');
  const [batchAssetTypeId, setBatchAssetTypeId] = useState<string>('');

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
      setError(e.message || t.messages.loadBaError);
    } finally {
      setLoading(false);
    }
  }, [baSearch, baPartyFilter, t.messages.loadBaError]);

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
      setError(e.message || t.messages.loadFaError);
    } finally {
      setLoading(false);
    }
  }, [faSearch, faTypeFilter, t.messages.loadFaError]);

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
      setError(e.message || t.messages.loadBgError);
    } finally {
      setLoading(false);
    }
  }, [bgtSearch, bgtTypeFilter, bgtStatusFilter, t.messages.loadBgError]);

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
      setError(e.message || t.messages.loadAgError);
    } finally {
      setLoading(false);
    }
  }, [agrSearch, agrTypeFilter, t.messages.loadAgError]);

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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.baSaved);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.baUpdated);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.faSaved);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.faUpdated);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.fixedAssets.depreciationSuccess);
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

  const handleRunBatchDepreciation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchSubmitting(true);
    setError(null);
    try {
      const res = await api.runBatchDepreciation({
        organizationPartyId: batchOrgId,
        fixedAssetTypeId: batchAssetTypeId || undefined,
      });
      setBatchResult(res);
      triggerSuccess(res._EVENT_MESSAGE_ || translations.fixedAssetLifecycle.depreciation.batchSuccess);
      fetchFixedAssets();
    } catch (e: any) {
      setError(e.message || 'Batch depreciation run failed');
    } finally {
      setBatchSubmitting(false);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.bgSaved);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.bgItemAdded);
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
      triggerSuccess(res._EVENT_MESSAGE_ || `${t.messages.bgStatusUpdated}: ${statusId}`);
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
      triggerSuccess(res._EVENT_MESSAGE_ || t.messages.agSaved);
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
    if (val === undefined || isNaN(val)) return '0.00 ' + curr;
    return (
      new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(val) +
      ' ' +
      curr
    );
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      {/* HEADER */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">
            <Layers className="text-indigo-400" size={26} />
            {t.title}
          </h1>
          <p className="ds-page-subtitle">
            {t.subtitle}
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
            {tc.refresh}
          </button>

          {activeTab === 'billing-accounts' && (
            <button
              onClick={() => setShowCreateBaModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              {t.billingAccounts.newAccount}
            </button>
          )}

          {activeTab === 'fixed-assets' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBatchResult(null);
                  setShowBatchDepModal(true);
                }}
                className="ds-btn-secondary text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                title={translations.fixedAssetLifecycle.depreciation.batchTitle}
              >
                <Zap size={16} />
                {translations.fixedAssetLifecycle.depreciation.runBatchBtn}
              </button>
              <button
                onClick={() => setShowCreateFaModal(true)}
                className="ds-btn-primary"
              >
                <Plus size={16} />
                {t.fixedAssets.newAsset}
              </button>
            </div>
          )}

          {activeTab === 'budgets' && (
            <button
              onClick={() => setShowCreateBgtModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              {t.budgets.newBudget}
            </button>
          )}

          {activeTab === 'agreements' && (
            <button
              onClick={() => setShowCreateAgrModal(true)}
              className="ds-btn-primary"
            >
              <Plus size={16} />
              {t.agreements.newAgreement}
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
          {t.tabs.billingAccounts}
          <span className="ds-badge ds-badge-slate ml-1">
            {totalBaCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('fixed-assets')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'fixed-assets' ? 'ds-tab-active' : ''}`}
        >
          <Building2 size={18} />
          {t.tabs.fixedAssets}
          <span className="ds-badge ds-badge-slate ml-1">
            {totalFaCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('budgets')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'budgets' ? 'ds-tab-active' : ''}`}
        >
          <BarChart3 size={18} />
          {t.tabs.budgets}
          <span className="ds-badge ds-badge-slate ml-1">
            {totalBgtCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('agreements')}
          className={`ds-tab flex items-center gap-2 ${activeTab === 'agreements' ? 'ds-tab-active' : ''}`}
        >
          <Briefcase size={18} />
          {t.tabs.agreements}
          <span className="ds-badge ds-badge-slate ml-1">
            {totalAgrCount}
          </span>
        </button>
      </div>

      {/* ========================================== */}
      {/* TAB 1: BILLING ACCOUNTS CONTENT            */}
      {/* ========================================== */}
      {activeTab === 'billing-accounts' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ds-stat-card border-l-4 border-l-indigo-500">
              <div className="ds-stat-label">{t.billingAccounts.totalLimit}</div>
              <div className="ds-stat-value text-indigo-400">
                {fmt(totalBaLimit)}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-rose-500">
              <div className="ds-stat-label">{t.billingAccounts.billed}</div>
              <div className="ds-stat-value text-rose-400">
                {fmt(totalBaBilled)}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-emerald-500">
              <div className="ds-stat-label">{t.billingAccounts.totalAvailable}</div>
              <div className="ds-stat-value text-emerald-400">
                {fmt(totalBaAvailable)}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-slate-500">
              <div className="ds-stat-label">{t.billingAccounts.accountCount}</div>
              <div className="ds-stat-value text-white">
                {totalBaCount}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="ds-card p-4 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.billingAccounts.searchPlaceholder}
                value={baSearch}
                onChange={e => setBaSearch(e.target.value)}
                className="ds-input pl-10"
              />
            </div>

            <select
              value={baPartyFilter}
              onChange={e => setBaPartyFilter(e.target.value)}
              className="ds-select min-w-[240px]"
            >
              <option value="">{t.billingAccounts.allParties}</option>
              {metadata?.parties.map(p => (
                <option key={p.partyId} value={p.partyId}>{p.partyName} ({p.partyId})</option>
              ))}
            </select>
          </div>

          {/* Accounts Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{t.billingAccounts.accountId}</th>
                    <th className="ds-th">{t.billingAccounts.customer}</th>
                    <th className="ds-th">{tc.description}</th>
                    <th className="ds-th-right">{t.billingAccounts.limit}</th>
                    <th className="ds-th-right">{t.billingAccounts.billed}</th>
                    <th className="ds-th-right">{t.billingAccounts.available}</th>
                    <th className="ds-th text-center">{t.billingAccounts.invoicesCharged}</th>
                    <th className="ds-th-right">{tc.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {billingAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="ds-empty py-12 text-center text-slate-400">
                        {t.billingAccounts.noAccounts}
                      </td>
                    </tr>
                  ) : (
                    billingAccounts.map(ba => (
                      <tr key={ba.billingAccountId} className="ds-tbody-row">
                        <td className="ds-td font-bold text-indigo-400">
                          #{ba.billingAccountId}
                        </td>
                        <td className="ds-td">
                          <div className="font-semibold text-white">{ba.customerName || ba.partyId || '-'}</div>
                          <div className="text-xs text-slate-400">{ba.roleTypeId}</div>
                        </td>
                        <td className="ds-td-muted">
                          {ba.description || '-'}
                        </td>
                        <td className="ds-td-right font-bold text-indigo-400">
                          {fmt(ba.accountLimit, ba.accountCurrencyUomId)}
                        </td>
                        <td className="ds-td-right text-rose-400">
                          {fmt(ba.accountBalance, ba.accountCurrencyUomId)}
                        </td>
                        <td className="ds-td-right font-bold text-emerald-400">
                          {fmt(ba.availableBalance, ba.accountCurrencyUomId)}
                        </td>
                        <td className="ds-td text-center">
                          <span className="ds-badge ds-badge-slate">
                            {ba.invoiceCount} {isTr ? 'fatura' : 'invoices'}
                          </span>
                        </td>
                        <td className="ds-td-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenBaDetail(ba.billingAccountId)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700/50 transition-colors"
                              title={t.billingAccounts.detail}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => { setEditingBa(ba); setShowEditBaModal(true); }}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700/50 transition-colors"
                              title={t.billingAccounts.editAccount}
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ds-stat-card border-l-4 border-l-slate-500">
              <div className="ds-stat-label">{t.fixedAssets.totalAssets}</div>
              <div className="ds-stat-value text-white">
                {totalFaCount}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-indigo-500">
              <div className="ds-stat-label">{t.fixedAssets.totalCost}</div>
              <div className="ds-stat-value text-indigo-400">
                {fmt(totalFaCost)}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-rose-500">
              <div className="ds-stat-label">{t.fixedAssets.accumDepreciation}</div>
              <div className="ds-stat-value text-rose-400">
                {fmt(totalFaDep)}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-emerald-500">
              <div className="ds-stat-label">{t.fixedAssets.totalNbv}</div>
              <div className="ds-stat-value text-emerald-400">
                {fmt(totalFaNbv)}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="ds-card p-4 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.fixedAssets.searchPlaceholder}
                value={faSearch}
                onChange={e => setFaSearch(e.target.value)}
                className="ds-input pl-10"
              />
            </div>

            <select
              value={faTypeFilter}
              onChange={e => setFaTypeFilter(e.target.value)}
              className="ds-select min-w-[240px]"
            >
              <option value="">{t.fixedAssets.allTypes}</option>
              {metadata?.fixedAssetTypes.map(tItem => (
                <option key={tItem.fixedAssetTypeId} value={tItem.fixedAssetTypeId}>{tItem.description}</option>
              ))}
            </select>
          </div>

          {/* Assets Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{t.fixedAssets.assetId}</th>
                    <th className="ds-th">{t.fixedAssets.name}</th>
                    <th className="ds-th">{t.fixedAssets.type}</th>
                    <th className="ds-th-right">{t.fixedAssets.cost}</th>
                    <th className="ds-th-right">{t.fixedAssets.depreciation}</th>
                    <th className="ds-th-right">{t.fixedAssets.nbv}</th>
                    <th className="ds-th">{t.fixedAssets.purchaseDate}</th>
                    <th className="ds-th-right">{tc.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {fixedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="ds-empty py-12 text-center text-slate-400">
                        {t.fixedAssets.noAssets}
                      </td>
                    </tr>
                  ) : (
                    fixedAssets.map(fa => (
                      <tr key={fa.fixedAssetId} className="ds-tbody-row">
                        <td className="ds-td font-bold text-indigo-400">
                          {fa.fixedAssetId}
                        </td>
                        <td className="ds-td">
                          <div className="font-semibold text-white">{fa.fixedAssetName}</div>
                          {fa.serialNumber && <div className="text-xs text-slate-400">SN: {fa.serialNumber}</div>}
                        </td>
                        <td className="ds-td">
                          <span className="ds-badge ds-badge-slate">
                            {fa.fixedAssetTypeDesc}
                          </span>
                        </td>
                        <td className="ds-td-right font-bold text-white">
                          {fmt(fa.purchaseCost, fa.purchaseCostUomId)}
                        </td>
                        <td className="ds-td-right text-rose-400">
                          {fmt(fa.depreciation, fa.purchaseCostUomId)}
                        </td>
                        <td className="ds-td-right font-bold text-emerald-400">
                          {fmt(fa.netBookValue, fa.purchaseCostUomId)}
                        </td>
                        <td className="ds-td-muted">
                          {fa.dateAcquired ? fa.dateAcquired.substring(0, 10) : '-'}
                        </td>
                        <td className="ds-td-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedLifecycleAsset(fa);
                                setShowLifecycleModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700/50 transition-colors"
                              title={translations.fixedAssetLifecycle.title}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => handleOpenFaDetail(fa.fixedAssetId)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
                              title={t.fixedAssets.detail}
                            >
                              <FileText size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setDepAssetId(fa.fixedAssetId);
                                setDepAmountInput('');
                                setShowDepModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-slate-700/50 transition-colors"
                              title={t.fixedAssets.calculateDepreciation}
                            >
                              <TrendingUp size={15} />
                            </button>
                            <button
                              onClick={() => { setEditingFa(fa); setShowEditFaModal(true); }}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700/50 transition-colors"
                              title={t.fixedAssets.editAsset}
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="ds-stat-card border-l-4 border-l-slate-500">
              <div className="ds-stat-label">{t.budgets.totalBudgets}</div>
              <div className="ds-stat-value text-white">
                {totalBgtCount}
              </div>
            </div>
            <div className="ds-stat-card border-l-4 border-l-emerald-500">
              <div className="ds-stat-label">{t.budgets.totalAmount}</div>
              <div className="ds-stat-value text-emerald-400">
                {fmt(totalBgtAmount)}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="ds-card p-4 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.budgets.searchPlaceholder}
                value={bgtSearch}
                onChange={e => setBgtSearch(e.target.value)}
                className="ds-input pl-10"
              />
            </div>

            <select
              value={bgtTypeFilter}
              onChange={e => setBgtTypeFilter(e.target.value)}
              className="ds-select min-w-[200px]"
            >
              <option value="">{t.budgets.allTypes}</option>
              {metadata?.budgetTypes.map(bType => (
                <option key={bType.budgetTypeId} value={bType.budgetTypeId}>{bType.description}</option>
              ))}
            </select>

            <select
              value={bgtStatusFilter}
              onChange={e => setBgtStatusFilter(e.target.value)}
              className="ds-select min-w-[200px]"
            >
              <option value="">{t.budgets.allStatuses}</option>
              <option value="BG_CREATED">{isTr ? 'Oluşturuldu (Created)' : 'Created'}</option>
              <option value="BG_REVIEWED">{isTr ? 'İncelendi (Reviewed)' : 'Reviewed'}</option>
              <option value="BG_APPROVED">{isTr ? 'Onaylandı (Approved)' : 'Approved'}</option>
              <option value="BG_REJECTED">{isTr ? 'Reddedildi (Rejected)' : 'Rejected'}</option>
            </select>
          </div>

          {/* Budgets Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{t.budgets.budgetId}</th>
                    <th className="ds-th">{t.budgets.budgetType}</th>
                    <th className="ds-th">{t.budgets.period}</th>
                    <th className="ds-th">{tc.description}</th>
                    <th className="ds-th text-center">{t.budgets.itemsCount}</th>
                    <th className="ds-th-right">{t.budgets.amount}</th>
                    <th className="ds-th text-center">{t.budgets.status}</th>
                    <th className="ds-th-right">{tc.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="ds-empty py-12 text-center text-slate-400">
                        {t.budgets.noBudgets}
                      </td>
                    </tr>
                  ) : (
                    budgets.map(b => {
                      const isApproved = b.statusId === 'BG_APPROVED';
                      const isReviewed = b.statusId === 'BG_REVIEWED';
                      return (
                        <tr key={b.budgetId} className="ds-tbody-row">
                          <td className="ds-td font-bold text-indigo-400">
                            {b.budgetId}
                          </td>
                          <td className="ds-td font-semibold text-white">
                            {b.budgetTypeDesc}
                          </td>
                          <td className="ds-td-muted">
                            {b.periodDesc || '-'}
                          </td>
                          <td className="ds-td-muted">
                            {b.comments || '-'}
                          </td>
                          <td className="ds-td text-center">
                            <span className="ds-badge ds-badge-slate">
                              {b.itemCount} {isTr ? 'kalem' : 'items'}
                            </span>
                          </td>
                          <td className="ds-td-right font-bold text-emerald-400">
                            {fmt(b.totalAmount)}
                          </td>
                          <td className="ds-td text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isApproved
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : isReviewed
                                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            }`}>
                              {isApproved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                              {b.statusDesc}
                            </span>
                          </td>
                          <td className="ds-td-right">
                            <button
                              onClick={() => handleOpenBgtDetail(b.budgetId)}
                              className="ds-btn-primary py-1 px-2.5 text-xs inline-flex items-center gap-1.5"
                            >
                              <Eye size={13} />
                              {t.budgets.detail}
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="ds-stat-card border-l-4 border-l-slate-500">
              <div className="ds-stat-label">{t.agreements.totalAgreements}</div>
              <div className="ds-stat-value text-white">
                {totalAgrCount}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="ds-card p-4 flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.agreements.searchPlaceholder}
                value={agrSearch}
                onChange={e => setAgrSearch(e.target.value)}
                className="ds-input pl-10"
              />
            </div>

            <select
              value={agrTypeFilter}
              onChange={e => setAgrTypeFilter(e.target.value)}
              className="ds-select min-w-[240px]"
            >
              <option value="">{t.agreements.allTypes}</option>
              {metadata?.agreementTypes.map(aType => (
                <option key={aType.agreementTypeId} value={aType.agreementTypeId}>{aType.description}</option>
              ))}
            </select>
          </div>

          {/* Agreements Table */}
          <div className="ds-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr className="ds-thead-row">
                    <th className="ds-th">{t.agreements.agreementId}</th>
                    <th className="ds-th">{t.agreements.type}</th>
                    <th className="ds-th">{t.agreements.partyFrom}</th>
                    <th className="ds-th">{t.agreements.partyTo}</th>
                    <th className="ds-th">{tc.description}</th>
                    <th className="ds-th">{isTr ? 'Geçerlilik Tarihleri' : 'Validity Dates'}</th>
                    <th className="ds-th-right">{tc.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="ds-empty py-12 text-center text-slate-400">
                        {t.agreements.noAgreements}
                      </td>
                    </tr>
                  ) : (
                    agreements.map(ag => (
                      <tr key={ag.agreementId} className="ds-tbody-row">
                        <td className="ds-td font-bold text-indigo-400">
                          {ag.agreementId}
                        </td>
                        <td className="ds-td">
                          <span className="ds-badge ds-badge-slate">
                            {ag.agreementTypeDesc}
                          </span>
                        </td>
                        <td className="ds-td font-semibold text-white">
                          {ag.partyFromDesc || ag.partyIdFrom}
                        </td>
                        <td className="ds-td font-semibold text-white">
                          {ag.partyToDesc || ag.partyIdTo}
                        </td>
                        <td className="ds-td-muted">
                          {ag.description || '-'}
                        </td>
                        <td className="ds-td-muted text-xs">
                          {ag.fromDate ? ag.fromDate.substring(0, 10) : (isTr ? 'Başlangıç yok' : 'No start')}
                          {ag.thruDate ? ` - ${ag.thruDate.substring(0, 10)}` : (isTr ? ' (Süresiz)' : ' (Indefinite)')}
                        </td>
                        <td className="ds-td-right">
                          <button
                            onClick={() => handleOpenAgrDetail(ag.agreementId)}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700/50 transition-colors"
                            title={t.agreements.detail}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Landmark size={20} className="text-indigo-400" />
                {t.billingAccounts.newAccount}
              </h2>
              <button
                onClick={() => setShowCreateBaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBillingAccount} className="space-y-4">
              <div>
                <label className="ds-label">
                  {t.billingAccounts.customer}
                </label>
                <select
                  value={createBaForm.partyId}
                  onChange={e => setCreateBaForm({ ...createBaForm, partyId: e.target.value })}
                  className="ds-select"
                >
                  <option value="">{isTr ? 'Seçiniz (İsteğe Bağlı)' : 'Select (Optional)'}</option>
                  {metadata?.parties.map(p => (
                    <option key={p.partyId} value={p.partyId}>{p.partyName} ({p.partyId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="ds-label">
                    {t.billingAccounts.limit} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={createBaForm.accountLimit}
                    onChange={e => setCreateBaForm({ ...createBaForm, accountLimit: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.billingAccounts.currency}
                  </label>
                  <select
                    value={createBaForm.accountCurrencyUomId}
                    onChange={e => setCreateBaForm({ ...createBaForm, accountCurrencyUomId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.currencies.map(c => (
                      <option key={c.uomId} value={c.uomId}>{c.uomId}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {tc.description}
                </label>
                <input
                  type="text"
                  placeholder={isTr ? 'Örn: 2026 Yıllık Ticari Kredi Limiti' : 'e.g. 2026 Annual Credit Limit'}
                  value={createBaForm.description || ''}
                  onChange={e => setCreateBaForm({ ...createBaForm, description: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBaModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {tc.save}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Landmark size={20} className="text-indigo-400" />
                  {t.billingAccounts.detail}: #{selectedBaDetail.account.billingAccountId}
                </h2>
                <div className="text-xs text-slate-400 mt-1">
                  {selectedBaDetail.account.description || (isTr ? 'Açıklama belirtilmemiş' : 'No description provided')}
                </div>
              </div>
              <button
                onClick={() => setShowBaDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="ds-stat-card border-l-4 border-l-indigo-500">
                <div className="ds-stat-label">{t.billingAccounts.limit}</div>
                <div className="ds-stat-value text-indigo-400">
                  {fmt(selectedBaDetail.account.accountLimit, selectedBaDetail.account.accountCurrencyUomId)}
                </div>
              </div>
              <div className="ds-stat-card border-l-4 border-l-rose-500">
                <div className="ds-stat-label">{t.billingAccounts.billed}</div>
                <div className="ds-stat-value text-rose-400">
                  {fmt(selectedBaDetail.account.accountBalance, selectedBaDetail.account.accountCurrencyUomId)}
                </div>
              </div>
              <div className="ds-stat-card border-l-4 border-l-emerald-500">
                <div className="ds-stat-label">{t.billingAccounts.available}</div>
                <div className="ds-stat-value text-emerald-400">
                  {fmt(selectedBaDetail.account.availableBalance, selectedBaDetail.account.accountCurrencyUomId)}
                </div>
              </div>
            </div>

            {/* Linked Invoices */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                {isTr ? 'İlişkili Faturalar' : 'Linked Invoices'} ({selectedBaDetail.invoices.length})
              </h3>
              {selectedBaDetail.invoices.length === 0 ? (
                <div className="ds-empty py-6 text-center text-slate-400 text-sm">
                  {isTr ? 'Bu kredi hesabına bağlı kesilmiş fatura bulunmamaktadır.' : 'No invoices linked to this billing account.'}
                </div>
              ) : (
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{isTr ? 'Fatura No' : 'Invoice #'}</th>
                        <th className="ds-th">{tc.date}</th>
                        <th className="ds-th text-center">{tc.status}</th>
                        <th className="ds-th-right">{tc.amount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBaDetail.invoices.map(inv => (
                        <tr key={inv.invoiceId} className="ds-tbody-row">
                          <td className="ds-td font-semibold text-indigo-400">#{inv.invoiceId}</td>
                          <td className="ds-td-muted">{inv.invoiceDate?.substring(0, 10)}</td>
                          <td className="ds-td text-center">
                            <span className="ds-badge ds-badge-slate">{inv.statusId}</span>
                          </td>
                          <td className="ds-td-right font-bold text-white">{fmt(inv.total, inv.currencyUomId)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBaDetailModal(false)}
                className="ds-btn-secondary"
              >
                {tc.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: CREATE FIXED ASSET                */}
      {/* ========================================== */}
      {showCreateFaModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 size={20} className="text-indigo-400" />
                {t.fixedAssets.newAsset}
              </h2>
              <button
                onClick={() => setShowCreateFaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateFixedAsset} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.assetId} ({isTr ? 'İsteğe Bağlı' : 'Optional'})
                  </label>
                  <input
                    type="text"
                    placeholder={isTr ? 'Otomatik veya örn: DEMO_PC_01' : 'Auto or e.g. DEMO_PC_01'}
                    value={createFaForm.fixedAssetId || ''}
                    onChange={e => setCreateFaForm({ ...createFaForm, fixedAssetId: e.target.value })}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.type} *
                  </label>
                  <select
                    value={createFaForm.fixedAssetTypeId}
                    onChange={e => setCreateFaForm({ ...createFaForm, fixedAssetTypeId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.fixedAssetTypes.map(fType => (
                      <option key={fType.fixedAssetTypeId} value={fType.fixedAssetTypeId}>{fType.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {t.fixedAssets.name} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={isTr ? 'Örn: Dell PowerEdge Sunucu' : 'e.g. Dell PowerEdge Server'}
                  value={createFaForm.fixedAssetName}
                  onChange={e => setCreateFaForm({ ...createFaForm, fixedAssetName: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.cost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createFaForm.purchaseCost || 0}
                    onChange={e => setCreateFaForm({ ...createFaForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.salvageValue}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={createFaForm.salvageValue || 0}
                    onChange={e => setCreateFaForm({ ...createFaForm, salvageValue: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.serialNumber}
                  </label>
                  <input
                    type="text"
                    placeholder={isTr ? 'Örn: SN-987654321' : 'e.g. SN-987654321'}
                    value={createFaForm.serialNumber || ''}
                    onChange={e => setCreateFaForm({ ...createFaForm, serialNumber: e.target.value })}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {isTr ? 'Tahmini Faydalı Ömür Sonu' : 'Expected End of Life'}
                  </label>
                  <input
                    type="date"
                    value={createFaForm.expectedEndOfLife || ''}
                    onChange={e => setCreateFaForm({ ...createFaForm, expectedEndOfLife: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFaModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {tc.save}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-rose-400" />
                {t.fixedAssets.calculateDepreciation}: {depAssetId}
              </h2>
              <button
                onClick={() => setShowDepModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordDepreciation} className="space-y-4">
              <p className="text-sm text-slate-400">
                {isTr
                  ? 'Aşağıya doğrudan amortisman tutarı girebilir veya boş bırakırsanız doğrusal (straight-line) 5 yıllık periyotta hesaplanan 1 yıllık tutarın otomatik işlenmesini sağlayabilirsiniz.'
                  : 'Enter the depreciation amount directly below, or leave it blank to automatically apply the 1-year straight-line depreciation calculated over a 5-year period.'}
              </p>

              <div>
                <label className="ds-label">
                  {isTr ? 'Amortisman Tutarı (Boş ise otomatik hesaplanır)' : 'Depreciation Amount (Calculated automatically if blank)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={isTr ? 'Örn: 5000.00' : 'e.g. 5000.00'}
                  value={depAmountInput}
                  onChange={e => setDepAmountInput(e.target.value)}
                  className="ds-input font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDepModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Amortismanı İşle' : 'Apply Depreciation'}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 size={20} className="text-indigo-400" />
                  {t.fixedAssets.detail}: {selectedFaDetail.asset.fixedAssetName} ({selectedFaDetail.asset.fixedAssetId})
                </h2>
                <div className="text-xs text-slate-400 mt-1">{selectedFaDetail.asset.fixedAssetTypeDesc}</div>
              </div>
              <button
                onClick={() => setShowFaDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Asset Numbers Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="ds-stat-card border-l-4 border-l-indigo-500">
                <div className="ds-stat-label">{t.fixedAssets.cost}</div>
                <div className="ds-stat-value text-indigo-400">
                  {fmt(selectedFaDetail.asset.purchaseCost, selectedFaDetail.asset.purchaseCostUomId)}
                </div>
              </div>
              <div className="ds-stat-card border-l-4 border-l-rose-500">
                <div className="ds-stat-label">{t.fixedAssets.depreciation}</div>
                <div className="ds-stat-value text-rose-400">
                  {fmt(selectedFaDetail.asset.depreciation, selectedFaDetail.asset.purchaseCostUomId)}
                </div>
              </div>
              <div className="ds-stat-card border-l-4 border-l-emerald-500">
                <div className="ds-stat-label">{t.fixedAssets.nbv}</div>
                <div className="ds-stat-value text-emerald-400">
                  {fmt(selectedFaDetail.asset.netBookValue, selectedFaDetail.asset.purchaseCostUomId)}
                </div>
              </div>
            </div>

            {/* Depreciation Schedule */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-400" />
                {isTr ? 'Doğrusal Amortisman İtfa Projeksiyonu' : 'Straight-Line Depreciation Schedule'}
              </h3>
              {selectedFaDetail.depreciationSchedule.length === 0 ? (
                <div className="ds-empty py-6 text-center text-slate-400 text-sm">
                  {isTr ? 'Maliyet girilmediği için itfa tablosu hesaplanamadı.' : 'Depreciation schedule could not be calculated because purchase cost is zero.'}
                </div>
              ) : (
                <div className="ds-card overflow-hidden">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{isTr ? 'Yıl' : 'Year'}</th>
                        <th className="ds-th">{isTr ? 'Takvim Yılı' : 'Calendar Year'}</th>
                        <th className="ds-th-right">{isTr ? 'Yıllık Amortisman' : 'Annual Depreciation'}</th>
                        <th className="ds-th-right">{isTr ? 'Kümülatif Amortisman' : 'Accumulated Depreciation'}</th>
                        <th className="ds-th-right">{isTr ? 'Kalan Defter Değeri' : 'Ending Book Value'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedFaDetail.depreciationSchedule.map(s => (
                        <tr key={s.yearNum} className="ds-tbody-row">
                          <td className="ds-td font-semibold text-white">{s.yearNum}. {isTr ? 'Yıl' : 'Year'}</td>
                          <td className="ds-td-muted">{s.calendarYear}</td>
                          <td className="ds-td-right text-rose-400">{fmt(s.depreciationAmount)}</td>
                          <td className="ds-td-right text-slate-300">{fmt(s.accumulatedDepreciation)}</td>
                          <td className="ds-td-right font-bold text-emerald-400">{fmt(s.endingBookValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowFaDetailModal(false)}
                className="ds-btn-secondary"
              >
                {tc.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 6: CREATE BUDGET                     */}
      {/* ========================================== */}
      {showCreateBgtModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 size={20} className="text-indigo-400" />
                {t.budgets.newBudget}
              </h2>
              <button
                onClick={() => setShowCreateBgtModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="ds-label">
                  {t.budgets.budgetType} *
                </label>
                <select
                  value={createBgtForm.budgetTypeId}
                  onChange={e => setCreateBgtForm({ ...createBgtForm, budgetTypeId: e.target.value })}
                  className="ds-select"
                >
                  {metadata?.budgetTypes.map(bType => (
                    <option key={bType.budgetTypeId} value={bType.budgetTypeId}>{bType.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {t.budgets.period}
                </label>
                <select
                  value={createBgtForm.customTimePeriodId || ''}
                  onChange={e => setCreateBgtForm({ ...createBgtForm, customTimePeriodId: e.target.value })}
                  className="ds-select"
                >
                  <option value="">{tc.select}</option>
                  {metadata?.customTimePeriods.map(p => (
                    <option key={p.customTimePeriodId} value={p.customTimePeriodId}>{p.periodName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {tc.description}
                </label>
                <input
                  type="text"
                  placeholder={isTr ? 'Örn: 2026 1. Çeyrek Operasyonel Bütçe' : 'e.g. 2026 Q1 Operating Budget'}
                  value={createBgtForm.comments || ''}
                  onChange={e => setCreateBgtForm({ ...createBgtForm, comments: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBgtModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Bütçeyi Oluştur' : 'Create Budget'}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-400" />
                  {t.budgets.detail}: {selectedBgtDetail.budget.budgetId} ({selectedBgtDetail.budget.budgetTypeDesc})
                </h2>
                <div className="text-xs text-slate-400 mt-1">
                  {selectedBgtDetail.budget.periodDesc} | {t.budgets.status}: {selectedBgtDetail.budget.statusDesc}
                </div>
              </div>
              <button
                onClick={() => setShowBgtDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Status Flow Buttons */}
            <div className="flex gap-2 items-center flex-wrap p-3 rounded-xl bg-slate-800/40 border border-slate-700/50">
              <span className="text-xs font-semibold text-slate-300">{t.budgets.updateStatus}:</span>
              <button
                onClick={() => handleSetBudgetStatus(selectedBgtDetail.budget.budgetId, 'BG_REVIEWED')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors cursor-pointer"
              >
                {isTr ? 'İncelemeye Al (Reviewed)' : 'Mark Reviewed'}
              </button>
              <button
                onClick={() => handleSetBudgetStatus(selectedBgtDetail.budget.budgetId, 'BG_APPROVED')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
              >
                {isTr ? 'Onayla (Approved)' : 'Approve'}
              </button>
              <button
                onClick={() => handleSetBudgetStatus(selectedBgtDetail.budget.budgetId, 'BG_REJECTED')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
              >
                {isTr ? 'Reddet (Rejected)' : 'Reject'}
              </button>
            </div>

            {/* Budget Items Header with Add Button */}
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Layers size={16} className="text-indigo-400" />
                {isTr ? 'Bütçe Kalemleri' : 'Budget Items'} ({selectedBgtDetail.items.length}) | {tc.total}: {fmt(selectedBgtDetail.budget.totalAmount)}
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
                className="ds-btn-primary py-1 px-2.5 text-xs flex items-center gap-1.5"
              >
                <Plus size={14} />
                {t.budgets.addItem}
              </button>
            </div>

            {/* Items Table */}
            {selectedBgtDetail.items.length === 0 ? (
              <div className="ds-empty py-6 text-center text-slate-400 text-sm">
                {isTr ? 'Bu bütçeye henüz kalem eklenmemiştir.' : 'No items have been added to this budget yet.'}
              </div>
            ) : (
              <div className="ds-card overflow-hidden">
                <table className="ds-table">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">#{isTr ? 'Sıra' : 'Seq'}</th>
                      <th className="ds-th">{isTr ? 'Kalem Türü' : 'Item Type'}</th>
                      <th className="ds-th">{t.budgets.purpose}</th>
                      <th className="ds-th-right">{tc.amount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBgtDetail.items.map(item => (
                      <tr key={item.budgetItemSeqId} className="ds-tbody-row">
                        <td className="ds-td font-semibold text-indigo-400">#{item.budgetItemSeqId}</td>
                        <td className="ds-td font-medium text-white">{item.budgetItemTypeDesc}</td>
                        <td className="ds-td-muted">{item.purpose || item.justification || '-'}</td>
                        <td className="ds-td-right font-bold text-emerald-400">
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowBgtDetailModal(false)}
                className="ds-btn-secondary"
              >
                {tc.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 8: ADD BUDGET ITEM                   */}
      {/* ========================================== */}
      {showAddBgtItemModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-indigo-400" />
                {t.budgets.addItem}
              </h2>
              <button
                onClick={() => setShowAddBgtItemModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBudgetItem} className="space-y-4">
              <div>
                <label className="ds-label">
                  {isTr ? 'Kalem Türü' : 'Item Type'}
                </label>
                <select
                  value={createBgtItemForm.budgetItemTypeId}
                  onChange={e => setCreateBgtItemForm({ ...createBgtItemForm, budgetItemTypeId: e.target.value })}
                  className="ds-select"
                >
                  {metadata?.budgetItemTypes.map(bItemType => (
                    <option key={bItemType.budgetItemTypeId} value={bItemType.budgetItemTypeId}>{bItemType.description}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {tc.amount} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={createBgtItemForm.amount}
                  onChange={e => setCreateBgtItemForm({ ...createBgtItemForm, amount: parseFloat(e.target.value) || 0 })}
                  className="ds-input font-mono"
                />
              </div>

              <div>
                <label className="ds-label">
                  {t.budgets.purpose}
                </label>
                <input
                  type="text"
                  placeholder={isTr ? 'Örn: Donanım Alımı' : 'e.g. Hardware Acquisition'}
                  value={createBgtItemForm.purpose || ''}
                  onChange={e => setCreateBgtItemForm({ ...createBgtItemForm, purpose: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBgtItemModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {isTr ? 'Kalemi Ekle' : 'Add Item'}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-400" />
                {t.agreements.newAgreement}
              </h2>
              <button
                onClick={() => setShowCreateAgrModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAgreement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {t.agreements.agreementId} ({isTr ? 'İsteğe Bağlı' : 'Optional'})
                  </label>
                  <input
                    type="text"
                    placeholder={isTr ? 'Otomatik veya örn: AGR-2026-01' : 'Auto or e.g. AGR-2026-01'}
                    value={createAgrForm.agreementId || ''}
                    onChange={e => setCreateAgrForm({ ...createAgrForm, agreementId: e.target.value })}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.agreements.type} *
                  </label>
                  <select
                    value={createAgrForm.agreementTypeId}
                    onChange={e => setCreateAgrForm({ ...createAgrForm, agreementTypeId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.agreementTypes.map(aType => (
                      <option key={aType.agreementTypeId} value={aType.agreementTypeId}>{aType.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {t.agreements.partyTo} *
                </label>
                <select
                  required
                  value={createAgrForm.partyIdTo}
                  onChange={e => setCreateAgrForm({ ...createAgrForm, partyIdTo: e.target.value })}
                  className="ds-select"
                >
                  <option value="">{tc.select}</option>
                  {metadata?.parties.map(p => (
                    <option key={p.partyId} value={p.partyId}>{p.partyName} ({p.partyId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {tc.description}
                </label>
                <input
                  type="text"
                  placeholder={isTr ? 'Örn: Yıllık Ürün Tedarik ve Dağıtım Anlaşması' : 'e.g. Annual Supply Agreement'}
                  value={createAgrForm.description || ''}
                  onChange={e => setCreateAgrForm({ ...createAgrForm, description: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAgrModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {tc.save}
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
        <div className="ds-overlay">
          <div className="ds-modal max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase size={20} className="text-indigo-400" />
                  {t.agreements.detail} #{selectedAgrDetail.agreement.agreementId}: {selectedAgrDetail.agreement.agreementTypeDesc}
                </h2>
                <div className="text-xs text-slate-400 mt-1">{selectedAgrDetail.agreement.description}</div>
              </div>
              <button
                onClick={() => setShowAgrDetailModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="ds-stat-card">
                <div className="ds-stat-label">{t.agreements.partyFrom}</div>
                <div className="text-base font-bold text-white mt-1">
                  {selectedAgrDetail.agreement.partyFromDesc || selectedAgrDetail.agreement.partyIdFrom}
                </div>
              </div>
              <div className="ds-stat-card">
                <div className="ds-stat-label">{t.agreements.partyTo}</div>
                <div className="text-base font-bold text-white mt-1">
                  {selectedAgrDetail.agreement.partyToDesc || selectedAgrDetail.agreement.partyIdTo}
                </div>
              </div>
            </div>

            {selectedAgrDetail.agreement.textData && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">{t.agreements.textData}:</div>
                <div className="ds-card p-4 whitespace-pre-wrap text-sm text-slate-300">
                  {selectedAgrDetail.agreement.textData}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAgrDetailModal(false)}
                className="ds-btn-secondary"
              >
                {tc.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 11: EDIT BILLING ACCOUNT             */}
      {/* ========================================== */}
      {showEditBaModal && editingBa && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={20} className="text-sky-400" />
                {t.billingAccounts.editAccount}: #{editingBa.billingAccountId}
              </h2>
              <button
                onClick={() => setShowEditBaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBillingAccount} className="space-y-4">
              <div>
                <label className="ds-label">
                  {t.billingAccounts.limit} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editingBa.accountLimit}
                  onChange={e => setEditingBa({ ...editingBa, accountLimit: parseFloat(e.target.value) || 0 })}
                  className="ds-input font-mono"
                />
              </div>

              <div>
                <label className="ds-label">
                  {tc.description}
                </label>
                <input
                  type="text"
                  value={editingBa.description || ''}
                  onChange={e => setEditingBa({ ...editingBa, description: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBaModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 12: EDIT FIXED ASSET                 */}
      {/* ========================================== */}
      {showEditFaModal && editingFa && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={20} className="text-sky-400" />
                {t.fixedAssets.editAsset}: #{editingFa.fixedAssetId}
              </h2>
              <button
                onClick={() => setShowEditFaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateFixedAsset} className="space-y-4">
              <div>
                <label className="ds-label">
                  {t.fixedAssets.name} *
                </label>
                <input
                  type="text"
                  required
                  value={editingFa.fixedAssetName}
                  onChange={e => setEditingFa({ ...editingFa, fixedAssetName: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.cost}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingFa.purchaseCost}
                    onChange={e => setEditingFa({ ...editingFa, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.fixedAssets.salvageValue}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingFa.salvageValue}
                    onChange={e => setEditingFa({ ...editingFa, salvageValue: parseFloat(e.target.value) || 0 })}
                    className="ds-input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {t.fixedAssets.serialNumber}
                </label>
                <input
                  type="text"
                  value={editingFa.serialNumber || ''}
                  onChange={e => setEditingFa({ ...editingFa, serialNumber: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditFaModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="ds-btn-primary flex items-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================== */}
      {/* FIXED ASSET LIFECYCLE MODAL                */}
      {/* ========================================== */}
      <FixedAssetLifecycleModal
        asset={selectedLifecycleAsset}
        isOpen={showLifecycleModal}
        onClose={() => {
          setShowLifecycleModal(false);
          setSelectedLifecycleAsset(null);
        }}
        onAssetUpdated={() => {
          fetchFixedAssets();
        }}
      />

      {/* ========================================== */}
      {/* BATCH DEPRECIATION RUN MODAL               */}
      {/* ========================================== */}
      {showBatchDepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="ds-card border-slate-700 w-full max-w-xl bg-slate-900 shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap size={20} className="text-amber-400" />
                {translations.fixedAssetLifecycle.depreciation.batchTitle}
              </h3>
              <button
                onClick={() => {
                  setShowBatchDepModal(false);
                  setBatchResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {!batchResult ? (
              <form onSubmit={handleRunBatchDepreciation} className="space-y-4">
                <p className="text-sm text-slate-300">
                  {translations.fixedAssetLifecycle.depreciation.batchDescription}
                </p>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{translations.fixedAssetLifecycle.depreciation.batchConfirm}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{isTr ? 'Şirket / Organizasyon Kodu' : 'Company Org ID'}</label>
                    <input
                      type="text"
                      required
                      value={batchOrgId}
                      onChange={e => setBatchOrgId(e.target.value)}
                      className="ds-input font-mono"
                      placeholder="Company"
                    />
                  </div>
                  <div>
                    <label className="ds-label">{t.fixedAssets.type} ({isTr ? 'Tümü için boş bırakın' : 'Leave empty for all'})</label>
                    <select
                      value={batchAssetTypeId}
                      onChange={e => setBatchAssetTypeId(e.target.value)}
                      className="ds-select"
                    >
                      <option value="">{t.fixedAssets.allTypes}</option>
                      {metadata?.fixedAssetTypes.map(fat => (
                        <option key={fat.fixedAssetTypeId} value={fat.fixedAssetTypeId}>
                          {fat.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBatchDepModal(false)}
                    className="ds-btn-secondary"
                  >
                    {tc.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={batchSubmitting}
                    className="ds-btn-primary bg-amber-600 hover:bg-amber-500 text-white border-amber-500/50 flex items-center gap-2"
                  >
                    {batchSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} />
                    )}
                    {translations.fixedAssetLifecycle.depreciation.runBatchBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold">{translations.fixedAssetLifecycle.depreciation.batchSuccess}</div>
                    <div className="text-xs text-emerald-400/80">
                      {batchResult.processedCount} {isTr ? 'adet varlık için toplam ' : 'assets depreciated for a total of '}
                      <span className="font-bold">{fmt(batchResult.totalBatchDepreciation, 'USD')}</span>
                    </div>
                  </div>
                </div>

                {batchResult.createdTransactions?.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {isTr ? 'Oluşturulan Yevmiye Fişleri' : 'Created Journal Entries'}
                    </div>
                    <div className="max-h-60 overflow-y-auto ds-card overflow-hidden border-slate-800">
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">Asset ID</th>
                            <th className="ds-th">Varlık Adı</th>
                            <th className="ds-th">Yevmiye No</th>
                            <th className="ds-th-right">Tutar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batchResult.createdTransactions.map((tr, idx) => (
                            <tr key={idx} className="ds-tbody-row">
                              <td className="ds-td font-mono">{tr.fixedAssetId}</td>
                              <td className="ds-td text-white">{tr.fixedAssetName}</td>
                              <td className="ds-td font-mono text-indigo-400 font-bold">#{tr.acctgTransId}</td>
                              <td className="ds-td-right font-mono text-rose-400 font-bold">{fmt(tr.depreciationAmount, 'USD')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setShowBatchDepModal(false);
                      setBatchResult(null);
                    }}
                    className="ds-btn-primary"
                  >
                    {tc.close}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedAccounting;
