import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, Image, Plus, Trash2, ExternalLink, Link2 } from 'lucide-react';
import {
  ProductMediaResponse,
  ProductContentTypeItem,
  fetchProductMedia,
  updateProductMediaUrls,
  addProductContent,
  removeProductContent,
} from '../services/inventoryMediaConfigService';

interface ProductMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  contentTypes?: ProductContentTypeItem[];
  onMediaChanged?: () => void;
}

export const ProductMediaModal: React.FC<ProductMediaModalProps> = ({
  isOpen,
  onClose,
  productId,
  contentTypes = [],
  onMediaChanged,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [mediaData, setMediaData] = useState<ProductMediaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Standard Image URLs Form State
  const [smallImageUrl, setSmallImageUrl] = useState('');
  const [mediumImageUrl, setMediumImageUrl] = useState('');
  const [largeImageUrl, setLargeImageUrl] = useState('');
  const [detailImageUrl, setDetailImageUrl] = useState('');
  const [originalImageUrl, setOriginalImageUrl] = useState('');
  const [isUpdatingUrls, setIsUpdatingUrls] = useState(false);

  // New Content Form State
  const [newContentTypeId, setNewContentTypeId] = useState('ORIGINAL_IMAGE');
  const [newContentName, setNewContentName] = useState('');
  const [newObjectInfo, setNewObjectInfo] = useState('');
  const [isAddingContent, setIsAddingContent] = useState(false);

  const contentTypeOptions = useMemo(() => contentTypes || [], [contentTypes]);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProductMedia(productId);
      setMediaData(res);
      setSmallImageUrl(res.standardImages?.smallImageUrl || '');
      setMediumImageUrl(res.standardImages?.mediumImageUrl || '');
      setLargeImageUrl(res.standardImages?.largeImageUrl || '');
      setDetailImageUrl(res.standardImages?.detailImageUrl || '');
      setOriginalImageUrl(res.standardImages?.originalImageUrl || '');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [productId, common.error]);

  useEffect(() => {
    if (isOpen && productId) {
      document.body.style.overflow = 'hidden';
      loadMedia();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, productId, loadMedia]);

  if (!isOpen) return null;

  const handleUpdateStandardImages = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingUrls(true);
      setError(null);
      await updateProductMediaUrls({
        productId,
        smallImageUrl: smallImageUrl.trim() || undefined,
        mediumImageUrl: mediumImageUrl.trim() || undefined,
        largeImageUrl: largeImageUrl.trim() || undefined,
        detailImageUrl: detailImageUrl.trim() || undefined,
        originalImageUrl: originalImageUrl.trim() || undefined,
      });
      setSuccessMsg(t.mediaUpdatedSuccess);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadMedia();
      onMediaChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsUpdatingUrls(false);
    }
  };

  const handleAddContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectInfo.trim()) return;

    try {
      setIsAddingContent(true);
      setError(null);
      await addProductContent({
        productId,
        productContentTypeId: newContentTypeId || 'ORIGINAL_IMAGE',
        contentName: newContentName.trim() || undefined,
        objectInfo: newObjectInfo.trim(),
      });
      setNewContentName('');
      setNewObjectInfo('');
      setSuccessMsg(t.mediaAddedSuccess);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadMedia();
      onMediaChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsAddingContent(false);
    }
  };

  const handleRemoveContent = async (contentId: string, productContentTypeId: string, fromDate?: string) => {
    if (!window.confirm(t.confirmDeleteMedia)) return;
    try {
      setError(null);
      await removeProductContent({
        productId,
        contentId,
        productContentTypeId,
        fromDate: fromDate || '',
      });
      setSuccessMsg(t.mediaDeletedSuccess);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadMedia();
      onMediaChanged?.();
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
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Image className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {t.productMediaTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Ürün: <span className="font-semibold text-white">{mediaData?.productName || productId}</span>
                <span className="font-mono text-purple-300 ml-2">({productId})</span>
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

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
              {successMsg}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: STANDARD PRODUCT IMAGE URLS */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Link2 className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                    {t.standardImages}
                  </h3>
                </div>

                <form onSubmit={handleUpdateStandardImages} className="space-y-3 p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.smallImage}
                      </label>
                      <input
                        type="text"
                        placeholder="https://... veya /images/products/small.jpg"
                        value={smallImageUrl}
                        onChange={(e) => setSmallImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.mediumImage}
                      </label>
                      <input
                        type="text"
                        placeholder="https://... veya /images/products/medium.jpg"
                        value={mediumImageUrl}
                        onChange={(e) => setMediumImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.largeImage}
                      </label>
                      <input
                        type="text"
                        placeholder="https://... veya /images/products/large.jpg"
                        value={largeImageUrl}
                        onChange={(e) => setLargeImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.detailImage}
                      </label>
                      <input
                        type="text"
                        placeholder="https://... veya /images/products/detail.jpg"
                        value={detailImageUrl}
                        onChange={(e) => setDetailImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {t.originalImage}
                      </label>
                      <input
                        type="text"
                        placeholder="https://... veya /images/products/original.jpg"
                        value={originalImageUrl}
                        onChange={(e) => setOriginalImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isUpdatingUrls}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
                    >
                      {isUpdatingUrls ? common.loading : 'Görsel URL Bağlantılarını Kaydet'}
                    </button>
                  </div>
                </form>
              </div>

              {/* SECTION 2: ATTACHED PRODUCT CONTENTS & DOCUMENTS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                    {t.additionalMedia} ({mediaData?.contents?.length || 0})
                  </h3>
                </div>

                {/* Add Content Inline Form */}
                <form
                  onSubmit={handleAddContent}
                  className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {t.contentType}
                    </label>
                    <select
                      value={newContentTypeId}
                      onChange={(e) => setNewContentTypeId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {contentTypeOptions.map((ct) => (
                        <option key={ct.productContentTypeId} value={ct.productContentTypeId}>
                          {ct.description || ct.productContentTypeId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {t.mediaName}
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: Kullanım Kılavuzu PDF"
                      value={newContentName}
                      onChange={(e) => setNewContentName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {t.mediaUrl} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="https://... veya dosya URL"
                      value={newObjectInfo}
                      onChange={(e) => setNewObjectInfo(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isAddingContent}
                      className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg flex items-center justify-center space-x-1 shadow-md transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addMediaLink}</span>
                    </button>
                  </div>
                </form>

                {/* Content Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-4 py-2.5">Tür</th>
                        <th className="px-4 py-2.5">Başlık / İçerik</th>
                        <th className="px-4 py-2.5">URL / Kaynak</th>
                        <th className="px-4 py-2.5 text-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {mediaData?.contents && mediaData.contents.length > 0 ? (
                        mediaData.contents.map((c) => (
                          <tr key={`${c.contentId}-${c.fromDate}`} className="hover:bg-slate-800/30">
                            <td className="px-4 py-2.5 font-medium text-purple-300">
                              {c.productContentTypeId}
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-white">
                              {c.contentName || c.contentId}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-400 max-w-xs truncate">
                              {c.objectInfo ? (
                                <a
                                  href={c.objectInfo}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:underline flex items-center space-x-1"
                                >
                                  <span className="truncate">{c.objectInfo}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => handleRemoveContent(c.contentId, c.productContentTypeId, c.fromDate)}
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500 italic">
                            {t.noMediaFound}
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
            className="ds-btn-secondary text-xs"
          >
            {common.close}
          </button>
        </div>
      </div>
    </div>
  );
};
