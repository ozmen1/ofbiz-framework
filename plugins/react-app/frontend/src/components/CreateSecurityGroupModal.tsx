import React, { useState, useEffect } from 'react';
import { X, ShieldPlus, ShieldAlert, Loader2, Check } from 'lucide-react';
import { createSecurityGroupAdmin } from '../services/api';
import { useTranslation } from '../i18n';

interface CreateSecurityGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newGroupId: string) => void;
}

export const CreateSecurityGroupModal: React.FC<CreateSecurityGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { translations } = useTranslation();
  const t = translations.users;
  const common = translations.common;

  const [groupId, setGroupId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setGroupId('');
      setDescription('');
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedGroupId = groupId.trim().toUpperCase();
    if (!trimmedGroupId) {
      setErrorMessage(t.groupCode + ' zorunludur.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSecurityGroupAdmin({
        groupId: trimmedGroupId,
        description: description.trim() || trimmedGroupId,
      });
      onSuccess(res.groupId || trimmedGroupId);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Yetki grubu oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <ShieldPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t.createGroup}</h2>
              <p className="text-xs text-slate-400">{t.tabSecurityGroups}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.groupCode} *
            </label>
            <input
              type="text"
              required
              value={groupId}
              onChange={(e) => setGroupId(e.target.value.toUpperCase())}
              placeholder="Örn: WAREHOUSE_MGR"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.groupDescription}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Grup görev ve yetki alanı açıklaması..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{t.createGroup}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
