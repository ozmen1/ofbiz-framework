import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, CheckCircle2, AlertCircle, Loader2, 
  ArrowLeft, FileText, Info, Send 
} from 'lucide-react';
import { 
  api, 
  GlMetadataResponse, 
  JournalEntryLinePayload, 
  CreateJournalEntryPayload 
} from '../services/api';

interface CreateJournalEntryProps {
  onBack: () => void;
  onSuccess: (acctgTransId: string) => void;
}

interface EditableLine extends JournalEntryLinePayload {
  id: string;
}

export const CreateJournalEntry: React.FC<CreateJournalEntryProps> = ({ onBack, onSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<GlMetadataResponse['metadata'] | null>(null);
  const [metaLoading, setMetaLoading] = useState<boolean>(true);

  // Header State
  const [transactionDate, setTransactionDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [acctgTransTypeId, setAcctgTransTypeId] = useState<string>('INTERNAL_ACCTG_TRANS');
  const [glFiscalTypeId, setGlFiscalTypeId] = useState<string>('ACTUAL');
  const [voucherRef, setVoucherRef] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [shouldPost, setShouldPost] = useState<boolean>(false);

  // Dynamic Lines State (Initial 2 rows: 1 debit, 1 credit)
  const [lines, setLines] = useState<EditableLine[]>([
    {
      id: 'line-1',
      glAccountId: '',
      debitCreditFlag: 'D',
      amount: 0,
      description: '',
      currencyUomId: 'USD'
    },
    {
      id: 'line-2',
      glAccountId: '',
      debitCreditFlag: 'C',
      amount: 0,
      description: '',
      currencyUomId: 'USD'
    }
  ]);

  // Load Metadata
  useEffect(() => {
    api.getGlMetadata()
      .then(res => {
        if (res?.metadata) {
          setMetadata(res.metadata);
          // Set sensible defaults if available
          if (res.metadata.accounts && res.metadata.accounts.length >= 2) {
            setLines(prev => [
              { ...prev[0], glAccountId: prev[0].glAccountId || res.metadata.accounts[0].glAccountId },
              { ...prev[1], glAccountId: prev[1].glAccountId || res.metadata.accounts[1].glAccountId }
            ]);
          }
        }
      })
      .catch(err => setError('Muhasebe meta verileri yüklenemedi: ' + err.message))
      .finally(() => setMetaLoading(false));
  }, []);

  // Add Line
  const handleAddLine = (defaultFlag: 'D' | 'C' = 'D') => {
    const newLine: EditableLine = {
      id: 'line-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      glAccountId: metadata?.accounts?.[0]?.glAccountId || '',
      debitCreditFlag: defaultFlag,
      amount: 0,
      description: description,
      currencyUomId: 'USD'
    };
    setLines([...lines, newLine]);
  };

  // Remove Line
  const handleRemoveLine = (id: string) => {
    if (lines.length <= 2) {
      alert('Bir yevmiye kaydı en az 2 satırdan oluşmalıdır.');
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  // Update Line
  const handleLineChange = (id: string, field: keyof JournalEntryLinePayload, value: any) => {
    setLines(lines.map(line => {
      if (line.id === id) {
        return { ...line, [field]: value };
      }
      return line;
    }));
  };

  // Totals & Balance Calculation
  const totalDebit = lines
    .filter(l => l.debitCreditFlag === 'D')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const totalCredit = lines
    .filter(l => l.debitCreditFlag === 'C')
    .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.001 && totalDebit > 0;

  // Auto-balance shortcut: sets the last line's amount to balance the entry
  const handleAutoBalance = () => {
    if (lines.length < 2) return;
    const lastLine = lines[lines.length - 1];
    const otherDebits = lines.slice(0, -1).filter(l => l.debitCreditFlag === 'D').reduce((s, l) => s + (Number(l.amount) || 0), 0);
    const otherCredits = lines.slice(0, -1).filter(l => l.debitCreditFlag === 'C').reduce((s, l) => s + (Number(l.amount) || 0), 0);

    if (lastLine.debitCreditFlag === 'D') {
      const needed = Math.max(0, otherCredits - otherDebits);
      handleLineChange(lastLine.id, 'amount', Number(needed.toFixed(2)));
    } else {
      const needed = Math.max(0, otherDebits - otherCredits);
      handleLineChange(lastLine.id, 'amount', Number(needed.toFixed(2)));
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isBalanced) {
      setError(`Fiş dengeli değil! Toplam Borç ($${totalDebit.toFixed(2)}) ile Toplam Alacak ($${totalCredit.toFixed(2)}) eşit olmalıdır. Fark: $${difference.toFixed(2)}`);
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.glAccountId) {
        setError(`${i + 1}. satırda GL hesabı seçilmelidir.`);
        return;
      }
      if (Number(l.amount) <= 0) {
        setError(`${i + 1}. satırda tutar 0'dan büyük olmalıdır.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload: CreateJournalEntryPayload = {
        transactionDate,
        acctgTransTypeId,
        glFiscalTypeId,
        description,
        voucherRef,
        isPosted: shouldPost ? 'Y' : 'N',
        organizationPartyId: 'Company',
        entries: lines.map(l => ({
          glAccountId: l.glAccountId,
          debitCreditFlag: l.debitCreditFlag,
          amount: Number(l.amount),
          description: l.description || description,
          partyId: l.partyId || undefined,
          currencyUomId: l.currencyUomId || 'USD'
        }))
      };

      const res = await api.createJournalEntry(payload);
      onSuccess(res.acctgTransId);
    } catch (err: any) {
      setError(err.message || 'Yevmiye kaydı oluşturulurken bir hata meydana geldi.');
    } finally {
      setLoading(false);
    }
  };

  if (metaLoading) {
    return (
      <div className="ds-card p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
        <p className="text-slate-400 text-sm">Hesap planı ve meta veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-screen-xl mx-auto">

      {/* Top Header */}
      <div className="ds-page-header">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="ds-btn-secondary p-2.5"
            aria-label="Geri dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="ds-page-title flex items-center gap-3">
              <FileText size={24} className="text-indigo-400" />
              Yeni Yevmiye Fişi Oluştur
            </h1>
            <p className="ds-page-subtitle mt-0.5">
              Çift taraflı kayıt esasına göre dengeli (Borç = Alacak) yevmiye veya mahsup fişi girişi
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="ds-btn-secondary"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !isBalanced}
            className="ds-btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : shouldPost ? <Send size={16} /> : <CheckCircle2 size={16} />}
            {shouldPost ? 'Kaydet ve Defter-i Kebir\'e İşle' : 'Taslak Olarak Kaydet'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="ds-alert-error flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Info Form */}
      <div className="ds-card p-6 flex flex-col gap-5">
        <h2 className="text-lg font-bold text-white border-b border-slate-700/50 pb-3">
          Fiş Genel Bilgileri
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Transaction Date */}
          <div>
            <label className="ds-label">Fiş / Yevmiye Tarihi *</label>
            <input
              type="date"
              required
              value={transactionDate}
              onChange={e => setTransactionDate(e.target.value)}
              className="ds-input w-full [color-scheme:dark]"
            />
          </div>

          {/* Acctg Trans Type */}
          <div>
            <label className="ds-label">İşlem / Fiş Türü *</label>
            <select
              value={acctgTransTypeId}
              onChange={e => setAcctgTransTypeId(e.target.value)}
              className="ds-select w-full"
            >
              {metadata?.acctgTransTypes?.map(t => (
                <option key={t.acctgTransTypeId} value={t.acctgTransTypeId}>
                  {t.description || t.acctgTransTypeId}
                </option>
              )) || (
                <>
                  <option value="INTERNAL_ACCTG_TRANS">İç Muhasebe / Mahsup</option>
                  <option value="CAPITALIZATION">Sermaye / Açılış</option>
                  <option value="PERIOD_CLOSING">Dönem Sonu Kapanış</option>
                  <option value="OTHER_INTERNAL">Diğer İç İşlemler</option>
                </>
              )}
            </select>
          </div>

          {/* Fiscal Type */}
          <div>
            <label className="ds-label">Mali Tür (Fiscal Type) *</label>
            <select
              value={glFiscalTypeId}
              onChange={e => setGlFiscalTypeId(e.target.value)}
              className="ds-select w-full"
            >
              {metadata?.glFiscalTypes?.map(f => (
                <option key={f.glFiscalTypeId} value={f.glFiscalTypeId}>
                  {f.description || f.glFiscalTypeId}
                </option>
              )) || (
                <option value="ACTUAL">Actual (Fiili)</option>
              )}
            </select>
          </div>

          {/* Voucher Ref */}
          <div>
            <label className="ds-label">Belge / Fiş Ref No</label>
            <input
              type="text"
              placeholder="Örn: MHS-2026-001"
              value={voucherRef}
              onChange={e => setVoucherRef(e.target.value)}
              className="ds-input w-full"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="ds-label">Genel Fiş Açıklaması</label>
          <input
            type="text"
            placeholder="Yevmiye kaydının genel açıklamasını giriniz..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="ds-input w-full"
          />
        </div>

        {/* Posting Options Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-xl bg-slate-700/30 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <Info size={18} className="text-indigo-400 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-slate-200">Kayıt Sonrası Defter-i Kebir Onayı:</span>
              <span className="text-xs text-slate-400 ml-2">
                {shouldPost ? 'Kaydedildikten hemen sonra Defter-i Kebir\'e işlenecek (Posted)' : 'Taslak (Draft) olarak kaydedilecek, daha sonra onaylanabilir'}
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold select-none">
            <input
              type="checkbox"
              checked={shouldPost}
              onChange={e => setShouldPost(e.target.checked)}
              className="cursor-pointer w-4 h-4 accent-indigo-500"
            />
            <span className={shouldPost ? 'text-emerald-400' : 'text-slate-400'}>Doğrudan Onayla</span>
          </label>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="ds-card p-6 flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              Yevmiye Maddeleri ({lines.length} Satır)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Her satır için GL hesabı, Borç (D) veya Alacak (C) yönünü ve tutarı belirleyiniz.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAutoBalance}
              className="ds-btn-secondary text-xs flex items-center gap-1.5"
            >
              Otomatik Dengele
            </button>
            <button
              type="button"
              onClick={() => handleAddLine('D')}
              className="ds-btn-secondary text-xs flex items-center gap-1.5 text-blue-400 border-blue-500/30 hover:border-blue-400/50"
            >
              <Plus size={13} /> Borç Satırı Ekle
            </button>
            <button
              type="button"
              onClick={() => handleAddLine('C')}
              className="ds-btn-secondary text-xs flex items-center gap-1.5 text-orange-400 border-orange-500/30 hover:border-orange-400/50"
            >
              <Plus size={13} /> Alacak Satırı Ekle
            </button>
          </div>
        </div>

        {/* Lines Grid / Table */}
        <div className="overflow-x-auto">
          <table className="ds-table w-full text-sm">
            <thead>
              <tr className="ds-thead-row">
                <th className="ds-th w-10 text-center">#</th>
                <th className="ds-th min-w-[240px]">GL Hesabı *</th>
                <th className="ds-th w-[130px] text-center">Yön *</th>
                <th className="ds-th-right w-[160px]">Tutar ($) *</th>
                <th className="ds-th min-w-[180px]">Satır Açıklaması</th>
                <th className="ds-th w-[140px]">Cari / İlgili</th>
                <th className="ds-th w-11 text-center"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} className="ds-tbody-row">
                  <td className="ds-td-muted text-center">{idx + 1}</td>

                  {/* GL Account Selector */}
                  <td className="ds-td">
                    <select
                      value={line.glAccountId}
                      onChange={e => handleLineChange(line.id, 'glAccountId', e.target.value)}
                      className="ds-select w-full text-xs py-1.5"
                    >
                      <option value="">-- Hesap Seçiniz --</option>
                      {metadata?.accounts?.map(a => (
                        <option key={a.glAccountId} value={a.glAccountId}>
                          {a.accountCode} - {a.accountName}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Debit / Credit Selector */}
                  <td className="ds-td text-center">
                    <div className="inline-flex rounded-lg overflow-hidden border border-slate-600">
                      <button
                        type="button"
                        onClick={() => handleLineChange(line.id, 'debitCreditFlag', 'D')}
                        className={`px-2.5 py-1 text-xs font-bold border-none cursor-pointer transition-colors ${
                          line.debitCreditFlag === 'D'
                            ? 'bg-blue-500/25 text-blue-400'
                            : 'bg-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Borç (D)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLineChange(line.id, 'debitCreditFlag', 'C')}
                        className={`px-2.5 py-1 text-xs font-bold border-none cursor-pointer transition-colors ${
                          line.debitCreditFlag === 'C'
                            ? 'bg-orange-500/25 text-orange-400'
                            : 'bg-transparent text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        Alacak (C)
                      </button>
                    </div>
                  </td>

                  {/* Amount Input */}
                  <td className="ds-td text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={line.amount || ''}
                      onChange={e => handleLineChange(line.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="ds-input w-full text-right font-bold py-1.5 text-sm"
                    />
                  </td>

                  {/* Line Description */}
                  <td className="ds-td">
                    <input
                      type="text"
                      placeholder="Satır açıklaması (opsiyonel)"
                      value={line.description || ''}
                      onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                      className="ds-input w-full text-xs py-1.5"
                    />
                  </td>

                  {/* Party */}
                  <td className="ds-td">
                    <input
                      type="text"
                      placeholder="Cari ID"
                      value={line.partyId || ''}
                      onChange={e => handleLineChange(line.id, 'partyId', e.target.value)}
                      className="ds-input w-full text-xs py-1.5"
                    />
                  </td>

                  {/* Remove Action */}
                  <td className="ds-td text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.id)}
                      disabled={lines.length <= 2}
                      className={`p-1 rounded transition-colors ${
                        lines.length <= 2
                          ? 'text-slate-700 cursor-not-allowed'
                          : 'text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer'
                      }`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Balance Summary Card */}
      <div className={`ds-card p-6 flex flex-col gap-4 border ${
        isBalanced ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'
      }`}>
        <div className="flex justify-between items-center flex-wrap gap-4">

          <div className="flex items-center gap-3">
            {isBalanced ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} className="text-emerald-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle size={22} className="text-red-400" />
              </div>
            )}
            <div>
              <div className={`text-base font-extrabold ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                {isBalanced ? 'Fiş Dengeli (Kayıt Yapılabilir)' : 'Fiş Dengesiz! Borç ve Alacak Eşitlenmelidir'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {isBalanced
                  ? 'Borç ve alacak toplamları tam olarak uyuşuyor. Defter-i kebir kaydına hazır.'
                  : `Borç ve Alacak arasında $${difference.toFixed(2)} tutarında fark bulunmaktadır.`}
              </div>
            </div>
          </div>

          {/* Quick numbers */}
          <div className="flex gap-8 items-center flex-wrap">
            <div>
              <div className="text-xs text-slate-400">Toplam Borç (Debit)</div>
              <div className="text-2xl font-extrabold text-blue-400">${totalDebit.toFixed(2)}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Toplam Alacak (Credit)</div>
              <div className="text-2xl font-extrabold text-orange-400">${totalCredit.toFixed(2)}</div>
            </div>

            <div>
              <div className="text-xs text-slate-400">Bakiye Farkı</div>
              <div className={`text-2xl font-extrabold ${isBalanced ? 'text-emerald-400' : 'text-red-400'}`}>
                ${difference.toFixed(2)}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
export default CreateJournalEntry;
