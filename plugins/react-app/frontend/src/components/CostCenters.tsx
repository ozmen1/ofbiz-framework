import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, Plus, RefreshCw, Layers, Trash2, CheckCircle2, 
  AlertCircle, DollarSign, PieChart, Building2, ArrowRight
} from 'lucide-react';
import { 
  api, 
  GlAccountCategoryItem, 
  GlAccountCategoryMemberItem, 
  CostCenterBalanceReport,
  GlAccountItem
} from '../services/api';
import { useTranslation } from '../i18n';

export const CostCenters: React.FC = () => {
  const { translations, locale } = useTranslation();
  
  // State
  const [activeTab, setActiveTab] = useState<'management' | 'balances'>('management');
  const [categories, setCategories] = useState<GlAccountCategoryItem[]>([]);
  const [categoryTypes, setCategoryTypes] = useState<{ glAccountCategoryTypeId: string; description: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [members, setMembers] = useState<GlAccountCategoryMemberItem[]>([]);
  const [balanceReports, setBalanceReports] = useState<CostCenterBalanceReport[]>([]);
  const [allGlAccounts, setAllGlAccounts] = useState<GlAccountItem[]>([]);

  // Loading & notification states
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Modals
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatTypeId, setNewCatTypeId] = useState('COST_CENTER');
  const [submittingCat, setSubmittingCat] = useState(false);

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedGlAccountId, setSelectedGlAccountId] = useState('');
  const [allocPercentage, setAllocPercentage] = useState<number>(100);
  const [submittingAccount, setSubmittingAccount] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const showSuccessMsg = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  // Load Categories & GL Accounts
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, glRes] = await Promise.all([
        api.getGlAccountCategories({ search }),
        api.getGlAccounts({ viewSize: 500 })
      ]);
      setCategories(catRes.categories || []);
      setCategoryTypes(catRes.types || []);
      setAllGlAccounts(glRes.accounts || []);
      
      // Select first category by default if none selected
      if (catRes.categories?.length > 0 && (!selectedCategoryId || !catRes.categories.some(c => c.glAccountCategoryId === selectedCategoryId))) {
        setSelectedCategoryId(catRes.categories[0].glAccountCategoryId);
      }
    } catch (err: any) {
      console.error('Failed to load cost center categories:', err);
      setError(err.message || 'Error loading cost center data');
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategoryId]);

  // Load Members when selected category changes
  const loadMembers = useCallback(async (catId: string) => {
    setMembersLoading(true);
    try {
      const res = await api.getGlAccountCategoryMembers(catId);
      setMembers(res.members || []);
    } catch (err: any) {
      console.error('Failed to load category members:', err);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // Load Balance Reports
  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await api.getCostCenterBalances({ year: selectedYear });
      setBalanceReports(res.costCenters || []);
    } catch (err: any) {
      console.error('Failed to load cost center balances:', err);
    } finally {
      setBalancesLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (selectedCategoryId) {
      loadMembers(selectedCategoryId);
    } else {
      setMembers([]);
    }
  }, [selectedCategoryId, loadMembers]);

  useEffect(() => {
    if (activeTab === 'balances') {
      loadBalances();
    }
  }, [activeTab, loadBalances]);

  // Create Category Handler
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatDesc.trim()) return;
    setSubmittingCat(true);
    try {
      const res = await api.createGlAccountCategory({
        glAccountCategoryId: newCatId.trim() || undefined,
        description: newCatDesc.trim(),
        glAccountCategoryTypeId: newCatTypeId,
      });
      showSuccessMsg(translations.costCenters.successCreated);
      setShowCreateCategoryModal(false);
      setNewCatId('');
      setNewCatDesc('');
      await loadCategories();
      if (res.glAccountCategoryId) {
        setSelectedCategoryId(res.glAccountCategoryId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setSubmittingCat(false);
    }
  };

  // Add Account to Category Handler
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !selectedGlAccountId) return;
    setSubmittingAccount(true);
    try {
      await api.addGlAccountToCategory({
        glAccountCategoryId: selectedCategoryId,
        glAccountId: selectedGlAccountId,
        amountPercentage: allocPercentage,
      });
      showSuccessMsg(translations.costCenters.successAccountAdded);
      setShowAddAccountModal(false);
      setSelectedGlAccountId('');
      setAllocPercentage(100);
      await loadMembers(selectedCategoryId);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
    } finally {
      setSubmittingAccount(false);
    }
  };

  // Remove Account from Category Handler
  const handleRemoveAccount = async (glAccountId: string, fromDate?: string | null) => {
    if (!selectedCategoryId) return;
    if (!window.confirm(translations.costCenters.confirmRemove)) return;
    try {
      await api.removeGlAccountFromCategory(selectedCategoryId, glAccountId, fromDate || '');
      showSuccessMsg(translations.costCenters.successAccountRemoved);
      await loadMembers(selectedCategoryId);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to remove account');
    }
  };

  // Calculated Stats
  const totalCenters = categories.length;
  const totalAssignedAccounts = categories.reduce((sum, c) => sum + (c.memberCount || 0), 0);
  const totalAllocDebit = balanceReports.reduce((sum, r) => sum + (r.totalDebit || 0), 0);
  const totalNetExpense = balanceReports.reduce((sum, r) => sum + (r.netBalance || 0), 0);

  const selectedCategory = categories.find(c => c.glAccountCategoryId === selectedCategoryId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="text-indigo-400" size={26} />
            {translations.costCenters.title}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {translations.costCenters.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadCategories();
              if (activeTab === 'balances') loadBalances();
            }}
            className="ds-btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{translations.common.refresh}</span>
          </button>
          <button
            onClick={() => setShowCreateCategoryModal(true)}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span>{translations.costCenters.newCategory}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-400">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">&times;</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400">
          <CheckCircle2 size={20} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ds-stat-card border-l-4 border-l-indigo-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.costCenters.stats.totalCenters}</span>
            <Building2 className="text-indigo-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalCenters}</p>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.costCenters.stats.assignedAccounts}</span>
            <Layers className="text-blue-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{totalAssignedAccounts}</p>
        </div>

        <div className="ds-stat-card border-l-4 border-l-amber-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.costCenters.stats.totalAllocDebit}</span>
            <DollarSign className="text-amber-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalAllocDebit)}</p>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 uppercase font-medium">{translations.costCenters.stats.netExpense}</span>
            <PieChart className="text-emerald-400" size={18} />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalNetExpense)}</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('management')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'management'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 size={16} />
          <span>{translations.costCenters.title} & {translations.costCenters.memberAccounts}</span>
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'balances'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart size={16} />
          <span>{translations.costCenters.balance} {translations.reports.title}</span>
        </button>
      </div>

      {/* TAB 1: Category & Member Accounts Management */}
      {activeTab === 'management' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Categories Master List (Left Column) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="ds-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
                  {translations.costCenters.categoryName} ({categories.length})
                </h2>
                <button
                  onClick={() => setShowCreateCategoryModal(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <Plus size={14} />
                  <span>{translations.costCenters.newCategory}</span>
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder={translations.common.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ds-input text-xs mb-3 w-full"
              />

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="ds-spinner"></div>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  {translations.costCenters.noCostCenters}
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {categories.map((cat) => {
                    const isSelected = cat.glAccountCategoryId === selectedCategoryId;
                    return (
                      <div
                        key={cat.glAccountCategoryId}
                        onClick={() => setSelectedCategoryId(cat.glAccountCategoryId)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-600/10 border-indigo-500/50 shadow-sm'
                            : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-indigo-400">
                              {cat.glAccountCategoryId}
                            </span>
                            <span className="ds-badge ds-badge-slate text-[10px]">
                              {cat.glAccountCategoryTypeId}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-white truncate mt-1">
                            {cat.description || cat.glAccountCategoryId}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="ds-badge ds-badge-blue text-xs">
                            {cat.memberCount} {translations.costCenters.memberAccounts}
                          </span>
                          <ArrowRight size={14} className={isSelected ? 'text-indigo-400' : 'text-slate-600'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Members Detail (Right Column) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="ds-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-white">
                      {selectedCategory?.description || selectedCategoryId || '—'}
                    </h2>
                    {selectedCategory && (
                      <span className="ds-badge ds-badge-slate text-xs font-mono">
                        {selectedCategory.glAccountCategoryId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {translations.costCenters.memberAccounts} & {translations.costCenters.allocPercent}
                  </p>
                </div>
                {selectedCategoryId && (
                  <button
                    onClick={() => setShowAddAccountModal(true)}
                    className="ds-btn-primary flex items-center gap-1 text-xs py-1.5 px-3"
                  >
                    <Plus size={14} />
                    <span>{translations.costCenters.addAccount}</span>
                  </button>
                )}
              </div>

              {membersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="ds-spinner"></div>
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Layers className="mx-auto text-slate-600 mb-2" size={32} />
                  <p>{translations.costCenters.memberAccounts} bulunamadı.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {translations.costCenters.addAccount} butonuna tıklayarak bu masraf merkezine hesap bağlayabilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{translations.chartOfAccounts.accountName}</th>
                        <th className="ds-th text-center">{translations.costCenters.allocPercent}</th>
                        <th className="ds-th">{translations.common.date}</th>
                        <th className="ds-th text-right">{translations.common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={`${m.glAccountId}_${m.fromDate}`} className="ds-tbody-row">
                          <td className="ds-td">
                            <div className="font-mono text-xs font-semibold text-indigo-400">
                              {m.accountCode || m.glAccountId}
                            </div>
                            <div className="text-sm text-slate-200">
                              {m.accountName || m.glAccountId}
                            </div>
                          </td>
                          <td className="ds-td text-center">
                            <span className="ds-badge ds-badge-indigo font-bold text-xs">
                              %{m.amountPercentage}
                            </span>
                          </td>
                          <td className="ds-td text-xs text-slate-400 font-mono">
                            <div>{m.fromDate ? m.fromDate.split(' ')[0] : '—'}</div>
                            {m.thruDate && <div className="text-slate-500">→ {m.thruDate.split(' ')[0]}</div>}
                          </td>
                          <td className="ds-td text-right">
                            <button
                              onClick={() => handleRemoveAccount(m.glAccountId, m.fromDate)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                              title={translations.costCenters.removeAccount}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Cost Center Balances Report */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          <div className="ds-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-slate-300 whitespace-nowrap">
                {translations.reports.fiscalYear}:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="ds-select text-sm py-1.5 px-3 max-w-[140px]"
              >
                {['2027', '2026', '2025', '2024', '2023'].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-400">
              {translations.costCenters.stats.totalAllocDebit}: <span className="text-indigo-400 font-semibold">{formatCurrency(totalAllocDebit)}</span>
            </div>
          </div>

          {balancesLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="ds-spinner"></div>
            </div>
          ) : balanceReports.length === 0 ? (
            <div className="ds-card text-center py-16 text-slate-400 text-sm">
              <Building2 className="mx-auto text-slate-600 mb-2" size={36} />
              <p>{translations.costCenters.noCostCenters}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {balanceReports.map((report) => (
                <div key={report.glAccountCategoryId} className="ds-card p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-base">
                          {report.description || report.glAccountCategoryId}
                        </h3>
                        <span className="ds-badge ds-badge-slate text-xs font-mono">
                          {report.glAccountCategoryId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {report.accounts.length} {translations.costCenters.memberAccounts}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">{translations.costCenters.debit}</span>
                        <span className="font-medium text-amber-400 font-mono">{formatCurrency(report.totalDebit)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">{translations.costCenters.credit}</span>
                        <span className="font-medium text-blue-400 font-mono">{formatCurrency(report.totalCredit)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">{translations.costCenters.balance}</span>
                        <span className="font-bold text-emerald-400 font-mono">{formatCurrency(report.netBalance)}</span>
                      </div>
                    </div>
                  </div>

                  {report.accounts.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="ds-table text-xs">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">{translations.chartOfAccounts.accountName}</th>
                            <th className="ds-th text-center">{translations.costCenters.allocPercent}</th>
                            <th className="ds-th text-right">{translations.costCenters.debit}</th>
                            <th className="ds-th text-right">{translations.costCenters.credit}</th>
                            <th className="ds-th text-right">{translations.costCenters.balance}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.accounts.map((acc) => (
                            <tr key={acc.glAccountId} className="ds-tbody-row">
                              <td className="ds-td font-medium text-slate-200">
                                <span className="font-mono text-indigo-400 mr-2">{acc.accountCode || acc.glAccountId}</span>
                                {acc.accountName}
                              </td>
                              <td className="ds-td text-center">
                                <span className="ds-badge ds-badge-indigo text-[10px]">
                                  %{acc.amountPercentage}
                                </span>
                              </td>
                              <td className="ds-td text-right font-mono text-slate-300">
                                {formatCurrency(acc.debit)}
                              </td>
                              <td className="ds-td text-right font-mono text-slate-300">
                                {formatCurrency(acc.credit)}
                              </td>
                              <td className="ds-td text-right font-mono font-semibold text-emerald-400">
                                {formatCurrency(acc.balance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showCreateCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="ds-card p-6 w-full max-w-md shadow-2xl border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">
              {translations.costCenters.newCategory}
            </h2>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="ds-label">
                  {translations.costCenters.categoryName} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Örn: Pazarlama Masrafları, Ar-Ge Departmanı..."
                  className="ds-input"
                />
              </div>

              <div>
                <label className="ds-label">
                  ID (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={newCatId}
                  onChange={(e) => setNewCatId(e.target.value)}
                  placeholder="Örn: CC_MKTG_01"
                  className="ds-input font-mono"
                />
              </div>

              <div>
                <label className="ds-label">
                  {translations.costCenters.categoryType}
                </label>
                <select
                  value={newCatTypeId}
                  onChange={(e) => setNewCatTypeId(e.target.value)}
                  className="ds-select"
                >
                  {categoryTypes.length > 0 ? (
                    categoryTypes.map(t => (
                      <option key={t.glAccountCategoryTypeId} value={t.glAccountCategoryTypeId}>
                        {t.description || t.glAccountCategoryTypeId}
                      </option>
                    ))
                  ) : (
                    <option value="COST_CENTER">COST_CENTER</option>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateCategoryModal(false)}
                  className="ds-btn-secondary"
                  disabled={submittingCat}
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  className="ds-btn-primary"
                  disabled={submittingCat}
                >
                  {submittingCat ? translations.common.loading : translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ACCOUNT TO CATEGORY MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="ds-card p-6 w-full max-w-lg shadow-2xl border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">
              {translations.costCenters.addAccount}
            </h2>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="ds-label">
                  {translations.chartOfAccounts.accountName} <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedGlAccountId}
                  onChange={(e) => setSelectedGlAccountId(e.target.value)}
                  className="ds-select font-mono text-xs"
                >
                  <option value="">{translations.common.select}</option>
                  {allGlAccounts.map(acc => (
                    <option key={acc.glAccountId} value={acc.glAccountId}>
                      {acc.accountCode || acc.glAccountId} — {acc.accountName} ({acc.glAccountClassId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {translations.costCenters.allocPercent} (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={allocPercentage}
                    onChange={(e) => setAllocPercentage(Number(e.target.value))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="font-mono font-bold text-white text-sm w-12 text-right">
                    %{allocPercentage}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="ds-btn-secondary"
                  disabled={submittingAccount}
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  className="ds-btn-primary"
                  disabled={submittingAccount}
                >
                  {submittingAccount ? translations.common.loading : translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCenters;
