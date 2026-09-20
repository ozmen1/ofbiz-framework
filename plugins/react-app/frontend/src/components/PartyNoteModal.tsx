import React, { useState } from 'react';
import { X, MessageSquarePlus, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createPartyNote } from '../services/api';

interface PartyNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
}

export const PartyNoteModal: React.FC<PartyNoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [noteName, setNoteName] = useState('Cari Görüşme / Tahsilat Notu');
  const [noteInfo, setNoteInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInfo.trim()) {
      setErrorMessage('Lütfen not açıklamasını giriniz.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createPartyNote(partyId, noteName, noteInfo.trim());
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Not kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
              <MessageSquarePlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.addNote}</h2>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center space-x-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.noteTitle} *
            </label>
            <input
              type="text"
              required
              value={noteName}
              onChange={(e) => setNoteName(e.target.value)}
              placeholder="Örn: Müşteri Ziyareti, Tahsilat Görüşmesi"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.noteContent} *
            </label>
            <textarea
              required
              rows={4}
              value={noteInfo}
              onChange={(e) => setNoteInfo(e.target.value)}
              placeholder="Görüşülen konu, alınan kararlar veya dahili şirket notu..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              <span>{common.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
