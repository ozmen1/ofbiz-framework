import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Lock, Unlock, Plus, RefreshCw, Search,
  CheckCircle2, AlertCircle, Trash2, Edit2
} from 'lucide-react';
import { api, CustomTimePeriodItem, PeriodTypeItem } from '../services/api';
import { useTranslation } from '../i18n';

export const FiscalPeriods: React.FC = () => {
  const { translations, locale } = useTranslation();

  const [periods, setPeriods] = useState<CustomTimePeriodItem[]>([]);
  const [periodTypes, setPeriodTypes] = useState<PeriodTypeItem[]>([]);
  const [organizations, setOrganizations] = useState<{ partyId: string; name: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedOrg, setSelectedOrg] = useState<string>('Company');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingPeriod, setEditingPeriod] = useState<CustomTimePeriodItem | null>(null);

  // Form states
  const [formOrg, setFormOrg] = useState<string>('Company');
  const [formType, setFormType] = useState<string>('FISCAL_MONTH');
  const [formName, setFormName] = useState<string>('');
  const [formNum, setFormNum] = useState<string>('');
  const [formParent, setFormParent] = useState<string>('');
  const [formFromDate, setFormFromDate] = useState<string>('');
  const [formThruDate, setFormThruDate] = useState<string>('');
  const [formIsClosed, setFormIsClosed] = useState<'Y' | 'N'>('N');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomTimePeriods({
        organizationPartyId: selectedOrg,
        periodTypeId: selectedType || undefined,
        isClosed: selectedStatus || undefined,
        search: search || undefined
      });
      setPeriods(res.customTimePeriods || []);
      if (res.periodTypes) setPeriodTypes(res.periodTypes);
      if (res.organizations) setOrganizations(res.organizations);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch custom time periods');
    } finally {
      setLoading(false);
    }
  }, [selectedOrg, selectedType, selectedStatus, search]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formType || !formFromDate || !formThruDate) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createCustomTimePeriod({
        organizationPartyId: formOrg,
        periodTypeId: formType,
        periodName: formName,
        periodNum: formNum ? parseInt(formNum, 10) : undefined,
        parentPeriodId: formParent || undefined,
        fromDate: formFromDate,
        thruDate: formThruDate,
        isClosed: formIsClosed
      });
      setSuccessMsg(translations.fiscalPeriods.successCreated);
      setIsCreateModalOpen(false);
      resetForm();
      fetchPeriods();
    } catch (err: any) {
      setError(err?.message || 'Failed to create fiscal period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPeriod) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.updateCustomTimePeriod({
        customTimePeriodId: editingPeriod.customTimePeriodId,
        periodTypeId: formType,
        periodName: formName,
        periodNum: formNum ? parseInt(formNum, 10) : undefined,
        parentPeriodId: formParent || undefined,
        fromDate: formFromDate,
        thruDate: formThruDate,
        isClosed: formIsClosed
      });
      setSuccessMsg(translations.fiscalPeriods.successUpdated);
      setIsEditModalOpen(false);
      setEditingPeriod(null);
      resetForm();
      fetchPeriods();
    } catch (err: any) {
      setError(err?.message || 'Failed to update fiscal period');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePeriod = async (period: CustomTimePeriodItem) => {
    const confirm = window.confirm(translations.fiscalPeriods.confirmClose);
    if (!confirm) return;
    try {
      await api.closeCustomTimePeriod(period.customTimePeriodId, true);
      setSuccessMsg(translations.fiscalPeriods.successClosed);
      fetchPeriods();
    } catch (err: any) {
      setError(err?.message || 'Failed to close period');
    }
  };

  const handleReopenPeriod = async (period: CustomTimePeriodItem) => {
    const confirm = window.confirm(translations.fiscalPeriods.confirmReopen);
    if (!confirm) return;
    try {
      await api.reopenCustomTimePeriod(period.customTimePeriodId);
      setSuccessMsg(translations.fiscalPeriods.successReopened);
      fetchPeriods();
    } catch (err: any) {
      setError(err?.message || 'Failed to reopen period');
    }
  };

  const handleDeletePeriod = async (period: CustomTimePeriodItem) => {
    const confirm = window.confirm(translations.fiscalPeriods.confirmDelete);
    if (!confirm) return;
    try {
      await api.deleteCustomTimePeriod(period.customTimePeriodId);
      setSuccessMsg(translations.common.success);
      fetchPeriods();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete period');
    }
  };

  const openEditModal = (p: CustomTimePeriodItem) => {
    setEditingPeriod(p);
    setFormOrg(p.organizationPartyId || 'Company');
    setFormType(p.periodTypeId);
    setFormName(p.periodName);
    setFormNum(p.periodNum ? p.periodNum.toString() : '');
    setFormParent(p.parentPeriodId || '');
    setFormFromDate(p.fromDate || '');
    setFormThruDate(p.thruDate || '');
    setFormIsClosed(p.isClosed);
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormOrg('Company');
    setFormType('FISCAL_MONTH');
    setFormName('');
    setFormNum('');
    setFormParent('');
    setFormFromDate('');
    setFormThruDate('');
    setFormIsClosed('N');
  };

  // KPIs
  const totalPeriods = periods.length;
  const openPeriods = periods.filter(p => p.isClosed !== 'Y').length;
  const closedPeriods = periods.filter(p => p.isClosed === 'Y').length;
  const fiscalYears = periods.filter(p => p.periodTypeId === 'FISCAL_YEAR').length;

  const formatDateStr = (d?: string | null) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US');
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Calendar className="text-indigo-400" size={26} />
            {translations.fiscalPeriods.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {translations.fiscalPeriods.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPeriods}
            disabled={loading}
            className="ds-btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{translations.common.refresh}</span>
          </button>
          <button
            onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span>{translations.fiscalPeriods.newPeriod}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between text-rose-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs hover:underline">✕</button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-xs hover:underline">✕</button>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ds-stat-card border-l-4 border-l-indigo-500">
          <p className="ds-stat-label">{translations.fiscalPeriods.stats.totalPeriods}</p>
          <p className="ds-stat-value text-indigo-400">{totalPeriods}</p>
        </div>
        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <p className="ds-stat-label">{translations.fiscalPeriods.stats.openPeriods}</p>
          <p className="ds-stat-value text-emerald-400">{openPeriods}</p>
        </div>
        <div className="ds-stat-card border-l-4 border-l-rose-500">
          <p className="ds-stat-label">{translations.fiscalPeriods.stats.closedPeriods}</p>
          <p className="ds-stat-value text-rose-400">{closedPeriods}</p>
        </div>
        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <p className="ds-stat-label">{translations.fiscalPeriods.stats.fiscalYears}</p>
          <p className="ds-stat-value text-amber-400">{fiscalYears}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="ds-card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translations.fiscalPeriods.searchPlaceholder}
              className="ds-input pl-9"
            />
          </div>
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="ds-select"
            >
              <option value="">{translations.fiscalPeriods.filterAllTypes}</option>
              {periodTypes.map((pt) => (
                <option key={pt.periodTypeId} value={pt.periodTypeId}>
                  {pt.description}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="ds-select"
            >
              <option value="">{translations.fiscalPeriods.filterAllStatuses}</option>
              <option value="N">{translations.fiscalPeriods.open}</option>
              <option value="Y">{translations.fiscalPeriods.closed}</option>
            </select>
          </div>
          <div>
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="ds-select"
            >
              {organizations.map((org) => (
                <option key={org.partyId} value={org.partyId}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fiscal Periods Table */}
      <div className="ds-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="ds-spinner"></div>
          </div>
        ) : periods.length === 0 ? (
          <div className="ds-empty py-16 text-center">
            <Calendar size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">{translations.fiscalPeriods.noPeriods}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{translations.fiscalPeriods.periodName}</th>
                  <th className="ds-th">{translations.fiscalPeriods.periodType}</th>
                  <th className="ds-th">{translations.fiscalPeriods.parentPeriod}</th>
                  <th className="ds-th">{translations.fiscalPeriods.fromDate}</th>
                  <th className="ds-th">{translations.fiscalPeriods.thruDate}</th>
                  <th className="ds-th text-center">{translations.fiscalPeriods.status}</th>
                  <th className="ds-th text-right">{translations.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => {
                  const isClosed = p.isClosed === 'Y';
                  return (
                    <tr key={p.customTimePeriodId} className="ds-tbody-row hover:bg-slate-800/40">
                      <td className="ds-td font-medium text-white">
                        <div>
                          <span>{p.periodName}</span>
                          <span className="block text-xs text-slate-500">ID: {p.customTimePeriodId}</span>
                        </div>
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-indigo">
                          {p.periodTypeDescription || p.periodTypeId}
                        </span>
                      </td>
                      <td className="ds-td text-slate-400">
                        {p.parentPeriodName ? (
                          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                            {p.parentPeriodName}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="ds-td text-slate-300 font-mono text-xs">
                        {formatDateStr(p.fromDate)}
                      </td>
                      <td className="ds-td text-slate-300 font-mono text-xs">
                        {formatDateStr(p.thruDate)}
                      </td>
                      <td className="ds-td text-center">
                        {isClosed ? (
                          <span className="ds-badge ds-badge-red flex items-center gap-1 w-fit mx-auto">
                            <Lock size={12} />
                            <span>{translations.fiscalPeriods.closed}</span>
                          </span>
                        ) : (
                          <span className="ds-badge ds-badge-green flex items-center gap-1 w-fit mx-auto">
                            <Unlock size={12} />
                            <span>{translations.fiscalPeriods.open}</span>
                          </span>
                        )}
                      </td>
                      <td className="ds-td text-right space-x-1">
                        {isClosed ? (
                          <button
                            onClick={() => handleReopenPeriod(p)}
                            title={translations.fiscalPeriods.reopenPeriod}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Unlock size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleClosePeriod(p)}
                            title={translations.fiscalPeriods.closePeriod}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Lock size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(p)}
                          title={translations.fiscalPeriods.editPeriod}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePeriod(p)}
                          title={translations.fiscalPeriods.deletePeriod}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar className="text-indigo-400" size={20} />
                  {translations.fiscalPeriods.newPeriod}
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="ds-label">{translations.fiscalPeriods.periodType} *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    required
                    className="ds-select"
                  >
                    {periodTypes.map((pt) => (
                      <option key={pt.periodTypeId} value={pt.periodTypeId}>
                        {pt.description} ({pt.periodTypeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.periodName} *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Örn: 2026/M01 veya FY2026"
                      required
                      className="ds-input"
                    />
                  </div>
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.periodNum}</label>
                    <input
                      type="number"
                      value={formNum}
                      onChange={(e) => setFormNum(e.target.value)}
                      placeholder="Örn: 1"
                      className="ds-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="ds-label">{translations.fiscalPeriods.parentPeriod}</label>
                  <select
                    value={formParent}
                    onChange={(e) => setFormParent(e.target.value)}
                    className="ds-select"
                  >
                    <option value="">-- {translations.common.none} --</option>
                    {periods.map((p) => (
                      <option key={p.customTimePeriodId} value={p.customTimePeriodId}>
                        {p.periodName} ({p.periodTypeDescription})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.fromDate} *</label>
                    <input
                      type="date"
                      value={formFromDate}
                      onChange={(e) => setFormFromDate(e.target.value)}
                      required
                      className="ds-input"
                    />
                  </div>
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.thruDate} *</label>
                    <input
                      type="date"
                      value={formThruDate}
                      onChange={(e) => setFormThruDate(e.target.value)}
                      required
                      className="ds-input"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isClosedCheck"
                    checked={formIsClosed === 'Y'}
                    onChange={(e) => setFormIsClosed(e.target.checked ? 'Y' : 'N')}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isClosedCheck" className="text-sm text-slate-300 font-medium">
                    {translations.fiscalPeriods.closed}
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="ds-btn-secondary"
                  >
                    {translations.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ds-btn-primary flex items-center gap-2"
                  >
                    {submitting && <RefreshCw size={16} className="animate-spin" />}
                    <span>{translations.common.save}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingPeriod && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 className="text-indigo-400" size={20} />
                  {translations.fiscalPeriods.editPeriod}
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="ds-label">{translations.fiscalPeriods.periodType} *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    required
                    className="ds-select"
                  >
                    {periodTypes.map((pt) => (
                      <option key={pt.periodTypeId} value={pt.periodTypeId}>
                        {pt.description} ({pt.periodTypeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.periodName} *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      className="ds-input"
                    />
                  </div>
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.periodNum}</label>
                    <input
                      type="number"
                      value={formNum}
                      onChange={(e) => setFormNum(e.target.value)}
                      className="ds-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="ds-label">{translations.fiscalPeriods.parentPeriod}</label>
                  <select
                    value={formParent}
                    onChange={(e) => setFormParent(e.target.value)}
                    className="ds-select"
                  >
                    <option value="">-- {translations.common.none} --</option>
                    {periods.filter(p => p.customTimePeriodId !== editingPeriod.customTimePeriodId).map((p) => (
                      <option key={p.customTimePeriodId} value={p.customTimePeriodId}>
                        {p.periodName} ({p.periodTypeDescription})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.fromDate} *</label>
                    <input
                      type="date"
                      value={formFromDate}
                      onChange={(e) => setFormFromDate(e.target.value)}
                      required
                      className="ds-input"
                    />
                  </div>
                  <div>
                    <label className="ds-label">{translations.fiscalPeriods.thruDate} *</label>
                    <input
                      type="date"
                      value={formThruDate}
                      onChange={(e) => setFormThruDate(e.target.value)}
                      required
                      className="ds-input"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isClosedEditCheck"
                    checked={formIsClosed === 'Y'}
                    onChange={(e) => setFormIsClosed(e.target.checked ? 'Y' : 'N')}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="isClosedEditCheck" className="text-sm text-slate-300 font-medium flex items-center gap-1.5">
                    {formIsClosed === 'Y' ? <Lock size={14} className="text-rose-400" /> : <Unlock size={14} className="text-emerald-400" />}
                    {translations.fiscalPeriods.closed}
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="ds-btn-secondary"
                  >
                    {translations.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="ds-btn-primary flex items-center gap-2"
                  >
                    {submitting && <RefreshCw size={16} className="animate-spin" />}
                    <span>{translations.common.save}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
