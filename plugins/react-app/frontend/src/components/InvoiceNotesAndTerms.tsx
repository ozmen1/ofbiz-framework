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
function NoteForm({ invoiceId, onAdded }: { invoiceId: string; onAdded: () => void }) {
  const [form, setForm] = useState({ noteName: 'Fatura Notu', noteInfo: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    if (!form.noteInfo.trim()) { setError('Not içeriği gerekli'); return; }
    setSaving(true);
    try {
      const params = new URLSearchParams({ invoiceId, noteName: form.noteName, noteInfo: form.noteInfo });
      const data = await fetchApi(`/react-app/control/createInvoiceNote?${params}`);
      if (data.success) {
        setForm({ noteName: 'Fatura Notu', noteInfo: '' });
        setError('');
        onAdded();
      } else {
        setError(data.error || 'Not eklenemedi');
      }
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/40 mt-3">
      <p className="text-sm font-medium text-slate-300 mb-2">Yeni Not Ekle</p>
      {error && <div className="mb-2 text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">{error}</div>}
      <div className="space-y-2">
        <input
          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="Not başlığı"
          value={form.noteName}
          onChange={e => setForm(p => ({ ...p, noteName: e.target.value }))}
        />
        <textarea
          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
          placeholder="Not içeriğini buraya yazın…"
          value={form.noteInfo}
          onChange={e => setForm(p => ({ ...p, noteInfo: e.target.value }))}
        />
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={save} disabled={saving}
          className="px-4 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Kaydediliyor…' : 'Notu Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Şart Formu
// ─────────────────────────────────────────────────────────────────────────────
function TermForm({ invoiceId, termTypes, onAdded }: { invoiceId: string; termTypes: TermType[]; onAdded: () => void }) {
  const [form, setForm] = useState({
    termTypeId: termTypes[0]?.termTypeId || 'FIN_PAYMENT_TERM',
    termValue: '', termDays: '', textValue: '', description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    setSaving(true);
    try {
      const params = new URLSearchParams({
        invoiceId,
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
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/40 mt-3">
      <p className="text-sm font-medium text-slate-300 mb-2">Yeni Vade Şartı Ekle</p>
      {error && <div className="mb-2 text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded border border-red-500/20">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-0.5 block">Şart Tipi</label>
          <select
            className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
            value={form.termTypeId}
            onChange={e => setForm(p => ({ ...p, termTypeId: e.target.value }))}
          >
            {termTypes.map(t => <option key={t.termTypeId} value={t.termTypeId}>{t.description}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-0.5 block">Değer</label>
          <input type="number" placeholder="0.00"
            className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
            value={form.termValue} onChange={e => setForm(p => ({ ...p, termValue: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-0.5 block">Gün</label>
          <input type="number" placeholder="0"
            className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
            value={form.termDays} onChange={e => setForm(p => ({ ...p, termDays: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-0.5 block">Metin Değeri</label>
          <input placeholder="Örn: Net 30"
            className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
            value={form.textValue} onChange={e => setForm(p => ({ ...p, textValue: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-0.5 block">Açıklama</label>
          <input placeholder="Opsiyonel açıklama"
            className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
            value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </div>
      </div>
      <div className="flex justify-end mt-2">
        <button onClick={save} disabled={saving}
          className="px-4 py-1.5 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg disabled:opacity-50 transition-colors">
          {saving ? 'Kaydediliyor…' : 'Şartı Kaydet'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen: InvoiceNotesAndTerms
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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    <div className="mt-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur">
      {/* Sekmeler */}
      <div className="flex border-b border-slate-700/50">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('notes')}
        >
          📝 Notlar {!loading && `(${notes.length})`}
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'terms'
              ? 'border-purple-500 text-purple-400 bg-purple-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
          onClick={() => setActiveTab('terms')}
        >
          📋 Vade Şartları {!loading && `(${terms.length})`}
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        ) : activeTab === 'notes' ? (
          /* ── NOTLAR ── */
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-medium text-slate-300">Fatura Notları</p>
              <button onClick={() => setShowNoteForm(!showNoteForm)}
                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">
                {showNoteForm ? 'Formu Kapat' : '+ Not Ekle'}
              </button>
            </div>

            {showNoteForm && (
              <NoteForm invoiceId={invoiceId} onAdded={() => { loadData(); setShowNoteForm(false); }} />
            )}

            {notes.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Henüz fatura notu yok
              </div>
            ) : (
              <div className="space-y-3 mt-3">
                {notes.map(note => (
                  <div key={note.noteId}
                    className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                    <div className="text-xl shrink-0">📝</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-200">{note.noteName}</p>
                        <span className="text-xs text-slate-500 shrink-0">{fmtDate(note.noteDateTime)}</span>
                      </div>
                      <p className="text-sm text-slate-400 mt-1 whitespace-pre-wrap">{note.noteInfo}</p>
                      {note.noteParty && (
                        <p className="text-xs text-slate-500 mt-1">— {note.noteParty}</p>
                      )}
                    </div>
                    <button onClick={() => deleteNote(note.noteId)}
                      className="text-slate-600 hover:text-red-400 transition-colors text-sm shrink-0" title="Notu sil">
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
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm font-medium text-slate-300">Vade & Ödeme Şartları</p>
              <button onClick={() => setShowTermForm(!showTermForm)}
                className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition-colors">
                {showTermForm ? 'Formu Kapat' : '+ Şart Ekle'}
              </button>
            </div>

            {showTermForm && termTypes.length > 0 && (
              <TermForm invoiceId={invoiceId} termTypes={termTypes} onAdded={() => { loadData(); setShowTermForm(false); }} />
            )}

            {terms.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Henüz vade şartı eklenmemiş
              </div>
            ) : (
              <table className="w-full text-sm mt-3">
                <thead>
                  <tr className="bg-slate-700/40 text-xs uppercase text-slate-400">
                    <th className="px-3 py-2 text-left rounded-l-lg">Şart Tipi</th>
                    <th className="px-3 py-2 text-right">Değer</th>
                    <th className="px-3 py-2 text-right">Gün</th>
                    <th className="px-3 py-2 text-left">Metin</th>
                    <th className="px-3 py-2 text-left">Açıklama</th>
                    <th className="px-3 py-2 text-left rounded-r-lg">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map(term => (
                    <tr key={term.invoiceTermId} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-3 py-2">
                        <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                          {term.termTypeDesc}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-200">{term.termValue || 0}</td>
                      <td className="px-3 py-2 text-right text-slate-300">{term.termDays || 0} gün</td>
                      <td className="px-3 py-2 text-slate-400">{term.textValue || '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{term.description || '-'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => deleteTerm(term.invoiceTermId)}
                          className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors">
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
