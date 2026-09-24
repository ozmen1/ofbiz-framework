import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { X, PlayCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  ManufacturingMetadata,
  createProductionRun
} from '../services/manufacturingService';

interface CreateProductionRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (productionRunId: string) => void;
  metadata: ManufacturingMetadata | null;
}

export const CreateProductionRunModal: React.FC<CreateProductionRunModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  metadata
}) => {
  const { translations } = useTranslation();
  const mTrans = translations.manufacturing;
  const common = translations.common;

  const [productId, setProductId] = useState('');
  const [facilityId, setFacilityId] = useState('');
  const [routingId, setRoutingId] = useState('');
  const [workEffortName, setWorkEffortName] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [startDate, setStartDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 16);
  });
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setError(null);
      if (metadata) {
        if (metadata.facilities.length > 0 && !facilityId) {
          setFacilityId(metadata.facilities[0].facilityId);
        }
        if (metadata.products.length > 0 && !productId) {
          setProductId(metadata.products[0].productId);
        }
        if (metadata.routings.length > 0 && !routingId) {
          setRoutingId(metadata.routings[0].routingId);
        }
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, metadata]);

  // Memoized Options (Performance optimization for large selects)
  const productOptions = useMemo(() => {
    if (!metadata?.products) return null;
    return metadata.products.map(p => (
      <option key={p.productId} value={p.productId}>
        {p.productName} ({p.productId})
      </option>
    ));
  }, [metadata?.products]);

  const facilityOptions = useMemo(() => {
    if (!metadata?.facilities) return null;
    return metadata.facilities.map(f => (
      <option key={f.facilityId} value={f.facilityId}>
        {f.facilityName} ({f.facilityId})
      </option>
    ));
  }, [metadata?.facilities]);

  const routingOptions = useMemo(() => {
    if (!metadata?.routings) return null;
    return (
      <>
        <option value="">{common.none || 'Seçilmedi (Varsayılan)'}</option>
        {metadata.routings.map(r => (
          <option key={r.routingId} value={r.routingId}>
            {r.routingName} ({r.routingId})
          </option>
        ))}
      </>
    );
  }, [metadata?.routings, common.none]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError(mTrans.selectProduct);
      return;
    }
    if (!facilityId) {
      setError(mTrans.selectFacility);
      return;
    }
    if (quantity <= 0) {
      setError(mTrans.quantityToProduce);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await createProductionRun({
        productId,
        facilityId,
        routingId: routingId || undefined,
        quantity,
        startDate: startDate ? startDate.replace('T', ' ') + ':00' : undefined,
        workEffortName: workEffortName.trim() || undefined,
        description: description.trim() || undefined
      });

      onSuccess(res.productionRunId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : common.error;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 ds-overlay z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {mTrans.createModalTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mTrans.createModalSubtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="ds-alert-error flex items-center gap-2 p-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product */}
          <div>
            <label className="ds-label">{mTrans.selectProduct} *</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
              className="ds-select"
              required
            >
              {productOptions}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Target Facility */}
            <div>
              <label className="ds-label">{mTrans.selectFacility} *</label>
              <select
                value={facilityId}
                onChange={e => setFacilityId(e.target.value)}
                className="ds-select"
                required
              >
                {facilityOptions}
              </select>
            </div>

            {/* Target Routing */}
            <div>
              <label className="ds-label">{mTrans.selectRouting}</label>
              <select
                value={routingId}
                onChange={e => setRoutingId(e.target.value)}
                className="ds-select"
              >
                {routingOptions}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="ds-label">{mTrans.quantityToProduce} *</label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="ds-input font-mono font-bold"
                required
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="ds-label">{mTrans.startDateLabel}</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="ds-input"
              />
            </div>
          </div>

          {/* Work Order Name */}
          <div>
            <label className="ds-label">{mTrans.runName}</label>
            <input
              type="text"
              value={workEffortName}
              onChange={e => setWorkEffortName(e.target.value)}
              placeholder="Örn: Hafta 39 Şarj Grubu Üretimi"
              className="ds-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="ds-label">{mTrans.descriptionLabel}</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Üretim emir notları, parti bilgileri vb..."
              className="ds-input resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="ds-btn-secondary"
            >
              {common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ds-btn-primary"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mTrans.createButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
