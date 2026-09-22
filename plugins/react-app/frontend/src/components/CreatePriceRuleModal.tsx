import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, Tag } from 'lucide-react';
import { ProductPriceRuleItem } from '../services/pricePromoStoreService';

interface CreatePriceRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ruleToEdit?: ProductPriceRuleItem | null;
  onSave: (payload: {
    productPriceRuleId?: string;
    ruleName: string;
    description?: string;
    isSale?: string;
    fromDate?: string;
    thruDate?: string;
  }) => Promise<void>;
}

export const CreatePriceRuleModal: React.FC<CreatePriceRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ruleToEdit,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.pricePromoStore;
  const common = translations.common;

  const [ruleId, setRuleId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [isSale, setIsSale] = useState('N');
  const [fromDate, setFromDate] = useState('');
  const [thruDate, setThruDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (ruleToEdit) {
        setRuleId(ruleToEdit.productPriceRuleId);
        setRuleName(ruleToEdit.ruleName || '');
        setDescription(ruleToEdit.description || '');
        setIsSale(ruleToEdit.isSale || 'N');
        setFromDate(ruleToEdit.fromDate ? ruleToEdit.fromDate.substring(0, 10) : '');
        setThruDate(ruleToEdit.thruDate ? ruleToEdit.thruDate.substring(0, 10) : '');
      } else {
        setRuleId('');
        setRuleName('');
        setDescription('');
        setIsSale('N');
        setFromDate('');
        setThruDate('');
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, ruleToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      setError(common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        productPriceRuleId: ruleId.trim() || undefined,
        ruleName: ruleName.trim(),
        description: description.trim() || undefined,
        isSale,
        fromDate: fromDate || undefined,
        thruDate: thruDate || undefined,
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
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {ruleToEdit ? t.editPriceRule : t.createPriceRule}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t.ruleId} {ruleToEdit && `(${common.selected})`}
            </label>
            <input
              type="text"
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              disabled={!!ruleToEdit}
              placeholder="RULE_AUTO_GEN"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.ruleName} *
            </label>
            <input
              type="text"
              required
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Örn: %10 Sezon Sonu İndirimi"
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {common.description}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kural açıklaması..."
              className="ds-input resize-none"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isSale"
              checked={isSale === 'Y'}
              onChange={(e) => setIsSale(e.target.checked ? 'Y' : 'N')}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500/20"
            />
            <label htmlFor="isSale" className="text-sm font-medium text-slate-300">
              {t.isSale}
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="ds-label">
                {common.date} (Başlangıç)
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="ds-input"
              />
            </div>
            <div>
              <label className="ds-label">
                {common.dueDate} (Bitiş)
              </label>
              <input
                type="date"
                value={thruDate}
                onChange={(e) => setThruDate(e.target.value)}
                className="ds-input"
              />
            </div>
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
