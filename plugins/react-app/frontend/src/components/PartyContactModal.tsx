import React, { useState } from 'react';
import { X, MapPin, Phone, Mail, CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import {
  createPartyPostalAddress,
  createPartyTelecomNumber,
  createPartyEmailAddress,
  createPartyIdentification,
} from '../services/api';

type ContactType = 'ADDRESS' | 'PHONE' | 'EMAIL' | 'IDENTIFICATION';

interface PartyContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  partyId: string;
  partyName: string;
  initialType?: ContactType;
  onSuccess: () => void;
  purposeOptions: { contactMechPurposeTypeId: string; description: string }[];
  identificationTypeOptions: { partyIdentificationTypeId: string; description: string }[];
}

export const PartyContactModal: React.FC<PartyContactModalProps> = ({
  isOpen,
  onClose,
  partyId,
  partyName,
  initialType = 'ADDRESS',
  onSuccess,
  purposeOptions,
  identificationTypeOptions,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [contactType, setContactType] = useState<ContactType>(initialType);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Address fields
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [countryGeoId, setCountryGeoId] = useState('TUR');
  const [addressPurpose, setAddressPurpose] = useState('GENERAL_LOCATION');

  // Phone fields
  const [countryCode, setCountryCode] = useState('90');
  const [areaCode, setAreaCode] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [phonePurpose, setPhonePurpose] = useState('PRIMARY_PHONE');

  // Email fields
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPurpose, setEmailPurpose] = useState('PRIMARY_EMAIL');

  // Identification fields
  const [idTypeId, setIdTypeId] = useState('VKN');
  const [idValue, setIdValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (contactType === 'ADDRESS') {
        if (!address1.trim()) {
          throw new Error(t.address + ' ' + common.error);
        }
        await createPartyPostalAddress({
          partyId,
          address1: address1.trim(),
          address2: address2.trim() || undefined,
          city: city.trim() || '',
          postalCode: postalCode.trim() || '',
          countryGeoId: countryGeoId || 'TUR',
          contactMechPurposeTypeId: addressPurpose,
        });
      } else if (contactType === 'PHONE') {
        if (!contactNumber.trim()) {
          throw new Error(t.phone + ' ' + common.error);
        }
        await createPartyTelecomNumber({
          partyId,
          countryCode: countryCode.trim() || '90',
          areaCode: areaCode.trim() || undefined,
          contactNumber: contactNumber.trim(),
          contactMechPurposeTypeId: phonePurpose,
        });
      } else if (contactType === 'EMAIL') {
        if (!emailAddress.trim()) {
          throw new Error(t.email + ' ' + common.error);
        }
        await createPartyEmailAddress({
          partyId,
          emailAddress: emailAddress.trim(),
          contactMechPurposeTypeId: emailPurpose,
        });
      } else if (contactType === 'IDENTIFICATION') {
        if (!idValue.trim()) {
          throw new Error(t.idNumber + ' ' + common.error);
        }
        await createPartyIdentification({
          partyId,
          partyIdentificationTypeId: idTypeId,
          idValue: idValue.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {contactType === 'ADDRESS' && t.addAddress}
              {contactType === 'PHONE' && t.addPhone}
              {contactType === 'EMAIL' && t.addEmail}
              {contactType === 'IDENTIFICATION' && t.addIdentification}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {partyName} ({partyId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Type selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => setContactType('ADDRESS')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              contactType === 'ADDRESS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin size={14} />
            <span className="truncate">{t.postalAddresses}</span>
          </button>
          <button
            type="button"
            onClick={() => setContactType('PHONE')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              contactType === 'PHONE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone size={14} />
            <span className="truncate">{t.telecomNumbers}</span>
          </button>
          <button
            type="button"
            onClick={() => setContactType('EMAIL')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              contactType === 'EMAIL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail size={14} />
            <span className="truncate">{t.emailAddresses}</span>
          </button>
          <button
            type="button"
            onClick={() => setContactType('IDENTIFICATION')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              contactType === 'IDENTIFICATION'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard size={14} />
            <span className="truncate">VKN/TCKN</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {contactType === 'ADDRESS' && (
            <div className="space-y-3.5">
              <div>
                <label className="ds-label">{t.fullAddress} *</label>
                <input
                  type="text"
                  required
                  value={address1}
                  onChange={e => setAddress1(e.target.value)}
                  placeholder="Cadde, Sokak, Kapı No"
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">Adres Devamı (Bina, Kat, Daire vb.)</label>
                <input
                  type="text"
                  value={address2}
                  onChange={e => setAddress2(e.target.value)}
                  className="ds-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.city}</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="İstanbul, Ankara vb."
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.postalCode}</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    placeholder="34000"
                    className="ds-input font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="ds-label">{t.country}</label>
                  <select
                    value={countryGeoId}
                    onChange={e => setCountryGeoId(e.target.value)}
                    className="ds-select"
                  >
                    <option value="TUR">Türkiye (TUR)</option>
                    <option value="USA">United States (USA)</option>
                    <option value="DEU">Germany (DEU)</option>
                    <option value="GBR">United Kingdom (GBR)</option>
                  </select>
                </div>
                <div>
                  <label className="ds-label">{t.purpose}</label>
                  <select
                    value={addressPurpose}
                    onChange={e => setAddressPurpose(e.target.value)}
                    className="ds-select"
                  >
                    <option value="GENERAL_LOCATION">Genel Yazışma Adresi</option>
                    <option value="BILLING_LOCATION">Fatura Adresi (AP/AR)</option>
                    <option value="SHIPPING_LOCATION">Teslimat / Sevk Adresi</option>
                    <option value="PRIMARY_LOCATION">Merkez / Birincil Konum</option>
                    {purposeOptions
                      .filter(p => p.contactMechPurposeTypeId.includes('LOCATION'))
                      .map(p => (
                        <option key={p.contactMechPurposeTypeId} value={p.contactMechPurposeTypeId}>
                          {p.description}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {contactType === 'PHONE' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="ds-label">Ülke Kodu</label>
                  <input
                    type="text"
                    value={countryCode}
                    onChange={e => setCountryCode(e.target.value)}
                    placeholder="90"
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="ds-label">Alan Kodu</label>
                  <input
                    type="text"
                    value={areaCode}
                    onChange={e => setAreaCode(e.target.value)}
                    placeholder="212"
                    className="ds-input font-mono"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.phone} *</label>
                  <input
                    type="tel"
                    required
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="5551234"
                    className="ds-input font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="ds-label">{t.purpose}</label>
                <select
                  value={phonePurpose}
                  onChange={e => setPhonePurpose(e.target.value)}
                  className="ds-select"
                >
                  <option value="PRIMARY_PHONE">Birincil Telefon</option>
                  <option value="PHONE_MOBILE">Cep Telefonu (GSM)</option>
                  <option value="PHONE_WORK">İş / Ofis Telefonu</option>
                  <option value="PHONE_BILLING">Muhasebe / Fatura Telefonu</option>
                  <option value="FAX_NUMBER">Faks Numarası</option>
                  {purposeOptions
                    .filter(p => p.contactMechPurposeTypeId.includes('PHONE') || p.contactMechPurposeTypeId.includes('FAX'))
                    .map(p => (
                      <option key={p.contactMechPurposeTypeId} value={p.contactMechPurposeTypeId}>
                        {p.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {contactType === 'EMAIL' && (
            <div className="space-y-3.5">
              <div>
                <label className="ds-label">{t.email} *</label>
                <input
                  type="email"
                  required
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  placeholder="muhasebe@sirket.com"
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label">{t.purpose}</label>
                <select
                  value={emailPurpose}
                  onChange={e => setEmailPurpose(e.target.value)}
                  className="ds-select"
                >
                  <option value="PRIMARY_EMAIL">Birincil E-posta</option>
                  <option value="BILLING_EMAIL">Fatura Bildirim E-postası</option>
                  <option value="ORDER_EMAIL">Sipariş Bildirim E-postası</option>
                  <option value="SUPPORT_EMAIL">Müşteri Destek E-postası</option>
                  {purposeOptions
                    .filter(p => p.contactMechPurposeTypeId.includes('EMAIL'))
                    .map(p => (
                      <option key={p.contactMechPurposeTypeId} value={p.contactMechPurposeTypeId}>
                        {p.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {contactType === 'IDENTIFICATION' && (
            <div className="space-y-3.5">
              <div>
                <label className="ds-label">{t.idType}</label>
                <select
                  value={idTypeId}
                  onChange={e => setIdTypeId(e.target.value)}
                  className="ds-select"
                >
                  <option value="VKN">Vergi Kimlik Numarası (VKN)</option>
                  <option value="TCKN">T.C. Kimlik Numarası (TCKN)</option>
                  <option value="MERSIS">Mersis Numarası</option>
                  <option value="TAX_ID">Uluslararası Tax ID</option>
                  {identificationTypeOptions.map(idOpt => (
                    <option key={idOpt.partyIdentificationTypeId} value={idOpt.partyIdentificationTypeId}>
                      {idOpt.description} ({idOpt.partyIdentificationTypeId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">{t.idNumber} *</label>
                <input
                  type="text"
                  required
                  value={idValue}
                  onChange={e => setIdValue(e.target.value)}
                  placeholder="Numara veya Sicil Kodu girin..."
                  className="ds-input font-mono"
                />
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{common.loading}</span>
                </>
              ) : (
                <>
                  <Check size={16} />
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
