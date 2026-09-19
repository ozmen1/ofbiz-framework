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

final String MODULE = "TaxSettlementEvents.groovy"

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
 * 1. getTaxAuthorityReport
 * Calculates VAT / Sales & Purchase Tax settlement:
 * - Output Tax (Hesaplanan KDV on Sales Invoices)
 * - Input Tax (İndirilecek KDV on Purchase Invoices)
 * - Net Tax Due / Refundable (Ödenecek / Devreden KDV)
 * - Breakdown by Tax Rate
 * - Detailed line items
 */
String getTaxAuthorityReport() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()

        if (UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthPartyId ve taxAuthGeoId parametreleri zorunludur.")
            return "error"
        }

        GenericValue taxAuth = EntityQuery.use(delegator).from("TaxAuthority")
                .where("taxAuthPartyId", taxAuthPartyId, "taxAuthGeoId", taxAuthGeoId)
                .queryOne()
        if (!taxAuth) {
            request.setAttribute("_ERROR_MESSAGE_", "Vergi dairesi bulunamadı: " + taxAuthPartyId + " / " + taxAuthGeoId)
            return "error"
        }

        Timestamp fromDate = parseTimestamp(parameters.fromDate)
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        // 1. Find all InvoiceItems with tax for this tax authority
        List<EntityCondition> taxConds = [
            EntityCondition.makeCondition("taxAuthPartyId", EntityOperator.EQUALS, taxAuthPartyId),
            EntityCondition.makeCondition("taxAuthGeoId", EntityOperator.EQUALS, taxAuthGeoId)
        ]

        List<GenericValue> taxItems = EntityQuery.use(delegator).from("InvoiceItem")
                .where(EntityCondition.makeCondition(taxConds, EntityOperator.AND))
                .queryList()

        // Also query invoices to check date range and invoice type
        BigDecimal totalTaxableSales = BigDecimal.ZERO
        BigDecimal totalTaxCollected = BigDecimal.ZERO // Output Tax (Sales)
        BigDecimal totalTaxablePurchases = BigDecimal.ZERO
        BigDecimal totalTaxPaid = BigDecimal.ZERO // Input Tax (Purchases)

        Map<String, Map> rateBreakdown = [:]
        List lineItems = []

        for (GenericValue item : taxItems) {
            String invoiceId = item.invoiceId
            GenericValue invoice = EntityQuery.use(delegator).from("Invoice").where("invoiceId", invoiceId).queryOne()
            if (!invoice) continue

            // Filter by date
            Timestamp invDate = invoice.invoiceDate ?: invoice.createdStamp
            if (fromDate && invDate && invDate.before(fromDate)) continue
            if (thruDate && invDate && invDate.after(thruDate)) continue

            // Exclude cancelled invoices
            if ("INVOICE_CANCELLED".equals(invoice.statusId)) continue

            BigDecimal taxAmount = item.amount ?: BigDecimal.ZERO
            BigDecimal quantity = item.quantity ?: BigDecimal.ONE
            BigDecimal itemTotalTax = taxAmount.multiply(quantity).setScale(2, RoundingMode.HALF_UP)

            // Find parent / taxable base item if tax is calculated on an item
            BigDecimal taxableBase = BigDecimal.ZERO
            if (item.parentInvoiceItemSeqId) {
                GenericValue parentItem = EntityQuery.use(delegator).from("InvoiceItem")
                        .where("invoiceId", invoiceId, "invoiceItemSeqId", item.parentInvoiceItemSeqId)
                        .queryOne()
                if (parentItem) {
                    BigDecimal pAmt = parentItem.amount ?: BigDecimal.ZERO
                    BigDecimal pQty = parentItem.quantity ?: BigDecimal.ONE
                    taxableBase = pAmt.multiply(pQty).setScale(2, RoundingMode.HALF_UP)
                }
            } else {
                // If tax line has taxAuthRateSeqId, check rate to infer base
                taxableBase = itemTotalTax.multiply(new BigDecimal("5")).setScale(2, RoundingMode.HALF_UP) // fallback default
            }

            boolean isSales = "SALES_INVOICE".equals(invoice.invoiceTypeId) || "CUST_RTN_INVOICE".equals(invoice.invoiceTypeId)
            boolean isPurchase = "PURCHASE_INVOICE".equals(invoice.invoiceTypeId)

            if (isSales) {
                totalTaxableSales = totalTaxableSales.add(taxableBase)
                totalTaxCollected = totalTaxCollected.add(itemTotalTax)
            } else {
                totalTaxablePurchases = totalTaxablePurchases.add(taxableBase)
                totalTaxPaid = totalTaxPaid.add(itemTotalTax)
            }

            // Rate group
            String rateKey = item.taxAuthRateSeqId ?: "STANDARD_TAX"
            String rateName = item.description ?: ("Vergi Oranı #" + rateKey)
            if (!rateBreakdown.containsKey(rateKey)) {
                rateBreakdown[rateKey] = [
                    taxAuthRateSeqId: rateKey,
                    rateName: rateName,
                    taxableSales: BigDecimal.ZERO,
                    taxCollected: BigDecimal.ZERO,
                    taxablePurchases: BigDecimal.ZERO,
                    taxPaid: BigDecimal.ZERO,
                    netTax: BigDecimal.ZERO
                ]
            }
            Map grp = rateBreakdown[rateKey]
            if (isSales) {
                grp.taxableSales = ((BigDecimal) grp.taxableSales).add(taxableBase)
                grp.taxCollected = ((BigDecimal) grp.taxCollected).add(itemTotalTax)
            } else {
                grp.taxablePurchases = ((BigDecimal) grp.taxablePurchases).add(taxableBase)
                grp.taxPaid = ((BigDecimal) grp.taxPaid).add(itemTotalTax)
            }
            grp.netTax = ((BigDecimal) grp.taxCollected).subtract((BigDecimal) grp.taxPaid)

            lineItems.add([
                invoiceId: invoice.invoiceId,
                invoiceItemSeqId: item.invoiceItemSeqId,
                invoiceTypeId: invoice.invoiceTypeId,
                invoiceDate: invDate ? invDate.toString() : "",
                partyId: isSales ? invoice.partyId : invoice.partyIdFrom,
                partyName: getPartyName(delegator, isSales ? invoice.partyId : invoice.partyIdFrom),
                statusId: invoice.statusId,
                description: item.description ?: (invoice.invoiceTypeId + " Tax"),
                taxableBase: taxableBase,
                taxAmount: itemTotalTax,
                currencyUomId: invoice.currencyUomId ?: "USD",
                isSales: isSales
            ])
        }

        BigDecimal netTaxDue = totalTaxCollected.subtract(totalTaxPaid)

        Map summary = [
            taxAuthPartyId: taxAuthPartyId,
            taxAuthGeoId: taxAuthGeoId,
            taxAuthPartyName: getPartyName(delegator, taxAuthPartyId),
            fromDate: fromDate?.toString() ?: "",
            thruDate: thruDate?.toString() ?: "",
            totalTaxableSales: totalTaxableSales,
            totalTaxCollected: totalTaxCollected, // Hesaplanan KDV
            totalTaxablePurchases: totalTaxablePurchases,
            totalTaxPaid: totalTaxPaid, // İndirilecek KDV
            netTaxDue: netTaxDue, // Pozitif: Ödenecek, Negatif: Devreden
            isPayable: netTaxDue.compareTo(BigDecimal.ZERO) >= 0,
            lineItemCount: lineItems.size()
        ]

        request.setAttribute("summary", summary)
        request.setAttribute("rateBreakdown", rateBreakdown.values().toList())
        request.setAttribute("lineItems", lineItems)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTaxAuthorityReport: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getPartyTaxAuthInfos
 * Returns taxpayers / parties registered with this tax authority with tax IDs & exempt status.
 */
String getPartyTaxAuthInfos() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()

        if (UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthPartyId ve taxAuthGeoId parametreleri zorunludur.")
            return "error"
        }

        List list = EntityQuery.use(delegator).from("PartyTaxAuthInfo")
                .where("taxAuthPartyId", taxAuthPartyId, "taxAuthGeoId", taxAuthGeoId)
                .orderBy("fromDate DESC")
                .queryList().collect {
            [
                partyId: it.partyId,
                partyName: getPartyName(delegator, it.partyId),
                taxAuthPartyId: it.taxAuthPartyId,
                taxAuthGeoId: it.taxAuthGeoId,
                partyTaxId: it.partyTaxId ?: "",
                isExempt: it.isExempt ?: "N",
                isNexus: it.isNexus ?: "N",
                fromDate: it.fromDate?.toString() ?: "",
                thruDate: it.thruDate?.toString() ?: ""
            ]
        }

        request.setAttribute("taxAuthParties", list)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyTaxAuthInfos: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. createPartyTaxAuthInfo
 * Registers or updates taxpayer tax ID, exemption, and dates.
 */
String createPartyTaxAuthInfo() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String partyTaxId = parameters.partyTaxId?.trim() ?: ""
        String isExempt = parameters.isExempt?.trim() ?: "N"
        String isNexus = parameters.isNexus?.trim() ?: "N"

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId, taxAuthPartyId ve taxAuthGeoId zorunludur.")
            return "error"
        }

        Timestamp fromDate = parseTimestamp(parameters.fromDate) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        GenericValue ptai = delegator.makeValue("PartyTaxAuthInfo")
        ptai.partyId = partyId
        ptai.taxAuthPartyId = taxAuthPartyId
        ptai.taxAuthGeoId = taxAuthGeoId
        ptai.fromDate = fromDate
        ptai.thruDate = thruDate
        ptai.partyTaxId = partyTaxId
        ptai.isExempt = isExempt
        ptai.isNexus = isNexus
        delegator.createOrStore(ptai)

        request.setAttribute("_EVENT_MESSAGE_", "Mükellef vergi sicil kaydı başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyTaxAuthInfo: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. deletePartyTaxAuthInfo
 * Removes taxpayer tax registration.
 */
String deletePartyTaxAuthInfo() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        Timestamp fromDate = parseTimestamp(parameters.fromDate)

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId) || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId, taxAuthPartyId, taxAuthGeoId ve fromDate zorunludur.")
            return "error"
        }

        GenericValue ptai = EntityQuery.use(delegator).from("PartyTaxAuthInfo")
                .where("partyId", partyId, "taxAuthPartyId", taxAuthPartyId, "taxAuthGeoId", taxAuthGeoId, "fromDate", fromDate)
                .queryOne()

        if (ptai) {
            delegator.removeValue(ptai)
            request.setAttribute("_EVENT_MESSAGE_", "Mükellef vergi kaydı silindi.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Silinecek vergi kaydı bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyTaxAuthInfo: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. getTaxAuthorityCategories
 * Returns product categories assigned to tax authority.
 */
String getTaxAuthorityCategories() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()

        if (UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthPartyId ve taxAuthGeoId zorunludur.")
            return "error"
        }

        List list = EntityQuery.use(delegator).from("TaxAuthorityCategory")
                .where("taxAuthPartyId", taxAuthPartyId, "taxAuthGeoId", taxAuthGeoId)
                .queryList().collect {
            GenericValue cat = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", it.productCategoryId).queryOne()
            [
                taxAuthPartyId: it.taxAuthPartyId,
                taxAuthGeoId: it.taxAuthGeoId,
                productCategoryId: it.productCategoryId,
                categoryName: cat?.categoryName ?: it.productCategoryId,
                description: cat?.description ?: ""
            ]
        }

        request.setAttribute("categories", list)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTaxAuthorityCategories: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. createTaxAuthorityCategory
 * Links product category to tax authority.
 */
String createTaxAuthorityCategory() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String productCategoryId = parameters.productCategoryId?.trim()

        if (UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(productCategoryId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthPartyId, taxAuthGeoId ve productCategoryId zorunludur.")
            return "error"
        }

        GenericValue tac = delegator.makeValue("TaxAuthorityCategory")
        tac.taxAuthPartyId = taxAuthPartyId
        tac.taxAuthGeoId = taxAuthGeoId
        tac.productCategoryId = productCategoryId
        delegator.createOrStore(tac)

        request.setAttribute("_EVENT_MESSAGE_", "Vergi ürün kategorisi eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createTaxAuthorityCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. deleteTaxAuthorityCategory
 * Removes product category from tax authority.
 */
String deleteTaxAuthorityCategory() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String productCategoryId = parameters.productCategoryId?.trim()

        if (UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(productCategoryId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthPartyId, taxAuthGeoId ve productCategoryId zorunludur.")
            return "error"
        }

        GenericValue tac = EntityQuery.use(delegator).from("TaxAuthorityCategory")
                .where("taxAuthPartyId", taxAuthPartyId, "taxAuthGeoId", taxAuthGeoId, "productCategoryId", productCategoryId)
                .queryOne()

        if (tac) {
            delegator.removeValue(tac)
            request.setAttribute("_EVENT_MESSAGE_", "Vergi kategorisi kaldırıldı.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Kategori kaydı bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteTaxAuthorityCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
