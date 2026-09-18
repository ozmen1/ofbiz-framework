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
      <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
        <Loader2 className="animate-spin" size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Hesap planı ve meta veriler yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            className="glass-card"
            style={{ padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '10px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <FileText size={26} color="var(--primary)" />
              Yeni Yevmiye Fişi Oluştur
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              Çift taraflı kayıt esasına göre dengeli (Borç = Alacak) yevmiye veya mahsup fişi girişi
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onBack}
            className="glass-card"
            style={{ padding: '0.625rem 1.25rem', cursor: 'pointer' }}
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !isBalanced}
            className="btn-primary"
            style={{
              padding: '0.625rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: isBalanced ? 1 : 0.6,
              cursor: isBalanced ? 'pointer' : 'not-allowed'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : shouldPost ? <Send size={16} /> : <CheckCircle2 size={16} />}
            {shouldPost ? 'Kaydet ve Defter-i Kebir’e İşle' : 'Taslak Olarak Kaydet'}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#f87171',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Header Info Form */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
          Fiş Genel Bilgileri
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          {/* Transaction Date */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
              Fiş / Yevmiye Tarihi *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={e => setTransactionDate(e.target.value)}
                style={{
                  width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
                }}
              />
            </div>
          </div>

          {/* Acctg Trans Type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
              İşlem / Fiş Türü *
            </label>
            <select
              value={acctgTransTypeId}
              onChange={e => setAcctgTransTypeId(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px',
                background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
              }}
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
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
              Mali Tür (Fiscal Type) *
            </label>
            <select
              value={glFiscalTypeId}
              onChange={e => setGlFiscalTypeId(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px',
                background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white'
              }}
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
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
              Belge / Fiş Ref No
            </label>
            <input
              type="text"
              placeholder="Örn: MHS-2026-001"
              value={voucherRef}
              onChange={e => setVoucherRef(e.target.value)}
              style={{
                width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
            Genel Fiş Açıklaması
          </label>
          <input
            type="text"
            placeholder="Yevmiye kaydının genel açıklamasını giriniz..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{
              width: '100%', padding: '0.625rem 0.75rem', borderRadius: '8px',
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white'
            }}
          />
        </div>

        {/* Posting Options Toggle */}
        <div style={{
          padding: '0.875rem 1rem',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Info size={18} color="var(--primary)" />
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Kayıt Sonrası Defter-i Kebir Onayı:</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                {shouldPost ? 'Kaydedildikten hemen sonra Defter-i Kebir’e işlenecek (Posted)' : 'Taslak (Draft) olarak kaydedilecek, daha sonra onaylanabilir'}
              </span>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={shouldPost}
              onChange={e => setShouldPost(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span style={{ color: shouldPost ? '#4ade80' : 'var(--text-muted)' }}>Doğrudan Onayla</span>
          </label>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
              Yevmiye Maddeleri ({lines.length} Satır)
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Her satır için GL hesabı, Borç (D) veya Alacak (C) yönünü ve tutarı belirleyiniz.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleAutoBalance}
              className="glass-card"
              style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              Otomatik Dengele
            </button>
            <button
              type="button"
              onClick={() => handleAddLine('D')}
              className="glass-card"
              style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#60a5fa' }}
            >
              <Plus size={14} />
              Borç Satırı Ekle
            </button>
            <button
              type="button"
              onClick={() => handleAddLine('C')}
              className="glass-card"
              style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fb923c' }}
            >
              <Plus size={14} />
              Alacak Satırı Ekle
            </button>
          </div>
        </div>

        {/* Lines Grid / Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '40px' }}>#</th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', minWidth: '240px' }}>GL Hesabı *</th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'center', width: '130px' }}>Yön *</th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right', width: '160px' }}>Tutar ($) *</th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', minWidth: '180px' }}>Satır Açıklaması</th>
                <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left', width: '140px' }}>Cari / İlgili</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', width: '45px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {idx + 1}
                  </td>

                  {/* GL Account Selector */}
                  <td style={{ padding: '0.75rem 0.75rem' }}>
                    <select
                      value={line.glAccountId}
                      onChange={e => handleLineChange(line.id, 'glAccountId', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.625rem', borderRadius: '6px',
                        background: '#1e293b', border: '1px solid var(--glass-border)', color: 'white',
                        fontSize: '0.8125rem'
                      }}
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
                  <td style={{ padding: '0.75rem 0.75rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      <button
                        type="button"
                        onClick={() => handleLineChange(line.id, 'debitCreditFlag', 'D')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: line.debitCreditFlag === 'D' ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                          color: line.debitCreditFlag === 'D' ? '#60a5fa' : 'var(--text-muted)'
                        }}
                      >
                        Borç (D)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLineChange(line.id, 'debitCreditFlag', 'C')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: line.debitCreditFlag === 'C' ? 'rgba(249, 115, 22, 0.3)' : 'transparent',
                          color: line.debitCreditFlag === 'C' ? '#fb923c' : 'var(--text-muted)'
                        }}
                      >
                        Alacak (C)
                      </button>
                    </div>
                  </td>

                  {/* Amount Input */}
                  <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={line.amount || ''}
                      onChange={e => handleLineChange(line.id, 'amount', parseFloat(e.target.value) || 0)}
                      style={{
                        width: '100%', padding: '0.5rem 0.625rem', borderRadius: '6px', textAlign: 'right',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                        fontWeight: 700, fontSize: '0.875rem'
                      }}
                    />
                  </td>

                  {/* Line Description */}
                  <td style={{ padding: '0.75rem 0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Satır açıklaması (opsiyonel)"
                      value={line.description || ''}
                      onChange={e => handleLineChange(line.id, 'description', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.625rem', borderRadius: '6px',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                        fontSize: '0.8125rem'
                      }}
                    />
                  </td>

                  {/* Party */}
                  <td style={{ padding: '0.75rem 0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Cari ID"
                      value={line.partyId || ''}
                      onChange={e => handleLineChange(line.id, 'partyId', e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem 0.625rem', borderRadius: '6px',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white',
                        fontSize: '0.8125rem'
                      }}
                    />
                  </td>

                  {/* Remove Action */}
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.id)}
                      disabled={lines.length <= 2}
                      style={{
                        background: 'none', border: 'none',
                        color: lines.length <= 2 ? 'rgba(255,255,255,0.1)' : '#f87171',
                        cursor: lines.length <= 2 ? 'not-allowed' : 'pointer',
                        padding: '0.25rem'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Balance Summary Card */}
      <div className="glass-card" style={{
        padding: '1.5rem',
        borderRadius: '16px',
        border: `1px solid ${isBalanced ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
        background: isBalanced ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {isBalanced ? (
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} color="#4ade80" />
              </div>
            ) : (
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <AlertCircle size={24} color="#f87171" />
              </div>
            )}
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: isBalanced ? '#4ade80' : '#f87171' }}>
                {isBalanced ? 'Fiş Dengeli (Kayıt Yapılabilir)' : 'Fiş Dengesiz! Borç ve Alacak Eşitlenmelidir'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {isBalanced 
                  ? 'Borç ve alacak toplamları tam olarak uyuşuyor. Defter-i kebir kaydına hazır.'
                  : `Borç ve Alacak arasında $${difference.toFixed(2)} tutarında fark bulunmaktadır.`}
              </div>
            </div>
          </div>

          {/* Quick numbers */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Borç (Debit)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#60a5fa' }}>
                ${totalDebit.toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam Alacak (Credit)</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#fb923c' }}>
                ${totalCredit.toFixed(2)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bakiye Farkı</div>
              <div style={{ fontSize: '1.375rem', fontWeight: 800, color: isBalanced ? '#4ade80' : '#f87171' }}>
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
