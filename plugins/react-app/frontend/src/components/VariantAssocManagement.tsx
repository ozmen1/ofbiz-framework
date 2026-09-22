import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  GitFork,
  Sparkles,
  Layers,
  Wand2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  Tag,
  Hash,
} from 'lucide-react';
import {
  VariantAssocMetadata,
  ProductFeatureItem,
  FeatureCategoryItem,
  ProductAssocItem,
  fetchVariantAssocMetadata,
  fetchProductFeatures,
  createProductFeature,
  updateProductFeature,
  deleteProductFeature,
  fetchProductFeatureCategories,
  createProductFeatureCategory,
  fetchProductAssocs,
  createProductAssoc,
  deleteProductAssoc,
  quickCreateVariant,
} from '../services/variantAssocService';
import { CreateFeatureModal } from './CreateFeatureModal';
import { CreateFeatureCategoryModal } from './CreateFeatureCategoryModal';
import { CreateProductAssocModal } from './CreateProductAssocModal';
import { QuickVariantModal } from './QuickVariantModal';

export const VariantAssocManagement: React.FC = () => {
  const { translations } = useTranslation();
  const t = translations.productVariantsAssocs;
  const common = translations.common;

  // Active Tab: 'assocs' | 'features' | 'categories'
  const [activeTab, setActiveTab] = useState<'assocs' | 'features' | 'categories'>('assocs');

  // Data states
  const [metadata, setMetadata] = useState<VariantAssocMetadata | null>(null);
  const [features, setFeatures] = useState<ProductFeatureItem[]>([]);
  const [featureCategories, setFeatureCategories] = useState<FeatureCategoryItem[]>([]);
  const [assocs, setAssocs] = useState<ProductAssocItem[]>([]);
  const [metrics, setMetrics] = useState({
    totalFeatures: 0,
    totalFeatureCategories: 0,
    totalFeatureAppls: 0,
    totalAssocs: 0,
  });

  // Filters
  const [searchFeature, setSearchFeature] = useState('');
  const [selectedFeatureTypeFilter, setSelectedFeatureTypeFilter] = useState('');
  const [selectedAssocTypeFilter, setSelectedAssocTypeFilter] = useState('');
  const [searchAssocKeyword, setSearchAssocKeyword] = useState('');

  // Loading & Toast
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [featureToEdit, setFeatureToEdit] = useState<ProductFeatureItem | null>(null);

  const [isFeatureCategoryModalOpen, setIsFeatureCategoryModalOpen] = useState(false);
  const [isAssocModalOpen, setIsAssocModalOpen] = useState(false);
  const [isQuickVariantModalOpen, setIsQuickVariantModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Load Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const meta = await fetchVariantAssocMetadata();
      setMetadata(meta);
    } catch {
      // ignore
    }
  }, []);

  // 2. Load Features
  const loadFeatures = useCallback(async () => {
    try {
      const res = await fetchProductFeatures({
        searchKeyword: searchFeature || undefined,
        productFeatureTypeId: selectedFeatureTypeFilter || undefined,
        viewSize: 100,
      });
      setFeatures(res.features || []);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch {
      // ignore
    }
  }, [searchFeature, selectedFeatureTypeFilter]);

  // 3. Load Feature Categories
  const loadFeatureCategories = useCallback(async () => {
    try {
      const res = await fetchProductFeatureCategories();
      setFeatureCategories(res.categories || []);
    } catch {
      // ignore
    }
  }, []);

  // 4. Load Assocs
  const loadAssocs = useCallback(async () => {
    try {
      const res = await fetchProductAssocs({
        productAssocTypeId: selectedAssocTypeFilter || undefined,
      });
      // Combine outgoing and incoming into one flat list
      setAssocs(res.outgoingAssocs || []);
    } catch {
      // ignore
    }
  }, [selectedAssocTypeFilter]);

  // Refresh All
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadMetadata(), loadFeatures(), loadFeatureCategories(), loadAssocs()]);
    setIsLoading(false);
  }, [loadMetadata, loadFeatures, loadFeatureCategories, loadAssocs]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Feature Handlers
  const handleSaveFeature = async (payload: {
    productFeatureId?: string;
    productFeatureTypeId: string;
    productFeatureCategoryId?: string;
    description: string;
    idCode?: string;
    defaultAmount?: number;
    defaultSequenceNum?: number;
  }) => {
    if (featureToEdit) {
      await updateProductFeature({
        productFeatureId: featureToEdit.productFeatureId,
        productFeatureTypeId: payload.productFeatureTypeId,
        productFeatureCategoryId: payload.productFeatureCategoryId,
        description: payload.description,
        idCode: payload.idCode,
        defaultAmount: payload.defaultAmount,
        defaultSequenceNum: payload.defaultSequenceNum,
      });
      showToast(t.featureUpdatedSuccess);
    } else {
      await createProductFeature(payload);
      showToast(t.featureCreatedSuccess);
    }
    loadFeatures();
    loadMetadata();
  };

  const handleDeleteFeature = async (featureId: string) => {
    if (!window.confirm(t.confirmDeleteFeature)) return;
    try {
      await deleteProductFeature(featureId);
      showToast(t.featureDeletedSuccess);
      loadFeatures();
      loadMetadata();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Feature Category Handlers
  const handleSaveFeatureCategory = async (payload: {
    productFeatureCategoryId?: string;
    description: string;
  }) => {
    await createProductFeatureCategory(payload);
    showToast(t.featureCategoryCreatedSuccess);
    loadFeatureCategories();
    loadMetadata();
  };

  // Assoc Handlers
  const handleSaveAssoc = async (payload: {
    productId: string;
    productIdTo: string;
    productAssocTypeId?: string;
    sequenceNum?: number;
    reason?: string;
    quantity?: number;
  }) => {
    await createProductAssoc(payload);
    showToast(t.assocCreatedSuccess);
    loadAssocs();
    loadFeatures(); // update metrics
  };

  const handleDeleteAssoc = async (assoc: ProductAssocItem) => {
    if (!window.confirm(t.confirmDeleteAssoc)) return;
    try {
      await deleteProductAssoc({
        productId: assoc.productId,
        productIdTo: assoc.productIdTo,
        productAssocTypeId: assoc.productAssocTypeId,
        fromDate: assoc.fromDate || '',
      });
      showToast(t.assocDeletedSuccess);
      loadAssocs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Quick Variant Wizard Handler
  const handleQuickVariant = async (payload: {
    virtualProductId: string;
    variantProductId?: string;
    variantProductName: string;
    featureIds?: string;
    price?: number;
    currencyUomId?: string;
    description?: string;
  }) => {
    await quickCreateVariant(payload);
    showToast(t.variantCreatedSuccess);
    loadAssocs();
    loadFeatures();
    loadMetadata();
  };

  // Filtered Assocs for table
  const filteredAssocs = useMemo(() => {
    if (!searchAssocKeyword) return assocs;
    const kw = searchAssocKeyword.toLowerCase();
    return assocs.filter(
      (a) =>
        a.productId.toLowerCase().includes(kw) ||
        a.productIdTo.toLowerCase().includes(kw) ||
        a.targetProductName?.toLowerCase().includes(kw) ||
        a.productAssocTypeDesc?.toLowerCase().includes(kw)
    );
  }, [assocs, searchAssocKeyword]);

  // Virtual products for quick variant wizard
  const virtualProducts = useMemo(() => {
    return metadata?.products || [];
  }, [metadata?.products]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[90] bg-slate-900 border border-indigo-500/50 text-indigo-300 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <GitFork className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
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

          <button
            type="button"
            onClick={() => setIsAssocModalOpen(true)}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3.5 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createAssoc}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickVariantModalOpen(true)}
            className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            <Wand2 className="w-4 h-4" />
            <span>{t.quickVariantWizard}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Features */}
        <div className="ds-stat-card border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalFeatures}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-purple-300 font-mono">
            {metrics.totalFeatures || features.length}
          </span>
          <span className="ds-stat-sub text-slate-400">Özellik / Varyant Tanımı</span>
        </div>

        {/* Feature Categories */}
        <div className="ds-stat-card border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalFeatureCategories}</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-indigo-300 font-mono">
            {metrics.totalFeatureCategories || featureCategories.length}
          </span>
          <span className="ds-stat-sub text-slate-400">Özellik Grubu</span>
        </div>

        {/* Applied Features */}
        <div className="ds-stat-card border-l-pink-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalFeatureAppls}</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-pink-300 font-mono">
            {metrics.totalFeatureAppls}
          </span>
          <span className="ds-stat-sub text-slate-400">Aktif Eşleştirme</span>
        </div>

        {/* Total Associations */}
        <div className="ds-stat-card border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalAssocs}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-emerald-300 font-mono">
            {metrics.totalAssocs}
          </span>
          <span className="ds-stat-sub text-slate-400">Bağlantı & Varyant</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="ds-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab('assocs')}
            className={`ds-tab ${activeTab === 'assocs' ? 'ds-tab-active' : ''}`}
          >
            <GitFork className="w-4 h-4 mr-1.5 inline" />
            <span>{t.tabAssocsAndVariants}</span>
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-700/60 font-mono">
              {metrics.totalAssocs}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('features')}
            className={`ds-tab ${activeTab === 'features' ? 'ds-tab-active' : ''}`}
          >
            <Sparkles className="w-4 h-4 mr-1.5 inline" />
            <span>{t.tabFeatures}</span>
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-700/60 font-mono">
              {features.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`ds-tab ${activeTab === 'categories' ? 'ds-tab-active' : ''}`}
          >
            <Layers className="w-4 h-4 mr-1.5 inline" />
            <span>{t.tabFeatureCategories}</span>
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-700/60 font-mono">
              {featureCategories.length}
            </span>
          </button>
        </div>

        {/* Sub-actions per tab */}
        {activeTab === 'features' && (
          <button
            type="button"
            onClick={() => {
              setFeatureToEdit(null);
              setIsFeatureModalOpen(true);
            }}
            className="ds-btn-secondary text-xs py-1.5 px-3 self-end sm:self-auto flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>{t.createFeature}</span>
          </button>
        )}

        {activeTab === 'categories' && (
          <button
            type="button"
            onClick={() => setIsFeatureCategoryModalOpen(true)}
            className="ds-btn-secondary text-xs py-1.5 px-3 self-end sm:self-auto flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>{t.createFeatureCategory}</span>
          </button>
        )}
      </div>

      {/* TAB 1: Associations & Variants */}
      {activeTab === 'assocs' && (
        <div className="space-y-4">
          <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchAssocKeyword}
                onChange={(e) => setSearchAssocKeyword(e.target.value)}
                placeholder={t.searchAssocsPlaceholder}
                className="ds-input pl-9 text-xs"
              />
            </div>

            <select
              value={selectedAssocTypeFilter}
              onChange={(e) => setSelectedAssocTypeFilter(e.target.value)}
              className="ds-select text-xs sm:w-64"
            >
              <option value="">-- Tüm İlişki Türleri --</option>
              {metadata?.assocTypes.map((type) => (
                <option key={type.productAssocTypeId} value={type.productAssocTypeId}>
                  {type.description || type.productAssocTypeId}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr className="ds-thead-row">
                    <th className="ds-th">{t.sourceProduct}</th>
                    <th className="ds-th">{t.assocType}</th>
                    <th className="ds-th">{t.targetProduct}</th>
                    <th className="ds-th text-center">{t.defaultSequence}</th>
                    <th className="ds-th">{t.reason}</th>
                    <th className="ds-th-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {filteredAssocs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                        {t.noAssocsFound}
                      </td>
                    </tr>
                  ) : (
                    filteredAssocs.map((assoc) => (
                      <tr
                        key={`${assoc.productId}-${assoc.productIdTo}-${assoc.productAssocTypeId}-${assoc.fromDate}`}
                        className="ds-tbody-row"
                      >
                        <td className="ds-td">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {assoc.productId}
                          </span>
                          {assoc.sourceProductName && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {assoc.sourceProductName}
                            </span>
                          )}
                        </td>

                        <td className="ds-td">
                          <span className={`ds-badge ${
                            assoc.productAssocTypeId === 'PRODUCT_VARIANT'
                              ? 'ds-badge-purple'
                              : assoc.productAssocTypeId === 'PRODUCT_UPGRADE'
                              ? 'ds-badge-yellow'
                              : assoc.productAssocTypeId === 'PRODUCT_COMPLEMENT'
                              ? 'ds-badge-green'
                              : 'ds-badge-blue'
                          }`}>
                            {assoc.productAssocTypeDesc || assoc.productAssocTypeId}
                          </span>
                        </td>

                        <td className="ds-td">
                          <span className="font-mono font-bold text-slate-900 dark:text-white block">
                            {assoc.productIdTo}
                          </span>
                          {assoc.targetProductName && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {assoc.targetProductName}
                            </span>
                          )}
                        </td>

                        <td className="ds-td text-center font-mono text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center space-x-0.5">
                            <Hash className="w-3 h-3 text-slate-500" />
                            <span>{assoc.sequenceNum || 1}</span>
                          </span>
                        </td>

                        <td className="ds-td text-slate-500 dark:text-slate-400">
                          {assoc.reason || '-'}
                        </td>

                        <td className="ds-td-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAssoc(assoc)}
                            title={common.delete}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* TAB 2: Product Features */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchFeature}
                onChange={(e) => setSearchFeature(e.target.value)}
                placeholder={t.searchFeaturesPlaceholder}
                className="ds-input pl-9 text-xs"
              />
            </div>

            <select
              value={selectedFeatureTypeFilter}
              onChange={(e) => setSelectedFeatureTypeFilter(e.target.value)}
              className="ds-select text-xs sm:w-64"
            >
              <option value="">-- Tüm Özellik Türleri --</option>
              {metadata?.featureTypes.map((type) => (
                <option key={type.productFeatureTypeId} value={type.productFeatureTypeId}>
                  {type.description || type.productFeatureTypeId}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr className="ds-thead-row">
                    <th className="ds-th">Özellik Kodu</th>
                    <th className="ds-th">{t.featureName}</th>
                    <th className="ds-th">{t.featureType}</th>
                    <th className="ds-th">{t.featureCategory}</th>
                    <th className="ds-th">{t.defaultAmount}</th>
                    <th className="ds-th text-center">{t.applCount}</th>
                    <th className="ds-th-right">{common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                  {features.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        {t.noFeaturesFound}
                      </td>
                    </tr>
                  ) : (
                    features.map((feature) => (
                      <tr
                        key={feature.productFeatureId}
                        className="ds-tbody-row"
                      >
                        <td className="ds-td font-mono font-medium text-slate-900 dark:text-slate-200">
                          {feature.productFeatureId}
                        </td>

                        <td className="ds-td font-medium text-slate-900 dark:text-white">
                          {feature.description}
                          {feature.idCode && (
                            <span className="text-[10px] font-mono text-purple-400 ml-2 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">
                              {feature.idCode}
                            </span>
                          )}
                        </td>

                        <td className="ds-td text-slate-500 dark:text-slate-400">
                          <span className="ds-badge ds-badge-slate">
                            {feature.productFeatureTypeDesc || feature.productFeatureTypeId}
                          </span>
                        </td>

                        <td className="ds-td text-slate-500 dark:text-slate-400">
                          {feature.productFeatureCategoryDesc || '-'}
                        </td>

                        <td className="ds-td font-mono text-slate-700 dark:text-slate-300">
                          {feature.defaultAmount !== undefined && feature.defaultAmount !== null ? `₺${feature.defaultAmount}` : '-'}
                        </td>

                        <td className="ds-td text-center">
                          <span className="ds-badge ds-badge-purple">
                            {feature.applCount} ürün
                          </span>
                        </td>

                        <td className="ds-td-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setFeatureToEdit(feature);
                                setIsFeatureModalOpen(true);
                              }}
                              title={common.edit}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFeature(feature.productFeatureId)}
                              title={common.delete}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* TAB 3: Feature Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCategories.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              {t.noFeatureCategoriesFound}
            </div>
          ) : (
            featureCategories.map((cat) => (
              <div
                key={cat.productFeatureCategoryId}
                className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-indigo-500/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {cat.description || cat.productFeatureCategoryId}
                      </h3>
                      <span className="font-mono text-xs text-slate-400">
                        {cat.productFeatureCategoryId}
                      </span>
                    </div>
                  </div>
                  <span className="ds-badge ds-badge-slate">
                    {cat.featureCount || 0} özellik
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFeatureToEdit(null);
                      setIsFeatureModalOpen(true);
                    }}
                    className="ds-btn-secondary text-xs py-1 px-2.5 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    <span>Bu Kategoriye Özellik Ekle</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal 1: Create / Edit Feature */}
      {isFeatureModalOpen && (
        <CreateFeatureModal
          isOpen={isFeatureModalOpen}
          onClose={() => {
            setIsFeatureModalOpen(false);
            setFeatureToEdit(null);
          }}
          onSuccess={() => {
            setIsFeatureModalOpen(false);
            setFeatureToEdit(null);
          }}
          featureToEdit={featureToEdit}
          metadata={metadata}
          onSave={handleSaveFeature}
        />
      )}

      {/* Modal 2: Create Feature Category */}
      {isFeatureCategoryModalOpen && (
        <CreateFeatureCategoryModal
          isOpen={isFeatureCategoryModalOpen}
          onClose={() => setIsFeatureCategoryModalOpen(false)}
          onSuccess={() => setIsFeatureCategoryModalOpen(false)}
          onSave={handleSaveFeatureCategory}
        />
      )}

      {/* Modal 3: Create Product Assoc */}
      {isAssocModalOpen && (
        <CreateProductAssocModal
          isOpen={isAssocModalOpen}
          onClose={() => setIsAssocModalOpen(false)}
          onSuccess={() => setIsAssocModalOpen(false)}
          metadata={metadata}
          onSave={handleSaveAssoc}
        />
      )}

      {/* Modal 4: Quick Variant Wizard */}
      {isQuickVariantModalOpen && (
        <QuickVariantModal
          isOpen={isQuickVariantModalOpen}
          onClose={() => setIsQuickVariantModalOpen(false)}
          onSuccess={() => setIsQuickVariantModalOpen(false)}
          virtualProducts={virtualProducts}
          onQuickCreate={handleQuickVariant}
        />
      )}
    </div>
  );
};
export default VariantAssocManagement;
