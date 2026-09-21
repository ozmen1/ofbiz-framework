import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, Loader2, Check, Globe } from 'lucide-react';
import { createTenantAdmin } from '../services/api';
import { useTranslation } from '../i18n';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTenantId: string) => void;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { translations } = useTranslation();
  const t = translations.systemAdmin;
  const common = translations.common;

  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [initialPath, setInitialPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Body scroll lock (60 FPS / Golden Invariants)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setTenantId('');
      setTenantName('');
      setDomainName('');
      setInitialPath('');
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

    const trimmedTenantId = tenantId.trim().toLowerCase();
    if (!trimmedTenantId) {
      setErrorMessage(`${t.tenantId} zorunludur.`);
      return;
    }

    if (!tenantName.trim()) {
      setErrorMessage(`${t.tenantName} zorunludur.`);
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(trimmedTenantId)) {
      setErrorMessage('Kiracı kodu sadece küçük harf, rakam, tire ve alt çizgi içerebilir.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTenantAdmin({
        tenantId: trimmedTenantId,
        tenantName: tenantName.trim(),
        initialPath: initialPath.trim() || undefined,
        domainName: domainName.trim() || undefined,
      });
      onSuccess(res.tenantId || trimmedTenantId);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kiracı oluşturulamadı.');
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
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t.createTenant}</h2>
              <p className="text-xs text-slate-400">{t.tabTenants}</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.tenantId} *
            </label>
            <input
              type="text"
              required
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value.toLowerCase())}
              placeholder="örn: tenant1, acme, eurasia"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Küçük harf, rakam ve tire kullanın. Benzersiz olmalıdır.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.tenantName} *
            </label>
            <input
              type="text"
              required
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="örn: Acme Corporation Ltd."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Globe size={13} className="text-slate-400" />
              <span>{t.domainName}</span>
            </label>
            <input
              type="text"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="örn: acme.mycompany.com (Opsiyonel)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Bu alan adından gelen istekler doğrudan bu kiracıya yönlendirilir.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.initialPath}
            </label>
            <input
              type="text"
              value={initialPath}
              onChange={(e) => setInitialPath(e.target.value)}
              placeholder="örn: /react-app/ (Opsiyonel)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              <span>{common.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTenantModal;
