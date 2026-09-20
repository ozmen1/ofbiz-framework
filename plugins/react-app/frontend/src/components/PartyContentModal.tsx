import React, { useState } from 'react';
import { X, FileText, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createPartyContentRecord, PartyContentType } from '../services/api';

interface PartyContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
  availableTypes: PartyContentType[];
}

export const PartyContentModal: React.FC<PartyContentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
  availableTypes,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [partyContentTypeId, setPartyContentTypeId] = useState(
    availableTypes.length > 0 ? availableTypes[0].partyContentTypeId : 'CONTRACT'
  );
  const [contentName, setContentName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentName.trim()) {
      setErrorMessage('Belge adı zorunludur.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createPartyContentRecord({
        partyId,
        partyContentTypeId,
        contentName: contentName.trim(),
        description: description.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Belge kaydı eklenemedi.');
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
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.addDocument}</h2>
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
              {t.documentType} *
            </label>
            <select
              value={partyContentTypeId}
              onChange={(e) => setPartyContentTypeId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {availableTypes.map((type) => (
                <option key={type.partyContentTypeId} value={type.partyContentTypeId}>
                  {type.description} ({type.partyContentTypeId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.documentName} *
            </label>
            <input
              type="text"
              required
              value={contentName}
              onChange={(e) => setContentName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Örn: 2026 Distribütörlük Sözleşmesi, İmza Sirküleri"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {common.description}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Belge numarası, dosya referansı veya arşiv bilgisi..."
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
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
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
