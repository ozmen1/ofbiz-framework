import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, GitBranch, Loader2, AlertCircle } from 'lucide-react';
import { createRouting } from '../services/manufacturingService';

interface CreateRoutingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateRoutingModal: React.FC<CreateRoutingModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { translations } = useTranslation();
  const mTrans = translations.manufacturing;
  const common = translations.common;

  const [routingName, setRoutingName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      setRoutingName('');
      setDescription('');
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routingName.trim()) {
      setError(mTrans.routingName);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createRouting({
        routingName: routingName.trim(),
        description: description.trim() || undefined
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : common.error;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 ds-overlay z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mTrans.createRoutingTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mTrans.createRoutingSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="ds-alert-error flex items-center gap-2 p-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="ds-label">{mTrans.routingName} *</label>
            <input
              type="text"
              value={routingName}
              onChange={e => setRoutingName(e.target.value)}
              placeholder="Örn: Standart Montaj & Test Rotası"
              className="ds-input"
              required
            />
          </div>

          <div>
            <label className="ds-label">{mTrans.descriptionLabel}</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="İş merkezi operasyon açıklamaları..."
              className="ds-input resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
