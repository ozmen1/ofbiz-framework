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
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "InvoiceEvents.groovy"

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

String getInvoiceMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> invoiceTypesGv = EntityQuery.use(delegator).from("InvoiceType").orderBy("description").queryList()
        List invoiceTypes = []
        invoiceTypesGv.each { it ->
            invoiceTypes.add([invoiceTypeId: it.invoiceTypeId, description: it.description ?: it.invoiceTypeId])
        }

        List<GenericValue> itemTypesGv = EntityQuery.use(delegator).from("InvoiceItemType").orderBy("description").queryList()
        List itemTypes = []
        itemTypesGv.each { it ->
            itemTypes.add([invoiceItemTypeId: it.invoiceItemTypeId, description: it.description ?: it.invoiceItemTypeId])
        }

        List<GenericValue> statusesGv = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "INVOICE_STATUS").orderBy("sequenceId").queryList()
        List statusList = []
        statusesGv.each { st ->
            statusList.add([statusId: st.statusId, description: st.description ?: st.statusId])
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
                invoiceTypes: invoiceTypes,
                invoiceItemTypes: itemTypes,
                statusList: statusList,
                parties: parties,
                currencies: currencies
        ]
        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInvoiceMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getInvoices() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        List conditions = []

        if (UtilValidate.isNotEmpty(parameters.invoiceId)) {
            conditions.add(EntityCondition.makeCondition("invoiceId", EntityOperator.LIKE, "%" + parameters.invoiceId.trim() + "%"))
        }
        if (UtilValidate.isNotEmpty(parameters.invoiceTypeId)) {
            conditions.add(EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, parameters.invoiceTypeId.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.statusId)) {
            conditions.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, parameters.statusId.trim()))
        }
        if (UtilValidate.isNotEmpty(parameters.partyIdFrom)) {
            conditions.add(EntityCondition.makeCondition("partyIdFrom", EntityOperator.LIKE, "%" + parameters.partyIdFrom.trim() + "%"))
        }
        if (UtilValidate.isNotEmpty(parameters.partyIdTo)) {
            conditions.add(EntityCondition.makeCondition("partyId", EntityOperator.LIKE, "%" + parameters.partyIdTo.trim() + "%"))
        }
        if (UtilValidate.isNotEmpty(parameters.fromDate)) {
            Timestamp fromTs = parseTimestamp(parameters.fromDate)
            if (fromTs) conditions.add(EntityCondition.makeCondition("invoiceDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromTs))
        }
        if (UtilValidate.isNotEmpty(parameters.thruDate)) {
            Timestamp thruTs = parseTimestamp(parameters.thruDate)
            if (thruTs) conditions.add(EntityCondition.makeCondition("invoiceDate", EntityOperator.LESS_THAN_EQUAL_TO, thruTs))
        }

        int viewIndex = 0
        int viewSize = 50
        try {
            if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString())
            if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString())
        } catch (Exception ignored) {}

        EntityCondition allCond = conditions ? EntityCondition.makeCondition(conditions, EntityOperator.AND) : null

        def countQuery = EntityQuery.use(delegator).from("Invoice")
        def listQuery = EntityQuery.use(delegator).from("Invoice").orderBy("-invoiceDate", "-invoiceId").maxRows(viewSize).offset(viewIndex * viewSize)

        if (allCond) {
            countQuery = countQuery.where((EntityCondition) allCond)
            listQuery = listQuery.where((EntityCondition) allCond)
        }

        long totalCount = countQuery.queryCount()
        List<GenericValue> invoicesGv = listQuery.queryList()

        List invoiceList = []
        invoicesGv.each { inv ->
            BigDecimal total = BigDecimal.ZERO
            BigDecimal outstanding = BigDecimal.ZERO
            try {
                total = InvoiceWorker.getInvoiceTotal(delegator, inv.invoiceId)
                outstanding = InvoiceWorker.getInvoiceNotApplied(delegator, inv.invoiceId)
            } catch (Exception e) {
                Debug.logWarning("Error calculating invoice totals for " + inv.invoiceId + ": " + e.getMessage(), MODULE)
            }

            invoiceList.add([
                    invoiceId: inv.invoiceId,
                    invoiceTypeId: inv.invoiceTypeId,
                    partyIdFrom: inv.partyIdFrom,
                    partyIdTo: inv.partyId,
                    invoiceDate: inv.invoiceDate ? inv.invoiceDate.toString().substring(0, 10) : "",
                    dueDate: inv.dueDate ? inv.dueDate.toString().substring(0, 10) : "",
                    statusId: inv.statusId,
                    description: inv.description,
                    currencyUomId: inv.currencyUomId ?: "USD",
                    total: total != null ? total.doubleValue() : 0.0,
                    outstandingAmount: outstanding != null ? outstanding.doubleValue() : 0.0
            ])
        }

        request.setAttribute("invoices", invoiceList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInvoices: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getInvoiceDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    if (UtilValidate.isEmpty(invoiceId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId zorunludur.")
        return "error"
    }

    try {
        GenericValue invoice = EntityQuery.use(delegator).from("Invoice").where("invoiceId", invoiceId).queryOne()
        if (!invoice) {
            request.setAttribute("_ERROR_MESSAGE_", "Fatura bulunamadı: " + invoiceId)
            return "error"
        }

        List<GenericValue> itemsGv = EntityQuery.use(delegator)
                .from("InvoiceItem")
                .where("invoiceId", invoiceId)
                .orderBy("invoiceItemSeqId")
                .queryList()

        List itemsList = []
        itemsGv.each { item ->
            BigDecimal qty = item.quantity ?: BigDecimal.ONE
            BigDecimal amt = item.amount ?: BigDecimal.ZERO
            BigDecimal itemTotal = qty.multiply(amt)

            itemsList.add([
                    invoiceId: item.invoiceId,
                    invoiceItemSeqId: item.invoiceItemSeqId,
                    invoiceItemTypeId: item.invoiceItemTypeId,
                    productId: item.productId,
                    description: item.description,
                    quantity: qty.doubleValue(),
                    amount: amt.doubleValue(),
                    itemTotal: itemTotal.doubleValue()
            ])
        }

        List<GenericValue> statusGv = EntityQuery.use(delegator)
                .from("InvoiceStatus")
                .where("invoiceId", invoiceId)
                .orderBy("statusDate")
                .queryList()

        List statusHistory = []
        statusGv.each { st ->
            statusHistory.add([
                    statusId: st.statusId,
                    statusDate: st.statusDate ? st.statusDate.toString() : "",
                    changeByUserLoginId: st.changeByUserLoginId
            ])
        }

        List<GenericValue> paymentsAppliedGv = EntityQuery.use(delegator)
                .from("PaymentApplication")
                .where("invoiceId", invoiceId)
                .queryList()

        List paymentsApplied = []
        paymentsAppliedGv.each { pa ->
            paymentsApplied.add([
                    paymentApplicationId: pa.paymentApplicationId,
                    paymentId: pa.paymentId,
                    amountApplied: pa.amountApplied != null ? pa.amountApplied.doubleValue() : 0.0,
                    billingAccountId: pa.billingAccountId
            ])
        }

        BigDecimal total = BigDecimal.ZERO
        BigDecimal taxTotal = BigDecimal.ZERO
        BigDecimal noTaxTotal = BigDecimal.ZERO
        BigDecimal appliedAmount = BigDecimal.ZERO
        BigDecimal outstandingAmount = BigDecimal.ZERO

        try {
            total = InvoiceWorker.getInvoiceTotal(delegator, invoiceId)
            taxTotal = InvoiceWorker.getInvoiceTaxTotal(invoice)
            noTaxTotal = InvoiceWorker.getInvoiceNoTaxTotal(invoice)
            appliedAmount = InvoiceWorker.getInvoiceApplied(delegator, invoiceId)
            outstandingAmount = InvoiceWorker.getInvoiceNotApplied(delegator, invoiceId)
        } catch (Exception e) {
            Debug.logWarning("Error calculating invoice totals: " + e.getMessage(), MODULE)
        }

        Map headerMap = [
                invoiceId: invoice.invoiceId,
                invoiceTypeId: invoice.invoiceTypeId,
                partyIdFrom: invoice.partyIdFrom,
                partyIdTo: invoice.partyId,
                invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.toString().substring(0, 10) : "",
                dueDate: invoice.dueDate ? invoice.dueDate.toString().substring(0, 10) : "",
                paidDate: invoice.paidDate ? invoice.paidDate.toString() : "",
                statusId: invoice.statusId,
                description: invoice.description,
                currencyUomId: invoice.currencyUomId ?: "USD",
                referenceNumber: invoice.referenceNumber
        ]

        request.setAttribute("invoice", headerMap)
        request.setAttribute("items", itemsList)
        request.setAttribute("statusHistory", statusHistory)
        request.setAttribute("paymentsApplied", paymentsApplied)
        request.setAttribute("totals", [
                total: total != null ? total.doubleValue() : 0.0,
                taxTotal: taxTotal != null ? taxTotal.doubleValue() : 0.0,
                subTotal: noTaxTotal != null ? noTaxTotal.doubleValue() : 0.0,
                appliedAmount: appliedAmount != null ? appliedAmount.doubleValue() : 0.0,
                outstandingAmount: outstandingAmount != null ? outstandingAmount.doubleValue() : 0.0
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInvoiceDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createInvoice() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceCtx = [
                userLogin: uL,
                invoiceTypeId: parameters.invoiceTypeId ?: "SALES_INVOICE",
                partyIdFrom: parameters.partyIdFrom,
                partyId: parameters.partyIdTo ?: parameters.partyId,
                statusId: "INVOICE_IN_PROCESS",
                invoiceDate: parseTimestamp(parameters.invoiceDate) ?: UtilDateTime.nowTimestamp(),
                dueDate: parseTimestamp(parameters.dueDate),
                currencyUomId: parameters.currencyUomId ?: "USD",
                description: parameters.description,
                referenceNumber: parameters.referenceNumber
        ]

        Map serviceRes = dispatcher.runSync("createInvoice", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", serviceRes.invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura başarıyla oluşturuldu: " + serviceRes.invoiceId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInvoice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String updateInvoice() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    if (UtilValidate.isEmpty(invoiceId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceCtx = [
                userLogin: uL,
                invoiceId: invoiceId,
                description: parameters.description,
                referenceNumber: parameters.referenceNumber
        ]

        if (UtilValidate.isNotEmpty(parameters.dueDate)) {
            serviceCtx.dueDate = parseTimestamp(parameters.dueDate)
        }
        if (UtilValidate.isNotEmpty(parameters.invoiceDate)) {
            serviceCtx.invoiceDate = parseTimestamp(parameters.invoiceDate)
        }
        if (UtilValidate.isNotEmpty(parameters.currencyUomId)) {
            serviceCtx.currencyUomId = parameters.currencyUomId
        }

        Map serviceRes = dispatcher.runSync("updateInvoice", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura başlığı güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateInvoice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String setInvoiceStatus() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String statusId = parameters.statusId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(statusId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve statusId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()
        Map serviceRes
        if ("INVOICE_CANCELLED".equals(statusId)) {
            serviceRes = dispatcher.runSync("cancelInvoice", [invoiceId: invoiceId, userLogin: uL])
        } else {
            Map ctx = [
                    invoiceId: invoiceId,
                    statusId: statusId,
                    userLogin: uL,
                    statusDate: UtilDateTime.nowTimestamp()
            ]
            if ("INVOICE_PAID".equals(statusId)) {
                ctx.paidDate = UtilDateTime.nowTimestamp()
            }
            serviceRes = dispatcher.runSync("setInvoiceStatus", ctx)
        }

        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setInvoiceStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createInvoiceItem() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    if (UtilValidate.isEmpty(invoiceId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        BigDecimal qty = BigDecimal.ONE
        BigDecimal amt = BigDecimal.ZERO
        if (parameters.quantity) qty = new BigDecimal(parameters.quantity.toString().trim())
        if (parameters.amount) amt = new BigDecimal(parameters.amount.toString().trim())

        Map serviceCtx = [
                userLogin: uL,
                invoiceId: invoiceId,
                invoiceItemTypeId: parameters.invoiceItemTypeId ?: "INV_PROD_ITEM",
                productId: parameters.productId,
                description: parameters.description,
                quantity: qty,
                amount: amt
        ]

        Map serviceRes = dispatcher.runSync("createInvoiceItem", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("invoiceItemSeqId", serviceRes.invoiceItemSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Kalem başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInvoiceItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String updateInvoiceItem() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String invoiceItemSeqId = parameters.invoiceItemSeqId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(invoiceItemSeqId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve invoiceItemSeqId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceCtx = [
                userLogin: uL,
                invoiceId: invoiceId,
                invoiceItemSeqId: invoiceItemSeqId,
                description: parameters.description
        ]

        if (parameters.invoiceItemTypeId) serviceCtx.invoiceItemTypeId = parameters.invoiceItemTypeId.trim()
        if (parameters.productId) serviceCtx.productId = parameters.productId.trim()
        if (parameters.quantity) serviceCtx.quantity = new BigDecimal(parameters.quantity.toString().trim())
        if (parameters.amount) serviceCtx.amount = new BigDecimal(parameters.amount.toString().trim())

        Map serviceRes = dispatcher.runSync("updateInvoiceItem", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("invoiceItemSeqId", invoiceItemSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Kalem güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateInvoiceItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String removeInvoiceItem() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String invoiceItemSeqId = parameters.invoiceItemSeqId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(invoiceItemSeqId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve invoiceItemSeqId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceRes = dispatcher.runSync("removeInvoiceItem", [
                userLogin: uL,
                invoiceId: invoiceId,
                invoiceItemSeqId: invoiceItemSeqId
        ])
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("invoiceItemSeqId", invoiceItemSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Kalem silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeInvoiceItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String copyInvoice() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    if (UtilValidate.isEmpty(invoiceId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()

        Map serviceRes = dispatcher.runSync("copyInvoice", [
                userLogin: uL,
                invoiceIdToCopyFrom: invoiceId
        ])
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        request.setAttribute("invoiceId", serviceRes.invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura başarıyla kopyalandı: " + serviceRes.invoiceId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in copyInvoice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
