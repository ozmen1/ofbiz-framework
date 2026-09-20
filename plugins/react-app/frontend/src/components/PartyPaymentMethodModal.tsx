import React, { useState } from 'react';
import { X, CreditCard as CardIcon, Building2, Loader2, ShieldAlert } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createPartyEftAccount, createPartyCreditCard } from '../services/api';

interface PartyPaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partyId: string;
}

export const PartyPaymentMethodModal: React.FC<PartyPaymentMethodModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  partyId,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [activeTab, setActiveTab] = useState<'EFT' | 'CC'>('EFT');

  // EFT form state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [nameOnAccount, setNameOnAccount] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [eftDesc, setEftDesc] = useState('');

  // CC form state
  const [cardNumber, setCardNumber] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [cardType, setCardType] = useState('CCT_VISA');
  const [nameOnCard, setNameOnCard] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim()) {
      setErrorMessage('Banka adı ve IBAN zorunludur.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createPartyEftAccount({
        partyId,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        nameOnAccount: nameOnAccount.trim() || undefined,
        routingNumber: routingNumber.trim() || undefined,
        description: eftDesc.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Banka hesabı eklenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber.trim() || !expireDate.trim()) {
      setErrorMessage('Kart numarası ve son kullanma tarihi zorunludur.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await createPartyCreditCard({
        partyId,
        cardNumber: cardNumber.trim(),
        expireDate: expireDate.trim(),
        cardType,
        nameOnCard: nameOnCard.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Kredi kartı eklenemedi.');
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
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              {activeTab === 'EFT' ? <Building2 size={20} /> : <CardIcon size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {activeTab === 'EFT' ? t.addBankAccount : t.addCreditCard}
              </h2>
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

        {/* Tab Selection */}
        <div className="flex border-b border-gray-800 px-6 pt-3 space-x-4 bg-gray-900/30">
          <button
            type="button"
            onClick={() => { setActiveTab('EFT'); setErrorMessage(null); }}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'EFT'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Building2 size={16} />
            <span>{t.bankAccounts}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('CC'); setErrorMessage(null); }}
            className={`pb-3 text-sm font-medium border-b-2 flex items-center space-x-2 transition-colors ${
              activeTab === 'CC'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CardIcon size={16} />
            <span>{t.creditCards}</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center space-x-2">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* EFT Form */}
        {activeTab === 'EFT' && (
          <form onSubmit={handleEftSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {t.bankName} *
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Örn: Garanti BBVA, Ziraat Bankası, İş Bankası"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {t.iban} *
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                placeholder="TR00 0000 0000 0000 0000 0000 00"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  {t.accountHolder}
                </label>
                <input
                  type="text"
                  value={nameOnAccount}
                  onChange={(e) => setNameOnAccount(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Hesap Sahibi Adı"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  {t.routingNumber}
                </label>
                <input
                  type="text"
                  value={routingNumber}
                  onChange={(e) => setRoutingNumber(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Şube Kodu / Swift"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {common.description}
              </label>
              <input
                type="text"
                value={eftDesc}
                onChange={(e) => setEftDesc(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="Örn: TL Vadesiz Ticari Hesap"
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
                className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
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
        )}

        {/* CC Form */}
        {activeTab === 'CC' && (
          <form onSubmit={handleCcSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {t.cardNumber} *
              </label>
              <input
                type="text"
                required
                maxLength={19}
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                placeholder="4000 1234 5678 9010"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  {t.cardType}
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CCT_VISA">Visa</option>
                  <option value="CCT_MASTERCARD">MasterCard</option>
                  <option value="CCT_AMERICANEXPRESS">American Express</option>
                  <option value="CCT_TROY">Troy</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  {t.expireDate} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={7}
                  value={expireDate}
                  onChange={(e) => setExpireDate(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
                  placeholder="12/2028"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                {t.nameOnCard}
              </label>
              <input
                type="text"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                placeholder="KART SAHİBİ ADI"
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
                className="flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
};
