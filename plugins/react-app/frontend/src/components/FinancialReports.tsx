import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, TrendingUp, Landmark, Clock, RefreshCw, 
  CheckCircle2, AlertTriangle, Printer, Download, Search, 
  Loader2, Layers, Boxes
} from 'lucide-react';
import { 
  api, 
  TrialBalanceResponse, 
  BalanceSheetResponse, 
  IncomeStatementResponse, 
  AgingResponse, 
  ReportMetadataResponse,
  CashFlowStatementResponse,
  ComparativeBalanceSheetResponse,
  ComparativeIncomeStatementResponse,
  InventoryValuationItem,
  InventoryValuationSummary,
  PastDueInvoiceItem,
  PastDueSummary
} from '../services/api';
import { useTranslation } from '../i18n';

type ReportTab = 'trial-balance' | 'balance-sheet' | 'income-statement' | 'cash-flow' | 'comparative-bs' | 'comparative-is' | 'aging' | 'inventory-valuation' | 'past-due';

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
  const [compYear1, setCompYear1] = useState<string>('2025');
  const [compYear2, setCompYear2] = useState<string>('2024');

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
  const [cashFlowData, setCashFlowData] = useState<CashFlowStatementResponse['cashFlowStatement'] | null>(null);
  const [compBsData, setCompBsData] = useState<ComparativeBalanceSheetResponse['comparativeBalanceSheet'] | null>(null);
  const [compIsData, setCompIsData] = useState<ComparativeIncomeStatementResponse['comparativeIncomeStatement'] | null>(null);
  const [agingData, setAgingData] = useState<AgingResponse['agingSummary'] | null>(null);

  // Inventory Valuation state
  const [inventoryFacility, setInventoryFacility] = useState<string>('');
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryItems, setInventoryItems] = useState<InventoryValuationItem[]>([]);
  const [inventorySummary, setInventorySummary] = useState<InventoryValuationSummary>({
    totalSkuCount: 0,
    totalQuantityOnHand: 0,
    totalInventoryValue: 0,
    itemCount: 0,
  });

  // Past Due Invoices state
  const [pastDueType, setPastDueType] = useState<'ALL' | 'SALES_INVOICE' | 'PURCHASE_INVOICE'>('ALL');
  const [pastDueInvoices, setPastDueInvoices] = useState<PastDueInvoiceItem[]>([]);
  const [pastDueSummary, setPastDueSummary] = useState<PastDueSummary>({
    totalPastDueCount: 0,
    totalPastDueAmount: 0,
    totalDueSoonCount: 0,
    totalDueSoonAmount: 0,
    buckets: {
      '1_30': 0,
      '31_60': 0,
      '61_90': 0,
      '90_plus': 0,
    },
  });

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
    } else if (activeTab === 'cash-flow') {
      api.getCashFlowStatement(filterPayload)
        .then(res => {
          setCashFlowData(res.cashFlowStatement);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Nakit akış verileri alınamadı.' : 'Could not load cash flow data.'));
          setLoading(false);
        });
    } else if (activeTab === 'comparative-bs') {
      api.getComparativeBalanceSheet({ organizationPartyId: organizationPartyId || 'Company', year1: compYear1, year2: compYear2 })
        .then(res => {
          setCompBsData(res.comparativeBalanceSheet);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Karşılaştırmalı bilanço alınamadı.' : 'Could not load comparative balance sheet.'));
          setLoading(false);
        });
    } else if (activeTab === 'comparative-is') {
      api.getComparativeIncomeStatement({ organizationPartyId: organizationPartyId || 'Company', year1: compYear1, year2: compYear2 })
        .then(res => {
          setCompIsData(res.comparativeIncomeStatement);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Karşılaştırmalı gelir tablosu alınamadı.' : 'Could not load comparative income statement.'));
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
    } else if (activeTab === 'inventory-valuation') {
      api.getInventoryValuationReport({
        facilityId: inventoryFacility || undefined,
        search: inventorySearch || undefined,
      })
        .then(res => {
          setInventoryItems(res.valuationList || []);
          if (res.summary) setInventorySummary(res.summary);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Stok değerleme raporu alınamadı.' : 'Could not load inventory valuation.'));
          setLoading(false);
        });
    } else if (activeTab === 'past-due') {
      api.getPastDueInvoicesReport(pastDueType === 'ALL' ? undefined : { invoiceTypeId: pastDueType })
        .then(res => {
          setPastDueInvoices(res.pastDueInvoices || []);
          if (res.summary) setPastDueSummary(res.summary);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message || (locale === 'tr' ? 'Vadesi geçmiş fatura raporu alınamadı.' : 'Could not load past due report.'));
          setLoading(false);
        });
    }
  }, [activeTab, organizationPartyId, selectedYear, agingType, compYear1, compYear2, inventoryFacility, inventorySearch, pastDueType, locale]);

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
          <div className="ds-tab-bar overflow-x-auto flex-nowrap">
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
              onClick={() => setActiveTab('cash-flow')}
              className={activeTab === 'cash-flow' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <RefreshCw size={16} /> {r.cashFlow}
            </button>
            <button
              onClick={() => setActiveTab('comparative-bs')}
              className={activeTab === 'comparative-bs' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <Layers size={16} /> {r.comparativeBalanceSheet}
            </button>
            <button
              onClick={() => setActiveTab('comparative-is')}
              className={activeTab === 'comparative-is' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <TrendingUp size={16} /> {r.comparativeIncomeStatement}
            </button>
            <button
              onClick={() => setActiveTab('aging')}
              className={activeTab === 'aging' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <Clock size={16} /> {r.aging}
            </button>
            <button
              onClick={() => setActiveTab('inventory-valuation')}
              className={activeTab === 'inventory-valuation' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <Boxes size={16} /> {r.inventoryValuation}
            </button>
            <button
              onClick={() => setActiveTab('past-due')}
              className={activeTab === 'past-due' ? 'ds-tab ds-tab-active' : 'ds-tab'}
            >
              <Clock size={16} /> {r.pastDue}
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

            {/* Comparative Year 1 & 2 Selectors */}
            {(activeTab === 'comparative-bs' || activeTab === 'comparative-is') ? (
              <div className="flex items-center gap-2">
                <select
                  value={compYear1}
                  onChange={(e) => setCompYear1(e.target.value)}
                  className="ds-select text-sm"
                >
                  {metadata.years.map(y => (
                    <option key={`p1-${y}`} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-xs text-slate-400">vs</span>
                <select
                  value={compYear2}
                  onChange={(e) => setCompYear2(e.target.value)}
                  className="ds-select text-sm"
                >
                  {metadata.years.map(y => (
                    <option key={`p2-${y}`} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            ) : (activeTab !== 'aging' && activeTab !== 'inventory-valuation' && activeTab !== 'past-due') ? (
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
            ) : null}

            {/* Inventory Valuation Filters */}
            {activeTab === 'inventory-valuation' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={common.search}
                  value={inventorySearch}
                  onChange={(e) => setInventorySearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadReport()}
                  className="ds-input text-sm w-44"
                />
                <input
                  type="text"
                  placeholder="Facility (Depo)..."
                  value={inventoryFacility}
                  onChange={(e) => setInventoryFacility(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadReport()}
                  className="ds-input text-sm w-36"
                />
              </div>
            )}

            {/* Past Due Filter */}
            {activeTab === 'past-due' && (
              <select
                value={pastDueType}
                onChange={(e) => setPastDueType(e.target.value as any)}
                className="ds-select text-sm"
              >
                <option value="ALL">{translations.commissionRun.pastDue.allTypes}</option>
                <option value="SALES_INVOICE">{translations.invoices.salesInvoice} (AR)</option>
                <option value="PURCHASE_INVOICE">{translations.invoices.purchaseInvoice} (AP)</option>
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

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 5: CASH FLOW STATEMENT                                      */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'cash-flow' && cashFlowData && (
            <div className="flex flex-col gap-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ds-stat-card border-l-4 border-l-blue-500">
                  <span className="ds-stat-label">{r.openingCash}</span>
                  <div className="ds-stat-value text-blue-400">
                    {formatCurrency(cashFlowData.summary.openingCash)}
                  </div>
                </div>
                <div className={`ds-stat-card border-l-4 ${cashFlowData.summary.netCashChange >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
                  <span className="ds-stat-label">{r.netCashChange}</span>
                  <div className={`ds-stat-value ${cashFlowData.summary.netCashChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(cashFlowData.summary.netCashChange)}
                  </div>
                </div>
                <div className="ds-stat-card border-l-4 border-l-purple-500">
                  <span className="ds-stat-label">{r.closingCash}</span>
                  <div className="ds-stat-value text-purple-400">
                    {formatCurrency(cashFlowData.summary.closingCash)}
                  </div>
                </div>
              </div>

              {/* Operating Activities */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    {r.operatingActivities}
                  </h3>
                  <span className="font-mono font-bold text-emerald-400">
                    {formatCurrency(cashFlowData.operatingActivities.netCash)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{coa.accountCode}</th>
                        <th className="ds-th">{coa.accountName}</th>
                        <th className="ds-th text-right">{common.amount}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlowData.operatingActivities.items.map((item, i) => (
                        <tr key={`op-${i}`} className="ds-tbody-row">
                          <td className="ds-td font-mono text-slate-400 text-xs">{item.code}</td>
                          <td className="ds-td text-white">{item.title}</td>
                          <td className={`ds-td text-right font-mono font-medium ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Investing Activities */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    {r.investingActivities}
                  </h3>
                  <span className="font-mono font-bold text-blue-400">
                    {formatCurrency(cashFlowData.investingActivities.netCash)}
                  </span>
                </div>
                {cashFlowData.investingActivities.items.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">{locale === 'tr' ? 'Bu dönemde yatırım hareketi bulunamadı.' : 'No investing activities recorded.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{coa.accountCode}</th>
                          <th className="ds-th">{coa.accountName}</th>
                          <th className="ds-th text-right">{common.amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowData.investingActivities.items.map((item, i) => (
                          <tr key={`inv-${i}`} className="ds-tbody-row">
                            <td className="ds-td font-mono text-slate-400 text-xs">{item.code}</td>
                            <td className="ds-td text-white">{item.title}</td>
                            <td className={`ds-td text-right font-mono font-medium ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financing Activities */}
              <div className="ds-card p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/60">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    {r.financingActivities}
                  </h3>
                  <span className="font-mono font-bold text-purple-400">
                    {formatCurrency(cashFlowData.financingActivities.netCash)}
                  </span>
                </div>
                {cashFlowData.financingActivities.items.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">{locale === 'tr' ? 'Bu dönemde finansman hareketi bulunamadı.' : 'No financing activities recorded.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ds-table">
                      <thead>
                        <tr className="ds-thead-row">
                          <th className="ds-th">{coa.accountCode}</th>
                          <th className="ds-th">{coa.accountName}</th>
                          <th className="ds-th text-right">{common.amount}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashFlowData.financingActivities.items.map((item, i) => (
                          <tr key={`fin-${i}`} className="ds-tbody-row">
                            <td className="ds-td font-mono text-slate-400 text-xs">{item.code}</td>
                            <td className="ds-td text-white">{item.title}</td>
                            <td className={`ds-td text-right font-mono font-medium ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 6: COMPARATIVE BALANCE SHEET                                */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'comparative-bs' && compBsData && (
            <div className="flex flex-col gap-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ds-stat-card border-l-4 border-l-emerald-500">
                  <span className="ds-stat-label">{r.totalAssets} ({compBsData.period1} vs {compBsData.period2})</span>
                  <div className="ds-stat-value text-emerald-400">
                    {formatCurrency(compBsData.assets.diffAmount)}
                    <span className="text-xs font-normal text-slate-400 ml-2">({compBsData.assets.diffPercent}%)</span>
                  </div>
                </div>
                <div className="ds-stat-card border-l-4 border-l-amber-500">
                  <span className="ds-stat-label">{r.totalLiabilities} ({compBsData.period1} vs {compBsData.period2})</span>
                  <div className="ds-stat-value text-amber-400">
                    {formatCurrency(compBsData.liabilities.diffAmount)}
                    <span className="text-xs font-normal text-slate-400 ml-2">({compBsData.liabilities.diffPercent}%)</span>
                  </div>
                </div>
                <div className="ds-stat-card border-l-4 border-l-blue-500">
                  <span className="ds-stat-label">{r.totalEquity} ({compBsData.period1} vs {compBsData.period2})</span>
                  <div className="ds-stat-value text-blue-400">
                    {formatCurrency(compBsData.equities.diffAmount)}
                    <span className="text-xs font-normal text-slate-400 ml-2">({compBsData.equities.diffPercent}%)</span>
                  </div>
                </div>
              </div>

              {/* Assets Comparison Table */}
              <div className="ds-card p-5 space-y-3">
                <h3 className="text-base font-bold text-white border-b border-slate-700/60 pb-2">
                  {r.assets}
                </h3>
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{coa.accountCode}</th>
                        <th className="ds-th">{coa.accountName}</th>
                        <th className="ds-th text-right">{compBsData.period1}</th>
                        <th className="ds-th text-right">{compBsData.period2}</th>
                        <th className="ds-th text-right">{r.difference}</th>
                        <th className="ds-th text-right">{r.percentChange}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compBsData.assets.rows.map((row) => (
                        <tr key={row.glAccountId} className="ds-tbody-row">
                          <td className="ds-td font-mono text-slate-400 text-xs">{row.accountCode}</td>
                          <td className="ds-td text-white">{row.accountName}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.balance1)}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.balance2)}</td>
                          <td className={`ds-td text-right font-mono font-medium ${row.diffAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(row.diffAmount)}
                          </td>
                          <td className={`ds-td text-right font-mono text-xs ${row.diffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.diffPercent > 0 ? `+${row.diffPercent}%` : `${row.diffPercent}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Liabilities Comparison Table */}
              <div className="ds-card p-5 space-y-3">
                <h3 className="text-base font-bold text-white border-b border-slate-700/60 pb-2">
                  {r.liabilities}
                </h3>
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{coa.accountCode}</th>
                        <th className="ds-th">{coa.accountName}</th>
                        <th className="ds-th text-right">{compBsData.period1}</th>
                        <th className="ds-th text-right">{compBsData.period2}</th>
                        <th className="ds-th text-right">{r.difference}</th>
                        <th className="ds-th text-right">{r.percentChange}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compBsData.liabilities.rows.map((row) => (
                        <tr key={row.glAccountId} className="ds-tbody-row">
                          <td className="ds-td font-mono text-slate-400 text-xs">{row.accountCode}</td>
                          <td className="ds-td text-white">{row.accountName}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.balance1)}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.balance2)}</td>
                          <td className={`ds-td text-right font-mono font-medium ${row.diffAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(row.diffAmount)}
                          </td>
                          <td className={`ds-td text-right font-mono text-xs ${row.diffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.diffPercent > 0 ? `+${row.diffPercent}%` : `${row.diffPercent}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TAB 7: COMPARATIVE INCOME STATEMENT                             */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'comparative-is' && compIsData && (
            <div className="flex flex-col gap-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ds-stat-card border-l-4 border-l-emerald-500">
                  <span className="ds-stat-label">{r.revenue} ({compIsData.period1} vs {compIsData.period2})</span>
                  <div className="ds-stat-value text-emerald-400">
                    {formatCurrency(compIsData.revenues.diffAmount)}
                  </div>
                </div>
                <div className="ds-stat-card border-l-4 border-l-rose-500">
                  <span className="ds-stat-label">{r.expenses} ({compIsData.period1} vs {compIsData.period2})</span>
                  <div className="ds-stat-value text-rose-400">
                    {formatCurrency(compIsData.expenses.diffAmount)}
                  </div>
                </div>
                <div className="ds-stat-card border-l-4 border-l-purple-500">
                  <span className="ds-stat-label">{r.netIncome} ({compIsData.period1} vs {compIsData.period2})</span>
                  <div className="ds-stat-value text-purple-400">
                    {formatCurrency(compIsData.netIncome.diffAmount)}
                    <span className="text-xs font-normal text-slate-400 ml-2">({compIsData.netIncome.diffPercent}%)</span>
                  </div>
                </div>
              </div>

              {/* Revenues Comparison */}
              <div className="ds-card p-5 space-y-3">
                <h3 className="text-base font-bold text-white border-b border-slate-700/60 pb-2">
                  {r.revenue}
                </h3>
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{coa.accountCode}</th>
                        <th className="ds-th">{coa.accountName}</th>
                        <th className="ds-th text-right">{compIsData.period1}</th>
                        <th className="ds-th text-right">{compIsData.period2}</th>
                        <th className="ds-th text-right">{r.difference}</th>
                        <th className="ds-th text-right">{r.percentChange}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compIsData.revenues.rows.map((row) => (
                        <tr key={row.glAccountId} className="ds-tbody-row">
                          <td className="ds-td font-mono text-slate-400 text-xs">{row.accountCode}</td>
                          <td className="ds-td text-white">{row.accountName}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.amount1)}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.amount2)}</td>
                          <td className={`ds-td text-right font-mono font-medium ${row.diffAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(row.diffAmount)}
                          </td>
                          <td className={`ds-td text-right font-mono text-xs ${row.diffPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {row.diffPercent > 0 ? `+${row.diffPercent}%` : `${row.diffPercent}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expenses Comparison */}
              <div className="ds-card p-5 space-y-3">
                <h3 className="text-base font-bold text-white border-b border-slate-700/60 pb-2">
                  {r.expenses}
                </h3>
                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr className="ds-thead-row">
                        <th className="ds-th">{coa.accountCode}</th>
                        <th className="ds-th">{coa.accountName}</th>
                        <th className="ds-th text-right">{compIsData.period1}</th>
                        <th className="ds-th text-right">{compIsData.period2}</th>
                        <th className="ds-th text-right">{r.difference}</th>
                        <th className="ds-th text-right">{r.percentChange}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compIsData.expenses.rows.map((row) => (
                        <tr key={row.glAccountId} className="ds-tbody-row">
                          <td className="ds-td font-mono text-slate-400 text-xs">{row.accountCode}</td>
                          <td className="ds-td text-white">{row.accountName}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.amount1)}</td>
                          <td className="ds-td text-right font-mono">{formatCurrency(row.amount2)}</td>
                          <td className={`ds-td text-right font-mono font-medium ${row.diffAmount >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {formatCurrency(row.diffAmount)}
                          </td>
                          <td className={`ds-td text-right font-mono text-xs ${row.diffPercent >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {row.diffPercent > 0 ? `+${row.diffPercent}%` : `${row.diffPercent}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: INVENTORY VALUATION                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'inventory-valuation' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="ds-stat-card border-l-4 border-l-indigo-500">
                  <p className="ds-stat-label">{translations.commissionRun.inventory.totalSkus}</p>
                  <p className="ds-stat-value text-indigo-400 mt-1">{inventorySummary.totalSkuCount}</p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-blue-500">
                  <p className="ds-stat-label">{translations.commissionRun.inventory.totalQty}</p>
                  <p className="ds-stat-value text-blue-400 mt-1">
                    {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(inventorySummary.totalQuantityOnHand)}
                  </p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-emerald-500">
                  <p className="ds-stat-label">{translations.commissionRun.inventory.totalValuation}</p>
                  <p className="ds-stat-value text-emerald-400 mt-1">
                    {formatCurrency(inventorySummary.totalInventoryValue)}
                  </p>
                </div>
              </div>

              <div className="ds-card overflow-hidden">
                {inventoryItems.length === 0 ? (
                  <div className="ds-empty py-16 text-center text-slate-500">
                    <Boxes className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
                    <p className="text-base font-medium">{translations.commissionRun.inventory.noInventory}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ds-table w-full">
                      <thead>
                        <tr className="ds-thead-row text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                          <th className="ds-th py-3.5 px-4">{translations.commissionRun.inventory.productId}</th>
                          <th className="ds-th py-3.5 px-4">{translations.commissionRun.inventory.productName}</th>
                          <th className="ds-th py-3.5 px-4">{translations.commissionRun.inventory.warehouse}</th>
                          <th className="ds-th py-3.5 px-4 text-right">{translations.commissionRun.inventory.quantity}</th>
                          <th className="ds-th py-3.5 px-4 text-right">{translations.commissionRun.inventory.unitCost}</th>
                          <th className="ds-th py-3.5 px-4 text-right">{translations.commissionRun.inventory.valuation}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {inventoryItems.map((item, idx) => (
                          <tr key={`${item.productId}-${item.facilityId}-${idx}`} className="ds-tbody-row hover:bg-slate-800/30 transition-colors">
                            <td className="ds-td py-3 px-4 font-mono font-semibold text-indigo-400">{item.productId}</td>
                            <td className="ds-td py-3 px-4 text-white font-medium">{item.productName || item.productId}</td>
                            <td className="ds-td py-3 px-4 text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-xs">
                                {item.facilityName || item.facilityId}
                              </span>
                            </td>
                            <td className="ds-td py-3 px-4 text-right font-medium text-slate-200">
                              {new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US').format(item.quantityOnHand)}
                            </td>
                            <td className="ds-td py-3 px-4 text-right text-slate-300">
                              {formatCurrency(item.unitCost, item.currencyUomId)}
                            </td>
                            <td className="ds-td py-3 px-4 text-right font-bold text-emerald-400">
                              {formatCurrency(item.totalValuation, item.currencyUomId)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: PAST DUE INVOICES                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'past-due' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="ds-stat-card border-l-4 border-l-red-500">
                  <p className="ds-stat-label text-red-400 font-semibold">{translations.commissionRun.pastDue.totalPastDue}</p>
                  <p className="ds-stat-value text-red-400 mt-1 text-base sm:text-lg">
                    {formatCurrency(pastDueSummary.totalPastDueAmount)}
                  </p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-amber-500">
                  <p className="ds-stat-label text-amber-400 font-semibold">{translations.commissionRun.pastDue.totalDueSoon}</p>
                  <p className="ds-stat-value text-amber-400 mt-1 text-base sm:text-lg">
                    {formatCurrency(pastDueSummary.totalDueSoonAmount)}
                  </p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-yellow-500">
                  <p className="ds-stat-label">{translations.commissionRun.pastDue.aging1_30}</p>
                  <p className="ds-stat-value text-yellow-300 mt-1 text-base sm:text-lg">
                    {formatCurrency(pastDueSummary.buckets['1_30'])}
                  </p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-orange-500">
                  <p className="ds-stat-label">{translations.commissionRun.pastDue.aging31_60}</p>
                  <p className="ds-stat-value text-orange-400 mt-1 text-base sm:text-lg">
                    {formatCurrency(pastDueSummary.buckets['31_60'])}
                  </p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-red-400">
                  <p className="ds-stat-label">{translations.commissionRun.pastDue.aging61_90}</p>
                  <p className="ds-stat-value text-red-400 mt-1 text-base sm:text-lg">
                    {formatCurrency(pastDueSummary.buckets['61_90'])}
                  </p>
                </div>
                <div className="ds-stat-card border-l-4 border-l-rose-600">
                  <p className="ds-stat-label">{translations.commissionRun.pastDue.aging90_plus}</p>
                  <p className="ds-stat-value text-rose-500 mt-1 text-base sm:text-lg">
                    {formatCurrency(pastDueSummary.buckets['90_plus'])}
                  </p>
                </div>
              </div>

              <div className="ds-card overflow-hidden">
                {pastDueInvoices.length === 0 ? (
                  <div className="ds-empty py-16 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                    <p className="text-base font-medium">{translations.commissionRun.pastDue.noPastDue}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ds-table w-full">
                      <thead>
                        <tr className="ds-thead-row text-left text-xs uppercase text-slate-400 border-b border-slate-800">
                          <th className="ds-th py-3.5 px-4">{translations.invoices.invoiceId}</th>
                          <th className="ds-th py-3.5 px-4">{translations.commissionRun.pastDue.invoiceType}</th>
                          <th className="ds-th py-3.5 px-4">{translations.commissionRun.pastDue.partner}</th>
                          <th className="ds-th py-3.5 px-4">{translations.commissionRun.pastDue.dueDate}</th>
                          <th className="ds-th py-3.5 px-4 text-center">{translations.commissionRun.pastDue.daysOverdue}</th>
                          <th className="ds-th py-3.5 px-4 text-right">{translations.commissionRun.pastDue.openAmount}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-sm">
                        {pastDueInvoices.map((inv) => (
                          <tr key={inv.invoiceId} className="ds-tbody-row hover:bg-slate-800/30 transition-colors">
                            <td className="ds-td py-3 px-4 font-mono font-semibold text-indigo-400">{inv.invoiceId}</td>
                            <td className="ds-td py-3 px-4">
                              <span
                                className={`ds-badge ${
                                  inv.invoiceTypeId === 'SALES_INVOICE' ? 'ds-badge-blue' : 'ds-badge-yellow'
                                }`}
                              >
                                {inv.invoiceTypeId === 'SALES_INVOICE' ? 'AR' : 'AP'}
                              </span>
                            </td>
                            <td className="ds-td py-3 px-4 text-white">
                              <span className="font-medium">{inv.partnerName || inv.partnerPartyId}</span>
                            </td>
                            <td className="ds-td py-3 px-4 text-slate-300">
                              {inv.dueDate ? inv.dueDate.substring(0, 10) : '-'}
                            </td>
                            <td className="ds-td py-3 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  inv.daysOverdue > 60
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : inv.daysOverdue > 30
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                +{inv.daysOverdue} d
                              </span>
                            </td>
                            <td className="ds-td py-3 px-4 text-right font-bold text-rose-400">
                              {formatCurrency(inv.outstandingAmount, inv.currencyUomId)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FinancialReports;
