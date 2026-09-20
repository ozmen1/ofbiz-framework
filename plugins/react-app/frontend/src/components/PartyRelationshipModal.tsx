import React, { useState } from 'react';
import { X, Users, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/I18nContext';
import { createPartyRelationship } from '../services/api';

interface PartyRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyPartyId: string;
  companyName: string;
  onSuccess: () => void;
}

export const PartyRelationshipModal: React.FC<PartyRelationshipModalProps> = ({
  isOpen,
  onClose,
  companyPartyId,
  companyName,
  onSuccess,
}) => {
  const { translations } = useTranslation();
  const t = translations.parties;
  const common = translations.common;

  const [personPartyId, setPersonPartyId] = useState('');
  const [relationshipType, setRelationshipType] = useState('EMPLOYMENT');
  const [roleFrom, setRoleFrom] = useState('INTERNAL_ORGANIZATIO');
  const [roleTo, setRoleTo] = useState('EMPLOYEE');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personPartyId.trim()) {
      setErrorMessage(t.connectedParty + ' ' + common.error);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createPartyRelationship({
        partyIdFrom: companyPartyId,
        partyIdTo: personPartyId.trim(),
        partyRelationshipTypeId: relationshipType,
        roleTypeIdFrom: roleFrom,
        roleTypeIdTo: roleTo,
        comments: comments.trim() || undefined,
      });

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
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.addRelationship}
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                {companyName} ({companyPartyId})
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm">
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="ds-label">
              Bağlanacak Kişi (Taraf / Personel Kodu) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={personPartyId}
              onChange={e => setPersonPartyId(e.target.value)}
              placeholder="Örn: 10001, admin, DemoEmployee..."
              className="ds-input font-mono"
            />
          </div>

          <div>
            <label className="ds-label">{t.relationshipType}</label>
            <select
              value={relationshipType}
              onChange={e => {
                const val = e.target.value;
                setRelationshipType(val);
                if (val === 'EMPLOYMENT') {
                  setRoleFrom('INTERNAL_ORGANIZATIO');
                  setRoleTo('EMPLOYEE');
                } else if (val === 'CONTACT_REL') {
                  setRoleFrom('ACCOUNT');
                  setRoleTo('CONTACT');
                } else if (val === 'CUSTOMER_REL') {
                  setRoleFrom('INTERNAL_ORGANIZATIO');
                  setRoleTo('CUSTOMER');
                }
              }}
              className="ds-select"
            >
              <option value="EMPLOYMENT">Çalışan / İstihdam (EMPLOYMENT)</option>
              <option value="CONTACT_REL">Yetkili / Kontak Kişi (CONTACT_REL)</option>
              <option value="CUSTOMER_REL">Müşteri Temsilcisi (CUSTOMER_REL)</option>
              <option value="SUPPLIER_REL">Tedarikçi İrtibatı (SUPPLIER_REL)</option>
              <option value="GROUP_ROLLUP">Alt Şube / Grup (GROUP_ROLLUP)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">Kurum Rolü</label>
              <input
                type="text"
                value={roleFrom}
                onChange={e => setRoleFrom(e.target.value)}
                className="ds-input font-mono text-xs"
              />
            </div>
            <div>
              <label className="ds-label">Kişi Rolü</label>
              <input
                type="text"
                value={roleTo}
                onChange={e => setRoleTo(e.target.value)}
                className="ds-input font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="ds-label">{t.notes} / Görev Ünvanı</label>
            <input
              type="text"
              value={comments}
              onChange={e => setComments(e.target.value)}
              placeholder="Örn: Muhasebe Müdürü, Satın Alma Sorumlusu..."
              className="ds-input"
            />
          </div>

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
