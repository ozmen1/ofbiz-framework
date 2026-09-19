import React, { useState, useEffect, useCallback } from 'react';
import {
  SlidersHorizontal,
  Building2,
  DollarSign,
  Calendar,
  BookOpen,
  Hash,
  Save,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  HelpCircle,
} from 'lucide-react';
import {
  api,
  AccountingPreference,
  GlJournalItem,
  AccountingPreferencesResponse,
} from '../services/api';
import { useTranslation } from '../i18n';

type PrefTab = 'general' | 'sequencing' | 'journals';

export const AccountingPreferences: React.FC = () => {
  const { translations, locale } = useTranslation();

  // State
  const [selectedOrgId, setSelectedOrgId] = useState<string>('Company');
  const [organizations, setOrganizations] = useState<{ partyId: string; groupName: string }[]>([]);
  const [activeTab, setActiveTab] = useState<PrefTab>('general');
  const [formData, setFormData] = useState<Partial<AccountingPreference>>({});
  const [metadata, setMetadata] = useState<AccountingPreferencesResponse['metadata']>({
    currencies: [],
    taxForms: [],
    cogsMethods: [],
    customMethods: [],
    journals: [],
  });

  // Journals State
  const [journals, setJournals] = useState<GlJournalItem[]>([]);
  const [journalsLoading, setJournalsLoading] = useState<boolean>(false);

  // Status & Notifications
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Journal Modals
  const [showCreateJournalModal, setShowCreateJournalModal] = useState<boolean>(false);
  const [newJournalName, setNewJournalName] = useState<string>('');
  const [newJournalId, setNewJournalId] = useState<string>('');

  const [showEditJournalModal, setShowEditJournalModal] = useState<boolean>(false);
  const [editingJournal, setEditingJournal] = useState<{ glJournalId: string; glJournalName: string } | null>(null);

  // Formatters
  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  // 1. Fetch Preferences & Metadata
  const loadPreferences = useCallback(async (orgId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getAccountingPreferences(orgId);
      if (res && res.preferences) {
        setFormData(res.preferences);
        setOrganizations(res.organizations || []);
        if (res.metadata) {
          setMetadata(res.metadata);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching accounting preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Fetch GL Journals
  const loadJournals = useCallback(async (orgId: string) => {
    try {
      setJournalsLoading(true);
      const res = await api.getGlJournals(orgId);
      if (res && res.journals) {
        setJournals(res.journals);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching GL journals');
    } finally {
      setJournalsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences(selectedOrgId);
    loadJournals(selectedOrgId);
  }, [selectedOrgId, loadPreferences, loadJournals]);

  // Handle Save Preferences
  const handleSavePreferences = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await api.saveAccountingPreferences({
        ...formData,
        partyId: selectedOrgId,
      });
      if (res && res.success) {
        setSuccess(translations.accountingPreferences.messages.successSaved);
        await loadPreferences(selectedOrgId);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save accounting preferences');
    } finally {
      setSaving(false);
    }
  };

  // Handle Create Journal
  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJournalName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api.createGlJournal({
        organizationPartyId: selectedOrgId,
        glJournalName: newJournalName.trim(),
        glJournalId: newJournalId.trim() || undefined,
      });
      if (res && res.success) {
        setShowCreateJournalModal(false);
        setNewJournalName('');
        setNewJournalId('');
        setSuccess(translations.accountingPreferences.messages.successCreatedJournal);
        await loadJournals(selectedOrgId);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create GL journal');
    } finally {
      setSaving(false);
    }
  };

  // Handle Edit Journal
  const handleUpdateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournal || !editingJournal.glJournalName.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api.updateGlJournal({
        glJournalId: editingJournal.glJournalId,
        glJournalName: editingJournal.glJournalName.trim(),
      });
      if (res && res.success) {
        setShowEditJournalModal(false);
        setEditingJournal(null);
        setSuccess(translations.accountingPreferences.messages.successUpdatedJournal);
        await loadJournals(selectedOrgId);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update GL journal');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Journal
  const handleDeleteJournal = async (journalId: string) => {
    if (!window.confirm(translations.accountingPreferences.journals.confirmDelete)) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api.deleteGlJournal(journalId);
      if (res && res.success) {
        setSuccess(translations.accountingPreferences.messages.successDeletedJournal);
        await loadJournals(selectedOrgId);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete GL journal');
    } finally {
      setSaving(false);
    }
  };

  // Handle Post Journal
  const handlePostJournal = async (journalId: string) => {
    if (!window.confirm(translations.accountingPreferences.journals.confirmPost)) return;
    try {
      setSaving(true);
      setError(null);
      const res = await api.postGlJournal(journalId);
      if (res && res.success) {
        setSuccess(translations.accountingPreferences.messages.successPostedJournal);
        await loadJournals(selectedOrgId);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to post GL journal');
    } finally {
      setSaving(false);
    }
  };

  // Month Names for dropdown
  const monthNames = [
    { id: 1, name: locale === 'tr' ? '1 - Ocak' : '1 - January' },
    { id: 2, name: locale === 'tr' ? '2 - Şubat' : '2 - February' },
    { id: 3, name: locale === 'tr' ? '3 - Mart' : '3 - March' },
    { id: 4, name: locale === 'tr' ? '4 - Nisan' : '4 - April' },
    { id: 5, name: locale === 'tr' ? '5 - Mayıs' : '5 - May' },
    { id: 6, name: locale === 'tr' ? '6 - Haziran' : '6 - June' },
    { id: 7, name: locale === 'tr' ? '7 - Temmuz' : '7 - July' },
    { id: 8, name: locale === 'tr' ? '8 - Ağustos' : '8 - August' },
    { id: 9, name: locale === 'tr' ? '9 - Eylül' : '9 - September' },
    { id: 10, name: locale === 'tr' ? '10 - Ekim' : '10 - October' },
    { id: 11, name: locale === 'tr' ? '11 - Kasım' : '11 - November' },
    { id: 12, name: locale === 'tr' ? '12 - Aralık' : '12 - December' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="ds-page-title flex items-center gap-2.5">
            <SlidersHorizontal className="text-indigo-400" size={26} />
            {translations.accountingPreferences.title}
          </h1>
          <p className="ds-page-subtitle">{translations.accountingPreferences.subtitle}</p>
        </div>

        {/* Header Actions & Organization Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <Building2 size={16} className="text-indigo-400" />
            <span className="text-xs font-medium text-slate-400">
              {translations.accountingPreferences.orgSelector}:
            </span>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {organizations.length > 0 ? (
                organizations.map((org) => (
                  <option key={org.partyId} value={org.partyId} className="bg-slate-900 text-white">
                    {org.groupName} ({org.partyId})
                  </option>
                ))
              ) : (
                <option value="Company" className="bg-slate-900 text-white">
                  Company
                </option>
              )}
            </select>
          </div>

          <button
            onClick={() => {
              loadPreferences(selectedOrgId);
              loadJournals(selectedOrgId);
            }}
            disabled={loading}
            className="ds-btn-secondary !p-2"
            title={translations.common.refresh}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => handleSavePreferences()}
            disabled={saving}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            {saving ? translations.common.loading : translations.accountingPreferences.saveChanges}
          </button>
        </div>
      </div>

      {/* Error & Success Alerts */}
      {error && (
        <div className="ds-card p-4 border-l-4 border-l-rose-500 bg-rose-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-rose-300 text-sm">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="ds-card p-4 border-l-4 border-l-emerald-500 bg-emerald-500/10 flex items-center justify-between">
          <div className="flex items-center gap-3 text-emerald-300 text-sm">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Base Currency */}
        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.accountingPreferences.stats.baseCurrency}</span>
            <DollarSign className="text-indigo-400" size={18} />
          </div>
          <div className="ds-stat-value text-indigo-300">{formData.baseCurrencyUomId || 'USD'}</div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {formData.baseCurrencyDesc || (formData.baseCurrencyUomId === 'TRY' ? 'Türk Lirası (₺)' : 'US Dollar ($)')}
          </div>
        </div>

        {/* Fiscal Year Start */}
        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.accountingPreferences.stats.fiscalYearStart}</span>
            <Calendar className="text-emerald-400" size={18} />
          </div>
          <div className="ds-stat-value text-emerald-300">
            {formData.fiscalYearStartDay || 1} / {formData.fiscalYearStartMonth || 1}
          </div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {monthNames.find((m) => m.id === (formData.fiscalYearStartMonth || 1))?.name || 'Ocak'}
          </div>
        </div>

        {/* GL Journals Count */}
        <div className="ds-stat-card border-l-4 border-l-purple-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.accountingPreferences.stats.totalJournals}</span>
            <BookOpen className="text-purple-400" size={18} />
          </div>
          <div className="ds-stat-value text-purple-300">{journals.length}</div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {journals.filter((j) => j.isPosted === 'Y').length} {translations.accountingPreferences.journals.posted} /{' '}
            {journals.filter((j) => j.isPosted !== 'Y').length} {translations.accountingPreferences.journals.draft}
          </div>
        </div>

        {/* Invoice Sequence */}
        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <div className="flex justify-between items-center">
            <span className="ds-stat-label">{translations.accountingPreferences.stats.invoiceSequence}</span>
            <Hash className="text-amber-400" size={18} />
          </div>
          <div className="ds-stat-value text-amber-300">
            {formData.invoiceIdPrefix ? `${formData.invoiceIdPrefix}-` : 'INV-'}
            {formData.lastInvoiceNumber != null ? formData.lastInvoiceNumber : '0'}
          </div>
          <div className="ds-stat-sub text-xs text-slate-400">
            {formData.invoiceSeqCustMethId || 'Default Hook'}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="ds-tab-bar">
        <button
          onClick={() => setActiveTab('general')}
          className={`ds-tab ${activeTab === 'general' ? 'ds-tab-active' : ''}`}
        >
          <SlidersHorizontal size={16} />
          {translations.accountingPreferences.tabs.general}
        </button>
        <button
          onClick={() => setActiveTab('sequencing')}
          className={`ds-tab ${activeTab === 'sequencing' ? 'ds-tab-active' : ''}`}
        >
          <Hash size={16} />
          {translations.accountingPreferences.tabs.sequencing}
        </button>
        <button
          onClick={() => setActiveTab('journals')}
          className={`ds-tab ${activeTab === 'journals' ? 'ds-tab-active' : ''}`}
        >
          <BookOpen size={16} />
          {translations.accountingPreferences.tabs.journals} ({journals.length})
        </button>
      </div>

      {/* TAB 1: GENERAL PREFERENCES */}
      {activeTab === 'general' && (
        <div className="ds-card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">
              {translations.accountingPreferences.general.sectionTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {translations.accountingPreferences.general.sectionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Base Currency */}
            <div className="space-y-1.5">
              <label className="ds-label flex items-center gap-1.5">
                <DollarSign size={14} className="text-indigo-400" />
                {translations.accountingPreferences.general.baseCurrency} *
              </label>
              <select
                value={formData.baseCurrencyUomId || 'USD'}
                onChange={(e) => setFormData({ ...formData, baseCurrencyUomId: e.target.value })}
                className="ds-select"
              >
                {metadata.currencies.map((c) => (
                  <option key={c.uomId} value={c.uomId}>
                    {c.uomId} — {c.description} {c.abbreviation ? `(${c.abbreviation})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 block">
                {translations.accountingPreferences.general.baseCurrencyHint}
              </span>
            </div>

            {/* Error / Suspense GL Journal */}
            <div className="space-y-1.5">
              <label className="ds-label flex items-center gap-1.5">
                <AlertCircle size={14} className="text-amber-400" />
                {translations.accountingPreferences.general.errorJournal}
              </label>
              <select
                value={formData.errorGlJournalId || ''}
                onChange={(e) => setFormData({ ...formData, errorGlJournalId: e.target.value })}
                className="ds-select"
              >
                <option value="">-- {translations.common.none} --</option>
                {journals.map((j) => (
                  <option key={j.glJournalId} value={j.glJournalId}>
                    {j.glJournalName} [{j.glJournalId}]
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 block">
                {translations.accountingPreferences.general.errorJournalHint}
              </span>
            </div>

            {/* Fiscal Year Start Month */}
            <div className="space-y-1.5">
              <label className="ds-label flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-400" />
                {translations.accountingPreferences.general.fiscalStartMonth}
              </label>
              <select
                value={formData.fiscalYearStartMonth || 1}
                onChange={(e) =>
                  setFormData({ ...formData, fiscalYearStartMonth: parseInt(e.target.value, 10) })
                }
                className="ds-select"
              >
                {monthNames.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fiscal Year Start Day */}
            <div className="space-y-1.5">
              <label className="ds-label flex items-center gap-1.5">
                <Calendar size={14} className="text-emerald-400" />
                {translations.accountingPreferences.general.fiscalStartDay}
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.fiscalYearStartDay || 1}
                onChange={(e) =>
                  setFormData({ ...formData, fiscalYearStartDay: parseInt(e.target.value, 10) || 1 })
                }
                className="ds-input"
              />
            </div>

            {/* Tax Form */}
            <div className="space-y-1.5">
              <label className="ds-label">
                {translations.accountingPreferences.general.taxForm}
              </label>
              <select
                value={formData.taxFormId || ''}
                onChange={(e) => setFormData({ ...formData, taxFormId: e.target.value })}
                className="ds-select"
              >
                <option value="">-- {translations.common.none} --</option>
                {metadata.taxForms.map((tf) => (
                  <option key={tf.enumId} value={tf.enumId}>
                    {tf.description || tf.enumId}
                  </option>
                ))}
              </select>
            </div>

            {/* COGS Method */}
            <div className="space-y-1.5">
              <label className="ds-label">
                {translations.accountingPreferences.general.cogsMethod}
              </label>
              <select
                value={formData.cogsMethodId || ''}
                onChange={(e) => setFormData({ ...formData, cogsMethodId: e.target.value })}
                className="ds-select"
              >
                <option value="">-- {translations.common.none} --</option>
                {metadata.cogsMethods.map((cm) => (
                  <option key={cm.enumId} value={cm.enumId}>
                    {cm.description || cm.enumId}
                  </option>
                ))}
              </select>
            </div>

            {/* Enable Accounting Toggle */}
            <div className="space-y-1.5 md:col-span-2 p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">
                  {translations.accountingPreferences.general.enableAccounting}
                </span>
                <span className="text-xs text-slate-400">
                  {translations.accountingPreferences.general.enableAccountingHint}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enableAccounting !== 'N'}
                  onChange={(e) =>
                    setFormData({ ...formData, enableAccounting: e.target.checked ? 'Y' : 'N' })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => handleSavePreferences()}
              disabled={saving}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? translations.common.loading : translations.accountingPreferences.saveChanges}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT SEQUENCING & PREFIXES */}
      {activeTab === 'sequencing' && (
        <div className="ds-card p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white">
              {translations.accountingPreferences.sequencing.sectionTitle}
            </h2>
            <p className="text-xs text-slate-400">
              {translations.accountingPreferences.sequencing.sectionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Invoice Group */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} />
                {locale === 'tr' ? 'Fatura Numaralandırma' : 'Invoice Sequencing'}
              </h3>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.invoicePrefix}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="CI / INV"
                  value={formData.invoiceIdPrefix || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceIdPrefix: e.target.value })}
                  className="ds-input font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.lastInvoiceNo}
                </label>
                <input
                  type="number"
                  placeholder="1000"
                  value={formData.lastInvoiceNumber != null ? formData.lastInvoiceNumber : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastInvoiceNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="ds-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.invoiceSeqMethod}
                </label>
                <select
                  value={formData.invoiceSeqCustMethId || ''}
                  onChange={(e) => setFormData({ ...formData, invoiceSeqCustMethId: e.target.value })}
                  className="ds-select text-xs"
                >
                  <option value="">-- {translations.common.none} --</option>
                  {metadata.customMethods
                    .filter((cm) => cm.customMethodTypeId === 'INVOICE_HOOK')
                    .map((cm) => (
                      <option key={cm.customMethodId} value={cm.customMethodId}>
                        {cm.description}
                      </option>
                    ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {translations.accountingPreferences.sequencing.useInvoiceIdForReturns}
                </span>
                <input
                  type="checkbox"
                  checked={formData.useInvoiceIdForReturns === 'Y'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      useInvoiceIdForReturns: e.target.checked ? 'Y' : 'N',
                    })
                  }
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            {/* Quote Group */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle size={14} />
                {locale === 'tr' ? 'Teklif Numaralandırma' : 'Quote Sequencing'}
              </h3>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.quotePrefix}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="CQ / QUO"
                  value={formData.quoteIdPrefix || ''}
                  onChange={(e) => setFormData({ ...formData, quoteIdPrefix: e.target.value })}
                  className="ds-input font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.lastQuoteNo}
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.lastQuoteNumber != null ? formData.lastQuoteNumber : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastQuoteNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="ds-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.quoteSeqMethod}
                </label>
                <select
                  value={formData.quoteSeqCustMethId || ''}
                  onChange={(e) => setFormData({ ...formData, quoteSeqCustMethId: e.target.value })}
                  className="ds-select text-xs"
                >
                  <option value="">-- {translations.common.none} --</option>
                  {metadata.customMethods
                    .filter((cm) => cm.customMethodTypeId === 'QUOTE_HOOK')
                    .map((cm) => (
                      <option key={cm.customMethodId} value={cm.customMethodId}>
                        {cm.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Order Group */}
            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Hash size={14} />
                {locale === 'tr' ? 'Sipariş Numaralandırma' : 'Order Sequencing'}
              </h3>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.orderPrefix}
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="CO / ORD"
                  value={formData.orderIdPrefix || ''}
                  onChange={(e) => setFormData({ ...formData, orderIdPrefix: e.target.value })}
                  className="ds-input font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.lastOrderNo}
                </label>
                <input
                  type="number"
                  placeholder="100"
                  value={formData.lastOrderNumber != null ? formData.lastOrderNumber : ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      lastOrderNumber: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  className="ds-input font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.sequencing.orderSeqMethod}
                </label>
                <select
                  value={formData.orderSeqCustMethId || ''}
                  onChange={(e) => setFormData({ ...formData, orderSeqCustMethId: e.target.value })}
                  className="ds-select text-xs"
                >
                  <option value="">-- {translations.common.none} --</option>
                  {metadata.customMethods
                    .filter((cm) => cm.customMethodTypeId === 'ORDER_HOOK')
                    .map((cm) => (
                      <option key={cm.customMethodId} value={cm.customMethodId}>
                        {cm.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => handleSavePreferences()}
              disabled={saving}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Save size={16} />
              {saving ? translations.common.loading : translations.accountingPreferences.saveChanges}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: GL JOURNALS */}
      {activeTab === 'journals' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-white">
                {translations.accountingPreferences.journals.sectionTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {translations.accountingPreferences.journals.sectionSubtitle}
              </p>
            </div>

            <button
              onClick={() => {
                setNewJournalName('');
                setNewJournalId('');
                setShowCreateJournalModal(true);
              }}
              className="ds-btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              {translations.accountingPreferences.journals.newJournal}
            </button>
          </div>

          {/* Journals Table */}
          <div className="ds-card overflow-hidden">
            {journalsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="ds-spinner"></div>
              </div>
            ) : journals.length === 0 ? (
              <div className="ds-empty py-16">
                <BookOpen size={48} className="mx-auto text-slate-600 mb-3" />
                <p className="text-slate-400 font-medium">
                  {translations.accountingPreferences.journals.noJournals}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table text-xs">
                  <thead>
                    <tr className="ds-thead-row">
                      <th className="ds-th">{translations.accountingPreferences.journals.journalId}</th>
                      <th className="ds-th">{translations.accountingPreferences.journals.journalName}</th>
                      <th className="ds-th text-center">{translations.accountingPreferences.journals.isPosted}</th>
                      <th className="ds-th text-center">{translations.accountingPreferences.journals.transCount}</th>
                      <th className="ds-th-right">{translations.accountingPreferences.journals.debitTotal}</th>
                      <th className="ds-th-right">{translations.accountingPreferences.journals.creditTotal}</th>
                      <th className="ds-th-right">{translations.accountingPreferences.journals.balanceDiff}</th>
                      <th className="ds-th text-center">{translations.common.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journals.map((j) => {
                      const isPosted = j.isPosted === 'Y';
                      const hasDifference = Math.abs(j.debitCreditDifference || 0) > 0.001;
                      return (
                        <tr key={j.glJournalId} className="ds-tbody-row">
                          <td className="ds-td-mono font-bold text-indigo-400">
                            {j.glJournalId}
                            {j.glJournalId === formData.errorGlJournalId && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-sans">
                                {locale === 'tr' ? 'Hata Defteri' : 'Error Journal'}
                              </span>
                            )}
                          </td>
                          <td className="ds-td font-medium text-white">{j.glJournalName}</td>
                          <td className="ds-td text-center">
                            <span
                              className={`ds-badge ${
                                isPosted ? 'ds-badge-green' : 'ds-badge-yellow'
                              }`}
                            >
                              {isPosted
                                ? translations.accountingPreferences.journals.posted
                                : translations.accountingPreferences.journals.draft}
                            </span>
                          </td>
                          <td className="ds-td text-center font-mono">{j.transCount}</td>
                          <td className="ds-td-right font-mono text-emerald-400">
                            {formatCurrency(j.debitTotal, formData.baseCurrencyUomId)}
                          </td>
                          <td className="ds-td-right font-mono text-blue-400">
                            {formatCurrency(j.creditTotal, formData.baseCurrencyUomId)}
                          </td>
                          <td
                            className={`ds-td-right font-mono font-bold ${
                              hasDifference ? 'text-rose-400' : 'text-slate-400'
                            }`}
                          >
                            {formatCurrency(j.debitCreditDifference, formData.baseCurrencyUomId)}
                          </td>
                          <td className="ds-td text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Button */}
                              <button
                                onClick={() => {
                                  setEditingJournal({
                                    glJournalId: j.glJournalId,
                                    glJournalName: j.glJournalName,
                                  });
                                  setShowEditJournalModal(true);
                                }}
                                className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-300 hover:text-white transition-colors"
                                title={translations.accountingPreferences.journals.editJournal}
                              >
                                <Edit2 size={14} />
                              </button>

                              {/* Post Button (if not yet posted and has transactions) */}
                              {!isPosted && (
                                <button
                                  onClick={() => handlePostJournal(j.glJournalId)}
                                  className="p-1.5 hover:bg-indigo-600/30 rounded-lg text-indigo-400 hover:text-indigo-200 transition-colors"
                                  title={translations.accountingPreferences.journals.postJournal}
                                >
                                  <Send size={14} />
                                </button>
                              )}

                              {/* Delete Button (disabled if error journal or has trans) */}
                              {j.glJournalId !== formData.errorGlJournalId && (
                                <button
                                  onClick={() => handleDeleteJournal(j.glJournalId)}
                                  disabled={j.transCount > 0}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    j.transCount > 0
                                      ? 'text-slate-600 cursor-not-allowed'
                                      : 'hover:bg-rose-500/20 text-rose-400 hover:text-rose-300'
                                  }`}
                                  title={translations.accountingPreferences.journals.deleteJournal}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
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
      )}

      {/* MODAL: CREATE GL JOURNAL */}
      {showCreateJournalModal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-400" />
                {translations.accountingPreferences.journals.newJournal}
              </h2>
              <button
                onClick={() => setShowCreateJournalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateJournal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.journals.journalName} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'tr' ? 'Örn: Satış Defteri' : 'e.g. Sales Journal'}
                  value={newJournalName}
                  onChange={(e) => setNewJournalName(e.target.value)}
                  className="ds-input"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.journals.journalId} (
                  {locale === 'tr' ? 'Opsiyonel Kod' : 'Optional ID'})
                </label>
                <input
                  type="text"
                  placeholder={locale === 'tr' ? 'Örn: SALES_JOURNAL' : 'e.g. SALES_JOURNAL'}
                  value={newJournalId}
                  onChange={(e) => setNewJournalId(e.target.value.toUpperCase())}
                  className="ds-input font-mono uppercase"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateJournalModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button type="submit" disabled={saving} className="ds-btn-primary">
                  {saving ? translations.common.loading : translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT GL JOURNAL */}
      {showEditJournalModal && editingJournal && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-md p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 size={18} className="text-indigo-400" />
                {translations.accountingPreferences.journals.editJournal}: {editingJournal.glJournalId}
              </h2>
              <button
                onClick={() => setShowEditJournalModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateJournal} className="space-y-4">
              <div className="space-y-1.5">
                <label className="ds-label">
                  {translations.accountingPreferences.journals.journalName} *
                </label>
                <input
                  type="text"
                  required
                  value={editingJournal.glJournalName}
                  onChange={(e) =>
                    setEditingJournal({ ...editingJournal, glJournalName: e.target.value })
                  }
                  className="ds-input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditJournalModal(false)}
                  className="ds-btn-secondary"
                >
                  {translations.common.cancel}
                </button>
                <button type="submit" disabled={saving} className="ds-btn-primary">
                  {saving ? translations.common.loading : translations.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountingPreferences;
