import React, { useState, useMemo } from 'react';
import { X, CalendarClock, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createPartyPaymentTerm, PartyTermType } from '../services/api';

interface PartyPaymentTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
  availableTermTypes: PartyTermType[];
}

export const PartyPaymentTermModal: React.FC<PartyPaymentTermModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
  availableTermTypes,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [termTypeId, setTermTypeId] = useState<string>(
    availableTermTypes[0]?.termTypeId || 'FIN_PAYMENT_TERM'
  );
  const [termDays, setTermDays] = useState<string>('30');
  const [termValue, setTermValue] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const memoizedTermOptions = useMemo(() => {
    return availableTermTypes.map((tt) => (
      <option key={tt.termTypeId} value={tt.termTypeId}>
        {tt.description || tt.termTypeId}
      </option>
    ));
  }, [availableTermTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termTypeId) {
      setErrorMessage('Lütfen koşul tipi seçin.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createPartyPaymentTerm({
        partyId,
        termTypeId,
        termDays: termDays ? parseInt(termDays, 10) : undefined,
        termValue: termValue ? parseFloat(termValue) : undefined,
        description,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Vade koşulu kaydedilemedi.');
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
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <CalendarClock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.addPaymentTerm}</h2>
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
              {t.termType} *
            </label>
            <select
              value={termTypeId}
              onChange={(e) => setTermTypeId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              {memoizedTermOptions}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {t.termDays}
              </label>
              <input
                type="number"
                min="0"
                value={termDays}
                onChange={(e) => setTermDays(e.target.value)}
                placeholder="30"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {t.termValue}
              </label>
              <input
                type="number"
                step="0.01"
                value={termValue}
                onChange={(e) => setTermValue(e.target.value)}
                placeholder="Örn: 2.50"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.notes}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Fatura tarihinden itibaren 30 gün net vade"
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
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
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
