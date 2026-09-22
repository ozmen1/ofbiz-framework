import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { X, Store, Plus, Trash2, BookOpen } from 'lucide-react';
import {
  ProductStoreDetail,
  PricePromoStoreMetadata,
  fetchProductStoreDetail,
  assignCatalogToStore,
  removeCatalogFromStore,
} from '../services/pricePromoStoreService';

interface StoreDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productStoreId: string;
  metadata: PricePromoStoreMetadata;
  onStoreChanged?: () => void;
}

export const StoreDetailModal: React.FC<StoreDetailModalProps> = ({
  isOpen,
  onClose,
  productStoreId,
  metadata,
  onStoreChanged,
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductStoreDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states for assigning Catalog
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [sequenceNum, setSequenceNum] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Memoized catalogs list
  const catalogOptions = useMemo(() => metadata.catalogs || [], [metadata.catalogs]);

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProductStoreDetail(productStoreId);
      setDetail(res);
      if (catalogOptions.length > 0 && !selectedCatalogId) {
        setSelectedCatalogId(catalogOptions[0].prodCatalogId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [productStoreId, common.error, catalogOptions, selectedCatalogId]);

  useEffect(() => {
    if (isOpen && productStoreId) {
      document.body.style.overflow = 'hidden';
      loadDetail();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, productStoreId, loadDetail]);

  if (!isOpen) return null;

  const handleAssignCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    const catalogId = selectedCatalogId || catalogOptions[0]?.prodCatalogId;
    if (!catalogId) return;

    try {
      setIsAssigning(true);
      setError(null);
      await assignCatalogToStore({
        productStoreId,
        prodCatalogId: catalogId,
        sequenceNum: sequenceNum === '' ? undefined : Number(sequenceNum),
      });
      setSequenceNum('');
      await loadDetail();
      onStoreChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveCatalog = async (catalogId: string, fromDate: string) => {
    if (!window.confirm(t.confirmRemoveCatalog)) return;
    try {
      setError(null);
      await removeCatalogFromStore({
        productStoreId,
        prodCatalogId: catalogId,
        fromDate,
      });
      await loadDetail();
      onStoreChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 60fps rule: solid overlay */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">
                  {detail?.store?.storeName || productStoreId}
                </h2>
                {detail?.store?.companyName && (
                  <span className="text-xs text-slate-400 font-normal">
                    ({detail.store.companyName})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.storeId}: <span className="font-mono text-blue-300">{productStoreId}</span>
                {detail?.store?.facilityName && ` • Depo: ${detail.store.facilityName}`}
                {detail?.store?.defaultCurrencyUomId && ` • Para Birimi: ${detail.store.defaultCurrencyUomId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* ASSIGNED CATALOGS SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      {t.assignedCatalogs} ({detail?.catalogs?.length || 0})
                    </h3>
                  </div>
                </div>

                {/* Assign Catalog Inline Form */}
                <form
                  onSubmit={handleAssignCatalog}
                  className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
                >
                  <div>
                    <label className="ds-label">
                      Katalog Seç
                    </label>
                    <select
                      value={selectedCatalogId}
                      onChange={(e) => setSelectedCatalogId(e.target.value)}
                      className="ds-select py-1.5 text-xs"
                    >
                      {catalogOptions.map((c) => (
                        <option key={c.prodCatalogId} value={c.prodCatalogId}>
                          {c.catalogName ? `${c.catalogName} (${c.prodCatalogId})` : c.prodCatalogId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ds-label">
                      Sıra No (Sequence)
                    </label>
                    <input
                      type="number"
                      placeholder="10"
                      value={sequenceNum}
                      onChange={(e) => setSequenceNum(e.target.value === '' ? '' : Number(e.target.value))}
                      className="ds-input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isAssigning}
                      className="ds-btn-primary w-full py-1.5 text-xs flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.assignCatalog}</span>
                    </button>
                  </div>
                </form>

                {/* Catalogs Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">Katalog Kodu</th>
                        <th className="ds-th">Katalog Adı</th>
                        <th className="ds-th">Sıra</th>
                        <th className="ds-th">Başlangıç Tarihi</th>
                        <th className="ds-th-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.catalogs && detail.catalogs.length > 0 ? (
                        detail.catalogs.map((c) => (
                          <tr key={`${c.prodCatalogId}-${c.fromDate}`} className="ds-tbody-row">
                            <td className="ds-td-mono font-bold text-blue-300">
                              {c.prodCatalogId}
                            </td>
                            <td className="ds-td font-medium text-white">
                              {c.catalogName || '-'}
                            </td>
                            <td className="ds-td-mono text-slate-300">
                              {c.sequenceNum ?? '-'}
                            </td>
                            <td className="ds-td-mono text-slate-400">
                              {c.fromDate ? c.fromDate.substring(0, 10) : '-'}
                            </td>
                            <td className="ds-td-right">
                              <button
                                onClick={() => handleRemoveCatalog(c.prodCatalogId, c.fromDate)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">
                            {t.noCatalogsAssigned}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-900">
          <button
            onClick={onClose}
            className="ds-btn-secondary"
          >
            {common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
