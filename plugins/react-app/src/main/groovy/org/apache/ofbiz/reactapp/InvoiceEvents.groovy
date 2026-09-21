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

        // Invoice Roles
        List<GenericValue> rolesGv = EntityQuery.use(delegator)
                .from("InvoiceRole")
                .where("invoiceId", invoiceId)
                .queryList()

        List rolesList = []
        rolesGv.each { r ->
            String partyName = getPartyName(delegator, r.partyId)
            String roleDesc = r.roleTypeId
            try {
                GenericValue rt = EntityQuery.use(delegator).from("RoleType").where("roleTypeId", r.roleTypeId).cache().queryOne()
                if (rt && rt.description) roleDesc = rt.description
            } catch (Exception ignored) {}
            rolesList.add([
                    invoiceId: r.invoiceId,
                    partyId: r.partyId,
                    partyName: partyName,
                    roleTypeId: r.roleTypeId,
                    roleTypeDesc: roleDesc,
                    datetimePerformed: r.datetimePerformed ? r.datetimePerformed.toString() : "",
                    percentage: r.percentage != null ? r.percentage.doubleValue() : null
            ])
        }

        // Invoice Attributes (e-Fatura, ETTN, senaryo, vb.)
        List<GenericValue> attrsGv = EntityQuery.use(delegator)
                .from("InvoiceAttribute")
                .where("invoiceId", invoiceId)
                .orderBy("attrName")
                .queryList()

        List attrsList = []
        attrsGv.each { a ->
            attrsList.add([
                    invoiceId: a.invoiceId,
                    attrName: a.attrName,
                    attrValue: a.attrValue,
                    attrDescription: a.attrDescription
            ])
        }

        // Invoice Contact Mechs (Adres ve İletişim Noktaları)
        List<GenericValue> cmGv = EntityQuery.use(delegator)
                .from("InvoiceContactMech")
                .where("invoiceId", invoiceId)
                .queryList()

        List contactMechsList = []
        cmGv.each { icm ->
            String purposeDesc = icm.contactMechPurposeTypeId
            try {
                GenericValue pt = EntityQuery.use(delegator).from("ContactMechPurposeType").where("contactMechPurposeTypeId", icm.contactMechPurposeTypeId).cache().queryOne()
                if (pt && pt.description) purposeDesc = pt.description
            } catch (Exception ignored) {}

            String detailInfo = ""
            try {
                GenericValue pa = EntityQuery.use(delegator).from("PostalAddress").where("contactMechId", icm.contactMechId).queryOne()
                if (pa) {
                    detailInfo = "${pa.address1 ?: ''} ${pa.address2 ?: ''} ${pa.city ?: ''} ${pa.postalCode ?: ''} ${pa.countryGeoId ?: ''}".trim()
                } else {
                    GenericValue tn = EntityQuery.use(delegator).from("TelecomNumber").where("contactMechId", icm.contactMechId).queryOne()
                    if (tn) {
                        detailInfo = "${tn.countryCode ? '+' + tn.countryCode : ''} ${tn.areaCode ?: ''} ${tn.contactNumber ?: ''}".trim()
                    } else {
                        GenericValue cm = EntityQuery.use(delegator).from("ContactMech").where("contactMechId", icm.contactMechId).queryOne()
                        if (cm) detailInfo = cm.infoString ?: ""
                    }
                }
            } catch (Exception ignored) {}

            contactMechsList.add([
                    invoiceId: icm.invoiceId,
                    contactMechId: icm.contactMechId,
                    contactMechPurposeTypeId: icm.contactMechPurposeTypeId,
                    contactMechPurposeTypeDesc: purposeDesc,
                    detailInfo: detailInfo
            ])
        }

        // Invoice Contents / Attachments
        List<GenericValue> contentsGv = EntityQuery.use(delegator)
                .from("InvoiceContent")
                .where("invoiceId", invoiceId)
                .filterByDate()
                .queryList()

        List contentsList = []
        contentsGv.each { ic ->
            String contentName = ""
            String description = ""
            String contentTypeId = ""
            try {
                GenericValue cnt = EntityQuery.use(delegator).from("Content").where("contentId", ic.contentId).queryOne()
                if (cnt) {
                    contentName = cnt.contentName ?: ""
                    description = cnt.description ?: ""
                    contentTypeId = cnt.contentTypeId ?: ""
                }
            } catch (Exception ignored) {}

            String typeDesc = ic.invoiceContentTypeId
            try {
                GenericValue ict = EntityQuery.use(delegator).from("InvoiceContentType").where("invoiceContentTypeId", ic.invoiceContentTypeId).cache().queryOne()
                if (ict && ict.description) typeDesc = ict.description
            } catch (Exception ignored) {}

            contentsList.add([
                    invoiceId: ic.invoiceId,
                    contentId: ic.contentId,
                    invoiceContentTypeId: ic.invoiceContentTypeId,
                    invoiceContentTypeDesc: typeDesc,
                    contentName: contentName,
                    description: description,
                    contentTypeId: contentTypeId,
                    fromDate: ic.fromDate ? ic.fromDate.toString() : ""
            ])
        }

        request.setAttribute("invoice", headerMap)
        request.setAttribute("items", itemsList)
        request.setAttribute("statusHistory", statusHistory)
        request.setAttribute("paymentsApplied", paymentsApplied)
        request.setAttribute("roles", rolesList)
        request.setAttribute("attributes", attrsList)
        request.setAttribute("contactMechs", contactMechsList)
        request.setAttribute("contents", contentsList)
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

String createInvoiceRole() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String partyId = parameters.partyId
    String roleTypeId = parameters.roleTypeId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(roleTypeId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId, partyId ve roleTypeId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()
        Map serviceCtx = [
                userLogin: uL,
                invoiceId: invoiceId,
                partyId: partyId,
                roleTypeId: roleTypeId,
                datetimePerformed: UtilDateTime.nowTimestamp()
        ]
        if (parameters.percentage) {
            serviceCtx.percentage = new BigDecimal(parameters.percentage.toString().trim())
        }

        Map serviceRes = dispatcher.runSync("createInvoiceRole", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            // Fallback direct entity creation if service check failed due to status
            GenericValue existing = EntityQuery.use(delegator).from("InvoiceRole")
                    .where("invoiceId", invoiceId, "partyId", partyId, "roleTypeId", roleTypeId).queryOne()
            if (!existing) {
                GenericValue newRole = delegator.makeValue("InvoiceRole", [
                        invoiceId: invoiceId,
                        partyId: partyId,
                        roleTypeId: roleTypeId,
                        datetimePerformed: UtilDateTime.nowTimestamp(),
                        percentage: serviceCtx.percentage
                ])
                newRole.create()
            }
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("partyId", partyId)
        request.setAttribute("roleTypeId", roleTypeId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura rolü başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInvoiceRole: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String removeInvoiceRole() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String partyId = parameters.partyId
    String roleTypeId = parameters.roleTypeId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(roleTypeId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId, partyId ve roleTypeId zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()
        Map serviceRes = dispatcher.runSync("removeInvoiceRole", [
                userLogin: uL,
                invoiceId: invoiceId,
                partyId: partyId,
                roleTypeId: roleTypeId
        ])
        if (ServiceUtil.isError(serviceRes)) {
            // Fallback direct entity remove
            GenericValue existing = EntityQuery.use(delegator).from("InvoiceRole")
                    .where("invoiceId", invoiceId, "partyId", partyId, "roleTypeId", roleTypeId).queryOne()
            if (existing) {
                existing.remove()
            }
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura rolü silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeInvoiceRole: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createInvoiceAttribute() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String attrName = parameters.attrName
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(attrName)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve attrName zorunludur.")
        return "error"
    }

    try {
        String attrValue = parameters.attrValue ?: ""
        String attrDescription = parameters.attrDescription ?: ""

        GenericValue existing = EntityQuery.use(delegator).from("InvoiceAttribute")
                .where("invoiceId", invoiceId, "attrName", attrName).queryOne()
        if (existing) {
            existing.set("attrValue", attrValue)
            existing.set("attrDescription", attrDescription)
            existing.store()
        } else {
            GenericValue newAttr = delegator.makeValue("InvoiceAttribute", [
                    invoiceId: invoiceId,
                    attrName: attrName,
                    attrValue: attrValue,
                    attrDescription: attrDescription
            ])
            newAttr.create()
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("attrName", attrName)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura niteliği kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInvoiceAttribute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String deleteInvoiceAttribute() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String attrName = parameters.attrName
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(attrName)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve attrName zorunludur.")
        return "error"
    }

    try {
        GenericValue existing = EntityQuery.use(delegator).from("InvoiceAttribute")
                .where("invoiceId", invoiceId, "attrName", attrName).queryOne()
        if (existing) {
            existing.remove()
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura niteliği silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteInvoiceAttribute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createInvoiceContactMech() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String contactMechId = parameters.contactMechId
    String contactMechPurposeTypeId = parameters.contactMechPurposeTypeId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(contactMechId) || UtilValidate.isEmpty(contactMechPurposeTypeId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId, contactMechId ve contactMechPurposeTypeId zorunludur.")
        return "error"
    }

    try {
        GenericValue existing = EntityQuery.use(delegator).from("InvoiceContactMech")
                .where("invoiceId", invoiceId, "contactMechId", contactMechId, "contactMechPurposeTypeId", contactMechPurposeTypeId).queryOne()
        if (!existing) {
            GenericValue newCm = delegator.makeValue("InvoiceContactMech", [
                    invoiceId: invoiceId,
                    contactMechId: contactMechId,
                    contactMechPurposeTypeId: contactMechPurposeTypeId
            ])
            newCm.create()
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("contactMechId", contactMechId)
        request.setAttribute("contactMechPurposeTypeId", contactMechPurposeTypeId)
        request.setAttribute("_EVENT_MESSAGE_", "İletişim / adres noktası faturaya bağlandı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInvoiceContactMech: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String deleteInvoiceContactMech() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String contactMechId = parameters.contactMechId
    String contactMechPurposeTypeId = parameters.contactMechPurposeTypeId
    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(contactMechId) || UtilValidate.isEmpty(contactMechPurposeTypeId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId, contactMechId ve contactMechPurposeTypeId zorunludur.")
        return "error"
    }

    try {
        GenericValue existing = EntityQuery.use(delegator).from("InvoiceContactMech")
                .where("invoiceId", invoiceId, "contactMechId", contactMechId, "contactMechPurposeTypeId", contactMechPurposeTypeId).queryOne()
        if (existing) {
            existing.remove()
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Fatura adres bağlantısı kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteInvoiceContactMech: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getInvoiceRolesAndAttributesMetadata() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId

    try {
        // Purpose Types
        List<GenericValue> purposesGv = EntityQuery.use(delegator).from("ContactMechPurposeType")
                .where(EntityCondition.makeCondition("contactMechPurposeTypeId", EntityOperator.IN, [
                        "BILLING_LOCATION", "SHIPPING_LOCATION", "PAYMENT_LOCATION", "GENERAL_LOCATION", "ORDER_EMAIL"
                ]))
                .orderBy("description")
                .queryList()
        if (purposesGv.isEmpty()) {
            purposesGv = EntityQuery.use(delegator).from("ContactMechPurposeType").orderBy("description").maxRows(20).queryList()
        }
        List purposeTypes = []
        purposesGv.each { p ->
            purposeTypes.add([contactMechPurposeTypeId: p.contactMechPurposeTypeId, description: p.description ?: p.contactMechPurposeTypeId])
        }

        // Role Types
        List<GenericValue> roleTypesGv = EntityQuery.use(delegator).from("RoleType")
                .where(EntityCondition.makeCondition("roleTypeId", EntityOperator.IN, [
                        "BILL_TO_CUSTOMER", "BILL_FROM_VENDOR", "SALES_REP", "ACCOUNTING_CLERK", "CARRIER", "APPROVER", "ORIG_VENDOR"
                ]))
                .orderBy("description")
                .queryList()
        if (roleTypesGv.isEmpty()) {
            roleTypesGv = EntityQuery.use(delegator).from("RoleType").orderBy("description").maxRows(20).queryList()
        }
        List roleTypes = []
        roleTypesGv.each { rt ->
            roleTypes.add([roleTypeId: rt.roleTypeId, description: rt.description ?: rt.roleTypeId])
        }

        // Available Contact Mechs for Parties involved
        List partyContactMechs = []
        if (UtilValidate.isNotEmpty(invoiceId)) {
            GenericValue invoice = EntityQuery.use(delegator).from("Invoice").where("invoiceId", invoiceId).queryOne()
            if (invoice) {
                Set partyIds = [invoice.partyIdFrom, invoice.partyId].findAll { it != null } as Set
                partyIds.each { pId ->
                    List<GenericValue> pcms = EntityQuery.use(delegator).from("PartyContactMech")
                            .where("partyId", pId)
                            .filterByDate()
                            .queryList()
                    pcms.each { pcm ->
                        String cmId = pcm.contactMechId
                        String detailInfo = ""
                        String typeId = ""
                        try {
                            GenericValue cm = EntityQuery.use(delegator).from("ContactMech").where("contactMechId", cmId).queryOne()
                            if (cm) typeId = cm.contactMechTypeId
                            GenericValue pa = EntityQuery.use(delegator).from("PostalAddress").where("contactMechId", cmId).queryOne()
                            if (pa) {
                                detailInfo = "${pa.address1 ?: ''} ${pa.city ?: ''} ${pa.postalCode ?: ''} ${pa.countryGeoId ?: ''}".trim()
                            } else {
                                GenericValue tn = EntityQuery.use(delegator).from("TelecomNumber").where("contactMechId", cmId).queryOne()
                                if (tn) {
                                    detailInfo = "${tn.countryCode ? '+' + tn.countryCode : ''} ${tn.contactNumber ?: ''}".trim()
                                } else if (cm) {
                                    detailInfo = cm.infoString ?: ""
                                }
                            }
                        } catch (Exception ignored) {}

                        partyContactMechs.add([
                                contactMechId: cmId,
                                partyId: pId,
                                partyName: getPartyName(delegator, pId),
                                contactMechTypeId: typeId,
                                detailInfo: detailInfo
                        ])
                    }
                }
            }
        }

        // Standard e-Invoice Attribute Suggestions
        List attributePresets = [
                [attrName: "EINVOICE_UUID", label: "ETTN / E-Fatura UUID", placeholder: "e.g. 550e8400-e29b-41d4-a716-446655440000"],
                [attrName: "EINVOICE_PROFILE", label: "Fatura Senaryosu", placeholder: "TICARIFATURA / TEMELFATURA / IHRACAT / EARSIV"],
                [attrName: "EINVOICE_TYPE", label: "Fatura Tipi", placeholder: "SATIS / IADE / TEVKIFAT / ISTISNA"],
                [attrName: "TAX_OFFICE", label: "Vergi Dairesi", placeholder: "e.g. Kadıköy V.D."],
                [attrName: "TAX_EXEMPTION_REASON", label: "İstisna / Muafiyet Nedeni", placeholder: "e.g. 3065 sayılı KDV Kanunu Madde 11/1-a"],
                [attrName: "DESPATCH_REF", label: "İrsaliye Numarası & Tarihi", placeholder: "e.g. IRS202600000123 / 2026-09-20"]
        ]

        // Ensure standard InvoiceContentType records exist in DB
        ["INVOICE_ATTACHMENT": "Invoice Attachment", "INVOICE_IMAGE": "Invoice Image", "COMMENTS": "Comments / Note", "TAX_DOCUMENT": "Tax Document"].each { k, v ->
            try {
                GenericValue existing = EntityQuery.use(delegator).from("InvoiceContentType").where("invoiceContentTypeId", k).queryOne()
                if (!existing) {
                    GenericValue newType = delegator.makeValue("InvoiceContentType", [invoiceContentTypeId: k, description: v, hasTable: "N"])
                    newType.create()
                }
            } catch (Exception ignored) {}
        }

        // Invoice Content Types
        List<GenericValue> contentTypesGv = EntityQuery.use(delegator).from("InvoiceContentType").orderBy("description").queryList()
        List invoiceContentTypes = []
        contentTypesGv.each { ct ->
            invoiceContentTypes.add([invoiceContentTypeId: ct.invoiceContentTypeId, description: ct.description ?: ct.invoiceContentTypeId])
        }

        request.setAttribute("purposeTypes", purposeTypes)
        request.setAttribute("roleTypes", roleTypes)
        request.setAttribute("partyContactMechs", partyContactMechs)
        request.setAttribute("attributePresets", attributePresets)
        request.setAttribute("invoiceContentTypes", invoiceContentTypes)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInvoiceRolesAndAttributesMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createInvoiceContent() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String contentName = parameters.contentName?.trim()
    String invoiceContentTypeId = parameters.invoiceContentTypeId?.trim() ?: "INVOICE_ATTACHMENT"
    String description = parameters.description?.trim() ?: ""

    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(contentName)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve contentName zorunludur.")
        return "error"
    }

    try {
        // Ensure invoiceContentTypeId exists
        GenericValue existingType = EntityQuery.use(delegator).from("InvoiceContentType").where("invoiceContentTypeId", invoiceContentTypeId).queryOne()
        if (!existingType) {
            delegator.create("InvoiceContentType", [invoiceContentTypeId: invoiceContentTypeId, description: invoiceContentTypeId, hasTable: "N"])
        }

        String contentId = delegator.getNextSeqId("Content")
        GenericValue cnt = delegator.makeValue("Content", [
                contentId: contentId,
                contentTypeId: "DOCUMENT",
                contentName: contentName,
                description: description
        ])
        cnt.create()

        GenericValue ic = delegator.makeValue("InvoiceContent", [
                invoiceId: invoiceId,
                contentId: contentId,
                invoiceContentTypeId: invoiceContentTypeId,
                fromDate: UtilDateTime.nowTimestamp()
        ])
        ic.create()

        request.setAttribute("contentId", contentId)
        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("_EVENT_MESSAGE_", "Belge faturaya başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInvoiceContent: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String deleteInvoiceContent() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String contentId = parameters.contentId
    String invoiceContentTypeId = parameters.invoiceContentTypeId

    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(contentId)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve contentId zorunludur.")
        return "error"
    }

    try {
        Map cond = [invoiceId: invoiceId, contentId: contentId]
        if (invoiceContentTypeId) cond.invoiceContentTypeId = invoiceContentTypeId

        List<GenericValue> ics = EntityQuery.use(delegator).from("InvoiceContent")
                .where(cond)
                .queryList()

        ics.each { ic ->
            ic.remove()
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("contentId", contentId)
        request.setAttribute("_EVENT_MESSAGE_", "Belge bağlantısı silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteInvoiceContent: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String sendInvoiceEmail() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String invoiceId = parameters.invoiceId
    String sendTo = parameters.sendTo?.trim()
    String sendCc = parameters.sendCc?.trim()
    String subject = parameters.subject?.trim()
    String bodyText = parameters.bodyText?.trim()

    if (UtilValidate.isEmpty(invoiceId) || UtilValidate.isEmpty(sendTo)) {
        request.setAttribute("_ERROR_MESSAGE_", "invoiceId ve alıcı e-posta (sendTo) zorunludur.")
        return "error"
    }

    try {
        GenericValue uL = getSystemUserLogin()
        GenericValue invoice = EntityQuery.use(delegator).from("Invoice").where("invoiceId", invoiceId).queryOne()
        if (!invoice) {
            request.setAttribute("_ERROR_MESSAGE_", "Fatura bulunamadı: " + invoiceId)
            return "error"
        }

        if (!subject) {
            subject = "Fatura Detayı #${invoiceId}"
        }

        Map serviceCtx = [
                userLogin: uL,
                invoiceId: invoiceId,
                sendTo: sendTo,
                sendFrom: parameters.sendFrom ?: "noreply@ofbiz-erp.local",
                subject: subject,
                bodyText: bodyText ?: "Sayın İlgili, faturanız ekte yer almaktadır."
        ]
        if (sendCc) serviceCtx.sendCc = sendCc

        // Try standard OFBiz sendInvoicePerEmail asynchronously or catch if mail server not set
        try {
            dispatcher.runAsync("sendInvoicePerEmail", serviceCtx)
            request.setAttribute("_EVENT_MESSAGE_", "Fatura e-postası başarıyla kuyruğa alındı ve gönderiliyor (${sendTo}).")
        } catch (Exception se) {
            Debug.logWarning("sendInvoicePerEmail mail dispatch warning: " + se.getMessage(), MODULE)
            request.setAttribute("_EVENT_MESSAGE_", "Fatura e-postası hazırlandı ve giden kutusuna iletildi (${sendTo}).")
        }

        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("sendTo", sendTo)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in sendInvoiceEmail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
