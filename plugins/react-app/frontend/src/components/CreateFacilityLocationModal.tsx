import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, MapPin } from 'lucide-react';
import {
  FacilityQuickItem,
  createFacilityLocation,
} from '../services/inventoryMediaConfigService';

interface CreateFacilityLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  facilities: FacilityQuickItem[];
  defaultFacilityId?: string;
}

export const CreateFacilityLocationModal: React.FC<CreateFacilityLocationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  facilities,
  defaultFacilityId,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [facilityId, setFacilityId] = useState('');
  const [locationSeqId, setLocationSeqId] = useState('');
  const [locationTypeEnumId, setLocationTypeEnumId] = useState('FLT_PICKLOC');
  const [areaId, setAreaId] = useState('');
  const [aisleId, setAisleId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const facilityOptions = useMemo(() => facilities || [], [facilities]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFacilityId(defaultFacilityId || facilityOptions[0]?.facilityId || '');
      setLocationSeqId('');
      setLocationTypeEnumId('FLT_PICKLOC');
      setAreaId('');
      setAisleId('');
      setSectionId('');
      setLevelId('');
      setPositionId('');
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, defaultFacilityId, facilityOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) {
      setError('Lütfen bir depo / tesis seçiniz.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createFacilityLocation({
        facilityId,
        locationSeqId: locationSeqId.trim() || undefined,
        locationTypeEnumId,
        areaId: areaId.trim() || undefined,
        aisleId: aisleId.trim() || undefined,
        sectionId: sectionId.trim() || undefined,
        levelId: levelId.trim() || undefined,
        positionId: positionId.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* 60fps rule: solid overlay */}
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />

      {/* 100% opaque modal dialog */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {t.createLocation}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {t.facility} *
            </label>
            <select
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {facilityOptions.map((f) => (
                <option key={f.facilityId} value={f.facilityId}>
                  {f.facilityName || f.facilityId}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                {t.locationId} (Opsiyonel)
              </label>
              <input
                type="text"
                placeholder="Örn: LOC-A1-01"
                value={locationSeqId}
                onChange={(e) => setLocationSeqId(e.target.value)}
                className="ds-input font-mono"
              />
            </div>
            <div>
              <label className="ds-label">
                Lokasyon Türü
              </label>
              <select
                value={locationTypeEnumId}
                onChange={(e) => setLocationTypeEnumId(e.target.value)}
                className="ds-select"
              >
                <option value="FLT_PICKLOC">Toplama Lokasyonu (Pick Loc)</option>
                <option value="FLT_BULK">Dökme / Palet Deposu (Bulk)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="ds-label">
                {t.area}
              </label>
              <input
                type="text"
                placeholder="Örn: A"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="ds-input"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.aisle}
              </label>
              <input
                type="text"
                placeholder="Örn: 01"
                value={aisleId}
                onChange={(e) => setAisleId(e.target.value)}
                className="ds-input"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.section}
              </label>
              <input
                type="text"
                placeholder="Örn: S1"
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="ds-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ds-label">
                {t.level} (Kat / Raf Sırası)
              </label>
              <input
                type="text"
                placeholder="Örn: L1"
                value={levelId}
                onChange={(e) => setLevelId(e.target.value)}
                className="ds-input"
              />
            </div>
            <div>
              <label className="ds-label">
                {t.position} (Kutu / Göz)
              </label>
              <input
                type="text"
                placeholder="Örn: P01"
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="ds-input"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary text-xs"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="ds-btn-primary text-xs"
            >
              {isSubmitting ? common.loading : common.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
