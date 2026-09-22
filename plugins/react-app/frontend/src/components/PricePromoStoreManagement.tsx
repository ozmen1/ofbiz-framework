import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  Tag,
  Sparkles,
  Store,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  BadgePercent,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  PricePromoStoreMetadata,
  ProductPriceRuleItem,
  ProductPromoItem,
  ProductStoreItem,
  fetchPricePromoStoreMetadata,
  fetchProductPriceRules,
  createProductPriceRule,
  updateProductPriceRule,
  deleteProductPriceRule,
  fetchProductPromos,
  createProductPromo,
  updateProductPromo,
  deleteProductPromo,
  fetchProductStores,
  createProductStore,
  updateProductStore,
} from '../services/pricePromoStoreService';
import { CreatePriceRuleModal } from './CreatePriceRuleModal';
import { PriceRuleDetailModal } from './PriceRuleDetailModal';
import { CreatePromoModal } from './CreatePromoModal';
import { PromoDetailModal } from './PromoDetailModal';
import { CreateStoreModal } from './CreateStoreModal';
import { StoreDetailModal } from './StoreDetailModal';

interface PricePromoStoreManagementProps {
  initialTab?: 'rules' | 'promos' | 'stores';
}

export const PricePromoStoreManagement: React.FC<PricePromoStoreManagementProps> = ({
  initialTab = 'rules',
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  // Active Tab
  const [activeTab, setActiveTab] = useState<'rules' | 'promos' | 'stores'>(initialTab);

  // Sync tab if initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Data states
  const [metadata, setMetadata] = useState<PricePromoStoreMetadata | null>(null);
  const [rules, setRules] = useState<ProductPriceRuleItem[]>([]);
  const [promos, setPromos] = useState<ProductPromoItem[]>([]);
  const [stores, setStores] = useState<ProductStoreItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalRules: 0,
    saleRules: 0,
    totalPromos: 0,
    totalStores: 0,
  });

  // Filters & Search
  const [searchRule, setSearchRule] = useState('');
  const [searchPromo, setSearchPromo] = useState('');
  const [searchStore, setSearchStore] = useState('');

  // Loading & Toast
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isCreateRuleModalOpen, setIsCreateRuleModalOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<ProductPriceRuleItem | null>(null);
  const [selectedRuleIdForDetail, setSelectedRuleIdForDetail] = useState<string | null>(null);

  const [isCreatePromoModalOpen, setIsCreatePromoModalOpen] = useState(false);
  const [promoToEdit, setPromoToEdit] = useState<ProductPromoItem | null>(null);
  const [selectedPromoIdForDetail, setSelectedPromoIdForDetail] = useState<string | null>(null);

  const [isCreateStoreModalOpen, setIsCreateStoreModalOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<ProductStoreItem | null>(null);
  const [selectedStoreIdForDetail, setSelectedStoreIdForDetail] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Metadata Loader
  const loadMetadata = useCallback(async () => {
    try {
      const meta = await fetchPricePromoStoreMetadata();
      setMetadata(meta);
    } catch (err: unknown) {
      console.error('Error loading metadata:', err);
    }
  }, []);

  // 2. Price Rules Loader
  const loadRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchProductPriceRules({ searchKeyword: searchRule });
      setRules(res.rules || []);
      setMetrics((prev) => ({
        ...prev,
        totalRules: res.metrics?.totalRules || res.totalCount || 0,
        saleRules: res.metrics?.saleRules || 0,
        totalPromos: res.metrics?.totalPromos || prev.totalPromos,
        totalStores: res.metrics?.totalStores || prev.totalStores,
      }));
    } catch (err: unknown) {
      console.error('Error loading price rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchRule]);

  // 3. Promos Loader
  const loadPromos = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchProductPromos({ searchKeyword: searchPromo });
      setPromos(res.promos || []);
      setMetrics((prev) => ({
        ...prev,
        totalPromos: res.totalCount || 0,
      }));
    } catch (err: unknown) {
      console.error('Error loading promos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchPromo]);

  // 4. Stores Loader
  const loadStores = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchProductStores({ searchKeyword: searchStore });
      setStores(res.stores || []);
      setMetrics((prev) => ({
        ...prev,
        totalStores: res.totalCount || 0,
      }));
    } catch (err: unknown) {
      console.error('Error loading stores:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchStore]);

  // Initial load
  useEffect(() => {
    loadMetadata();
    loadRules();
    loadPromos();
    loadStores();
  }, [loadMetadata, loadRules, loadPromos, loadStores]);

  const refreshAll = () => {
    loadMetadata();
    loadRules();
    loadPromos();
    loadStores();
  };

  // Price Rule Handlers
  const handleSaveRule = async (payload: {
    productPriceRuleId?: string;
    ruleName: string;
    description?: string;
    isSale?: string;
    fromDate?: string;
    thruDate?: string;
  }) => {
    if (ruleToEdit) {
      await updateProductPriceRule({
        productPriceRuleId: ruleToEdit.productPriceRuleId,
        ...payload,
      });
      showToast(t.ruleUpdatedSuccess);
    } else {
      await createProductPriceRule(payload);
      showToast(t.ruleCreatedSuccess);
    }
    loadRules();
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!window.confirm(t.confirmDeletePriceRule)) return;
    try {
      await deleteProductPriceRule(ruleId);
      showToast(t.ruleDeletedSuccess);
      loadRules();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Promo Handlers
  const handleSavePromo = async (payload: {
    productPromoId?: string;
    promoName: string;
    promoText?: string;
    userEntered?: string;
    showToCustomer?: string;
    requireCode?: string;
    useLimitPerOrder?: number;
    useLimitPerCustomer?: number;
    useLimitPerPromotion?: number;
    fromDate?: string;
    thruDate?: string;
  }) => {
    if (promoToEdit) {
      await updateProductPromo({
        productPromoId: promoToEdit.productPromoId,
        ...payload,
      });
      showToast(t.promoUpdatedSuccess);
    } else {
      await createProductPromo(payload);
      showToast(t.promoCreatedSuccess);
    }
    loadPromos();
  };

  const handleDeletePromo = async (promoId: string) => {
    if (!window.confirm(t.confirmDeletePromo)) return;
    try {
      await deleteProductPromo(promoId);
      showToast(t.promoDeletedSuccess);
      loadPromos();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Store Handlers
  const handleSaveStore = async (payload: {
    productStoreId?: string;
    storeName: string;
    companyName?: string;
    title?: string;
    subtitle?: string;
    inventoryFacilityId?: string;
    defaultCurrencyUomId?: string;
    defaultLocaleString?: string;
  }) => {
    if (storeToEdit) {
      await updateProductStore({
        productStoreId: storeToEdit.productStoreId,
        ...payload,
      });
      showToast(t.storeUpdatedSuccess);
    } else {
      await createProductStore(payload);
      showToast(t.storeCreatedSuccess);
    }
    loadStores();
    loadMetadata();
  };

  // Memoized empty metadata fallback
  const safeMetadata = useMemo<PricePromoStoreMetadata>(() => {
    return (
      metadata || {
        priceActionTypes: [],
        priceCondTypes: [],
        promoActions: [],
        promoConds: [],
        promoOperators: [],
        categories: [],
        catalogs: [],
        stores: [],
        facilities: [],
        currencies: [],
      }
    );
  }, [metadata]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[90] flex items-center space-x-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl shadow-emerald-600/30">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30">
            <BadgePercent className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {activeTab === 'stores'
                ? t.storesTitle
                : activeTab === 'promos'
                ? t.promosTitle
                : t.priceRulesTitle}
            </h1>
            <p className="text-sm text-slate-400">
              OFBiz dinamik fiyatlandırma kuralları, promosyon motoru ve mağaza-katalog dağıtımı.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refreshAll}
            disabled={isLoading}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
            title={common.refresh}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{common.refresh}</span>
          </button>

          {activeTab === 'rules' && (
            <button
              type="button"
              onClick={() => {
                setRuleToEdit(null);
                setIsCreateRuleModalOpen(true);
              }}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createPriceRule}</span>
            </button>
          )}

          {activeTab === 'promos' && (
            <button
              type="button"
              onClick={() => {
                setPromoToEdit(null);
                setIsCreatePromoModalOpen(true);
              }}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createPromo}</span>
            </button>
          )}

          {activeTab === 'stores' && (
            <button
              type="button"
              onClick={() => {
                setStoreToEdit(null);
                setIsCreateStoreModalOpen(true);
              }}
              className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createStore}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalPriceRules}</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Tag size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.totalRules}
          </p>
        </div>

        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.saleRules}</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <BadgePercent size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.saleRules}
          </p>
        </div>

        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalPromotions}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Sparkles size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.totalPromos}
          </p>
        </div>

        <div className="ds-stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.totalStores}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Store size={18} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {metrics.totalStores}
          </p>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="ds-tab-bar">
        {[
          { id: 'rules', label: t.priceRulesTab, icon: <Tag size={15} />, count: rules.length },
          { id: 'promos', label: t.promosTab, icon: <Sparkles size={15} />, count: promos.length },
          { id: 'stores', label: t.storesTab, icon: <Store size={15} />, count: stores.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`ds-tab ${activeTab === tab.id ? 'ds-tab-active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: PRICE RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchRulesPlaceholder}
                value={searchRule}
                onChange={(e) => setSearchRule(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {rules.length} {t.priceRulesTab} listelendi
            </span>
          </div>

          {/* Rules Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.ruleId}</th>
                  <th className="ds-th">{t.ruleName}</th>
                  <th className="ds-th">{t.isSale}</th>
                  <th className="ds-th">{t.conditions}</th>
                  <th className="ds-th">{t.actions}</th>
                  <th className="ds-th">{common.date}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rules.length > 0 ? (
                  rules.map((r) => (
                    <tr
                      key={r.productPriceRuleId}
                      className="ds-tbody-row cursor-pointer group"
                      onClick={() => setSelectedRuleIdForDetail(r.productPriceRuleId)}
                    >
                      <td className="ds-td-mono font-medium text-cyan-600 dark:text-cyan-400">
                        {r.productPriceRuleId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                          {r.ruleName}
                        </div>
                        {r.description && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {r.description}
                          </div>
                        )}
                      </td>
                      <td className="ds-td">
                        {r.isSale === 'Y' ? (
                          <span className="ds-badge ds-badge-red">
                            {t.isSale}
                          </span>
                        ) : (
                          <span className="ds-badge ds-badge-slate">
                            Standart
                          </span>
                        )}
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-yellow font-mono">
                          {r.condCount || 0} Koşul
                        </span>
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-green font-mono">
                          {r.actionCount || 0} Aksiyon
                        </span>
                      </td>
                      <td className="ds-td font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {r.fromDate ? r.fromDate.substring(0, 10) : '-'}
                        {r.thruDate && ` → ${r.thruDate.substring(0, 10)}`}
                      </td>
                      <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRuleIdForDetail(r.productPriceRuleId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t.priceRuleDetail}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRuleToEdit(r);
                              setIsCreateRuleModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(r.productPriceRuleId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="ds-empty">
                      {t.noPriceRulesFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PROMOTIONS */}
      {activeTab === 'promos' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchPromosPlaceholder}
                value={searchPromo}
                onChange={(e) => setSearchPromo(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {promos.length} {t.promosTab} listelendi
            </span>
          </div>

          {/* Promos Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.promoId}</th>
                  <th className="ds-th">{t.promoName}</th>
                  <th className="ds-th">{t.requireCode}</th>
                  <th className="ds-th">{t.codeCount}</th>
                  <th className="ds-th">{t.ruleCount}</th>
                  <th className="ds-th">{common.date}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {promos.length > 0 ? (
                  promos.map((p) => (
                    <tr
                      key={p.productPromoId}
                      className="ds-tbody-row cursor-pointer group"
                      onClick={() => setSelectedPromoIdForDetail(p.productPromoId)}
                    >
                      <td className="ds-td-mono font-medium text-purple-600 dark:text-purple-400">
                        {p.productPromoId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                          {p.promoName}
                        </div>
                        {p.promoText && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {p.promoText}
                          </div>
                        )}
                      </td>
                      <td className="ds-td">
                        {p.requireCode === 'Y' ? (
                          <span className="ds-badge ds-badge-yellow">
                            {t.requireCode}
                          </span>
                        ) : (
                          <span className="ds-badge ds-badge-green">
                            Otomatik
                          </span>
                        )}
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-purple font-mono">
                          {p.codeCount || 0} Kupon
                        </span>
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-blue font-mono">
                          {p.ruleCount || 0} Kural
                        </span>
                      </td>
                      <td className="ds-td font-mono text-slate-500 dark:text-slate-400 text-xs">
                        {p.fromDate ? p.fromDate.substring(0, 10) : '-'}
                        {p.thruDate && ` → ${p.thruDate.substring(0, 10)}`}
                      </td>
                      <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedPromoIdForDetail(p.productPromoId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t.promoDetail}
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPromoToEdit(p);
                              setIsCreatePromoModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePromo(p.productPromoId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="ds-empty">
                      {t.noPromosFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STORES & CATALOG DISTRIBUTION */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.searchStoresPlaceholder}
                value={searchStore}
                onChange={(e) => setSearchStore(e.target.value)}
                className="ds-input pl-10"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {stores.length} {t.storesTab} listelendi
            </span>
          </div>

          {/* Stores Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 shadow-xs">
            <table className="ds-table">
              <thead>
                <tr className="ds-thead-row">
                  <th className="ds-th">{t.storeId}</th>
                  <th className="ds-th">{t.storeName}</th>
                  <th className="ds-th">{t.companyName}</th>
                  <th className="ds-th">{t.warehouse}</th>
                  <th className="ds-th">{t.defaultCurrency}</th>
                  <th className="ds-th">{t.assignedCatalogs}</th>
                  <th className="ds-th-right">{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {stores.length > 0 ? (
                  stores.map((s) => (
                    <tr
                      key={s.productStoreId}
                      className="ds-tbody-row cursor-pointer group"
                      onClick={() => setSelectedStoreIdForDetail(s.productStoreId)}
                    >
                      <td className="ds-td-mono font-medium text-blue-600 dark:text-blue-400">
                        {s.productStoreId}
                      </td>
                      <td className="ds-td">
                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                          {s.storeName}
                        </div>
                        {s.title && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                            {s.title}
                          </div>
                        )}
                      </td>
                      <td className="ds-td">
                        {s.companyName || '-'}
                      </td>
                      <td className="ds-td">
                        {s.facilityName || s.inventoryFacilityId || '-'}
                      </td>
                      <td className="ds-td-mono font-bold text-slate-700 dark:text-slate-200">
                        {s.defaultCurrencyUomId || 'USD'}
                      </td>
                      <td className="ds-td">
                        <span className="ds-badge ds-badge-blue font-mono">
                          {s.catalogCount || 0} Katalog
                        </span>
                      </td>
                      <td className="ds-td-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedStoreIdForDetail(s.productStoreId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t.storeDetail}
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStoreToEdit(s);
                              setIsCreateStoreModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={common.edit}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="ds-empty">
                      {t.noStoresFound}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Create/Edit Price Rule Modal */}
      {isCreateRuleModalOpen && (
        <CreatePriceRuleModal
          isOpen={isCreateRuleModalOpen}
          onClose={() => {
            setIsCreateRuleModalOpen(false);
            setRuleToEdit(null);
          }}
          onSuccess={() => {}}
          ruleToEdit={ruleToEdit}
          onSave={handleSaveRule}
        />
      )}

      {/* 2. Price Rule Detail Modal */}
      {selectedRuleIdForDetail && (
        <PriceRuleDetailModal
          isOpen={!!selectedRuleIdForDetail}
          onClose={() => setSelectedRuleIdForDetail(null)}
          productPriceRuleId={selectedRuleIdForDetail}
          metadata={safeMetadata}
          onRuleChanged={loadRules}
        />
      )}

      {/* 3. Create/Edit Promo Modal */}
      {isCreatePromoModalOpen && (
        <CreatePromoModal
          isOpen={isCreatePromoModalOpen}
          onClose={() => {
            setIsCreatePromoModalOpen(false);
            setPromoToEdit(null);
          }}
          onSuccess={() => {}}
          promoToEdit={promoToEdit}
          onSave={handleSavePromo}
        />
      )}

      {/* 4. Promo Detail Modal */}
      {selectedPromoIdForDetail && (
        <PromoDetailModal
          isOpen={!!selectedPromoIdForDetail}
          onClose={() => setSelectedPromoIdForDetail(null)}
          productPromoId={selectedPromoIdForDetail}
          onPromoChanged={loadPromos}
        />
      )}

      {/* 5. Create/Edit Store Modal */}
      {isCreateStoreModalOpen && (
        <CreateStoreModal
          isOpen={isCreateStoreModalOpen}
          onClose={() => {
            setIsCreateStoreModalOpen(false);
            setStoreToEdit(null);
          }}
          onSuccess={() => {}}
          metadata={safeMetadata}
          storeToEdit={storeToEdit}
          onSave={handleSaveStore}
        />
      )}

      {/* 6. Store Detail Modal */}
      {selectedStoreIdForDetail && (
        <StoreDetailModal
          isOpen={!!selectedStoreIdForDetail}
          onClose={() => setSelectedStoreIdForDetail(null)}
          productStoreId={selectedStoreIdForDetail}
          metadata={safeMetadata}
          onStoreChanged={loadStores}
        />
      )}
    </div>
  );
};
