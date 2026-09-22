import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package, Plus, Search, Filter, RefreshCw, Trash2,
  Eye, CheckCircle2, AlertCircle, Loader2, Layers,
  ChevronLeft, ChevronRight, Boxes, Barcode
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  fetchProductMetadata,
  fetchProducts,
  deleteProduct,
  ProductListItem,
  ProductMetadata,
  ProductMetrics
} from '../services/productService';
import { CreateProductModal } from './CreateProductModal';
import { ProductDetailModal } from './ProductDetailModal';

export const ProductManagement: React.FC = () => {
  const { translations, locale } = useTranslation();
  const t = translations.products;
  const common = translations.common;

  // Metadata
  const [metadata, setMetadata] = useState<ProductMetadata>({
    productTypes: [],
    quantityUoms: [],
    currencyUoms: [],
    priceTypes: [],
    pricePurposes: [],
    identificationTypes: [],
    categories: [],
  });

  // State
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [metrics, setMetrics] = useState<ProductMetrics>({
    totalProducts: 0,
    finishedGoods: 0,
    services: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [viewSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedVirtual, setSelectedVirtual] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);

  // Load Metadata
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await fetchProductMetadata();
        setMetadata(res.metadata);
      } catch (err: any) {
        console.error('Failed to load product metadata:', err);
      }
    };
    loadMeta();
  }, []);

  // Load Products
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProducts({
        searchKeyword: searchKeyword.trim() || undefined,
        productTypeId: selectedType || undefined,
        primaryProductCategoryId: selectedCategory || undefined,
        isVirtual: selectedVirtual || undefined,
        viewIndex,
        viewSize,
      });
      setProducts(res.result.productList);
      setTotalCount(res.result.totalCount);
      setMetrics(res.result.metrics);
    } catch (err: any) {
      setError(err.message || common.error);
    } finally {
      setLoading(false);
    }
  }, [searchKeyword, selectedType, selectedCategory, selectedVirtual, viewIndex, viewSize, common.error]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleDelete = async (productId: string) => {
    if (!window.confirm(t.confirmDeleteProduct)) return;
    try {
      const res = await deleteProduct(productId);
      showSuccess(res.message || t.productDeletedSuccess);
      loadProducts();
    } catch (err: any) {
      setError(err.message || common.error);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewIndex(0);
    loadProducts();
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedType('');
    setSelectedCategory('');
    setSelectedVirtual('');
    setViewIndex(0);
  };

  const totalPages = Math.ceil(totalCount / viewSize);

  // Memoized formatters
  const formatCurrency = (val?: number, cur?: string) => {
    if (val === undefined || val === null) return '-';
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency: cur || 'TRY',
    }).format(val);
  };

  // Memoized select items for 60 FPS
  const memoizedCategories = useMemo(() => metadata.categories, [metadata.categories]);
  const memoizedProductTypes = useMemo(() => metadata.productTypes, [metadata.productTypes]);

  return (
    <div className="space-y-6">
      {/* ── Üst Başlık & Aksiyon ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Package size={22} />
            </div>
            <span>{t.title}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3 text-xs"
            title={common.refresh}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{common.refresh}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            <Plus size={16} />
            <span>{t.createProduct}</span>
          </button>
        </div>
      </div>

      {/* ── Bildirimler ── */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── Metrik Kartları ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ds-stat-card border-l-indigo-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalProducts}</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Boxes size={18} />
            </div>
          </div>
          <p className="ds-stat-value font-mono">
            {metrics.totalProducts}
          </p>
          <span className="ds-stat-sub text-slate-400">Tüm Katalog Ürünleri</span>
        </div>

        <div className="ds-stat-card border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.finishedGoods}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Package size={18} />
            </div>
          </div>
          <p className="ds-stat-value text-emerald-600 dark:text-emerald-400 font-mono">
            {metrics.finishedGoods}
          </p>
          <span className="ds-stat-sub text-slate-400">Nihai Mamul</span>
        </div>

        <div className="ds-stat-card border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.services}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Layers size={18} />
            </div>
          </div>
          <p className="ds-stat-value text-purple-600 dark:text-purple-400 font-mono">
            {metrics.services}
          </p>
          <span className="ds-stat-sub text-slate-400">Hizmet / Servis Kalemi</span>
        </div>
      </div>

      {/* ── Filtreler & Arama Barı ── */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="ds-input pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs w-auto"
            >
              <option value="">{t.productType}: {common.all}</option>
              {memoizedProductTypes.map(pt => (
                <option key={pt.productTypeId} value={pt.productTypeId}>
                  {pt.description}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs w-auto max-w-[180px] truncate"
            >
              <option value="">{t.primaryCategory}: {common.all}</option>
              {memoizedCategories.map(c => (
                <option key={c.productCategoryId} value={c.productCategoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>

            <select
              value={selectedVirtual}
              onChange={e => {
                setSelectedVirtual(e.target.value);
                setViewIndex(0);
              }}
              className="ds-select text-xs w-auto"
            >
              <option value="">{t.isVirtual}: {common.all}</option>
              <option value="Y">{common.yes}</option>
              <option value="N">{common.no}</option>
            </select>

            <button
              type="submit"
              className="ds-btn-primary py-2 px-3.5 text-xs font-semibold"
            >
              <Filter size={13} />
              <span>{common.filter}</span>
            </button>

            {(searchKeyword || selectedType || selectedCategory || selectedVirtual) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ds-btn-ghost text-xs py-2 px-3"
              >
                {common.reset}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Ürün Tablosu ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr className="ds-thead-row">
                <th className="ds-th">{t.productId}</th>
                <th className="ds-th">{t.productName}</th>
                <th className="ds-th">{t.productType}</th>
                <th className="ds-th">{t.primaryCategory}</th>
                <th className="ds-th-right">{t.pricing}</th>
                <th className="ds-th-right">{t.atp}</th>
                <th className="ds-th-right">{t.qoh}</th>
                <th className="ds-th-right">{common.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 size={24} className="animate-spin text-indigo-500" />
                      <span>{common.loading}</span>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                    {t.noProductsFound}
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr
                    key={p.productId}
                    className="ds-tbody-row cursor-pointer"
                    onClick={() => setDetailProductId(p.productId)}
                  >
                    <td className="ds-td">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {p.productId}
                        </span>
                        {p.primarySku && (
                          <span className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                            <Barcode size={10} />
                            <span>{p.primarySku}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="ds-td">
                      <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {p.productName}
                      </div>
                      {p.internalName && p.internalName !== p.productName && (
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          {p.internalName}
                        </div>
                      )}
                    </td>
                    <td className="ds-td">
                      <span className="ds-badge ds-badge-slate">
                        {p.productTypeDesc || p.productTypeId}
                      </span>
                    </td>
                    <td className="ds-td text-slate-500 dark:text-slate-400">
                      {p.primaryCategoryName || '-'}
                    </td>
                    <td className="ds-td-right font-mono font-bold text-slate-900 dark:text-amber-400">
                      {formatCurrency(p.defaultPrice, p.currencyUomId)}
                    </td>
                    <td className="ds-td-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {p.totalAtp}
                    </td>
                    <td className="ds-td-right font-mono text-slate-600 dark:text-slate-400">
                      {p.totalQoh}
                    </td>
                    <td className="ds-td-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailProductId(p.productId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title={common.details}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.productId)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                          title={common.delete}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Sayfalama (Pagination) ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            {common.total}: <span className="font-bold text-slate-900 dark:text-white font-mono">{totalCount}</span> {t.title.toLowerCase()}
          </div>
          <div className="flex items-center gap-2">
            <span>
              {common.page} {viewIndex + 1} {common.of} {Math.max(1, totalPages)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={viewIndex === 0}
                onClick={() => setViewIndex(prev => Math.max(0, prev - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={viewIndex + 1 >= totalPages}
                onClick={() => setViewIndex(prev => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modallar ── */}
      {isCreateModalOpen && (
        <CreateProductModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={newId => {
            showSuccess(t.productCreatedSuccess);
            loadProducts();
            setDetailProductId(newId);
          }}
          metadata={metadata}
        />
      )}

      {detailProductId && (
        <ProductDetailModal
          isOpen={!!detailProductId}
          onClose={() => setDetailProductId(null)}
          productId={detailProductId}
          metadata={metadata}
          onProductUpdated={() => loadProducts()}
        />
      )}
    </div>
  );
};
