/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.service.ServiceUtil
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.accounting.invoice.InvoiceWorker
import org.apache.ofbiz.accounting.util.UtilAccounting
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "FinancialReportEvents.groovy"

Timestamp parseTimestamp(Object dateObj) {
    if (!dateObj) return null
    if (dateObj instanceof Timestamp) return (Timestamp) dateObj
    String str = dateObj.toString().trim()
    if (str.isEmpty()) return null
    try {
        if (str.length() == 10) {
            str += " 00:00:00.0"
        }
        return Timestamp.valueOf(str)
    } catch (Exception e) {
        Debug.logWarning("Could not parse timestamp from string: " + str, MODULE)
        return null
    }
}

String getPartyName(def delegator, String partyId) {
    if (!partyId) return ""
    try {
        GenericValue p = EntityQuery.use(delegator).from("PartyNameView").where("partyId", partyId).queryOne()
        if (p) {
            String name = p.groupName ?: ((p.firstName ?: "") + " " + (p.lastName ?: "")).trim()
            return name ?: partyId
        }
    } catch (Exception ignored) {}
    return partyId
}

String getReportMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> orgsGv = EntityQuery.use(delegator).from("PartyRoleAndPartyDetail")
            .where("roleTypeId", "INTERNAL_ORGANIZATIO")
            .queryList()

        List organizations = []
        orgsGv.each { org ->
            String name = org.groupName ?: ((org.firstName ?: "") + " " + (org.lastName ?: "")).trim()
            organizations.add([partyId: org.partyId, name: name ?: org.partyId])
        }
        if (!organizations.find { it.partyId == "Company" }) {
            organizations.add(0, [partyId: "Company", name: "Your Company Name Here (Company)"])
        }

        List years = ["2009", "2024", "2025", "2026", "2027"]

        Map metadata = [
            organizations: organizations,
            years: years,
            currencies: [
                [uomId: 'USD', description: 'US Dollar ($)'],
                [uomId: 'EUR', description: 'Euro (€)'],
                [uomId: 'TRY', description: 'Turkish Lira (₺)']
            ]
        ]

        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getReportMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 1. Trial Balance (Mizan Tablosu)
 */
String getTrialBalance() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        Timestamp fromDate = null
        Timestamp thruDate = null

        if (UtilValidate.isNotEmpty(parameters.year)) {
            String y = parameters.year.trim()
            fromDate = Timestamp.valueOf(y + "-01-01 00:00:00.0")
            thruDate = Timestamp.valueOf(y + "-12-31 23:59:59.9")
        } else {
            if (parameters.fromDate) fromDate = parseTimestamp(parameters.fromDate)
            if (parameters.thruDate) thruDate = parseTimestamp(parameters.thruDate)
        }

        List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry")
            .where("organizationPartyId", orgPartyId)
            .queryList()

        Map<String, Map> accountMap = [:]

        entries.each { entry ->
            if (fromDate || thruDate) {
                GenericValue trans = entry.getRelatedOne("AcctgTrans", false)
                if (trans && trans.transactionDate) {
                    if (fromDate && trans.transactionDate.before(fromDate)) return
                    if (thruDate && trans.transactionDate.after(thruDate)) return
                }
            }

            String glAccountId = entry.glAccountId
            if (!glAccountId) return

            if (!accountMap.containsKey(glAccountId)) {
                GenericValue glAccount = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glAccountId).queryOne()
                accountMap[glAccountId] = [
                    glAccountId: glAccountId,
                    accountCode: glAccount?.accountCode ?: glAccountId,
                    accountName: glAccount?.accountName ?: glAccountId,
                    glAccountClassId: glAccount?.glAccountClassId ?: "",
                    glAccountTypeId: glAccount?.glAccountTypeId ?: "",
                    debits: BigDecimal.ZERO,
                    credits: BigDecimal.ZERO,
                    balance: BigDecimal.ZERO,
                    debitCreditFlag: ""
                ]
            }

            BigDecimal amt = entry.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = entry.getString("debitCreditFlag")

            if ("D".equals(flag)) {
                accountMap[glAccountId].debits = accountMap[glAccountId].debits.add(amt)
            } else if ("C".equals(flag)) {
                accountMap[glAccountId].credits = accountMap[glAccountId].credits.add(amt)
            }
        }

        BigDecimal totalDebits = BigDecimal.ZERO
        BigDecimal totalCredits = BigDecimal.ZERO
        List accounts = []

        accountMap.values().each { acc ->
            BigDecimal d = acc.debits
            BigDecimal c = acc.credits
            totalDebits = totalDebits.add(d)
            totalCredits = totalCredits.add(c)

            String classId = acc.glAccountClassId
            boolean isDebitNormal = (classId.contains("ASSET") || classId.contains("EXPENSE") || classId.contains("DEBIT")) && !classId.contains("CONTRA")

            BigDecimal bal = isDebitNormal ? d.subtract(c) : c.subtract(d)
            acc.balance = bal.doubleValue()
            acc.debitCreditFlag = isDebitNormal ? "D" : "C"
            acc.debits = d.doubleValue()
            acc.credits = c.doubleValue()

            accounts.add(acc)
        }

        accounts.sort { a, b -> a.glAccountId <=> b.glAccountId }

        BigDecimal diff = totalDebits.subtract(totalCredits)

        request.setAttribute("accounts", accounts)
        request.setAttribute("totalDebits", totalDebits.doubleValue())
        request.setAttribute("totalCredits", totalCredits.doubleValue())
        request.setAttribute("difference", diff.doubleValue())
        request.setAttribute("isBalanced", diff.compareTo(BigDecimal.ZERO) == 0)
        request.setAttribute("organizationPartyId", orgPartyId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTrialBalance: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. Balance Sheet (Bilanço)
 */
String getBalanceSheet() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        Timestamp asOfDate = null
        if (parameters.asOfDate) asOfDate = parseTimestamp(parameters.asOfDate)
        if (parameters.thruDate) asOfDate = parseTimestamp(parameters.thruDate)
        if (parameters.year) {
            asOfDate = Timestamp.valueOf(parameters.year.trim() + "-12-31 23:59:59.9")
        }

        List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry")
            .where("organizationPartyId", orgPartyId)
            .queryList()

        Map<String, BigDecimal> dMap = [:]
        Map<String, BigDecimal> cMap = [:]

        entries.each { entry ->
            if (asOfDate) {
                GenericValue trans = entry.getRelatedOne("AcctgTrans", false)
                if (trans && trans.transactionDate && trans.transactionDate.after(asOfDate)) return
            }

            String glId = entry.glAccountId
            BigDecimal amt = entry.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = entry.getString("debitCreditFlag")

            if ("D".equals(flag)) {
                dMap[glId] = (dMap[glId] ?: BigDecimal.ZERO).add(amt)
            } else if ("C".equals(flag)) {
                cMap[glId] = (cMap[glId] ?: BigDecimal.ZERO).add(amt)
            }
        }

        List currentAssets = []
        List longTermAssets = []
        List currentLiabilities = []
        List longTermLiabilities = []
        List equityAccounts = []

        BigDecimal totalCurrentAssets = BigDecimal.ZERO
        BigDecimal totalLongTermAssets = BigDecimal.ZERO
        BigDecimal totalCurrentLiabilities = BigDecimal.ZERO
        BigDecimal totalLongTermLiabilities = BigDecimal.ZERO
        BigDecimal totalEquity = BigDecimal.ZERO

        BigDecimal totalRevenueForPeriod = BigDecimal.ZERO
        BigDecimal totalExpenseForPeriod = BigDecimal.ZERO

        Set<String> allGlIds = new HashSet<>()
        allGlIds.addAll(dMap.keySet())
        allGlIds.addAll(cMap.keySet())

        allGlIds.each { glId ->
            GenericValue glAccount = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!glAccount) return

            String classId = glAccount.glAccountClassId ?: ""
            BigDecimal d = dMap[glId] ?: BigDecimal.ZERO
            BigDecimal c = cMap[glId] ?: BigDecimal.ZERO

            if (classId.contains("REVENUE") || classId.contains("INCOME")) {
                totalRevenueForPeriod = totalRevenueForPeriod.add(c.subtract(d))
            } else if (classId.contains("EXPENSE") || classId.contains("COGS") || classId.contains("DEPRECIATION")) {
                totalExpenseForPeriod = totalExpenseForPeriod.add(d.subtract(c))
            } else if (classId.contains("CURRENT_ASSET") || classId.contains("CASH_EQUIVALENT") || classId.contains("INVENTORY_ASSET")) {
                BigDecimal bal = d.subtract(c)
                currentAssets.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                totalCurrentAssets = totalCurrentAssets.add(bal)
            } else if (classId.contains("LONGTERM_ASSET") || classId.contains("FIXED_ASSET") || classId.contains("ASSET")) {
                BigDecimal bal = classId.contains("CONTRA") ? c.subtract(d).negate() : d.subtract(c)
                longTermAssets.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                totalLongTermAssets = totalLongTermAssets.add(bal)
            } else if (classId.contains("CURRENT_LIABILITY")) {
                BigDecimal bal = c.subtract(d)
                currentLiabilities.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                totalCurrentLiabilities = totalCurrentLiabilities.add(bal)
            } else if (classId.contains("LONGTERM_LIABILITY") || classId.contains("LIABILITY")) {
                BigDecimal bal = c.subtract(d)
                longTermLiabilities.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                totalLongTermLiabilities = totalLongTermLiabilities.add(bal)
            } else if (classId.contains("EQUITY")) {
                BigDecimal bal = c.subtract(d)
                equityAccounts.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                totalEquity = totalEquity.add(bal)
            }
        }

        BigDecimal netIncome = totalRevenueForPeriod.subtract(totalExpenseForPeriod)
        equityAccounts.add([
            glAccountId: "NET_INCOME",
            accountName: "Dönem Net Kârı / Zararı (Retained Earnings)",
            balance: netIncome.doubleValue()
        ])
        totalEquity = totalEquity.add(netIncome)

        BigDecimal totalAssets = totalCurrentAssets.add(totalLongTermAssets)
        BigDecimal totalLiabilities = totalCurrentLiabilities.add(totalLongTermLiabilities)
        BigDecimal totalLiabilitiesAndEquity = totalLiabilities.add(totalEquity)
        BigDecimal diff = totalAssets.subtract(totalLiabilitiesAndEquity)

        Map result = [
            asOfDate: asOfDate ? asOfDate.toString().substring(0, 10) : UtilDateTime.nowDateString("yyyy-MM-dd"),
            organizationPartyId: orgPartyId,
            assets: [
                currentAssets: currentAssets,
                totalCurrentAssets: totalCurrentAssets.doubleValue(),
                longTermAssets: longTermAssets,
                totalLongTermAssets: totalLongTermAssets.doubleValue(),
                totalAssets: totalAssets.doubleValue()
            ],
            liabilities: [
                currentLiabilities: currentLiabilities,
                totalCurrentLiabilities: totalCurrentLiabilities.doubleValue(),
                longTermLiabilities: longTermLiabilities,
                totalLongTermLiabilities: totalLongTermLiabilities.doubleValue(),
                totalLiabilities: totalLiabilities.doubleValue()
            ],
            equity: [
                equityAccounts: equityAccounts,
                totalEquity: totalEquity.doubleValue()
            ],
            totalLiabilitiesAndEquity: totalLiabilitiesAndEquity.doubleValue(),
            difference: diff.doubleValue(),
            isBalanced: Math.abs(diff.doubleValue()) < 0.01
        ]

        request.setAttribute("balanceSheet", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBalanceSheet: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. Income Statement (Gelir Tablosu / Kar-Zarar)
 */
String getIncomeStatement() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        Timestamp fromDate = null
        Timestamp thruDate = null

        if (UtilValidate.isNotEmpty(parameters.year)) {
            String y = parameters.year.trim()
            fromDate = Timestamp.valueOf(y + "-01-01 00:00:00.0")
            thruDate = Timestamp.valueOf(y + "-12-31 23:59:59.9")
        } else {
            if (parameters.fromDate) fromDate = parseTimestamp(parameters.fromDate)
            if (parameters.thruDate) thruDate = parseTimestamp(parameters.thruDate)
        }

        List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry")
            .where("organizationPartyId", orgPartyId)
            .queryList()

        Map<String, BigDecimal> dMap = [:]
        Map<String, BigDecimal> cMap = [:]

        entries.each { entry ->
            if (fromDate || thruDate) {
                GenericValue trans = entry.getRelatedOne("AcctgTrans", false)
                if (trans && trans.transactionDate) {
                    if (fromDate && trans.transactionDate.before(fromDate)) return
                    if (thruDate && trans.transactionDate.after(thruDate)) return
                }
            }

            String glId = entry.glAccountId
            BigDecimal amt = entry.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = entry.getString("debitCreditFlag")

            if ("D".equals(flag)) {
                dMap[glId] = (dMap[glId] ?: BigDecimal.ZERO).add(amt)
            } else if ("C".equals(flag)) {
                cMap[glId] = (cMap[glId] ?: BigDecimal.ZERO).add(amt)
            }
        }

        List revenues = []
        List cogs = []
        List expenses = []

        BigDecimal totalRevenue = BigDecimal.ZERO
        BigDecimal totalCogs = BigDecimal.ZERO
        BigDecimal totalExpenses = BigDecimal.ZERO

        Set<String> allGlIds = new HashSet<>()
        allGlIds.addAll(dMap.keySet())
        allGlIds.addAll(cMap.keySet())

        allGlIds.each { glId ->
            GenericValue glAccount = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!glAccount) return

            String classId = glAccount.glAccountClassId ?: ""
            BigDecimal d = dMap[glId] ?: BigDecimal.ZERO
            BigDecimal c = cMap[glId] ?: BigDecimal.ZERO

            if (classId.contains("REVENUE") || classId.contains("INCOME")) {
                BigDecimal bal = c.subtract(d)
                if (bal.compareTo(BigDecimal.ZERO) != 0) {
                    revenues.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                    totalRevenue = totalRevenue.add(bal)
                }
            } else if (classId.contains("COGS")) {
                BigDecimal bal = d.subtract(c)
                if (bal.compareTo(BigDecimal.ZERO) != 0) {
                    cogs.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                    totalCogs = totalCogs.add(bal)
                }
            } else if (classId.contains("EXPENSE") || classId.contains("DEPRECIATION") || classId.contains("AMORTIZATION")) {
                BigDecimal bal = d.subtract(c)
                if (bal.compareTo(BigDecimal.ZERO) != 0) {
                    expenses.add([glAccountId: glId, accountName: glAccount.accountName, balance: bal.doubleValue()])
                    totalExpenses = totalExpenses.add(bal)
                }
            }
        }

        BigDecimal grossProfit = totalRevenue.subtract(totalCogs)
        BigDecimal operatingIncome = grossProfit.subtract(totalExpenses)
        BigDecimal netIncome = operatingIncome

        Map result = [
            organizationPartyId: orgPartyId,
            period: parameters.year ?: "Tüm Zamanlar",
            revenues: revenues,
            totalRevenue: totalRevenue.doubleValue(),
            cogs: cogs,
            totalCogs: totalCogs.doubleValue(),
            grossProfit: grossProfit.doubleValue(),
            expenses: expenses,
            totalExpenses: totalExpenses.doubleValue(),
            operatingIncome: operatingIncome.doubleValue(),
            netIncome: netIncome.doubleValue()
        ]

        request.setAttribute("incomeStatement", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getIncomeStatement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. AR / AP Aging Summary (Yaşlandırma Raporu)
 */
String getAgingSummary() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String type = parameters.type ?: "AR" // "AR" (Alacak) or "AP" (Borç)
    String invoiceTypeId = "AR".equalsIgnoreCase(type) ? "SALES_INVOICE" : "PURCHASE_INVOICE"

    try {
        Timestamp now = UtilDateTime.nowTimestamp()

        List<GenericValue> invoices = EntityQuery.use(delegator).from("Invoice")
            .where(
                EntityCondition.makeCondition("invoiceTypeId", invoiceTypeId),
                EntityCondition.makeCondition("statusId", EntityOperator.NOT_IN, ["INVOICE_PAID", "INVOICE_CANCELLED", "INVOICE_WRITEOFF"])
            )
            .queryList()

        Map<String, Map> partyRows = [:]

        BigDecimal grandTotal = BigDecimal.ZERO
        BigDecimal totalCurrent = BigDecimal.ZERO
        BigDecimal totalDays1_30 = BigDecimal.ZERO
        BigDecimal totalDays31_60 = BigDecimal.ZERO
        BigDecimal totalDays61_90 = BigDecimal.ZERO
        BigDecimal totalDaysOver90 = BigDecimal.ZERO

        invoices.each { inv ->
            BigDecimal outstanding = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) return

            String partyId = "AR".equalsIgnoreCase(type) ? inv.partyId : inv.partyIdFrom
            if (!partyId) partyId = "Bilinmeyen"

            if (!partyRows.containsKey(partyId)) {
                partyRows[partyId] = [
                    partyId: partyId,
                    partyName: getPartyName(delegator, partyId),
                    current: BigDecimal.ZERO,
                    days1_30: BigDecimal.ZERO,
                    days31_60: BigDecimal.ZERO,
                    days61_90: BigDecimal.ZERO,
                    daysOver90: BigDecimal.ZERO,
                    total: BigDecimal.ZERO
                ]
            }

            Timestamp refDate = inv.dueDate ?: inv.invoiceDate ?: now
            long diffMs = now.getTime() - refDate.getTime()
            int diffDays = (int) (diffMs / (1000L * 60L * 60L * 24L))

            if (diffDays <= 0) {
                partyRows[partyId].current = partyRows[partyId].current.add(outstanding)
                totalCurrent = totalCurrent.add(outstanding)
            } else if (diffDays <= 30) {
                partyRows[partyId].days1_30 = partyRows[partyId].days1_30.add(outstanding)
                totalDays1_30 = totalDays1_30.add(outstanding)
            } else if (diffDays <= 60) {
                partyRows[partyId].days31_60 = partyRows[partyId].days31_60.add(outstanding)
                totalDays31_60 = totalDays31_60.add(outstanding)
            } else if (diffDays <= 90) {
                partyRows[partyId].days61_90 = partyRows[partyId].days61_90.add(outstanding)
                totalDays61_90 = totalDays61_90.add(outstanding)
            } else {
                partyRows[partyId].daysOver90 = partyRows[partyId].daysOver90.add(outstanding)
                totalDaysOver90 = totalDaysOver90.add(outstanding)
            }

            partyRows[partyId].total = partyRows[partyId].total.add(outstanding)
            grandTotal = grandTotal.add(outstanding)
        }

        List rows = []
        partyRows.values().each { r ->
            rows.add([
                partyId: r.partyId,
                partyName: r.partyName,
                current: r.current.doubleValue(),
                days1_30: r.days1_30.doubleValue(),
                days31_60: r.days31_60.doubleValue(),
                days61_90: r.days61_90.doubleValue(),
                daysOver90: r.daysOver90.doubleValue(),
                total: r.total.doubleValue()
            ])
        }

        rows.sort { a, b -> b.total <=> a.total }

        Map result = [
            type: type,
            bucketTotals: [
                current: totalCurrent.doubleValue(),
                days1_30: totalDays1_30.doubleValue(),
                days31_60: totalDays31_60.doubleValue(),
                days61_90: totalDays61_90.doubleValue(),
                daysOver90: totalDaysOver90.doubleValue(),
                grandTotal: grandTotal.doubleValue()
            ],
            rows: rows
        ]

        request.setAttribute("agingSummary", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAgingSummary: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. Cash Flow Statement (Nakit Akış Tablosu)
 */
String getCashFlowStatement() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        Timestamp fromDate = null
        Timestamp thruDate = null

        if (UtilValidate.isNotEmpty(parameters.year)) {
            String y = parameters.year.trim()
            fromDate = Timestamp.valueOf(y + "-01-01 00:00:00.0")
            thruDate = Timestamp.valueOf(y + "-12-31 23:59:59.9")
        }
        if (UtilValidate.isNotEmpty(parameters.fromDate)) {
            fromDate = parseTimestamp(parameters.fromDate)
        }
        if (UtilValidate.isNotEmpty(parameters.thruDate)) {
            thruDate = parseTimestamp(parameters.thruDate)
        }

        // Cash and cash equivalent GL accounts
        List<GenericValue> cashAccounts = EntityQuery.use(delegator).from("GlAccount")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("glAccountClassId", EntityOperator.IN, ["CASH_EQUIVALENT", "CASH_ASSET"]),
                EntityCondition.makeCondition("glAccountId", EntityOperator.LIKE, "111%")
            ], EntityOperator.OR))
            .queryList()
        Set<String> cashGlIds = new HashSet<>()
        cashAccounts.each { cashGlIds.add(it.glAccountId) }
        if (cashGlIds.isEmpty()) {
            cashGlIds.addAll(["111100", "111000", "112000"])
        }

        BigDecimal openingCash = BigDecimal.ZERO
        if (fromDate) {
            List<GenericValue> priorEntries = EntityQuery.use(delegator).from("AcctgTransAndEntries")
                .where(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId),
                    EntityCondition.makeCondition("glAccountId", EntityOperator.IN, cashGlIds),
                    EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN, fromDate)
                ], EntityOperator.AND))
                .queryList()

            priorEntries.each { pe ->
                BigDecimal amt = pe.getBigDecimal("amount") ?: BigDecimal.ZERO
                String flag = pe.getString("debitCreditFlag")
                if ("D".equals(flag)) {
                    openingCash = openingCash.add(amt)
                } else if ("C".equals(flag)) {
                    openingCash = openingCash.subtract(amt)
                }
            }
        }

        List<EntityCondition> periodConds = [
            EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId)
        ]
        if (fromDate) periodConds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        if (thruDate) periodConds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))

        List<GenericValue> periodEntries = EntityQuery.use(delegator).from("AcctgTransAndEntries")
            .where(EntityCondition.makeCondition(periodConds, EntityOperator.AND))
            .queryList()

        List operatingItems = []
        List investingItems = []
        List financingItems = []

        BigDecimal netCashFromOperating = BigDecimal.ZERO
        BigDecimal netCashFromInvesting = BigDecimal.ZERO
        BigDecimal netCashFromFinancing = BigDecimal.ZERO

        Map<String, BigDecimal> glNetMap = [:]
        periodEntries.each { pe ->
            String glId = pe.glAccountId
            BigDecimal amt = pe.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = pe.getString("debitCreditFlag")
            BigDecimal cur = glNetMap[glId] ?: BigDecimal.ZERO
            if ("D".equals(flag)) {
                glNetMap[glId] = cur.add(amt)
            } else {
                glNetMap[glId] = cur.subtract(amt)
            }
        }

        glNetMap.each { glId, netAmt ->
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!acc) return
            String accClass = acc.glAccountClassId ?: ""
            String accName = acc.accountName ?: glId

            if (cashGlIds.contains(glId)) return

            if (accClass.contains("REVENUE") || accClass.contains("INCOME")) {
                BigDecimal cashImpact = netAmt.negate()
                operatingItems.add([title: accName, code: acc.accountCode ?: glId, amount: cashImpact.doubleValue()])
                netCashFromOperating = netCashFromOperating.add(cashImpact)
            } else if (accClass.contains("EXPENSE")) {
                BigDecimal cashImpact = netAmt.negate()
                operatingItems.add([title: accName, code: acc.accountCode ?: glId, amount: cashImpact.doubleValue()])
                netCashFromOperating = netCashFromOperating.add(cashImpact)
            } else if (accClass.contains("CURRENT_ASSET") || accClass.contains("CURRENT_LIABILITY")) {
                BigDecimal cashImpact = accClass.contains("CURRENT_ASSET") ? netAmt.negate() : netAmt
                operatingItems.add([title: accName, code: acc.accountCode ?: glId, amount: cashImpact.doubleValue()])
                netCashFromOperating = netCashFromOperating.add(cashImpact)
            } else if (accClass.contains("LONGTERM_ASSET") || accClass.contains("FIXED_ASSET") || accClass.contains("INVENTORY_ASSET")) {
                BigDecimal cashImpact = netAmt.negate()
                investingItems.add([title: accName, code: acc.accountCode ?: glId, amount: cashImpact.doubleValue()])
                netCashFromInvesting = netCashFromInvesting.add(cashImpact)
            } else if (accClass.contains("EQUITY") || accClass.contains("LONGTERM_LIABILITY")) {
                BigDecimal cashImpact = netAmt
                financingItems.add([title: accName, code: acc.accountCode ?: glId, amount: cashImpact.doubleValue()])
                netCashFromFinancing = netCashFromFinancing.add(cashImpact)
            }
        }

        BigDecimal netCashChange = netCashFromOperating.add(netCashFromInvesting).add(netCashFromFinancing)
        BigDecimal closingCash = openingCash.add(netCashChange)

        Map result = [
            organizationPartyId: orgPartyId,
            fromDate: fromDate ? fromDate.toString().substring(0, 10) : null,
            thruDate: thruDate ? thruDate.toString().substring(0, 10) : null,
            operatingActivities: [
                items: operatingItems,
                netCash: netCashFromOperating.doubleValue()
            ],
            investingActivities: [
                items: investingItems,
                netCash: netCashFromInvesting.doubleValue()
            ],
            financingActivities: [
                items: financingItems,
                netCash: netCashFromFinancing.doubleValue()
            ],
            summary: [
                openingCash: openingCash.doubleValue(),
                netCashChange: netCashChange.doubleValue(),
                closingCash: closingCash.doubleValue()
            ]
        ]

        request.setAttribute("cashFlowStatement", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCashFlowStatement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. Comparative Balance Sheet (Karşılaştırmalı Bilanço)
 */
String getComparativeBalanceSheet() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        String year1 = parameters.year1?.trim() ?: "2025"
        String year2 = parameters.year2?.trim() ?: "2024"

        Timestamp asOfDate1 = Timestamp.valueOf(year1 + "-12-31 23:59:59.9")
        Timestamp asOfDate2 = Timestamp.valueOf(year2 + "-12-31 23:59:59.9")

        List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry")
            .where("organizationPartyId", orgPartyId)
            .queryList()

        Map<String, BigDecimal> dMap1 = [:]
        Map<String, BigDecimal> cMap1 = [:]
        Map<String, BigDecimal> dMap2 = [:]
        Map<String, BigDecimal> cMap2 = [:]

        entries.each { entry ->
            GenericValue trans = entry.getRelatedOne("AcctgTrans", false)
            if (!trans || !trans.transactionDate) return

            String glId = entry.glAccountId
            BigDecimal amt = entry.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = entry.getString("debitCreditFlag")

            if (!trans.transactionDate.after(asOfDate1)) {
                if ("D".equals(flag)) dMap1[glId] = (dMap1[glId] ?: BigDecimal.ZERO).add(amt)
                else if ("C".equals(flag)) cMap1[glId] = (cMap1[glId] ?: BigDecimal.ZERO).add(amt)
            }
            if (!trans.transactionDate.after(asOfDate2)) {
                if ("D".equals(flag)) dMap2[glId] = (dMap2[glId] ?: BigDecimal.ZERO).add(amt)
                else if ("C".equals(flag)) cMap2[glId] = (cMap2[glId] ?: BigDecimal.ZERO).add(amt)
            }
        }

        Set<String> allGlIds = new HashSet<>()
        allGlIds.addAll(dMap1.keySet())
        allGlIds.addAll(cMap1.keySet())
        allGlIds.addAll(dMap2.keySet())
        allGlIds.addAll(cMap2.keySet())

        List assetRows = []
        List liabilityRows = []
        List equityRows = []

        BigDecimal totalAssets1 = BigDecimal.ZERO
        BigDecimal totalAssets2 = BigDecimal.ZERO
        BigDecimal totalLiabilities1 = BigDecimal.ZERO
        BigDecimal totalLiabilities2 = BigDecimal.ZERO
        BigDecimal totalEquity1 = BigDecimal.ZERO
        BigDecimal totalEquity2 = BigDecimal.ZERO

        allGlIds.each { glId ->
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!acc) return

            String classId = acc.glAccountClassId ?: ""
            BigDecimal bal1 = (dMap1[glId] ?: BigDecimal.ZERO).subtract(cMap1[glId] ?: BigDecimal.ZERO)
            BigDecimal bal2 = (dMap2[glId] ?: BigDecimal.ZERO).subtract(cMap2[glId] ?: BigDecimal.ZERO)

            if (classId.contains("ASSET")) {
                BigDecimal diff = bal1.subtract(bal2)
                double pct = bal2.compareTo(BigDecimal.ZERO) != 0 ? (diff.doubleValue() / bal2.doubleValue() * 100.0) : 0.0
                assetRows.add([
                    glAccountId: glId,
                    accountName: acc.accountName ?: glId,
                    accountCode: acc.accountCode ?: glId,
                    balance1: bal1.doubleValue(),
                    balance2: bal2.doubleValue(),
                    diffAmount: diff.doubleValue(),
                    diffPercent: Math.round(pct * 10.0) / 10.0
                ])
                totalAssets1 = totalAssets1.add(bal1)
                totalAssets2 = totalAssets2.add(bal2)
            } else if (classId.contains("LIABILITY")) {
                BigDecimal crBal1 = bal1.negate()
                BigDecimal crBal2 = bal2.negate()
                BigDecimal diff = crBal1.subtract(crBal2)
                double pct = crBal2.compareTo(BigDecimal.ZERO) != 0 ? (diff.doubleValue() / crBal2.doubleValue() * 100.0) : 0.0
                liabilityRows.add([
                    glAccountId: glId,
                    accountName: acc.accountName ?: glId,
                    accountCode: acc.accountCode ?: glId,
                    balance1: crBal1.doubleValue(),
                    balance2: crBal2.doubleValue(),
                    diffAmount: diff.doubleValue(),
                    diffPercent: Math.round(pct * 10.0) / 10.0
                ])
                totalLiabilities1 = totalLiabilities1.add(crBal1)
                totalLiabilities2 = totalLiabilities2.add(crBal2)
            } else if (classId.contains("EQUITY")) {
                BigDecimal crBal1 = bal1.negate()
                BigDecimal crBal2 = bal2.negate()
                BigDecimal diff = crBal1.subtract(crBal2)
                double pct = crBal2.compareTo(BigDecimal.ZERO) != 0 ? (diff.doubleValue() / crBal2.doubleValue() * 100.0) : 0.0
                equityRows.add([
                    glAccountId: glId,
                    accountName: acc.accountName ?: glId,
                    accountCode: acc.accountCode ?: glId,
                    balance1: crBal1.doubleValue(),
                    balance2: crBal2.doubleValue(),
                    diffAmount: diff.doubleValue(),
                    diffPercent: Math.round(pct * 10.0) / 10.0
                ])
                totalEquity1 = totalEquity1.add(crBal1)
                totalEquity2 = totalEquity2.add(crBal2)
            }
        }

        assetRows.sort { it.accountCode ?: it.glAccountId }
        liabilityRows.sort { it.accountCode ?: it.glAccountId }
        equityRows.sort { it.accountCode ?: it.glAccountId }

        Map result = [
            period1: year1,
            period2: year2,
            assets: [
                rows: assetRows,
                total1: totalAssets1.doubleValue(),
                total2: totalAssets2.doubleValue(),
                diffAmount: totalAssets1.subtract(totalAssets2).doubleValue(),
                diffPercent: totalAssets2.compareTo(BigDecimal.ZERO) != 0 ? Math.round((totalAssets1.subtract(totalAssets2).doubleValue() / totalAssets2.doubleValue() * 100.0) * 10.0) / 10.0 : 0.0
            ],
            liabilities: [
                rows: liabilityRows,
                total1: totalLiabilities1.doubleValue(),
                total2: totalLiabilities2.doubleValue(),
                diffAmount: totalLiabilities1.subtract(totalLiabilities2).doubleValue(),
                diffPercent: totalLiabilities2.compareTo(BigDecimal.ZERO) != 0 ? Math.round((totalLiabilities1.subtract(totalLiabilities2).doubleValue() / totalLiabilities2.doubleValue() * 100.0) * 10.0) / 10.0 : 0.0
            ],
            equities: [
                rows: equityRows,
                total1: totalEquity1.doubleValue(),
                total2: totalEquity2.doubleValue(),
                diffAmount: totalEquity1.subtract(totalEquity2).doubleValue(),
                diffPercent: totalEquity2.compareTo(BigDecimal.ZERO) != 0 ? Math.round((totalEquity1.subtract(totalEquity2).doubleValue() / totalEquity2.doubleValue() * 100.0) * 10.0) / 10.0 : 0.0
            ]
        ]

        request.setAttribute("comparativeBalanceSheet", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getComparativeBalanceSheet: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. Comparative Income Statement (Karşılaştırmalı Gelir Tablosu)
 */
String getComparativeIncomeStatement() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        String year1 = parameters.year1?.trim() ?: "2025"
        String year2 = parameters.year2?.trim() ?: "2024"

        Timestamp fromDate1 = Timestamp.valueOf(year1 + "-01-01 00:00:00.0")
        Timestamp thruDate1 = Timestamp.valueOf(year1 + "-12-31 23:59:59.9")
        Timestamp fromDate2 = Timestamp.valueOf(year2 + "-01-01 00:00:00.0")
        Timestamp thruDate2 = Timestamp.valueOf(year2 + "-12-31 23:59:59.9")

        List<GenericValue> entries1 = EntityQuery.use(delegator).from("AcctgTransAndEntries")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId),
                EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate1),
                EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate1)
            ], EntityOperator.AND))
            .queryList()

        List<GenericValue> entries2 = EntityQuery.use(delegator).from("AcctgTransAndEntries")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId),
                EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate2),
                EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate2)
            ], EntityOperator.AND))
            .queryList()

        Map<String, BigDecimal> revMap1 = [:]
        Map<String, BigDecimal> expMap1 = [:]
        Map<String, BigDecimal> revMap2 = [:]
        Map<String, BigDecimal> expMap2 = [:]

        entries1.each { pe ->
            String glId = pe.glAccountId
            BigDecimal amt = pe.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = pe.getString("debitCreditFlag")
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!acc) return
            String cId = acc.glAccountClassId ?: ""
            if (cId.contains("REVENUE") || cId.contains("INCOME")) {
                BigDecimal bal = "C".equals(flag) ? amt : amt.negate()
                revMap1[glId] = (revMap1[glId] ?: BigDecimal.ZERO).add(bal)
            } else if (cId.contains("EXPENSE")) {
                BigDecimal bal = "D".equals(flag) ? amt : amt.negate()
                expMap1[glId] = (expMap1[glId] ?: BigDecimal.ZERO).add(bal)
            }
        }

        entries2.each { pe ->
            String glId = pe.glAccountId
            BigDecimal amt = pe.getBigDecimal("amount") ?: BigDecimal.ZERO
            String flag = pe.getString("debitCreditFlag")
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!acc) return
            String cId = acc.glAccountClassId ?: ""
            if (cId.contains("REVENUE") || cId.contains("INCOME")) {
                BigDecimal bal = "C".equals(flag) ? amt : amt.negate()
                revMap2[glId] = (revMap2[glId] ?: BigDecimal.ZERO).add(bal)
            } else if (cId.contains("EXPENSE")) {
                BigDecimal bal = "D".equals(flag) ? amt : amt.negate()
                expMap2[glId] = (expMap2[glId] ?: BigDecimal.ZERO).add(bal)
            }
        }

        Set<String> allRevIds = new HashSet<>()
        allRevIds.addAll(revMap1.keySet())
        allRevIds.addAll(revMap2.keySet())

        Set<String> allExpIds = new HashSet<>()
        allExpIds.addAll(expMap1.keySet())
        allExpIds.addAll(expMap2.keySet())

        List revenueRows = []
        List expenseRows = []
        BigDecimal totalRev1 = BigDecimal.ZERO
        BigDecimal totalRev2 = BigDecimal.ZERO
        BigDecimal totalExp1 = BigDecimal.ZERO
        BigDecimal totalExp2 = BigDecimal.ZERO

        allRevIds.each { glId ->
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!acc) return
            BigDecimal r1 = revMap1[glId] ?: BigDecimal.ZERO
            BigDecimal r2 = revMap2[glId] ?: BigDecimal.ZERO
            BigDecimal diff = r1.subtract(r2)
            double pct = r2.compareTo(BigDecimal.ZERO) != 0 ? (diff.doubleValue() / r2.doubleValue() * 100.0) : 0.0
            revenueRows.add([
                glAccountId: glId,
                accountName: acc.accountName ?: glId,
                accountCode: acc.accountCode ?: glId,
                amount1: r1.doubleValue(),
                amount2: r2.doubleValue(),
                diffAmount: diff.doubleValue(),
                diffPercent: Math.round(pct * 10.0) / 10.0
            ])
            totalRev1 = totalRev1.add(r1)
            totalRev2 = totalRev2.add(r2)
        }

        allExpIds.each { glId ->
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glId).queryOne()
            if (!acc) return
            BigDecimal e1 = expMap1[glId] ?: BigDecimal.ZERO
            BigDecimal e2 = expMap2[glId] ?: BigDecimal.ZERO
            BigDecimal diff = e1.subtract(e2)
            double pct = e2.compareTo(BigDecimal.ZERO) != 0 ? (diff.doubleValue() / e2.doubleValue() * 100.0) : 0.0
            expenseRows.add([
                glAccountId: glId,
                accountName: acc.accountName ?: glId,
                accountCode: acc.accountCode ?: glId,
                amount1: e1.doubleValue(),
                amount2: e2.doubleValue(),
                diffAmount: diff.doubleValue(),
                diffPercent: Math.round(pct * 10.0) / 10.0
            ])
            totalExp1 = totalExp1.add(e1)
            totalExp2 = totalExp2.add(e2)
        }

        BigDecimal netIncome1 = totalRev1.subtract(totalExp1)
        BigDecimal netIncome2 = totalRev2.subtract(totalExp2)
        BigDecimal netDiff = netIncome1.subtract(netIncome2)
        double netPct = netIncome2.compareTo(BigDecimal.ZERO) != 0 ? (netDiff.doubleValue() / netIncome2.doubleValue() * 100.0) : 0.0

        Map result = [
            period1: year1,
            period2: year2,
            revenues: [
                rows: revenueRows,
                total1: totalRev1.doubleValue(),
                total2: totalRev2.doubleValue(),
                diffAmount: totalRev1.subtract(totalRev2).doubleValue()
            ],
            expenses: [
                rows: expenseRows,
                total1: totalExp1.doubleValue(),
                total2: totalExp2.doubleValue(),
                diffAmount: totalExp1.subtract(totalExp2).doubleValue()
            ],
            netIncome: [
                net1: netIncome1.doubleValue(),
                net2: netIncome2.doubleValue(),
                diffAmount: netDiff.doubleValue(),
                diffPercent: Math.round(netPct * 10.0) / 10.0
            ]
        ]

        request.setAttribute("comparativeIncomeStatement", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getComparativeIncomeStatement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

