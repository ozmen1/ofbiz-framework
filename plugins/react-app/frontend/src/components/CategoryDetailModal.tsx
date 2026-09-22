import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  Layers,
  Package,
  FolderTree,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Hash,
} from 'lucide-react';
import {
  CategoryDetail,
  fetchCategoryDetail,
  addCategoryProductMember,
  removeCategoryProductMember,
} from '../services/catalogCategoryService';
import { AssignProductToCategoryModal } from './AssignProductToCategoryModal';

interface CategoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productCategoryId: string | null;
  onCategoryChanged?: () => void;
  onAddSubCategory?: (parentCategoryId: string) => void;
  onNavigateToCategory?: (categoryId: string) => void;
}

export const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  isOpen,
  onClose,
  productCategoryId,
  onCategoryChanged,
  onAddSubCategory,
  onNavigateToCategory,
}) => {
  const { translations, locale } = useTranslation();
  const t = translations.catalogCategories;
  const common = translations.common;
  const products = translations.products;

  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAssignProductOpen, setIsAssignProductOpen] = useState(false);

  const loadDetail = useCallback(async (catId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchCategoryDetail(catId);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsLoading(false);
    }
  }, [common.error]);

  useEffect(() => {
    if (isOpen && productCategoryId) {
      document.body.style.overflow = 'hidden';
      loadDetail(productCategoryId);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, productCategoryId, loadDetail]);

  if (!isOpen || !productCategoryId) return null;

  const handleRemoveMember = async (productId: string, fromDate: string) => {
    if (!window.confirm(t.confirmRemoveMemberProduct)) return;
    try {
      await removeCategoryProductMember({
        productCategoryId,
        productId,
        fromDate,
      });
      loadDetail(productCategoryId);
      if (onCategoryChanged) onCategoryChanged();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : common.error);
    }
  };

  const handleAssignMember = async (payload: {
    productCategoryId: string;
    productId: string;
    sequenceNum?: number;
    quantity?: number;
  }) => {
    await addCategoryProductMember(payload);
    loadDetail(productCategoryId);
    if (onCategoryChanged) onCategoryChanged();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 60fps solid overlay */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque dialog container */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white">
                  {detail?.categoryName || productCategoryId}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
                  {productCategoryId}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {detail?.productCategoryTypeDesc || detail?.productCategoryTypeId || 'Kategori'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Single Unified Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="py-12 flex justify-center items-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {detail && !isLoading && (
            <>
              {/* Description & KPI Badges */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">
                    {common.description}
                  </span>
                  <p className="text-sm text-slate-200">
                    {detail.description || detail.longDescription || 'Açıklama girilmemiş.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-center">
                  <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
                    {t.childCategories}
                  </span>
                  <span className="text-2xl font-bold text-white mt-1">
                    {detail.childRollups?.length || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-center">
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                    {t.memberProducts}
                  </span>
                  <span className="text-2xl font-bold text-white mt-1">
                    {detail.members?.length || 0}
                  </span>
                </div>
              </div>

              {/* Parent and Child Categories Rollup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Parents */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center space-x-2 mb-3">
                    <FolderTree className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white">
                      {t.parentCategories}
                    </h3>
                  </div>
                  {(!detail.parentRollups || detail.parentRollups.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">
                      {t.noParentCategory}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.parentRollups.map((parent) => (
                        <div
                          key={parent.parentProductCategoryId}
                          onClick={() => onNavigateToCategory && onNavigateToCategory(parent.parentProductCategoryId)}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 hover:border-amber-500/40 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="text-sm font-medium text-white">
                              {parent.parentCategoryName || parent.parentProductCategoryId}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              ({parent.parentProductCategoryId})
                            </span>
                          </div>
                          <span className="text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Üst Kategori
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Subcategories (Children) */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <FolderTree className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-semibold text-white">
                        {t.childCategories}
                      </h3>
                    </div>
                    {onAddSubCategory && (
                      <button
                        type="button"
                        onClick={() => onAddSubCategory(productCategoryId)}
                        className="px-2.5 py-1 text-xs font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Alt Kategori Ekle</span>
                      </button>
                    )}
                  </div>
                  {(!detail.childRollups || detail.childRollups.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">
                      {t.noChildrenFound}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.childRollups.map((child) => (
                        <div
                          key={child.productCategoryId}
                          onClick={() => onNavigateToCategory && onNavigateToCategory(child.productCategoryId)}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 hover:border-blue-500/40 cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="text-sm font-medium text-white">
                              {child.categoryName || child.productCategoryId}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              ({child.productCategoryId})
                            </span>
                          </div>
                          <span className="text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            Alt Dal
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Member Products Table Section */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">
                      {t.memberProducts} ({detail.members?.length || 0})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAssignProductOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addMemberProduct}</span>
                  </button>
                </div>

                {/* Table - horizontal scroll only, no vertical scroll */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="py-2.5 px-4 bg-slate-900">{products.productId}</th>
                        <th className="py-2.5 px-4 bg-slate-900">{products.productName}</th>
                        <th className="py-2.5 px-4 bg-slate-900">{products.productType}</th>
                        <th className="py-2.5 px-4 bg-slate-900">{t.sequenceNum}</th>
                        <th className="py-2.5 px-4 bg-slate-900">{products.fromDate}</th>
                        <th className="py-2.5 px-4 bg-slate-900 text-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(!detail.members || detail.members.length === 0) ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                            {t.noMembersFound}
                          </td>
                        </tr>
                      ) : (
                        detail.members.map((member) => (
                          <tr key={`${member.productId}-${member.fromDate}`} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-medium text-slate-200">
                              {member.productId}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-white">
                              {member.productName || member.productId}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {member.productTypeDesc || member.productTypeId}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400 font-mono">
                              <span className="flex items-center space-x-1">
                                <Hash className="w-3 h-3 text-slate-500" />
                                <span>{member.sequenceNum || 1}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              <span className="flex items-center space-x-1 text-[11px]">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span>
                                  {member.fromDate
                                    ? new Date(member.fromDate).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')
                                    : '-'}
                                </span>
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.productId, member.fromDate)}
                                title={t.removeMemberProduct}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-slate-800 bg-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="ds-btn-secondary text-xs"
          >
            {common.close}
          </button>
        </div>
      </div>

      {/* Sub-modal: Assign Product */}
      {isAssignProductOpen && (
        <AssignProductToCategoryModal
          isOpen={isAssignProductOpen}
          onClose={() => setIsAssignProductOpen(false)}
          onSuccess={() => setIsAssignProductOpen(false)}
          categoryId={productCategoryId}
          categoryName={detail?.categoryName || productCategoryId}
          onAssign={handleAssignMember}
        />
      )}
    </div>
  );
};
