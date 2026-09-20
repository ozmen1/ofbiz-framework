import React, { useState, useEffect } from 'react';
import { X, Tag, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { savePartyAttribute } from '../services/api';

interface PartyAttributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
  initialAttrName?: string;
  initialAttrValue?: string;
  initialAttrDescription?: string;
}

export const PartyAttributeModal: React.FC<PartyAttributeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
  initialAttrName = '',
  initialAttrValue = '',
  initialAttrDescription = '',
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [attrName, setAttrName] = useState(initialAttrName);
  const [attrValue, setAttrValue] = useState(initialAttrValue);
  const [attrDescription, setAttrDescription] = useState(initialAttrDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAttrName(initialAttrName);
    setAttrValue(initialAttrValue);
    setAttrDescription(initialAttrDescription);
    setErrorMessage(null);
  }, [initialAttrName, initialAttrValue, initialAttrDescription, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attrName.trim()) {
      setErrorMessage('Nitelik adı zorunludur.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await savePartyAttribute({
        partyId,
        attrName: attrName.trim(),
        attrValue: attrValue.trim(),
        attrDescription: attrDescription.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Nitelik kaydedilemedi.');
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
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.addAttribute}</h2>
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
              {t.attrName} *
            </label>
            <input
              type="text"
              required
              disabled={!!initialAttrName}
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 disabled:opacity-60"
              placeholder="Örn: ERP_INTEGRATION_KEY, CONTRACT_CODE, REGION"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.attrValue}
            </label>
            <textarea
              rows={3}
              value={attrValue}
              onChange={(e) => setAttrValue(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="Parametre değeri veya verisi..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.attrDescription}
            </label>
            <input
              type="text"
              value={attrDescription}
              onChange={(e) => setAttrDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              placeholder="Açıklama / not..."
            />
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
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
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
