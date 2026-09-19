import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, Plus, Edit3, Eye, CheckCircle2, 
  X, AlertCircle, BookOpen, Layers,
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
import { useTranslation } from '../i18n';

const getClassBadgeClass = (classId: string) => {
  const c = classId.toUpperCase();
  if (c.includes('ASSET') || c.includes('CASH')) {
    return 'ds-badge-green';
  }
  if (c.includes('LIABILITY')) {
    return 'ds-badge-yellow';
  }
  if (c.includes('EQUITY')) {
    return 'ds-badge-blue';
  }
  if (c.includes('REVENUE') || c.includes('INCOME')) {
    return 'ds-badge-purple';
  }
  if (c.includes('EXPENSE')) {
    return 'ds-badge-red';
  }
  return 'ds-badge-slate';
};

type QuickClassFilter = 'ALL' | 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface ChartOfAccountsProps {
  onSelectTransaction?: (acctgTransId: string) => void;
}

export const ChartOfAccounts: React.FC<ChartOfAccountsProps> = ({ onSelectTransaction }) => {
  const { translations, locale } = useTranslation();
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
      .catch(err => setError(err.message || (locale === 'tr' ? 'Hesap planı yüklenemedi.' : 'Could not load chart of accounts.')))
      .finally(() => setLoading(false));
  }, [viewIndex, viewSize, searchTerm, classFilter, assignedOnly, locale]);

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
      setError(err.message || (locale === 'tr' ? 'Hesap detayı yüklenemedi.' : 'Could not load account details.'));
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
      setSuccessMsg(targetAssign === 'Y' 
        ? (locale === 'tr' ? 'Hesap şirkete atandı.' : 'Account assigned to organization.') 
        : (locale === 'tr' ? 'Hesap şirket ataması kaldırıldı.' : 'Account organization assignment removed.')
      );
      setTimeout(() => setSuccessMsg(null), 3000);
      
      // Update local state
      setAccounts(prev => prev.map(a => a.glAccountId === glAccountId ? { ...a, isAssigned: targetAssign === 'Y' } : a));
      if (selectedAccountDetail && selectedAccountDetail.glAccountId === glAccountId) {
        setSelectedAccountDetail(prev => prev ? { ...prev, isAssigned: targetAssign === 'Y' } : null);
      }
    } catch (err: any) {
      alert((locale === 'tr' ? 'Atama durumu değiştirilemedi: ' : 'Failed to toggle assignment: ') + err.message);
    }
  };

  // Submit Create Account
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await api.createGlAccount(createForm);
      setSuccessMsg(res._EVENT_MESSAGE_ || (locale === 'tr' ? 'Yeni hesap başarıyla oluşturuldu.' : 'Account created successfully.'));
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
      alert((locale === 'tr' ? 'Hesap oluşturulurken hata: ' : 'Error creating account: ') + err.message);
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
      setSuccessMsg(res._EVENT_MESSAGE_ || (locale === 'tr' ? 'Hesap güncellendi.' : 'Account updated successfully.'));
      setTimeout(() => setSuccessMsg(null), 3500);
      setShowEditModal(false);
      loadAccounts();
    } catch (err: any) {
      alert((locale === 'tr' ? 'Hesap güncellenirken hata: ' : 'Error updating account: ') + err.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Stats calculation
  const totalAssignedCount = accounts.filter(a => a.isAssigned).length;
  const assetCount = accounts.filter(a => a.glAccountClassId.includes('ASSET')).length;
  const expenseCount = accounts.filter(a => a.glAccountClassId.includes('EXPENSE')).length;

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto">
      
      {/* Top Header */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">
            <BookOpen size={26} className="text-indigo-400" />
            {translations.chartOfAccounts.title}
          </h1>
          <p className="ds-page-subtitle">
            {translations.chartOfAccounts.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadAccounts} 
            className="ds-btn-secondary"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {translations.common.refresh}
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="ds-btn-primary"
          >
            <Plus size={18} />
            {translations.chartOfAccounts.newAccount}
          </button>
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
            <Layers size={16} /> {translations.chartOfAccounts.registeredAccounts}
          </div>
          <div className="ds-stat-value">{totalCount}</div>
          <div className="ds-stat-sub">{translations.common.all}</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <div className="ds-stat-label flex items-center gap-2 text-blue-400">
            <Building size={16} /> {translations.chartOfAccounts.assignedToCompany}
          </div>
          <div className="ds-stat-value text-blue-400">{totalAssignedCount}</div>
          <div className="ds-stat-sub">{translations.chartOfAccounts.activeUsedAccounts}</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="ds-stat-label flex items-center gap-2 text-emerald-400">
            <ArrowUpRight size={16} /> {translations.chartOfAccounts.assetAccounts}
          </div>
          <div className="ds-stat-value text-emerald-400">{assetCount}</div>
          <div className="ds-stat-sub">{translations.common.details}</div>
        </div>

        <div className="ds-stat-card border-l-4 border-l-red-500">
          <div className="ds-stat-label flex items-center gap-2 text-red-400">
            <ArrowDownLeft size={16} /> {translations.chartOfAccounts.expenseAccounts}
          </div>
          <div className="ds-stat-value text-red-400">{expenseCount}</div>
          <div className="ds-stat-sub">{translations.common.details}</div>
        </div>
      </div>

      {/* Filter Bar & Class Tabs */}
      <div className="ds-card p-5 space-y-4">
        {/* Class Pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'ALL', label: translations.chartOfAccounts.allAccounts },
            { id: 'ASSET', label: translations.chartOfAccounts.assetAccounts },
            { id: 'LIABILITY', label: translations.chartOfAccounts.liabilityAccounts },
            { id: 'EQUITY', label: translations.chartOfAccounts.equityAccounts },
            { id: 'REVENUE', label: translations.chartOfAccounts.revenueAccounts },
            { id: 'EXPENSE', label: translations.chartOfAccounts.expenseAccounts }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setClassFilter(tab.id as QuickClassFilter); setViewIndex(0); }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                classFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Checkbox */}
        <div className="flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder={translations.chartOfAccounts.searchPlaceholder}
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setViewIndex(0); }}
              className="ds-input pl-10"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
            <input 
              type="checkbox"
              checked={assignedOnly}
              onChange={e => { setAssignedOnly(e.target.checked); setViewIndex(0); }}
              className="accent-indigo-500 rounded"
            />
            <span>{translations.chartOfAccounts.onlyAssignedToCompany}</span>
          </label>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="ds-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th">{translations.chartOfAccounts.accountCode}</th>
                <th className="ds-th">{translations.chartOfAccounts.accountName}</th>
                <th className="ds-th">{translations.chartOfAccounts.accountClass}</th>
                <th className="ds-th">{translations.chartOfAccounts.accountType}</th>
                <th className="ds-th">{translations.chartOfAccounts.parentAccount}</th>
                <th className="ds-th text-center">{translations.chartOfAccounts.companyStatus}</th>
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
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <Filter size={32} className="mx-auto mb-3 opacity-40" />
                    <p>{translations.common.noData}</p>
                  </td>
                </tr>
              ) : (
                accounts.map(acc => {
                  return (
                    <tr key={acc.glAccountId} className="ds-tbody-row">
                      <td className="ds-td-mono font-bold">
                        {acc.accountCode}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-white">{acc.accountName}</div>
                        {acc.description && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {acc.description}
                          </div>
                        )}
                      </td>
                      <td className="ds-td">
                        <span className={`ds-badge ${getClassBadgeClass(acc.glAccountClassId)}`}>
                          {acc.glAccountClassDesc || acc.glAccountClassId}
                        </span>
                      </td>
                      <td className="ds-td-muted">
                        {acc.glAccountTypeDesc || '-'}
                      </td>
                      <td className="ds-td-muted font-mono text-xs">
                        {acc.parentGlAccountId || '-'}
                      </td>
                      <td className="ds-td text-center">
                        <button
                          onClick={() => handleToggleAssign(acc.glAccountId, acc.isAssigned)}
                          title={translations.chartOfAccounts.assignToggleTitle}
                          className={`inline-flex items-center gap-1.5 ds-badge cursor-pointer ${
                            acc.isAssigned ? 'ds-badge-green' : 'ds-badge-slate'
                          }`}
                        >
                          {acc.isAssigned ? (
                            <>
                              <CheckCircle2 size={12} />
                              {translations.chartOfAccounts.assignedActive}
                            </>
                          ) : (
                            <span>{translations.chartOfAccounts.unassignedIdle}</span>
                          )}
                        </button>
                      </td>
                      <td className="ds-td-right">
                        <div className="inline-flex gap-2 items-center justify-end">
                          <button
                            onClick={() => handleOpenDetail(acc.glAccountId)}
                            className="ds-btn-secondary px-2.5 py-1 text-xs"
                            title={translations.chartOfAccounts.inspect}
                          >
                            <Eye size={14} />
                            {translations.chartOfAccounts.inspect}
                          </button>
                          <button
                            onClick={() => handleOpenEdit(acc)}
                            className="ds-btn-secondary px-2.5 py-1 text-xs"
                            title={translations.common.edit}
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
        <div className="flex justify-between items-center px-5 py-4 border-t border-slate-700/50 bg-slate-800/30">
          <span className="text-xs text-slate-400">
            {translations.common.total} <strong>{totalCount}</strong> {translations.chartOfAccounts.registeredAccounts.toLowerCase()} ({translations.common.page} {viewIndex + 1} / {Math.max(1, Math.ceil(totalCount / viewSize))})
          </span>
          <div className="flex gap-2">
            <button
              disabled={viewIndex === 0}
              onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {translations.common.previous}
            </button>
            <button
              disabled={(viewIndex + 1) * viewSize >= totalCount}
              onClick={() => setViewIndex(prev => prev + 1)}
              className="ds-btn-secondary px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {translations.common.next}
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus size={20} className="text-indigo-400" />
                {translations.chartOfAccounts.newAccount}
              </h2>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.chartOfAccounts.accountCode} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: 102100"
                    value={createForm.accountCode}
                    onChange={e => setCreateForm({ ...createForm, accountCode: e.target.value })}
                    className="ds-input font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="ds-label">
                    {translations.chartOfAccounts.accountName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={locale === 'tr' ? 'Örn: Garanti Bankası Vadesiz TL' : 'e.g. Operating Checking Account'}
                    value={createForm.accountName}
                    onChange={e => setCreateForm({ ...createForm, accountName: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.chartOfAccounts.accountClass} *
                  </label>
                  <select
                    value={createForm.glAccountClassId}
                    onChange={e => setCreateForm({ ...createForm, glAccountClassId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.glAccountClasses?.map(c => (
                      <option key={c.glAccountClassId} value={c.glAccountClassId}>
                        {c.description || c.glAccountClassId}
                      </option>
                    )) || (
                      <>
                        <option value="CURRENT_ASSET">Current Asset</option>
                        <option value="CASH_EQUIVALENT">Cash and Equivalent</option>
                        <option value="LONGTERM_ASSET">Long Term Asset</option>
                        <option value="CURRENT_LIABILITY">Current Liability</option>
                        <option value="LONGTERM_LIABILITY">Long Term Liability</option>
                        <option value="EQUITY">Equity</option>
                        <option value="REVENUE">Revenue</option>
                        <option value="EXPENSE">Expense</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.chartOfAccounts.accountType}
                  </label>
                  <select
                    value={createForm.glAccountTypeId}
                    onChange={e => setCreateForm({ ...createForm, glAccountTypeId: e.target.value })}
                    className="ds-select"
                  >
                    <option value="_NA_">-- {translations.common.select} / _NA_ --</option>
                    {metadata?.glAccountTypes?.map(t => (
                      <option key={t.glAccountTypeId} value={t.glAccountTypeId}>
                        {t.description || t.glAccountTypeId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="ds-label">
                  {translations.chartOfAccounts.parentAccount}
                </label>
                <select
                  value={createForm.parentGlAccountId}
                  onChange={e => setCreateForm({ ...createForm, parentGlAccountId: e.target.value })}
                  className="ds-select"
                >
                  <option value="">-- {translations.common.none} --</option>
                  {metadata?.accounts?.map(a => (
                    <option key={a.glAccountId} value={a.glAccountId}>
                      {a.accountCode} - {a.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {translations.common.description}
                </label>
                <textarea
                  rows={3}
                  placeholder={locale === 'tr' ? 'Hesabın muhasebe tanımı ve kullanım amacı...' : 'Account accounting definition and purpose...'}
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  className="ds-input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="ds-btn-primary"
                >
                  {createLoading ? <div className="ds-spinner-sm" /> : <CheckCircle2 size={16} />}
                  {translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={20} className="text-indigo-400" />
                {translations.chartOfAccounts.editAccountTitle}: {editForm.glAccountId}
              </h2>
              <button 
                onClick={() => setShowEditModal(false)} 
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="ds-label">
                  {translations.chartOfAccounts.accountName} *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.accountName}
                  onChange={e => setEditForm({ ...editForm, accountName: e.target.value })}
                  className="ds-input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {translations.chartOfAccounts.accountClass}
                  </label>
                  <select
                    value={editForm.glAccountClassId}
                    onChange={e => setEditForm({ ...editForm, glAccountClassId: e.target.value })}
                    className="ds-select"
                  >
                    {metadata?.glAccountClasses?.map(c => (
                      <option key={c.glAccountClassId} value={c.glAccountClassId}>
                        {c.description || c.glAccountClassId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="ds-label">
                    {translations.chartOfAccounts.accountType}
                  </label>
                  <select
                    value={editForm.glAccountTypeId}
                    onChange={e => setEditForm({ ...editForm, glAccountTypeId: e.target.value })}
                    className="ds-select"
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
                <label className="ds-label">
                  {translations.chartOfAccounts.parentAccount}
                </label>
                <select
                  value={editForm.parentGlAccountId}
                  onChange={e => setEditForm({ ...editForm, parentGlAccountId: e.target.value })}
                  className="ds-select"
                >
                  <option value="">-- {translations.common.none} --</option>
                  {metadata?.accounts?.filter(a => a.glAccountId !== editForm.glAccountId).map(a => (
                    <option key={a.glAccountId} value={a.glAccountId}>
                      {a.accountCode} - {a.accountName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="ds-label">
                  {translations.common.description}
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="ds-input resize-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editForm.isAssigned === 'Y'}
                    onChange={e => setEditForm({ ...editForm, isAssigned: e.target.checked ? 'Y' : 'N' })}
                    className="accent-indigo-500 rounded"
                  />
                  <span>{translations.chartOfAccounts.useAsActiveInCompany}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="ds-btn-primary"
                >
                  {editLoading ? <div className="ds-spinner-sm" /> : <CheckCircle2 size={16} />}
                  {translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL & RECENT ENTRIES MODAL */}
      {showDetailModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-indigo-400" />
                  {translations.chartOfAccounts.summaryAndEntries}
                </h2>
                {selectedAccountDetail && (
                  <div className="text-xs text-slate-400 mt-1">
                    {selectedAccountDetail.accountCode} - {selectedAccountDetail.accountName}
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
                <p className="text-slate-400 text-sm">{translations.common.loading}</p>
              </div>
            ) : selectedAccountDetail ? (
              <div className="space-y-5">
                
                {/* Balance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="ds-stat-card border-l-4 border-l-slate-500">
                    <div className="ds-stat-label">{translations.chartOfAccounts.normalSideDirection}</div>
                    <div className="ds-stat-value text-base mt-1">
                      {selectedAccountDetail.normalSide === 'D' ? translations.chartOfAccounts.normalSideDebit : translations.chartOfAccounts.normalSideCredit}
                    </div>
                  </div>

                  <div className="ds-stat-card border-l-4 border-l-blue-500">
                    <div className="ds-stat-label text-blue-400">{translations.chartOfAccounts.totalDebits}</div>
                    <div className="ds-stat-value text-blue-400 text-xl mt-1">
                      {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'USD' }).format(selectedAccountDetail.totalDebits || 0)}
                    </div>
                  </div>

                  <div className="ds-stat-card border-l-4 border-l-amber-500">
                    <div className="ds-stat-label text-amber-400">{translations.chartOfAccounts.totalCredits}</div>
                    <div className="ds-stat-value text-amber-400 text-xl mt-1">
                      {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'USD' }).format(selectedAccountDetail.totalCredits || 0)}
                    </div>
                  </div>

                  <div className="ds-stat-card border-l-4 border-l-emerald-500">
                    <div className="ds-stat-label text-emerald-400">{translations.reports.netIncome}</div>
                    <div className="ds-stat-value text-emerald-400 text-xl mt-1">
                      {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: 'USD' }).format(selectedAccountDetail.balance || 0)}
                    </div>
                  </div>
                </div>

                {/* Account Properties */}
                <div className="ds-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.chartOfAccounts.accountClass}: </span>
                    <strong className="text-slate-200">{selectedAccountDetail.glAccountClassDesc || selectedAccountDetail.glAccountClassId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.chartOfAccounts.accountType}: </span>
                    <strong className="text-slate-200">{selectedAccountDetail.glAccountTypeDesc || '-'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.chartOfAccounts.parentAccount}: </span>
                    <strong className="text-slate-200">{selectedAccountDetail.parentAccountName || selectedAccountDetail.parentGlAccountId || translations.common.none}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">{translations.chartOfAccounts.companyStatus}: </span>
                    <strong className={selectedAccountDetail.isAssigned ? 'text-emerald-400' : 'text-slate-400'}>
                      {selectedAccountDetail.isAssigned ? translations.chartOfAccounts.assignedActive : translations.chartOfAccounts.unassignedIdle}
                    </strong>
                  </div>
                </div>

                {/* Recent Entries Table */}
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">
                    {translations.chartOfAccounts.ledgerEntries} ({accountEntries.length})
                  </h3>

                  {accountEntries.length === 0 ? (
                    <div className="ds-card ds-empty py-12">
                      {translations.chartOfAccounts.noJournalEntriesForAccount}
                    </div>
                  ) : (
                    <div className="ds-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="ds-table text-xs">
                          <thead>
                            <tr className="ds-thead-row">
                              <th className="ds-th">{translations.journalEntries.transDate}</th>
                              <th className="ds-th">{translations.journalEntries.transId}</th>
                              <th className="ds-th">{translations.journalEntries.transType}</th>
                              <th className="ds-th">{translations.common.description}</th>
                              <th className="ds-th-right">{translations.journalEntries.totalDebit}</th>
                              <th className="ds-th-right">{translations.journalEntries.totalCredit}</th>
                              <th className="ds-th">{translations.common.party}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountEntries.map(e => (
                              <tr key={`${e.acctgTransId}-${e.acctgTransEntrySeqId}`} className="ds-tbody-row">
                                <td className="ds-td-muted whitespace-nowrap">
                                  {e.transactionDate ? e.transactionDate.substring(0, 10) : '-'}
                                </td>
                                <td className="ds-td-mono font-bold">
                                  {onSelectTransaction ? (
                                    <button
                                      onClick={() => {
                                        setShowDetailModal(false);
                                        onSelectTransaction(e.acctgTransId);
                                      }}
                                      className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                    >
                                      #{e.acctgTransId}
                                    </button>
                                  ) : (
                                    <span>#{e.acctgTransId}</span>
                                  )}
                                </td>
                                <td className="ds-td">{e.transTypeDescription || e.acctgTransTypeId}</td>
                                <td className="ds-td-muted">{e.description || '-'}</td>
                                <td className="ds-td-right text-blue-400">
                                  {e.debitCreditFlag === 'D' ? new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: e.currencyUomId || 'USD' }).format(e.amount) : '-'}
                                </td>
                                <td className="ds-td-right text-amber-400">
                                  {e.debitCreditFlag === 'C' ? new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: e.currencyUomId || 'USD' }).format(e.amount) : '-'}
                                </td>
                                <td className="ds-td-muted">{e.partyName || e.partyId || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-slate-700/50">
              <button
                onClick={() => setShowDetailModal(false)}
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

export default ChartOfAccounts;
