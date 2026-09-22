import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import {
  FolderTree,
  Folder,
  FolderPlus,
  Layers,
  Package,
  BookOpen,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Eye,
  Link as LinkIcon,
  Unlink,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  CatalogItem,
  CategoryListItem,
  CategoryTreeNode,
  CatalogCategoryMetadata,
  fetchCatalogCategoryMetadata,
  fetchCatalogs,
  fetchCategories,
  fetchCategoryTree,
  createProdCatalog,
  updateProdCatalog,
  deleteProdCatalog,
  addCategoryToProdCatalog,
  removeCategoryFromProdCatalog,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
} from '../services/catalogCategoryService';
import { CreateCatalogModal } from './CreateCatalogModal';
import { CreateCategoryModal } from './CreateCategoryModal';
import { AssignCategoryToCatalogModal } from './AssignCategoryToCatalogModal';
import { CategoryDetailModal } from './CategoryDetailModal';

export const CatalogCategoryManagement: React.FC = () => {
  const { translations } = useTranslation();
  const t = translations.catalogCategories;
  const common = translations.common;

  // Active Main Tab: 'categories' | 'catalogs'
  const [activeTab, setActiveTab] = useState<'categories' | 'catalogs'>('categories');
  // Category Sub-view: 'tree' | 'table'
  const [categoryViewMode, setCategoryViewMode] = useState<'tree' | 'table'>('tree');

  // Data states
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [metadata, setMetadata] = useState<CatalogCategoryMetadata | null>(null);
  const [metrics, setMetrics] = useState({
    totalCategories: 0,
    rootCategories: 0,
    totalMembers: 0,
  });

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters for Category Table
  const [searchCategory, setSearchCategory] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Tree view expansion state: set of category IDs that are expanded
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Modals state
  const [isCreateCatalogOpen, setIsCreateCatalogOpen] = useState(false);
  const [catalogToEdit, setCatalogToEdit] = useState<CatalogItem | null>(null);

  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryListItem | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>(undefined);

  const [isAssignCategoryOpen, setIsAssignCategoryOpen] = useState(false);
  const [catalogForAssignment, setCatalogForAssignment] = useState<CatalogItem | null>(null);

  const [selectedDetailCategoryId, setSelectedDetailCategoryId] = useState<string | null>(null);

  // Show toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Metadata
  const loadMetadata = useCallback(async () => {
    try {
      const meta = await fetchCatalogCategoryMetadata();
      setMetadata(meta);
    } catch {
      // ignore
    }
  }, []);

  // Load Catalogs
  const loadCatalogs = useCallback(async () => {
    try {
      const res = await fetchCatalogs();
      setCatalogs(res.catalogs || []);
    } catch {
      // ignore
    }
  }, []);

  // Load Categories (flat list for table)
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchCategories({
        categoryName: searchCategory || undefined,
        productCategoryTypeId: selectedTypeFilter || undefined,
        viewSize: 100,
      });
      setCategories(res.categories || []);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch {
      // ignore
    }
  }, [searchCategory, selectedTypeFilter]);

  // Load Category Tree
  const loadCategoryTree = useCallback(async () => {
    try {
      const res = await fetchCategoryTree();
      setCategoryTree(res.categoryTree || []);
      // Expand top-level nodes by default
      const rootIds = new Set<string>();
      (res.categoryTree || []).forEach((node) => {
        rootIds.add(node.productCategoryId);
      });
      setExpandedNodes(rootIds);
    } catch {
      // ignore
    }
  }, []);

  // Refresh All Data
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadMetadata(), loadCatalogs(), loadCategories(), loadCategoryTree()]);
    setIsLoading(false);
  }, [loadMetadata, loadCatalogs, loadCategories, loadCategoryTree]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Tree node toggling
  const toggleNode = (catId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((n) => {
        allIds.add(n.productCategoryId);
        if (n.children && n.children.length > 0) {
          collectIds(n.children);
        }
      });
    };
    collectIds(categoryTree);
    setExpandedNodes(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Catalog Handlers
  const handleSaveCatalog = async (payload: {
    prodCatalogId?: string;
    catalogName: string;
    useQuickAdd?: string;
    viewAllowPermReqd?: string;
    purchaseAllowPermReqd?: string;
  }) => {
    if (catalogToEdit) {
      await updateProdCatalog({
        prodCatalogId: catalogToEdit.prodCatalogId,
        catalogName: payload.catalogName,
        useQuickAdd: payload.useQuickAdd,
        viewAllowPermReqd: payload.viewAllowPermReqd,
        purchaseAllowPermReqd: payload.purchaseAllowPermReqd,
      });
      showToast(t.catalogUpdatedSuccess);
    } else {
      await createProdCatalog(payload);
      showToast(t.catalogCreatedSuccess);
    }
    loadCatalogs();
    loadMetadata();
  };

  const handleDeleteCatalog = async (catalogId: string) => {
    if (!window.confirm(t.confirmDeleteCatalog)) return;
    try {
      await deleteProdCatalog(catalogId);
      showToast(t.catalogDeletedSuccess);
      loadCatalogs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  const handleRemoveCategoryFromCatalog = async (
    prodCatalogId: string,
    productCategoryId: string,
    prodCatalogCategoryTypeId: string,
    fromDate: string
  ) => {
    if (!window.confirm(t.confirmRemoveCategoryFromCatalog)) return;
    try {
      await removeCategoryFromProdCatalog({
        prodCatalogId,
        productCategoryId,
        prodCatalogCategoryTypeId,
        fromDate,
      });
      showToast(t.categoryRemovedSuccess);
      loadCatalogs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  const handleAssignCategory = async (payload: {
    prodCatalogId: string;
    productCategoryId: string;
    prodCatalogCategoryTypeId: string;
    sequenceNum?: number;
  }) => {
    await addCategoryToProdCatalog(payload);
    showToast(t.categoryAssignedSuccess);
    loadCatalogs();
  };

  // Category Handlers
  const handleSaveCategory = async (payload: {
    productCategoryId?: string;
    productCategoryTypeId?: string;
    categoryName: string;
    description?: string;
    longDescription?: string;
    parentProductCategoryId?: string;
  }) => {
    if (categoryToEdit) {
      await updateProductCategory({
        productCategoryId: categoryToEdit.productCategoryId,
        categoryName: payload.categoryName,
        productCategoryTypeId: payload.productCategoryTypeId,
        description: payload.description,
        longDescription: payload.longDescription,
        parentProductCategoryId: payload.parentProductCategoryId,
      });
      showToast(t.categoryUpdatedSuccess);
    } else {
      await createProductCategory(payload);
      showToast(t.categoryCreatedSuccess);
    }
    loadCategories();
    loadCategoryTree();
    loadMetadata();
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm(t.confirmDeleteCategory)) return;
    try {
      await deleteProductCategory(catId);
      showToast(t.categoryDeletedSuccess);
      loadCategories();
      loadCategoryTree();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  // Tree Node recursive renderer
  const renderTreeNode = (node: CategoryTreeNode, level = 0) => {
    const isExpanded = expandedNodes.has(node.productCategoryId);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.productCategoryId} className="select-none">
        <div
          className={`group flex items-center justify-between py-2 px-3 rounded-xl border border-transparent hover:border-slate-700/80 hover:bg-slate-800/60 transition-all ${
            level > 0 ? 'mt-1' : 'mt-2 bg-slate-800/30'
          }`}
          style={{ paddingLeft: `${Math.max(12, level * 24 + 12)}px` }}
        >
          {/* Node Left: Expand button, Icon, Name, ID badge */}
          <div className="flex items-center space-x-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleNode(node.productCategoryId)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-amber-400" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}

            <div className={`p-1.5 rounded-lg ${level === 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
              <Folder className="w-4 h-4" />
            </div>

            <span
              onClick={() => setSelectedDetailCategoryId(node.productCategoryId)}
              className="text-sm font-semibold text-white hover:text-blue-400 cursor-pointer truncate max-w-xs transition-colors"
            >
              {node.categoryName || node.productCategoryId}
            </span>

            <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
              {node.productCategoryId}
            </span>

            {node.description && (
              <span className="hidden lg:inline text-xs text-slate-500 truncate max-w-sm">
                - {node.description}
              </span>
            )}
          </div>

          {/* Node Right: Product count badge & action buttons */}
          <div className="flex items-center space-x-2">
            <span
              onClick={() => setSelectedDetailCategoryId(node.productCategoryId)}
              className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/20 transition-colors"
              title={t.memberProducts}
            >
              <Package className="w-3 h-3" />
              <span>{node.memberCount} {t.tabCategories.toLowerCase()}</span>
            </span>

            <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity">
              {/* Detail button */}
              <button
                type="button"
                onClick={() => setSelectedDetailCategoryId(node.productCategoryId)}
                title={t.categoryDetail}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {/* Add child subcategory */}
              <button
                type="button"
                onClick={() => {
                  setDefaultParentId(node.productCategoryId);
                  setCategoryToEdit(null);
                  setIsCreateCategoryOpen(true);
                }}
                title="Alt Kategori Ekle"
                className="p-1 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Delete category */}
              <button
                type="button"
                onClick={() => handleDeleteCategory(node.productCategoryId)}
                title={t.deleteCategory}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="border-l border-slate-800 ml-4 pl-1">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Filtered categories for table view
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const matchesSearch =
        !searchCategory ||
        cat.categoryName?.toLowerCase().includes(searchCategory.toLowerCase()) ||
        cat.productCategoryId?.toLowerCase().includes(searchCategory.toLowerCase());
      const matchesType =
        !selectedTypeFilter || cat.productCategoryTypeId === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [categories, searchCategory, selectedTypeFilter]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[90] bg-slate-900 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BookOpen className="w-7 h-7" />
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
            onClick={() => {
              setCatalogToEdit(null);
              setIsCreateCatalogOpen(true);
            }}
            className="ds-btn-secondary flex items-center gap-2 py-2 px-3.5 text-xs font-semibold"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{t.createCatalog}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryToEdit(null);
              setDefaultParentId(undefined);
              setIsCreateCategoryOpen(true);
            }}
            className="ds-btn-primary flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>{t.createCategory}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Catalogs */}
        <div className="ds-stat-card border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalCatalogs}</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-amber-300 font-mono">
            {catalogs.length}
          </span>
          <span className="ds-stat-sub text-slate-400">Aktif Katalog</span>
        </div>

        {/* Total Categories */}
        <div className="ds-stat-card border-l-blue-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalCategories}</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-blue-300 font-mono">
            {metrics.totalCategories || categories.length}
          </span>
          <span className="ds-stat-sub text-slate-400">Toplam Kategori</span>
        </div>

        {/* Root Categories */}
        <div className="ds-stat-card border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.rootCategories}</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-purple-300 font-mono">
            {metrics.rootCategories || categoryTree.length}
          </span>
          <span className="ds-stat-sub text-slate-400">Kök Kategori</span>
        </div>

        {/* Total Member Products */}
        <div className="ds-stat-card border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="ds-stat-label">{t.totalAssignedProducts}</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <span className="ds-stat-value text-emerald-300 font-mono">
            {metrics.totalMembers || 0}
          </span>
          <span className="ds-stat-sub text-slate-400">Ürün İlişkisi</span>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="ds-tab-bar">
          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`ds-tab ${activeTab === 'categories' ? 'ds-tab-active' : ''}`}
          >
            <FolderTree className="w-4 h-4 mr-1.5 inline" />
            <span>{t.tabCategories} & {t.tabTree}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalogs')}
            className={`ds-tab ${activeTab === 'catalogs' ? 'ds-tab-active' : ''}`}
          >
            <BookOpen className="w-4 h-4 mr-1.5 inline" />
            <span>{t.tabCatalogs}</span>
            <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-700/60 font-mono">
              {catalogs.length}
            </span>
          </button>
        </div>

        {/* Sub-controls when in Categories tab */}
        {activeTab === 'categories' && (
          <div className="flex items-center space-x-1.5 self-end sm:self-auto bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setCategoryViewMode('tree')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                categoryViewMode === 'tree'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.treeView}
            </button>
            <button
              type="button"
              onClick={() => setCategoryViewMode('table')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                categoryViewMode === 'table'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.listView}
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: Categories & Tree View */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          {categoryViewMode === 'tree' ? (
            /* Interactive Tree View */
            <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <FolderTree className="w-5 h-5 text-indigo-400" />
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t.treeView}
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleExpandAll}
                    className="ds-btn-secondary text-xs py-1 px-2.5 flex items-center space-x-1"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>{t.expandAll}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCollapseAll}
                    className="ds-btn-secondary text-xs py-1 px-2.5 flex items-center space-x-1"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{t.collapseAll}</span>
                  </button>
                </div>
              </div>

              {categoryTree.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  {t.noCategoriesFound}
                </div>
              ) : (
                <div className="space-y-1">
                  {categoryTree.map((node) => renderTreeNode(node, 0))}
                </div>
              )}
            </div>
          ) : (
            /* Table View with Search */
            <div className="space-y-4">
              <div className="bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    placeholder={t.searchCategoriesPlaceholder}
                    className="ds-input pl-9 text-xs"
                  />
                </div>

                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="ds-select text-xs sm:w-64"
                >
                  <option value="">-- Tüm Türler --</option>
                  {metadata?.categoryTypes.map((type) => (
                    <option key={type.productCategoryTypeId} value={type.productCategoryTypeId}>
                      {type.description || type.productCategoryTypeId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr className="ds-thead-row">
                        <th className="ds-th">{t.categoryId}</th>
                        <th className="ds-th">{t.categoryName}</th>
                        <th className="ds-th">{t.categoryType}</th>
                        <th className="ds-th">{t.parentCategory}</th>
                        <th className="ds-th text-center">{t.memberCount}</th>
                        <th className="ds-th text-center">{t.childCategories}</th>
                        <th className="ds-th-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                      {filteredCategories.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                            {t.noCategoriesFound}
                          </td>
                        </tr>
                      ) : (
                        filteredCategories.map((cat) => (
                          <tr
                            key={cat.productCategoryId}
                            className="ds-tbody-row"
                          >
                            <td className="ds-td font-mono font-medium text-slate-900 dark:text-slate-200">
                              {cat.productCategoryId}
                            </td>
                            <td className="ds-td font-medium text-slate-900 dark:text-white">
                              <span
                                onClick={() => setSelectedDetailCategoryId(cat.productCategoryId)}
                                className="hover:text-indigo-400 cursor-pointer"
                              >
                                {cat.categoryName || cat.productCategoryId}
                              </span>
                              {cat.description && (
                                <p className="text-[11px] text-slate-500 font-normal truncate max-w-xs">
                                  {cat.description}
                                </p>
                              )}
                            </td>
                            <td className="ds-td text-slate-500 dark:text-slate-400">
                              <span className="ds-badge ds-badge-slate">
                                {cat.productCategoryTypeDesc || cat.productCategoryTypeId}
                              </span>
                            </td>
                            <td className="ds-td text-slate-500 dark:text-slate-400">
                              {cat.parentCategories && cat.parentCategories.length > 0 ? (
                                <span className="text-amber-400 font-medium">
                                  {cat.parentCategories[0].parentCategoryName || cat.parentCategories[0].parentProductCategoryId}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">Kök</span>
                              )}
                            </td>
                            <td className="ds-td text-center">
                              <span className="ds-badge ds-badge-green">
                                {cat.memberCount}
                              </span>
                            </td>
                            <td className="ds-td text-center">
                              <span className="ds-badge ds-badge-blue">
                                {cat.childCount}
                              </span>
                            </td>
                            <td className="ds-td-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDetailCategoryId(cat.productCategoryId)}
                                  title={t.categoryDetail}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCategoryToEdit(cat);
                                    setIsCreateCategoryOpen(true);
                                  }}
                                  title={t.editCategory}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.productCategoryId)}
                                  title={t.deleteCategory}
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
        </div>
      )}

      {/* TAB 2: Catalogs */}
      {activeTab === 'catalogs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogs.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                {t.noCatalogsFound}
              </div>
            ) : (
              catalogs.map((catalog) => (
                <div
                  key={catalog.prodCatalogId}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-700/80 transition-all"
                >
                  <div>
                    {/* Catalog Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {catalog.catalogName || catalog.prodCatalogId}
                          </h3>
                          <span className="font-mono text-xs text-slate-400">
                            {catalog.prodCatalogId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCatalogToEdit(catalog);
                            setIsCreateCatalogOpen(true);
                          }}
                          title={t.editCatalog}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCatalog(catalog.prodCatalogId)}
                          title={t.deleteCatalog}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Indicators */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                        {catalog.useQuickAdd === 'Y' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>Quick Add</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                        {catalog.viewAllowPermReqd === 'Y' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>View Perm</span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                        {catalog.purchaseAllowPermReqd === 'Y' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>Purch Perm</span>
                      </div>
                    </div>

                    {/* Linked Categories List */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          {t.assignedCategories} ({catalog.categories?.length || 0})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCatalogForAssignment(catalog);
                            setIsAssignCategoryOpen(true);
                          }}
                          className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Ekle</span>
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(!catalog.categories || catalog.categories.length === 0) ? (
                          <p className="text-xs text-slate-500 italic py-2">
                            Bağlı kategori bulunmuyor.
                          </p>
                        ) : (
                          catalog.categories.map((cat) => (
                            <div
                              key={`${cat.productCategoryId}-${cat.prodCatalogCategoryTypeId}`}
                              className="group/item flex items-center justify-between p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center space-x-1.5">
                                  <span
                                    onClick={() => setSelectedDetailCategoryId(cat.productCategoryId)}
                                    className="text-xs font-medium text-white hover:text-blue-400 cursor-pointer truncate"
                                  >
                                    {cat.categoryName || cat.productCategoryId}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    #{cat.sequenceNum || 1}
                                  </span>
                                </div>
                                <span className="text-[10px] text-amber-400/80 block truncate">
                                  {cat.prodCatalogCategoryTypeDesc || cat.prodCatalogCategoryTypeId}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCategoryFromCatalog(
                                    catalog.prodCatalogId,
                                    cat.productCategoryId,
                                    cat.prodCatalogCategoryTypeId,
                                    cat.fromDate
                                  )
                                }
                                title={t.removeCategoryFromCatalog}
                                className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Catalog Footer */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCatalogForAssignment(catalog);
                        setIsAssignCategoryOpen(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-amber-400 font-medium text-xs border border-amber-500/20 flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{t.addCategoryToCatalog}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Create / Edit Catalog */}
      {isCreateCatalogOpen && (
        <CreateCatalogModal
          isOpen={isCreateCatalogOpen}
          onClose={() => {
            setIsCreateCatalogOpen(false);
            setCatalogToEdit(null);
          }}
          onSuccess={() => {
            setIsCreateCatalogOpen(false);
            setCatalogToEdit(null);
          }}
          catalogToEdit={catalogToEdit}
          onSave={handleSaveCatalog}
        />
      )}

      {/* Modal 2: Create / Edit Category */}
      {isCreateCategoryOpen && (
        <CreateCategoryModal
          isOpen={isCreateCategoryOpen}
          onClose={() => {
            setIsCreateCategoryOpen(false);
            setCategoryToEdit(null);
            setDefaultParentId(undefined);
          }}
          onSuccess={() => {
            setIsCreateCategoryOpen(false);
            setCategoryToEdit(null);
            setDefaultParentId(undefined);
          }}
          categoryToEdit={categoryToEdit}
          defaultParentId={defaultParentId}
          metadata={metadata}
          onSave={handleSaveCategory}
        />
      )}

      {/* Modal 3: Assign Category to Catalog */}
      {isAssignCategoryOpen && catalogForAssignment && (
        <AssignCategoryToCatalogModal
          isOpen={isAssignCategoryOpen}
          onClose={() => {
            setIsAssignCategoryOpen(false);
            setCatalogForAssignment(null);
          }}
          onSuccess={() => {
            setIsAssignCategoryOpen(false);
            setCatalogForAssignment(null);
          }}
          catalog={catalogForAssignment}
          metadata={metadata}
          onAssign={handleAssignCategory}
        />
      )}

      {/* Modal 4: Category Detail & Member Products */}
      {selectedDetailCategoryId && (
        <CategoryDetailModal
          isOpen={!!selectedDetailCategoryId}
          onClose={() => setSelectedDetailCategoryId(null)}
          productCategoryId={selectedDetailCategoryId}
          onCategoryChanged={() => {
            loadCategories();
            loadCategoryTree();
          }}
          onAddSubCategory={(parentCatId) => {
            setDefaultParentId(parentCatId);
            setCategoryToEdit(null);
            setIsCreateCategoryOpen(true);
          }}
          onNavigateToCategory={(catId) => setSelectedDetailCategoryId(catId)}
        />
      )}
    </div>
  );
};
export default CatalogCategoryManagement;
