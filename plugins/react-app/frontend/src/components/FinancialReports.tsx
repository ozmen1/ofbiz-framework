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
import { useTranslation } from '../i18n';

type ReportTab = 'trial-balance' | 'balance-sheet' | 'income-statement' | 'aging';

export const FinancialReports: React.FC = () => {
  const { translations, locale } = useTranslation();
  const r = translations.reports;
  const common = translations.common;
  const coa = translations.chartOfAccounts;

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

  const formatCurrency = useCallback((val: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
      style: 'currency',
      currency
    }).format(val || 0);
  }, [locale]);

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
          setError(err.message || (locale === 'tr' ? 'Mizan verileri alınamadı.' : 'Could not load trial balance data.'));
          setLoading(false);
        });
    } else if (activeTab === 'balance-sheet') {
      api.getBalanceSheet(filterPayload)
        .then(res => {
          setBalanceSheetData(res.balanceSheet);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Bilanço verileri alınamadı.' : 'Could not load balance sheet data.'));
          setLoading(false);
        });
    } else if (activeTab === 'income-statement') {
      api.getIncomeStatement(filterPayload)
        .then(res => {
          setIncomeStatementData(res.incomeStatement);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Gelir tablosu verileri alınamadı.' : 'Could not load income statement data.'));
          setLoading(false);
        });
    } else if (activeTab === 'aging') {
      api.getAgingSummary(agingType)
        .then(res => {
          setAgingData(res.agingSummary);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Yaşlandırma verileri alınamadı.' : 'Could not load aging data.'));
          setLoading(false);
        });
    }
  }, [activeTab, organizationPartyId, selectedYear, agingType, locale]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    if (activeTab === 'trial-balance' && trialBalanceData) {
      const headers = 'Account Code,Account Name,Class,Debit,Credit,Balance,Type\n';
      const rows = trialBalanceData.accounts.map(a => 
        `"${a.accountCode}","${a.accountName}","${a.glAccountClassId}",${a.debits},${a.credits},${a.balance},"${a.debitCreditFlag}"`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trial_balance_${organizationPartyId}_${selectedYear || 'all'}.csv`;
      link.click();
    } else if (activeTab === 'aging' && agingData) {
      const headers = 'Party ID,Party Name,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total\n';
      const rows = agingData.rows.map(r => 
        `"${r.partyId}","${r.partyName}",${r.current},${r.days1_30},${r.days31_60},${r.days61_90},${r.daysOver90},${r.total}`
      ).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `aging_${agingType}.csv`;
      link.click();
    } else {
      alert(r.csvReadyNotice);
    }
  };

  const filteredTbAccounts = (trialBalanceData?.accounts || []).filter(a => 
    !tbSearch || 
    a.accountCode.toLowerCase().includes(tbSearch.toLowerCase()) || 
    a.accountName.toLowerCase().includes(tbSearch.toLowerCase()) || 
    a.glAccountId.toLowerCase().includes(tbSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Top Filter and Actions Toolbar */}
      <div className="ds-card p-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          {/* Navigation Tabs */}
          <div className="ds-tab-bar">
            <button
              onClick={() => setActiveTab('trial-balance')}
              className={activeTab === 'trial-balance' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <FileText size={16} /> {r.trialBalance}
            </button>
            <button
              onClick={() => setActiveTab('balance-sheet')}
              className={activeTab === 'balance-sheet' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <Landmark size={16} /> {r.balanceSheet}
            </button>
            <button
              onClick={() => setActiveTab('income-statement')}
              className={activeTab === 'income-statement' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <TrendingUp size={16} /> {r.incomeStatement}
            </button>
            <button
              onClick={() => setActiveTab('aging')}
              className={activeTab === 'aging' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <Clock size={16} /> {r.aging}
            </button>
          </div>

          {/* Right Filters & Tools */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Organization */}
            <select
              value={organizationPartyId}
              onChange={(e) => setOrganizationPartyId(e.target.value)}
              className="ds-select text-sm"
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
                className="ds-select text-sm"
              >
                <option value="">{r.allTimesLive}</option>
                {metadata.years.map(y => (
                  <option key={y} value={y}>{y} {r.fiscalYear}</option>
                ))}
              </select>
            )}

            {/* Aging Type Toggle */}
            {activeTab === 'aging' && (
              <select
                value={agingType}
                onChange={(e) => setAgingType(e.target.value as 'AR' | 'AP')}
                className="ds-select text-sm"
              >
                <option value="AR">{r.customerReceivablesAR}</option>
                <option value="AP">{r.vendorPayablesAP}</option>
              </select>
            )}

            <button
              onClick={loadReport}
              title={common.refresh}
              className="ds-btn-secondary p-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleExportCsv}
              title={r.downloadCsvButton}
              className="ds-btn-secondary flex items-center gap-1 text-sm"
            >
              <Download size={14} /> CSV
            </button>

            <button
              onClick={handlePrint}
              title={r.printButton}
              className="ds-btn-secondary flex items-center gap-1 text-sm"
            >
              <Printer size={14} /> {r.printButton}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="ds-alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
          <Loader2 size={36} className="ds-spinner mx-auto mb-4" />
          <div className="text-slate-400">{r.calculatingReport}</div>
        </div>
      ) : (
        <>
          {/* TAB 1: TRIAL BALANCE (MİZAN) */}
          {activeTab === 'trial-balance' && trialBalanceData && (
            <div className="flex flex-col gap-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
                <div className="ds-card p-6">
                  <span className="text-xs text-slate-400 uppercase">{coa.totalDebits}</span>
                  <div className="text-[1.75rem] font-bold my-1 text-blue-400">
                    {formatCurrency(trialBalanceData.totalDebits)}
                  </div>
                  <div className="text-xs text-slate-400">{r.totalDebitAllAccounts}</div>
                </div>

                <div className="ds-card p-6">
                  <span className="text-xs text-slate-400 uppercase">{coa.totalCredits}</span>
                  <div className="text-[1.75rem] font-bold my-1 text-purple-400">
                    {formatCurrency(trialBalanceData.totalCredits)}
                  </div>
                  <div className="text-xs text-slate-400">{r.totalCreditAllAccounts}</div>
                </div>

                <div className="ds-card p-6">
                  <span className="text-xs text-slate-400 uppercase">{r.differenceAmount}</span>
                  <div className="flex items-center gap-2 my-2">
                    {trialBalanceData.isBalanced ? (
                      <span className="ds-badge ds-badge-green inline-flex items-center gap-1">
                        <CheckCircle2 size={16} /> {locale === 'tr' ? 'Mizan Dengede (Fark: $0.00)' : 'Trial Balance Balanced (Diff: $0.00)'}
                      </span>
                    ) : (
                      <span className="ds-badge ds-badge-red inline-flex items-center gap-1">
                        <AlertTriangle size={16} /> {locale === 'tr' ? 'Denge Farkı: ' : 'Balance Difference: '} {formatCurrency(trialBalanceData.difference)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{common.total} {trialBalanceData.accounts.length} {coa.registeredAccounts.toLowerCase()}</div>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="ds-card p-4 flex items-center">
                <div className="relative w-80">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={r.searchAccountPlaceholder}
                    value={tbSearch}
                    onChange={(e) => setTbSearch(e.target.value)}
                    className="ds-input pl-9 w-full text-sm"
                  />
                </div>
              </div>

              {/* Trial Balance Table */}
              <div className="ds-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{coa.accountCode}</th>
                        <th className="ds-th">{coa.accountName}</th>
                        <th className="ds-th">{coa.accountClass}</th>
                        <th className="ds-th-right">{coa.totalDebits}</th>
                        <th className="ds-th-right">{coa.totalCredits}</th>
                        <th className="ds-th-right">{r.netIncome}</th>
                        <th className="ds-th text-center">{coa.normalSide}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTbAccounts.map(acc => (
                        <tr key={acc.glAccountId} className="ds-tbody-row">
                          <td className="ds-td font-mono text-indigo-400 font-semibold">
                            #{acc.accountCode || acc.glAccountId}
                          </td>
                          <td className="ds-td font-medium text-white">
                            {acc.accountName}
                          </td>
                          <td className="ds-td-muted text-xs">
                            <span className="ds-badge ds-badge-slate">{acc.glAccountClassId}</span>
                          </td>
                          <td className="ds-td-right text-blue-400">
                            {acc.debits > 0 ? formatCurrency(acc.debits) : '-'}
                          </td>
                          <td className="ds-td-right text-purple-400">
                            {acc.credits > 0 ? formatCurrency(acc.credits) : '-'}
                          </td>
                          <td className={`ds-td-right font-bold ${acc.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(Math.abs(acc.balance))}
                          </td>
                          <td className="ds-td text-center">
                            <span className={`ds-badge ${acc.debitCreditFlag === 'D' ? 'ds-badge-blue' : 'ds-badge-purple'}`}>
                              {acc.debitCreditFlag === 'D' ? coa.normalSideDebit : coa.normalSideCredit}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-white/[0.04] font-bold border-t-2 border-slate-700">
                        <td colSpan={3} className="ds-td text-right text-white">
                          {common.total.toUpperCase()}:
                        </td>
                        <td className="ds-td-right text-blue-400">
                          {formatCurrency(trialBalanceData.totalDebits)}
                        </td>
                        <td className="ds-td-right text-purple-400">
                          {formatCurrency(trialBalanceData.totalCredits)}
                        </td>
                        <td colSpan={2} className="ds-td text-center text-green-400">
                          {locale === 'tr' ? 'Dengede (Fark: $0.00)' : 'Balanced (Diff: $0.00)'}
                        </td>
                      </tr>
                    </tbody>

                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BALANCE SHEET (BİLANÇO) */}
          {activeTab === 'balance-sheet' && balanceSheetData && (
            <div className="flex flex-col gap-6">
              {/* Balance Badge */}
              <div className="flex justify-between items-center bg-white/[0.02] p-4 px-6 rounded-xl border border-slate-700/50">
                <div>
                  <h4 className="m-0 text-[1.1rem] text-white">{r.balanceSheetTitle} ({balanceSheetData.asOfDate})</h4>
                  <div className="text-xs text-slate-400 mt-1">{r.companyLabel}: {balanceSheetData.organizationPartyId}</div>
                </div>
                <div>
                  {balanceSheetData.isBalanced ? (
                    <span className="ds-badge ds-badge-green inline-flex items-center gap-1">
                      <CheckCircle2 size={16} /> {locale === 'tr' ? 'Aktif = Pasif (Dengede)' : 'Assets = Liabilities + Equity (Balanced)'}
                    </span>
                  ) : (
                    <span className="ds-badge ds-badge-red inline-flex items-center gap-1">
                      <AlertTriangle size={16} /> {locale === 'tr' ? 'Denge Farkı: ' : 'Balance Difference: '} {formatCurrency(balanceSheetData.difference)}
                    </span>
                  )}
                </div>
              </div>

              {/* Side by Side Grid: Assets vs Liabilities & Equity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AKTİFLER (ASSETS) */}
                <div className="ds-card p-6 flex flex-col gap-6">
                  <div className="border-b-2 border-indigo-500/30 pb-3 flex justify-between items-center">
                    <h3 className="m-0 text-[1.25rem] text-blue-400 flex items-center gap-2">
                      <Landmark size={20} /> {r.assetsI}
                    </h3>
                    <span className="font-bold text-[1.1rem] text-blue-400">
                      {formatCurrency(balanceSheetData.assets.totalAssets)}
                    </span>
                  </div>

                  {/* Dönen Varlıklar */}
                  <div>
                    <div className="flex justify-between font-semibold text-white mb-2 text-[0.95rem]">
                      <span>{r.currentAssetsA}</span>
                      <span>{formatCurrency(balanceSheetData.assets.totalCurrentAssets)}</span>
                    </div>
                    <div className="pl-4 flex flex-col gap-[0.4rem] text-sm">
                      {balanceSheetData.assets.currentAssets.map(a => (
                        <div key={a.glAccountId} className="flex justify-between text-slate-400">
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span className="text-white">{formatCurrency(a.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Duran Varlıklar */}
                  <div>
                    <div className="flex justify-between font-semibold text-white mb-2 text-[0.95rem]">
                      <span>{r.longTermAssetsB}</span>
                      <span>{formatCurrency(balanceSheetData.assets.totalLongTermAssets)}</span>
                    </div>
                    <div className="pl-4 flex flex-col gap-[0.4rem] text-sm">
                      {balanceSheetData.assets.longTermAssets.map(a => (
                        <div key={a.glAccountId} className="flex justify-between text-slate-400">
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span className="text-white">{formatCurrency(a.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between font-bold text-[1.1rem]">
                    <span>{r.totalAssetsLabel}</span>
                    <span className="text-blue-400">{formatCurrency(balanceSheetData.assets.totalAssets)}</span>
                  </div>
                </div>

                {/* PASİFLER (LIABILITIES & EQUITY) */}
                <div className="ds-card p-6 flex flex-col gap-6">
                  <div className="border-b-2 border-purple-500/30 pb-3 flex justify-between items-center">
                    <h3 className="m-0 text-[1.25rem] text-purple-400 flex items-center gap-2">
                      <Layers size={20} /> {r.liabilitiesII}
                    </h3>
                    <span className="font-bold text-[1.1rem] text-purple-400">
                      {formatCurrency(balanceSheetData.totalLiabilitiesAndEquity)}
                    </span>
                  </div>

                  {/* Kısa Vadeli Yabancı Kaynaklar */}
                  <div>
                    <div className="flex justify-between font-semibold text-white mb-2 text-[0.95rem]">
                      <span>{r.currentLiabilitiesA}</span>
                      <span>{formatCurrency(balanceSheetData.liabilities.totalCurrentLiabilities)}</span>
                    </div>
                    <div className="pl-4 flex flex-col gap-[0.4rem] text-sm">
                      {balanceSheetData.liabilities.currentLiabilities.map(a => (
                        <div key={a.glAccountId} className="flex justify-between text-slate-400">
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span className="text-white">{formatCurrency(a.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Uzun Vadeli Yabancı Kaynaklar */}
                  <div>
                    <div className="flex justify-between font-semibold text-white mb-2 text-[0.95rem]">
                      <span>{r.longTermLiabilitiesB}</span>
                      <span>{formatCurrency(balanceSheetData.liabilities.totalLongTermLiabilities)}</span>
                    </div>
                    <div className="pl-4 flex flex-col gap-[0.4rem] text-sm">
                      {balanceSheetData.liabilities.longTermLiabilities.map(a => (
                        <div key={a.glAccountId} className="flex justify-between text-slate-400">
                          <span>{a.accountName} (#{a.glAccountId})</span>
                          <span className="text-white">{formatCurrency(a.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Özkaynaklar */}
                  <div>
                    <div className="flex justify-between font-semibold text-white mb-2 text-[0.95rem]">
                      <span>{r.equityC}</span>
                      <span>{formatCurrency(balanceSheetData.equity.totalEquity)}</span>
                    </div>
                    <div className="pl-4 flex flex-col gap-[0.4rem] text-sm">
                      {balanceSheetData.equity.equityAccounts.map(a => (
                        <div key={a.glAccountId} className="flex justify-between text-slate-400">
                          <span>{a.accountName}</span>
                          <span className={`${a.balance >= 0 ? 'text-white' : 'text-red-400'} ${a.glAccountId === 'NET_INCOME' ? 'font-semibold' : ''}`}>
                            {formatCurrency(a.balance)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between font-bold text-[1.1rem]">
                    <span>{r.totalLiabilitiesAndEquity}</span>
                    <span className="text-purple-400">{formatCurrency(balanceSheetData.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INCOME STATEMENT (GELİR TABLOSU) */}
          {activeTab === 'income-statement' && incomeStatementData && (
            <div className="flex flex-col gap-6 max-w-[850px] mx-auto w-full">
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.revenue}</span>
                  <div className="text-[1.5rem] font-bold text-green-400 my-1">
                    {formatCurrency(incomeStatementData.totalRevenue)}
                  </div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.cogs}</span>
                  <div className="text-[1.5rem] font-bold text-red-400 my-1">
                    {formatCurrency(incomeStatementData.totalCogs)}
                  </div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.grossProfit}</span>
                  <div className="text-[1.5rem] font-bold text-blue-400 my-1">
                    {formatCurrency(incomeStatementData.grossProfit)}
                  </div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.netProfitPeriod}</span>
                  <div className={`text-[1.5rem] font-bold my-1 ${incomeStatementData.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(incomeStatementData.netIncome)}
                  </div>
                </div>
              </div>

              {/* Waterfall Statement Table */}
              <div className="ds-card p-8">
                <h3 className="m-0 mb-6 text-[1.25rem] text-white border-b border-slate-700/50 pb-3">
                  {r.detailedIncomeStatement} ({incomeStatementData.period})
                </h3>

                <div className="flex flex-col gap-6">
                  {/* Revenue Section */}
                  <div>
                    <div className="flex justify-between font-bold text-base text-green-400 border-b border-green-400/20 pb-2">
                      <span>{r.revenuesSection}</span>
                      <span>{formatCurrency(incomeStatementData.totalRevenue)}</span>
                    </div>
                    <div className="pt-2 pl-4 flex flex-col gap-[0.35rem]">
                      {incomeStatementData.revenues.map(rItem => (
                        <div key={rItem.glAccountId} className="flex justify-between text-sm text-slate-400">
                          <span>{rItem.accountName} (#{rItem.glAccountId})</span>
                          <span className="text-white">{formatCurrency(rItem.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* COGS Section */}
                  <div>
                    <div className="flex justify-between font-bold text-base text-red-400 border-b border-red-400/20 pb-2">
                      <span>{r.cogsSection}</span>
                      <span>-{formatCurrency(incomeStatementData.totalCogs)}</span>
                    </div>
                    <div className="pt-2 pl-4 flex flex-col gap-[0.35rem]">
                      {incomeStatementData.cogs.map(c => (
                        <div key={c.glAccountId} className="flex justify-between text-sm text-slate-400">
                          <span>{c.accountName} (#{c.glAccountId})</span>
                          <span className="text-white">{formatCurrency(c.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gross Profit Callout */}
                  <div className="flex justify-between p-3 px-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 font-bold">
                    <span className="text-white">{r.grossOperatingProfit}</span>
                    <span className="text-blue-400">{formatCurrency(incomeStatementData.grossProfit)}</span>
                  </div>

                  {/* Expenses Section */}
                  <div>
                    <div className="flex justify-between font-bold text-base text-amber-400 border-b border-amber-400/20 pb-2">
                      <span>{r.operatingExpensesOpex}</span>
                      <span>-{formatCurrency(incomeStatementData.totalExpenses)}</span>
                    </div>
                    <div className="pt-2 pl-4 flex flex-col gap-[0.35rem]">
                      {incomeStatementData.expenses.map(e => (
                        <div key={e.glAccountId} className="flex justify-between text-sm text-slate-400">
                          <span>{e.accountName} (#{e.glAccountId})</span>
                          <span className="text-white">{formatCurrency(e.balance)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Net Income Callout */}
                  <div className={`flex justify-between p-4 px-5 rounded-lg border font-extrabold text-[1.15rem] ${
                    incomeStatementData.netIncome >= 0
                      ? 'bg-green-500/15 border-green-500/30'
                      : 'bg-red-500/15 border-red-500/30'
                  }`}>
                    <span className="text-white">{r.netProfitOrLoss}</span>
                    <span className={incomeStatementData.netIncome >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatCurrency(incomeStatementData.netIncome)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AGING SUMMARY (YAŞLANDIRMA RAPORU) */}
          {activeTab === 'aging' && agingData && (
            <div className="flex flex-col gap-6">
              {/* Bucket Metrics */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.notDueYet}</span>
                  <div className="text-[1.4rem] font-bold text-green-400 my-1">
                    {formatCurrency(agingData.bucketTotals.current)}
                  </div>
                  <div className="text-xs text-slate-400">{locale === 'tr' ? 'Vadesi henüz dolmamış' : 'Not past due date'}</div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.days1to30}</span>
                  <div className="text-[1.4rem] font-bold text-amber-400 my-1">
                    {formatCurrency(agingData.bucketTotals.days1_30)}
                  </div>
                  <div className="text-xs text-slate-400">{locale === 'tr' ? '1 aya kadar gecikme' : 'Up to 30 days past due'}</div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.days31to60}</span>
                  <div className="text-[1.4rem] font-bold text-orange-400 my-1">
                    {formatCurrency(agingData.bucketTotals.days31_60)}
                  </div>
                  <div className="text-xs text-slate-400">{locale === 'tr' ? '2 aya kadar gecikme' : '31 to 60 days past due'}</div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.days61to90}</span>
                  <div className="text-[1.4rem] font-bold text-red-400 my-1">
                    {formatCurrency(agingData.bucketTotals.days61_90)}
                  </div>
                  <div className="text-xs text-slate-400">{locale === 'tr' ? '3 aya kadar gecikme' : '61 to 90 days past due'}</div>
                </div>

                <div className="ds-card p-5">
                  <span className="text-xs text-slate-400 uppercase">{r.days90Plus}</span>
                  <div className="text-[1.4rem] font-bold text-red-500 my-1">
                    {formatCurrency(agingData.bucketTotals.daysOver90)}
                  </div>
                  <div className="text-xs text-slate-400">{locale === 'tr' ? '3 aydan eski gecikme' : 'Over 90 days past due'}</div>
                </div>

                <div className="ds-card p-5 border-indigo-500/40">
                  <span className="text-xs text-slate-400 uppercase">{common.total}</span>
                  <div className="text-[1.5rem] font-bold text-purple-400 my-1">
                    {formatCurrency(agingData.bucketTotals.grandTotal)}
                  </div>
                  <div className="text-xs text-slate-400">{agingData.type === 'AR' ? r.openReceivables : r.openPayables}</div>
                </div>
              </div>

              {/* Aging Breakdown Table */}
              <div className="ds-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{common.party} ID</th>
                        <th className="ds-th">{r.partyTitle}</th>
                        <th className="ds-th-right text-green-400">{r.notDueYet}</th>
                        <th className="ds-th-right text-amber-400">{r.days1to30}</th>
                        <th className="ds-th-right text-orange-400">{r.days31to60}</th>
                        <th className="ds-th-right text-red-400">{r.days61to90}</th>
                        <th className="ds-th-right text-red-500">{r.days90Plus}</th>
                        <th className="ds-th-right font-bold">{common.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingData.rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-12 text-slate-400">
                            {r.noAgingParties}
                          </td>
                        </tr>
                      ) : (
                        agingData.rows.map(row => (
                          <tr key={row.partyId} className="ds-tbody-row">
                            <td className="ds-td font-semibold">{row.partyId}</td>
                            <td className="ds-td">{row.partyName}</td>
                            <td className="ds-td-right text-green-400 font-mono">
                              {formatCurrency(row.current)}
                            </td>
                            <td className="ds-td-right text-amber-400 font-mono">
                              {formatCurrency(row.days1_30)}
                            </td>
                            <td className="ds-td-right text-orange-400 font-mono">
                              {formatCurrency(row.days31_60)}
                            </td>
                            <td className="ds-td-right text-red-400 font-mono">
                              {formatCurrency(row.days61_90)}
                            </td>
                            <td className="ds-td-right text-red-500 font-mono font-bold">
                              {formatCurrency(row.daysOver90)}
                            </td>
                            <td className="ds-td-right font-bold font-mono">
                              {formatCurrency(row.total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialReports;
