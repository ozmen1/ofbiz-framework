import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, TrendingUp, Landmark, Clock, RefreshCw, 
  CheckCircle2, AlertTriangle, Printer, Download, Search, 
  Loader2, Layers
} from 'lucide-react';
import { 
  api, 
  TrialBalanceResponse, 
  BalanceSheetResponse, 
  IncomeStatementResponse, 
  AgingResponse, 
  ReportMetadataResponse 
} from '../services/api';

type ReportTab = 'trial-balance' | 'balance-sheet' | 'income-statement' | 'aging';

const FinancialReports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('trial-balance');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Global Filter State
  const [organizationPartyId, setOrganizationPartyId] = useState<string>('Company');
  const [selectedYear, setSelectedYear] = useState<string>(''); // empty means All Time
  const [agingType, setAgingType] = useState<'AR' | 'AP'>('AR');

  // Metadata
  const [metadata, setMetadata] = useState<ReportMetadataResponse['metadata']>({
    organizations: [{ partyId: 'Company', name: 'Your Company Name Here (Company)' }],
    years: ['2009', '2024', '2025', '2026'],
    currencies: [{ uomId: 'USD', description: 'US Dollar ($)' }]
  });

  // Report Data States
  const [trialBalanceData, setTrialBalanceData] = useState<TrialBalanceResponse | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetResponse['balanceSheet'] | null>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementResponse['incomeStatement'] | null>(null);
  const [agingData, setAgingData] = useState<AgingResponse['agingSummary'] | null>(null);

  // Trial balance search
  const [tbSearch, setTbSearch] = useState<string>('');

  // Load Metadata once
  useEffect(() => {
    api.getReportMetadata()
      .then(res => {
        if (res?.metadata) setMetadata(res.metadata);
      })
      .catch(err => console.warn('Could not load report metadata:', err));
  }, []);

  // Fetch Report Data based on active tab
  const loadReport = useCallback(() => {
    setLoading(true);
    setError(null);

    const filterPayload: Record<string, any> = {
      organizationPartyId: organizationPartyId || 'Company'
    };
    if (selectedYear) {
      filterPayload.year = selectedYear;
    }

    if (activeTab === 'trial-balance') {
      api.getTrialBalance(filterPayload)
        .then(res => {
          setTrialBalanceData(res);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Mizan verileri alınamadı.');
          setLoading(false);
        });
    } else if (activeTab === 'balance-sheet') {
      api.getBalanceSheet(filterPayload)
        .then(res => {
          setBalanceSheetData(res.balanceSheet);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Bilanço verileri alınamadı.');
          setLoading(false);
        });
    } else if (activeTab === 'income-statement') {
      api.getIncomeStatement(filterPayload)
        .then(res => {
          setIncomeStatementData(res.incomeStatement);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Gelir tablosu verileri alınamadı.');
          setLoading(false);
        });
    } else if (activeTab === 'aging') {
      api.getAgingSummary(agingType)
        .then(res => {
          setAgingData(res.agingSummary);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || 'Yaşlandırma verileri alınamadı.');
          setLoading(false);
        });
    }
  }, [activeTab, organizationPartyId, selectedYear, agingType]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (activeTab === 'trial-balance' && trialBalanceData) {
      const headers = 'Hesap Kodu,Hesap Adı,Sinif,Borc,Alacak,Bakiye,Yon\n';
      const rows = trialBalanceData.accounts.map(a => 
        `"${a.accountCode}","${a.accountName}","${a.glAccountClassId}",${a.debits},${a.credits},${a.balance},"${a.debitCreditFlag}"`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mizan_${organizationPartyId}_${selectedYear || 'tum'}.csv`;
      link.click();
    } else if (activeTab === 'aging' && agingData) {
      const headers = 'Cari ID,Cari Adi,Vadesi Gelmemis,1-30 Gun,31-60 Gun,61-90 Gun,90+ Gun,Toplam\n';
      const rows = agingData.rows.map(r => 
        `"${r.partyId}","${r.partyName}",${r.current},${r.days1_30},${r.days31_60},${r.days61_90},${r.daysOver90},${r.total}`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yaslandirma_${agingType}.csv`;
      link.click();
    } else {
      alert('Bu sekme için CSV indirme hazırlandı. Yazdır butonundan PDF olarak kaydedebilirsiniz.');
    }
  };

  const filteredTbAccounts = (trialBalanceData?.accounts || []).filter(a => 
    !tbSearch || 
    a.accountCode.toLowerCase().includes(tbSearch.toLowerCase()) || 
    a.accountName.toLowerCase().includes(tbSearch.toLowerCase()) ||
    a.glAccountId.toLowerCase().includes(tbSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Filter and Actions Toolbar */}
      <div className="glass-card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(15, 23, 42, 0.8)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
            <button
              onClick={() => setActiveTab('trial-balance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'trial-balance' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'trial-balance' ? 'white' : 'var(--text-muted)',
                fontWeight: activeTab === 'trial-balance' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              <FileText size={16} /> Mizan (Trial Balance)
            </button>
            <button
              onClick={() => setActiveTab('balance-sheet')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'balance-sheet' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'balance-sheet' ? 'white' : 'var(--text-muted)',
                fontWeight: activeTab === 'balance-sheet' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              <Landmark size={16} /> Bilanço (Balance Sheet)
            </button>
            <button
              onClick={() => setActiveTab('income-statement')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'income-statement' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'income-statement' ? 'white' : 'var(--text-muted)',
                fontWeight: activeTab === 'income-statement' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              <TrendingUp size={16} /> Gelir Tablosu (P&L)
            </button>
            <button
              onClick={() => setActiveTab('aging')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'aging' ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                color: activeTab === 'aging' ? 'white' : 'var(--text-muted)',
                fontWeight: activeTab === 'aging' ? 600 : 400,
                cursor: 'pointer'
              }}
            >
              <Clock size={16} /> Yaşlandırma (Aging)
            </button>
          </div>

          {/* Right Filters & Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Organization */}
            <select
              value={organizationPartyId}
              onChange={(e) => setOrganizationPartyId(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'white',
                fontSize: '0.85rem'
              }}
            >
              {metadata.organizations.map(org => (
                <option key={org.partyId} value={org.partyId}>{org.name}</option>
              ))}
            </select>

            {/* Year / Period (Not for aging) */}
            {activeTab !== 'aging' && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              >
                <option value="">Tüm Zamanlar (Canlı)</option>
                {metadata.years.map(y => (
                  <option key={y} value={y}>{y} Mali Yılı</option>
                ))}
              </select>
            )}

            {/* Aging Type Toggle */}
            {activeTab === 'aging' && (
              <select
                value={agingType}
                onChange={(e) => setAgingType(e.target.value as 'AR' | 'AP')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  background: 'rgba(15, 23, 42, 0.6)',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              >
                <option value="AR">Müşteri Alacakları (AR)</option>
                <option value="AP">Tedarikçi Borçları (AP)</option>
              </select>
            )}

            <button
              onClick={loadReport}
              title="Yenile"
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>

            <button
              onClick={handleExportCsv}
              title="CSV İndir"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <Download size={14} /> CSV
            </button>

            <button
              onClick={handlePrint}
              title="Yazdır / PDF"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--glass-border)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              <Printer size={14} /> Yazdır
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <Loader2 size={36} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
          <div style={{ color: 'var(--text-muted)' }}>Mali rapor hesaplanıyor...</div>
        </div>
      ) : (
        <>
          {/* TAB 1: TRIAL BALANCE (MİZAN) */}
          {activeTab === 'trial-balance' && trialBalanceData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Toplam Borç (Debit)</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0', color: '#60a5fa' }}>
                    ${trialBalanceData.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tüm hesapların borç toplamı</div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Toplam Alacak (Credit)</span>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0', color: '#c084fc' }}>
                    ${trialBalanceData.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tüm hesapların alacak toplamı</div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mizan Denge Durumu</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                    {trialBalanceData.isBalanced ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80'
                      }}>
                        <CheckCircle2 size={16} /> Mizan Dengede (Fark: $0.00)
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#f87171'
                      }}>
                        <AlertTriangle size={16} /> Denge Farkı: ${trialBalanceData.difference.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toplam {trialBalanceData.accounts.length} hesap listeleniyor</div>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '320px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Hesap kodu veya adı ile filtrele..."
                    value={tbSearch}
                    onChange={(e) => setTbSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(15, 23, 42, 0.6)',
                      color: 'white',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Trial Balance Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '1rem 1.25rem' }}>Hesap Kodu</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Hesap Adı</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Hesap Sınıfı</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Toplam Borç</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Toplam Alacak</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>Net Bakiye</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>B/A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTbAccounts.map(acc => (
                      <tr key={acc.glAccountId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'white' }}>
                          #{acc.accountCode || acc.glAccountId}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem' }}>
                          {acc.accountName}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {acc.glAccountClassId}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                          {acc.debits > 0 ? `$${acc.debits.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                          {acc.credits > 0 ? `$${acc.credits.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontWeight: 700, color: acc.balance >= 0 ? '#4ade80' : '#f87171' }}>
                          ${Math.abs(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', textAlign: 'center' }}>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: acc.debitCreditFlag === 'D' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(192, 132, 252, 0.15)',
                            color: acc.debitCreditFlag === 'D' ? '#60a5fa' : '#c084fc'
                          }}>
                            {acc.debitCreditFlag === 'D' ? 'Borç (D)' : 'Alacak (C)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'rgba(255,255,255,0.04)', fontWeight: 700, fontSize: '0.95rem' }}>
                      <td colSpan={3} style={{ padding: '1rem 1.25rem' }}>GENEL TOPLAM</td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#60a5fa' }}>
                        ${trialBalanceData.totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#c084fc' }}>
                        ${trialBalanceData.totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} style={{ padding: '1rem 1.25rem', textAlign: 'center', color: '#4ade80' }}>
                        Dengede (Fark: $0.00)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: BALANCE SHEET (BİLANÇO) */}
          {activeTab === 'balance-sheet' && balanceSheetData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Balance Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem' }}>Bilanço Raporu ({balanceSheetData.asOfDate})</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Şirket: {balanceSheetData.organizationPartyId}</div>
                </div>
                <div>
                  {balanceSheetData.isBalanced ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#4ade80'
                    }}>
                      <CheckCircle2 size={16} /> Aktif = Pasif (Dengede)
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171'
                    }}>
                      <AlertTriangle size={16} /> Denge Farkı: ${balanceSheetData.difference.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Side by Side Grid: Aktif (Assets) vs Pasif (Liabilities & Equity) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* AKTİFLER (ASSETS) */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ borderBottom: '2px solid rgba(99, 102, 241, 0.3)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Landmark size={20} /> I. AKTİF (VARLIKLAR)
                    </h3>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#60a5fa' }}>
                      ${balanceSheetData.assets.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Dönen Varlıklar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span>A. Dönen Varlıklar (Current Assets)</span>
                      <span>${balanceSheetData.assets.totalCurrentAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {balanceSheetData.assets.currentAssets.map(a => (
                        <div key={a.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span style={{ color: 'white' }}>${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duran Varlıklar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span>B. Duran Varlıklar (Long-term / Fixed Assets)</span>
                      <span>${balanceSheetData.assets.totalLongTermAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {balanceSheetData.assets.longTermAssets.map(a => (
                        <div key={a.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span style={{ color: 'white' }}>${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                    <span>TOPLAM AKTİFLER</span>
                    <span style={{ color: '#60a5fa' }}>${balanceSheetData.assets.totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* PASİFLER (LIABILITIES & EQUITY) */}
                <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ borderBottom: '2px solid rgba(168, 85, 247, 0.3)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Layers size={20} /> II. PASİF (KAYNAKLAR)
                    </h3>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#c084fc' }}>
                      ${balanceSheetData.totalLiabilitiesAndEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Kısa Vadeli Yabancı Kaynaklar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span>A. Kısa Vadeli Borçlar (Current Liabilities)</span>
                      <span>${balanceSheetData.liabilities.totalCurrentLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {balanceSheetData.liabilities.currentLiabilities.map(a => (
                        <div key={a.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span style={{ color: 'white' }}>${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Uzun Vadeli Yabancı Kaynaklar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span>B. Uzun Vadeli Borçlar (Long-term Liabilities)</span>
                      <span>${balanceSheetData.liabilities.totalLongTermLiabilities.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {balanceSheetData.liabilities.longTermLiabilities.map(a => (
                        <div key={a.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span style={{ color: 'white' }}>${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Özkaynaklar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'white', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                      <span>C. Özkaynaklar (Equity)</span>
                      <span>${balanceSheetData.equity.totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                      {balanceSheetData.equity.equityAccounts.map(a => (
                        <div key={a.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                          <span>{a.accountName}</span>
                          <span style={{ color: a.balance >= 0 ? 'white' : '#f87171', fontWeight: a.glAccountId === 'NET_INCOME' ? 600 : 400 }}>
                            ${a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                    <span>TOPLAM PASİFLER</span>
                    <span style={{ color: '#c084fc' }}>${balanceSheetData.totalLiabilitiesAndEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INCOME STATEMENT (GELİR TABLOSU) */}
          {activeTab === 'income-statement' && incomeStatementData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
              {/* Executive Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Toplam Gelir</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80', margin: '0.25rem 0' }}>
                    ${incomeStatementData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Satışların Maliyeti (COGS)</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', margin: '0.25rem 0' }}>
                    ${incomeStatementData.totalCogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Brüt Kâr (Gross Profit)</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa', margin: '0.25rem 0' }}>
                    ${incomeStatementData.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dönem Net Kâr/Zarar</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: incomeStatementData.netIncome >= 0 ? '#4ade80' : '#f87171', margin: '0.25rem 0' }}>
                    ${incomeStatementData.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Waterfall Statement Table */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                  Ayrıntılı Gelir Tablosu ({incomeStatementData.period})
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Revenue Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#4ade80', borderBottom: '1px solid rgba(74, 222, 128, 0.2)', paddingBottom: '0.5rem' }}>
                      <span>1. HASILAT VE GELİRLER (Revenues)</span>
                      <span>${incomeStatementData.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ padding: '0.5rem 0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {incomeStatementData.revenues.map(r => (
                        <div key={r.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span>{r.accountName} (#{r.glAccountId})</span>
                          <span style={{ color: 'white' }}>${r.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COGS Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#f87171', borderBottom: '1px solid rgba(248, 113, 113, 0.2)', paddingBottom: '0.5rem' }}>
                      <span>2. SATIŞLARIN MALİYETİ (COGS)</span>
                      <span>-${incomeStatementData.totalCogs.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ padding: '0.5rem 0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {incomeStatementData.cogs.map(c => (
                        <div key={c.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span>{c.accountName} (#{c.glAccountId})</span>
                          <span style={{ color: 'white' }}>${c.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gross Profit Callout */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)', fontWeight: 700 }}>
                    <span>BRÜT FAALİYET KÂRI</span>
                    <span style={{ color: '#60a5fa' }}>${incomeStatementData.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', color: '#facc15', borderBottom: '1px solid rgba(250, 204, 21, 0.2)', paddingBottom: '0.5rem' }}>
                      <span>3. FAALİYET GİDERLERİ (OPEX)</span>
                      <span>-${incomeStatementData.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ padding: '0.5rem 0 0 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {incomeStatementData.expenses.map(e => (
                        <div key={e.glAccountId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span>{e.accountName} (#{e.glAccountId})</span>
                          <span style={{ color: 'white' }}>${e.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Net Income Callout */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '1rem 1.25rem',
                    background: incomeStatementData.netIncome >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    borderRadius: '8px',
                    border: `1px solid ${incomeStatementData.netIncome >= 0 ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    fontWeight: 800,
                    fontSize: '1.15rem'
                  }}>
                    <span>DÖNEM NET KÂRI / (ZARARI)</span>
                    <span style={{ color: incomeStatementData.netIncome >= 0 ? '#4ade80' : '#f87171' }}>
                      ${incomeStatementData.netIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AGING SUMMARY (YAŞLANDIRMA RAPORU) */}
          {activeTab === 'aging' && agingData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Bucket Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vadesi Gelmemiş</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#4ade80', margin: '0.25rem 0' }}>
                    ${agingData.bucketTotals.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vadesi henüz dolmamış</div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>1 - 30 Gün</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#facc15', margin: '0.25rem 0' }}>
                    ${agingData.bucketTotals.days1_30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1 aya kadar gecikme</div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>31 - 60 Gün</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fb923c', margin: '0.25rem 0' }}>
                    ${agingData.bucketTotals.days31_60.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>2 aya kadar gecikme</div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>61 - 90 Gün</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171', margin: '0.25rem 0' }}>
                    ${agingData.bucketTotals.days61_90.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3 aya kadar gecikme</div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>90+ Gün</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444', margin: '0.25rem 0' }}>
                    ${agingData.bucketTotals.daysOver90.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>3 aydan eski gecikme</div>
                </div>

                <div className="glass-card" style={{ padding: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Genel Toplam Bakiye</span>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c084fc', margin: '0.25rem 0' }}>
                    ${agingData.bucketTotals.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{agingData.type === 'AR' ? 'Açık Alacaklar' : 'Açık Borçlar'}</div>
                </div>
              </div>

              {/* Aging Breakdown Table */}
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '1rem 1.25rem' }}>Cari ID</th>
                      <th style={{ padding: '1rem 1.25rem' }}>Cari Ünvanı</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#4ade80' }}>Vadesi Gelmemiş</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#facc15' }}>1 - 30 Gün</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#fb923c' }}>31 - 60 Gün</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#f87171' }}>61 - 90 Gün</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', color: '#ef4444' }}>90+ Gün</th>
                      <th style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700 }}>Toplam Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          Açık bakiye içeren cari bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      agingData.rows.map(row => (
                        <tr key={row.partyId} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                          <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>{row.partyId}</td>
                          <td style={{ padding: '0.75rem 1.25rem' }}>{row.partyName}</td>
                          <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                            {row.current > 0 ? `$${row.current.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                            {row.days1_30 > 0 ? `$${row.days1_30.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                            {row.days31_60 > 0 ? `$${row.days31_60.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                            {row.days61_90 > 0 ? `$${row.days61_90.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: row.daysOver90 > 0 ? '#ef4444' : 'inherit' }}>
                            {row.daysOver90 > 0 ? `$${row.daysOver90.toFixed(2)}` : '-'}
                          </td>
                          <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontWeight: 700, color: 'white' }}>
                            ${row.total.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialReports;
