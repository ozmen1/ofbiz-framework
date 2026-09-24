import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import {
  X,
  Building2,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import {
  createFacility,
  updateFacility,
  FacilityItem,
  FacilityTypeItem,
} from '../services/facilityInventoryService';

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  facilityToEdit?: FacilityItem | null;
  facilityTypes: FacilityTypeItem[];
}

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  facilityToEdit,
  facilityTypes,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const isEditing = Boolean(facilityToEdit);

  const [facilityId, setFacilityId] = useState<string>('');
  const [facilityName, setFacilityName] = useState<string>('');
  const [facilityTypeId, setFacilityTypeId] = useState<string>('WAREHOUSE');
  const [ownerPartyId, setOwnerPartyId] = useState<string>('Company');
  const [description, setDescription] = useState<string>('');
  const [facilitySize, setFacilitySize] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (facilityToEdit) {
        setFacilityId(facilityToEdit.facilityId);
        setFacilityName(facilityToEdit.facilityName);
        setFacilityTypeId(facilityToEdit.facilityTypeId || 'WAREHOUSE');
        setOwnerPartyId(facilityToEdit.ownerPartyId || 'Company');
        setDescription(facilityToEdit.description || '');
        setFacilitySize(facilityToEdit.facilitySize ? String(facilityToEdit.facilitySize) : '');
      } else {
        setFacilityId('');
        setFacilityName('');
        setFacilityTypeId('WAREHOUSE');
        setOwnerPartyId('Company');
        setDescription('');
        setFacilitySize('');
      }
    } else {
      document.body.style.overflow = '';
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, facilityToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityName.trim()) {
      setError(t.facilityNameRequired || 'Tesis adı zorunludur.');
      return;
    }

    const sizeNum = facilitySize ? parseFloat(facilitySize) : undefined;

    try {
      setIsSubmitting(true);
      setError(null);

      if (isEditing) {
        await updateFacility({
          facilityId,
          facilityName: facilityName.trim(),
          facilityTypeId,
          ownerPartyId: ownerPartyId.trim() || undefined,
          description: description.trim() || undefined,
          facilitySize: sizeNum,
        });
      } else {
        await createFacility({
          facilityId: facilityId.trim() || undefined,
          facilityName: facilityName.trim(),
          facilityTypeId,
          ownerPartyId: ownerPartyId.trim() || 'Company',
          description: description.trim() || undefined,
          facilitySize: sizeNum,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Tesis kaydedilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 ds-overlay flex items-center justify-center p-3 sm:p-4 z-[80]">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {isEditing ? (t.editFacility || 'Depoyu / Tesisi Düzenle') : (t.newFacility || 'Yeni Depo / Tesis Tanımla')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.facilityFormSubtitle || 'İşletmenize ait depo, mağaza veya üretim tesis bilgilerini yapılandırın'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Facility Name & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.facilityName || 'Depo / Tesis Adı'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={facilityName}
                onChange={(e) => setFacilityName(e.target.value)}
                className="ds-input text-xs"
                placeholder="Örn: Kadıköy Ana Depo"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.facilityId || 'Tesis Kodu (ID)'}
              </label>
              <input
                type="text"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                disabled={isEditing}
                className="ds-input text-xs font-mono disabled:opacity-60"
                placeholder={isEditing ? facilityId : 'Boş bırakılırsa otomatik üretilir'}
              />
            </div>
          </div>

          {/* Facility Type & Owner Party */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.facilityType || 'Tesis Türü'} <span className="text-rose-500">*</span>
              </label>
              <select
                value={facilityTypeId}
                onChange={(e) => setFacilityTypeId(e.target.value)}
                className="ds-select text-xs w-full"
                required
              >
                {facilityTypes.map((ft) => (
                  <option key={ft.facilityTypeId} value={ft.facilityTypeId}>
                    {ft.description} ({ft.facilityTypeId})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.ownerPartyId || 'Bağlı Şirket / Sahip Taraf'}
              </label>
              <input
                type="text"
                value={ownerPartyId}
                onChange={(e) => setOwnerPartyId(e.target.value)}
                className="ds-input text-xs font-mono"
                placeholder="Örn: Company"
              />
            </div>
          </div>

          {/* Facility Size */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.facilitySize || 'Alan / Depo Boyutu (m²)'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={facilitySize}
              onChange={(e) => setFacilitySize(e.target.value)}
              className="ds-input text-xs font-mono"
              placeholder="Örn: 1500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t.description || 'Açıklama'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="ds-input text-xs"
              placeholder={t.facilityDescPlaceholder || 'Tesis lokasyonu, çalışma saatleri veya işlevi hakkında detay...'}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="ds-btn-secondary px-4 py-2 text-xs"
            >
              {common?.cancel || 'İptal'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>{common?.saving || 'Kaydediliyor...'}</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{isEditing ? (common?.save || 'Kaydet') : (t.createFacilityBtn || 'Depo Oluştur')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
