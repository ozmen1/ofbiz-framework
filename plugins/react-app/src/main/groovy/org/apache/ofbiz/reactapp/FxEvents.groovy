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

final String MODULE = "FxEvents.groovy"

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

Timestamp parseDateToTimestamp(Object dateObj, boolean isEndOfDay = false) {
    if (!dateObj) return null
    if (dateObj instanceof Timestamp) return (Timestamp) dateObj
    String str = dateObj.toString().trim()
    if (str.isEmpty()) return null
    try {
        if (str.length() == 10) {
            str += isEndOfDay ? " 23:59:59.999" : " 00:00:00.000"
        }
        return Timestamp.valueOf(str)
    } catch (Exception e) {
        Debug.logWarning("Could not parse timestamp: " + str + " - " + e.getMessage(), MODULE)
        return null
    }
}

/**
 * 1. getFxConversions
 * Lists FX conversions, currency metadata, and purpose options
 */
String getFxConversions() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String uomId = parameters.uomId?.trim()
        String uomIdTo = parameters.uomIdTo?.trim()
        String activeOnly = parameters.activeOnly?.trim()

        List<EntityCondition> conds = []
        if (uomId) {
            conds.add(EntityCondition.makeCondition("uomId", EntityOperator.EQUALS, uomId))
        }
        if (uomIdTo) {
            conds.add(EntityCondition.makeCondition("uomIdTo", EntityOperator.EQUALS, uomIdTo))
        }

        def query = EntityQuery.use(delegator).from("UomConversionDated")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }
        if ("Y".equalsIgnoreCase(activeOnly)) {
            query = query.filterByDate()
        }

        List<GenericValue> rawList = query.orderBy("-fromDate").queryList()

        // Fetch currency UOM descriptions
        List<GenericValue> currenciesGv = EntityQuery.use(delegator).from("Uom")
            .where("uomTypeId", "CURRENCY_MEASURE")
            .orderBy("uomId")
            .queryList()
        Map<String, String> currencyMap = [:]
        List currencies = []
        currenciesGv.each { c ->
            String desc = c.description ?: c.abbreviation ?: c.uomId
            currencyMap[c.uomId] = desc
            currencies.add([uomId: c.uomId, description: desc, abbreviation: c.abbreviation])
        }

        // Fetch purpose enumerations
        List<GenericValue> purposeEnumsGv = EntityQuery.use(delegator).from("Enumeration")
            .where("enumTypeId", "CONV_PURPOSE")
            .orderBy("sequenceId")
            .queryList()
        Map<String, String> purposeMap = [:]
        List purposes = []
        purposeEnumsGv.each { p ->
            purposeMap[p.enumId] = p.description ?: p.enumId
            purposes.add([enumId: p.enumId, description: p.description ?: p.enumId])
        }

        Timestamp now = UtilDateTime.nowTimestamp()
        List conversions = []
        rawList.each { c ->
            boolean isActive = (c.thruDate == null || c.thruDate.after(now)) && (c.fromDate == null || c.fromDate.before(now))
            conversions.add([
                uomId: c.uomId,
                uomDescription: currencyMap[c.uomId] ?: c.uomId,
                uomIdTo: c.uomIdTo,
                uomToDescription: currencyMap[c.uomIdTo] ?: c.uomIdTo,
                fromDate: c.fromDate ? c.fromDate.toString() : null,
                thruDate: c.thruDate ? c.thruDate.toString() : null,
                conversionFactor: c.conversionFactor,
                purposeEnumId: c.purposeEnumId,
                purposeDescription: purposeMap[c.purposeEnumId] ?: c.purposeEnumId,
                isActive: isActive
            ])
        }

        request.setAttribute("conversions", conversions)
        request.setAttribute("currencies", currencies)
        request.setAttribute("purposes", purposes)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFxConversions: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. createFxConversion
 * Expires active rates for this pair and creates a new dated rate
 */
String createFxConversion() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String uomId = parameters.uomId?.trim()
        String uomIdTo = parameters.uomIdTo?.trim()
        String purposeEnumId = parameters.purposeEnumId?.trim()

        if (!uomId || !uomIdTo) {
            request.setAttribute("_ERROR_MESSAGE_", "uomId and uomIdTo are required")
            return "error"
        }
        if (uomId.equals(uomIdTo)) {
            request.setAttribute("_ERROR_MESSAGE_", "Source and target currency cannot be the same")
            return "error"
        }

        Double factor = null
        if (parameters.conversionFactor != null) {
            try { factor = Double.parseDouble(parameters.conversionFactor.toString().trim()) } catch (Exception ignored) {}
        }
        if (factor == null || factor <= 0) {
            request.setAttribute("_ERROR_MESSAGE_", "A valid positive conversion factor is required")
            return "error"
        }

        Timestamp fromDate = parseDateToTimestamp(parameters.fromDate, false) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseDateToTimestamp(parameters.thruDate, true)

        // Expire existing active conversions for this pair
        List<EntityCondition> expireConds = [
            EntityCondition.makeCondition("uomId", EntityOperator.EQUALS, uomId),
            EntityCondition.makeCondition("uomIdTo", EntityOperator.EQUALS, uomIdTo)
        ]
        if (purposeEnumId) {
            expireConds.add(EntityCondition.makeCondition("purposeEnumId", EntityOperator.EQUALS, purposeEnumId))
        }
        List<GenericValue> existingActive = EntityQuery.use(delegator).from("UomConversionDated")
            .where(EntityCondition.makeCondition(expireConds, EntityOperator.AND))
            .filterByDate(fromDate)
            .queryList()

        existingActive.each { activeConv ->
            activeConv.thruDate = fromDate
            delegator.store(activeConv)
        }

        GenericValue newConv = delegator.makeValue("UomConversionDated", [
            uomId: uomId,
            uomIdTo: uomIdTo,
            fromDate: fromDate,
            thruDate: thruDate,
            conversionFactor: factor,
            purposeEnumId: purposeEnumId ?: null,
            decimalScale: 4L,
            roundingMode: "ROUND_HALF_UP"
        ])
        delegator.create(newConv)

        request.setAttribute("_EVENT_MESSAGE_", "FX conversion created successfully: 1 " + uomId + " = " + factor + " " + uomIdTo)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error creating FX conversion: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. deleteFxConversion
 */
String deleteFxConversion() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String uomId = parameters.uomId?.trim()
        String uomIdTo = parameters.uomIdTo?.trim()
        String fromDateStr = parameters.fromDate?.trim()

        if (!uomId || !uomIdTo || !fromDateStr) {
            request.setAttribute("_ERROR_MESSAGE_", "uomId, uomIdTo, and fromDate are required")
            return "error"
        }

        Timestamp fromDate = parseDateToTimestamp(fromDateStr, false)
        GenericValue conv = EntityQuery.use(delegator).from("UomConversionDated")
            .where("uomId", uomId, "uomIdTo", uomIdTo, "fromDate", fromDate)
            .queryOne()

        if (!conv) {
            request.setAttribute("_ERROR_MESSAGE_", "FX conversion record not found")
            return "error"
        }

        delegator.removeValue(conv)
        request.setAttribute("_EVENT_MESSAGE_", "FX conversion deleted successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error deleting FX conversion: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
