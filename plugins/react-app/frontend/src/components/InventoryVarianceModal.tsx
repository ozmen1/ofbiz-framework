import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, SlidersHorizontal } from 'lucide-react';
import {
  InventoryItemRow,
  VarianceReasonItem,
  createInventoryVariance,
} from '../services/inventoryMediaConfigService';

interface InventoryVarianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: InventoryItemRow;
  reasons: VarianceReasonItem[];
}

export const InventoryVarianceModal: React.FC<InventoryVarianceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  item,
  reasons,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [qohVariance, setQohVariance] = useState<number | ''>('');
  const [atpVariance, setAtpVariance] = useState<number | ''>('');
  const [varianceReasonId, setVarianceReasonId] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonOptions = useMemo(() => reasons || [], [reasons]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setQohVariance('');
      setAtpVariance('');
      setVarianceReasonId(reasonOptions[0]?.varianceReasonId || 'VAR_DAMAGED');
      setComments('');
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, reasonOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qohVariance === '' && atpVariance === '') {
      setError('Lütfen bir miktar farkı giriniz.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createInventoryVariance({
        inventoryItemId: item.inventoryItemId,
        quantityOnHandVar: qohVariance === '' ? undefined : Number(qohVariance),
        availableToPromiseVar: atpVariance === '' ? undefined : Number(atpVariance),
        varianceReasonId: varianceReasonId || reasonOptions[0]?.varianceReasonId || 'VAR_DAMAGED',
        comments: comments.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 60fps rule: solid overlay */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.adjustStockTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {t.inventoryItemId}: <span className="font-mono text-cyan-300">#{item.inventoryItemId}</span>
                {item.productName && ` • ${item.productName}`}
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

        {/* Current status display */}
        <div className="grid grid-cols-2 gap-4 px-6 py-3 bg-slate-800/40 border-b border-slate-800">
          <div>
            <span className="text-xs text-slate-400">{t.currentQoh}</span>
            <div className="text-lg font-bold text-white">{item.quantityOnHandTotal}</div>
          </div>
          <div>
            <span className="text-xs text-slate-400">{t.currentAtp}</span>
            <div className="text-lg font-bold text-emerald-400">{item.availableToPromiseTotal}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                {t.qohVariance} *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Örn: -2 veya +5"
                value={qohVariance}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value);
                  setQohVariance(val);
                  if (atpVariance === '') setAtpVariance(val);
                }}
                className="ds-input font-mono"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.atpVariance}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Örn: -2 veya +5"
                value={atpVariance}
                onChange={(e) => setAtpVariance(e.target.value === '' ? '' : Number(e.target.value))}
                className="ds-input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="ds-label">
              {t.varianceReason}
            </label>
            <select
              value={varianceReasonId}
              onChange={(e) => setVarianceReasonId(e.target.value)}
              className="ds-select"
            >
              {reasonOptions.map((r) => (
                <option key={r.varianceReasonId} value={r.varianceReasonId}>
                  {r.description || r.varianceReasonId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="ds-label">
              {common.description} / Not
            </label>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Sayım farkı, fire veya düzeltme açıklaması..."
              className="ds-input resize-none"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary text-xs"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary text-xs"
            >
              {isSubmitting ? common.loading : common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
