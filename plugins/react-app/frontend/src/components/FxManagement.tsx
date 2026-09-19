import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, RefreshCw, Plus, Search, Trash2, ArrowRightLeft,
  CheckCircle2, AlertCircle, DollarSign, Calculator
} from 'lucide-react';
import { api, FxConversionItem, CurrencyItem, PurposeItem } from '../services/api';
import { useTranslation } from '../i18n';

export const FxManagement: React.FC = () => {
  const { translations, locale } = useTranslation();

  const [conversions, setConversions] = useState<FxConversionItem[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [purposes, setPurposes] = useState<PurposeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [activeOnly, setActiveOnly] = useState<boolean>(false);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<number>(100);
  const [calcFrom, setCalcFrom] = useState<string>('USD');
  const [calcTo, setCalcTo] = useState<string>('EUR');
  const [calcResult, setCalcResult] = useState<number | null>(null);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [formFromUom, setFormFromUom] = useState<string>('USD');
  const [formToUom, setFormToUom] = useState<string>('TRY');
  const [formFactor, setFormFactor] = useState<string>('34.25');
  const [formFromDate, setFormFromDate] = useState<string>('');
  const [formPurpose, setFormPurpose] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchConversions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFxConversions({
        activeOnly: activeOnly ? 'Y' : undefined
      });
      setConversions(res.conversions || []);
      if (res.currencies) setCurrencies(res.currencies);
      if (res.purposes) setPurposes(res.purposes);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch FX conversions');
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    fetchConversions();
  }, [fetchConversions]);

  // Recalculate converter result
  useEffect(() => {
    if (!calcAmount || !calcFrom || !calcTo) {
      setCalcResult(null);
      return;
    }
    if (calcFrom === calcTo) {
      setCalcResult(calcAmount);
      return;
    }
    // Check direct rate
    const direct = conversions.find(c => c.uomId === calcFrom && c.uomIdTo === calcTo && c.isActive);
    if (direct && direct.conversionFactor) {
      setCalcResult(calcAmount * direct.conversionFactor);
      return;
    }
    // Check inverse rate
    const inverse = conversions.find(c => c.uomId === calcTo && c.uomIdTo === calcFrom && c.isActive);
    if (inverse && inverse.conversionFactor && inverse.conversionFactor > 0) {
      setCalcResult(calcAmount / inverse.conversionFactor);
      return;
    }
    setCalcResult(null);
  }, [calcAmount, calcFrom, calcTo, conversions]);

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFromUom || !formToUom || !formFactor) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.createFxConversion({
        uomId: formFromUom,
        uomIdTo: formToUom,
        conversionFactor: parseFloat(formFactor),
        fromDate: formFromDate || undefined,
        purposeEnumId: formPurpose || undefined
      });
      setSuccessMsg(translations.fxRates.successCreated);
      setIsCreateModalOpen(false);
      fetchConversions();
    } catch (err: any) {
      setError(err?.message || 'Failed to save FX rate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRate = async (c: FxConversionItem) => {
    const confirm = window.confirm(translations.fxRates.confirmDelete);
    if (!confirm) return;
    try {
      await api.deleteFxConversion(c.uomId, c.uomIdTo, c.fromDate);
      setSuccessMsg(translations.fxRates.successDeleted);
      fetchConversions();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete FX rate');
    }
  };

  const swapCalcCurrencies = () => {
    const temp = calcFrom;
    setCalcFrom(calcTo);
    setCalcTo(temp);
  };

  // KPIs
  const totalConversions = conversions.length;
  const activeRates = conversions.filter(c => c.isActive).length;
  const uniqueCurrencies = new Set([...conversions.map(c => c.uomId), ...conversions.map(c => c.uomIdTo)]).size;

  const filteredConversions = conversions.filter(c => {
    if (!search) return true;
    const sLower = search.toLowerCase();
    return c.uomId.toLowerCase().includes(sLower) ||
           c.uomIdTo.toLowerCase().includes(sLower) ||
           c.uomDescription.toLowerCase().includes(sLower) ||
           c.uomToDescription.toLowerCase().includes(sLower);
  });

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
            <TrendingUp className="text-indigo-400" size={26} />
            {translations.fxRates.title}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {translations.fxRates.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConversions}
            disabled={loading}
            className="ds-btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{translations.common.refresh}</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="ds-btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span>{translations.fxRates.newRate}</span>
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
          <p className="ds-stat-label">{translations.fxRates.stats.totalConversions}</p>
          <p className="ds-stat-value text-indigo-400">{totalConversions}</p>
        </div>
        <div className="ds-stat-card border-l-4 border-l-emerald-500">
          <p className="ds-stat-label">{translations.fxRates.stats.activeRates}</p>
          <p className="ds-stat-value text-emerald-400">{activeRates}</p>
        </div>
        <div className="ds-stat-card border-l-4 border-l-amber-500">
          <p className="ds-stat-label">{translations.fxRates.stats.currenciesCount}</p>
          <p className="ds-stat-value text-amber-400">{uniqueCurrencies || currencies.length}</p>
        </div>
        <div className="ds-stat-card border-l-4 border-l-blue-500">
          <p className="ds-stat-label">{translations.fxRates.stats.baseCurrency}</p>
          <p className="ds-stat-value text-blue-400 text-lg">USD / EUR / TRY</p>
        </div>
      </div>

      {/* Live Currency Converter Widget */}
      <div className="ds-card p-5 border border-indigo-500/20 bg-gradient-to-r from-slate-900 to-indigo-950/40">
        <div className="flex items-center gap-2 mb-3 text-indigo-400 font-semibold text-sm">
          <Calculator size={18} />
          <span>{translations.fxRates.calculator}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{translations.fxRates.convertAmount}</label>
            <input
              type="number"
              value={calcAmount}
              onChange={(e) => setCalcAmount(parseFloat(e.target.value) || 0)}
              className="ds-input"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">{translations.fxRates.sourceCurrency}</label>
            <select
              value={calcFrom}
              onChange={(e) => setCalcFrom(e.target.value)}
              className="ds-select"
            >
              {currencies.map(c => (
                <option key={c.uomId} value={c.uomId}>{c.uomId} - {c.description}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={swapCalcCurrencies}
              className="mt-5 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              title="Değiştir"
            >
              <ArrowRightLeft size={16} />
            </button>
            <div className="flex-1">
              <label className="text-xs text-slate-400 mb-1 block">{translations.fxRates.targetCurrency}</label>
              <select
                value={calcTo}
                onChange={(e) => setCalcTo(e.target.value)}
                className="ds-select"
              >
                {currencies.map(c => (
                  <option key={c.uomId} value={c.uomId}>{c.uomId} - {c.description}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-slate-900/80 border border-slate-700/60 p-3 rounded-xl">
            <span className="text-xs text-slate-400 block">{translations.fxRates.result}</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {calcResult !== null
                ? new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency: calcTo || 'USD' }).format(calcResult)
                : <span className="text-xs text-slate-500">Parite bulunamadı</span>}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="ds-card p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={translations.fxRates.searchPlaceholder}
              className="ds-input pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
            />
            <span>{translations.fxRates.active}</span>
          </label>
        </div>
      </div>

      {/* Exchange Rates Table */}
      <div className="ds-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="ds-spinner"></div>
          </div>
        ) : filteredConversions.length === 0 ? (
          <div className="ds-empty py-16 text-center">
            <DollarSign size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium">{translations.fxRates.noRates}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{translations.fxRates.sourceCurrency}</th>
                  <th className="ds-th">{translations.fxRates.targetCurrency}</th>
                  <th className="ds-th">{translations.fxRates.rate}</th>
                  <th className="ds-th">{translations.fxRates.effectiveDate}</th>
                  <th className="ds-th">{translations.fxRates.thruDate}</th>
                  <th className="ds-th">{translations.fxRates.status}</th>
                  <th className="ds-th text-right">{translations.common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredConversions.map((c, idx) => (
                  <tr key={`${c.uomId}-${c.uomIdTo}-${idx}`} className="ds-tbody-row hover:bg-slate-800/40">
                    <td className="ds-td font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono text-xs font-bold">
                          {c.uomId}
                        </span>
                        <div>
                          <span>{c.uomDescription}</span>
                          <span className="block text-xs text-slate-500">1 {c.uomId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="ds-td font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold">
                          {c.uomIdTo}
                        </span>
                        <div>
                          <span>{c.uomToDescription}</span>
                        </div>
                      </div>
                    </td>
                    <td className="ds-td font-mono font-bold text-emerald-400 text-sm">
                      {c.conversionFactor.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {c.uomIdTo}
                    </td>
                    <td className="ds-td text-slate-300 font-mono text-xs">
                      {formatDateStr(c.fromDate)}
                    </td>
                    <td className="ds-td text-slate-400 font-mono text-xs">
                      {formatDateStr(c.thruDate)}
                    </td>
                    <td className="ds-td">
                      {c.isActive ? (
                        <span className="ds-badge ds-badge-green">{translations.fxRates.active}</span>
                      ) : (
                        <span className="ds-badge ds-badge-slate">{translations.fxRates.expired}</span>
                      )}
                    </td>
                    <td className="ds-td text-right">
                      <button
                        onClick={() => handleDeleteRate(c)}
                        title={translations.common.delete}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors"
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

      {/* New FX Rate Modal */}
      {isCreateModalOpen && (
        <div className="ds-overlay">
          <div className="ds-modal max-w-lg w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="text-indigo-400" size={20} />
                  {translations.fxRates.newRate}
                </h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreateRate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label">{translations.fxRates.sourceCurrency} *</label>
                    <select
                      value={formFromUom}
                      onChange={(e) => setFormFromUom(e.target.value)}
                      required
                      className="ds-select"
                    >
                      {currencies.map(c => (
                        <option key={c.uomId} value={c.uomId}>{c.uomId} - {c.description}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ds-label">{translations.fxRates.targetCurrency} *</label>
                    <select
                      value={formToUom}
                      onChange={(e) => setFormToUom(e.target.value)}
                      required
                      className="ds-select"
                    >
                      {currencies.map(c => (
                        <option key={c.uomId} value={c.uomId}>{c.uomId} - {c.description}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="ds-label">{translations.fxRates.rate} *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.000001"
                      value={formFactor}
                      onChange={(e) => setFormFactor(e.target.value)}
                      placeholder="Örn: 34.25"
                      required
                      className="ds-input font-mono"
                    />
                  </div>
                  <span className="text-xs text-slate-500 mt-1 block">
                    1 {formFromUom} = {formFactor || '0'} {formToUom}
                  </span>
                </div>

                <div>
                  <label className="ds-label">{translations.fxRates.effectiveDate}</label>
                  <input
                    type="date"
                    value={formFromDate}
                    onChange={(e) => setFormFromDate(e.target.value)}
                    className="ds-input"
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    Boş bırakılırsa geçerlilik başlangıcı anlık tarih/saat alınacaktır.
                  </span>
                </div>

                {purposes.length > 0 && (
                  <div>
                    <label className="ds-label">{translations.fxRates.purpose}</label>
                    <select
                      value={formPurpose}
                      onChange={(e) => setFormPurpose(e.target.value)}
                      className="ds-select"
                    >
                      <option value="">-- {translations.common.none} --</option>
                      {purposes.map(p => (
                        <option key={p.enumId} value={p.enumId}>{p.description}</option>
                      ))}
                    </select>
                  </div>
                )}

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
    </div>
  );
};
