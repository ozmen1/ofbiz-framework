import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../services/api';
import { useTranslation } from '../i18n';

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
const fmt = (n: number, currency = 'USD', locale = 'tr') =>
  new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', { style: 'currency', currency }).format(n);

const fmtDate = (s: string, locale = 'tr') =>
  s ? new Date(s).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US') : '-';


const typeColor: Record<string, string> = {
  CHECK_RUN    : 'bg-blue-500/20 text-blue-300',
  BATCH_PAYMENT: 'bg-emerald-500/20 text-emerald-300',
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
  const { translations, locale } = useTranslation();
  const [form, setForm] = useState({
    paymentGroupName: '',
    paymentGroupTypeId: types[0]?.paymentGroupTypeId || 'BATCH_PAYMENT',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    if (!form.paymentGroupName.trim()) { setError(translations.paymentGroups.groupNameRequired); return; }
    setSaving(true);
    try {
      const data = await fetchApi(
        `/react-app/control/createPaymentGroup?paymentGroupName=${encodeURIComponent(form.paymentGroupName)}&paymentGroupTypeId=${form.paymentGroupTypeId}`
      );
      if (data.success) { onCreated(); onClose(); }
      else setError(data.error || translations.paymentGroups.groupNameRequired);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 my-auto">
        <h2 className="text-xl font-bold text-white mb-4">{translations.paymentGroups.newGroup}</h2>
        {error && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{translations.paymentGroups.groupName} *</label>
            <input
              className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              value={form.paymentGroupName}
              onChange={e => setForm(p => ({ ...p, paymentGroupName: e.target.value }))}
              placeholder={translations.paymentGroups.groupName}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{translations.paymentGroups.groupType}</label>
            <select
              className="w-full bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={form.paymentGroupTypeId}
              onChange={e => setForm(p => ({ ...p, paymentGroupTypeId: e.target.value }))}
            >
              {types.map(t => (
                <option key={t.paymentGroupTypeId} value={t.paymentGroupTypeId}>{t.description}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 border border-slate-600 rounded-xl hover:bg-slate-700 transition-colors">
            {translations.common.cancel}
          </button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-colors">
            {saving ? (locale === 'tr' ? 'Kaydediliyor…' : 'Saving…') : translations.common.create}
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
  const { translations, locale } = useTranslation();
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
    if (selected.size === 0) { setError(translations.paymentGroups.selectAtLeastOnePayment); return; }
    setSaving(true);
    try {
      for (const paymentId of Array.from(selected)) {
        await fetchApi(`/react-app/control/addPaymentToGroup?paymentGroupId=${groupId}&paymentId=${paymentId}`);
      }
      onAdded();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-6 max-h-[85vh] flex flex-col my-auto">
        <h2 className="text-xl font-bold text-white mb-4">{translations.paymentGroups.addPayment}</h2>
        {error && <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm">{error}</div>}
        <div className="flex-1 overflow-y-auto overflow-x-auto rounded-xl border border-slate-700">
          {loading ? (
            <div className="text-center py-10 text-slate-400">{translations.common.loading}</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-10 text-slate-500">{translations.paymentGroups.noPayments}</div>
          ) : (
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="bg-slate-700/60 text-slate-400 text-xs uppercase">
                  <th className="px-3 py-2 text-left w-8"></th>
                  <th className="px-3 py-2 text-left">{translations.payments.paymentId}</th>
                  <th className="px-3 py-2 text-left">{translations.payments.fromParty}</th>
                  <th className="px-3 py-2 text-left">{translations.payments.toParty}</th>
                  <th className="px-3 py-2 text-right">{translations.payments.amount}</th>
                  <th className="px-3 py-2 text-left">{translations.common.date}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.paymentId}
                    className={`border-b border-slate-700/50 cursor-pointer transition-colors hover:bg-indigo-500/10 ${selected.has(p.paymentId) ? 'bg-indigo-500/15' : ''}`}
                    onClick={() => toggle(p.paymentId)}>
                    <td className="px-3 py-2">
                      <input type="checkbox" readOnly checked={selected.has(p.paymentId)} className="rounded accent-indigo-500" />
                    </td>
                    <td className="px-3 py-2 font-mono text-indigo-400">{p.paymentId}</td>
                    <td className="px-3 py-2 text-slate-200">{p.partyNameFrom}</td>
                    <td className="px-3 py-2 text-slate-200">{p.partyNameTo}</td>
                    <td className="px-3 py-2 text-right font-semibold text-white">{fmt(p.amount, p.currencyUomId, locale)}</td>
                    <td className="px-3 py-2 text-slate-400">{fmtDate(p.effectiveDate, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex gap-3 mt-4 justify-between items-center">
          <span className="text-sm text-slate-400">
            {selected.size} {translations.paymentGroups.paymentsSelected}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 border border-slate-600 rounded-xl hover:bg-slate-700 transition-colors">
              {translations.common.cancel}
            </button>
            <button onClick={addSelected} disabled={saving || selected.size === 0}
              className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl disabled:opacity-50 transition-colors">
              {saving ? (locale === 'tr' ? 'Ekleniyor…' : 'Adding…') : `${translations.paymentGroups.addPayment} (${selected.size})`}
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
  const { translations, locale } = useTranslation();
  const [detail, setDetail]        = useState<PaymentGroupDetail | null>(null);
  const [loading, setLoading]      = useState(true);
  const [showAddModal, setShowAdd] = useState(false);
  const [error, setError]          = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetchApi(`/react-app/control/getPaymentGroupDetail?paymentGroupId=${groupId}`)
      .then((d: any) => { if (d.success) setDetail(d.paymentGroup); else setError(d.error); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  const removePayment = async (paymentId: string) => {
    if (!confirm(translations.paymentGroups.removeMemberConfirm)) return;
    await fetchApi(`/react-app/control/removePaymentFromGroup?paymentGroupId=${groupId}&paymentId=${paymentId}`);
    load();
  };

  const deleteGroup = async () => {
    if (!confirm(translations.paymentGroups.deleteGroupConfirm)) return;
    await fetchApi(`/react-app/control/deletePaymentGroup?paymentGroupId=${groupId}`);
    onDeleted();
    onBack();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
    </div>
  );
  if (error) return <div className="p-6 text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">{error}</div>;
  if (!detail) return null;

  return (
    <div>
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="p-2 hover:bg-slate-700/60 rounded-xl text-slate-400 hover:text-white transition-colors">
            ← {translations.common.back}
          </button>
          <div>
            <h2 className="text-xl font-bold text-white">{detail.paymentGroupName}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${typeColor[detail.paymentGroupTypeId] || 'bg-slate-600/40 text-slate-300'}`}>
                {detail.paymentGroupTypeDesc}
              </span>
              <span className="text-xs sm:text-sm text-slate-400">
                {detail.memberCount} {translations.paymentGroups.paymentCount} · {translations.common.total}: {fmt(detail.totalAmount, 'USD', locale)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button onClick={() => setShowAdd(true)}
            className="px-3.5 py-2 text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-2 transition-colors">
            + {translations.paymentGroups.addPayment}
          </button>
          <button onClick={deleteGroup}
            className="px-3.5 py-2 text-xs sm:text-sm text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors">
            {translations.common.delete}
          </button>
        </div>
      </div>

      {/* Üye Ödemeler Tablosu */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-slate-700/40 text-slate-400 text-xs uppercase border-b border-slate-700/50">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">{translations.payments.paymentId}</th>
              <th className="px-4 py-3 text-left">{translations.payments.paymentType}</th>
              <th className="px-4 py-3 text-left">{translations.payments.fromParty}</th>
              <th className="px-4 py-3 text-left">{translations.payments.toParty}</th>
              <th className="px-4 py-3 text-right">{translations.payments.amount}</th>
              <th className="px-4 py-3 text-left">{translations.common.status}</th>
              <th className="px-4 py-3 text-left">{translations.common.date}</th>
              <th className="px-4 py-3 text-left">{translations.common.actions}</th>
            </tr>
          </thead>
          <tbody>
            {detail.members.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                  {translations.paymentGroups.noPayments}
                </td>
              </tr>
            ) : (
              detail.members.map((m, idx) => (
                <tr key={m.paymentId} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-4 py-3 text-slate-500">{m.sequenceNum || idx + 1}</td>
                  <td className="px-4 py-3 font-mono text-indigo-400">{m.paymentId}</td>
                  <td className="px-4 py-3 text-slate-300">{m.paymentTypeDesc}</td>
                  <td className="px-4 py-3 text-white">{m.partyNameFrom}</td>
                  <td className="px-4 py-3 text-white">{m.partyNameTo}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{fmt(m.amount, m.currencyUomId)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">{m.statusDesc}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{fmtDate(m.effectiveDate)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => removePayment(m.paymentId)}
                      className="text-xs text-red-400 hover:text-red-300 hover:underline transition-colors">
                      {translations.paymentGroups.removeMember}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {detail.members.length > 0 && (
            <tfoot>
              <tr className="bg-indigo-500/10 font-bold border-t border-indigo-500/20">
                <td colSpan={5} className="px-4 py-3 text-right text-slate-300">GENEL TOPLAM:</td>
                <td className="px-4 py-3 text-right text-indigo-400 text-base">{fmt(detail.totalAmount)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
        </div>
      </div>

      {showAddModal && (
        <AddPaymentModal groupId={groupId} onClose={() => setShowAdd(false)} onAdded={load} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ana Bileşen: PaymentGroups
// ─────────────────────────────────────────────────────────────────────────────
export default function PaymentGroups() {
  const { translations, locale } = useTranslation();
  const [groups, setGroups]            = useState<PaymentGroup[]>([]);
  const [types, setTypes]              = useState<PaymentGroupType[]>([]);
  const [loading, setLoading]          = useState(true);
  const [error, setError]              = useState('');
  const [selectedGroupId, setSelected] = useState<string | null>(null);
  const [showCreate, setShowCreate]    = useState(false);
  const [typeFilter, setTypeFilter]    = useState('');

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
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📋 {translations.paymentGroups.title}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {translations.paymentGroups.subtitle}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          + {translations.paymentGroups.newGroup}
        </button>
      </div>

      {/* Filtre + Özet */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-3">
          <label className="text-sm text-slate-400 whitespace-nowrap">{translations.paymentGroups.groupType}:</label>
          <select
            className="flex-1 bg-slate-700/60 border border-slate-600 rounded-xl px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">{translations.paymentGroups.allTypes}</option>
            {types.map(t => (
              <option key={t.paymentGroupTypeId} value={t.paymentGroupTypeId}>{t.description}</option>
            ))}
          </select>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 border-l-4 border-l-indigo-500">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{translations.paymentGroups.totalGroups}</p>
          <p className="text-2xl font-bold text-white mt-1">{groups.length}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 border-l-4 border-l-emerald-500">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{translations.paymentGroups.totalPayments}</p>
          <p className="text-2xl font-bold text-white mt-1">{groups.reduce((s, g) => s + g.memberCount, 0)}</p>
        </div>
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 border-l-4 border-l-purple-500">
          <p className="text-xs text-slate-400 uppercase tracking-wide">{translations.paymentGroups.totalAmount}</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">{fmt(groups.reduce((s, g) => s + g.totalAmount, 0), 'USD', locale)}</p>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">{error}</div>
      ) : groups.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-slate-400">{translations.paymentGroups.noGroups}</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors">
            + {translations.paymentGroups.newGroup}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map(grp => (
            <div
              key={grp.paymentGroupId}
              className="bg-slate-800/40 border border-slate-700/50 hover:border-indigo-500/40 rounded-2xl cursor-pointer transition-all p-5 hover:bg-slate-800/60 hover:shadow-lg hover:shadow-indigo-500/5"
              onClick={() => setSelected(grp.paymentGroupId)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-base truncate">{grp.paymentGroupName || grp.paymentGroupId}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold mt-1 inline-block ${typeColor[grp.paymentGroupTypeId] || 'bg-slate-600/40 text-slate-300'}`}>
                    {grp.paymentGroupTypeDesc}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono ml-2 shrink-0">{grp.paymentGroupId}</span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/40">
                <div>
                  <p className="text-xs text-slate-500">{translations.paymentGroups.paymentCount}</p>
                  <p className="text-lg font-bold text-slate-200">{grp.memberCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{translations.common.total}</p>
                  <p className="text-lg font-bold text-indigo-400">{fmt(grp.totalAmount)}</p>
                </div>
                <span className="text-xs text-indigo-400 hover:underline">{translations.common.details} →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && types.length > 0 && (
        <CreateGroupModal types={types} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
