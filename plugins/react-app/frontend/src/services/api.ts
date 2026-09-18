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

  const cleanJson = text.startsWith('//') ? text.substring(2) : text;
  let data: any;
  try {
    data = JSON.parse(cleanJson);
  } catch (err: any) {
    throw new Error(`JSON ayrıştırma hatası: ${err.message}. Ham yanıt: ${cleanJson.substring(0, 100)}`);
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
};
