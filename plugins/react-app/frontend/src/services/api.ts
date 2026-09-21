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

export interface InvoiceRoleItem {
  invoiceId: string;
  partyId: string;
  partyName?: string;
  roleTypeId: string;
  roleTypeDesc?: string;
  datetimePerformed?: string;
  percentage?: number;
}

export interface InvoiceAttributeItem {
  invoiceId: string;
  attrName: string;
  attrValue?: string;
  attrDescription?: string;
}

export interface InvoiceContactMechItem {
  invoiceId: string;
  contactMechId: string;
  contactMechPurposeTypeId: string;
  contactMechPurposeTypeDesc?: string;
  detailInfo?: string;
}

export interface InvoiceContentItem {
  invoiceId: string;
  contentId: string;
  invoiceContentTypeId: string;
  invoiceContentTypeDesc?: string;
  contentName?: string;
  description?: string;
  contentTypeId?: string;
  fromDate?: string;
}

export interface InvoiceRolesAndAttributesMetadataResponse {
  purposeTypes: { contactMechPurposeTypeId: string; description: string }[];
  roleTypes: { roleTypeId: string; description: string }[];
  partyContactMechs: {
    contactMechId: string;
    partyId: string;
    partyName: string;
    contactMechTypeId: string;
    detailInfo: string;
  }[];
  attributePresets: {
    attrName: string;
    label: string;
    placeholder: string;
  }[];
  invoiceContentTypes?: {
    invoiceContentTypeId: string;
    description: string;
  }[];
}

export interface InvoiceDetailResponse {
  invoice: InvoiceHeader;
  items: InvoiceItem[];
  statusHistory: InvoiceStatusHistory[];
  paymentsApplied: PaymentApplication[];
  totals: InvoiceTotals;
  roles?: InvoiceRoleItem[];
  attributes?: InvoiceAttributeItem[];
  contactMechs?: InvoiceContactMechItem[];
  contents?: InvoiceContentItem[];
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

export interface OpenPaymentItem {
  paymentId: string;
  paymentTypeId: string;
  partyIdFrom: string;
  partyIdTo: string;
  effectiveDate: string;
  statusId: string;
  amount: number;
  unappliedAmount: number;
  currencyUomId: string;
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

export interface FinAccountRoleItem {
  finAccountId: string;
  partyId: string;
  partyName?: string;
  roleTypeId: string;
  roleTypeDesc: string;
  fromDate: string;
  thruDate?: string;
}

export interface FinAccountAuthItem {
  finAccountAuthId: string;
  finAccountId: string;
  amount: number;
  authorizationDate: string;
  fromDate: string;
  thruDate?: string;
  isExpired: boolean;
}

export interface CreateFinAccountRolePayload {
  finAccountId: string;
  partyId: string;
  roleTypeId: string;
  fromDate?: string;
  thruDate?: string;
}

export interface DeleteFinAccountRolePayload {
  finAccountId: string;
  partyId: string;
  roleTypeId: string;
  fromDate: string;
}

export interface CreateFinAccountAuthPayload {
  finAccountId: string;
  amount: number;
  thruDate?: string;
}

export interface ExpireFinAccountAuthPayload {
  finAccountAuthId: string;
}

export interface FinAccountDetailResponse {
  account: FinAccountDetail;
  transactions: FinAccountTransItem[];
  reconciliations: any[];
  roles?: FinAccountRoleItem[];
  authorizations?: FinAccountAuthItem[];
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
    roleTypes?: { roleTypeId: string; description: string }[];
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

// ═════════════════════════════════════════════════════════════════
// FAZ 8: BILLING ACCOUNT STATEMENT, ROLES, TERMS & MASS INVOICE INTERFACES
// ═════════════════════════════════════════════════════════════════

export interface BillingAccountStatementEntry {
  id: string;
  entryType: 'INVOICE' | 'PAYMENT';
  refNum: string;
  entryDate: string;
  description: string;
  partyId?: string;
  partyName?: string;
  debit: number;
  credit: number;
  runningBalance: number;
  statusId?: string;
  currencyUomId: string;
}

export interface BillingAccountAppliedPaymentItem {
  paymentApplicationId: string;
  paymentId: string;
  invoiceId?: string;
  amountApplied: number;
  effectiveDate?: string;
  paymentTypeId?: string;
  paymentMethodTypeId?: string;
  partyIdFrom?: string;
  partyNameFrom?: string;
  statusId?: string;
}

export interface BillingAccountStatementSummary {
  billingAccountId: string;
  accountLimit: number;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  availableBalance: number;
  utilizationPercent: number;
  currencyUomId: string;
  description?: string;
  fromDate?: string;
  thruDate?: string;
  entryCount: number;
}

export interface BillingAccountStatementResponse {
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
  summary: BillingAccountStatementSummary;
  entries: BillingAccountStatementEntry[];
  roles: BillingAccountRoleItem[];
  terms: BillingAccountTermItem[];
  appliedPayments: BillingAccountAppliedPaymentItem[];
}

export interface CreateBillingAccountRolePayload {
  billingAccountId: string;
  partyId: string;
  roleTypeId: string;
  fromDate?: string;
  thruDate?: string;
}

export interface CreateBillingAccountTermPayload {
  billingAccountId: string;
  termTypeId: string;
  termValue?: number;
  termDays?: number;
  description?: string;
  uomId?: string;
}

export interface ApplyPaymentToBillingAccountPayload {
  billingAccountId: string;
  paymentId: string;
  amountApplied: number;
}

export interface MassChangeInvoiceStatusPayload {
  invoiceIds: string | string[];
  statusId: string;
}

export interface MassChangeInvoiceStatusResponse {
  successCount: number;
  failureCount: number;
  errors?: string[];
  _EVENT_MESSAGE_?: string;
}

// ═════════════════════════════════════════════════════════════════
// FAZ 9: TAX SETTLEMENT / VAT RETURNS & PARTY STATEMENTS
// ═════════════════════════════════════════════════════════════════

export interface TaxSettlementSummary {
  taxAuthPartyId: string;
  taxAuthGeoId: string;
  taxAuthPartyName: string;
  fromDate: string;
  thruDate: string;
  totalTaxableSales: number;
  totalTaxCollected: number;
  totalTaxablePurchases: number;
  totalTaxPaid: number;
  netTaxDue: number;
  isPayable: boolean;
  lineItemCount: number;
}

export interface TaxSettlementRateGroup {
  taxAuthRateSeqId: string;
  rateName: string;
  taxableSales: number;
  taxCollected: number;
  taxablePurchases: number;
  taxPaid: number;
  netTax: number;
}

export interface TaxSettlementLineItem {
  invoiceId: string;
  invoiceItemSeqId: string;
  invoiceTypeId: string;
  invoiceDate: string;
  partyId: string;
  partyName: string;
  statusId: string;
  description: string;
  taxableBase: number;
  taxAmount: number;
  currencyUomId: string;
  isSales: boolean;
}

export interface TaxAuthorityReportResponse {
  summary: TaxSettlementSummary;
  rateBreakdown: TaxSettlementRateGroup[];
  lineItems: TaxSettlementLineItem[];
}

export interface PartyTaxAuthInfoItem {
  partyId: string;
  partyName: string;
  taxAuthPartyId: string;
  taxAuthGeoId: string;
  partyTaxId: string;
  isExempt: string;
  isNexus: string;
  fromDate: string;
  thruDate: string;
}

export interface CreatePartyTaxAuthInfoPayload {
  partyId: string;
  taxAuthPartyId: string;
  taxAuthGeoId: string;
  partyTaxId?: string;
  isExempt?: string;
  isNexus?: string;
  fromDate?: string;
  thruDate?: string;
}

export interface TaxAuthorityCategoryItem {
  taxAuthPartyId: string;
  taxAuthGeoId: string;
  productCategoryId: string;
  categoryName: string;
  description?: string;
}

export interface PartyStatementSummary {
  partyId: string;
  partyName: string;
  totalInvoiced: number;
  totalPaid: number;
  openBalance: number;
  fromDate?: string;
  thruDate?: string;
  entryCount: number;
}

export interface PartyAgingSummary {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days90Plus: number;
  totalOverdue: number;
}

export interface PartyStatementEntry {
  id: string;
  entryType: 'INVOICE' | 'PAYMENT';
  refNum: string;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  statusId: string;
  currencyUomId: string;
}

export interface PartyOpenInvoiceItem {
  invoiceId: string;
  invoiceTypeId: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  outstandingAmount: number;
  daysOverdue: number;
  currencyUomId: string;
  statusId: string;
}

export interface PartyUnappliedPaymentItem {
  paymentId: string;
  paymentTypeId: string;
  effectiveDate: string;
  amount: number;
  unappliedAmount: number;
  statusId: string;
  currencyUomId: string;
}

export interface PartyFinancialStatementResponse {
  party: PartyStatementSummary;
  aging: PartyAgingSummary;
  entries: PartyStatementEntry[];
  openInvoices: PartyOpenInvoiceItem[];
  unappliedPayments: PartyUnappliedPaymentItem[];
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

// 2.1 Fixed Asset Lifecycle, Depreciation Engine, Maintenance, Meters & Assignments
export interface FixedAssetDepreciationScheduleItem {
  year: number;
  yearNumber: number;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

export interface FixedAssetGlTransactionItem {
  acctgTransId: string;
  transactionDate: string;
  description: string;
  isPosted: string;
  postedDate: string;
  amount: number;
  glJournalId: string;
}

export interface FixedAssetDepreciationResponse {
  fixedAssetId: string;
  purchaseCost: number;
  salvageValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  usefulYears: number;
  depreciationMethod: string;
  nextSuggestedAmount: number;
  projectionSchedule: FixedAssetDepreciationScheduleItem[];
  transactionHistory: FixedAssetGlTransactionItem[];
}

export interface PostFixedAssetDepreciationPayload {
  fixedAssetId: string;
  amount?: number;
  organizationPartyId?: string;
  description?: string;
  debitGlAccountId?: string;
  creditGlAccountId?: string;
}

export interface BatchDepreciationResultItem {
  fixedAssetId: string;
  fixedAssetName: string;
  acctgTransId: string;
  depreciationAmount: number;
}

export interface BatchDepreciationResponse {
  processedCount: number;
  totalBatchDepreciation: number;
  createdTransactions: BatchDepreciationResultItem[];
  _EVENT_MESSAGE_?: string;
}

export interface FixedAssetMaintItem {
  fixedAssetId: string;
  maintHistSeqId: string;
  statusId: string;
  productMaintTypeId: string;
  maintenanceDate: string;
  intervalQuantity?: number | null;
  intervalUomId?: string;
  intervalMeterTypeId?: string;
  purchaseOrderId?: string;
  comments?: string;
}

export interface CreateFixedAssetMaintPayload {
  fixedAssetId: string;
  productMaintTypeId?: string;
  statusId?: string;
  maintenanceDate?: string;
  intervalQuantity?: number;
  intervalUomId?: string;
  intervalMeterTypeId?: string;
  purchaseOrderId?: string;
  comments?: string;
}

export interface FixedAssetMeterItem {
  fixedAssetId: string;
  productMeterTypeId: string;
  readingDate: string;
  meterValue: number;
}

export interface CreateFixedAssetMeterPayload {
  fixedAssetId: string;
  productMeterTypeId?: string;
  readingDate?: string;
  meterValue: number;
}

export interface FixedAssetAssignmentItem {
  fixedAssetId: string;
  partyId: string;
  partyName: string;
  roleTypeId: string;
  fromDate: string;
  thruDate: string;
  statusId: string;
  allocatedCost?: number | null;
  comments?: string;
  isActive: boolean;
}

export interface CreateFixedAssetAssignmentPayload {
  fixedAssetId: string;
  partyId: string;
  roleTypeId?: string;
  fromDate?: string;
  thruDate?: string;
  allocatedCost?: number;
  comments?: string;
}

export interface FixedAssetRegistrationItem {
  fixedAssetId: string;
  fromDate: string;
  thruDate: string;
  registrationDate: string;
  govAgencyPartyId: string;
  registrationNumber: string;
  licenseNumber: string;
}

export interface FixedAssetIdentItem {
  fixedAssetId: string;
  fixedAssetIdentTypeId: string;
  idValue: string;
}

export interface FixedAssetRegistrationsResponse {
  registrations: FixedAssetRegistrationItem[];
  identifications: FixedAssetIdentItem[];
}

export interface CreateFixedAssetRegistrationPayload {
  fixedAssetId: string;
  fromDate?: string;
  thruDate?: string;
  registrationDate?: string;
  govAgencyPartyId?: string;
  registrationNumber?: string;
  licenseNumber?: string;
  fixedAssetIdentTypeId?: string;
  idValue?: string;
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
// PHASE 7: BUDGET VARIANCE, REVISIONS & AGREEMENT EXTENDED DETAILS
// ==========================================

export interface BudgetVarianceItem {
  budgetItemSeqId: string;
  budgetItemTypeId: string;
  budgetItemTypeDesc: string;
  purpose: string;
  justification: string;
  budgetAmount: number;
  actualAmount: number;
  varianceAmount: number;
  usagePercentage: number;
  statusIndicator: 'ON_TRACK' | 'WARNING' | 'OVER_BUDGET';
}

export interface BudgetVarianceReportResponse {
  budgetId: string;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  overallUsagePct: number;
  items: BudgetVarianceItem[];
}

export interface BudgetRevisionImpactItem {
  budgetItemSeqId: string;
  revisedAmount: number;
  addDeleteFlag: string;
}

export interface BudgetRevisionItem {
  budgetId: string;
  revisionSeqId: string;
  dateRevised: string;
  revisionReason: string;
  impacts: BudgetRevisionImpactItem[];
}

export interface CreateBudgetRevisionPayload {
  budgetId: string;
  budgetItemSeqId: string;
  revisedAmount: number;
  revisionReason?: string;
  comments?: string;
}

export interface UpdateBudgetItemPayload {
  budgetId: string;
  budgetItemSeqId: string;
  amount?: number;
  purpose?: string;
  justification?: string;
  budgetItemTypeId?: string;
}

export interface AgreementItemRecord {
  agreementItemSeqId: string;
  agreementItemTypeId: string;
  agreementItemTypeDesc: string;
  currencyUomId: string;
  agreementText: string;
}

export interface AgreementTermRecord {
  agreementTermId: string;
  agreementItemSeqId: string;
  termTypeId: string;
  termTypeDesc: string;
  termValue: number;
  termDays: number;
  textValue: string;
  description: string;
}

export interface AgreementProductPriceRecord {
  agreementId: string;
  agreementItemSeqId: string;
  productId: string;
  productName: string;
  price: number;
}

export interface AgreementPartyRecord {
  agreementId: string;
  agreementItemSeqId: string;
  partyId: string;
  partyName: string;
}

export interface AgreementStatusHistoryRecord {
  agreementStatusId: string;
  statusId: string;
  statusDate: string;
  comments: string;
  setByUserLoginId: string;
}

export interface AgreementExtendedDetailResponse {
  agreement: {
    agreementId: string;
    agreementTypeId: string;
    agreementTypeDesc: string;
    partyIdFrom: string;
    partyFromDesc: string;
    partyIdTo: string;
    partyToDesc: string;
    description: string;
    textData: string;
    statusId: string;
    agreementDate: string;
    fromDate: string;
    thruDate: string;
  };
  items: AgreementItemRecord[];
  terms: AgreementTermRecord[];
  productPrices: AgreementProductPriceRecord[];
  parties: AgreementPartyRecord[];
  statuses: AgreementStatusHistoryRecord[];
}

export interface CreateAgreementItemPayload {
  agreementId: string;
  agreementItemTypeId?: string;
  currencyUomId?: string;
  agreementText?: string;
}

export interface CreateAgreementTermPayload {
  agreementId: string;
  agreementItemSeqId?: string;
  termTypeId?: string;
  termValue?: number;
  termDays?: number;
  description?: string;
  textValue?: string;
}

export interface CreateAgreementProductPricePayload {
  agreementId: string;
  agreementItemSeqId?: string;
  productId: string;
  price: number;
  currencyUomId?: string;
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
    credentials: options?.credentials || 'same-origin',
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
  if (data._ERROR_MESSAGE_LIST_) {
    const list = Array.isArray(data._ERROR_MESSAGE_LIST_)
      ? data._ERROR_MESSAGE_LIST_.join('\n')
      : String(data._ERROR_MESSAGE_LIST_);
    throw new Error(list);
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

  // 10b. Roles, Attributes & Contact Mechs (Phase 4)
  getInvoiceRolesAndAttributesMetadata: async (invoiceId: string): Promise<InvoiceRolesAndAttributesMetadataResponse> => {
    return requestApi<InvoiceRolesAndAttributesMetadataResponse>(`getInvoiceRolesAndAttributesMetadata?invoiceId=${encodeURIComponent(invoiceId)}`);
  },

  createInvoiceRole: async (payload: { invoiceId: string; partyId: string; roleTypeId: string; percentage?: number }): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('createInvoiceRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeInvoiceRole: async (payload: { invoiceId: string; partyId: string; roleTypeId: string }): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('removeInvoiceRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  createInvoiceAttribute: async (payload: { invoiceId: string; attrName: string; attrValue?: string; attrDescription?: string }): Promise<{ invoiceId: string; attrName: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; attrName: string; _EVENT_MESSAGE_?: string }>('createInvoiceAttribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  deleteInvoiceAttribute: async (payload: { invoiceId: string; attrName: string }): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('deleteInvoiceAttribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  createInvoiceContactMech: async (payload: { invoiceId: string; contactMechId: string; contactMechPurposeTypeId: string }): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('createInvoiceContactMech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  deleteInvoiceContactMech: async (payload: { invoiceId: string; contactMechId: string; contactMechPurposeTypeId: string }): Promise<{ invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; _EVENT_MESSAGE_?: string }>('deleteInvoiceContactMech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  // 10c. Invoice Content & Email Delivery (Phase 5)
  createInvoiceContent: async (payload: { invoiceId: string; contentName: string; invoiceContentTypeId?: string; description?: string }): Promise<{ contentId: string; invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ contentId: string; invoiceId: string; _EVENT_MESSAGE_?: string }>('createInvoiceContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  deleteInvoiceContent: async (payload: { invoiceId: string; contentId: string; invoiceContentTypeId?: string }): Promise<{ contentId: string; invoiceId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ contentId: string; invoiceId: string; _EVENT_MESSAGE_?: string }>('deleteInvoiceContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  sendInvoiceEmail: async (payload: { invoiceId: string; sendTo: string; sendCc?: string; subject?: string; bodyText?: string }): Promise<{ invoiceId: string; sendTo: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ invoiceId: string; sendTo: string; _EVENT_MESSAGE_?: string }>('sendInvoiceEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
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

  // 17b. Get Open Payments for Matching to Invoice
  getOpenPaymentsForInvoice: async (invoiceId: string): Promise<{ openPayments: OpenPaymentItem[] }> => {
    return requestApi<{ openPayments: OpenPaymentItem[] }>(`getOpenPaymentsForInvoice?invoiceId=${encodeURIComponent(invoiceId)}`);
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

  // ═════════════════════════════════════════════════════════════════
  // FAZ 8: BILLING ACCOUNT STATEMENT, ROLES, TERMS & MASS INVOICE API METHODS
  // ═════════════════════════════════════════════════════════════════

  getBillingAccountStatement: async (billingAccountId: string, fromDate?: string, thruDate?: string): Promise<BillingAccountStatementResponse> => {
    const q = new URLSearchParams({ billingAccountId });
    if (fromDate) q.append('fromDate', fromDate);
    if (thruDate) q.append('thruDate', thruDate);
    return requestApi<BillingAccountStatementResponse>(`getBillingAccountStatement?${q.toString()}`);
  },

  createBillingAccountRole: async (payload: CreateBillingAccountRolePayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createBillingAccountRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeBillingAccountRole: async (billingAccountId: string, partyId: string, roleTypeId: string, fromDate: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeBillingAccountRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ billingAccountId, partyId, roleTypeId, fromDate }),
    });
  },

  createBillingAccountTerm: async (payload: CreateBillingAccountTermPayload): Promise<{ billingAccountTermId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi('createBillingAccountTerm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeBillingAccountTerm: async (billingAccountTermId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeBillingAccountTerm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ billingAccountTermId }),
    });
  },

  applyPaymentToBillingAccount: async (payload: ApplyPaymentToBillingAccountPayload): Promise<{ paymentApplicationId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi('applyPaymentToBillingAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeBillingAccountPaymentApplication: async (paymentApplicationId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeBillingAccountPaymentApplication', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentApplicationId }),
    });
  },

  massChangeInvoiceStatus: async (payload: MassChangeInvoiceStatusPayload): Promise<MassChangeInvoiceStatusResponse> => {
    const formattedPayload = {
      invoiceIds: Array.isArray(payload.invoiceIds) ? JSON.stringify(payload.invoiceIds) : payload.invoiceIds,
      statusId: payload.statusId,
    };
    return requestApi<MassChangeInvoiceStatusResponse>('massChangeInvoiceStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(formattedPayload),
    });
  },

  // ═════════════════════════════════════════════════════════════════
  // FAZ 9: TAX SETTLEMENT & PARTY STATEMENT API METHODS
  // ═════════════════════════════════════════════════════════════════

  getTaxAuthorityReport: async (taxAuthPartyId: string, taxAuthGeoId: string, fromDate?: string, thruDate?: string): Promise<TaxAuthorityReportResponse> => {
    const q = new URLSearchParams({ taxAuthPartyId, taxAuthGeoId });
    if (fromDate) q.append('fromDate', fromDate);
    if (thruDate) q.append('thruDate', thruDate);
    return requestApi<TaxAuthorityReportResponse>(`getTaxAuthorityReport?${q.toString()}`);
  },

  getPartyTaxAuthInfos: async (taxAuthPartyId: string, taxAuthGeoId: string): Promise<{ taxAuthParties: PartyTaxAuthInfoItem[] }> => {
    const q = new URLSearchParams({ taxAuthPartyId, taxAuthGeoId });
    return requestApi<{ taxAuthParties: PartyTaxAuthInfoItem[] }>(`getPartyTaxAuthInfos?${q.toString()}`);
  },

  createPartyTaxAuthInfo: async (payload: CreatePartyTaxAuthInfoPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createPartyTaxAuthInfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  deletePartyTaxAuthInfo: async (partyId: string, taxAuthPartyId: string, taxAuthGeoId: string, fromDate: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('deletePartyTaxAuthInfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ partyId, taxAuthPartyId, taxAuthGeoId, fromDate }),
    });
  },

  getTaxAuthorityCategories: async (taxAuthPartyId: string, taxAuthGeoId: string): Promise<{ categories: TaxAuthorityCategoryItem[] }> => {
    const q = new URLSearchParams({ taxAuthPartyId, taxAuthGeoId });
    return requestApi<{ categories: TaxAuthorityCategoryItem[] }>(`getTaxAuthorityCategories?${q.toString()}`);
  },

  createTaxAuthorityCategory: async (taxAuthPartyId: string, taxAuthGeoId: string, productCategoryId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createTaxAuthorityCategory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ taxAuthPartyId, taxAuthGeoId, productCategoryId }),
    });
  },

  deleteTaxAuthorityCategory: async (taxAuthPartyId: string, taxAuthGeoId: string, productCategoryId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('deleteTaxAuthorityCategory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ taxAuthPartyId, taxAuthGeoId, productCategoryId }),
    });
  },

  getPartyFinancialStatement: async (partyId: string, fromDate?: string, thruDate?: string): Promise<PartyFinancialStatementResponse> => {
    const q = new URLSearchParams({ partyId });
    if (fromDate) q.append('fromDate', fromDate);
    if (thruDate) q.append('thruDate', thruDate);
    return requestApi<PartyFinancialStatementResponse>(`getPartyFinancialStatement?${q.toString()}`);
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

  // Fixed Asset Lifecycle, Depreciation Engine, Maintenance, Meters & Assignments
  getFixedAssetDepreciation: async (fixedAssetId: string): Promise<FixedAssetDepreciationResponse> => {
    return requestApi<FixedAssetDepreciationResponse>(`getFixedAssetDepreciation?fixedAssetId=${encodeURIComponent(fixedAssetId)}`);
  },

  postFixedAssetDepreciation: async (payload: PostFixedAssetDepreciationPayload): Promise<{ acctgTransId: string; depreciationAmount: number; totalDepreciation: number; netBookValue: number; _EVENT_MESSAGE_?: string }> => {
    return requestApi('postFixedAssetDepreciation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  runBatchDepreciation: async (payload: { organizationPartyId?: string; fixedAssetTypeId?: string } = {}): Promise<BatchDepreciationResponse> => {
    return requestApi<BatchDepreciationResponse>('runBatchDepreciation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  getFixedAssetMaintenances: async (fixedAssetId: string): Promise<{ maintenances: FixedAssetMaintItem[] }> => {
    return requestApi<{ maintenances: FixedAssetMaintItem[] }>(`getFixedAssetMaintenances?fixedAssetId=${encodeURIComponent(fixedAssetId)}`);
  },

  createFixedAssetMaint: async (payload: CreateFixedAssetMaintPayload): Promise<{ maintHistSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi('createFixedAssetMaint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  updateFixedAssetMaintStatus: async (payload: { fixedAssetId: string; maintHistSeqId: string; statusId: string; comments?: string }): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('updateFixedAssetMaintStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  getFixedAssetMeters: async (fixedAssetId: string): Promise<{ meters: FixedAssetMeterItem[] }> => {
    return requestApi<{ meters: FixedAssetMeterItem[] }>(`getFixedAssetMeters?fixedAssetId=${encodeURIComponent(fixedAssetId)}`);
  },

  createFixedAssetMeter: async (payload: CreateFixedAssetMeterPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createFixedAssetMeter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  getFixedAssetAssignments: async (fixedAssetId: string): Promise<{ assignments: FixedAssetAssignmentItem[] }> => {
    return requestApi<{ assignments: FixedAssetAssignmentItem[] }>(`getFixedAssetAssignments?fixedAssetId=${encodeURIComponent(fixedAssetId)}`);
  },

  createFixedAssetAssignment: async (payload: CreateFixedAssetAssignmentPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createFixedAssetAssignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  releaseFixedAssetAssignment: async (payload: { fixedAssetId: string; partyId: string; roleTypeId: string; fromDate: string }): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('releaseFixedAssetAssignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  getFixedAssetRegistrations: async (fixedAssetId: string): Promise<FixedAssetRegistrationsResponse> => {
    return requestApi<FixedAssetRegistrationsResponse>(`getFixedAssetRegistrations?fixedAssetId=${encodeURIComponent(fixedAssetId)}`);
  },

  createFixedAssetRegistration: async (payload: CreateFixedAssetRegistrationPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createFixedAssetRegistration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
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
  // PHASE 7: BUDGET VARIANCE, REVISIONS & AGREEMENT EXTENDED DETAILS
  // ==========================================

  getBudgetVarianceReport: async (budgetId: string): Promise<BudgetVarianceReportResponse> => {
    return requestApi<BudgetVarianceReportResponse>(`getBudgetVarianceReport?budgetId=${encodeURIComponent(budgetId)}`);
  },

  getBudgetRevisions: async (budgetId: string): Promise<{ revisions: BudgetRevisionItem[] }> => {
    return requestApi<{ revisions: BudgetRevisionItem[] }>(`getBudgetRevisions?budgetId=${encodeURIComponent(budgetId)}`);
  },

  createBudgetRevision: async (payload: CreateBudgetRevisionPayload): Promise<{ revisionSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ revisionSeqId: string; _EVENT_MESSAGE_?: string }>('createBudgetRevision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  updateBudgetItem: async (payload: UpdateBudgetItemPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('updateBudgetItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeBudgetItem: async (budgetId: string, budgetItemSeqId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeBudgetItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ budgetId, budgetItemSeqId }),
    });
  },

  getAgreementExtendedDetails: async (agreementId: string): Promise<AgreementExtendedDetailResponse> => {
    return requestApi<AgreementExtendedDetailResponse>(`getAgreementExtendedDetails?agreementId=${encodeURIComponent(agreementId)}`);
  },

  createAgreementItem: async (payload: CreateAgreementItemPayload): Promise<{ agreementItemSeqId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi('createAgreementItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeAgreementItem: async (agreementId: string, agreementItemSeqId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeAgreementItem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ agreementId, agreementItemSeqId }),
    });
  },

  createAgreementTerm: async (payload: CreateAgreementTermPayload): Promise<{ agreementTermId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi('createAgreementTerm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeAgreementTerm: async (agreementTermId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeAgreementTerm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ agreementTermId }),
    });
  },

  createAgreementProductPrice: async (payload: CreateAgreementProductPricePayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('createAgreementProductPrice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  removeAgreementProductPrice: async (agreementId: string, productId: string, agreementItemSeqId: string = '00001'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('removeAgreementProductPrice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ agreementId, productId, agreementItemSeqId }),
    });
  },

  setAgreementStatus: async (agreementId: string, statusId: string, comments?: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi('setAgreementStatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ agreementId, statusId, comments }),
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

  // ═════════════════════════════════════════════════════════════════
  // Aşama 4: Toplu Çek Koşusu, Çek Yazdırma & İptal (Check Run & Voiding)
  // ═════════════════════════════════════════════════════════════════
  getCheckRuns: async (search?: string): Promise<{ checkRuns: CheckRunItem[]; stats: CheckRunStats }> => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return requestApi<{ checkRuns: CheckRunItem[]; stats: CheckRunStats }>(`getCheckRuns${q}`);
  },
  getCheckRunDetail: async (paymentGroupId: string): Promise<{ checkRun: CheckRunDetail }> => {
    return requestApi<{ checkRun: CheckRunDetail }>(`getCheckRunDetail?paymentGroupId=${encodeURIComponent(paymentGroupId)}`);
  },
  getPayableInvoicesForCheckRun: async (params?: { vendorPartyId?: string; asOfDate?: string }): Promise<{ payableInvoices: PayableInvoiceItem[]; totalOutstanding: number; invoiceCount: number }> => {
    const q = new URLSearchParams();
    if (params?.vendorPartyId) q.append('vendorPartyId', params.vendorPartyId);
    if (params?.asOfDate) q.append('asOfDate', params.asOfDate);
    const query = q.toString();
    return requestApi<{ payableInvoices: PayableInvoiceItem[]; totalOutstanding: number; invoiceCount: number }>(query ? `getPayableInvoicesForCheckRun?${query}` : 'getPayableInvoicesForCheckRun');
  },
  createCheckRun: async (payload: { paymentMethodId: string; invoiceIds: string[]; checkStartNumber?: number; paymentGroupName?: string; organizationPartyId?: string }): Promise<{ paymentGroupId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentGroupId: string; _EVENT_MESSAGE_?: string }>('createCheckRun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({
        paymentMethodId: payload.paymentMethodId,
        invoiceIds: JSON.stringify(payload.invoiceIds),
        checkStartNumber: payload.checkStartNumber !== undefined ? String(payload.checkStartNumber) : '',
        paymentGroupName: payload.paymentGroupName || '',
        organizationPartyId: payload.organizationPartyId || 'Company',
      }),
    });
  },
  cancelCheckRun: async (paymentGroupId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('cancelCheckRun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentGroupId }),
    });
  },
  voidPaymentRecord: async (paymentId: string): Promise<{ paymentId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ paymentId: string; _EVENT_MESSAGE_?: string }>('voidPaymentRecord', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ paymentId }),
    });
  },
  getCheckPrintData: async (params: { paymentGroupId?: string; paymentId?: string }): Promise<{ vouchers: CheckVoucherItem[]; voucherCount: number }> => {
    const q = new URLSearchParams();
    if (params.paymentGroupId) q.append('paymentGroupId', params.paymentGroupId);
    if (params.paymentId) q.append('paymentId', params.paymentId);
    return requestApi<{ vouchers: CheckVoucherItem[]; voucherCount: number }>(`getCheckPrintData?${q.toString()}`);
  },
  getCheckRunMetadata: async (): Promise<CheckRunMetadataResponse> => {
    return requestApi<CheckRunMetadataResponse>('getCheckRunMetadata');
  },

  // ═════════════════════════════════════════════════════════════════
  // Aşama 5: Satış Komisyonları & Stok Değerleme (Commission & Inventory Reports)
  // ═════════════════════════════════════════════════════════════════
  getCommissionRuns: async (params?: { search?: string; salesRepPartyId?: string }): Promise<{ commissionRuns: CommissionRunItem[]; stats: CommissionStats }> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.salesRepPartyId) q.append('salesRepPartyId', params.salesRepPartyId);
    const query = q.toString();
    return requestApi<{ commissionRuns: CommissionRunItem[]; stats: CommissionStats }>(query ? `getCommissionRuns?${query}` : 'getCommissionRuns');
  },
  getEligibleSalesInvoices: async (params?: { salesRepPartyId?: string; fromDate?: string; thruDate?: string }): Promise<{ eligibleInvoices: EligibleSalesInvoiceItem[]; totalSalesVolume: number; totalEstimatedCommission: number; invoiceCount: number }> => {
    const q = new URLSearchParams();
    if (params?.salesRepPartyId) q.append('salesRepPartyId', params.salesRepPartyId);
    if (params?.fromDate) q.append('fromDate', params.fromDate);
    if (params?.thruDate) q.append('thruDate', params.thruDate);
    const query = q.toString();
    return requestApi<{ eligibleInvoices: EligibleSalesInvoiceItem[]; totalSalesVolume: number; totalEstimatedCommission: number; invoiceCount: number }>(query ? `getEligibleSalesInvoices?${query}` : 'getEligibleSalesInvoices');
  },
  createCommissionRun: async (payload: { invoiceIds: string[]; salesRepPartyId?: string; commissionRate?: number; description?: string }): Promise<{ createdInvoices: Array<{ commissionInvoiceId: string; salesRepPartyId: string; salesRepName: string; salesInvoiceCount: number; commissionAmount: number }>; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ createdInvoices: Array<{ commissionInvoiceId: string; salesRepPartyId: string; salesRepName: string; salesInvoiceCount: number; commissionAmount: number }>; _EVENT_MESSAGE_?: string }>('createCommissionRun', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({
        invoiceIds: JSON.stringify(payload.invoiceIds),
        salesRepPartyId: payload.salesRepPartyId || '',
        commissionRate: payload.commissionRate !== undefined ? String(payload.commissionRate) : '',
        description: payload.description || '',
      }),
    });
  },
  getInventoryValuationReport: async (params?: { facilityId?: string; search?: string }): Promise<{ valuationList: InventoryValuationItem[]; summary: InventoryValuationSummary }> => {
    const q = new URLSearchParams();
    if (params?.facilityId) q.append('facilityId', params.facilityId);
    if (params?.search) q.append('search', params.search);
    const query = q.toString();
    return requestApi<{ valuationList: InventoryValuationItem[]; summary: InventoryValuationSummary }>(query ? `getInventoryValuationReport?${query}` : 'getInventoryValuationReport');
  },
  getPastDueInvoicesReport: async (params?: { invoiceTypeId?: string }): Promise<{ pastDueInvoices: PastDueInvoiceItem[]; dueSoonInvoices: PastDueInvoiceItem[]; summary: PastDueSummary }> => {
    const q = params?.invoiceTypeId ? `?invoiceTypeId=${encodeURIComponent(params.invoiceTypeId)}` : '';
    return requestApi<{ pastDueInvoices: PastDueInvoiceItem[]; dueSoonInvoices: PastDueInvoiceItem[]; summary: PastDueSummary }>(`getPastDueInvoicesReport${q}`);
  },
  getCommissionMetadata: async (): Promise<CommissionMetadataResponse> => {
    return requestApi<CommissionMetadataResponse>('getCommissionMetadata');
  },

  // Phase 10: Extended GL Mappings
  getVarianceReasonGlAccounts: async (): Promise<{ varianceReasonGlAccounts: VarianceReasonGlAccountItem[] }> => {
    return requestApi<{ varianceReasonGlAccounts: VarianceReasonGlAccountItem[] }>('getVarianceReasonGlAccounts');
  },
  createVarianceReasonGlAccount: async (payload: CreateVarianceReasonGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createVarianceReasonGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteVarianceReasonGlAccount: async (varianceReasonId: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteVarianceReasonGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ varianceReasonId, organizationPartyId }),
    });
  },
  getPartyGlAccounts: async (): Promise<{ partyGlAccounts: PartyGlAccountItem[] }> => {
    return requestApi<{ partyGlAccounts: PartyGlAccountItem[] }>('getPartyGlAccounts');
  },
  createPartyGlAccount: async (payload: CreatePartyGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createPartyGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deletePartyGlAccount: async (partyId: string, glAccountTypeId: string, roleTypeId: string = '_NA_', organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deletePartyGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ partyId, glAccountTypeId, roleTypeId, organizationPartyId }),
    });
  },
  getCreditCardTypeGlAccounts: async (): Promise<{ creditCardTypeGlAccounts: CreditCardTypeGlAccountItem[] }> => {
    return requestApi<{ creditCardTypeGlAccounts: CreditCardTypeGlAccountItem[] }>('getCreditCardTypeGlAccounts');
  },
  createCreditCardTypeGlAccount: async (payload: CreateCreditCardTypeGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createCreditCardTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteCreditCardTypeGlAccount: async (cardType: string, organizationPartyId: string = 'Company'): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteCreditCardTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ cardType, organizationPartyId }),
    });
  },
  getExtendedGlMetadata: async (): Promise<ExtendedGlMetadataResponse> => {
    return requestApi<ExtendedGlMetadataResponse>('getExtendedGlMetadata');
  },

  // Phase 10: Batch Journal Entry Posting
  batchPostJournalEntries: async (acctgTransIds: string[]): Promise<BatchPostJournalEntriesResponse> => {
    return requestApi<BatchPostJournalEntriesResponse>('batchPostJournalEntries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ acctgTransIds: JSON.stringify(acctgTransIds) }),
    });
  },

  // Phase 10: Cost Component Calculations
  getCostComponentCalcs: async (): Promise<{ costCalcs: CostComponentCalcItem[] }> => {
    return requestApi<{ costCalcs: CostComponentCalcItem[] }>('getCostComponentCalcs');
  },
  createCostComponentCalc: async (payload: CreateCostComponentCalcPayload): Promise<{ costComponentCalcId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ costComponentCalcId: string; _EVENT_MESSAGE_?: string }>('createCostComponentCalc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  updateCostComponentCalc: async (payload: UpdateCostComponentCalcPayload): Promise<{ costComponentCalcId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ costComponentCalcId: string; _EVENT_MESSAGE_?: string }>('updateCostComponentCalc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteCostComponentCalc: async (costComponentCalcId: string): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteCostComponentCalc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData({ costComponentCalcId }),
    });
  },

  // Phase 11: Extended Asset/FinAccount/Category GL & FinAccount Role/Auth
  getFixedAssetTypeGlAccounts: async (): Promise<{ fixedAssetTypeGlAccounts: FixedAssetTypeGlAccountItem[] }> => {
    return requestApi<{ fixedAssetTypeGlAccounts: FixedAssetTypeGlAccountItem[] }>('getFixedAssetTypeGlAccounts');
  },
  createFixedAssetTypeGlAccount: async (payload: CreateFixedAssetTypeGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createFixedAssetTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteFixedAssetTypeGlAccount: async (payload: DeleteFixedAssetTypeGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteFixedAssetTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  getFinAccountTypeGlAccounts: async (): Promise<{ finAccountTypeGlAccounts: FinAccountTypeGlAccountItem[] }> => {
    return requestApi<{ finAccountTypeGlAccounts: FinAccountTypeGlAccountItem[] }>('getFinAccountTypeGlAccounts');
  },
  createFinAccountTypeGlAccount: async (payload: CreateFinAccountTypeGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createFinAccountTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteFinAccountTypeGlAccount: async (payload: DeleteFinAccountTypeGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteFinAccountTypeGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  getProductCategoryGlAccounts: async (): Promise<{ productCategoryGlAccounts: ProductCategoryGlAccountItem[] }> => {
    return requestApi<{ productCategoryGlAccounts: ProductCategoryGlAccountItem[] }>('getProductCategoryGlAccounts');
  },
  createProductCategoryGlAccount: async (payload: CreateProductCategoryGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createProductCategoryGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteProductCategoryGlAccount: async (payload: DeleteProductCategoryGlAccountPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteProductCategoryGlAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },

  createFinAccountRole: async (payload: CreateFinAccountRolePayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('createFinAccountRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  deleteFinAccountRole: async (payload: DeleteFinAccountRolePayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('deleteFinAccountRole', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  createFinAccountAuth: async (payload: CreateFinAccountAuthPayload): Promise<{ finAccountAuthId: string; _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ finAccountAuthId: string; _EVENT_MESSAGE_?: string }>('createFinAccountAuth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
  },
  expireFinAccountAuth: async (payload: ExpireFinAccountAuthPayload): Promise<{ _EVENT_MESSAGE_?: string }> => {
    return requestApi<{ _EVENT_MESSAGE_?: string }>('expireFinAccountAuth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: toFormData(payload),
    });
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

// ═════════════════════════════════════════════════════════════════
// Aşama 4: Toplu Çek Koşusu & Çek Yazdırma Tipleri
// ═════════════════════════════════════════════════════════════════
export interface CheckRunItem {
  paymentGroupId: string;
  paymentGroupName: string;
  paymentGroupTypeId: string;
  fromDate: string | null;
  thruDate: string | null;
  checkCount: number;
  activeCheckCount: number;
  voidedCheckCount: number;
  totalAmount: number;
  status: 'ACTIVE' | 'CANCELLED';
  paymentMethodId?: string;
  finAccountId?: string;
}

export interface CheckRunStats {
  totalCheckRuns: number;
  totalChecksIssued: number;
  totalVoidedChecks: number;
  totalCheckVolume: number;
}

export interface CheckItem {
  paymentId: string;
  paymentRefNum: string;
  partyIdTo: string;
  payeeName: string;
  amount: number;
  currencyUomId: string;
  effectiveDate: string | null;
  statusId: string;
  statusDesc: string;
  paymentMethodId?: string;
  finAccountId?: string;
  comments?: string;
  appliedInvoices: Array<{
    paymentApplicationId: string;
    invoiceId: string;
    amountApplied: number;
  }>;
  memberFromDate: string | null;
  memberThruDate: string | null;
}

export interface CheckRunDetail {
  paymentGroupId: string;
  paymentGroupName: string;
  paymentGroupTypeId: string;
  fromDate: string | null;
  thruDate: string | null;
  totalAmount: number;
  checkCount: number;
  checks: CheckItem[];
}

export interface PayableInvoiceItem {
  invoiceId: string;
  invoiceTypeId: string;
  invoiceDate: string | null;
  dueDate: string | null;
  statusId: string;
  partyIdFrom: string;
  vendorName: string;
  currencyUomId: string;
  totalAmount: number;
  outstandingAmount: number;
  description: string;
}

export interface CheckVoucherItem {
  paymentId: string;
  checkNumber: string;
  date: string;
  amount: number;
  currencyUomId: string;
  amountInWordsEn: string;
  amountInWordsTr: string;
  payee: {
    partyId: string;
    name: string;
  };
  payer: {
    partyId: string;
    name: string;
    bankName: string;
    accountNumber: string;
  };
  memo: string;
  invoices: Array<{
    invoiceId: string;
    invoiceDate: string | null;
    description: string;
    amountApplied: number;
  }>;
  statusId: string;
}

export interface CheckRunMetadataResponse {
  metadata: {
    paymentMethods: Array<{
      paymentMethodId: string;
      paymentMethodTypeId: string;
      finAccountId?: string;
      finAccountName?: string;
      description: string;
    }>;
    nextCheckNumber: number;
    vendors: Array<{
      partyId: string;
      name: string;
    }>;
  };
}

// ═════════════════════════════════════════════════════════════════
// Aşama 5: Satış Komisyonları & Stok Değerleme Tipleri
// ═════════════════════════════════════════════════════════════════
export interface CommissionRunItem {
  invoiceId: string;
  salesRepPartyId: string;
  salesRepName: string;
  payerPartyId: string;
  invoiceDate: string | null;
  dueDate: string | null;
  statusId: string;
  totalAmount: number;
  currencyUomId: string;
  description: string;
  sourceInvoiceCount: number;
  sourceInvoiceIds: string[];
}

export interface CommissionStats {
  totalCommissionVolume: number;
  totalInvoicesGenerated: number;
  activeSalesReps: number;
  pendingSalesInvoices: number;
}

export interface EligibleSalesInvoiceItem {
  invoiceId: string;
  invoiceDate: string | null;
  statusId: string;
  partyId: string;
  customerName: string;
  totalAmount: number;
  salesRepPartyId: string;
  salesRepName: string;
  commissionRate: number;
  estimatedCommission: number;
  currencyUomId: string;
  description: string;
}

export interface InventoryValuationItem {
  inventoryItemId: string;
  productId: string;
  productName: string;
  facilityId: string;
  facilityName: string;
  quantityOnHand: number;
  unitCost: number;
  totalValuation: number;
  currencyUomId: string;
  datetimeReceived: string | null;
}

export interface InventoryValuationSummary {
  totalSkuCount: number;
  totalQuantityOnHand: number;
  totalInventoryValue: number;
  itemCount: number;
}

export interface PastDueInvoiceItem {
  invoiceId: string;
  invoiceTypeId: string;
  invoiceDate: string | null;
  dueDate: string;
  partnerName: string;
  partnerPartyId: string;
  statusId: string;
  totalAmount: number;
  outstandingAmount: number;
  currencyUomId: string;
  daysOverdue: number;
}

export interface PastDueSummary {
  totalPastDueCount: number;
  totalPastDueAmount: number;
  totalDueSoonCount: number;
  totalDueSoonAmount: number;
  buckets: {
    '1_30': number;
    '31_60': number;
    '61_90': number;
    '90_plus': number;
  };
}

export interface CommissionMetadataResponse {
  metadata: {
    salesReps: Array<{ partyId: string; name: string }>;
    facilities: Array<{ facilityId: string; facilityName: string; facilityTypeId?: string }>;
    defaultCommissionRate: number;
  };
}

// ═════════════════════════════════════════════════════════════════
// Aşama 10: Kurumsal Muhasebe Eşlemeleri, Toplu Yevmiye & Maliyet Tipleri
// ═════════════════════════════════════════════════════════════════
export interface VarianceReasonGlAccountItem {
  varianceReasonId: string;
  varianceReasonDesc: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface CreateVarianceReasonGlAccountPayload {
  varianceReasonId: string;
  organizationPartyId?: string;
  glAccountId: string;
}

export interface PartyGlAccountItem {
  organizationPartyId: string;
  partyId: string;
  partyName: string;
  roleTypeId: string;
  roleTypeDesc: string;
  glAccountTypeId: string;
  glAccountTypeDesc: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface CreatePartyGlAccountPayload {
  organizationPartyId?: string;
  partyId: string;
  roleTypeId?: string;
  glAccountTypeId: string;
  glAccountId: string;
}

export interface CreditCardTypeGlAccountItem {
  cardType: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName: string;
  accountCode: string;
}

export interface CreateCreditCardTypeGlAccountPayload {
  cardType: string;
  organizationPartyId?: string;
  glAccountId: string;
}

export interface ExtendedGlMetadataResponse {
  metadata: {
    varianceReasons: Array<{ id: string; description: string }>;
    roleTypes: Array<{ id: string; description: string }>;
    glAccountTypes: Array<{ id: string; description: string }>;
    cardTypes: string[];
    fixedAssetTypes?: Array<{ id: string; description: string }>;
    finAccountTypes?: Array<{ id: string; description: string }>;
    productCategories?: Array<{ id: string; description: string }>;
  };
}

export interface BatchPostJournalEntriesResponse {
  totalProcessed: number;
  postedCount: number;
  failedCount: number;
  failedList: Array<{ acctgTransId: string; reason: string }>;
  _EVENT_MESSAGE_?: string;
  _ERROR_MESSAGE_?: string;
}

export interface CostComponentCalcItem {
  costComponentCalcId: string;
  description: string;
  costGlAccountTypeId: string;
  costGlAccountTypeDesc: string;
  offsettingGlAccountTypeId: string;
  offsettingGlAccountTypeDesc: string;
  fixedCost: number;
  variableCost: number;
  perMilliSecond: number;
  currencyUomId: string;
  costCustomMethodId?: string;
}

export interface CreateCostComponentCalcPayload {
  costComponentCalcId?: string;
  description: string;
  costGlAccountTypeId?: string;
  offsettingGlAccountTypeId?: string;
  fixedCost?: number;
  variableCost?: number;
  perMilliSecond?: number;
  currencyUomId?: string;
}

export interface UpdateCostComponentCalcPayload extends CreateCostComponentCalcPayload {
  costComponentCalcId: string;
}

// Phase 11 Interfaces
export interface FixedAssetTypeGlAccountItem {
  fixedAssetTypeId: string;
  fixedAssetTypeDesc: string;
  fixedAssetId: string;
  organizationPartyId: string;
  assetGlAccountId?: string;
  assetAccountName?: string;
  assetAccountCode?: string;
  accDepGlAccountId?: string;
  accDepAccountName?: string;
  accDepAccountCode?: string;
  depGlAccountId?: string;
  depAccountName?: string;
  depAccountCode?: string;
  profitGlAccountId?: string;
  profitAccountName?: string;
  profitAccountCode?: string;
  lossGlAccountId?: string;
  lossAccountName?: string;
  lossAccountCode?: string;
}

export interface CreateFixedAssetTypeGlAccountPayload {
  fixedAssetTypeId: string;
  fixedAssetId?: string;
  organizationPartyId?: string;
  assetGlAccountId?: string;
  accDepGlAccountId?: string;
  depGlAccountId?: string;
  profitGlAccountId?: string;
  lossGlAccountId?: string;
}

export interface DeleteFixedAssetTypeGlAccountPayload {
  fixedAssetTypeId: string;
  fixedAssetId?: string;
  organizationPartyId?: string;
}

export interface FinAccountTypeGlAccountItem {
  finAccountTypeId: string;
  finAccountTypeDesc: string;
  organizationPartyId: string;
  glAccountId: string;
  accountName?: string;
  accountCode?: string;
}

export interface CreateFinAccountTypeGlAccountPayload {
  finAccountTypeId: string;
  organizationPartyId?: string;
  glAccountId: string;
}

export interface DeleteFinAccountTypeGlAccountPayload {
  finAccountTypeId: string;
  organizationPartyId?: string;
}

export interface ProductCategoryGlAccountItem {
  productCategoryId: string;
  categoryName: string;
  organizationPartyId: string;
  glAccountTypeId: string;
  glAccountTypeDesc: string;
  glAccountId: string;
  accountName?: string;
  accountCode?: string;
}

export interface CreateProductCategoryGlAccountPayload {
  productCategoryId: string;
  organizationPartyId?: string;
  glAccountTypeId: string;
  glAccountId: string;
}

export interface DeleteProductCategoryGlAccountPayload {
  productCategoryId: string;
  organizationPartyId?: string;
  glAccountTypeId: string;
}

// ═════════════════════════════════════════════════════════════════
// PARTY MANAGEMENT (CARİ YÖNETİMİ) INTERFACES & API FUNCTIONS
// ═════════════════════════════════════════════════════════════════

export interface PartyListItem {
  partyId: string;
  partyTypeId: 'PERSON' | 'PARTY_GROUP' | string;
  name: string;
  groupName?: string;
  firstName?: string;
  lastName?: string;
  statusId: string;
  roles: string[];
  primaryPhone?: string;
  primaryEmail?: string;
  city?: string;
  countryGeoId?: string;
  identifications?: {
    partyIdentificationTypeId: string;
    idValue: string;
  }[];
}

export interface PartyMetrics {
  totalParties: number;
  totalGroups: number;
  totalPersons: number;
  activeCustomers: number;
  activeSuppliers: number;
}

export interface PartyListResponse {
  partyList: PartyListItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  metrics: PartyMetrics;
}

export interface PartyPostalAddress {
  contactMechId: string;
  toName?: string;
  attnName?: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  countryGeoId: string;
  stateProvinceGeoId?: string;
  purposeTypeId: string;
}

export interface PartyTelecomNumber {
  contactMechId: string;
  countryCode?: string;
  areaCode?: string;
  contactNumber: string;
  fullNumber: string;
  purposeTypeId: string;
}

export interface PartyEmailAddress {
  contactMechId: string;
  emailAddress: string;
  purposeTypeId: string;
}

export interface PartyIdentification {
  partyIdentificationTypeId: string;
  typeDescription: string;
  idValue: string;
}

export interface PartyRelationship {
  partyIdFrom: string;
  partyIdTo: string;
  partyNameFrom: string;
  partyNameTo: string;
  roleTypeIdFrom: string;
  roleTypeIdTo: string;
  partyRelationshipTypeId: string;
  fromDate: string;
  comments?: string;
}

export interface PartyDetail {
  partyId: string;
  partyTypeId: string;
  displayName: string;
  statusId: string;
  createdDate: string;
  description?: string;
  preferredCurrencyUomId: string;
  person?: {
    firstName: string;
    lastName: string;
    middleName?: string;
    personalTitle?: string;
    gender?: string;
    birthDate?: string;
  } | null;
  group?: {
    groupName: string;
    groupNameLocal?: string;
    officeSiteName?: string;
    annualRevenue?: number | null;
    numEmployees?: number | null;
    comments?: string;
  } | null;
  roles: {
    roleTypeId: string;
    description: string;
  }[];
  postalAddresses: PartyPostalAddress[];
  telecomNumbers: PartyTelecomNumber[];
  emailAddresses: PartyEmailAddress[];
  identifications: PartyIdentification[];
  relationships: PartyRelationship[];
  financialSummary: {
    invoiceCount: number;
    paymentCount: number;
  };
}

export interface PartyMetadataResponse {
  partyTypes: { partyTypeId: string; description: string }[];
  roleTypes: { roleTypeId: string; description: string; isKey: boolean }[];
  identificationTypes: { partyIdentificationTypeId: string; description: string }[];
  contactMechPurposeTypes: { contactMechPurposeTypeId: string; description: string }[];
  countries: { geoId: string; geoName: string; geoCode: string }[];
}

export interface CreatePartyPayload {
  partyTypeId: 'PERSON' | 'PARTY_GROUP';
  partyId?: string;
  statusId?: string;
  firstName?: string;
  lastName?: string;
  personalTitle?: string;
  gender?: string;
  birthDate?: string;
  groupName?: string;
  groupNameLocal?: string;
  officeSiteName?: string;
  comments?: string;
  roleTypeId?: string;
  roleTypeIds?: string[];
  emailAddress?: string;
  contactNumber?: string;
  countryCode?: string;
  areaCode?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postalCode?: string;
  countryGeoId?: string;
  idValue?: string;
  partyIdentificationTypeId?: string;
}

export interface UpdatePartyPayload {
  partyId: string;
  firstName?: string;
  lastName?: string;
  personalTitle?: string;
  gender?: string;
  birthDate?: string;
  groupName?: string;
  groupNameLocal?: string;
  officeSiteName?: string;
  comments?: string;
  statusId?: string;
}

export async function fetchPartyMetadata(): Promise<PartyMetadataResponse> {
  return requestApi<PartyMetadataResponse>('getPartyMetadata');
}

export async function fetchParties(params: {
  search?: string;
  partyTypeId?: string;
  roleTypeId?: string;
  statusId?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<PartyListResponse> {
  const queryParams = new URLSearchParams();
  if (params.search) queryParams.set('search', params.search);
  if (params.partyTypeId) queryParams.set('partyTypeId', params.partyTypeId);
  if (params.roleTypeId) queryParams.set('roleTypeId', params.roleTypeId);
  if (params.statusId) queryParams.set('statusId', params.statusId);
  if (params.viewIndex !== undefined) queryParams.set('viewIndex', params.viewIndex.toString());
  if (params.viewSize !== undefined) queryParams.set('viewSize', params.viewSize.toString());

  const endpoint = `getParties${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  return requestApi<PartyListResponse>(endpoint);
}

export async function fetchPartyDetail(partyId: string): Promise<{ partyDetail: PartyDetail }> {
  return requestApi<{ partyDetail: PartyDetail }>(`getPartyDetail?partyId=${encodeURIComponent(partyId)}`);
}

export async function createParty(payload: CreatePartyPayload): Promise<{ partyId: string; message: string }> {
  return requestApi<{ partyId: string; message: string }>('createParty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateParty(payload: UpdatePartyPayload): Promise<{ partyId: string; message: string }> {
  return requestApi<{ partyId: string; message: string }>('updateParty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function setPartyStatus(partyId: string, statusId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('setPartyStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, statusId })
  });
}

export async function addPartyRole(partyId: string, roleTypeId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('addPartyRole', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, roleTypeId })
  });
}

export async function deletePartyRole(partyId: string, roleTypeId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyRole', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, roleTypeId })
  });
}

export async function createPartyPostalAddress(payload: {
  partyId: string;
  toName?: string;
  attnName?: string;
  address1: string;
  address2?: string;
  city: string;
  postalCode: string;
  countryGeoId: string;
  stateProvinceGeoId?: string;
  contactMechPurposeTypeId?: string;
}): Promise<{ contactMechId: string; message: string }> {
  return requestApi<{ contactMechId: string; message: string }>('createPartyPostalAddress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createPartyTelecomNumber(payload: {
  partyId: string;
  countryCode?: string;
  areaCode?: string;
  contactNumber: string;
  contactMechPurposeTypeId?: string;
}): Promise<{ contactMechId: string; message: string }> {
  return requestApi<{ contactMechId: string; message: string }>('createPartyTelecomNumber', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createPartyEmailAddress(payload: {
  partyId: string;
  emailAddress: string;
  contactMechPurposeTypeId?: string;
}): Promise<{ contactMechId: string; message: string }> {
  return requestApi<{ contactMechId: string; message: string }>('createPartyEmailAddress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePartyContactMech(partyId: string, contactMechId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyContactMech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, contactMechId })
  });
}

export async function createPartyIdentification(payload: {
  partyId: string;
  partyIdentificationTypeId: string;
  idValue: string;
}): Promise<{ message: string }> {
  return requestApi<{ message: string }>('createPartyIdentification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePartyIdentification(partyId: string, partyIdentificationTypeId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyIdentification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, partyIdentificationTypeId })
  });
}

export async function createPartyRelationship(payload: {
  partyIdFrom: string;
  partyIdTo: string;
  roleTypeIdFrom?: string;
  roleTypeIdTo?: string;
  partyRelationshipTypeId?: string;
  comments?: string;
}): Promise<{ message: string }> {
  return requestApi<{ message: string }>('createPartyRelationship', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// -------------------------------------------------------------
// Phase 2: Party Financial Profile, Risk, Terms, Notes & Segments
// -------------------------------------------------------------

export interface PartyFinancialBillingAccount {
  billingAccountId: string;
  accountLimit: number;
  accountBalance: number;
  availableBalance: number;
  accountCurrencyUomId: string;
  description?: string;
  fromDate?: string;
  thruDate?: string;
  roleTypeId?: string;
}

export interface PartyPaymentTerm {
  agreementId: string;
  agreementTermId: string;
  termTypeId: string;
  termTypeDescription: string;
  termValue?: number;
  termDays?: number;
  textValue?: string;
  description?: string;
}

export interface PartyTaxAuthInfo {
  taxAuthGeoId: string;
  taxAuthPartyId: string;
  partyTaxId: string;
  isExempt: string;
  isNexus: string;
  fromDate?: string;
  thruDate?: string;
}

export interface PartyClassification {
  partyClassificationGroupId: string;
  description: string;
  classificationTypeId: string;
  fromDate?: string;
  thruDate?: string;
}

export interface PartyNote {
  noteId: string;
  noteName: string;
  noteInfo: string;
  noteDateTime: string;
  noteParty: string;
}

export interface PartyClassificationGroup {
  partyClassificationGroupId: string;
  description: string;
  partyClassificationTypeId: string;
}

export interface PartyTermType {
  termTypeId: string;
  description: string;
}

export interface PartyFinancialProfile {
  partyId: string;
  billingAccounts: PartyFinancialBillingAccount[];
  totalCreditLimit: number;
  totalAccountBalance: number;
  totalReceivableOutstanding: number;
  totalPayableOutstanding: number;
  netExposure: number;
  utilizationPercent: number;
  riskLevel: 'SAFE' | 'WARNING' | 'EXCEEDED' | 'NO_LIMIT';
  paymentTerms: PartyPaymentTerm[];
  taxAuthInfos: PartyTaxAuthInfo[];
  classifications: PartyClassification[];
  notes: PartyNote[];
  availableGroups: PartyClassificationGroup[];
  availableTermTypes: PartyTermType[];
}

export interface PartyFinancialProfileResponse {
  financialProfile: PartyFinancialProfile;
}

export interface SavePartyFinancialPayload {
  partyId: string;
  billingAccountId?: string;
  accountLimit: number;
  accountCurrencyUomId?: string;
  description?: string;
}

export interface SetPartyTaxAuthInfoPayload {
  partyId: string;
  taxAuthGeoId?: string;
  taxAuthPartyId?: string;
  partyTaxId?: string;
  isExempt?: 'Y' | 'N';
}

export interface CreatePartyPaymentTermPayload {
  partyId: string;
  termTypeId: string;
  termDays?: number;
  termValue?: number;
  description?: string;
}

export async function fetchPartyFinancialProfile(partyId: string): Promise<PartyFinancialProfileResponse> {
  return requestApi<PartyFinancialProfileResponse>(`getPartyFinancialProfile?partyId=${encodeURIComponent(partyId)}`);
}

export async function savePartyFinancialProfile(payload: SavePartyFinancialPayload): Promise<{ billingAccountId: string; message: string }> {
  return requestApi<{ billingAccountId: string; message: string }>('savePartyFinancialProfile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createPartyNote(partyId: string, noteName: string, noteInfo: string): Promise<{ noteId: string; message: string }> {
  return requestApi<{ noteId: string; message: string }>('createPartyNote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, noteName, noteInfo })
  });
}

export async function addPartyClassification(partyId: string, partyClassificationGroupId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('addPartyClassification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, partyClassificationGroupId })
  });
}

export async function deletePartyClassification(partyId: string, partyClassificationGroupId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyClassification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, partyClassificationGroupId })
  });
}

export async function setPartyTaxAuthInfo(payload: SetPartyTaxAuthInfoPayload): Promise<{ message: string }> {
  return requestApi<{ message: string }>('setPartyTaxAuthInfo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createPartyPaymentTerm(payload: CreatePartyPaymentTermPayload): Promise<{ agreementTermId: string; message: string }> {
  return requestApi<{ agreementTermId: string; message: string }>('createPartyPaymentTerm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePartyPaymentTerm(agreementTermId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyPaymentTerm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agreementTermId })
  });
}

// ==========================================
// PHASE 3 & FINAL PARTY SCREENS: PAYMENT METHODS, ATTRIBUTES, CONTENT, USER LOGINS
// ==========================================

export interface PartyEftAccount {
  paymentMethodId: string;
  bankName: string;
  accountNumber: string;
  nameOnAccount: string;
  routingNumber?: string;
  description?: string;
  fromDate?: string;
}

export interface PartyCreditCard {
  paymentMethodId: string;
  cardType: string;
  cardNumberMasked: string;
  expireDate: string;
  firstNameOnCard: string;
  description?: string;
  fromDate?: string;
}

export interface PartyPaymentMethodsResponse {
  partyId: string;
  eftAccounts: PartyEftAccount[];
  creditCards: PartyCreditCard[];
}

export interface CreatePartyEftPayload {
  partyId: string;
  bankName: string;
  accountNumber: string;
  nameOnAccount?: string;
  routingNumber?: string;
  description?: string;
}

export interface CreatePartyCreditCardPayload {
  partyId: string;
  cardNumber: string;
  expireDate: string;
  cardType?: string;
  nameOnCard?: string;
}

export interface PartyAttribute {
  attrName: string;
  attrValue: string;
  attrDescription?: string;
}

export interface SavePartyAttributePayload {
  partyId: string;
  attrName: string;
  attrValue: string;
  attrDescription?: string;
}

export interface PartyContentType {
  partyContentTypeId: string;
  description: string;
}

export interface PartyContent {
  contentId: string;
  partyContentTypeId: string;
  contentTypeDescription: string;
  contentName: string;
  description?: string;
  fromDate?: string;
}

export interface PartyContentsResponse {
  partyId: string;
  contents: PartyContent[];
  availableTypes: PartyContentType[];
}

export interface CreatePartyContentPayload {
  partyId: string;
  partyContentTypeId: string;
  contentName: string;
  description?: string;
}

export interface PartySecurityGroup {
  groupId: string;
  description: string;
}

export interface PartyUserLogin {
  userLoginId: string;
  enabled: 'Y' | 'N';
  hasLoggedOut: string;
  securityGroups: PartySecurityGroup[];
}

export interface PartyUserLoginsResponse {
  partyId: string;
  userLogins: PartyUserLogin[];
  availableSecurityGroups: PartySecurityGroup[];
}

export interface CreatePartyUserLoginPayload {
  partyId: string;
  userLoginId: string;
  currentPassword: string;
  groupId?: string;
}

export async function fetchPartyPaymentMethods(partyId: string): Promise<{ paymentMethods: PartyPaymentMethodsResponse }> {
  return requestApi<{ paymentMethods: PartyPaymentMethodsResponse }>(`getPartyPaymentMethods?partyId=${encodeURIComponent(partyId)}`);
}

export async function createPartyEftAccount(payload: CreatePartyEftPayload): Promise<{ paymentMethodId: string; message: string }> {
  return requestApi<{ paymentMethodId: string; message: string }>('createPartyEftAccount', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePartyPaymentMethod(paymentMethodId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyPaymentMethod', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethodId })
  });
}

export async function createPartyCreditCard(payload: CreatePartyCreditCardPayload): Promise<{ paymentMethodId: string; message: string }> {
  return requestApi<{ paymentMethodId: string; message: string }>('createPartyCreditCard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchPartyAttributes(partyId: string): Promise<{ attributes: PartyAttribute[] }> {
  return requestApi<{ attributes: PartyAttribute[] }>(`getPartyAttributes?partyId=${encodeURIComponent(partyId)}`);
}

export async function savePartyAttribute(payload: SavePartyAttributePayload): Promise<{ message: string }> {
  return requestApi<{ message: string }>('savePartyAttribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePartyAttribute(partyId: string, attrName: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyAttribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, attrName })
  });
}

export async function fetchPartyContents(partyId: string): Promise<{ partyContents: PartyContentsResponse }> {
  return requestApi<{ partyContents: PartyContentsResponse }>(`getPartyContents?partyId=${encodeURIComponent(partyId)}`);
}

export async function createPartyContentRecord(payload: CreatePartyContentPayload): Promise<{ contentId: string; message: string }> {
  return requestApi<{ contentId: string; message: string }>('createPartyContentRecord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deletePartyContentRecord(partyId: string, contentId: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deletePartyContentRecord', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId, contentId })
  });
}

export async function fetchPartyUserLogins(partyId: string): Promise<{ userLoginsData: PartyUserLoginsResponse }> {
  return requestApi<{ userLoginsData: PartyUserLoginsResponse }>(`getPartyUserLogins?partyId=${encodeURIComponent(partyId)}`);
}

export async function createPartyUserLogin(payload: CreatePartyUserLoginPayload): Promise<{ message: string }> {
  return requestApi<{ message: string }>('createPartyUserLogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updatePartyUserLoginStatus(userLoginId: string, enabled: 'Y' | 'N'): Promise<{ message: string }> {
  return requestApi<{ message: string }>('updatePartyUserLoginStatus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userLoginId, enabled })
  });
}

// ==========================================
// Phase 1: Authentication & User Profile API
// ==========================================

export interface UserSecurityGroup {
  groupId: string;
  description: string;
  fromDate?: string;
}

export interface UserLoginProfile {
  userLoginId: string;
  partyId: string;
  displayName: string;
  enabled: string;
  requirePasswordChange: string;
  lastLocale?: string;
  lastTimeZone?: string;
  tenantId?: string;
  securityGroups: UserSecurityGroup[];
  permissions: string[];
  isAdmin: boolean;
}

export interface AuthCheckResponse {
  authenticated: boolean;
  user: UserLoginProfile | null;
  message?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  userTenantId?: string;
}

export interface LoginResponse {
  authenticated: boolean;
  user: UserLoginProfile;
  message?: string;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
  newPasswordVerify: string;
}

/**
 * Logs in with username and password
 */
export async function apiLogin(payload: LoginPayload): Promise<LoginResponse> {
  return requestApi<LoginResponse>('apiLogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

/**
 * Logs out the current user session
 */
export async function apiLogout(): Promise<{ authenticated: boolean; message: string }> {
  return requestApi<{ authenticated: boolean; message: string }>('apiLogout', {
    method: 'POST'
  });
}

/**
 * Checks if the current session is authenticated
 */
export async function checkAuth(): Promise<AuthCheckResponse> {
  return requestApi<AuthCheckResponse>('checkAuth');
}

/**
 * Updates the logged-in user's password
 */
export async function updateMyPassword(payload: UpdatePasswordPayload): Promise<{ message: string }> {
  return requestApi<{ message: string }>('updateMyPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// =========================================================================
// Phase 2: User & Security Group RBAC Management API
// =========================================================================

export interface UserLoginAdminItem {
  userLoginId: string;
  partyId: string;
  displayName: string;
  enabled: string;
  isLocked: boolean;
  disabledDateTime?: string;
  successiveFailedLogins: number;
  requirePasswordChange: string;
  hasLoggedOut: string;
  lastLocale?: string;
  lastTimeZone?: string;
  securityGroups: { groupId: string; fromDate?: string }[];
}

export interface UserLoginsListResponse {
  userLogins: UserLoginAdminItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export interface UserDetailSecurityGroup {
  groupId: string;
  description: string;
  fromDate?: string;
  thruDate?: string;
  isActive: boolean;
}

export interface UserLoginDetail {
  userLoginId: string;
  partyId: string;
  displayName: string;
  enabled: string;
  isLocked: boolean;
  disabledDateTime?: string;
  successiveFailedLogins: number;
  requirePasswordChange: string;
  hasLoggedOut: string;
  lastLocale?: string;
  lastTimeZone?: string;
  securityGroups: UserDetailSecurityGroup[];
  permissions: string[];
}

export interface UserLoginDetailResponse {
  userDetail: UserLoginDetail;
}

export interface CreateUserAdminPayload {
  userLoginId: string;
  currentPassword: string;
  partyId?: string;
  groupId?: string;
  requirePasswordChange?: 'Y' | 'N';
}

export interface SecurityGroupAdminItem {
  groupId: string;
  description: string;
  permissionCount: number;
  userCount: number;
}

export interface SecurityGroupPermissionItem {
  permissionId: string;
  description: string;
  fromDate?: string;
}

export interface SecurityGroupDetailResponse {
  groupInfo: { groupId: string; description: string };
  assignedPermissions: SecurityGroupPermissionItem[];
  availablePermissions: { permissionId: string; description: string }[];
}

export interface UserAdminMetadataResponse {
  metadata: {
    securityGroups: { groupId: string; description: string }[];
    parties: { partyId: string; name: string }[];
    securityGroupCount?: number;
    roleTypeCount?: number;
    activeSessionCount?: number;
  };
}

export interface FetchUserLoginsParams {
  search?: string;
  statusId?: 'ALL' | 'ACTIVE' | 'DISABLED' | 'LOCKED';
  groupId?: string;
  viewIndex?: number;
  viewSize?: number;
}

export async function fetchUserLogins(params?: FetchUserLoginsParams): Promise<UserLoginsListResponse> {
  const q = new URLSearchParams();
  if (params?.search) q.set('search', params.search);
  if (params?.statusId) q.set('statusId', params.statusId);
  if (params?.groupId) q.set('groupId', params.groupId);
  if (params?.viewIndex !== undefined) q.set('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) q.set('viewSize', params.viewSize.toString());
  return requestApi<UserLoginsListResponse>(`getUserLogins${q.toString() ? '?' + q.toString() : ''}`);
}

export async function fetchUserLoginDetail(userLoginId: string): Promise<UserLoginDetailResponse> {
  return requestApi<UserLoginDetailResponse>(`getUserLoginDetail?userLoginId=${encodeURIComponent(userLoginId)}`);
}

export async function createUserLoginAdmin(payload: CreateUserAdminPayload): Promise<{ message: string; userLoginId: string }> {
  return requestApi<{ message: string; userLoginId: string }>('createUserLoginAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateUserLoginStatusAdmin(payload: { userLoginId: string; enabled?: 'Y' | 'N'; unlock?: 'Y' | 'N' }): Promise<{ message: string }> {
  return requestApi<{ message: string }>('updateUserLoginStatusAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function adminResetUserPassword(payload: { userLoginId: string; newPassword: string; newPasswordVerify: string }): Promise<{ message: string }> {
  return requestApi<{ message: string }>('adminResetUserPassword', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function addUserSecurityGroup(payload: {
  userLoginId: string;
  groupId: string;
  thruDate?: string;
}): Promise<{ message: string }> {
  return requestApi<{ message: string }>('addUserSecurityGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function removeUserSecurityGroup(payload: { userLoginId: string; groupId: string }): Promise<{ message: string }> {
  return requestApi<{ message: string }>('removeUserSecurityGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchSecurityGroups(): Promise<{ securityGroups: SecurityGroupAdminItem[] }> {
  return requestApi<{ securityGroups: SecurityGroupAdminItem[] }>('getSecurityGroups');
}

export async function fetchSecurityGroupPermissions(groupId: string): Promise<SecurityGroupDetailResponse> {
  return requestApi<SecurityGroupDetailResponse>(`getSecurityGroupPermissions?groupId=${encodeURIComponent(groupId)}`);
}

export async function addPermissionToSecurityGroup(payload: { groupId: string; permissionId: string }): Promise<{ message: string }> {
  return requestApi<{ message: string }>('addPermissionToSecurityGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function removePermissionFromSecurityGroup(payload: { groupId: string; permissionId: string }): Promise<{ message: string }> {
  return requestApi<{ message: string }>('removePermissionFromSecurityGroup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createSecurityGroupAdmin(payload: { groupId: string; description: string }): Promise<{ message: string; groupId: string }> {
  return requestApi<{ message: string; groupId: string }>('createSecurityGroupAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchUserAdminMetadata(): Promise<UserAdminMetadataResponse> {
  return requestApi<UserAdminMetadataResponse>('getUserAdminMetadata');
}

export interface RoleTypeAdminItem {
  roleTypeId: string;
  parentTypeId: string;
  description: string;
  hasTable: string;
  partyCount: number;
}

export interface RoleTypesAdminResponse {
  roleTypes: RoleTypeAdminItem[];
  totalCount: number;
}

export async function fetchRoleTypesAdmin(): Promise<RoleTypesAdminResponse> {
  return requestApi<RoleTypesAdminResponse>('getRoleTypesAdmin');
}

export async function createRoleTypeAdmin(payload: {
  roleTypeId: string;
  description: string;
  parentTypeId?: string;
}): Promise<{ roleTypeId: string; message: string }> {
  return requestApi<{ roleTypeId: string; message: string }>('createRoleTypeAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteRoleTypeAdmin(roleTypeId: string): Promise<{ roleTypeId: string; message: string }> {
  return requestApi<{ roleTypeId: string; message: string }>('deleteRoleTypeAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleTypeId })
  });
}

export interface UserLoginHistoryItem {
  userLoginId: string;
  fromDate: string;
  thruDate: string;
  successfulLogin: string;
  originUserLoginId: string;
  visitId: string;
  clientIpAddress: string;
  initialUserAgent: string;
  webappName: string;
}

export interface UserLoginHistoryResponse {
  history: UserLoginHistoryItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
}

export async function fetchUserLoginHistory(params?: {
  userLoginId?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<UserLoginHistoryResponse> {
  const query = new URLSearchParams();
  if (params?.userLoginId) query.set('userLoginId', params.userLoginId);
  if (params?.viewIndex !== undefined) query.set('viewIndex', params.viewIndex.toString());
  if (params?.viewSize !== undefined) query.set('viewSize', params.viewSize.toString());
  const qStr = query.toString();
  return requestApi<UserLoginHistoryResponse>(`getUserLoginHistory${qStr ? '?' + qStr : ''}`);
}

export interface ActiveSessionItem {
  sessionId: string;
  visitId: string;
  userLoginId: string;
  partyId: string;
  displayName: string;
  clientIpAddress: string;
  initialUserAgent: string;
  webappName: string;
  fromDate: string;
  lastUpdatedStamp?: string;
  isUniqueUser: boolean;
}

export interface LoggedInUsersResponse {
  sessions: ActiveSessionItem[];
  totalCount: number;
  uniqueUsersCount: number;
}

export async function fetchLoggedInUsers(): Promise<LoggedInUsersResponse> {
  return requestApi<LoggedInUsersResponse>('getLoggedInUsers');
}



// ==========================================
// Phase 3: System, Cache & Job Scheduler Management Models
// ==========================================

export interface CacheItem {
  cacheName: string;
  cacheSize: number;
  hitCount: number;
  missCountTot: number;
  missCountNotFound?: number;
  missCountExpired?: number;
  removeHitCount?: number;
  maxInMemory: number;
  expireTime: number;
  useSoftReference: boolean;
  cacheMemory: number;
}

export interface MemoryInfo {
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  maxMemory: number;
  totalCacheMemory?: number;
}

export interface CacheStatusResponse {
  cacheList: CacheItem[];
  memoryInfo: MemoryInfo;
  totalCount: number;
}

export interface JobItem {
  jobId: string;
  jobName: string;
  serviceName: string;
  statusId: string;
  runTime?: string | null;
  startDateTime?: string | null;
  finishDateTime?: string | null;
  cancelDateTime?: string | null;
  currentRetryCount: number;
  maxRetry: number;
  poolId?: string;
  authUserLoginId?: string;
  jobResult?: string;
}

export interface JobStats {
  pending: number;
  running: number;
  finished: number;
  failed: number;
}

export interface ScheduledJobsResponse {
  jobs: JobItem[];
  totalCount: number;
  viewIndex: number;
  viewSize: number;
  stats: JobStats;
}

export interface SystemDiagnosticsResponse {
  diagnostics: {
    jvm: {
      vmName: string;
      vmVendor: string;
      vmVersion: string;
      startTime: string;
      uptimeMs: number;
      uptimeFormatted: string;
    };
    os: {
      name: string;
      version: string;
      arch: string;
      availableProcessors: number;
      systemLoadAverage: number;
    };
    memory: {
      heapUsed: number;
      heapCommitted: number;
      heapMax: number;
      nonHeapUsed: number;
      nonHeapCommitted: number;
      totalMemory: number;
      freeMemory: number;
      usedMemory: number;
      maxMemory: number;
    };
    threads: {
      threadCount: number;
      peakThreadCount: number;
      daemonThreadCount: number;
      totalStartedThreadCount: number;
    };
    ofbiz: {
      delegatorName: string;
      frameworkVersion: string;
      currentTime: string;
    };
  };
}

export async function fetchCacheStatus(searchQuery?: string): Promise<CacheStatusResponse> {
  const query = searchQuery ? `?searchQuery=${encodeURIComponent(searchQuery)}` : '';
  return requestApi<CacheStatusResponse>(`getCacheStatus${query}`);
}

export async function clearCacheByName(cacheName: string): Promise<{ success: boolean; message?: string }> {
  return requestApi<{ success: boolean; message?: string }>('clearCache', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cacheName })
  });
}

export async function clearAllCaches(): Promise<{ success: boolean; message?: string }> {
  return requestApi<{ success: boolean; message?: string }>('clearAllCaches', {
    method: 'POST'
  });
}

export async function forceGarbageCollection(): Promise<{ message: string; memoryInfo: MemoryInfo }> {
  return requestApi<{ message: string; memoryInfo: MemoryInfo }>('forceGarbageCollection', {
    method: 'POST'
  });
}

export async function fetchScheduledJobs(params: {
  statusId?: string;
  searchQuery?: string;
  viewIndex?: number;
  viewSize?: number;
}): Promise<ScheduledJobsResponse> {
  const queryParams = new URLSearchParams();
  if (params.statusId && params.statusId !== 'ALL') queryParams.append('statusId', params.statusId);
  if (params.searchQuery) queryParams.append('searchQuery', params.searchQuery);
  if (params.viewIndex !== undefined) queryParams.append('viewIndex', params.viewIndex.toString());
  if (params.viewSize !== undefined) queryParams.append('viewSize', params.viewSize.toString());

  const qs = queryParams.toString();
  return requestApi<ScheduledJobsResponse>(`getScheduledJobs${qs ? `?${qs}` : ''}`);
}

export async function cancelJob(jobId: string): Promise<{ success: boolean; message?: string }> {
  return requestApi<{ success: boolean; message?: string }>('cancelScheduledJob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId })
  });
}

export async function resetJob(jobId: string): Promise<{ success: boolean; message?: string }> {
  return requestApi<{ success: boolean; message?: string }>('resetScheduledJob', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId })
  });
}

export async function triggerServiceNow(serviceName: string): Promise<{ success: boolean; message?: string }> {
  return requestApi<{ success: boolean; message?: string }>('runServiceNow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serviceName })
  });
}

export async function fetchSystemDiagnostics(): Promise<SystemDiagnosticsResponse> {
  return requestApi<SystemDiagnosticsResponse>('getSystemDiagnostics');
}

// ==========================================
// Multi-Tenant Architecture API Models & Functions
// ==========================================

export interface TenantAdminItem {
  tenantId: string;
  tenantName: string;
  initialPath?: string;
  disabled: string;
  domainCount: number;
  componentCount: number;
  dataSourceCount: number;
}

export interface TenantDomainItem {
  domainName: string;
}

export interface TenantComponentItem {
  componentName: string;
  sequenceNum?: number;
}

export interface TenantDataSourceItem {
  entityGroupName: string;
  jdbcUri: string;
  jdbcUsername: string;
}

export interface TenantDetail {
  tenantId: string;
  tenantName: string;
  initialPath?: string;
  disabled: string;
  domains: TenantDomainItem[];
  components: TenantComponentItem[];
  dataSources: TenantDataSourceItem[];
}

export interface TenantsAdminResponse {
  tenants: TenantAdminItem[];
  totalCount: number;
}

export interface TenantDetailResponse {
  tenantDetail: TenantDetail;
}

export async function fetchTenantsAdmin(): Promise<TenantsAdminResponse> {
  return requestApi<TenantsAdminResponse>('getTenantsAdmin');
}

export async function fetchTenantDetail(tenantId: string): Promise<TenantDetailResponse> {
  return requestApi<TenantDetailResponse>('getTenantDetail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId })
  });
}

export async function createTenantAdmin(payload: {
  tenantId: string;
  tenantName: string;
  initialPath?: string;
  domainName?: string;
}): Promise<{ message: string; tenantId: string }> {
  return requestApi<{ message: string; tenantId: string }>('createTenantAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function updateTenantAdmin(payload: {
  tenantId: string;
  tenantName?: string;
  initialPath?: string;
  disabled?: 'Y' | 'N';
}): Promise<{ message: string; tenantId: string }> {
  return requestApi<{ message: string; tenantId: string }>('updateTenantAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteTenantAdmin(tenantId: string): Promise<{ message: string; tenantId: string }> {
  return requestApi<{ message: string; tenantId: string }>('deleteTenantAdmin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId })
  });
}

export async function addTenantDomainName(payload: { tenantId: string; domainName: string }): Promise<{ message: string }> {
  return requestApi<{ message: string }>('addTenantDomainName', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteTenantDomainName(domainName: string): Promise<{ message: string }> {
  return requestApi<{ message: string }>('deleteTenantDomainName', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domainName })
  });
}



