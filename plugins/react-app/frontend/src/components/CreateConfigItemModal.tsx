import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { X, Cpu } from 'lucide-react';
import { ProductConfigItemRow } from '../services/inventoryMediaConfigService';

interface CreateConfigItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit?: ProductConfigItemRow | null;
  onSave: (payload: {
    configItemId?: string;
    configItemTypeId?: string;
    configItemName: string;
    description?: string;
    longDescription?: string;
    imageUrl?: string;
  }) => Promise<void>;
}

export const CreateConfigItemModal: React.FC<CreateConfigItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  itemToEdit,
  onSave,
}) => {
  const { translations } = useTranslation();
  const t = translations.inventoryMediaConfig;
  const common = translations.common;

  const [configItemId, setConfigItemId] = useState('');
  const [configItemName, setConfigItemName] = useState('');
  const [configItemTypeId, setConfigItemTypeId] = useState('MULTIPLE');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (itemToEdit) {
        setConfigItemId(itemToEdit.configItemId);
        setConfigItemName(itemToEdit.configItemName || '');
        setConfigItemTypeId(itemToEdit.configItemTypeId || 'MULTIPLE');
        setDescription(itemToEdit.description || '');
        setLongDescription(itemToEdit.longDescription || '');
        setImageUrl(itemToEdit.imageUrl || '');
      } else {
        setConfigItemId('');
        setConfigItemName('');
        setConfigItemTypeId('MULTIPLE');
        setDescription('');
        setLongDescription('');
        setImageUrl('');
      }
      setError(null);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configItemName.trim()) {
      setError(common.error);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        configItemId: configItemId.trim() || undefined,
        configItemName: configItemName.trim(),
        configItemTypeId,
        description: description.trim() || undefined,
        longDescription: longDescription.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
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
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {itemToEdit ? t.editConfigItem : t.createConfigItem}
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
            <label className="ds-label">
              {t.configItemId} {itemToEdit && `(${common.selected})`}
            </label>
            <input
              type="text"
              value={configItemId}
              onChange={(e) => setConfigItemId(e.target.value)}
              disabled={!!itemToEdit}
              placeholder="CONFIG_AUTO_GEN"
              className="ds-input font-mono disabled:opacity-50"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.configItemName} *
            </label>
            <input
              type="text"
              required
              value={configItemName}
              onChange={(e) => setConfigItemName(e.target.value)}
              placeholder="Örn: İşlemci (CPU) Seçenekleri"
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              {t.configType}
            </label>
            <select
              value={configItemTypeId}
              onChange={(e) => setConfigItemTypeId(e.target.value)}
              className="ds-select"
            >
              <option value="MULTIPLE">Çoktan Seçmeli (Radio/Dropdown)</option>
              <option value="SINGLE">Tekli Seçim / Onay (Checkbox)</option>
            </select>
          </div>

          <div>
            <label className="ds-label">
              {common.description}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kısa açıklama veya form etiketi..."
              className="ds-input"
            />
          </div>

          <div>
            <label className="ds-label">
              Görsel URL (Opsiyonel)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... veya resim yolu"
              className="ds-input"
            />
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
