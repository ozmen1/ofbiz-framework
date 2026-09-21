import React, { useState, useEffect, useMemo } from 'react';
import { X, Network, AlertCircle, Loader2, Check } from 'lucide-react';
import { createRoleTypeAdmin } from '../services/api';
import { useTranslation } from '../i18n';

interface CreateRoleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newRoleTypeId: string) => void;
  existingRoleTypes: { roleTypeId: string; description: string }[];
}

export const CreateRoleTypeModal: React.FC<CreateRoleTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingRoleTypes,
}) => {
  const { translations } = useTranslation();
  const t = translations.users;
  const common = translations.common;

  const [roleTypeId, setRoleTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [parentTypeId, setParentTypeId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Body scroll lock (60 FPS / Golden Invariants)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setRoleTypeId('');
      setDescription('');
      setParentTypeId('');
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Memoize parent role options to prevent render lag
  const memoizedParentOptions = useMemo(() => {
    return existingRoleTypes.map(rt => (
      <option key={rt.roleTypeId} value={rt.roleTypeId}>
        {rt.description} ({rt.roleTypeId})
      </option>
    ));
  }, [existingRoleTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedRoleTypeId = roleTypeId.trim().toUpperCase();
    if (!trimmedRoleTypeId) {
      setErrorMessage(t.roleTypeCode + ' zorunludur.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage(t.roleTypeDescription + ' zorunludur.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRoleTypeAdmin({
        roleTypeId: trimmedRoleTypeId,
        description: description.trim(),
        parentTypeId: parentTypeId.trim() || undefined,
      });
      onSuccess(res.roleTypeId || trimmedRoleTypeId);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Rol tipi oluşturulamadı.');
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
              <Network size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t.createRoleType}</h2>
              <p className="text-xs text-slate-400">{t.tabRoleTypes}</p>
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
              <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.roleTypeCode} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={roleTypeId}
              onChange={e => setRoleTypeId(e.target.value.toUpperCase())}
              placeholder="Örn: REGIONAL_DIRECTOR"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono uppercase focus:border-indigo-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Büyük harf ve alt çizgi kullanın. Benzersiz bir anahtar olmalıdır.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.roleTypeDescription} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Örn: Bölge Satış Direktörü"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.parentRoleType} ({common.none})
            </label>
            <select
              value={parentTypeId}
              onChange={e => setParentTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-indigo-500 focus:outline-hidden"
            >
              <option value="">-- {t.noParentRole} --</option>
              {memoizedParentOptions}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Bu rolün miras alacağı hiyerarşik üst rolü seçebilirsiniz.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{common.save}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
