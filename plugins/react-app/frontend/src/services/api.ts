/**
 * OFBiz React-App API Service Client
 * Handles communication with OFBiz ControlServlet JSON endpoints
 */

export interface InvoiceItem {
  invoiceId: string;
  invoiceItemSeqId: string;
  invoiceItemTypeId: string;
  productId?: string;
  description: string;
  quantity: number;
  amount: number;
  itemTotal: number;
}

export interface InvoiceStatusHistory {
  statusId: string;
  statusDate: string;
  changeByUserLoginId?: string;
}

export interface PaymentApplication {
  paymentApplicationId: string;
  paymentId: string;
  amountApplied: number;
  billingAccountId?: string;
}

export interface InvoiceTotals {
  total: number;
  taxTotal: number;
  subTotal: number;
  appliedAmount: number;
  outstandingAmount: number;
}

export interface InvoiceHeader {
  invoiceId: string;
  invoiceTypeId: string;
  partyIdFrom: string;
  partyIdTo: string;
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  statusId: string;
  description?: string;
  currencyUomId: string;
  referenceNumber?: string;
}

export interface InvoiceDetailResponse {
  invoice: InvoiceHeader;
  items: InvoiceItem[];
  statusHistory: InvoiceStatusHistory[];
  paymentsApplied: PaymentApplication[];
  totals: InvoiceTotals;
}

export interface InvoiceListItem {
  invoiceId: string;
  invoiceTypeId: string;
  partyIdFrom: string;
  partyIdTo: string;
  invoiceDate: string;
  dueDate: string;
  statusId: string;
  description?: string;
  currencyUomId: string;
  total: number;
  outstandingAmount: number;
}

export interface InvoicesResponse {
  invoices: InvoiceListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface InvoiceMetadataResponse {
  metadata: {
    invoiceTypes: { invoiceTypeId: string; description: string }[];
    invoiceItemTypes: { invoiceItemTypeId: string; description: string }[];
    statusList: { statusId: string; description: string }[];
    parties: { partyId: string; name: string }[];
    currencies: { uomId: string; description: string }[];
  };
}

export interface CreateInvoicePayload {
  invoiceTypeId?: string;
  partyIdFrom: string;
  partyIdTo: string;
  invoiceDate?: string;
  dueDate?: string;
  currencyUomId?: string;
  description?: string;
  referenceNumber?: string;
}

export interface UpdateInvoicePayload {
  invoiceId: string;
  description?: string;
  dueDate?: string;
  invoiceDate?: string;
  currencyUomId?: string;
  referenceNumber?: string;
}

export interface InvoiceItemPayload {
  invoiceId: string;
  invoiceItemSeqId?: string;
  invoiceItemTypeId?: string;
  productId?: string;
  description?: string;
  quantity?: number;
  amount?: number;
}

// Payment Interfaces
export interface PaymentListItem {
  paymentId: string;
  paymentTypeId: string;
  paymentTypeDesc: string;
  paymentMethodTypeId?: string;
  paymentMethodTypeDesc?: string;
  partyIdFrom: string;
  partyNameFrom: string;
  partyIdTo: string;
  partyNameTo: string;
  statusId: string;
  statusDesc: string;
  amount: number;
  appliedAmount: number;
  openAmount: number;
  currencyUomId: string;
  effectiveDate: string;
  paymentRefNum?: string;
  comments?: string;
}

export interface PaymentsResponse {
  payments: PaymentListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface PaymentApplicationItem {
  paymentApplicationId: string;
  paymentId: string;
  toPaymentId?: string;
  invoiceId?: string;
  invoiceItemSeqId?: string;
  billingAccountId?: string;
  amountApplied: number;
  invoiceDate?: string;
  invoiceStatusId?: string;
  invoiceDescription?: string;
  invoiceTotal?: number;
  invoiceOutstanding?: number;
}

export interface PaymentHeader {
  paymentId: string;
  paymentTypeId: string;
  paymentTypeDesc: string;
  paymentMethodTypeId?: string;
  paymentMethodTypeDesc?: string;
  partyIdFrom: string;
  partyNameFrom: string;
  partyIdTo: string;
  partyNameTo: string;
  statusId: string;
  statusDesc: string;
  amount: number;
  currencyUomId: string;
  effectiveDate: string;
  paymentRefNum?: string;
  comments?: string;
  paymentPreferenceId?: string;
}

export interface PaymentDetailResponse {
  payment: PaymentHeader;
  appliedAmount: number;
  openAmount: number;
  applications: PaymentApplicationItem[];
  statusHistory: { statusId: string; statusDesc: string; statusDate: string; changeByUserLoginId?: string }[];
}

export interface PaymentMetadataResponse {
  metadata: {
    paymentTypes: { paymentTypeId: string; description: string }[];
    paymentMethodTypes: { paymentMethodTypeId: string; description: string }[];
    statusList: { statusId: string; description: string }[];
    parties: { partyId: string; name: string }[];
    currencies: { uomId: string; description: string }[];
  };
}

export interface OpenInvoiceItem {
  invoiceId: string;
  invoiceTypeId: string;
  invoiceDate: string;
  dueDate: string;
  statusId: string;
  description?: string;
  currencyUomId: string;
  total: number;
  outstandingAmount: number;
}

export interface CreatePaymentPayload {
  paymentTypeId: string;
  partyIdFrom: string;
  partyIdTo: string;
  amount: number;
  paymentMethodTypeId?: string;
  paymentMethodId?: string;
  currencyUomId?: string;
  effectiveDate?: string;
  paymentRefNum?: string;
  comments?: string;
  statusId?: string;
}

export interface UpdatePaymentPayload {
  paymentId: string;
  amount?: number;
  paymentMethodTypeId?: string;
  currencyUomId?: string;
  effectiveDate?: string;
  paymentRefNum?: string;
  comments?: string;
}

export interface CreatePaymentApplicationPayload {
  paymentId: string;
  invoiceId?: string;
  billingAccountId?: string;
  amountApplied?: number;
}

// Financial Reports Interfaces
export interface TrialBalanceAccount {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  glAccountClassId: string;
  glAccountTypeId: string;
  debits: number;
  credits: number;
  balance: number;
  debitCreditFlag: string;
}

export interface TrialBalanceResponse {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  organizationPartyId: string;
}

export interface BalanceSheetResponse {
  balanceSheet: {
    asOfDate: string;
    organizationPartyId: string;
    assets: {
      currentAssets: { glAccountId: string; accountName: string; balance: number }[];
      totalCurrentAssets: number;
      longTermAssets: { glAccountId: string; accountName: string; balance: number }[];
      totalLongTermAssets: number;
      totalAssets: number;
    };
    liabilities: {
      currentLiabilities: { glAccountId: string; accountName: string; balance: number }[];
      totalCurrentLiabilities: number;
      longTermLiabilities: { glAccountId: string; accountName: string; balance: number }[];
      totalLongTermLiabilities: number;
      totalLiabilities: number;
    };
    equity: {
      equityAccounts: { glAccountId: string; accountName: string; balance: number }[];
      totalEquity: number;
    };
    totalLiabilitiesAndEquity: number;
    difference: number;
    isBalanced: boolean;
  };
}

export interface IncomeStatementResponse {
  incomeStatement: {
    organizationPartyId: string;
    period: string;
    revenues: { glAccountId: string; accountName: string; balance: number }[];
    totalRevenue: number;
    cogs: { glAccountId: string; accountName: string; balance: number }[];
    totalCogs: number;
    grossProfit: number;
    expenses: { glAccountId: string; accountName: string; balance: number }[];
    totalExpenses: number;
    operatingIncome: number;
    netIncome: number;
  };
}

export interface AgingRow {
  partyId: string;
  partyName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  daysOver90: number;
  total: number;
}

export interface AgingResponse {
  agingSummary: {
    type: string;
    bucketTotals: {
      current: number;
      days1_30: number;
      days31_60: number;
      days61_90: number;
      daysOver90: number;
      grandTotal: number;
    };
    rows: AgingRow[];
  };
}

export interface ReportMetadataResponse {
  metadata: {
    organizations: { partyId: string; name: string }[];
    years: string[];
    currencies: { uomId: string; description: string }[];
  };
}

// General Ledger & Chart of Accounts Interfaces
export interface GlAccountItem {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  glAccountTypeId: string;
  glAccountTypeDesc: string;
  glAccountClassId: string;
  glAccountClassDesc: string;
  parentGlAccountId: string;
  isAssigned: boolean;
}

export interface GlAccountsResponse {
  accounts: GlAccountItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface GlAccountDetail {
  glAccountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  glAccountTypeId: string;
  glAccountTypeDesc: string;
  glAccountClassId: string;
  glAccountClassDesc: string;
  parentGlAccountId: string;
  parentAccountName: string;
  glResourceTypeId: string;
  isAssigned: boolean;
  totalDebits: number;
  totalCredits: number;
  balance: number;
  normalSide: string;
}

export interface GlAccountEntryItem {
  acctgTransId: string;
  acctgTransEntrySeqId: string;
  transactionDate: string;
  acctgTransTypeId: string;
  transTypeDescription: string;
  debitCreditFlag: 'D' | 'C';
  amount: number;
  currencyUomId: string;
  description: string;
  partyId?: string;
  partyName?: string;
}

export interface GlAccountDetailResponse {
  account: GlAccountDetail;
  recentEntries: GlAccountEntryItem[];
}

export interface CreateGlAccountPayload {
  glAccountId?: string;
  accountCode: string;
  accountName: string;
  glAccountClassId: string;
  glAccountTypeId?: string;
  glResourceTypeId?: string;
  parentGlAccountId?: string;
  description?: string;
  organizationPartyId?: string;
}

export interface UpdateGlAccountPayload {
  glAccountId: string;
  accountName?: string;
  description?: string;
  glAccountClassId?: string;
  glAccountTypeId?: string;
  glResourceTypeId?: string;
  parentGlAccountId?: string;
  organizationPartyId?: string;
  isAssigned?: string;
}

export interface AcctgTransListItem {
  acctgTransId: string;
  acctgTransTypeId: string;
  acctgTransTypeDesc: string;
  glFiscalTypeId: string;
  glFiscalTypeDesc: string;
  transactionDate: string;
  isPosted: string;
  postedDate?: string;
  description: string;
  voucherRef?: string;
  invoiceId?: string;
  paymentId?: string;
  totalDebit: number;
  totalCredit: number;
  entryCount: number;
}

export interface AcctgTransactionsResponse {
  transactions: AcctgTransListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface AcctgTransDetailHeader {
  acctgTransId: string;
  acctgTransTypeId: string;
  acctgTransTypeDesc: string;
  glFiscalTypeId: string;
  glFiscalTypeDesc: string;
  transactionDate: string;
  isPosted: string;
  postedDate?: string;
  description: string;
  voucherRef?: string;
  invoiceId?: string;
  paymentId?: string;
  createdByUserLogin?: string;
  lastModifiedByUserLogin?: string;
}

export interface AcctgTransLineItem {
  acctgTransEntrySeqId: string;
  glAccountId: string;
  accountCode: string;
  accountName: string;
  debitCreditFlag: 'D' | 'C';
  amount: number;
  currencyUomId: string;
  description: string;
  partyId?: string;
  partyName?: string;
}

export interface AcctgTransDetailResponse {
  transaction: AcctgTransDetailHeader;
  entries: AcctgTransLineItem[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

export interface JournalEntryLinePayload {
  glAccountId: string;
  debitCreditFlag: 'D' | 'C';
  amount: number;
  description?: string;
  partyId?: string;
  currencyUomId?: string;
}

export interface CreateJournalEntryPayload {
  transactionDate?: string;
  acctgTransTypeId?: string;
  glFiscalTypeId?: string;
  description?: string;
  voucherRef?: string;
  isPosted?: string;
  organizationPartyId?: string;
  entries: JournalEntryLinePayload[];
}

export interface GlMetadataResponse {
  metadata: {
    glAccountClasses: { glAccountClassId: string; description: string; parentClassId: string }[];
    glAccountTypes: { glAccountTypeId: string; description: string }[];
    glResourceTypes: { glResourceTypeId: string; description: string }[];
    acctgTransTypes: { acctgTransTypeId: string; description: string }[];
    glFiscalTypes: { glFiscalTypeId: string; description: string }[];
    organizations: { partyId: string; name: string }[];
    accounts: { glAccountId: string; accountCode: string; accountName: string; glAccountClassId: string }[];
  };
}

// Financial Accounts (FinAccount & Bank/Cash) Interfaces
export interface FinAccountItem {
  finAccountId: string;
  finAccountName: string;
  finAccountCode: string;
  finAccountTypeId: string;
  finAccountTypeDesc: string;
  statusId: string;
  statusDesc: string;
  currencyUomId: string;
  organizationPartyId: string;
  ownerPartyId: string;
  postToGlAccountId: string;
  postToGlAccountName: string;
  actualBalance: number;
  availableBalance: number;
  fromDate: string;
  thruDate: string;
  transactionCount: number;
}

export interface FinAccountsResponse {
  accounts: FinAccountItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  totalActiveBalance: number;
}

export interface FinAccountDetail extends FinAccountItem {
  ownerPartyName?: string;
  isRefundable: string;
}

export interface FinAccountTransItem {
  finAccountTransId: string;
  finAccountId: string;
  finAccountName?: string;
  finAccountTransTypeId: string;
  finAccountTransTypeDesc: string;
  partyId: string;
  partyName: string;
  glReconciliationId: string;
  transactionDate: string;
  entryDate: string;
  amount: number;
  paymentId?: string;
  orderId?: string;
  comments?: string;
  statusId: string;
  statusDesc: string;
}

export interface FinAccountDetailResponse {
  account: FinAccountDetail;
  transactions: FinAccountTransItem[];
  reconciliations: any[];
}

export interface FinAccountTransactionsResponse {
  transactions: FinAccountTransItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface CreateFinAccountPayload {
  finAccountId?: string;
  finAccountName: string;
  finAccountTypeId: string;
  finAccountCode?: string;
  currencyUomId?: string;
  organizationPartyId?: string;
  ownerPartyId?: string;
  postToGlAccountId?: string;
  statusId?: string;
  initialBalance?: number;
}

export interface UpdateFinAccountPayload {
  finAccountId: string;
  finAccountName?: string;
  finAccountCode?: string;
  finAccountTypeId?: string;
  statusId?: string;
  currencyUomId?: string;
  postToGlAccountId?: string;
}

export interface CreateFinAccountTransPayload {
  finAccountId: string;
  finAccountTransTypeId: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT';
  amount: number;
  transactionDate?: string;
  partyId?: string;
  comments?: string;
  statusId?: string;
  paymentId?: string;
  orderId?: string;
}

export interface TransferFinAccountsPayload {
  fromFinAccountId: string;
  toFinAccountId: string;
  amount: number;
  transactionDate?: string;
  comments?: string;
}

export interface GlReconciliationItem {
  glReconciliationId: string;
  glReconciliationName: string;
  glAccountId: string;
  glAccountName: string;
  statusId: string;
  statusDesc: string;
  reconciledBalance: number;
  openingBalance: number;
  reconciledDate: string;
  description: string;
  transactionCount: number;
}

export interface GlReconciliationsResponse {
  reconciliations: GlReconciliationItem[];
}

export interface GlReconciliationDetailResponse {
  reconciliation: {
    glReconciliationId: string;
    glReconciliationName: string;
    glAccountId: string;
    glAccountName: string;
    statusId: string;
    statusDesc: string;
    reconciledBalance: number;
    openingBalance: number;
    reconciledDate: string;
    description: string;
    totalLinkedAmount: number;
  };
  linkedTransactions: FinAccountTransItem[];
  unlinkedTransactions: FinAccountTransItem[];
}

export interface CreateGlReconciliationPayload {
  glReconciliationName: string;
  glAccountId: string;
  reconciledBalance: number;
  openingBalance?: number;
  reconciledDate?: string;
  description?: string;
  organizationPartyId?: string;
}

export interface ReconcileTransactionsPayload {
  glReconciliationId: string;
  finAccountTransIds: string[];
  action?: 'LINK' | 'UNLINK';
  markReconciled?: 'Y' | 'N';
}

export interface FinAccountMetadataResponse {
  metadata: {
    finAccountTypes: { finAccountTypeId: string; description: string; isRefundable: string }[];
    finAccountTransTypes: { finAccountTransTypeId: string; description: string }[];
    finAccountStatuses: { statusId: string; description: string }[];
    glAccounts: { glAccountId: string; accountCode: string; accountName: string; glAccountClassId: string }[];
    currencies: { uomId: string; description: string }[];
    organizations: { partyId: string; name: string }[];
  };
}

// ==========================================
// PHASE 5: ADVANCED ACCOUNTING TYPES
// ==========================================

export interface AdvancedAccountingMetadata {
  fixedAssetTypes: { fixedAssetTypeId: string; description: string }[];
  budgetTypes: { budgetTypeId: string; description: string }[];
  budgetItemTypes: { budgetItemTypeId: string; description: string }[];
  customTimePeriods: {
    customTimePeriodId: string;
    periodTypeId: string;
    periodNum: number;
    periodName: string;
    fromDate: string;
    thruDate: string;
  }[];
  agreementTypes: { agreementTypeId: string; description: string }[];
  currencies: { uomId: string; description: string }[];
  parties: { partyId: string; partyName: string }[];
}

export interface AdvancedAccountingMetadataResponse {
  metadata: AdvancedAccountingMetadata;
}

// 1. Billing Accounts
export interface BillingAccountItem {
  billingAccountId: string;
  accountLimit: number;
  accountBalance: number;
  availableBalance: number;
  accountCurrencyUomId: string;
  description: string;
  fromDate: string;
  thruDate: string;
  partyId: string;
  customerName: string;
  roleTypeId: string;
  invoiceCount: number;
  paymentCount: number;
}

export interface BillingAccountsResponse {
  accounts: BillingAccountItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  totalLimit: number;
  totalAvailable: number;
  totalBilled: number;
}

export interface BillingAccountRoleItem {
  partyId: string;
  partyName: string;
  roleTypeId: string;
  fromDate: string;
  thruDate: string;
}

export interface BillingAccountInvoiceItem {
  invoiceId: string;
  invoiceTypeId: string;
  invoiceDate: string;
  statusId: string;
  total: number;
  currencyUomId: string;
  description: string;
}

export interface BillingAccountPaymentItem {
  paymentApplicationId: string;
  paymentId: string;
  invoiceId: string;
  amountApplied: number;
}

export interface BillingAccountTermItem {
  billingAccountTermId: string;
  termTypeId: string;
  termValue: number;
  termDays: number;
  description: string;
}

export interface BillingAccountDetailResponse {
  account: {
    billingAccountId: string;
    accountLimit: number;
    accountBalance: number;
    availableBalance: number;
    netAccountBalance: number;
    accountCurrencyUomId: string;
    description: string;
    fromDate: string;
    thruDate: string;
  };
  roles: BillingAccountRoleItem[];
  invoices: BillingAccountInvoiceItem[];
  payments: BillingAccountPaymentItem[];
  terms: BillingAccountTermItem[];
}

export interface CreateBillingAccountPayload {
  accountLimit: number;
  accountCurrencyUomId?: string;
  description?: string;
  partyId?: string;
  roleTypeId?: string;
  fromDate?: string;
  thruDate?: string;
}

export interface UpdateBillingAccountPayload {
  billingAccountId: string;
  accountLimit?: number;
  description?: string;
  thruDate?: string;
}

// 2. Fixed Assets
export interface FixedAssetItem {
  fixedAssetId: string;
  fixedAssetName: string;
  fixedAssetTypeId: string;
  fixedAssetTypeDesc: string;
  serialNumber?: string;
  purchaseCost: number;
  purchaseCostUomId: string;
  salvageValue: number;
  depreciation: number;
  netBookValue: number;
  dateAcquired?: string;
  expectedEndOfLife?: string;
  actualEndOfLife?: string;
}

export interface FixedAssetsResponse {
  assets: FixedAssetItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  totalPurchaseCost: number;
  totalDepreciation: number;
  totalNetBookValue: number;
}

export interface FixedAssetDepScheduleItem {
  yearNum: number;
  calendarYear: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  endingBookValue: number;
}

export interface FixedAssetDetailResponse {
  asset: FixedAssetItem & {
    dateLastServiced?: string;
    dateNextService?: string;
  };
  maintenances: {
    maintHistSeqId: string;
    statusId: string;
    maintenanceDate: string;
    comments: string;
  }[];
  depreciationSchedule: FixedAssetDepScheduleItem[];
}

export interface CreateFixedAssetPayload {
  fixedAssetId?: string;
  fixedAssetName: string;
  fixedAssetTypeId: string;
  purchaseCost?: number;
  purchaseCostUomId?: string;
  salvageValue?: number;
  dateAcquired?: string;
  expectedEndOfLife?: string;
  serialNumber?: string;
}

export interface UpdateFixedAssetPayload {
  fixedAssetId: string;
  fixedAssetName?: string;
  fixedAssetTypeId?: string;
  purchaseCost?: number;
  salvageValue?: number;
  depreciation?: number;
  expectedEndOfLife?: string;
  serialNumber?: string;
}

// 3. Budgets
export interface BudgetItemSummary {
  budgetId: string;
  budgetTypeId: string;
  budgetTypeDesc: string;
  customTimePeriodId: string;
  periodDesc: string;
  comments: string;
  statusId: string;
  statusDesc: string;
  totalAmount: number;
  itemCount: number;
}

export interface BudgetsResponse {
  budgets: BudgetItemSummary[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  totalBudgetedAmount: number;
}

export interface BudgetItemLine {
  budgetId: string;
  budgetItemSeqId: string;
  budgetItemTypeId: string;
  budgetItemTypeDesc: string;
  amount: number;
  purpose: string;
  justification: string;
}

export interface BudgetStatusHistoryItem {
  statusId: string;
  statusDesc: string;
  statusDate: string;
  comments: string;
  changeByUserLoginId: string;
}

export interface BudgetDetailResponse {
  budget: BudgetItemSummary;
  items: BudgetItemLine[];
  statuses: BudgetStatusHistoryItem[];
}

export interface CreateBudgetPayload {
  budgetId?: string;
  budgetTypeId: string;
  customTimePeriodId?: string;
  comments?: string;
}

export interface CreateBudgetItemPayload {
  budgetId: string;
  budgetItemTypeId?: string;
  amount: number;
  purpose?: string;
  justification?: string;
}

// 4. Agreements
export interface AgreementSummary {
  agreementId: string;
  agreementTypeId: string;
  agreementTypeDesc: string;
  partyIdFrom: string;
  partyFromDesc: string;
  partyIdTo: string;
  partyToDesc: string;
  description: string;
  statusId: string;
  agreementDate: string;
  fromDate: string;
  thruDate: string;
}

export interface AgreementsResponse {
  agreements: AgreementSummary[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface AgreementDetailResponse {
  agreement: AgreementSummary & { textData?: string };
  terms: {
    agreementTermId: string;
    termTypeId: string;
    termValue: number;
    termDays: number;
    description: string;
  }[];
  items: {
    agreementItemSeqId: string;
    agreementItemTypeId: string;
    currencyUomId: string;
    agreementText: string;
  }[];
}

export interface CreateAgreementPayload {
  agreementId?: string;
  agreementTypeId?: string;
  partyIdFrom?: string;
  partyIdTo: string;
  agreementDate?: string;
  fromDate?: string;
  thruDate?: string;
  description?: string;
  textData?: string;
}

export interface UpdateAgreementPayload {
  agreementId: string;
  description?: string;
  textData?: string;
  statusId?: string;
  thruDate?: string;
}

// ==========================================
// FAZ 6: TAX AND GL MAPPINGS INTERFACES
// ==========================================

export interface TaxAuthorityItem {
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  geoName: string;
  partyName: string;
  requireTaxIdForExemption: string;
  taxIdFormatPattern: string;
  includeTaxInPrice: string;
  rateCount: number;
  glAccountCount: number;
}

export interface TaxAuthoritiesResponse {
  taxAuthorities: TaxAuthorityItem[];
  totalCount: number;
}

export interface TaxRateItem {
  taxAuthorityRateSeqId: string;
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  geoName: string;
  partyName: string;
  taxAuthorityRateTypeId: string;
  taxAuthorityRateTypeDesc: string;
  taxPercentage: number;
  description: string;
  taxShipping: string;
  fromDate: string;
  thruDate: string;
  productCategoryId: string;
  productCategoryName: string;
}

export interface TaxRatesResponse {
  taxRates: TaxRateItem[];
  totalCount: number;
}

export interface TaxAuthorityGlAccountItem {
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface InvoiceItemTypeGlAccountItem {
  invoiceItemTypeId: string;
  itemTypeDesc: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface PaymentMethodTypeGlAccountItem {
  paymentMethodTypeId: string;
  methodTypeDesc: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface GlAccountTypeDefaultItem {
  glAccountTypeId: string;
  glAccountTypeDesc: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface GlMappingsResponse {
  organizationPartyId: string;
  invoiceItemTypeGlAccounts: InvoiceItemTypeGlAccountItem[];
  paymentMethodTypeGlAccounts: PaymentMethodTypeGlAccountItem[];
  glAccountTypeDefaults: GlAccountTypeDefaultItem[];
}

export interface TaxAuthorityMetaItem {
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  geoName: string;
  partyName: string;
  label: string;
}

export interface GeoMetaItem {
  geoId: string;
  geoName: string;
  geoCode: string;
  geoTypeId: string;
}

export interface TaxAuthorityRateTypeMetaItem {
  id: string;
  description: string;
}

export interface GlAccountMetaItem {
  glAccountId: string;
  accountName: string;
  accountCode: string;
  glAccountTypeId: string;
  glAccountClassId: string;
  label: string;
}

export interface InvoiceItemTypeMetaItem {
  invoiceItemTypeId: string;
  description: string;
  parentTypeId: string;
}

export interface PaymentMethodTypeMetaItem {
  paymentMethodTypeId: string;
  description: string;
}

export interface GlAccountTypeMetaItem {
  glAccountTypeId: string;
  description: string;
}

export interface OrgMetaItem {
  partyId: string;
  name: string;
  currencyUomId: string;
}

export interface TaxAndGlMappingMetadata {
  taxAuthorities: TaxAuthorityMetaItem[];
  geos: GeoMetaItem[];
  taxAuthorityRateTypes: TaxAuthorityRateTypeMetaItem[];
  glAccounts: GlAccountMetaItem[];
  invoiceItemTypes: InvoiceItemTypeMetaItem[];
  paymentMethodTypes: PaymentMethodTypeMetaItem[];
  glAccountTypes: GlAccountTypeMetaItem[];
  organizations: OrgMetaItem[];
}

export interface CreateTaxAuthorityPayload {
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  requireTaxIdForExemption?: string;
  taxIdFormatPattern?: string;
  includeTaxInPrice?: string;
}

export interface CreateTaxRatePayload {
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  taxAuthorityRateTypeId?: string;
  taxPercentage: number | string;
  description?: string;
  taxShipping?: string;
  fromDate?: string;
  thruDate?: string;
  productCategoryId?: string;
}

/**
 * Base fetch function to call OFBiz endpoints, strip '//' prefix, and handle errors.
 */
async function requestApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `/react-app/control/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options?.headers,
    },
  });

  const text = await response.text();

  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error(`OFBiz sunucusundan HTML hata sayfası döndü. (${response.status} ${response.statusText})`);
  }

  const withoutPrefix = text.startsWith('//') ? text.substring(2) : text;
  let data: any;
  try {
    data = JSON.parse(extractFirstJson(withoutPrefix));
  } catch (err: any) {
    throw new Error(`JSON ayrıştırma hatası: ${err.message}. Ham yanıt: ${withoutPrefix.substring(0, 100)}`);
  }

  if (data._ERROR_MESSAGE_) {
    throw new Error(data._ERROR_MESSAGE_);
  }

  return data as T;
}


/**
 * Convert an object to application/x-www-form-urlencoded string
 */
function toFormData(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, String(val));
    }
  });
  return params.toString();
}

/**
 * Genel amaçlı fetchApi yardımcısı.
 * OFBiz yanıtı bazen: //{...json...}//{...tls-metadata...} formatında gelir.
 * Baştaki // kaldırılıp, yalnızca ilk JSON bloğu parse edilir.
 */
export async function fetchApi(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options?.headers,
    },
  });

  const text = await response.text();

  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error(`OFBiz sunucusundan HTML hata sayfası döndü. (${response.status} ${response.statusText})`);
  }

  // Baştaki "//" güvenlik önekini kaldır, sonra ilk geçerli JSON bloğunu al.
  // OFBiz çift yanıt yapısı: //{asıl json}//{tls metadata}
  const withoutPrefix = text.startsWith('//') ? text.substring(2) : text;
  // İlk tam JSON nesnesini bul (açık parantez sayısını takip ederek)
  const firstJsonOnly = extractFirstJson(withoutPrefix);
  try {
    return JSON.parse(firstJsonOnly);
  } catch (err: any) {
    throw new Error(`JSON ayrıştırma hatası: ${err.message}. Ham yanıt: ${withoutPrefix.substring(0, 100)}`);
  }
}

/** Bir string içindeki ilk tam JSON nesnesini/dizisini döndürür. */
function extractFirstJson(s: string): string {
  const startChar = s[0];
  if (startChar !== '{' && startChar !== '[') return s;
  const closeChar = startChar === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\' && inString) { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === startChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) return s.substring(0, i + 1);
    }
  }
  return s;
}


export const api = {

  // 1. Get Invoices List
  getInvoices: async (filters: Record<string, any> = {}): Promise<InvoicesResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getInvoices?${query}` : 'getInvoices';
    return requestApi<InvoicesResponse>(endpoint);
  },

  // 2. Get Single Invoice Details
  getInvoiceDetails: async (invoiceId: string): Promise<InvoiceDetailResponse> => {
    return requestApi<InvoiceDetailResponse>(`getInvoiceDetails?invoiceId=${encodeURIComponent(invoiceId)}`);
  },

  // 3. Create Invoice
  createInvoice: async (payload: CreateInvoicePayload): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('createInvoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 4. Update Invoice Header
  updateInvoice: async (payload: UpdateInvoicePayload): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('updateInvoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 5. Change Invoice Status
  setInvoiceStatus: async (invoiceId: string, statusId: string): Promise<{ invoiceId: string; statusId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; statusId: string; _EVENT_MESSAGE_?: string }>('setInvoiceStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ invoiceId, statusId }),
    });
  },

  // 6. Add Invoice Item
  createInvoiceItem: async (payload: InvoiceItemPayload): Promise<{ invoiceId: string; invoiceItemSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; invoiceItemSeqId: string; _EVENT_MESSAGE_?: string }>('createInvoiceItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 7. Update Invoice Item
  updateInvoiceItem: async (payload: InvoiceItemPayload): Promise<{ invoiceId: string; invoiceItemSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; invoiceItemSeqId: string; _EVENT_MESSAGE_?: string }>('updateInvoiceItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 8. Remove Invoice Item
  removeInvoiceItem: async (invoiceId: string, invoiceItemSeqId: string): Promise<{ invoiceId: string; invoiceItemSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; invoiceItemSeqId: string; _EVENT_MESSAGE_?: string }>('removeInvoiceItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ invoiceId, invoiceItemSeqId }),
    });
  },

  // 9. Copy Invoice
  copyInvoice: async (invoiceId: string): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('copyInvoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ invoiceId }),
    });
  },

  // 10. Get Metadata
  getInvoiceMetadata: async (): Promise<InvoiceMetadataResponse> => {
    return requestApi<InvoiceMetadataResponse>('getInvoiceMetadata');
  },

  // Dashboard summary
  getAccountingSummary: async (): Promise<any> => {
    return requestApi<any>('getAccountingSummary');
  },

  // 11. Payments List
  getPayments: async (filters: Record<string, any> = {}): Promise<PaymentsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getPayments?${query}` : 'getPayments';
    return requestApi<PaymentsResponse>(endpoint);
  },

  // 12. Payment Details
  getPaymentDetails: async (paymentId: string): Promise<PaymentDetailResponse> => {
    return requestApi<PaymentDetailResponse>(`getPaymentDetails?paymentId=${encodeURIComponent(paymentId)}`);
  },

  // 13. Payment Metadata
  getPaymentMetadata: async (): Promise<PaymentMetadataResponse> => {
    return requestApi<PaymentMetadataResponse>('getPaymentMetadata');
  },

  // 14. Create Payment
  createPayment: async (payload: CreatePaymentPayload): Promise<{ paymentId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentId: string; _EVENT_MESSAGE_?: string }>('createPayment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 15. Update Payment
  updatePayment: async (payload: UpdatePaymentPayload): Promise<{ paymentId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentId: string; _EVENT_MESSAGE_?: string }>('updatePayment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 16. Set Payment Status
  setPaymentStatus: async (paymentId: string, statusId: string): Promise<{ paymentId: string; statusId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentId: string; statusId: string; _EVENT_MESSAGE_?: string }>('setPaymentStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentId, statusId }),
    });
  },

  // 17. Get Open Invoices for Matching
  getOpenInvoicesForPayment: async (paymentId: string): Promise<{ openInvoices: OpenInvoiceItem[] }> => {
    return requestApi<{ openInvoices: OpenInvoiceItem[] }>(`getOpenInvoicesForPayment?paymentId=${encodeURIComponent(paymentId)}`);
  },

  // 18. Apply Payment to Invoice
  createPaymentApplication: async (payload: CreatePaymentApplicationPayload): Promise<{ paymentApplicationId: string; paymentId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentApplicationId: string; paymentId: string; _EVENT_MESSAGE_?: string }>('createPaymentApplication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 19. Remove Payment Application
  removePaymentApplication: async (paymentApplicationId: string): Promise<{ paymentApplicationId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentApplicationId: string; _EVENT_MESSAGE_?: string }>('removePaymentApplication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentApplicationId }),
    });
  },

  // 20. Trial Balance (Mizan)
  getTrialBalance: async (filters: Record<string, any> = {}): Promise<TrialBalanceResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getTrialBalance?${query}` : 'getTrialBalance';
    return requestApi<TrialBalanceResponse>(endpoint);
  },

  // 21. Balance Sheet (Bilanço)
  getBalanceSheet: async (filters: Record<string, any> = {}): Promise<BalanceSheetResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getBalanceSheet?${query}` : 'getBalanceSheet';
    return requestApi<BalanceSheetResponse>(endpoint);
  },

  // 22. Income Statement (Gelir Tablosu)
  getIncomeStatement: async (filters: Record<string, any> = {}): Promise<IncomeStatementResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getIncomeStatement?${query}` : 'getIncomeStatement';
    return requestApi<IncomeStatementResponse>(endpoint);
  },

  // 23. Aging Summary (Yaşlandırma Raporu)
  getAgingSummary: async (type: 'AR' | 'AP' = 'AR'): Promise<AgingResponse> => {
    return requestApi<AgingResponse>(`getAgingSummary?type=${type}`);
  },

  // 24. Report Metadata
  getReportMetadata: async (): Promise<ReportMetadataResponse> => {
    return requestApi<ReportMetadataResponse>('getReportMetadata');
  },

  // 25. Get GL Accounts (Chart of Accounts)
  getGlAccounts: async (filters: Record<string, any> = {}): Promise<GlAccountsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getGlAccounts?${query}` : 'getGlAccounts';
    return requestApi<GlAccountsResponse>(endpoint);
  },

  // 26. Get GL Account Details
  getGlAccountDetails: async (glAccountId: string, organizationPartyId: string = 'Company'): Promise<GlAccountDetailResponse> => {
    return requestApi<GlAccountDetailResponse>(`getGlAccountDetails?glAccountId=${encodeURIComponent(glAccountId)}&organizationPartyId=${encodeURIComponent(organizationPartyId)}`);
  },

  // 27. Create GL Account
  createGlAccount: async (payload: CreateGlAccountPayload): Promise<{ glAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ glAccountId: string; _EVENT_MESSAGE_?: string }>('createGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 28. Update GL Account
  updateGlAccount: async (payload: UpdateGlAccountPayload): Promise<{ glAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ glAccountId: string; _EVENT_MESSAGE_?: string }>('updateGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 29. Assign GL Account to Organization
  assignGlAccountToOrg: async (glAccountId: string, assign: 'Y' | 'N', organizationPartyId: string = 'Company'): Promise<{ glAccountId: string; isAssigned: boolean; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ glAccountId: string; isAssigned: boolean; _EVENT_MESSAGE_?: string }>('assignGlAccountToOrg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ glAccountId, assign, organizationPartyId }),
    });
  },

  // 30. Get Accounting Transactions (Journal Entries)
  getAcctgTransactions: async (filters: Record<string, any> = {}): Promise<AcctgTransactionsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getAcctgTransactions?${query}` : 'getAcctgTransactions';
    return requestApi<AcctgTransactionsResponse>(endpoint);
  },

  // 31. Get Accounting Transaction Details
  getAcctgTransDetails: async (acctgTransId: string): Promise<AcctgTransDetailResponse> => {
    return requestApi<AcctgTransDetailResponse>(`getAcctgTransDetails?acctgTransId=${encodeURIComponent(acctgTransId)}`);
  },

  // 32. Create Journal Entry (Balanced debit/credit)
  createJournalEntry: async (payload: CreateJournalEntryPayload): Promise<{ acctgTransId: string; isPosted: string; _EVENT_MESSAGE_?: string }> => {
    const bodyObj: Record<string, any> = {
      ...payload,
      entries: JSON.stringify(payload.entries),
    };
    return requestApi<{ acctgTransId: string; isPosted: string; _EVENT_MESSAGE_?: string }>('createJournalEntry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(bodyObj),
    });
  },

  // 33. Post Journal Entry to General Ledger
  postJournalEntry: async (acctgTransId: string): Promise<{ acctgTransId: string; isPosted: string; postedDate: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ acctgTransId: string; isPosted: string; postedDate: string; _EVENT_MESSAGE_?: string }>('postJournalEntry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ acctgTransId }),
    });
  },

  // 34. Get GL Metadata
  getGlMetadata: async (): Promise<GlMetadataResponse> => {
    return requestApi<GlMetadataResponse>('getGlMetadata');
  },

  // 35. Get Financial Accounts (Kasa & Banka)
  getFinAccounts: async (filters: Record<string, any> = {}): Promise<FinAccountsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getFinAccounts?${query}` : 'getFinAccounts';
    return requestApi<FinAccountsResponse>(endpoint);
  },

  // 36. Get Financial Account Details
  getFinAccountDetails: async (finAccountId: string): Promise<FinAccountDetailResponse> => {
    return requestApi<FinAccountDetailResponse>(`getFinAccountDetails?finAccountId=${encodeURIComponent(finAccountId)}`);
  },

  // 37. Create Financial Account
  createFinAccount: async (payload: CreateFinAccountPayload): Promise<{ finAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ finAccountId: string; _EVENT_MESSAGE_?: string }>('createFinAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 38. Update Financial Account
  updateFinAccount: async (payload: UpdateFinAccountPayload): Promise<{ finAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ finAccountId: string; _EVENT_MESSAGE_?: string }>('updateFinAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 39. Get Financial Account Transactions
  getFinAccountTransactions: async (filters: Record<string, any> = {}): Promise<FinAccountTransactionsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getFinAccountTransactions?${query}` : 'getFinAccountTransactions';
    return requestApi<FinAccountTransactionsResponse>(endpoint);
  },

  // 40. Create Financial Account Transaction (Deposit, Withdrawal, Adjustment)
  createFinAccountTrans: async (payload: CreateFinAccountTransPayload): Promise<{ finAccountTransId: string; finAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ finAccountTransId: string; finAccountId: string; _EVENT_MESSAGE_?: string }>('createFinAccountTrans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 41. Set Financial Account Transaction Status (Approve, Cancel)
  setFinAccountTransStatus: async (finAccountTransId: string, statusId: string): Promise<{ finAccountTransId: string; statusId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ finAccountTransId: string; statusId: string; _EVENT_MESSAGE_?: string }>('setFinAccountTransStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ finAccountTransId, statusId }),
    });
  },

  // 42. Transfer Between Financial Accounts (Virman)
  transferBetweenFinAccounts: async (payload: TransferFinAccountsPayload): Promise<{ fromTransId: string; toTransId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ fromTransId: string; toTransId: string; _EVENT_MESSAGE_?: string }>('transferBetweenFinAccounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 43. Get Bank Reconciliations
  getGlReconciliations: async (filters: Record<string, any> = {}): Promise<GlReconciliationsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getGlReconciliations?${query}` : 'getGlReconciliations';
    return requestApi<GlReconciliationsResponse>(endpoint);
  },

  // 44. Get Bank Reconciliation Details
  getGlReconciliationDetails: async (glReconciliationId: string): Promise<GlReconciliationDetailResponse> => {
    return requestApi<GlReconciliationDetailResponse>(`getGlReconciliationDetails?glReconciliationId=${encodeURIComponent(glReconciliationId)}`);
  },

  // 45. Create Bank Reconciliation
  createGlReconciliation: async (payload: CreateGlReconciliationPayload): Promise<{ glReconciliationId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ glReconciliationId: string; _EVENT_MESSAGE_?: string }>('createGlReconciliation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 46. Reconcile Transactions (Link / Unlink)
  reconcileTransactions: async (payload: ReconcileTransactionsPayload): Promise<{ glReconciliationId: string; _EVENT_MESSAGE_?: string }> => {
    const bodyObj: Record<string, any> = {
      glReconciliationId: payload.glReconciliationId,
      finAccountTransIds: JSON.stringify(payload.finAccountTransIds),
      action: payload.action || 'LINK',
      markReconciled: payload.markReconciled || 'N',
    };
    return requestApi<{ glReconciliationId: string; _EVENT_MESSAGE_?: string }>('reconcileTransactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(bodyObj),
    });
  },

  // 47. Get FinAccount Metadata
  getFinAccountMetadata: async (): Promise<FinAccountMetadataResponse> => {
    return requestApi<FinAccountMetadataResponse>('getFinAccountMetadata');
  },

  // ==========================================
  // PHASE 5: ADVANCED ACCOUNTING API
  // ==========================================

  // 48. Get Advanced Accounting Metadata
  getAdvancedAccountingMetadata: async (): Promise<AdvancedAccountingMetadataResponse> => {
    return requestApi<AdvancedAccountingMetadataResponse>('getAdvancedAccountingMetadata');
  },

  // 49. Get Billing Accounts
  getBillingAccounts: async (filters: Record<string, any> = {}): Promise<BillingAccountsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getBillingAccounts?${query}` : 'getBillingAccounts';
    return requestApi<BillingAccountsResponse>(endpoint);
  },

  // 50. Get Billing Account Details
  getBillingAccountDetails: async (billingAccountId: string): Promise<BillingAccountDetailResponse> => {
    return requestApi<BillingAccountDetailResponse>(`getBillingAccountDetails?billingAccountId=${encodeURIComponent(billingAccountId)}`);
  },

  // 51. Create Billing Account
  createBillingAccount: async (payload: CreateBillingAccountPayload): Promise<{ billingAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ billingAccountId: string; _EVENT_MESSAGE_?: string }>('createBillingAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 52. Update Billing Account
  updateBillingAccount: async (payload: UpdateBillingAccountPayload): Promise<{ billingAccountId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ billingAccountId: string; _EVENT_MESSAGE_?: string }>('updateBillingAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 53. Get Fixed Assets
  getFixedAssets: async (filters: Record<string, any> = {}): Promise<FixedAssetsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getFixedAssets?${query}` : 'getFixedAssets';
    return requestApi<FixedAssetsResponse>(endpoint);
  },

  // 54. Get Fixed Asset Details
  getFixedAssetDetails: async (fixedAssetId: string): Promise<FixedAssetDetailResponse> => {
    return requestApi<FixedAssetDetailResponse>(`getFixedAssetDetails?fixedAssetId=${encodeURIComponent(fixedAssetId)}`);
  },

  // 55. Create Fixed Asset
  createFixedAsset: async (payload: CreateFixedAssetPayload): Promise<{ fixedAssetId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ fixedAssetId: string; _EVENT_MESSAGE_?: string }>('createFixedAsset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 56. Update Fixed Asset
  updateFixedAsset: async (payload: UpdateFixedAssetPayload): Promise<{ fixedAssetId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ fixedAssetId: string; _EVENT_MESSAGE_?: string }>('updateFixedAsset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 57. Calculate / Record Depreciation
  calculateDepreciation: async (fixedAssetId: string, depreciationAmount?: number): Promise<{ fixedAssetId: string; depreciationAdded: number; totalDepreciation: number; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ fixedAssetId: string; depreciationAdded: number; totalDepreciation: number; _EVENT_MESSAGE_?: string }>('calculateDepreciation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ fixedAssetId, depreciationAmount }),
    });
  },

  // 58. Get Budgets
  getBudgets: async (filters: Record<string, any> = {}): Promise<BudgetsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getBudgets?${query}` : 'getBudgets';
    return requestApi<BudgetsResponse>(endpoint);
  },

  // 59. Get Budget Details
  getBudgetDetails: async (budgetId: string): Promise<BudgetDetailResponse> => {
    return requestApi<BudgetDetailResponse>(`getBudgetDetails?budgetId=${encodeURIComponent(budgetId)}`);
  },

  // 60. Create Budget
  createBudget: async (payload: CreateBudgetPayload): Promise<{ budgetId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ budgetId: string; _EVENT_MESSAGE_?: string }>('createBudget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 61. Create Budget Item
  createBudgetItem: async (payload: CreateBudgetItemPayload): Promise<{ budgetId: string; budgetItemSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ budgetId: string; budgetItemSeqId: string; _EVENT_MESSAGE_?: string }>('createBudgetItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 62. Set Budget Status
  setBudgetStatus: async (budgetId: string, statusId: string, comments?: string): Promise<{ budgetId: string; statusId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ budgetId: string; statusId: string; _EVENT_MESSAGE_?: string }>('setBudgetStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ budgetId, statusId, comments }),
    });
  },

  // 63. Get Agreements
  getAgreements: async (filters: Record<string, any> = {}): Promise<AgreementsResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getAgreements?${query}` : 'getAgreements';
    return requestApi<AgreementsResponse>(endpoint);
  },

  // 64. Get Agreement Details
  getAgreementDetails: async (agreementId: string): Promise<AgreementDetailResponse> => {
    return requestApi<AgreementDetailResponse>(`getAgreementDetails?agreementId=${encodeURIComponent(agreementId)}`);
  },

  // 65. Create Agreement
  createAgreement: async (payload: CreateAgreementPayload): Promise<{ agreementId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ agreementId: string; _EVENT_MESSAGE_?: string }>('createAgreement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 66. Update Agreement
  updateAgreement: async (payload: UpdateAgreementPayload): Promise<{ agreementId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ agreementId: string; _EVENT_MESSAGE_?: string }>('updateAgreement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // ==========================================
  // FAZ 6: TAX AND GL MAPPING METHODS
  // ==========================================

  // 67. Get Tax and GL Mapping Metadata
  getTaxAndGlMappingMetadata: async (): Promise<TaxAndGlMappingMetadata> => {
    return requestApi<TaxAndGlMappingMetadata>('getTaxAndGlMappingMetadata');
  },

  // 68. Get Tax Authorities
  getTaxAuthorities: async (): Promise<TaxAuthoritiesResponse> => {
    return requestApi<TaxAuthoritiesResponse>('getTaxAuthorities');
  },

  // 69. Create Tax Authority
  createTaxAuthority: async (payload: CreateTaxAuthorityPayload): Promise<{ taxAuthGeoId: string; taxAuthPartyId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ taxAuthGeoId: string; taxAuthPartyId: string; _EVENT_MESSAGE_?: string }>('createTaxAuthority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 70. Update Tax Authority
  updateTaxAuthority: async (payload: CreateTaxAuthorityPayload): Promise<{ taxAuthGeoId: string; taxAuthPartyId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ taxAuthGeoId: string; taxAuthPartyId: string; _EVENT_MESSAGE_?: string }>('updateTaxAuthority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 71. Delete Tax Authority
  deleteTaxAuthority: async (taxAuthGeoId: string, taxAuthPartyId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteTaxAuthority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ taxAuthGeoId, taxAuthPartyId }),
    });
  },

  // 72. Get Tax Rates
  getTaxRates: async (filters: Record<string, any> = {}): Promise<TaxRatesResponse> => {
    const query = toFormData(filters);
    const endpoint = query ? `getTaxRates?${query}` : 'getTaxRates';
    return requestApi<TaxRatesResponse>(endpoint);
  },

  // 73. Create Tax Rate
  createTaxRate: async (payload: CreateTaxRatePayload): Promise<{ taxAuthorityRateSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ taxAuthorityRateSeqId: string; _EVENT_MESSAGE_?: string }>('createTaxRate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 74. Update Tax Rate
  updateTaxRate: async (payload: { taxAuthorityRateSeqId: string; taxPercentage?: number | string; description?: string; taxShipping?: string; thruDate?: string }): Promise<{ taxAuthorityRateSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ taxAuthorityRateSeqId: string; _EVENT_MESSAGE_?: string }>('updateTaxRate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 75. Delete Tax Rate
  deleteTaxRate: async (taxAuthorityRateSeqId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteTaxRate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ taxAuthorityRateSeqId }),
    });
  },

  // 76. Get Tax Authority GL Accounts
  getTaxAuthorityGlAccounts: async (taxAuthGeoId: string, taxAuthPartyId: string): Promise<{ taxAuthorityGlAccounts: TaxAuthorityGlAccountItem[] }> => {
    return requestApi<{ taxAuthorityGlAccounts: TaxAuthorityGlAccountItem[] }>(`getTaxAuthorityGlAccounts?taxAuthGeoId=${encodeURIComponent(taxAuthGeoId)}&taxAuthPartyId=${encodeURIComponent(taxAuthPartyId)}`);
  },

  // 77. Set Tax Authority GL Account
  setTaxAuthorityGlAccount: async (payload: { taxAuthGeoId: string; taxAuthPartyId: string; organizationPartyId: string; glAccountId: string }): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('setTaxAuthorityGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 78. Delete Tax Authority GL Account
  deleteTaxAuthorityGlAccount: async (taxAuthGeoId: string, taxAuthPartyId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteTaxAuthorityGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ taxAuthGeoId, taxAuthPartyId, organizationPartyId }),
    });
  },

  // 79. Get GL Mappings
  getGlMappings: async (organizationPartyId: string = 'Company'): Promise<GlMappingsResponse> => {
    return requestApi<GlMappingsResponse>(`getGlMappings?organizationPartyId=${encodeURIComponent(organizationPartyId)}`);
  },

  // 80. Set Invoice Item Type GL Account
  setInvoiceItemTypeGlAccount: async (invoiceItemTypeId: string, glAccountId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('setInvoiceItemTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ invoiceItemTypeId, glAccountId, organizationPartyId }),
    });
  },

  // 81. Remove Invoice Item Type GL Account
  removeInvoiceItemTypeGlAccount: async (invoiceItemTypeId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('removeInvoiceItemTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ invoiceItemTypeId, organizationPartyId }),
    });
  },

  // 82. Set Payment Method Type GL Account
  setPaymentMethodTypeGlAccount: async (paymentMethodTypeId: string, glAccountId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('setPaymentMethodTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentMethodTypeId, glAccountId, organizationPartyId }),
    });
  },

  // 83. Remove Payment Method Type GL Account
  removePaymentMethodTypeGlAccount: async (paymentMethodTypeId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('removePaymentMethodTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentMethodTypeId, organizationPartyId }),
    });
  },

  // 84. Set GL Account Type Default
  setGlAccountTypeDefault: async (glAccountTypeId: string, glAccountId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('setGlAccountTypeDefault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ glAccountTypeId, glAccountId, organizationPartyId }),
    });
  },

  // 85. Remove GL Account Type Default
  removeGlAccountTypeDefault: async (glAccountTypeId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('removeGlAccountTypeDefault', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ glAccountTypeId, organizationPartyId }),
    });
  },

  // ═════════════════════════════════════════════════════════════════
  // Faz 1: Mali Dönemler & Kapanış (Custom Time Periods)
  // ═════════════════════════════════════════════════════════════════
  getCustomTimePeriods: async (params?: { organizationPartyId?: string; periodTypeId?: string; isClosed?: string; search?: string }): Promise<CustomTimePeriodsResponse> => {
    const q = new URLSearchParams();
    if (params?.organizationPartyId) q.append('organizationPartyId', params.organizationPartyId);
    if (params?.periodTypeId) q.append('periodTypeId', params.periodTypeId);
    if (params?.isClosed) q.append('isClosed', params.isClosed);
    if (params?.search) q.append('search', params.search);
    return requestApi<CustomTimePeriodsResponse>(`getCustomTimePeriods?${q.toString()}`);
  },
  createCustomTimePeriod: async (payload: CreateCustomTimePeriodPayload): Promise<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }>('createCustomTimePeriod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload as any),
    });
  },
  updateCustomTimePeriod: async (payload: UpdateCustomTimePeriodPayload): Promise<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }>('updateCustomTimePeriod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload as any),
    });
  },
  closeCustomTimePeriod: async (customTimePeriodId: string, forceCascade?: boolean): Promise<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }>('closeCustomTimePeriod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ customTimePeriodId, forceCascade: forceCascade ? 'Y' : 'N' }),
    });
  },
  reopenCustomTimePeriod: async (customTimePeriodId: string): Promise<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ customTimePeriodId: string; _EVENT_MESSAGE_?: string }>('reopenCustomTimePeriod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ customTimePeriodId }),
    });
  },
  deleteCustomTimePeriod: async (customTimePeriodId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteCustomTimePeriod', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ customTimePeriodId }),
    });
  },

  // ═════════════════════════════════════════════════════════════════
  // Faz 2: Döviz Kurları & FX Çevrimleri (Foreign Exchange / FX Rates)
  // ═════════════════════════════════════════════════════════════════
  getFxConversions: async (params?: { uomId?: string; uomIdTo?: string; activeOnly?: string }): Promise<FxConversionsResponse> => {
    const q = new URLSearchParams();
    if (params?.uomId) q.append('uomId', params.uomId);
    if (params?.uomIdTo) q.append('uomIdTo', params.uomIdTo);
    if (params?.activeOnly) q.append('activeOnly', params.activeOnly);
    return requestApi<FxConversionsResponse>(`getFxConversions?${q.toString()}`);
  },
  createFxConversion: async (payload: CreateFxConversionPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createFxConversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload as any),
    });
  },
  deleteFxConversion: async (uomId: string, uomIdTo: string, fromDate: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteFxConversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ uomId, uomIdTo, fromDate }),
    });
  },

  // ═════════════════════════════════════════════════════════════════
  // Faz 3: Nakit Akış & Karşılaştırmalı Raporlar
  // ═════════════════════════════════════════════════════════════════
  getCashFlowStatement: async (params?: { organizationPartyId?: string; year?: string; fromDate?: string; thruDate?: string }): Promise<CashFlowStatementResponse> => {
    const q = new URLSearchParams();
    if (params?.organizationPartyId) q.append('organizationPartyId', params.organizationPartyId);
    if (params?.year) q.append('year', params.year);
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.thruDate) q.append('thruDate', params.thruDate);
    return requestApi<CashFlowStatementResponse>(`getCashFlowStatement?${q.toString()}`);
  },
  getComparativeBalanceSheet: async (params?: { organizationPartyId?: string; year1?: string; year2?: string }): Promise<ComparativeBalanceSheetResponse> => {
    const q = new URLSearchParams();
    if (params?.organizationPartyId) q.append('organizationPartyId', params.organizationPartyId);
    if (params?.year1) q.append('year1', params.year1);
    if (params?.year2) q.append('year2', params.year2);
    return requestApi<ComparativeBalanceSheetResponse>(`getComparativeBalanceSheet?${q.toString()}`);
  },
  getComparativeIncomeStatement: async (params?: { organizationPartyId?: string; year1?: string; year2?: string }): Promise<ComparativeIncomeStatementResponse> => {
    const q = new URLSearchParams();
    if (params?.organizationPartyId) q.append('organizationPartyId', params.organizationPartyId);
    if (params?.year1) q.append('year1', params.year1);
    if (params?.year2) q.append('year2', params.year2);
    return requestApi<ComparativeIncomeStatementResponse>(`getComparativeIncomeStatement?${q.toString()}`);
  },

  // ═════════════════════════════════════════════════════════════════
  // Faz 4: Masraf / Maliyet Merkezleri (Cost Centers)
  // ═════════════════════════════════════════════════════════════════
  getGlAccountCategories: async (params?: { glAccountCategoryTypeId?: string; search?: string }): Promise<{ categories: GlAccountCategoryItem[]; types: { glAccountCategoryTypeId: string; description: string }[] }> => {
    const q = new URLSearchParams();
    if (params?.glAccountCategoryTypeId) q.append('glAccountCategoryTypeId', params.glAccountCategoryTypeId);
    if (params?.search) q.append('search', params.search);
    return requestApi<{ categories: GlAccountCategoryItem[]; types: { glAccountCategoryTypeId: string; description: string }[] }>(`getGlAccountCategories?${q.toString()}`);
  },
  getGlAccountCategoryMembers: async (glAccountCategoryId: string): Promise<{ members: GlAccountCategoryMemberItem[] }> => {
    return requestApi<{ members: GlAccountCategoryMemberItem[] }>(`getGlAccountCategoryMembers?glAccountCategoryId=${encodeURIComponent(glAccountCategoryId)}`);
  },
  createGlAccountCategory: async (payload: { description: string; glAccountCategoryTypeId?: string; glAccountCategoryId?: string }): Promise<{ glAccountCategoryId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ glAccountCategoryId: string; _EVENT_MESSAGE_?: string }>('createGlAccountCategory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload as any),
    });
  },
  addGlAccountToCategory: async (payload: { glAccountCategoryId: string; glAccountId: string; amountPercentage?: number; fromDate?: string; thruDate?: string }): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('addGlAccountToCategory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload as any),
    });
  },
  removeGlAccountFromCategory: async (glAccountCategoryId: string, glAccountId: string, fromDate: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('removeGlAccountFromCategory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ glAccountCategoryId, glAccountId, fromDate }),
    });
  },
  getCostCenterBalances: async (params?: { organizationPartyId?: string; year?: string; fromDate?: string; thruDate?: string }): Promise<{ costCenters: CostCenterBalanceReport[] }> => {
    const q = new URLSearchParams();
    if (params?.organizationPartyId) q.append('organizationPartyId', params.organizationPartyId);
    if (params?.year) q.append('year', params.year);
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.thruDate) q.append('thruDate', params.thruDate);
    return requestApi<{ costCenters: CostCenterBalanceReport[] }>(`getCostCenterBalances?${q.toString()}`);
  },

  // ═════════════════════════════════════════════════════════════════
  // Aşama 1: Banka Mevduat & Para Yatırma Fişleri (Deposit Slips)
  // ═════════════════════════════════════════════════════════════════
  getDepositSlips: async (params?: { finAccountId?: string; search?: string }): Promise<{ depositSlips: DepositSlipItem[] }> => {
    const q = new URLSearchParams();
    if (params?.finAccountId) q.append('finAccountId', params.finAccountId);
    if (params?.search) q.append('search', params.search);
    return requestApi<{ depositSlips: DepositSlipItem[] }>(`getDepositSlips?${q.toString()}`);
  },
  getDepositSlipDetail: async (paymentGroupId: string): Promise<{ depositSlip: DepositSlipDetailItem }> => {
    return requestApi<{ depositSlip: DepositSlipDetailItem }>(`getDepositSlipDetail?paymentGroupId=${encodeURIComponent(paymentGroupId)}`);
  },
  getUndepositedPayments: async (params?: { paymentMethodTypeId?: string; partyIdFrom?: string; search?: string; fromDate?: string; thruDate?: string }): Promise<{ payments: UndepositedPaymentItem[] }> => {
    const q = new URLSearchParams();
    if (params?.paymentMethodTypeId) q.append('paymentMethodTypeId', params.paymentMethodTypeId);
    if (params?.partyIdFrom) q.append('partyIdFrom', params.partyIdFrom);
    if (params?.search) q.append('search', params.search);
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.thruDate) q.append('thruDate', params.thruDate);
    return requestApi<{ payments: UndepositedPaymentItem[] }>(`getUndepositedPayments?${q.toString()}`);
  },
  createDepositSlip: async (payload: { finAccountId: string; paymentIds: string[]; paymentGroupName?: string }): Promise<{ paymentGroupId: string; finAccountTransId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentGroupId: string; finAccountTransId: string; _EVENT_MESSAGE_?: string }>('createDepositSlip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({
        finAccountId: payload.finAccountId,
        paymentGroupName: payload.paymentGroupName || '',
        paymentIds: payload.paymentIds.join(','),
      }),
    });
  },
  cancelDepositSlip: async (paymentGroupId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('cancelDepositSlip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentGroupId }),
    });
  },
  getDepositSlipMetadata: async (): Promise<DepositSlipMetadataResponse> => {
    return requestApi<DepositSlipMetadataResponse>('getDepositSlipMetadata');
  },

  // ═════════════════════════════════════════════════════════════════
  // Aşama 2: Şirket Muhasebe Tercihleri & GL Yevmiye Defterleri (Accounting Preferences & GlJournals)
  // ═════════════════════════════════════════════════════════════════
  getAccountingPreferences: async (organizationPartyId?: string): Promise<AccountingPreferencesResponse> => {
    const q = organizationPartyId ? `?organizationPartyId=${encodeURIComponent(organizationPartyId)}` : '';
    return requestApi<AccountingPreferencesResponse>(`getAccountingPreferences${q}`);
  },
  saveAccountingPreferences: async (payload: Partial<AccountingPreference>): Promise<{ success: boolean; partyId: string }> => {
    return requestApi<{ success: boolean; partyId: string }>('saveAccountingPreferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  getGlJournals: async (organizationPartyId?: string): Promise<{ journals: GlJournalItem[]; organizationPartyId: string }> => {
    const q = organizationPartyId ? `?organizationPartyId=${encodeURIComponent(organizationPartyId)}` : '';
    return requestApi<{ journals: GlJournalItem[]; organizationPartyId: string }>(`getGlJournals${q}`);
  },
  createGlJournal: async (payload: { glJournalId?: string; glJournalName: string; organizationPartyId: string }): Promise<{ success: boolean; glJournalId: string; glJournalName: string }> => {
    return requestApi<{ success: boolean; glJournalId: string; glJournalName: string }>('createGlJournal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  updateGlJournal: async (payload: { glJournalId: string; glJournalName: string }): Promise<{ success: boolean; glJournalId: string }> => {
    return requestApi<{ success: boolean; glJournalId: string }>('updateGlJournal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteGlJournal: async (glJournalId: string): Promise<{ success: boolean; glJournalId: string }> => {
    return requestApi<{ success: boolean; glJournalId: string }>('deleteGlJournal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ glJournalId }),
    });
  },
  postGlJournal: async (glJournalId: string): Promise<{ success: boolean; glJournalId: string }> => {
    return requestApi<{ success: boolean; glJournalId: string }>('postGlJournal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ glJournalId }),
    });
  },

  // ═════════════════════════════════════════════════════════════════
  // Aşama 3: Ödeme Ağ Geçidi Yapılandırması & Logları (Payment Gateways & Logs)
  // ═════════════════════════════════════════════════════════════════
  getPaymentGatewayConfigs: async (): Promise<{ configs: PaymentGatewayConfigItem[] }> => {
    return requestApi<{ configs: PaymentGatewayConfigItem[] }>('getPaymentGatewayConfigs');
  },
  savePaymentGatewayConfig: async (payload: { paymentGatewayConfigId?: string; paymentGatewayConfigTypeId?: string; description?: string }): Promise<{ success: boolean; paymentGatewayConfigId: string }> => {
    return requestApi<{ success: boolean; paymentGatewayConfigId: string }>('savePaymentGatewayConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deletePaymentGatewayConfig: async (paymentGatewayConfigId: string): Promise<{ success: boolean; paymentGatewayConfigId: string }> => {
    return requestApi<{ success: boolean; paymentGatewayConfigId: string }>('deletePaymentGatewayConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentGatewayConfigId }),
    });
  },
  getPaymentGatewayResponses: async (params?: {
    search?: string;
    paymentServiceTypeEnumId?: string;
    paymentMethodTypeId?: string;
    statusFilter?: string;
    fromDate?: string;
    thruDate?: string;
    viewIndex?: number;
    viewSize?: number;
  }): Promise<PaymentGatewayResponsesResponse> => {
    const q = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
      });
    }
    const query = q.toString();
    return requestApi<PaymentGatewayResponsesResponse>(query ? `getPaymentGatewayResponses?${query}` : 'getPaymentGatewayResponses');
  },
  getPaymentGatewayResponseDetail: async (paymentGatewayResponseId: string): Promise<{ responseDetail: PaymentGatewayResponseDetail }> => {
    return requestApi<{ responseDetail: PaymentGatewayResponseDetail }>(`getPaymentGatewayResponseDetail?paymentGatewayResponseId=${encodeURIComponent(paymentGatewayResponseId)}`);
  },
  getPaymentGatewayMetadata: async (): Promise<PaymentGatewayMetadataResponse> => {
    return requestApi<PaymentGatewayMetadataResponse>('getPaymentGatewayMetadata');
  },
};

// ==========================================
// TYPES: FISCAL PERIODS, FX, COST CENTERS & REPORTS
// ==========================================
export interface CustomTimePeriodItem {
  customTimePeriodId: string;
  parentPeriodId?: string | null;
  parentPeriodName?: string | null;
  periodTypeId: string;
  periodTypeDescription: string;
  periodNum?: number | null;
  periodName: string;
  fromDate: string;
  thruDate: string;
  isClosed: 'Y' | 'N';
  organizationPartyId: string;
}

export interface PeriodTypeItem {
  periodTypeId: string;
  description: string;
  periodLength?: number | null;
}

export interface CustomTimePeriodsResponse {
  customTimePeriods: CustomTimePeriodItem[];
  periodTypes: PeriodTypeItem[];
  organizations: { partyId: string; name: string }[];
}

export interface CreateCustomTimePeriodPayload {
  organizationPartyId?: string;
  parentPeriodId?: string;
  periodTypeId: string;
  periodNum?: number | string;
  periodName: string;
  fromDate: string;
  thruDate: string;
  isClosed?: 'Y' | 'N';
}

export interface UpdateCustomTimePeriodPayload {
  customTimePeriodId: string;
  parentPeriodId?: string;
  periodTypeId?: string;
  periodNum?: number | string;
  periodName?: string;
  fromDate?: string;
  thruDate?: string;
  isClosed?: 'Y' | 'N';
}

export interface FxConversionItem {
  uomId: string;
  uomDescription: string;
  uomIdTo: string;
  uomToDescription: string;
  fromDate: string;
  thruDate?: string | null;
  conversionFactor: number;
  purposeEnumId?: string | null;
  purposeDescription?: string | null;
  isActive: boolean;
}

export interface CurrencyItem {
  uomId: string;
  description: string;
  abbreviation?: string;
}

export interface PurposeItem {
  enumId: string;
  description: string;
}

export interface FxConversionsResponse {
  conversions: FxConversionItem[];
  currencies: CurrencyItem[];
  purposes: PurposeItem[];
}

export interface CreateFxConversionPayload {
  uomId: string;
  uomIdTo: string;
  conversionFactor: number | string;
  fromDate?: string;
  thruDate?: string;
  purposeEnumId?: string;
}

export interface CashFlowStatementResponse {
  cashFlowStatement: {
    organizationPartyId: string;
    fromDate?: string | null;
    thruDate?: string | null;
    operatingActivities: {
      items: { title: string; code: string; amount: number }[];
      netCash: number;
    };
    investingActivities: {
      items: { title: string; code: string; amount: number }[];
      netCash: number;
    };
    financingActivities: {
      items: { title: string; code: string; amount: number }[];
      netCash: number;
    };
    summary: {
      openingCash: number;
      netCashChange: number;
      closingCash: number;
    };
  };
}

export interface ComparativeBalanceSheetResponse {
  comparativeBalanceSheet: {
    period1: string;
    period2: string;
    assets: {
      rows: {
        glAccountId: string;
        accountName: string;
        accountCode: string;
        balance1: number;
        balance2: number;
        diffAmount: number;
        diffPercent: number;
      }[];
      total1: number;
      total2: number;
      diffAmount: number;
      diffPercent: number;
    };
    liabilities: {
      rows: {
        glAccountId: string;
        accountName: string;
        accountCode: string;
        balance1: number;
        balance2: number;
        diffAmount: number;
        diffPercent: number;
      }[];
      total1: number;
      total2: number;
      diffAmount: number;
      diffPercent: number;
    };
    equities: {
      rows: {
        glAccountId: string;
        accountName: string;
        accountCode: string;
        balance1: number;
        balance2: number;
        diffAmount: number;
        diffPercent: number;
      }[];
      total1: number;
      total2: number;
      diffAmount: number;
      diffPercent: number;
    };
  };
}

export interface ComparativeIncomeStatementResponse {
  comparativeIncomeStatement: {
    period1: string;
    period2: string;
    revenues: {
      rows: {
        glAccountId: string;
        accountName: string;
        accountCode: string;
        amount1: number;
        amount2: number;
        diffAmount: number;
        diffPercent: number;
      }[];
      total1: number;
      total2: number;
      diffAmount: number;
    };
    expenses: {
      rows: {
        glAccountId: string;
        accountName: string;
        accountCode: string;
        amount1: number;
        amount2: number;
        diffAmount: number;
        diffPercent: number;
      }[];
      total1: number;
      total2: number;
      diffAmount: number;
    };
    netIncome: {
      net1: number;
      net2: number;
      diffAmount: number;
      diffPercent: number;
    };
  };
}

export interface GlAccountCategoryItem {
  glAccountCategoryId: string;
  glAccountCategoryTypeId: string;
  description: string;
  memberCount: number;
}

export interface GlAccountCategoryMemberItem {
  glAccountId: string;
  accountName: string;
  accountCode: string;
  glAccountCategoryId: string;
  fromDate?: string | null;
  thruDate?: string | null;
  amountPercentage: number;
}

export interface CostCenterBalanceReport {
  glAccountCategoryId: string;
  description: string;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  accounts: {
    glAccountId: string;
    accountName: string;
    accountCode: string;
    amountPercentage: number;
    debit: number;
    credit: number;
    balance: number;
  }[];
}

// ═════════════════════════════════════════════════════════════════
// TYPES: DEPOSIT SLIPS (BANKA MEVDUAT FİŞLERİ)
// ═════════════════════════════════════════════════════════════════
export interface DepositSlipItem {
  paymentGroupId: string;
  paymentGroupName: string;
  paymentGroupTypeId: string;
  finAccountId?: string | null;
  finAccountName?: string | null;
  finAccountTransId?: string | null;
  transStatusId: string;
  totalAmount: number;
  paymentCount: number;
  createdDate?: string | null;
}

export interface DepositSlipMemberPayment {
  paymentId: string;
  partyIdFrom?: string | null;
  partyFromName?: string | null;
  paymentTypeId: string;
  paymentMethodTypeId?: string | null;
  paymentMethodTypeDesc?: string | null;
  amount: number;
  currencyUomId: string;
  effectiveDate?: string | null;
  paymentRefNum?: string | null;
  statusId: string;
  statusDesc?: string | null;
}

export interface DepositSlipDetailItem {
  paymentGroupId: string;
  paymentGroupName: string;
  paymentGroupTypeId: string;
  finAccountId?: string | null;
  finAccountName?: string | null;
  finAccountCode?: string | null;
  finAccountTransId?: string | null;
  transStatusId: string;
  totalAmount: number;
  paymentCount: number;
  memberPayments: DepositSlipMemberPayment[];
}

export interface UndepositedPaymentItem {
  paymentId: string;
  partyIdFrom?: string | null;
  partyFromName?: string | null;
  paymentTypeId: string;
  paymentMethodTypeId?: string | null;
  paymentMethodTypeDesc?: string | null;
  amount: number;
  currencyUomId: string;
  effectiveDate?: string | null;
  paymentRefNum?: string | null;
  statusId: string;
}

export interface DepositSlipMetadataResponse {
  finAccounts: {
    finAccountId: string;
    finAccountName: string;
    finAccountCode: string;
    finAccountTypeId: string;
    currencyUomId: string;
    actualBalance: number;
  }[];
  paymentMethodTypes: {
    paymentMethodTypeId: string;
    description: string;
  }[];
}

// ═════════════════════════════════════════════════════════════════
// TYPES: ACCOUNTING PREFERENCES & GL JOURNALS
// ═════════════════════════════════════════════════════════════════
export interface AccountingPreference {
  partyId: string;
  partyName?: string;
  fiscalYearStartMonth?: number | null;
  fiscalYearStartDay?: number | null;
  taxFormId?: string | null;
  taxFormDesc?: string | null;
  cogsMethodId?: string | null;
  cogsMethodDesc?: string | null;
  baseCurrencyUomId: string;
  baseCurrencyDesc?: string | null;
  invoiceSeqCustMethId?: string | null;
  invoiceSeqCustMethDesc?: string | null;
  invoiceIdPrefix?: string | null;
  lastInvoiceNumber?: number | null;
  lastInvoiceRestartDate?: string | null;
  useInvoiceIdForReturns?: string | null;
  quoteSeqCustMethId?: string | null;
  quoteIdPrefix?: string | null;
  lastQuoteNumber?: number | null;
  orderSeqCustMethId?: string | null;
  orderIdPrefix?: string | null;
  lastOrderNumber?: number | null;
  refundPaymentMethodId?: string | null;
  errorGlJournalId?: string | null;
  errorGlJournalName?: string | null;
  enableAccounting?: string | null;
}

export interface GlJournalItem {
  glJournalId: string;
  glJournalName: string;
  organizationPartyId: string;
  isPosted: string;
  postedDate?: string | null;
  transCount: number;
  debitTotal: number;
  creditTotal: number;
  debitCreditDifference: number;
}

export interface AccountingPreferencesResponse {
  preferences: AccountingPreference;
  organizations: { partyId: string; groupName: string }[];
  metadata: {
    currencies: { uomId: string; description: string; abbreviation: string }[];
    taxForms: { enumId: string; description: string }[];
    cogsMethods: { enumId: string; description: string }[];
    customMethods: { customMethodId: string; customMethodTypeId: string; description: string }[];
    journals: { glJournalId: string; glJournalName: string }[];
  };
}

// ═════════════════════════════════════════════════════════════════
// TYPES: PAYMENT GATEWAYS & TRANSACTION LOGS
// ═════════════════════════════════════════════════════════════════
export interface PaymentGatewayConfigItem {
  paymentGatewayConfigId: string;
  paymentGatewayConfigTypeId?: string | null;
  typeDescription?: string | null;
  description?: string | null;
}

export interface PaymentGatewayResponseItem {
  paymentGatewayResponseId: string;
  paymentServiceTypeEnumId?: string | null;
  paymentServiceTypeDesc?: string | null;
  orderPaymentPreferenceId?: string | null;
  paymentMethodTypeId?: string | null;
  paymentMethodTypeDesc?: string | null;
  paymentMethodId?: string | null;
  transCodeEnumId?: string | null;
  amount: number;
  currencyUomId: string;
  referenceNum?: string | null;
  altReference?: string | null;
  gatewayCode?: string | null;
  gatewayFlag?: string | null;
  gatewayMessage?: string | null;
  transactionDate?: string | null;
  status: 'APPROVED' | 'CAPTURED' | 'DECLINED' | string;
  resultDeclined: string;
  resultNsf: string;
  resultBadExpire: string;
  resultBadCardNumber: string;
}

export interface PaymentGatewayResponseDetail extends PaymentGatewayResponseItem {
  subReference?: string | null;
  gatewayAvsResult?: string | null;
  gatewayCvResult?: string | null;
  gatewayScoreResult?: string | null;
  messages: string[];
  linkedPayments: {
    paymentId: string;
    paymentTypeId: string;
    partyIdFrom: string;
    partyIdTo: string;
    amount: number;
    statusId: string;
  }[];
}

export interface PaymentGatewayResponsesResponse {
  responses: PaymentGatewayResponseItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  stats: {
    totalTransactions: number;
    approvedCount: number;
    declinedCount: number;
    totalCapturedAmount: number;
  };
}

export interface PaymentGatewayMetadataResponse {
  metadata: {
    configTypes: { paymentGatewayConfigTypeId: string; description: string }[];
    serviceTypes: { enumId: string; description: string }[];
    transCodes: { enumId: string; description: string }[];
    paymentMethodTypes: { paymentMethodTypeId: string; description: string }[];
  };
}





