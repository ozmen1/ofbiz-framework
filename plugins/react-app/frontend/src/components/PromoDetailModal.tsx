import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { X, Sparkles, Plus, Trash2, Ticket, ShieldCheck, Zap } from 'lucide-react';
import {
  ProductPromoDetail,
  fetchProductPromoDetail,
  createProductPromoCode,
  deleteProductPromoCode,
} from '../services/pricePromoStoreService';

interface PromoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productPromoId: string;
  onPromoChanged?: () => void;
}

export const PromoDetailModal: React.FC<PromoDetailModalProps> = ({
  isOpen,
  onClose,
  productPromoId,
  onPromoChanged,
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProductPromoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states for new Coupon Code
  const [newCodeId, setNewCodeId] = useState('');
  const [codeLimit, setCodeLimit] = useState<number | ''>('');
  const [customerLimit, setCustomerLimit] = useState<number | ''>('');
  const [isAddingCode, setIsAddingCode] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchProductPromoDetail(productPromoId);
      setDetail(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [productPromoId, common.error]);

  useEffect(() => {
    if (isOpen && productPromoId) {
      document.body.style.overflow = 'hidden';
      loadDetail();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, productPromoId, loadDetail]);

  if (!isOpen) return null;

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeId.trim()) return;
    try {
      setIsAddingCode(true);
      setError(null);
      await createProductPromoCode({
        productPromoId,
        productPromoCodeId: newCodeId.trim().toUpperCase(),
        useLimitPerCode: codeLimit === '' ? undefined : Number(codeLimit),
        useLimitPerCustomer: customerLimit === '' ? undefined : Number(customerLimit),
      });
      setNewCodeId('');
      setCodeLimit('');
      setCustomerLimit('');
      await loadDetail();
      onPromoChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsAddingCode(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!window.confirm(t.confirmDeletePromoCode)) return;
    try {
      setError(null);
      await deleteProductPromoCode(codeId);
      await loadDetail();
      onPromoChanged?.();
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
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">
                  {detail?.promo?.promoName || productPromoId}
                </h2>
                {detail?.promo?.requireCode === 'Y' ? (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {t.requireCode}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Otomatik Sepet İndirimi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.promoId}: <span className="font-mono text-purple-300">{productPromoId}</span>
                {detail?.promo?.promoText && ` • ${detail.promo.promoText}`}
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
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* COUPON CODES SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ticket className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      {t.couponCodes} ({detail?.codes?.length || 0})
                    </h3>
                  </div>
                </div>

                {/* Add Code Inline Form */}
                <form
                  onSubmit={handleAddCode}
                  className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="ds-label">
                      {t.code} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: YAZ2026"
                      value={newCodeId}
                      onChange={(e) => setNewCodeId(e.target.value)}
                      className="ds-input py-1.5 text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="ds-label">
                      Kupon Başı Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sınırsız"
                      value={codeLimit}
                      onChange={(e) => setCodeLimit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="ds-input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="ds-label">
                      Müşteri Başı Limit
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Sınırsız"
                      value={customerLimit}
                      onChange={(e) => setCustomerLimit(e.target.value === '' ? '' : Number(e.target.value))}
                      className="ds-input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isAddingCode}
                      className="ds-btn-primary w-full py-1.5 text-xs flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.createCouponCode}</span>
                    </button>
                  </div>
                </form>

                {/* Codes Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">{t.code}</th>
                        <th className="ds-th">Kupon Limiti</th>
                        <th className="ds-th">Müşteri Limiti</th>
                        <th className="ds-th">{common.date}</th>
                        <th className="ds-th-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.codes && detail.codes.length > 0 ? (
                        detail.codes.map((c) => (
                          <tr key={c.productPromoCodeId} className="ds-tbody-row">
                            <td className="ds-td-mono font-bold text-purple-300">
                              {c.productPromoCodeId}
                            </td>
                            <td className="ds-td text-slate-300">
                              {c.useLimitPerCode ?? 'Sınırsız'}
                            </td>
                            <td className="ds-td text-slate-300">
                              {c.useLimitPerCustomer ?? 'Sınırsız'}
                            </td>
                            <td className="ds-td-mono text-slate-400">
                              {c.createdStamp ? c.createdStamp.substring(0, 16) : '-'}
                            </td>
                            <td className="ds-td-right">
                              <button
                                onClick={() => handleDeleteCode(c.productPromoCodeId)}
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
                            Kayıtlı kupon kodu bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PROMO RULES & ACTIONS OVERVIEW */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                    Promosyon Kuralları & Şartları ({detail?.rules?.length || 0})
                  </h3>
                </div>

                <div className="space-y-3">
                  {detail?.rules && detail.rules.length > 0 ? (
                    detail.rules.map((rule) => (
                      <div
                        key={rule.productPromoRuleId}
                        className="p-4 bg-slate-800/30 border border-slate-700/60 rounded-xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">
                            {rule.ruleName || rule.productPromoRuleId}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            #{rule.productPromoRuleId}
                          </span>
                        </div>

                        {/* Conditions */}
                        {rule.conds && rule.conds.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                              Koşullar:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {rule.conds.map((c) => (
                                <span
                                  key={c.productPromoCondSeqId}
                                  className="ds-badge ds-badge-yellow"
                                >
                                  {c.inputParamDesc || c.inputParamEnumId} {c.operatorDesc || c.operatorEnumId} {c.condValue || ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {rule.actions && rule.actions.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                              Uygulanan İndirimler:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {rule.actions.map((a) => (
                                <span
                                  key={a.productPromoActionSeqId}
                                  className="ds-badge ds-badge-green flex items-center space-x-1"
                                >
                                  <Zap className="w-3 h-3 text-emerald-400" />
                                  <span>
                                    {a.actionDesc || a.productPromoActionEnumId}
                                    {a.amount ? ` • Tutar/Oran: ${a.amount}` : ''}
                                    {a.quantity ? ` • Adet: ${a.quantity}` : ''}
                                    {a.productId ? ` (Ürün: ${a.productId})` : ''}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic py-2">
                      Bu promosyon için tanımlı alt kural bulunmuyor.
                    </p>
                  )}
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
