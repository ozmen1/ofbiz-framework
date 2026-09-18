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
