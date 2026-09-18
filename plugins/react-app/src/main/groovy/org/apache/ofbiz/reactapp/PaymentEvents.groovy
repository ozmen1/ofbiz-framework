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
import org.apache.ofbiz.accounting.payment.PaymentWorker
import org.apache.ofbiz.accounting.invoice.InvoiceWorker
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "PaymentEvents.groovy"

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
    } catch (Exception e) {}
    return partyId
}

String getPaymentMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> pTypesGv = EntityQuery.use(delegator).from("PaymentType").orderBy("description").queryList()
        List paymentTypes = []
        pTypesGv.each {
            paymentTypes.add([paymentTypeId: it.paymentTypeId, description: it.description ?: it.paymentTypeId])
        }

        List<GenericValue> pmTypesGv = EntityQuery.use(delegator).from("PaymentMethodType").orderBy("description").queryList()
        List paymentMethodTypes = []
        pmTypesGv.each {
            paymentMethodTypes.add([paymentMethodTypeId: it.paymentMethodTypeId, description: it.description ?: it.paymentMethodTypeId])
        }

        List<GenericValue> statusesGv = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "PMNT_STATUS").orderBy("sequenceId").queryList()
        List statusList = []
        statusesGv.each {
            statusList.add([statusId: it.statusId, description: it.description ?: it.statusId])
        }

        List<GenericValue> partiesGv = EntityQuery.use(delegator).from("PartyNameView").maxRows(100).queryList()
        List parties = []
        partiesGv.each { p ->
            String name = p.groupName ?: ((p.firstName ?: "") + " " + (p.lastName ?: "")).trim()
            if (!name) name = p.partyId
            parties.add([partyId: p.partyId, name: name])
        }

        List<GenericValue> currenciesGv = EntityQuery.use(delegator).from("Uom").where("uomTypeId", "CURRENCY_MEASURE").orderBy("description").queryList()
        List currencies = []
        currenciesGv.each { c ->
            currencies.add([uomId: c.uomId, description: (c.description ?: c.uomId) + " (" + (c.abbreviation ?: c.uomId) + ")"])
        }

        Map metadata = [
            paymentTypes: paymentTypes,
            paymentMethodTypes: paymentMethodTypes,
            statusList: statusList,
            parties: parties,
            currencies: currencies
        ]

        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPaymentMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getPayments() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        List<EntityCondition> conds = []

        if (UtilValidate.isNotEmpty(parameters.paymentId)) {
            conds.add(EntityCondition.makeCondition("paymentId", EntityOperator.LIKE, "%" + parameters.paymentId.trim() + "%"))
        }
        if (UtilValidate.isNotEmpty(parameters.paymentTypeId)) {
            conds.add(EntityCondition.makeCondition("paymentTypeId", parameters.paymentTypeId.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.paymentMethodTypeId)) {
            conds.add(EntityCondition.makeCondition("paymentMethodTypeId", parameters.paymentMethodTypeId.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.statusId)) {
            conds.add(EntityCondition.makeCondition("statusId", parameters.statusId.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.partyIdFrom)) {
            conds.add(EntityCondition.makeCondition("partyIdFrom", parameters.partyIdFrom.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.partyIdTo)) {
            conds.add(EntityCondition.makeCondition("partyIdTo", parameters.partyIdTo.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.search)) {
            String s = parameters.search.trim()
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("paymentId", EntityOperator.LIKE, "%" + s + "%"),
                EntityCondition.makeCondition("partyIdFrom", EntityOperator.LIKE, "%" + s + "%"),
                EntityCondition.makeCondition("partyIdTo", EntityOperator.LIKE, "%" + s + "%"),
                EntityCondition.makeCondition("comments", EntityOperator.LIKE, "%" + s + "%"),
                EntityCondition.makeCondition("paymentRefNum", EntityOperator.LIKE, "%" + s + "%")
            ], EntityOperator.OR))
        }

        EntityCondition mainCond = conds ? EntityCondition.makeCondition(conds, EntityOperator.AND) : null

        long totalCount = mainCond ? EntityQuery.use(delegator).from("Payment").where(mainCond).queryCount() : EntityQuery.use(delegator).from("Payment").queryCount()

        int viewIndex = 0
        int viewSize = 20
        if (parameters.viewIndex) {
            try { viewIndex = Integer.parseInt(parameters.viewIndex.toString()) } catch (Exception e) {}
        }
        if (parameters.viewSize) {
            try { viewSize = Integer.parseInt(parameters.viewSize.toString()) } catch (Exception e) {}
        }

        def query = EntityQuery.use(delegator).from("Payment")
        if (mainCond) query = query.where(mainCond)
        query = query.orderBy("-effectiveDate", "-createdStamp")
                     .maxRows(viewSize)
                     .offset(viewIndex * viewSize)

        List<GenericValue> paymentList = query.queryList()

        Map<String, String> pTypeMap = [:]
        EntityQuery.use(delegator).from("PaymentType").queryList().each { pTypeMap[it.paymentTypeId] = it.description ?: it.paymentTypeId }

        Map<String, String> pmTypeMap = [:]
        EntityQuery.use(delegator).from("PaymentMethodType").queryList().each { pmTypeMap[it.paymentMethodTypeId] = it.description ?: it.paymentMethodTypeId }

        Map<String, String> statusMap = [:]
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "PMNT_STATUS").queryList().each { statusMap[it.statusId] = it.description ?: it.statusId }

        List payments = []
        paymentList.each { p ->
            BigDecimal amount = p.getBigDecimal("amount") ?: BigDecimal.ZERO
            BigDecimal applied = BigDecimal.ZERO
            BigDecimal open = BigDecimal.ZERO
            try {
                applied = PaymentWorker.getPaymentApplied(p) ?: BigDecimal.ZERO
                open = PaymentWorker.getPaymentNotApplied(p) ?: BigDecimal.ZERO
            } catch (Exception e) {
                Debug.logWarning("Could not calculate payment applied for " + p.paymentId + ": " + e.getMessage(), MODULE)
            }

            payments.add([
                paymentId: p.paymentId,
                paymentTypeId: p.paymentTypeId,
                paymentTypeDesc: pTypeMap.get(p.paymentTypeId) ?: p.paymentTypeId,
                paymentMethodTypeId: p.paymentMethodTypeId,
                paymentMethodTypeDesc: pmTypeMap.get(p.paymentMethodTypeId) ?: p.paymentMethodTypeId,
                partyIdFrom: p.partyIdFrom,
                partyNameFrom: getPartyName(delegator, p.partyIdFrom),
                partyIdTo: p.partyIdTo,
                partyNameTo: getPartyName(delegator, p.partyIdTo),
                statusId: p.statusId,
                statusDesc: statusMap.get(p.statusId) ?: p.statusId,
                amount: amount.doubleValue(),
                appliedAmount: applied.doubleValue(),
                openAmount: open.doubleValue(),
                currencyUomId: p.currencyUomId ?: "USD",
                effectiveDate: p.effectiveDate?.toString(),
                paymentRefNum: p.paymentRefNum,
                comments: p.comments
            ])
        }

        request.setAttribute("payments", payments)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPayments: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getPaymentDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String paymentId = parameters.paymentId
    if (UtilValidate.isEmpty(paymentId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentId zorunludur.")
        return "error"
    }

    try {
        GenericValue payment = EntityQuery.use(delegator).from("Payment").where("paymentId", paymentId).queryOne()
        if (!payment) {
            request.setAttribute("_ERROR_MESSAGE_", "Ödeme bulunamadı: " + paymentId)
            return "error"
        }

        GenericValue pType = payment.getRelatedOne("PaymentType", false)
        GenericValue pmType = payment.getRelatedOne("PaymentMethodType", false)
        GenericValue status = payment.getRelatedOne("StatusItem", false)

        BigDecimal amount = payment.getBigDecimal("amount") ?: BigDecimal.ZERO
        BigDecimal applied = BigDecimal.ZERO
        BigDecimal open = BigDecimal.ZERO
        try {
            applied = PaymentWorker.getPaymentApplied(payment) ?: BigDecimal.ZERO
            open = PaymentWorker.getPaymentNotApplied(payment) ?: BigDecimal.ZERO
        } catch (Exception e) {
            Debug.logWarning("Could not calculate payment applied for " + paymentId + ": " + e.getMessage(), MODULE)
        }

        Map paymentMap = [
            paymentId: payment.paymentId,
            paymentTypeId: payment.paymentTypeId,
            paymentTypeDesc: pType?.description ?: payment.paymentTypeId,
            paymentMethodTypeId: payment.paymentMethodTypeId,
            paymentMethodTypeDesc: pmType?.description ?: payment.paymentMethodTypeId,
            partyIdFrom: payment.partyIdFrom,
            partyNameFrom: getPartyName(delegator, payment.partyIdFrom),
            partyIdTo: payment.partyIdTo,
            partyNameTo: getPartyName(delegator, payment.partyIdTo),
            statusId: payment.statusId,
            statusDesc: status?.description ?: payment.statusId,
            amount: amount.doubleValue(),
            currencyUomId: payment.currencyUomId ?: "USD",
            effectiveDate: payment.effectiveDate?.toString(),
            paymentRefNum: payment.paymentRefNum,
            comments: payment.comments,
            paymentPreferenceId: payment.paymentPreferenceId
        ]

        List<GenericValue> applsGv = EntityQuery.use(delegator).from("PaymentApplication")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("paymentId", paymentId),
                EntityCondition.makeCondition("toPaymentId", paymentId)
            ], EntityOperator.OR))
            .orderBy("paymentApplicationId")
            .queryList()

        List applications = []
        applsGv.each { appl ->
            BigDecimal appAmount = appl.getBigDecimal("amountApplied") ?: BigDecimal.ZERO
            Map appMap = [
                paymentApplicationId: appl.paymentApplicationId,
                paymentId: appl.paymentId,
                toPaymentId: appl.toPaymentId,
                invoiceId: appl.invoiceId,
                invoiceItemSeqId: appl.invoiceItemSeqId,
                billingAccountId: appl.billingAccountId,
                amountApplied: appAmount.doubleValue()
            ]

            if (appl.invoiceId) {
                GenericValue inv = EntityQuery.use(delegator).from("Invoice").where("invoiceId", appl.invoiceId).queryOne()
                if (inv) {
                    appMap.invoiceDate = inv.invoiceDate?.toString()
                    appMap.invoiceStatusId = inv.statusId
                    appMap.invoiceDescription = inv.description
                    BigDecimal invTotal = InvoiceWorker.getInvoiceTotal(inv) ?: BigDecimal.ZERO
                    BigDecimal invNotApplied = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO
                    appMap.invoiceTotal = invTotal.doubleValue()
                    appMap.invoiceOutstanding = invNotApplied.doubleValue()
                }
            }
            applications.add(appMap)
        }

        List statusHistory = []

        request.setAttribute("payment", paymentMap)
        request.setAttribute("appliedAmount", applied.doubleValue())
        request.setAttribute("openAmount", open.doubleValue())
        request.setAttribute("applications", applications)
        request.setAttribute("statusHistory", statusHistory)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPaymentDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getOpenInvoicesForPayment() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String paymentId = parameters.paymentId
    if (UtilValidate.isEmpty(paymentId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentId zorunludur.")
        return "error"
    }

    try {
        GenericValue payment = EntityQuery.use(delegator).from("Payment").where("paymentId", paymentId).queryOne()
        if (!payment) {
            request.setAttribute("_ERROR_MESSAGE_", "Ödeme bulunamadı.")
            return "error"
        }

        String pFrom = payment.partyIdFrom
        String pTo = payment.partyIdTo

        List<EntityCondition> partyConds = []
        partyConds.add(EntityCondition.makeCondition([
            EntityCondition.makeCondition("partyIdFrom", pFrom),
            EntityCondition.makeCondition("partyId", pTo)
        ], EntityOperator.AND))
        partyConds.add(EntityCondition.makeCondition([
            EntityCondition.makeCondition("partyIdFrom", pTo),
            EntityCondition.makeCondition("partyId", pFrom)
        ], EntityOperator.AND))

        EntityCondition mainCond = EntityCondition.makeCondition([
            EntityCondition.makeCondition(partyConds, EntityOperator.OR),
            EntityCondition.makeCondition("statusId", EntityOperator.NOT_IN, ["INVOICE_CANCELLED", "INVOICE_PAID", "INVOICE_WRITEOFF"])
        ], EntityOperator.AND)

        List<GenericValue> invoicesGv = EntityQuery.use(delegator).from("Invoice")
            .where(mainCond)
            .orderBy("-invoiceDate")
            .queryList()

        List openInvoices = []
        invoicesGv.each { inv ->
            BigDecimal outstanding = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO
            if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal total = InvoiceWorker.getInvoiceTotal(inv) ?: BigDecimal.ZERO
                openInvoices.add([
                    invoiceId: inv.invoiceId,
                    invoiceTypeId: inv.invoiceTypeId,
                    invoiceDate: inv.invoiceDate?.toString(),
                    dueDate: inv.dueDate?.toString(),
                    statusId: inv.statusId,
                    description: inv.description,
                    currencyUomId: inv.currencyUomId ?: "USD",
                    total: total.doubleValue(),
                    outstandingAmount: outstanding.doubleValue()
                ])
            }
        }

        request.setAttribute("openInvoices", openInvoices)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getOpenInvoicesForPayment: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createPayment() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    if (UtilValidate.isEmpty(parameters.paymentTypeId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentTypeId zorunludur.")
        return "error"
    }
    if (UtilValidate.isEmpty(parameters.partyIdFrom) || UtilValidate.isEmpty(parameters.partyIdTo)) {
        request.setAttribute("_ERROR_MESSAGE_", "partyIdFrom ve partyIdTo zorunludur.")
        return "error"
    }
    if (UtilValidate.isEmpty(parameters.amount)) {
        request.setAttribute("_ERROR_MESSAGE_", "amount zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceCtx = [
            userLogin: uL,
            paymentTypeId: parameters.paymentTypeId.trim(),
            partyIdFrom: parameters.partyIdFrom.trim(),
            partyIdTo: parameters.partyIdTo.trim(),
            amount: new BigDecimal(parameters.amount.toString().trim())
        ]

        if (parameters.paymentMethodTypeId) serviceCtx.paymentMethodTypeId = parameters.paymentMethodTypeId.trim()
        if (parameters.paymentMethodId) serviceCtx.paymentMethodId = parameters.paymentMethodId.trim()
        if (parameters.currencyUomId) serviceCtx.currencyUomId = parameters.currencyUomId.trim()
        if (parameters.paymentRefNum) serviceCtx.paymentRefNum = parameters.paymentRefNum.trim()
        if (parameters.comments) serviceCtx.comments = parameters.comments.trim()
        if (parameters.statusId) serviceCtx.statusId = parameters.statusId.trim()

        if (parameters.effectiveDate) {
            Timestamp effDate = parseTimestamp(parameters.effectiveDate)
            if (effDate) serviceCtx.effectiveDate = effDate
        }

        Map serviceRes = dispatcher.runSync("createPayment", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("paymentId", serviceRes.paymentId)
        request.setAttribute("_EVENT_MESSAGE_", "Ödeme başarıyla oluşturuldu: " + serviceRes.paymentId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPayment: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String updatePayment() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String paymentId = parameters.paymentId
    if (UtilValidate.isEmpty(paymentId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceCtx = [
            userLogin: uL,
            paymentId: paymentId
        ]

        if (parameters.paymentMethodTypeId) serviceCtx.paymentMethodTypeId = parameters.paymentMethodTypeId.trim()
        if (parameters.amount) serviceCtx.amount = new BigDecimal(parameters.amount.toString().trim())
        if (parameters.paymentRefNum != null) serviceCtx.paymentRefNum = parameters.paymentRefNum.trim()
        if (parameters.comments != null) serviceCtx.comments = parameters.comments.trim()
        if (parameters.currencyUomId) serviceCtx.currencyUomId = parameters.currencyUomId.trim()
        if (parameters.effectiveDate) {
            Timestamp effDate = parseTimestamp(parameters.effectiveDate)
            if (effDate) serviceCtx.effectiveDate = effDate
        }

        Map serviceRes = dispatcher.runSync("updatePayment", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("paymentId", paymentId)
        request.setAttribute("_EVENT_MESSAGE_", "Ödeme güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updatePayment: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String setPaymentStatus() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String paymentId = parameters.paymentId
    String statusId = parameters.statusId
    if (UtilValidate.isEmpty(paymentId) || UtilValidate.isEmpty(statusId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentId ve statusId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceRes = dispatcher.runSync("setPaymentStatus", [
            userLogin: uL,
            paymentId: paymentId,
            statusId: statusId
        ])
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("paymentId", paymentId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("_EVENT_MESSAGE_", "Ödeme durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setPaymentStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createPaymentApplication() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String paymentId = parameters.paymentId
    if (UtilValidate.isEmpty(paymentId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceCtx = [
            userLogin: uL,
            paymentId: paymentId
        ]
        if (parameters.invoiceId) serviceCtx.invoiceId = parameters.invoiceId.trim()
        if (parameters.billingAccountId) serviceCtx.billingAccountId = parameters.billingAccountId.trim()
        if (parameters.amountApplied) {
            serviceCtx.amountApplied = new BigDecimal(parameters.amountApplied.toString().trim())
        }

        Map serviceRes = dispatcher.runSync("createPaymentApplication", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        if (parameters.invoiceId) {
            try {
                dispatcher.runSync("checkPaymentInvoices", [userLogin: uL, paymentId: paymentId])
            } catch (Exception e) {
                Debug.logWarning("Could not check payment invoices: " + e.getMessage(), MODULE)
            }
        }

        request.setAttribute("paymentApplicationId", serviceRes.paymentApplicationId)
        request.setAttribute("paymentId", paymentId)
        request.setAttribute("_EVENT_MESSAGE_", "Ödeme faturaya başarıyla uygulandı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPaymentApplication: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String removePaymentApplication() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String paymentApplicationId = parameters.paymentApplicationId
    if (UtilValidate.isEmpty(paymentApplicationId)) {
        request.setAttribute("_ERROR_MESSAGE_", "paymentApplicationId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceRes = dispatcher.runSync("removePaymentApplication", [
            userLogin: uL,
            paymentApplicationId: paymentApplicationId
        ])
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("paymentApplicationId", paymentApplicationId)
        request.setAttribute("_EVENT_MESSAGE_", "Ödeme mahsubu kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removePaymentApplication: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
