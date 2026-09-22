import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Package, Tag, Barcode, Sliders, Warehouse, Plus, Trash2,
  Edit2, Loader2, Save, CheckCircle2, AlertCircle, Sparkles, GitFork, Wand2,
  Image as ImageIcon
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  fetchProductDetail,
  updateProduct,
  deleteProductPrice,
  deleteGoodIdentification,
  deleteProductAttribute,
  ProductDetail,
  ProductPriceItem,
  ProductAttributeItem,
  ProductMetadata
} from '../services/productService';
import {
  fetchProductFeaturesAppl,
  applyFeatureToProduct,
  removeFeatureFromProduct,
  fetchProductAssocs,
  createProductAssoc,
  deleteProductAssoc,
  quickCreateVariant,
  fetchVariantAssocMetadata,
  ProductFeatureApplItem,
  ProductAssocItem,
  VariantAssocMetadata,
} from '../services/variantAssocService';
import { ProductPriceModal } from './ProductPriceModal';
import { GoodIdentificationModal } from './GoodIdentificationModal';
import { ProductAttributeModal } from './ProductAttributeModal';
import { ApplyFeatureModal } from './ApplyFeatureModal';
import { CreateProductAssocModal } from './CreateProductAssocModal';
import { QuickVariantModal } from './QuickVariantModal';
import { ProductMediaModal } from './ProductMediaModal';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  metadata: ProductMetadata;
  onProductUpdated?: () => void;
}

type TabType = 'general' | 'prices' | 'identifications' | 'attributes' | 'inventory' | 'features' | 'assocs';

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  productId,
  metadata,
  onProductUpdated,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.products;
  const vaT = translations.productVariantsAssocs;
  const common = translations.common;

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // General tab editable form state
  const [productName, setProductName] = useState('');
  const [internalName, setInternalName] = useState('');
  const [productTypeId, setProductTypeId] = useState('');
  const [primaryProductCategoryId, setPrimaryProductCategoryId] = useState('');
  const [quantityUomId, setQuantityUomId] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [isVirtual, setIsVirtual] = useState('N');
  const [isVariant, setIsVariant] = useState('N');
  const [taxable, setTaxable] = useState('Y');
  const [chargeShipping, setChargeShipping] = useState('Y');
  const [returnable, setReturnable] = useState('Y');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Submodals
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<ProductPriceItem | null>(null);

  const [isIdModalOpen, setIsIdModalOpen] = useState(false);

  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [selectedAttr, setSelectedAttr] = useState<ProductAttributeItem | null>(null);

  // Features & Assocs states
  const [featureAppls, setFeatureAppls] = useState<ProductFeatureApplItem[]>([]);
  const [outgoingAssocs, setOutgoingAssocs] = useState<ProductAssocItem[]>([]);
  const [incomingAssocs, setIncomingAssocs] = useState<ProductAssocItem[]>([]);
  const [vaMetadata, setVaMetadata] = useState<VariantAssocMetadata | null>(null);

  const [isApplyFeatureOpen, setIsApplyFeatureOpen] = useState(false);
  const [isCreateAssocOpen, setIsCreateAssocOpen] = useState(false);
  const [isQuickVariantOpen, setIsQuickVariantOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Load product features & assocs
  const loadFeaturesAndAssocs = useCallback(async () => {
    if (!productId) return;
    try {
      const [fRes, aRes, metaRes] = await Promise.all([
        fetchProductFeaturesAppl(productId),
        fetchProductAssocs({ productId }),
        fetchVariantAssocMetadata(),
      ]);
      setFeatureAppls(fRes.featureAppls || []);
      setOutgoingAssocs(aRes.outgoingAssocs || []);
      setIncomingAssocs(aRes.incomingAssocs || []);
      setVaMetadata(metaRes);
    } catch (e) {
      console.error('Error loading features and assocs:', e);
    }
  }, [productId]);

  // Load product detail
  const loadDetail = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProductDetail(productId);
      const d = res.productDetail;
      setDetail(d);
      setProductName(d.productName || '');
      setInternalName(d.internalName || '');
      setProductTypeId(d.productTypeId || '');
      setPrimaryProductCategoryId(d.primaryProductCategoryId || '');
      setQuantityUomId(d.quantityUomId || '');
      setDescription(d.description || '');
      setLongDescription(d.longDescription || '');
      setIsVirtual(d.isVirtual || 'N');
      setIsVariant(d.isVariant || 'N');
      setTaxable(d.taxable || 'Y');
      setChargeShipping(d.chargeShipping || 'Y');
      setReturnable(d.returnable || 'Y');
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setLoading(false);
    }
  }, [productId, common.error]);

  useEffect(() => {
    if (isOpen && productId) {
      document.body.style.overflow = 'hidden';
      loadDetail();
      loadFeaturesAndAssocs();
      setActiveTab('general');
      setActionSuccess(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, productId, loadDetail, loadFeaturesAndAssocs]);

  const showSuccessNotice = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3500);
  };

  // Save General Info
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setError(null);
    try {
      await updateProduct({
        productId,
        productName: productName.trim(),
        internalName: internalName.trim() || productName.trim(),
        productTypeId,
        primaryProductCategoryId: primaryProductCategoryId || undefined,
        quantityUomId: quantityUomId || undefined,
        description: description.trim() || undefined,
        longDescription: longDescription.trim() || undefined,
        isVirtual,
        isVariant,
        taxable,
        chargeShipping,
        returnable,
      });
      showSuccessNotice(t.productUpdatedSuccess);
      await loadDetail();
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Delete Price
  const handleDeletePrice = async (p: ProductPriceItem) => {
    if (!window.confirm(t.deletePrice + '?')) return;
    try {
      await deleteProductPrice({
        productId,
        productPriceTypeId: p.productPriceTypeId,
        productPricePurposeId: p.productPricePurposeId,
        currencyUomId: p.currencyUomId,
        fromDate: p.fromDate,
      });
      showSuccessNotice(t.priceDeletedSuccess);
      await loadDetail();
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setError(err.message || common.error);
    }
  };

  // Delete Identification
  const handleDeleteId = async (idType: string) => {
    if (!window.confirm(t.deleteIdentification + '?')) return;
    try {
      await deleteGoodIdentification({
        productId,
        goodIdentificationTypeId: idType,
      });
      showSuccessNotice(t.idDeletedSuccess);
      await loadDetail();
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setError(err.message || common.error);
    }
  };

  // Delete Attribute
  const handleDeleteAttr = async (attrName: string) => {
    if (!window.confirm(t.deleteAttribute + '?')) return;
    try {
      await deleteProductAttribute({
        productId,
        attrName,
      });
      showSuccessNotice(t.attrDeletedSuccess);
      await loadDetail();
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setError(err.message || common.error);
    }
  };

  // Delete applied feature
  const handleRemoveFeature = async (appl: ProductFeatureApplItem) => {
    if (!appl.fromDate) return;
    if (!window.confirm(vaT.confirmDeleteFeature)) return;
    try {
      await removeFeatureFromProduct({
        productId,
        productFeatureId: appl.productFeatureId,
        fromDate: appl.fromDate,
      });
      showSuccessNotice(vaT.featureDeletedSuccess);
      await loadFeaturesAndAssocs();
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setError(err.message || common.error);
    }
  };

  // Delete Assoc
  const handleDeleteAssoc = async (assoc: ProductAssocItem) => {
    if (!assoc.fromDate) return;
    if (!window.confirm(vaT.confirmDeleteAssoc)) return;
    try {
      await deleteProductAssoc({
        productId: assoc.productId,
        productIdTo: assoc.productIdTo,
        productAssocTypeId: assoc.productAssocTypeId,
        fromDate: assoc.fromDate,
      });
      showSuccessNotice(vaT.assocDeletedSuccess);
      await loadFeaturesAndAssocs();
      if (onProductUpdated) onProductUpdated();
    } catch (err: any) {
      setError(err.message || common.error);
    }
  };

  // Memoized metadata dropdowns for 60 FPS performance
  const memoizedCategories = useMemo(() => metadata.categories, [metadata.categories]);
  const memoizedUoms = useMemo(() => metadata.quantityUoms, [metadata.quantityUoms]);
  const memoizedProductTypes = useMemo(() => metadata.productTypes, [metadata.productTypes]);

  if (!isOpen) return null;

  const formatCurrency = (val: number, cur: string) => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: cur || 'TRY',
    }).format(val);
  };

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-black/80 overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Package size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {detail?.productName || productId}
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                    {productId}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {detail?.internalName ? `${t.internalName}: ${detail.internalName}` : t.subtitle}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium transition-all cursor-pointer"
                title={translations.inventoryMediaConfig.mediaTab}
              >
                <ImageIcon size={14} />
                <span className="hidden sm:inline">{translations.inventoryMediaConfig.mediaTab}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 overflow-x-auto shrink-0">
            {[
              { id: 'general', label: t.tabs.general, icon: <Package size={15} /> },
              { id: 'prices', label: t.tabs.prices, icon: <Tag size={15} />, count: detail?.prices?.length },
              { id: 'identifications', label: t.tabs.identifications, icon: <Barcode size={15} />, count: detail?.goodIdentifications?.length },
              { id: 'attributes', label: t.tabs.attributes, icon: <Sliders size={15} />, count: detail?.attributes?.length },
              { id: 'inventory', label: t.tabs.inventory, icon: <Warehouse size={15} />, count: detail?.inventoryByFacility?.length },
              { id: 'features', label: vaT.tabFeatures, icon: <Sparkles size={15} />, count: featureAppls.length },
              { id: 'assocs', label: vaT.tabAssocsAndVariants, icon: <GitFork size={15} />, count: (outgoingAssocs.length + incomingAssocs.length) },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Alert Banners */}
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 shrink-0">
              <CheckCircle2 size={16} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Tab Content Container */}
          <div className="p-6 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                <Loader2 size={24} className="animate-spin text-indigo-400" />
                <span>{common.loading}</span>
              </div>
            ) : !detail ? (
              <div className="py-16 text-center text-slate-400 text-xs">{common.noData}</div>
            ) : (
              <>
                {/* ── TAB 1: GENEL BİLGİLER ── */}
                {activeTab === 'general' && (
                  <form onSubmit={handleSaveGeneral} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {t.productName} *
                        </label>
                        <input
                          type="text"
                          required
                          value={productName}
                          onChange={e => setProductName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {t.internalName}
                        </label>
                        <input
                          type="text"
                          value={internalName}
                          onChange={e => setInternalName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {t.productType}
                        </label>
                        <select
                          value={productTypeId}
                          onChange={e => setProductTypeId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                        >
                          {memoizedProductTypes.map(pt => (
                            <option key={pt.productTypeId} value={pt.productTypeId}>
                              {pt.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {t.primaryCategory}
                        </label>
                        <select
                          value={primaryProductCategoryId}
                          onChange={e => setPrimaryProductCategoryId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="">{common.select}</option>
                          {memoizedCategories.map(c => (
                            <option key={c.productCategoryId} value={c.productCategoryId}>
                              {c.categoryName} ({c.productCategoryId})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {t.uom}
                        </label>
                        <select
                          value={quantityUomId}
                          onChange={e => setQuantityUomId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="">{common.select}</option>
                          {memoizedUoms.map(u => (
                            <option key={u.uomId} value={u.uomId}>
                              {u.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {common.date}
                        </label>
                        <input
                          type="text"
                          disabled
                          value={detail.createdDate ? detail.createdDate.substring(0, 19) : '-'}
                          className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono disabled:opacity-60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {t.description}
                      </label>
                      <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        {t.longDescription}
                      </label>
                      <textarea
                        rows={2}
                        value={longDescription}
                        onChange={e => setLongDescription(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={taxable === 'Y'}
                          onChange={e => setTaxable(e.target.checked ? 'Y' : 'N')}
                          className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                        />
                        <span className="text-[11px] text-slate-300">{t.taxable}</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={chargeShipping === 'Y'}
                          onChange={e => setChargeShipping(e.target.checked ? 'Y' : 'N')}
                          className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                        />
                        <span className="text-[11px] text-slate-300">{t.chargeShipping}</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={returnable === 'Y'}
                          onChange={e => setReturnable(e.target.checked ? 'Y' : 'N')}
                          className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                        />
                        <span className="text-[11px] text-slate-300">{t.returnable}</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isVirtual === 'Y'}
                          onChange={e => setIsVirtual(e.target.checked ? 'Y' : 'N')}
                          className="w-3.5 h-3.5 rounded-sm border-slate-700 bg-slate-900 text-indigo-600"
                        />
                        <span className="text-[11px] text-slate-300">{t.isVirtual}</span>
                      </label>
                    </div>

                    <div className="flex justify-end pt-3">
                      <button
                        type="submit"
                        disabled={isSavingGeneral}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isSavingGeneral ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        <span>{common.save}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* ── TAB 2: FİYATLAR ── */}
                {activeTab === 'prices' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {t.prices} ({detail.prices.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPrice(null);
                          setIsPriceModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{t.addPrice}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-2.5 font-semibold">{t.priceType}</th>
                            <th className="px-3 py-2.5 font-semibold">{t.pricePurpose}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{t.price}</th>
                            <th className="px-3 py-2.5 font-semibold">{t.taxInPrice}</th>
                            <th className="px-3 py-2.5 font-semibold">{t.fromDate}</th>
                            <th className="px-3 py-2.5 font-semibold">{t.thruDate}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{common.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {detail.prices.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                {common.noData}
                              </td>
                            </tr>
                          ) : (
                            detail.prices.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-3 py-2 font-medium text-white">
                                  {p.productPriceTypeDesc || p.productPriceTypeId}
                                </td>
                                <td className="px-3 py-2 text-slate-400">
                                  {p.productPricePurposeDesc || p.productPricePurposeId}
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-amber-400 font-mono">
                                  {formatCurrency(p.price, p.currencyUomId)}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    p.taxInPrice === 'Y' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {p.taxInPrice === 'Y' ? common.yes : common.no}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                                  {p.fromDate ? p.fromDate.substring(0, 10) : '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                                  {p.thruDate ? p.thruDate.substring(0, 10) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedPrice(p);
                                        setIsPriceModalOpen(true);
                                      }}
                                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                      title={common.edit}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePrice(p)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                      title={common.delete}
                                    >
                                      <Trash2 size={13} />
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
                )}

                {/* ── TAB 3: BARKODLAR & IDENTIFICATIONS ── */}
                {activeTab === 'identifications' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {t.identifications} ({detail.goodIdentifications.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsIdModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{t.addIdentification}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">{t.idType}</th>
                            <th className="px-4 py-2.5 font-semibold">{t.idValue}</th>
                            <th className="px-4 py-2.5 font-semibold text-right">{common.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {detail.goodIdentifications.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                                {common.noData}
                              </td>
                            </tr>
                          ) : (
                            detail.goodIdentifications.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-4 py-2.5 font-medium text-white">
                                  {it.goodIdentificationTypeDesc || it.goodIdentificationTypeId}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-cyan-400 font-semibold tracking-wider">
                                  {it.idValue}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteId(it.goodIdentificationTypeId)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                    title={common.delete}
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

                {/* ── TAB 4: ÖZEL NİTELİKLER ── */}
                {activeTab === 'attributes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {t.attributes} ({detail.attributes.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAttr(null);
                          setIsAttrModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{t.addAttribute}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">{t.attrName}</th>
                            <th className="px-4 py-2.5 font-semibold">{t.attrValue}</th>
                            <th className="px-4 py-2.5 font-semibold">{t.attrDescription}</th>
                            <th className="px-4 py-2.5 font-semibold text-right">{common.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {detail.attributes.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                {common.noData}
                              </td>
                            </tr>
                          ) : (
                            detail.attributes.map((attr, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-4 py-2.5 font-mono text-purple-400 font-semibold">
                                  {attr.attrName}
                                </td>
                                <td className="px-4 py-2.5 text-white font-medium">
                                  {attr.attrValue || '-'}
                                </td>
                                <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                                  {attr.attrDescription || '-'}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAttr(attr);
                                        setIsAttrModalOpen(true);
                                      }}
                                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                                      title={common.edit}
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAttr(attr.attrName)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                      title={common.delete}
                                    >
                                      <Trash2 size={13} />
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
                )}

                {/* ── TAB 5: DEPO & STOK DURUMU ── */}
                {activeTab === 'inventory' && (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400">
                      {t.inventorySummary}
                    </p>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-4 py-2.5 font-semibold">{t.facility}</th>
                            <th className="px-4 py-2.5 font-semibold text-right">{t.qoh}</th>
                            <th className="px-4 py-2.5 font-semibold text-right">{t.atp}</th>
                            <th className="px-4 py-2.5 font-semibold">{common.status}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {detail.inventoryByFacility.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                {common.noData}
                              </td>
                            </tr>
                          ) : (
                            detail.inventoryByFacility.map((fac, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-4 py-2.5 font-medium text-white flex items-center gap-2">
                                  <Warehouse size={14} className="text-cyan-400" />
                                  <span>{fac.facilityName} ({fac.facilityId})</span>
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                                  {fac.qoh}
                                </td>
                                <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400">
                                  {fac.atp}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    fac.atp > 0
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {fac.atp > 0 ? t.inStockProducts : common.inactive}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── TAB 6: ÖZELLİKLER (FEATURES) ── */}
                {activeTab === 'features' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400">
                        {vaT.tabFeatures} ({featureAppls.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsApplyFeatureOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{vaT.applyFeature}</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-2.5 font-semibold">{vaT.featureName}</th>
                            <th className="px-3 py-2.5 font-semibold">{vaT.featureType}</th>
                            <th className="px-3 py-2.5 font-semibold">{vaT.applType}</th>
                            <th className="px-3 py-2.5 font-semibold">{t.fromDate}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{vaT.defaultSequence}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{vaT.defaultAmount}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{common.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {featureAppls.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                {common.noData}
                              </td>
                            </tr>
                          ) : (
                            featureAppls.map((appl, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-3 py-2 font-medium text-white">
                                  {appl.featureDescription || appl.productFeatureId}
                                </td>
                                <td className="px-3 py-2 text-slate-400">
                                  {appl.productFeatureTypeDesc || appl.productFeatureTypeId || '-'}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                    {appl.productFeatureApplTypeDesc || appl.productFeatureApplTypeId}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                                  {appl.fromDate ? appl.fromDate.substring(0, 10) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-slate-400">
                                  {appl.sequenceNum || '-'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-emerald-400">
                                  {appl.amount !== undefined && appl.amount !== null ? `${appl.amount}` : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFeature(appl)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                    title={common.delete}
                                  >
                                    <Trash2 size={13} />
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

                {/* ── TAB 7: İLİŞKİLER & VARYANTLAR (ASSOCS & VARIANTS) ── */}
                {activeTab === 'assocs' && (
                  <div className="space-y-6">
                    {/* Banner for virtual products */}
                    {detail.isVirtual === 'Y' && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Wand2 size={20} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {vaT.quickVariantWizard}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Bu sanal ürün için özellik seçimli varyant ürün kartları türetin.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsQuickVariantOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all cursor-pointer whitespace-nowrap"
                        >
                          {vaT.quickVariantWizard}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-300">
                        {vaT.outgoingAssocs} ({outgoingAssocs.length})
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCreateAssocOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>{vaT.createAssoc}</span>
                      </button>
                    </div>

                    {/* Outgoing Assocs Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-2.5 font-semibold">{vaT.targetProduct}</th>
                            <th className="px-3 py-2.5 font-semibold">{vaT.assocType}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{vaT.quantity}</th>
                            <th className="px-3 py-2.5 font-semibold">{vaT.reason}</th>
                            <th className="px-3 py-2.5 font-semibold">{t.fromDate}</th>
                            <th className="px-3 py-2.5 font-semibold text-right">{common.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-300">
                          {outgoingAssocs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                                {common.noData}
                              </td>
                            </tr>
                          ) : (
                            outgoingAssocs.map((assoc, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/30">
                                <td className="px-3 py-2 font-medium text-white">
                                  <span>{assoc.targetProductName || assoc.productIdTo}</span>
                                  <span className="ml-2 font-mono text-[10px] text-slate-400">({assoc.productIdTo})</span>
                                  {assoc.targetIsVariant === 'Y' && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                                      {vaT.variantProduct}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                    {assoc.productAssocTypeDesc || assoc.productAssocTypeId}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-slate-400">
                                  {assoc.quantity || '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-400 text-[11px]">
                                  {assoc.reason || '-'}
                                </td>
                                <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                                  {assoc.fromDate ? assoc.fromDate.substring(0, 10) : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAssoc(assoc)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                    title={common.delete}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Incoming Assocs Table */}
                    {incomingAssocs.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-semibold text-slate-300">
                          {vaT.incomingAssocs} ({incomingAssocs.length})
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="px-3 py-2.5 font-semibold">{vaT.sourceProduct}</th>
                                <th className="px-3 py-2.5 font-semibold">{vaT.assocType}</th>
                                <th className="px-3 py-2.5 font-semibold text-right">{vaT.quantity}</th>
                                <th className="px-3 py-2.5 font-semibold">{t.fromDate}</th>
                                <th className="px-3 py-2.5 font-semibold text-right">{common.actions}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-slate-300">
                              {incomingAssocs.map((assoc, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/30">
                                  <td className="px-3 py-2 font-medium text-white">
                                    <span>{assoc.sourceProductName || assoc.productId}</span>
                                    <span className="ml-2 font-mono text-[10px] text-slate-400">({assoc.productId})</span>
                                    {assoc.sourceIsVirtual === 'Y' && (
                                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-bold">
                                        {vaT.virtualProduct}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                      {assoc.productAssocTypeDesc || assoc.productAssocTypeId}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-400">
                                    {assoc.quantity || '-'}
                                  </td>
                                  <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                                    {assoc.fromDate ? assoc.fromDate.substring(0, 10) : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAssoc(assoc)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                      title={common.delete}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Child Modals */}
      {isPriceModalOpen && (
        <ProductPriceModal
          isOpen={isPriceModalOpen}
          onClose={() => {
            setIsPriceModalOpen(false);
            setSelectedPrice(null);
          }}
          onSuccess={async () => {
            showSuccessNotice(t.priceAddedSuccess);
            await loadDetail();
            if (onProductUpdated) onProductUpdated();
          }}
          productId={productId}
          priceItem={selectedPrice}
          metadata={metadata}
        />
      )}

      {isIdModalOpen && (
        <GoodIdentificationModal
          isOpen={isIdModalOpen}
          onClose={() => setIsIdModalOpen(false)}
          onSuccess={async () => {
            showSuccessNotice(t.idAddedSuccess);
            await loadDetail();
            if (onProductUpdated) onProductUpdated();
          }}
          productId={productId}
          metadata={metadata}
        />
      )}

      {isAttrModalOpen && (
        <ProductAttributeModal
          isOpen={isAttrModalOpen}
          onClose={() => {
            setIsAttrModalOpen(false);
            setSelectedAttr(null);
          }}
          onSuccess={async () => {
            showSuccessNotice(t.attrSavedSuccess);
            await loadDetail();
            if (onProductUpdated) onProductUpdated();
          }}
          productId={productId}
          attributeItem={selectedAttr}
        />
      )}

      {isApplyFeatureOpen && detail && (
        <ApplyFeatureModal
          isOpen={isApplyFeatureOpen}
          onClose={() => setIsApplyFeatureOpen(false)}
          onSuccess={async () => {
            showSuccessNotice(vaT.featureAppliedSuccess);
            await loadFeaturesAndAssocs();
            if (onProductUpdated) onProductUpdated();
          }}
          productId={productId}
          productName={detail.productName || productId}
          metadata={vaMetadata}
          onApply={async (payload) => {
            await applyFeatureToProduct(payload);
          }}
        />
      )}

      {isCreateAssocOpen && (
        <CreateProductAssocModal
          isOpen={isCreateAssocOpen}
          onClose={() => setIsCreateAssocOpen(false)}
          onSuccess={async () => {
            showSuccessNotice(vaT.assocCreatedSuccess);
            await loadFeaturesAndAssocs();
            if (onProductUpdated) onProductUpdated();
          }}
          defaultProductId={productId}
          metadata={vaMetadata}
          onSave={async (payload) => {
            await createProductAssoc(payload);
          }}
        />
      )}

      {isQuickVariantOpen && detail && (
        <QuickVariantModal
          isOpen={isQuickVariantOpen}
          onClose={() => setIsQuickVariantOpen(false)}
          onSuccess={async () => {
            showSuccessNotice(vaT.variantCreatedSuccess);
            await loadFeaturesAndAssocs();
            if (onProductUpdated) onProductUpdated();
          }}
          defaultVirtualProductId={productId}
          virtualProducts={[{
            productId: detail.productId,
            productName: detail.productName || detail.productId,
            isVirtual: detail.isVirtual,
            isVariant: detail.isVariant,
          }]}
          onQuickCreate={async (payload) => {
            await quickCreateVariant(payload);
          }}
        />
      )}

      {isMediaModalOpen && (
        <ProductMediaModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          productId={productId}
          onMediaChanged={loadDetail}
        />
      )}
    </>
  );
};
