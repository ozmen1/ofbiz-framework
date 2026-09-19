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

final String MODULE = "BillingAccountEvents.groovy"

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
 * 1. getBillingAccountStatement
 * Returns detailed billing account statement ledger (chronological debits and credits),
 * running balance calculation, account limit utilization, roles, terms, and applied payments.
 */
String getBillingAccountStatement() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        if (UtilValidate.isEmpty(billingAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId parametresi zorunludur.")
            return "error"
        }

        GenericValue ba = EntityQuery.use(delegator).from("BillingAccount").where("billingAccountId", billingAccountId).queryOne()
        if (!ba) {
            request.setAttribute("_ERROR_MESSAGE_", "Cari hesap bulunamadı: " + billingAccountId)
            return "error"
        }

        BigDecimal accLimit = ba.accountLimit ?: BigDecimal.ZERO
        BigDecimal accountBal = BigDecimal.ZERO
        BigDecimal availBal = accLimit
        BigDecimal netBal = BigDecimal.ZERO

        try {
            Map balMap = dispatcher.runSync("calcBillingAccountBalance", [billingAccountId: billingAccountId, userLogin: uL])
            if (balMap.accountBalance != null) accountBal = balMap.accountBalance
            if (balMap.availableBalance != null) availBal = balMap.availableBalance
            if (balMap.netAccountBalance != null) netBal = balMap.netAccountBalance
        } catch (Exception be) {
            Debug.logWarning("calcBillingAccountBalance failed for " + billingAccountId + ": " + be.getMessage(), MODULE)
        }

        Timestamp fromDate = parseTimestamp(parameters.fromDate)
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        // 1. Roles
        List roles = EntityQuery.use(delegator).from("BillingAccountRole")
                .where("billingAccountId", billingAccountId)
                .orderBy("fromDate DESC")
                .queryList().collect {
            [
                billingAccountId: it.billingAccountId,
                partyId: it.partyId,
                partyName: getPartyName(delegator, it.partyId),
                roleTypeId: it.roleTypeId,
                fromDate: it.fromDate?.toString() ?: "",
                thruDate: it.thruDate?.toString() ?: ""
            ]
        }

        // 2. Terms
        List terms = EntityQuery.use(delegator).from("BillingAccountTerm")
                .where("billingAccountId", billingAccountId)
                .queryList().collect {
            [
                billingAccountTermId: it.billingAccountTermId,
                billingAccountId: it.billingAccountId,
                termTypeId: it.termTypeId,
                termValue: it.termValue ?: BigDecimal.ZERO,
                termDays: it.termDays ?: 0,
                description: it.description ?: "",
                uomId: it.uomId ?: ""
            ]
        }

        // 3. Invoices (Debits to this account)
        List<EntityCondition> invConds = [EntityCondition.makeCondition("billingAccountId", EntityOperator.EQUALS, billingAccountId)]
        if (fromDate) {
            invConds.add(EntityCondition.makeCondition("invoiceDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        if (thruDate) {
            invConds.add(EntityCondition.makeCondition("invoiceDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }

        List invList = EntityQuery.use(delegator).from("Invoice")
                .where(EntityCondition.makeCondition(invConds, EntityOperator.AND))
                .orderBy("invoiceDate ASC")
                .queryList()

        List statementEntries = []
        BigDecimal totalDebits = BigDecimal.ZERO

        for (GenericValue inv : invList) {
            BigDecimal invTotal = BigDecimal.ZERO
            try {
                Map invTotalRes = dispatcher.runSync("getInvoiceTotal", [invoiceId: inv.invoiceId, userLogin: uL])
                invTotal = invTotalRes.total ?: BigDecimal.ZERO
            } catch (Exception ignored) {}

            totalDebits = totalDebits.add(invTotal)

            statementEntries.add([
                id: "INV_" + inv.invoiceId,
                entryType: "INVOICE",
                refNum: inv.invoiceId,
                entryDate: inv.invoiceDate ? inv.invoiceDate.toString() : (inv.createdStamp ? inv.createdStamp.toString() : ""),
                rawTimestamp: inv.invoiceDate ?: inv.createdStamp,
                description: inv.description ?: ("Fatura #" + inv.invoiceId + " (" + (inv.invoiceTypeId ?: "") + ")"),
                partyId: inv.partyId,
                partyName: getPartyName(delegator, inv.partyId),
                debit: invTotal,
                credit: BigDecimal.ZERO,
                statusId: inv.statusId ?: "",
                currencyUomId: inv.currencyUomId ?: (ba.accountCurrencyUomId ?: "USD")
            ])
        }

        // 4. Payments Applied (Credits to this account)
        List paList = EntityQuery.use(delegator).from("PaymentApplication")
                .where("billingAccountId", billingAccountId)
                .queryList()

        List appliedPayments = []
        BigDecimal totalCredits = BigDecimal.ZERO

        for (GenericValue pa : paList) {
            GenericValue payment = null
            if (pa.paymentId) {
                payment = EntityQuery.use(delegator).from("Payment").where("paymentId", pa.paymentId).queryOne()
            }

            Timestamp pDate = payment?.effectiveDate ?: pa.createdStamp
            if (fromDate && pDate && pDate.before(fromDate)) continue
            if (thruDate && pDate && pDate.after(thruDate)) continue

            BigDecimal appliedAmt = pa.amountApplied ?: BigDecimal.ZERO
            totalCredits = totalCredits.add(appliedAmt)

            appliedPayments.add([
                paymentApplicationId: pa.paymentApplicationId,
                paymentId: pa.paymentId ?: "",
                invoiceId: pa.invoiceId ?: "",
                amountApplied: appliedAmt,
                effectiveDate: pDate ? pDate.toString() : "",
                paymentTypeId: payment?.paymentTypeId ?: "",
                paymentMethodTypeId: payment?.paymentMethodTypeId ?: "",
                partyIdFrom: payment?.partyIdFrom ?: "",
                partyNameFrom: getPartyName(delegator, payment?.partyIdFrom),
                statusId: payment?.statusId ?: ""
            ])

            statementEntries.add([
                id: "PMNT_APP_" + pa.paymentApplicationId,
                entryType: "PAYMENT",
                refNum: pa.paymentId ?: pa.paymentApplicationId,
                entryDate: pDate ? pDate.toString() : "",
                rawTimestamp: pDate,
                description: "Ödeme Tahsisatı #" + (pa.paymentId ?: "") + (pa.invoiceId ? " (Fatura #" + pa.invoiceId + ")" : ""),
                partyId: payment?.partyIdFrom ?: "",
                partyName: getPartyName(delegator, payment?.partyIdFrom),
                debit: BigDecimal.ZERO,
                credit: appliedAmt,
                statusId: payment?.statusId ?: "",
                currencyUomId: payment?.currencyUomId ?: (ba.accountCurrencyUomId ?: "USD")
            ])
        }

        // 5. Sort all entries chronologically by rawTimestamp
        statementEntries.sort { a, b ->
            Timestamp tA = (Timestamp) a.rawTimestamp
            Timestamp tB = (Timestamp) b.rawTimestamp
            if (tA == null && tB == null) return 0
            if (tA == null) return -1
            if (tB == null) return 1
            return tA.compareTo(tB)
        }

        // 6. Compute running balance
        BigDecimal running = BigDecimal.ZERO
        for (Map entry : statementEntries) {
            BigDecimal deb = (BigDecimal) entry.debit
            BigDecimal cred = (BigDecimal) entry.credit
            running = running.add(deb).subtract(cred)
            entry.runningBalance = running
            entry.remove("rawTimestamp") // clean up before JSON
        }

        BigDecimal netBalance = totalDebits.subtract(totalCredits)
        BigDecimal availableBalance = accLimit.subtract(netBalance)
        BigDecimal utilizationPercent = BigDecimal.ZERO
        if (accLimit.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercent = netBalance.divide(accLimit, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100")).setScale(2, RoundingMode.HALF_UP)
        }

        Map statementSummary = [
            billingAccountId: ba.billingAccountId,
            accountLimit: accLimit,
            totalDebits: totalDebits,
            totalCredits: totalCredits,
            netBalance: netBalance,
            availableBalance: availableBalance,
            utilizationPercent: utilizationPercent,
            currencyUomId: ba.accountCurrencyUomId ?: "USD",
            description: ba.description ?: "",
            fromDate: ba.fromDate?.toString() ?: "",
            thruDate: ba.thruDate?.toString() ?: "",
            entryCount: statementEntries.size()
        ]

        request.setAttribute("account", [
            billingAccountId: ba.billingAccountId,
            accountLimit: accLimit,
            accountBalance: accountBal,
            availableBalance: availBal,
            netAccountBalance: netBal,
            accountCurrencyUomId: ba.accountCurrencyUomId ?: "USD",
            description: ba.description ?: "",
            fromDate: ba.fromDate?.toString() ?: "",
            thruDate: ba.thruDate?.toString() ?: ""
        ])
        request.setAttribute("summary", statementSummary)
        request.setAttribute("entries", statementEntries)
        request.setAttribute("roles", roles)
        request.setAttribute("terms", terms)
        request.setAttribute("appliedPayments", appliedPayments)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBillingAccountStatement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. createBillingAccountRole
 * Adds a party role to a billing account (e.g. BILL_TO_CUSTOMER, CARRIER, etc.)
 */
String createBillingAccountRole() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim() ?: "BILL_TO_CUSTOMER"

        if (UtilValidate.isEmpty(billingAccountId) || UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId ve partyId zorunludur.")
            return "error"
        }

        Timestamp fromDate = parseTimestamp(parameters.fromDate) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        Map serviceIn = [
            userLogin: uL,
            billingAccountId: billingAccountId,
            partyId: partyId,
            roleTypeId: roleTypeId,
            fromDate: fromDate,
            thruDate: thruDate
        ]

        Map res = dispatcher.runSync("createBillingAccountRole", serviceIn)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Cari hesap rolü başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBillingAccountRole: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. removeBillingAccountRole
 * Removes a party role from a billing account.
 */
String removeBillingAccountRole() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim()
        Timestamp fromDate = parseTimestamp(parameters.fromDate)

        if (UtilValidate.isEmpty(billingAccountId) || UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(roleTypeId) || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId, partyId, roleTypeId ve fromDate parametreleri zorunludur.")
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            billingAccountId: billingAccountId,
            partyId: partyId,
            roleTypeId: roleTypeId,
            fromDate: fromDate
        ]

        Map res = dispatcher.runSync("removeBillingAccountRole", serviceIn)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Cari hesap rolü kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeBillingAccountRole: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. createBillingAccountTerm
 * Creates contractual or payment terms attached to the billing account.
 */
String createBillingAccountTerm() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        String termTypeId = parameters.termTypeId?.trim()

        if (UtilValidate.isEmpty(billingAccountId) || UtilValidate.isEmpty(termTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId ve termTypeId zorunludur.")
            return "error"
        }

        BigDecimal termValue = parameters.termValue ? new BigDecimal(parameters.termValue.toString().trim()) : null
        Long termDays = parameters.termDays ? Long.valueOf(parameters.termDays.toString().trim()) : null
        String description = parameters.description?.trim() ?: ""
        String uomId = parameters.uomId?.trim() ?: ""

        Map serviceIn = [
            userLogin: uL,
            billingAccountId: billingAccountId,
            termTypeId: termTypeId,
            termValue: termValue,
            termDays: termDays,
            description: description,
            uomId: uomId
        ]

        Map res = dispatcher.runSync("createBillingAccountTerm", serviceIn)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("billingAccountTermId", res.billingAccountTermId)
        request.setAttribute("_EVENT_MESSAGE_", "Cari hesap şartı oluşturuldu: " + res.billingAccountTermId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBillingAccountTerm: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. removeBillingAccountTerm
 * Removes a contractual term from a billing account.
 */
String removeBillingAccountTerm() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountTermId = parameters.billingAccountTermId?.trim()

        if (UtilValidate.isEmpty(billingAccountTermId)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountTermId zorunludur.")
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            billingAccountTermId: billingAccountTermId
        ]

        Map res = dispatcher.runSync("removeBillingAccountTerm", serviceIn)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Cari hesap şartı silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeBillingAccountTerm: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. applyPaymentToBillingAccount
 * Applies an incoming payment directly to a billing account.
 */
String applyPaymentToBillingAccount() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        String paymentId = parameters.paymentId?.trim()
        String amountAppliedStr = parameters.amountApplied?.toString()?.trim()

        if (UtilValidate.isEmpty(billingAccountId) || UtilValidate.isEmpty(paymentId) || UtilValidate.isEmpty(amountAppliedStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId, paymentId ve amountApplied parametreleri zorunludur.")
            return "error"
        }

        BigDecimal amountApplied = new BigDecimal(amountAppliedStr)

        Map serviceIn = [
            userLogin: uL,
            billingAccountId: billingAccountId,
            paymentId: paymentId,
            amountApplied: amountApplied
        ]

        Map res = dispatcher.runSync("createPaymentApplication", serviceIn)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("paymentApplicationId", res.paymentApplicationId)
        request.setAttribute("_EVENT_MESSAGE_", "Ödeme cari hesaba başarıyla tahsis edildi: " + res.paymentApplicationId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in applyPaymentToBillingAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. removeBillingAccountPaymentApplication
 * Removes a payment application from a billing account.
 */
String removeBillingAccountPaymentApplication() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String paymentApplicationId = parameters.paymentApplicationId?.trim()

        if (UtilValidate.isEmpty(paymentApplicationId)) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentApplicationId zorunludur.")
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            paymentApplicationId: paymentApplicationId
        ]

        Map res = dispatcher.runSync("removePaymentApplication", serviceIn)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Ödeme tahsisatı kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeBillingAccountPaymentApplication: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. massChangeInvoiceStatus
 * Bulk transitions the status of multiple invoices at once.
 */
String massChangeInvoiceStatus() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String invoiceIdsStr = parameters.invoiceIds?.trim()
        String statusId = parameters.statusId?.trim()

        if (UtilValidate.isEmpty(invoiceIdsStr) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "invoiceIds ve statusId parametreleri zorunludur.")
            return "error"
        }

        List<String> idList = []
        if (invoiceIdsStr.startsWith("[") && invoiceIdsStr.endsWith("]")) {
            // JSON array style
            String inner = invoiceIdsStr.substring(1, invoiceIdsStr.length() - 1)
            inner.split(",").each {
                String clean = it.replaceAll("[\"']", "").trim()
                if (clean) idList.add(clean)
            }
        } else {
            // Comma separated
            invoiceIdsStr.split(",").each {
                String clean = it.trim()
                if (clean) idList.add(clean)
            }
        }

        if (idList.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "Geçerli bir fatura listesi bulunamadı.")
            return "error"
        }

        int successCount = 0
        List<String> errors = []

        for (String invId : idList) {
            try {
                Map sRes = dispatcher.runSync("setInvoiceStatus", [
                    userLogin: uL,
                    invoiceId: invId,
                    statusId: statusId
                ])
                if (ServiceUtil.isError(sRes)) {
                    errors.add(invId + ": " + ServiceUtil.getErrorMessage(sRes))
                } else {
                    successCount++
                }
            } catch (Exception ex) {
                errors.add(invId + ": " + ex.getMessage())
            }
        }

        request.setAttribute("successCount", successCount)
        request.setAttribute("failureCount", errors.size())
        request.setAttribute("errors", errors)
        request.setAttribute("_EVENT_MESSAGE_", "${successCount} fatura başarıyla ${statusId} durumuna güncellendi." + (errors.size() > 0 ? " (${errors.size()} fatura güncellenemedi)" : ""))
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in massChangeInvoiceStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
