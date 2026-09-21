import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, ShieldAlert, Loader2, Key, User, Shield, Check } from 'lucide-react';
import { createUserLoginAdmin, fetchUserAdminMetadata, UserAdminMetadataResponse } from '../services/api';
import { useTranslation } from '../i18n';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newUserLoginId: string) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { translations } = useTranslation();
  const t = translations.users;
  const common = translations.common;

  const [userLoginId, setUserLoginId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [passwordVerify, setPasswordVerify] = useState('');
  const [partyId, setPartyId] = useState('');
  const [groupId, setGroupId] = useState('VIEWADMIN');
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);

  const [metadata, setMetadata] = useState<UserAdminMetadataResponse['metadata']>({
    securityGroups: [],
    parties: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load dropdown metadata
      fetchUserAdminMetadata()
        .then((res) => setMetadata(res.metadata))
        .catch(() => {});
    } else {
      document.body.style.overflow = '';
      setUserLoginId('');
      setCurrentPassword('');
      setPasswordVerify('');
      setPartyId('');
      setGroupId('VIEWADMIN');
      setRequirePasswordChange(false);
      setErrorMessage(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const memoizedGroups = useMemo(() => {
    return metadata.securityGroups.map((g) => (
      <option key={g.groupId} value={g.groupId}>
        {g.groupId} - {g.description}
      </option>
    ));
  }, [metadata.securityGroups]);

  const memoizedParties = useMemo(() => {
    return metadata.parties.map((p) => (
      <option key={p.partyId} value={p.partyId}>
        {p.name}
      </option>
    ));
  }, [metadata.parties]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = userLoginId.trim();
    if (!trimmedUser || !currentPassword.trim()) {
      setErrorMessage(t.passwordVerify);
      return;
    }

    if (currentPassword !== passwordVerify) {
      setErrorMessage(translations.auth.passwordMismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createUserLoginAdmin({
        userLoginId: trimmedUser,
        currentPassword: currentPassword.trim(),
        partyId: partyId ? partyId.trim() : undefined,
        groupId: groupId || undefined,
        requirePasswordChange: requirePasswordChange ? 'Y' : 'N',
      });
      onSuccess(res.userLoginId || trimmedUser);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kullanıcı oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{t.createUser}</h2>
              <p className="text-xs text-slate-400">{t.subtitle}</p>
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
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
              <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.userLoginId} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User size={16} />
              </div>
              <input
                type="text"
                required
                value={userLoginId}
                onChange={(e) => setUserLoginId(e.target.value)}
                placeholder="Örn: ahmet.yilmaz"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-mono"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.password} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t.passwordVerify} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key size={16} />
                </div>
                <input
                  type="password"
                  required
                  value={passwordVerify}
                  onChange={(e) => setPasswordVerify(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.securityGroups}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Shield size={16} />
              </div>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="">-- Yetki Grubu Yok --</option>
                {memoizedGroups}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              {t.partyLink}
            </label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">-- {t.selectParty} --</option>
              {memoizedParties}
            </select>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={requirePasswordChange}
                onChange={(e) => setRequirePasswordChange(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
              />
              <span>{t.requirePasswordChange}</span>
            </label>
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
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-red-700 hover:from-indigo-500 hover:to-red-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{t.createUser}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
