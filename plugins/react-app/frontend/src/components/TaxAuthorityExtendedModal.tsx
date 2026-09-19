import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Landmark,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Check,
  Building2,
  Calendar,
  Layers,
  Printer,
  TrendingUp,
  TrendingDown,
  BookOpen,
} from 'lucide-react';
import {
  api,
  TaxAuthorityItem,
  TaxAuthorityReportResponse,
  PartyTaxAuthInfoItem,
  TaxAuthorityCategoryItem,
  TaxAuthorityGlAccountItem,
  CreatePartyTaxAuthInfoPayload,
} from '../services/api';
import { useTranslation } from '../i18n';

interface TaxAuthorityExtendedModalProps {
  authority: TaxAuthorityItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

type TabType = 'report' | 'parties' | 'categories' | 'glAccounts';

export const TaxAuthorityExtendedModal: React.FC<TaxAuthorityExtendedModalProps> = ({
  authority,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.taxSettlement;
  const tc = translations.common;
  const isTr = locale === 'tr';

  const [activeTab, setActiveTab] = useState<TabType>('report');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Date filters for settlement report
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');

  // Data states
  const [reportData, setReportData] = useState<TaxAuthorityReportResponse | null>(null);
  const [partiesList, setPartiesList] = useState<PartyTaxAuthInfoItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<TaxAuthorityCategoryItem[]>([]);
  const [glAccountsList, setGlAccountsList] = useState<TaxAuthorityGlAccountItem[]>([]);

  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);

  // Forms
  const [partyForm, setPartyForm] = useState<CreatePartyTaxAuthInfoPayload>({
    partyId: '',
    taxAuthPartyId: '',
    taxAuthGeoId: '',
    partyTaxId: '',
    isExempt: 'N',
    isNexus: 'Y',
    fromDate: '',
    thruDate: '',
  });

  const [catForm, setCatForm] = useState({
    productCategoryId: '',
  });

  const fetchReport = useCallback(async () => {
    if (!authority) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTaxAuthorityReport(
        authority.taxAuthPartyId,
        authority.taxAuthGeoId,
        fromDate || undefined,
        thruDate || undefined
      );
      setReportData(res);
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Vergi raporu yüklenemedi.' : 'Failed to load tax report.'));
    } finally {
      setLoading(false);
    }
  }, [authority, fromDate, thruDate, isTr]);

  const fetchParties = useCallback(async () => {
    if (!authority) return;
    try {
      setLoading(true);
      const res = await api.getPartyTaxAuthInfos(authority.taxAuthPartyId, authority.taxAuthGeoId);
      setPartiesList(res?.taxAuthParties || []);
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Mükellef listesi yüklenemedi.' : 'Failed to load taxpayers.'));
    } finally {
      setLoading(false);
    }
  }, [authority, isTr]);

  const fetchCategories = useCallback(async () => {
    if (!authority) return;
    try {
      setLoading(true);
      const res = await api.getTaxAuthorityCategories(authority.taxAuthPartyId, authority.taxAuthGeoId);
      setCategoriesList(res?.categories || []);
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Kategoriler yüklenemedi.' : 'Failed to load categories.'));
    } finally {
      setLoading(false);
    }
  }, [authority, isTr]);

  const fetchGlAccounts = useCallback(async () => {
    if (!authority) return;
    try {
      setLoading(true);
      const res = await api.getTaxAuthorityGlAccounts(authority.taxAuthGeoId, authority.taxAuthPartyId);
      setGlAccountsList(res?.taxAuthorityGlAccounts || []);
    } catch (err: any) {
      setError(err?.message || (isTr ? 'GL hesapları yüklenemedi.' : 'Failed to load GL accounts.'));
    } finally {
      setLoading(false);
    }
  }, [authority, isTr]);

  useEffect(() => {
    if (isOpen && authority) {
      if (activeTab === 'report') fetchReport();
      else if (activeTab === 'parties') fetchParties();
      else if (activeTab === 'categories') fetchCategories();
      else if (activeTab === 'glAccounts') fetchGlAccounts();

    }
  }, [isOpen, authority, activeTab, fetchReport, fetchParties, fetchCategories, fetchGlAccounts]);

  const fmt = (val?: number | null, curr = 'TRY') => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat(isTr ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
    }).format(num);
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authority || !partyForm.partyId) return;
    try {
      setLoading(true);
      const res = await api.createPartyTaxAuthInfo({
        ...partyForm,
        taxAuthPartyId: authority.taxAuthPartyId,
        taxAuthGeoId: authority.taxAuthGeoId,
      });
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Mükellef başarıyla eklendi.' : 'Taxpayer registered successfully.'));
      setShowAddPartyModal(false);
      setPartyForm({
        partyId: '',
        taxAuthPartyId: '',
        taxAuthGeoId: '',
        partyTaxId: '',
        isExempt: 'N',
        isNexus: 'Y',
        fromDate: '',
        thruDate: '',
      });
      fetchParties();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Mükellef eklenemedi.' : 'Failed to register taxpayer.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParty = async (partyId: string, fDate: string) => {
    if (!authority) return;
    if (!window.confirm(t.parties.deleteConfirm)) return;
    try {
      setLoading(true);
      const res = await api.deletePartyTaxAuthInfo(partyId, authority.taxAuthPartyId, authority.taxAuthGeoId, fDate);
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Mükellef kaydı silindi.' : 'Taxpayer removed.'));
      fetchParties();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Mükellef silinemedi.' : 'Failed to delete taxpayer.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authority || !catForm.productCategoryId) return;
    try {
      setLoading(true);
      const res = await api.createTaxAuthorityCategory(
        authority.taxAuthPartyId,
        authority.taxAuthGeoId,
        catForm.productCategoryId
      );
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Kategori eşlemesi eklendi.' : 'Category mapping added.'));
      setShowAddCatModal(false);
      setCatForm({ productCategoryId: '' });
      fetchCategories();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Kategori eklenemedi.' : 'Failed to add category.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (prodCatId: string) => {
    if (!authority) return;
    if (!window.confirm(t.categories.deleteConfirm)) return;
    try {
      setLoading(true);
      const res = await api.deleteTaxAuthorityCategory(
        authority.taxAuthPartyId,
        authority.taxAuthGeoId,
        prodCatId
      );
      setSuccessMsg(res?._EVENT_MESSAGE_ || (isTr ? 'Kategori eşlemesi kaldırıldı.' : 'Category mapping removed.'));
      fetchCategories();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      setError(err?.message || (isTr ? 'Kategori kaldırılamadı.' : 'Failed to remove category.'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !authority) return null;

  return (
    <div className="ds-overlay">
      <div className="ds-modal max-w-5xl max-h-[92vh] flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Landmark size={22} className="text-indigo-400" />
              {authority.partyName || authority.taxAuthPartyId} - {authority.geoName || authority.taxAuthGeoId}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t.modalSubtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="ds-tab-bar">
          <button
            onClick={() => setActiveTab('report')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'report' ? 'ds-tab-active' : ''}`}
          >
            <FileText size={16} />
            {t.tabs.report}
          </button>
          <button
            onClick={() => setActiveTab('parties')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'parties' ? 'ds-tab-active' : ''}`}
          >
            <Building2 size={16} />
            {t.tabs.parties}
            {partiesList.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {partiesList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'categories' ? 'ds-tab-active' : ''}`}
          >
            <Layers size={16} />
            {t.tabs.categories}
            {categoriesList.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {categoriesList.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('glAccounts')}
            className={`ds-tab flex items-center gap-2 ${activeTab === 'glAccounts' ? 'ds-tab-active' : ''}`}
          >
            <BookOpen size={16} />
            {t.tabs.glAccounts}
            {glAccountsList.length > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {glAccountsList.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto min-h-[360px] pr-1">
          {loading && !reportData && partiesList.length === 0 ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="animate-spin text-indigo-400" size={32} />
            </div>
          ) : (
            <>
              {/* TAB 1: VAT / TAX REPORT */}
              {activeTab === 'report' && (
                <div className="space-y-4">
                  {/* Date Filters */}
                  <div className="ds-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-xs text-slate-300">{t.report.dateRange}:</span>
                      </div>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="ds-input py-1 text-xs w-36"
                      />
                      <span className="text-slate-400">-</span>
                      <input
                        type="date"
                        value={thruDate}
                        onChange={(e) => setThruDate(e.target.value)}
                        className="ds-input py-1 text-xs w-36"
                      />
                      <button onClick={fetchReport} className="ds-btn-primary py-1 px-3 text-xs">
                        {t.report.filter}
                      </button>
                      {(fromDate || thruDate) && (
                        <button
                          onClick={() => {
                            setFromDate('');
                            setThruDate('');
                          }}
                          className="ds-btn-secondary py-1 px-3 text-xs"
                        >
                          {t.report.allDates}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="ds-btn-secondary py-1 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      {t.report.printReport}
                    </button>
                  </div>

                  {/* Summary KPI Cards */}
                  {reportData?.summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Output Tax */}
                      <div className="ds-stat-card border-l-4 border-l-rose-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="ds-stat-label">{t.report.outputTax}</div>
                            <div className="ds-stat-value text-rose-400">
                              {fmt(reportData.summary.totalTaxCollected)}
                            </div>
                          </div>
                          <TrendingUp size={20} className="text-rose-400" />
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                          {t.report.totalSalesBase}: {fmt(reportData.summary.totalTaxableSales)}
                        </div>
                      </div>

                      {/* Input Tax */}
                      <div className="ds-stat-card border-l-4 border-l-emerald-500">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="ds-stat-label">{t.report.inputTax}</div>
                            <div className="ds-stat-value text-emerald-400">
                              {fmt(reportData.summary.totalTaxPaid)}
                            </div>
                          </div>
                          <TrendingDown size={20} className="text-emerald-400" />
                        </div>
                        <div className="text-xs text-slate-400 mt-2">
                          {t.report.totalPurchasesBase}: {fmt(reportData.summary.totalTaxablePurchases)}
                        </div>
                      </div>

                      {/* Net Tax Due / Refundable */}
                      <div
                        className={`ds-stat-card border-l-4 ${
                          reportData.summary.isPayable ? 'border-l-amber-500' : 'border-l-indigo-500'
                        }`}
                      >
                        <div className="ds-stat-label">{t.report.netTaxDue}</div>
                        <div
                          className={`ds-stat-value ${
                            reportData.summary.isPayable ? 'text-amber-400' : 'text-indigo-400'
                          }`}
                        >
                          {fmt(reportData.summary.netTaxDue)}
                        </div>
                        <div className="mt-2">
                          <span
                            className={`ds-badge text-xs ${
                              reportData.summary.isPayable ? 'ds-badge-yellow' : 'ds-badge-blue'
                            }`}
                          >
                            {reportData.summary.isPayable ? t.report.payable : t.report.carriedForward}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rates Breakdown Table */}
                  {reportData?.rateBreakdown && reportData.rateBreakdown.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        {t.report.ratesBreakdown}
                      </h4>
                      <div className="ds-card overflow-hidden">
                        <table className="ds-table">
                          <thead>
                            <tr className="ds-thead-row">
                              <th className="ds-th">{t.report.rateName}</th>
                              <th className="ds-th-right">{t.report.salesTax}</th>
                              <th className="ds-th-right">{t.report.purchaseTax}</th>
                              <th className="ds-th-right">{t.report.netAmount}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.rateBreakdown.map((r, idx) => (
                              <tr key={idx} className="ds-tbody-row">
                                <td className="ds-td font-medium text-white text-xs">{r.rateName}</td>
                                <td className="ds-td-right font-mono text-xs text-rose-400 font-semibold">
                                  {fmt(r.taxCollected)}
                                </td>
                                <td className="ds-td-right font-mono text-xs text-emerald-400 font-semibold">
                                  {fmt(r.taxPaid)}
                                </td>
                                <td className="ds-td-right font-mono text-xs text-indigo-300 font-bold">
                                  {fmt(r.netTax)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Invoices List */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      {t.report.invoicesList} ({reportData?.lineItems?.length || 0})
                    </h4>
                    <div className="ds-card overflow-hidden">
                      <table className="ds-table">
                        <thead>
                          <tr className="ds-thead-row">
                            <th className="ds-th">{t.report.invoiceId}</th>
                            <th className="ds-th">{t.report.invoiceDate}</th>
                            <th className="ds-th">{t.report.party}</th>
                            <th className="ds-th text-center">{t.report.type}</th>
                            <th className="ds-th-right">{t.report.taxableBase}</th>
                            <th className="ds-th-right">{t.report.taxAmount}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!reportData?.lineItems || reportData.lineItems.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="ds-td text-center text-slate-400 py-8">
                                {t.report.noItems}
                              </td>
                            </tr>
                          ) : (
                            reportData.lineItems.map((item, idx) => (
                              <tr key={idx} className="ds-tbody-row">
                                <td className="ds-td font-mono font-semibold text-indigo-400 text-xs">
                                  #{item.invoiceId}
                                </td>
                                <td className="ds-td font-mono text-xs text-slate-300">
                                  {item.invoiceDate?.substring(0, 10)}
                                </td>
                                <td className="ds-td">
                                  <div className="text-white text-xs">{item.partyName}</div>
                                  <div className="text-[11px] text-slate-400 font-mono">{item.partyId}</div>
                                </td>
                                <td className="ds-td text-center">
                                  <span
                                    className={`ds-badge text-xs ${
                                      item.isSales ? 'ds-badge-blue' : 'ds-badge-purple'
                                    }`}
                                  >
                                    {item.invoiceTypeId}
                                  </span>
                                </td>
                                <td className="ds-td-right font-mono text-xs text-slate-200">
                                  {fmt(item.taxableBase, item.currencyUomId)}
                                </td>
                                <td
                                  className={`ds-td-right font-mono text-xs font-bold ${
                                    item.isSales ? 'text-rose-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {fmt(item.taxAmount, item.currencyUomId)}
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

              {/* TAB 2: PARTIES */}
              {activeTab === 'parties' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Building2 size={16} className="text-indigo-400" />
                      {t.parties.title} ({partiesList.length})
                    </h3>
                    <button
                      onClick={() => setShowAddPartyModal(true)}
                      className="ds-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      {t.parties.newParty}
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.parties.partyId}</th>
                          <th className="ds-th">{t.parties.taxId}</th>
                          <th className="ds-th text-center">{t.parties.isExempt}</th>
                          <th className="ds-th text-center">{t.parties.isNexus}</th>
                          <th className="ds-th">{t.parties.fromDate}</th>
                          <th className="ds-th">{t.parties.thruDate}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partiesList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="ds-td text-center text-slate-400 py-8">
                              {t.parties.noParties}
                            </td>
                          </tr>
                        ) : (
                          partiesList.map((p, idx) => (
                            <tr key={idx} className="ds-tbody-row">
                              <td className="ds-td">
                                <div className="text-white font-medium text-xs">{p.partyName}</div>
                                <div className="text-[11px] text-slate-400 font-mono">{p.partyId}</div>
                              </td>
                              <td className="ds-td font-mono text-xs text-indigo-400 font-bold">
                                {p.partyTaxId || '-'}
                              </td>
                              <td className="ds-td text-center">
                                <span
                                  className={`ds-badge text-xs ${
                                    p.isExempt === 'Y' ? 'ds-badge-green' : 'ds-badge-slate'
                                  }`}
                                >
                                  {p.isExempt === 'Y' ? (isTr ? 'Muaf' : 'Yes') : (isTr ? 'Hayır' : 'No')}
                                </span>
                              </td>
                              <td className="ds-td text-center">
                                <span
                                  className={`ds-badge text-xs ${
                                    p.isNexus === 'Y' ? 'ds-badge-blue' : 'ds-badge-slate'
                                  }`}
                                >
                                  {p.isNexus === 'Y' ? (isTr ? 'Tescilli' : 'Yes') : (isTr ? 'Hayır' : 'No')}
                                </span>
                              </td>
                              <td className="ds-td font-mono text-xs text-slate-300">
                                {p.fromDate ? p.fromDate.substring(0, 10) : '-'}
                              </td>
                              <td className="ds-td font-mono text-xs text-slate-300">
                                {p.thruDate ? p.thruDate.substring(0, 10) : (isTr ? 'Aktif' : 'Active')}
                              </td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleDeleteParty(p.partyId, p.fromDate)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title={tc.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: CATEGORIES */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Layers size={16} className="text-indigo-400" />
                      {t.categories.title} ({categoriesList.length})
                    </h3>
                    <button
                      onClick={() => setShowAddCatModal(true)}
                      className="ds-btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Plus size={14} />
                      {t.categories.newCategory}
                    </button>
                  </div>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{t.categories.categoryId}</th>
                          <th className="ds-th">{t.categories.categoryName}</th>
                          <th className="ds-th">{t.categories.description}</th>
                          <th className="ds-th text-center">{tc.actions}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoriesList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="ds-td text-center text-slate-400 py-8">
                              {t.categories.noCategories}
                            </td>
                          </tr>
                        ) : (
                          categoriesList.map((c, idx) => (
                            <tr key={idx} className="ds-tbody-row">
                              <td className="ds-td font-mono text-xs text-indigo-400 font-semibold">
                                #{c.productCategoryId}
                              </td>
                              <td className="ds-td text-xs text-white font-medium">{c.categoryName}</td>
                              <td className="ds-td text-xs text-slate-300">{c.description || '-'}</td>
                              <td className="ds-td text-center">
                                <button
                                  onClick={() => handleDeleteCategory(c.productCategoryId)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                                  title={tc.delete}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: GL ACCOUNTS */}
              {activeTab === 'glAccounts' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-400" />
                    {t.tabs.glAccounts} ({glAccountsList.length})
                  </h3>

                  <div className="ds-card overflow-hidden">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">GL Account ID</th>
                          <th className="ds-th">Account Name</th>
                          <th className="ds-th">Account Code</th>
                          <th className="ds-th">Organization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {glAccountsList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="ds-td text-center text-slate-400 py-8">
                              {isTr ? 'Bağlı GL hesabı bulunmamaktadır.' : 'No linked GL accounts.'}
                            </td>
                          </tr>
                        ) : (
                          glAccountsList.map((g, idx) => (
                            <tr key={idx} className="ds-tbody-row">
                              <td className="ds-td font-mono font-bold text-indigo-400 text-xs">
                                #{g.glAccountId}
                              </td>
                              <td className="ds-td text-xs text-white">{g.accountName}</td>
                              <td className="ds-td text-xs font-mono text-slate-300">
                                {g.accountCode || '-'}
                              </td>
                              <td className="ds-td">
                                <span className="ds-badge ds-badge-purple text-xs">{g.organizationPartyId}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-700/50">
          <button onClick={onClose} className="ds-btn-secondary">
            {tc.close}
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD PARTY TAX INFO */}
      {showAddPartyModal && (
        <div className="ds-overlay z-[60]">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Building2 size={18} className="text-indigo-400" />
                {t.parties.newParty}
              </h3>
              <button
                onClick={() => setShowAddPartyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateParty} className="space-y-3 text-xs">
              <div>
                <label className="ds-label">{t.parties.partyId} (Cari / Taraf) *</label>
                <input
                  type="text"
                  required
                  placeholder="DemoCustomer, Company, etc."
                  value={partyForm.partyId}
                  onChange={(e) => setPartyForm({ ...partyForm, partyId: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">{t.parties.taxId} (VKN / TCKN) *</label>
                <input
                  type="text"
                  required
                  placeholder="1234567890"
                  value={partyForm.partyTaxId}
                  onChange={(e) => setPartyForm({ ...partyForm, partyTaxId: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.parties.isExempt}</label>
                  <select
                    value={partyForm.isExempt}
                    onChange={(e) => setPartyForm({ ...partyForm, isExempt: e.target.value })}
                    className="ds-select"
                  >
                    <option value="N">{isTr ? 'Hayır' : 'No'}</option>
                    <option value="Y">{isTr ? 'Evet (Muaf)' : 'Yes (Exempt)'}</option>
                  </select>
                </div>
                <div>
                  <label className="ds-label">{t.parties.isNexus}</label>
                  <select
                    value={partyForm.isNexus}
                    onChange={(e) => setPartyForm({ ...partyForm, isNexus: e.target.value })}
                    className="ds-select"
                  >
                    <option value="Y">{isTr ? 'Evet (Tescilli)' : 'Yes'}</option>
                    <option value="N">{isTr ? 'Hayır' : 'No'}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.parties.fromDate}</label>
                  <input
                    type="date"
                    value={partyForm.fromDate}
                    onChange={(e) => setPartyForm({ ...partyForm, fromDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.parties.thruDate}</label>
                  <input
                    type="date"
                    value={partyForm.thruDate}
                    onChange={(e) => setPartyForm({ ...partyForm, thruDate: e.target.value })}
                    className="ds-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddPartyModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: ADD CATEGORY */}
      {showAddCatModal && (
        <div className="ds-overlay z-[60]">
          <div className="ds-modal max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" />
                {t.categories.newCategory}
              </h3>
              <button
                onClick={() => setShowAddCatModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="ds-label">{t.categories.categoryId} *</label>
                <input
                  type="text"
                  required
                  placeholder="TAX_STD, HARDWARE, etc."
                  value={catForm.productCategoryId}
                  onChange={(e) => setCatForm({ productCategoryId: e.target.value })}
                  className="ds-input"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="ds-btn-secondary"
                >
                  {tc.cancel}
                </button>
                <button type="submit" disabled={loading} className="ds-btn-primary">
                  {tc.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxAuthorityExtendedModal;
