import React, { useState, useMemo } from 'react';
import { X, UserCheck, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createPartyUserLogin, PartySecurityGroup } from '../services/api';

interface PartyUserLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
  availableSecurityGroups: PartySecurityGroup[];
}

export const PartyUserLoginModal: React.FC<PartyUserLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
  availableSecurityGroups,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [userLoginId, setUserLoginId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [groupId, setGroupId] = useState('VIEWADMIN');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const memoizedGroups = useMemo(() => {
    return availableSecurityGroups.map((group) => (
      <option key={group.groupId} value={group.groupId}>
        {group.groupId} - {group.description}
      </option>
    ));
  }, [availableSecurityGroups]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userLoginId.trim() || !currentPassword.trim()) {
      setErrorMessage('Kullanıcı adı ve şifre zorunludur.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createPartyUserLogin({
        partyId,
        userLoginId: userLoginId.trim(),
        currentPassword: currentPassword.trim(),
        groupId: groupId || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kullanıcı hesabı oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <UserCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.addUserLogin}</h2>
              <p className="text-xs text-gray-400">{partyId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center space-x-2">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.username} *
            </label>
            <input
              type="text"
              required
              value={userLoginId}
              onChange={(e) => setUserLoginId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              placeholder="Örn: ahmet.yilmaz"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.password} *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.securityGroup}
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Yetki Grubu Yok --</option>
              {memoizedGroups}
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <span>{common.create}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
