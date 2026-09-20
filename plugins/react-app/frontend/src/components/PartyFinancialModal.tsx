import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Loader2, DollarSign } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { savePartyFinancialProfile } from '../services/api';

interface PartyFinancialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
  initialLimit?: number;
  initialCurrency?: string;
  initialDescription?: string;
  billingAccountId?: string;
}

export const PartyFinancialModal: React.FC<PartyFinancialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
  initialLimit = 0,
  initialCurrency = 'TRY',
  initialDescription = '',
  billingAccountId,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [accountLimit, setAccountLimit] = useState<string>(initialLimit ? initialLimit.toString() : '0');
  const [currencyUomId, setCurrencyUomId] = useState<string>(initialCurrency || 'TRY');
  const [description, setDescription] = useState<string>(initialDescription || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setAccountLimit(initialLimit ? initialLimit.toString() : '0');
    setCurrencyUomId(initialCurrency || 'TRY');
    setDescription(initialDescription || '');
    setErrorMessage(null);
  }, [initialLimit, initialCurrency, initialDescription, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limitNum = parseFloat(accountLimit);
    if (isNaN(limitNum) || limitNum < 0) {
      setErrorMessage('Geçerli bir limit tutarı giriniz.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await savePartyFinancialProfile({
        partyId,
        billingAccountId,
        accountLimit: limitNum,
        accountCurrencyUomId: currencyUomId,
        description,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kredi limiti kaydedilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t.editCreditLimit}</h2>
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
              {t.creditLimit} *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={accountLimit}
                onChange={(e) => setAccountLimit(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="0.00"
              />
              <DollarSign size={16} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Bu limit, müşterinin açık hesap vadeli sipariş ve fatura borçlanma üst sınırıdır.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.currency}
            </label>
            <select
              value={currencyUomId}
              onChange={(e) => setCurrencyUomId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="TRY">TRY - Türk Lirası</option>
              <option value="USD">USD - Amerikan Doları</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - İngiliz Sterlini</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {t.notes}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Örn: Yönetim kurulu onaylı 2026 açık hesap kredi limiti."
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
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors disabled:opacity-50"
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
