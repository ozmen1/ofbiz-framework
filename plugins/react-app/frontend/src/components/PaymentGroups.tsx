import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Tipler
// ─────────────────────────────────────────────────────────────────────────────
interface PaymentGroupType {
  paymentGroupTypeId: string;
  description: string;
}

interface PaymentGroup {
  paymentGroupId: string;
  paymentGroupName: string;
  paymentGroupTypeId: string;
  paymentGroupTypeDesc: string;
  memberCount: number;
  totalAmount: number;
}

interface GroupMember {
  paymentGroupId: string;
  paymentId: string;
  fromDate: string;
  sequenceNum: number;
  paymentTypeDesc: string;
  statusDesc: string;
  amount: number;
  currencyUomId: string;
  partyNameFrom: string;
  partyNameTo: string;
  paymentRefNum: string;
  effectiveDate: string;
}

interface PaymentGroupDetail extends PaymentGroup {
  members: GroupMember[];
}

interface AvailablePayment {
  paymentId: string;
  amount: number;
  currencyUomId: string;
  statusId: string;
  partyNameFrom: string;
  partyNameTo: string;
  paymentRefNum: string;
  effectiveDate: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcılar
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(n);

const fmtDate = (s: string) =>
  s ? new Date(s).toLocaleDateString('tr-TR') : '-';

const typeColor: Record<string, string> = {
  CHECK_RUN    : 'bg-blue-100 text-blue-800',
  BATCH_PAYMENT: 'bg-green-100 text-green-800',
};

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Grup Oluştur
// ─────────────────────────────────────────────────────────────────────────────
function CreateGroupModal({
  types,
  onClose,
  onCreated,
}: {
  types: PaymentGroupType[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    paymentGroupName: '',
    paymentGroupTypeId: types[0]?.paymentGroupTypeId || 'BATCH_PAYMENT',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    if (!form.paymentGroupName.trim()) {
      setError('Grup adı gerekli');
      return;
    }
    setSaving(true);
    try {
      const data = await fetchApi(
        `/react-app/control/createPaymentGroup?paymentGroupName=${encodeURIComponent(form.paymentGroupName)}&paymentGroupTypeId=${form.paymentGroupTypeId}`
      );
      if (data.success) {
        onCreated();
        onClose();
      } else {
        setError(data.error || 'Oluşturulamadı');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Yeni Ödeme Grubu</h2>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grup Adı *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={form.paymentGroupName}
              onChange={e => setForm(p => ({ ...p, paymentGroupName: e.target.value }))}
              placeholder="Örn: Kasım Havale Bordrosu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grup Tipi</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              value={form.paymentGroupTypeId}
              onChange={e => setForm(p => ({ ...p, paymentGroupTypeId: e.target.value }))}
            >
              {types.map(t => (
                <option key={t.paymentGroupTypeId} value={t.paymentGroupTypeId}>
                  {t.description}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
            İptal
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Ödeme Ekle
// ─────────────────────────────────────────────────────────────────────────────
function AddPaymentModal({
  groupId,
  onClose,
  onAdded,
}: {
  groupId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [payments, setPayments] = useState<AvailablePayment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetchApi(`/react-app/control/getAvailablePayments?paymentGroupId=${groupId}`)
      .then((d: any) => { if (d.success) setPayments(d.payments || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId]);


  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addSelected = async () => {
    if (selected.size === 0) { setError('En az bir ödeme seçin'); return; }
    setSaving(true);
    try {
      for (const paymentId of Array.from(selected)) {
        await fetchApi(
          `/react-app/control/addPaymentToGroup?paymentGroupId=${groupId}&paymentId=${paymentId}`
        );
      }
      onAdded();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gruba Ödeme Ekle</h2>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Yükleniyor…</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Eklenebilecek ödeme bulunamadı</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                  <th className="px-3 py-2 text-left w-8"></th>
                  <th className="px-3 py-2 text-left">Ödeme ID</th>
                  <th className="px-3 py-2 text-left">Gönderen</th>
                  <th className="px-3 py-2 text-left">Alıcı</th>
                  <th className="px-3 py-2 text-right">Tutar</th>
                  <th className="px-3 py-2 text-left">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr
                    key={p.paymentId}
                    className={`border-b cursor-pointer hover:bg-blue-50 ${selected.has(p.paymentId) ? 'bg-blue-50' : ''}`}
                    onClick={() => toggle(p.paymentId)}
                  >
                    <td className="px-3 py-2">
                      <input type="checkbox" readOnly checked={selected.has(p.paymentId)} className="rounded" />
                    </td>
                    <td className="px-3 py-2 font-mono text-blue-600">{p.paymentId}</td>
                    <td className="px-3 py-2">{p.partyNameFrom}</td>
                    <td className="px-3 py-2">{p.partyNameTo}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(p.amount, p.currencyUomId)}</td>
                    <td className="px-3 py-2 text-gray-500">{fmtDate(p.effectiveDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex gap-3 mt-4 justify-between items-center">
          <span className="text-sm text-gray-500">{selected.size} ödeme seçildi</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              İptal
            </button>
            <button
              onClick={addSelected}
              disabled={saving || selected.size === 0}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Ekleniyor…' : `${selected.size} Ödemeyi Ekle`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grup Detay Paneli
// ─────────────────────────────────────────────────────────────────────────────
function GroupDetailPanel({
  groupId,
  onBack,
  onDeleted,
}: {
  groupId: string;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail]       = useState<PaymentGroupDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showAddModal, setShowAdd] = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchApi(`/react-app/control/getPaymentGroupDetail?paymentGroupId=${groupId}`)
      .then((d: any) => { if (d.success) setDetail(d.paymentGroup); else setError(d.error); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId]);


  useEffect(() => { load(); }, [load]);

  const removePayment = async (paymentId: string) => {
    if (!confirm('Bu ödemeyi gruptan çıkarmak istiyor musunuz?')) return;
    await fetchApi(`/react-app/control/removePaymentFromGroup?paymentGroupId=${groupId}&paymentId=${paymentId}`);
    load();
  };

  const deleteGroup = async () => {
    if (!confirm(`"${detail?.paymentGroupName}" grubunu ve tüm üyelerini silmek istiyor musunuz?`)) return;
    await fetchApi(`/react-app/control/deletePaymentGroup?paymentGroupId=${groupId}`);
    onDeleted();
    onBack();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  if (error) return (
    <div className="p-6 text-red-600">{error}</div>
  );

  if (!detail) return null;

  return (
    <div>
      {/* Başlık */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          ← Listeye Dön
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">{detail.paymentGroupName}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor[detail.paymentGroupTypeId] || 'bg-gray-100 text-gray-700'}`}>
              {detail.paymentGroupTypeDesc}
            </span>
            <span className="text-sm text-gray-500">{detail.memberCount} ödeme · Toplam: {fmt(detail.totalAmount)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            + Ödeme Ekle
          </button>
          <button
            onClick={deleteGroup}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            Grubu Sil
          </button>
        </div>
      </div>

      {/* Üye Ödemeler Tablosu */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase border-b">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Ödeme ID</th>
              <th className="px-4 py-3 text-left">Tip</th>
              <th className="px-4 py-3 text-left">Gönderen</th>
              <th className="px-4 py-3 text-left">Alıcı</th>
              <th className="px-4 py-3 text-right">Tutar</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">Tarih</th>
              <th className="px-4 py-3 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {detail.members.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Bu grupta henüz ödeme yok. "Ödeme Ekle" butonuyla ödeme ekleyebilirsiniz.
                </td>
              </tr>
            ) : (
              detail.members.map((m, idx) => (
                <tr key={m.paymentId} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{m.sequenceNum || idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-blue-600">{m.paymentId}</td>
                  <td className="px-4 py-3 text-gray-600">{m.paymentTypeDesc}</td>
                  <td className="px-4 py-3">{m.partyNameFrom}</td>
                  <td className="px-4 py-3">{m.partyNameTo}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">
                    {fmt(m.amount, m.currencyUomId)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                      {m.statusDesc}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(m.effectiveDate)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removePayment(m.paymentId)}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    >
                      Çıkar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {detail.members.length > 0 && (
            <tfoot>
              <tr className="bg-blue-50 font-bold">
                <td colSpan={5} className="px-4 py-3 text-right text-gray-700">GENEL TOPLAM:</td>
                <td className="px-4 py-3 text-right text-blue-700 text-base">{fmt(detail.totalAmount)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showAddModal && (
        <AddPaymentModal
          groupId={groupId}
          onClose={() => setShowAdd(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen: PaymentGroups
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentGroups() {
  const [groups, setGroups]           = useState<PaymentGroup[]>([]);
  const [types, setTypes]             = useState<PaymentGroupType[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [selectedGroupId, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [typeFilter, setTypeFilter]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = typeFilter
        ? `/react-app/control/getPaymentGroups?paymentGroupTypeId=${typeFilter}`
        : `/react-app/control/getPaymentGroups`;
      const [gData, tData] = await Promise.all([
        fetchApi(url),
        fetchApi('/react-app/control/getPaymentGroupTypes'),
      ]);
      if (gData.success) setGroups(gData.paymentGroups || []);
      if (tData.success) setTypes(tData.paymentGroupTypes || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  if (selectedGroupId) {
    return (
      <GroupDetailPanel
        groupId={selectedGroupId}
        onBack={() => setSelected(null)}
        onDeleted={load}
      />
    );
  }

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ödeme Grupları & Bordrolar</h1>
          <p className="text-sm text-gray-500 mt-1">
            Toplu tahsilat fişleri, çek run ve EFT bordrolarını yönetin
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 self-start sm:self-auto"
        >
          + Yeni Grup
        </button>
      </div>

      {/* Filtre */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-4 items-center">
        <label className="text-sm font-medium text-gray-700">Tip Filtresi:</label>
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="">Tümü</option>
          {types.map(t => (
            <option key={t.paymentGroupTypeId} value={t.paymentGroupTypeId}>
              {t.description}
            </option>
          ))}
        </select>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Toplam Grup</p>
          <p className="text-2xl font-bold text-gray-800">{groups.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Toplam Ödeme</p>
          <p className="text-2xl font-bold text-gray-800">
            {groups.reduce((s, g) => s + g.memberCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm text-gray-500">Toplam Tutar</p>
          <p className="text-2xl font-bold text-gray-800">
            {fmt(groups.reduce((s, g) => s + g.totalAmount, 0))}
          </p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-600 rounded-xl">{error}</div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-gray-500">Henüz ödeme grubu yok</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            İlk Grubu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(grp => (
            <div
              key={grp.paymentGroupId}
              className="bg-white rounded-xl shadow hover:shadow-md cursor-pointer transition-all p-5 border border-transparent hover:border-blue-200"
              onClick={() => setSelected(grp.paymentGroupId)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800 text-base">{grp.paymentGroupName || grp.paymentGroupId}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${typeColor[grp.paymentGroupTypeId] || 'bg-gray-100 text-gray-700'}`}>
                    {grp.paymentGroupTypeDesc}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-mono">{grp.paymentGroupId}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Ödeme Sayısı</p>
                  <p className="text-lg font-bold text-gray-700">{grp.memberCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Toplam Tutar</p>
                  <p className="text-lg font-bold text-blue-600">{fmt(grp.totalAmount)}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-blue-500 hover:underline">Detaylar →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && types.length > 0 && (
        <CreateGroupModal
          types={types}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
