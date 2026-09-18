import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../services/api';


// ─────────────────────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────────────────────
interface TermType {
  termTypeId: string;
  description: string;
}

interface InvoiceNote {
  invoiceId: string;
  noteId: string;
  noteName: string;
  noteInfo: string;
  noteParty: string;
  noteDateTime: string;
}

interface InvoiceTerm {
  invoiceTermId: string;
  invoiceId: string;
  termTypeId: string;
  termTypeDesc: string;
  termValue: number;
  termDays: number;
  textValue: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (s: string) =>
  s ? new Date(s).toLocaleString('tr-TR') : '-';

// ─────────────────────────────────────────────────────────────────────────────
// Not Formu
// ─────────────────────────────────────────────────────────────────────────────
function NoteForm({
  invoiceId,
  onAdded,
}: {
  invoiceId: string;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({ noteName: 'Fatura Notu', noteInfo: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    if (!form.noteInfo.trim()) { setError('Not içeriği gerekli'); return; }
    setSaving(true);
    try {
      const params = new URLSearchParams({
        invoiceId: invoiceId,
        noteName: form.noteName,
        noteInfo: form.noteInfo,
      });
      const data = await fetchApi(`/react-app/control/createInvoiceNote?${params}`);
      if (data.success) {
        setForm({ noteName: 'Fatura Notu', noteInfo: '' });
        setError('');
        onAdded();
      } else {
        setError(data.error || 'Not eklenemedi');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
      <p className="text-sm font-medium text-gray-700 mb-2">Yeni Not Ekle</p>
      {error && <div className="mb-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">{error}</div>}
      <div className="space-y-2">
        <input
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
          placeholder="Not başlığı"
          value={form.noteName}
          onChange={e => setForm(p => ({ ...p, noteName: e.target.value }))}
        />
        <textarea
          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm resize-none h-20"
          placeholder="Not içeriğini buraya yazın…"
          value={form.noteInfo}
          onChange={e => setForm(p => ({ ...p, noteInfo: e.target.value }))}
        />
      </div>
      <div className="flex justify-end mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Notu Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Şart Formu
// ─────────────────────────────────────────────────────────────────────────────
function TermForm({
  invoiceId,
  termTypes,
  onAdded,
}: {
  invoiceId: string;
  termTypes: TermType[];
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    termTypeId: termTypes[0]?.termTypeId || 'FIN_PAYMENT_TERM',
    termValue: '',
    termDays: '',
    textValue: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    setSaving(true);
    try {
      const params = new URLSearchParams({
        invoiceId: invoiceId,
        termTypeId: form.termTypeId,
        termValue: form.termValue || '0',
        termDays: form.termDays || '0',
        textValue: form.textValue,
        description: form.description,
      });
      const data = await fetchApi(`/react-app/control/createInvoiceTerm?${params}`);
      if (data.success) {
        setForm({ termTypeId: termTypes[0]?.termTypeId || 'FIN_PAYMENT_TERM', termValue: '', termDays: '', textValue: '', description: '' });
        setError('');
        onAdded();
      } else {
        setError(data.error || 'Şart eklenemedi');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-3">
      <p className="text-sm font-medium text-gray-700 mb-2">Yeni Vade Şartı Ekle</p>
      {error && <div className="mb-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-0.5 block">Şart Tipi</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            value={form.termTypeId}
            onChange={e => setForm(p => ({ ...p, termTypeId: e.target.value }))}
          >
            {termTypes.map(t => (
              <option key={t.termTypeId} value={t.termTypeId}>{t.description}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Değer</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            type="number"
            placeholder="0.00"
            value={form.termValue}
            onChange={e => setForm(p => ({ ...p, termValue: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-0.5 block">Gün</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            type="number"
            placeholder="0"
            value={form.termDays}
            onChange={e => setForm(p => ({ ...p, termDays: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-0.5 block">Metin Değeri</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Örn: Net 30"
            value={form.textValue}
            onChange={e => setForm(p => ({ ...p, textValue: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-0.5 block">Açıklama</label>
          <input
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            placeholder="Opsiyonel açıklama"
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 text-sm text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Şartı Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen: InvoiceNotesTerm (Fatura Detay içinde sekme olarak kullanılır)
// ─────────────────────────────────────────────────────────────────────────────
export default function InvoiceNotesAndTerms({ invoiceId }: { invoiceId: string }) {
  const [activeTab, setActiveTab] = useState<'notes' | 'terms'>('notes');
  const [notes, setNotes]         = useState<InvoiceNote[]>([]);
  const [terms, setTerms]         = useState<InvoiceTerm[]>([]);
  const [termTypes, setTermTypes] = useState<TermType[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showTermForm, setShowTermForm] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [nData, tData, ttData] = await Promise.all([
        fetchApi(`/react-app/control/getInvoiceNotes?invoiceId=${invoiceId}`),
        fetchApi(`/react-app/control/getInvoiceTerms?invoiceId=${invoiceId}`),
        fetchApi('/react-app/control/getTermTypes'),
      ]);
      if (nData.success)  setNotes(nData.invoiceNotes || []);
      if (tData.success)  setTerms(tData.invoiceTerms || []);
      if (ttData.success) setTermTypes(ttData.termTypes || []);
    } catch (e) {
      console.error('InvoiceNotesAndTerms load error:', e);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteNote = async (noteId: string) => {
    if (!confirm('Bu notu silmek istiyor musunuz?')) return;
    await fetchApi(`/react-app/control/deleteInvoiceNote?invoiceId=${invoiceId}&noteId=${noteId}`);
    loadData();
  };

  const deleteTerm = async (invoiceTermId: string) => {
    if (!confirm('Bu vade şartını silmek istiyor musunuz?')) return;
    await fetchApi(`/react-app/control/deleteInvoiceTerm?invoiceTermId=${invoiceTermId}`);
    loadData();
  };

  return (
    <div className="mt-6 bg-white rounded-xl shadow">
      {/* Sekmeler */}
      <div className="flex border-b">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notlar ({notes.length})
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'terms'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('terms')}
        >
          📋 Vade Şartları ({terms.length})
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-3 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : activeTab === 'notes' ? (
          /* ── NOTLAR ── */
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-gray-700">Fatura Notları</p>
              <button
                onClick={() => setShowNoteForm(!showNoteForm)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showNoteForm ? 'Formu Kapat' : '+ Not Ekle'}
              </button>
            </div>

            {showNoteForm && (
              <NoteForm invoiceId={invoiceId} onAdded={() => { loadData(); setShowNoteForm(false); }} />
            )}

            {notes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Henüz fatura notu yok
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {notes.map(note => (
                  <div key={note.noteId} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-2xl">📝</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800">{note.noteName}</p>
                        <span className="text-xs text-gray-400">{fmtDate(note.noteDateTime)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{note.noteInfo}</p>
                      {note.noteParty && (
                        <p className="text-xs text-gray-400 mt-1">— {note.noteParty}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteNote(note.noteId)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-xs shrink-0"
                      title="Notu sil"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── VADE ŞARTLARI ── */
          <div>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-medium text-gray-700">Vade & Ödeme Şartları</p>
              <button
                onClick={() => setShowTermForm(!showTermForm)}
                className="text-xs text-purple-600 hover:underline"
              >
                {showTermForm ? 'Formu Kapat' : '+ Şart Ekle'}
              </button>
            </div>

            {showTermForm && termTypes.length > 0 && (
              <TermForm invoiceId={invoiceId} termTypes={termTypes} onAdded={() => { loadData(); setShowTermForm(false); }} />
            )}

            {terms.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Henüz vade şartı eklenmemiş
              </div>
            ) : (
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-3 py-2 text-left">Şart Tipi</th>
                    <th className="px-3 py-2 text-right">Değer</th>
                    <th className="px-3 py-2 text-right">Gün</th>
                    <th className="px-3 py-2 text-left">Metin</th>
                    <th className="px-3 py-2 text-left">Açıklama</th>
                    <th className="px-3 py-2 text-left">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map(term => (
                    <tr key={term.invoiceTermId} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                          {term.termTypeDesc}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{term.termValue || 0}</td>
                      <td className="px-3 py-2 text-right">{term.termDays || 0} gün</td>
                      <td className="px-3 py-2 text-gray-600">{term.textValue || '-'}</td>
                      <td className="px-3 py-2 text-gray-500">{term.description || '-'}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteTerm(term.invoiceTermId)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
