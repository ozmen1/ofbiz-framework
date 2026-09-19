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
import java.sql.Timestamp
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Collections
import java.util.Comparator

final String MODULE = "PartyStatementEvents.groovy"

GenericValue getSystemUserLogin() {
    GenericValue uL = (GenericValue) binding.getVariable("userLogin")
    if (!uL) {
        def delegator = binding.getVariable("delegator")
        uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
        if (!uL) {
            uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }
    }
    return uL
}

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
        Debug.logWarning("Could not parse timestamp: " + str, MODULE)
        return null
    }
}

String getPartyName(def delegator, String partyId) {
    if (UtilValidate.isEmpty(partyId)) return ""
    try {
        GenericValue group = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).queryOne()
        if (group && group.groupName) return group.groupName
        GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
        if (person) {
            String fn = person.firstName ?: ""
            String ln = person.lastName ?: ""
            return (fn + " " + ln).trim()
        }
    } catch (Exception ignored) {}
    return partyId
}

/**
 * getPartyFinancialStatement
 * Generates customer or vendor statement ledger, chronological entries,
 * running balance, and aging buckets (Current, 1-30, 31-60, 61-90, 90+ days).
 */
String getPartyFinancialStatement() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()

        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId parametresi zorunludur.")
            return "error"
        }

        GenericValue party = EntityQuery.use(delegator).from("Party").where("partyId", partyId).queryOne()
        if (!party) {
            request.setAttribute("_ERROR_MESSAGE_", "Taraf bulunamadı: " + partyId)
            return "error"
        }

        String partyName = getPartyName(delegator, partyId)
        Timestamp fromDate = parseTimestamp(parameters.fromDate)
        Timestamp thruDate = parseTimestamp(parameters.thruDate)
        Timestamp now = UtilDateTime.nowTimestamp()

        // 1. Query Invoices related to party
        // (partyId = customer OR partyIdFrom = vendor)
        EntityCondition invPartyCond = EntityCondition.makeCondition([
            EntityCondition.makeCondition("partyId", EntityOperator.EQUALS, partyId),
            EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId)
        ], EntityOperator.OR)

        List<GenericValue> invoices = EntityQuery.use(delegator).from("Invoice")
                .where(invPartyCond)
                .orderBy("invoiceDate ASC")
                .queryList()

        // 2. Query Payments related to party
        EntityCondition pmntPartyCond = EntityCondition.makeCondition([
            EntityCondition.makeCondition("partyIdTo", EntityOperator.EQUALS, partyId),
            EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId)
        ], EntityOperator.OR)

        List<GenericValue> payments = EntityQuery.use(delegator).from("Payment")
                .where(pmntPartyCond)
                .orderBy("effectiveDate ASC")
                .queryList()

        BigDecimal totalInvoiced = BigDecimal.ZERO
        BigDecimal totalPaid = BigDecimal.ZERO
        BigDecimal openBalance = BigDecimal.ZERO

        // Aging buckets
        BigDecimal ageCurrent = BigDecimal.ZERO
        BigDecimal age1_30 = BigDecimal.ZERO
        BigDecimal age31_60 = BigDecimal.ZERO
        BigDecimal age61_90 = BigDecimal.ZERO
        BigDecimal age90Plus = BigDecimal.ZERO

        List openInvoices = []
        List statementEntries = []

        for (GenericValue inv : invoices) {
            if ("INVOICE_CANCELLED".equals(inv.statusId)) continue

            BigDecimal invTotal = BigDecimal.ZERO
            BigDecimal outstanding = BigDecimal.ZERO
            try {
                Map totalRes = dispatcher.runSync("getInvoiceTotal", [invoiceId: inv.invoiceId, userLogin: uL])
                invTotal = totalRes.total ?: BigDecimal.ZERO
                Map notAppliedRes = dispatcher.runSync("getInvoiceNotApplied", [invoiceId: inv.invoiceId, userLogin: uL])
                outstanding = notAppliedRes.notApplied ?: BigDecimal.ZERO
            } catch (Exception ignored) {}

            Timestamp invDate = inv.invoiceDate ?: inv.createdStamp

            // Determine if AR (Customer owes us) or AP (We owe vendor)
            boolean isCustomerInvoice = partyId.equals(inv.partyId) // partyId is customer billed
            BigDecimal debit = isCustomerInvoice ? invTotal : BigDecimal.ZERO
            BigDecimal credit = isCustomerInvoice ? BigDecimal.ZERO : invTotal

            totalInvoiced = totalInvoiced.add(invTotal)
            openBalance = openBalance.add(outstanding)

            // Aging calculation on outstanding amount
            if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
                Timestamp dueDate = inv.dueDate ?: invDate
                long diffMillis = now.getTime() - (dueDate ? dueDate.getTime() : now.getTime())
                long daysOverdue = diffMillis / (1000 * 60 * 60 * 24)

                if (daysOverdue <= 0) {
                    ageCurrent = ageCurrent.add(outstanding)
                } else if (daysOverdue <= 30) {
                    age1_30 = age1_30.add(outstanding)
                } else if (daysOverdue <= 60) {
                    age31_60 = age31_60.add(outstanding)
                } else if (daysOverdue <= 90) {
                    age61_90 = age61_90.add(outstanding)
                } else {
                    age90Plus = age90Plus.add(outstanding)
                }

                openInvoices.add([
                    invoiceId: inv.invoiceId,
                    invoiceTypeId: inv.invoiceTypeId,
                    invoiceDate: invDate ? invDate.toString() : "",
                    dueDate: dueDate ? dueDate.toString() : "",
                    total: invTotal,
                    outstandingAmount: outstanding,
                    daysOverdue: Math.max(0, daysOverdue),
                    currencyUomId: inv.currencyUomId ?: "USD",
                    statusId: inv.statusId
                ])
            }

            // Filter for statement ledger date range
            if (fromDate && invDate && invDate.before(fromDate)) continue
            if (thruDate && invDate && invDate.after(thruDate)) continue

            statementEntries.add([
                id: "INV_" + inv.invoiceId,
                entryType: "INVOICE",
                refNum: inv.invoiceId,
                entryDate: invDate ? invDate.toString() : "",
                rawTimestamp: invDate,
                description: inv.description ?: ("Fatura #" + inv.invoiceId + " (" + (inv.invoiceTypeId ?: "") + ")"),
                debit: debit,
                credit: credit,
                statusId: inv.statusId,
                currencyUomId: inv.currencyUomId ?: "USD"
            ])
        }

        // Payments processing
        List unappliedPayments = []
        for (GenericValue p : payments) {
            if ("PMNT_CANCELLED".equals(p.statusId) || "PMNT_VOID".equals(p.statusId)) continue

            BigDecimal pAmt = p.amount ?: BigDecimal.ZERO
            totalPaid = totalPaid.add(pAmt)

            Timestamp pDate = p.effectiveDate ?: p.createdStamp
            boolean isIncoming = partyId.equals(p.partyIdFrom) // Customer paying us
            BigDecimal debit = isIncoming ? BigDecimal.ZERO : pAmt
            BigDecimal credit = isIncoming ? pAmt : BigDecimal.ZERO

            BigDecimal notApplied = BigDecimal.ZERO
            try {
                Map notAppliedRes = dispatcher.runSync("getPaymentNotApplied", [paymentId: p.paymentId, userLogin: uL])
                notApplied = notAppliedRes.notApplied ?: BigDecimal.ZERO
            } catch (Exception ignored) {}

            if (notApplied.compareTo(BigDecimal.ZERO) > 0) {
                unappliedPayments.add([
                    paymentId: p.paymentId,
                    paymentTypeId: p.paymentTypeId,
                    effectiveDate: pDate ? pDate.toString() : "",
                    amount: pAmt,
                    unappliedAmount: notApplied,
                    statusId: p.statusId,
                    currencyUomId: p.currencyUomId ?: "USD"
                ])
            }

            // Filter for statement ledger date range
            if (fromDate && pDate && pDate.before(fromDate)) continue
            if (thruDate && pDate && pDate.after(thruDate)) continue

            statementEntries.add([
                id: "PMNT_" + p.paymentId,
                entryType: "PAYMENT",
                refNum: p.paymentId,
                entryDate: pDate ? pDate.toString() : "",
                rawTimestamp: pDate,
                description: p.comments ?: ("Tahsilat/Ödeme #" + p.paymentId + " (" + (p.paymentMethodTypeId ?: "") + ")"),
                debit: debit,
                credit: credit,
                statusId: p.statusId,
                currencyUomId: p.currencyUomId ?: "USD"
            ])
        }

        // Sort chronologically
        statementEntries.sort { a, b ->
            Timestamp tA = (Timestamp) a.rawTimestamp
            Timestamp tB = (Timestamp) b.rawTimestamp
            if (tA == null && tB == null) return 0
            if (tA == null) return -1
            if (tB == null) return 1
            return tA.compareTo(tB)
        }

        // Calculate running balance
        BigDecimal running = BigDecimal.ZERO
        for (Map entry : statementEntries) {
            BigDecimal deb = (BigDecimal) entry.debit
            BigDecimal cred = (BigDecimal) entry.credit
            running = running.add(deb).subtract(cred)
            entry.runningBalance = running
            entry.remove("rawTimestamp")
        }

        Map partySummary = [
            partyId: partyId,
            partyName: partyName,
            totalInvoiced: totalInvoiced,
            totalPaid: totalPaid,
            openBalance: openBalance,
            fromDate: fromDate?.toString() ?: "",
            thruDate: thruDate?.toString() ?: "",
            entryCount: statementEntries.size()
        ]

        Map agingSummary = [
            current: ageCurrent,
            days1_30: age1_30,
            days31_60: age31_60,
            days61_90: age61_90,
            days90Plus: age90Plus,
            totalOverdue: age1_30.add(age31_60).add(age61_90).add(age90Plus)
        ]

        request.setAttribute("party", partySummary)
        request.setAttribute("aging", agingSummary)
        request.setAttribute("entries", statementEntries)
        request.setAttribute("openInvoices", openInvoices)
        request.setAttribute("unappliedPayments", unappliedPayments)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyFinancialStatement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
