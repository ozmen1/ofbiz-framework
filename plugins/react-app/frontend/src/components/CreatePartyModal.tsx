import React, { useState, useMemo } from 'react';
import { X, Building2, User, Phone, Mail, MapPin, Tag, Check, AlertCircle, Loader2, CreditCard } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createParty, CreatePartyPayload } from '../services/api';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (partyId: string) => void;
  roleOptions: { roleTypeId: string; description: string; isKey: boolean }[];
}

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  roleOptions,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [activeTab, setActiveTab] = useState<'PARTY_GROUP' | 'PERSON'>('PARTY_GROUP');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [groupName, setGroupName] = useState('');
  const [groupNameLocal, setGroupNameLocal] = useState('');
  const [officeSiteName, setOfficeSiteName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [personalTitle, setPersonalTitle] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const [selectedRole, setSelectedRole] = useState('CUSTOMER');
  const [idValue, setIdValue] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [customPartyId, setCustomPartyId] = useState('');

  // Memoized key role options for 60 FPS performance
  const memoizedRoles = useMemo(() => {
    return roleOptions.filter(r => r.isKey);
  }, [roleOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'PARTY_GROUP' && !groupName.trim()) {
      setErrorMessage(t.groupName + ' ' + common.error);
      return;
    }

    if (activeTab === 'PERSON' && (!firstName.trim() || !lastName.trim())) {
      setErrorMessage(t.firstName + ' / ' + t.lastName + ' ' + common.error);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePartyPayload = {
        partyTypeId: activeTab,
        partyId: customPartyId.trim() || undefined,
        roleTypeId: selectedRole || undefined,
        roleTypeIds: selectedRole ? [selectedRole] : undefined,
        emailAddress: email.trim() || undefined,
        contactNumber: phone.trim() || undefined,
        address1: address.trim() || undefined,
        city: city.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        idValue: idValue.trim() || undefined,
      };

      if (activeTab === 'PARTY_GROUP') {
        payload.groupName = groupName.trim();
        payload.groupNameLocal = groupNameLocal.trim() || undefined;
        payload.officeSiteName = officeSiteName.trim() || undefined;
        payload.partyIdentificationTypeId = 'VKN';
      } else {
        payload.firstName = firstName.trim();
        payload.lastName = lastName.trim();
        payload.personalTitle = personalTitle.trim() || undefined;
        payload.gender = gender || undefined;
        payload.birthDate = birthDate || undefined;
        payload.partyIdentificationTypeId = 'TCKN';
      }

      const res = await createParty(payload);
      onSuccess(res.partyId);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {activeTab === 'PARTY_GROUP' ? <Building2 size={20} /> : <User size={20} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {t.createModalTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'PARTY_GROUP' ? t.corporateTab : t.individualTab}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('PARTY_GROUP')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'PARTY_GROUP'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Building2 size={16} />
            <span>{t.corporateTab}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PERSON')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'PERSON'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <User size={16} />
            <span>{t.individualTab}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Core Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Tag size={14} className="text-indigo-400" />
              <span>{t.basicInfo}</span>
            </h3>

            {activeTab === 'PARTY_GROUP' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="ds-label">
                    {t.groupName} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder={t.groupNamePlaceholder}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.groupNameLocal}</label>
                  <input
                    type="text"
                    value={groupNameLocal}
                    onChange={e => setGroupNameLocal(e.target.value)}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.officeSiteName}</label>
                  <input
                    type="text"
                    value={officeSiteName}
                    onChange={e => setOfficeSiteName(e.target.value)}
                    className="ds-input"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label">
                    {t.firstName} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">
                    {t.lastName} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="ds-label">{t.titleField}</label>
                  <input
                    type="text"
                    value={personalTitle}
                    onChange={e => setPersonalTitle(e.target.value)}
                    className="ds-input"
                    placeholder="Müh., Dr., vb."
                  />
                </div>
                <div>
                  <label className="ds-label">{t.gender}</label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    className="ds-select"
                  >
                    <option value="">{common.select}</option>
                    <option value="M">{t.male}</option>
                    <option value="F">{t.female}</option>
                  </select>
                </div>
                <div>
                  <label className="ds-label">{t.birthDate}</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="ds-input"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Role & Identification */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <CreditCard size={14} className="text-indigo-400" />
              <span>{t.rolesAndClass}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="ds-label">{t.initialRole}</label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value)}
                  className="ds-select"
                >
                  <option value="CUSTOMER">Müşteri (CUSTOMER)</option>
                  <option value="SUPPLIER">Tedarikçi (SUPPLIER)</option>
                  <option value="VENDOR">Satıcı / Bayi (VENDOR)</option>
                  <option value="EMPLOYEE">Çalışan / Personel (EMPLOYEE)</option>
                  <option value="CARRIER">Taşıyıcı / Lojistik (CARRIER)</option>
                  {memoizedRoles.map(r => (
                    <option key={r.roleTypeId} value={r.roleTypeId}>
                      {r.description} ({r.roleTypeId})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="ds-label">{t.vknTckn}</label>
                <input
                  type="text"
                  value={idValue}
                  onChange={e => setIdValue(e.target.value)}
                  placeholder={activeTab === 'PARTY_GROUP' ? '10 Haneli Vergi No' : '11 Haneli T.C. Kimlik No'}
                  className="ds-input font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Phone size={14} className="text-indigo-400" />
              <span>{t.contactMechs}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="ds-label flex items-center gap-1.5">
                  <Phone size={12} className="text-slate-400" />
                  <span>{t.phone}</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="555 123 4567"
                  className="ds-input"
                />
              </div>
              <div>
                <label className="ds-label flex items-center gap-1.5">
                  <Mail size={12} className="text-slate-400" />
                  <span>{t.email}</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="ds-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="ds-label flex items-center gap-1.5">
                  <MapPin size={12} className="text-slate-400" />
                  <span>{t.address}</span>
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Cadde, Sokak, No, Bina..."
                  className="ds-input"
                />
              </div>
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
          </div>

          {/* Section 4: Advanced Party ID */}
          <div className="pt-2 border-t border-slate-800">
            <label className="ds-label">{t.customPartyIdOptional}</label>
            <input
              type="text"
              value={customPartyId}
              onChange={e => setCustomPartyId(e.target.value)}
              placeholder="Örn: CARI-001 (Opsiyonel)"
              className="ds-input font-mono text-xs"
            />
          </div>

          {/* Modal Actions */}
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
