import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { X, Tag, Plus, Trash2, ShieldCheck, Zap } from 'lucide-react';
import {
  PriceRuleDetail,
  PricePromoStoreMetadata,
  fetchPriceRuleDetail,
  createProductPriceCond,
  deleteProductPriceCond,
  createProductPriceAction,
  deleteProductPriceAction,
} from '../services/pricePromoStoreService';

interface PriceRuleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  productPriceRuleId: string;
  metadata: PricePromoStoreMetadata;
  onRuleChanged?: () => void;
}

export const PriceRuleDetailModal: React.FC<PriceRuleDetailModalProps> = ({
  isOpen,
  onClose,
  productPriceRuleId,
  metadata,
  onRuleChanged,
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PriceRuleDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states for new Condition
  const [inputParamEnumId, setInputParamEnumId] = useState('');
  const [operatorEnumId, setOperatorEnumId] = useState('');
  const [condValue, setCondValue] = useState('');
  const [isAddingCond, setIsAddingCond] = useState(false);

  // Form states for new Action
  const [productPriceActionTypeId, setProductPriceActionTypeId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [rateCode, setRateCode] = useState('');
  const [isAddingAction, setIsAddingAction] = useState(false);

  // Memoized dropdowns
  const condTypeOptions = useMemo(() => metadata.priceCondTypes || [], [metadata.priceCondTypes]);
  const operatorOptions = useMemo(() => metadata.promoOperators || [], [metadata.promoOperators]);
  const actionTypeOptions = useMemo(() => metadata.priceActionTypes || [], [metadata.priceActionTypes]);

  const loadDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchPriceRuleDetail(productPriceRuleId);
      setDetail(res);
      if (condTypeOptions.length > 0 && !inputParamEnumId) {
        setInputParamEnumId(condTypeOptions[0].enumId);
      }
      if (operatorOptions.length > 0 && !operatorEnumId) {
        setOperatorEnumId(operatorOptions[0].enumId);
      }
      if (actionTypeOptions.length > 0 && !productPriceActionTypeId) {
        setProductPriceActionTypeId(actionTypeOptions[0].productPriceActionTypeId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setLoading(false);
    }
  }, [productPriceRuleId, common.error, condTypeOptions, operatorOptions, actionTypeOptions, inputParamEnumId, operatorEnumId, productPriceActionTypeId]);

  useEffect(() => {
    if (isOpen && productPriceRuleId) {
      document.body.style.overflow = 'hidden';
      loadDetail();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, productPriceRuleId, loadDetail]);

  if (!isOpen) return null;

  const handleAddCond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condValue.trim()) return;
    try {
      setIsAddingCond(true);
      setError(null);
      await createProductPriceCond({
        productPriceRuleId,
        inputParamEnumId: inputParamEnumId || condTypeOptions[0]?.enumId || '',
        operatorEnumId: operatorEnumId || operatorOptions[0]?.enumId || '',
        condValue: condValue.trim(),
      });
      setCondValue('');
      await loadDetail();
      onRuleChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsAddingCond(false);
    }
  };

  const handleDeleteCond = async (seqId: string) => {
    if (!window.confirm(t.confirmDeleteCondition)) return;
    try {
      setError(null);
      await deleteProductPriceCond(productPriceRuleId, seqId);
      await loadDetail();
      onRuleChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === '' || isNaN(Number(amount))) return;
    try {
      setIsAddingAction(true);
      setError(null);
      await createProductPriceAction({
        productPriceRuleId,
        productPriceActionTypeId: productPriceActionTypeId || actionTypeOptions[0]?.productPriceActionTypeId || '',
        amount: Number(amount),
        rateCode: rateCode.trim() || undefined,
      });
      setAmount('');
      setRateCode('');
      await loadDetail();
      onRuleChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsAddingAction(false);
    }
  };

  const handleDeleteAction = async (seqId: string) => {
    if (!window.confirm(t.confirmDeleteAction)) return;
    try {
      setError(null);
      await deleteProductPriceAction(productPriceRuleId, seqId);
      await loadDetail();
      onRuleChanged?.();
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
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">
                  {detail?.rule?.ruleName || productPriceRuleId}
                </h2>
                {detail?.rule?.isSale === 'Y' && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {t.isSale}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.ruleId}: <span className="font-mono text-cyan-300">{productPriceRuleId}</span>
                {detail?.rule?.description && ` • ${detail.rule.description}`}
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

        {/* Modal Body - Single Unified Vertical Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mr-3" />
              <span>{common.loading}</span>
            </div>
          ) : (
            <>
              {/* CONDITIONS SECTION */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      {t.conditions} ({detail?.conditions?.length || 0})
                    </h3>
                  </div>
                </div>

                {/* Add Condition Inline Form */}
                <form
                  onSubmit={handleAddCond}
                  className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="ds-label">
                      {t.inputParam}
                    </label>
                    <select
                      value={inputParamEnumId}
                      onChange={(e) => setInputParamEnumId(e.target.value)}
                      className="ds-select py-1.5 text-xs"
                    >
                      {condTypeOptions.map((opt) => (
                        <option key={opt.enumId} value={opt.enumId}>
                          {opt.description || opt.enumId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ds-label">
                      {t.operator}
                    </label>
                    <select
                      value={operatorEnumId}
                      onChange={(e) => setOperatorEnumId(e.target.value)}
                      className="ds-select py-1.5 text-xs"
                    >
                      {operatorOptions.map((op) => (
                        <option key={op.enumId} value={op.enumId}>
                          {op.description || op.enumId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ds-label">
                      {t.condValue} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: CATALOG1 veya 100"
                      value={condValue}
                      onChange={(e) => setCondValue(e.target.value)}
                      className="ds-input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isAddingCond}
                      className="ds-btn-primary w-full py-1.5 text-xs flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addCondition}</span>
                    </button>
                  </div>
                </form>

                {/* Conditions Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">Sıra</th>
                        <th className="ds-th">{t.inputParam}</th>
                        <th className="ds-th">{t.operator}</th>
                        <th className="ds-th">{t.condValue}</th>
                        <th className="ds-th-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.conditions && detail.conditions.length > 0 ? (
                        detail.conditions.map((cond) => (
                          <tr key={cond.productPriceCondSeqId} className="ds-tbody-row">
                            <td className="ds-td-mono text-slate-400">
                              {cond.productPriceCondSeqId}
                            </td>
                            <td className="ds-td font-medium text-white">
                              {cond.inputParamDesc || cond.inputParamEnumId}
                            </td>
                            <td className="ds-td text-amber-300 font-mono">
                              {cond.operatorDesc || cond.operatorEnumId}
                            </td>
                            <td className="ds-td-mono text-cyan-300">
                              {cond.condValue}
                            </td>
                            <td className="ds-td-right">
                              <button
                                onClick={() => handleDeleteCond(cond.productPriceCondSeqId)}
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
                            {common.noData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ACTIONS SECTION */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                      {t.actions} ({detail?.actions?.length || 0})
                    </h3>
                  </div>
                </div>

                {/* Add Action Inline Form */}
                <form
                  onSubmit={handleAddAction}
                  className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="ds-label">
                      {t.actionType}
                    </label>
                    <select
                      value={productPriceActionTypeId}
                      onChange={(e) => setProductPriceActionTypeId(e.target.value)}
                      className="ds-select py-1.5 text-xs"
                    >
                      {actionTypeOptions.map((act) => (
                        <option key={act.productPriceActionTypeId} value={act.productPriceActionTypeId}>
                          {act.description || act.productPriceActionTypeId}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="ds-label">
                      {t.rateOrAmount} *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Örn: 15 (% veya Tutar)"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="ds-input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="ds-label">
                      Oran Kodu (Opsiyonel)
                    </label>
                    <input
                      type="text"
                      placeholder="Örn: DISC_SEASON"
                      value={rateCode}
                      onChange={(e) => setRateCode(e.target.value)}
                      className="ds-input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isAddingAction}
                      className="ds-btn-primary w-full py-1.5 text-xs flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addAction}</span>
                    </button>
                  </div>
                </form>

                {/* Actions Table */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="ds-table">
                    <thead className="sticky top-0 z-10">
                      <tr className="ds-thead-row bg-slate-900">
                        <th className="ds-th">Sıra</th>
                        <th className="ds-th">{t.actionType}</th>
                        <th className="ds-th">{t.rateOrAmount}</th>
                        <th className="ds-th">Oran Kodu</th>
                        <th className="ds-th-right">{common.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail?.actions && detail.actions.length > 0 ? (
                        detail.actions.map((act) => (
                          <tr key={act.productPriceActionSeqId} className="ds-tbody-row">
                            <td className="ds-td-mono text-slate-400">
                              {act.productPriceActionSeqId}
                            </td>
                            <td className="ds-td font-medium text-emerald-400">
                              {act.actionTypeDesc || act.productPriceActionTypeId}
                            </td>
                            <td className="ds-td font-bold text-white">
                              {act.amount}
                            </td>
                            <td className="ds-td-mono text-slate-400">
                              {act.rateCode || '-'}
                            </td>
                            <td className="ds-td-right">
                              <button
                                onClick={() => handleDeleteAction(act.productPriceActionSeqId)}
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
                            {common.noData}
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
