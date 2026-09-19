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

final String MODULE = "FiscalPeriodEvents.groovy"

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
 * 1. getCustomTimePeriods
 * Returns list of custom time periods for an organization with period type metadata
 */
String getCustomTimePeriods() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String periodTypeId = parameters.periodTypeId?.trim()
        String isClosed = parameters.isClosed?.trim()
        String search = parameters.search?.trim()

        List<EntityCondition> conds = []
        if (orgPartyId) {
            conds.add(EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId))
        }
        if (periodTypeId) {
            conds.add(EntityCondition.makeCondition("periodTypeId", EntityOperator.EQUALS, periodTypeId))
        }
        if (isClosed) {
            conds.add(EntityCondition.makeCondition("isClosed", EntityOperator.EQUALS, isClosed))
        }

        def query = EntityQuery.use(delegator).from("CustomTimePeriod")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }
        List<GenericValue> rawList = query.orderBy("-fromDate", "periodNum").queryList()

        // Fetch all period types for descriptions
        List<GenericValue> periodTypesGv = EntityQuery.use(delegator).from("PeriodType").orderBy("periodTypeId").queryList()
        Map<String, String> periodTypeDescMap = [:]
        List periodTypes = []
        periodTypesGv.each { pt ->
            periodTypeDescMap[pt.periodTypeId] = pt.description ?: pt.periodTypeId
            periodTypes.add([
                periodTypeId: pt.periodTypeId,
                description: pt.description ?: pt.periodTypeId,
                periodLength: pt.periodLength
            ])
        }

        // Map parent periods
        Map<String, String> periodNameMap = [:]
        rawList.each { p ->
            periodNameMap[p.customTimePeriodId] = p.periodName ?: ("Period #" + p.periodNum)
        }

        List customTimePeriods = []
        rawList.each { p ->
            String pName = p.periodName ?: ("Period #" + p.periodNum)
            if (search) {
                String sLower = search.toLowerCase()
                boolean matches = (p.customTimePeriodId && p.customTimePeriodId.toLowerCase().contains(sLower)) ||
                                  (pName && pName.toLowerCase().contains(sLower)) ||
                                  (p.periodTypeId && p.periodTypeId.toLowerCase().contains(sLower))
                if (!matches) return
            }

            customTimePeriods.add([
                customTimePeriodId: p.customTimePeriodId,
                parentPeriodId: p.parentPeriodId,
                parentPeriodName: p.parentPeriodId ? (periodNameMap[p.parentPeriodId] ?: p.parentPeriodId) : null,
                periodTypeId: p.periodTypeId,
                periodTypeDescription: periodTypeDescMap[p.periodTypeId] ?: p.periodTypeId,
                periodNum: p.periodNum,
                periodName: pName,
                fromDate: p.fromDate ? p.fromDate.toString().substring(0, 10) : null,
                thruDate: p.thruDate ? p.thruDate.toString().substring(0, 10) : null,
                isClosed: p.isClosed ?: "N",
                organizationPartyId: p.organizationPartyId
            ])
        }

        // Organizations
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

        request.setAttribute("customTimePeriods", customTimePeriods)
        request.setAttribute("periodTypes", periodTypes)
        request.setAttribute("organizations", organizations)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCustomTimePeriods: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. createCustomTimePeriod
 */
String createCustomTimePeriod() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue userLogin = getSystemUserLogin()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String parentPeriodId = parameters.parentPeriodId?.trim()
        String periodTypeId = parameters.periodTypeId?.trim()
        String periodName = parameters.periodName?.trim()
        String isClosed = parameters.isClosed?.trim() ?: "N"

        Long periodNum = null
        if (parameters.periodNum) {
            try { periodNum = Long.parseLong(parameters.periodNum.toString().trim()) } catch (Exception ignored) {}
        }

        Timestamp fromDate = parseDateToTimestamp(parameters.fromDate, false)
        Timestamp thruDate = parseDateToTimestamp(parameters.thruDate, true)

        if (!fromDate || !thruDate) {
            request.setAttribute("_ERROR_MESSAGE_", "fromDate and thruDate are required")
            return "error"
        }
        if (!periodTypeId) {
            request.setAttribute("_ERROR_MESSAGE_", "periodTypeId is required")
            return "error"
        }

        String customTimePeriodId = parameters.customTimePeriodId?.trim()
        if (!customTimePeriodId) {
            customTimePeriodId = delegator.getNextSeqId("CustomTimePeriod")
        }

        GenericValue newPeriod = delegator.makeValue("CustomTimePeriod", [
            customTimePeriodId: customTimePeriodId,
            organizationPartyId: organizationPartyId,
            parentPeriodId: parentPeriodId ?: null,
            periodTypeId: periodTypeId,
            periodNum: periodNum,
            periodName: periodName ?: ("Period " + customTimePeriodId),
            fromDate: fromDate,
            thruDate: thruDate,
            isClosed: isClosed
        ])
        delegator.create(newPeriod)

        request.setAttribute("customTimePeriodId", customTimePeriodId)
        request.setAttribute("_EVENT_MESSAGE_", "Custom time period created successfully: " + customTimePeriodId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error creating custom time period: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. updateCustomTimePeriod
 */
String updateCustomTimePeriod() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String customTimePeriodId = parameters.customTimePeriodId?.trim()
        if (!customTimePeriodId) {
            request.setAttribute("_ERROR_MESSAGE_", "customTimePeriodId is required")
            return "error"
        }

        GenericValue period = EntityQuery.use(delegator).from("CustomTimePeriod").where("customTimePeriodId", customTimePeriodId).queryOne()
        if (!period) {
            request.setAttribute("_ERROR_MESSAGE_", "Period not found: " + customTimePeriodId)
            return "error"
        }

        if (parameters.periodName != null) period.periodName = parameters.periodName.trim()
        if (parameters.parentPeriodId != null) period.parentPeriodId = parameters.parentPeriodId.trim() ?: null
        if (parameters.periodTypeId != null) period.periodTypeId = parameters.periodTypeId.trim()
        if (parameters.isClosed != null) period.isClosed = parameters.isClosed.trim()
        if (parameters.periodNum != null) {
            try { period.periodNum = Long.parseLong(parameters.periodNum.toString().trim()) } catch (Exception ignored) {}
        }
        if (parameters.fromDate != null) {
            Timestamp fd = parseDateToTimestamp(parameters.fromDate, false)
            if (fd) period.fromDate = fd
        }
        if (parameters.thruDate != null) {
            Timestamp td = parseDateToTimestamp(parameters.thruDate, true)
            if (td) period.thruDate = td
        }

        delegator.store(period)
        request.setAttribute("customTimePeriodId", customTimePeriodId)
        request.setAttribute("_EVENT_MESSAGE_", "Period updated successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error updating custom time period: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. closeCustomTimePeriod
 * Marks period as closed (isClosed = 'Y') after validating children
 */
String closeCustomTimePeriod() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String customTimePeriodId = parameters.customTimePeriodId?.trim()
        if (!customTimePeriodId) {
            request.setAttribute("_ERROR_MESSAGE_", "customTimePeriodId is required")
            return "error"
        }

        GenericValue period = EntityQuery.use(delegator).from("CustomTimePeriod").where("customTimePeriodId", customTimePeriodId).queryOne()
        if (!period) {
            request.setAttribute("_ERROR_MESSAGE_", "Period not found: " + customTimePeriodId)
            return "error"
        }

        // Check open child periods
        List<GenericValue> openChildren = EntityQuery.use(delegator).from("CustomTimePeriod")
            .where("parentPeriodId", customTimePeriodId, "isClosed", "N")
            .queryList()

        if (openChildren && !"Y".equals(parameters.forceCascade)) {
            request.setAttribute("_ERROR_MESSAGE_", "Cannot close period because it has " + openChildren.size() + " open sub-period(s). Close child periods first or confirm cascade close.")
            return "error"
        }

        if (openChildren && "Y".equals(parameters.forceCascade)) {
            openChildren.each { child ->
                child.isClosed = "Y"
                delegator.store(child)
            }
        }

        period.isClosed = "Y"
        delegator.store(period)

        request.setAttribute("customTimePeriodId", customTimePeriodId)
        request.setAttribute("_EVENT_MESSAGE_", "Period closed successfully: " + customTimePeriodId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error closing custom time period: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. reopenCustomTimePeriod
 */
String reopenCustomTimePeriod() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String customTimePeriodId = parameters.customTimePeriodId?.trim()
        if (!customTimePeriodId) {
            request.setAttribute("_ERROR_MESSAGE_", "customTimePeriodId is required")
            return "error"
        }

        GenericValue period = EntityQuery.use(delegator).from("CustomTimePeriod").where("customTimePeriodId", customTimePeriodId).queryOne()
        if (!period) {
            request.setAttribute("_ERROR_MESSAGE_", "Period not found: " + customTimePeriodId)
            return "error"
        }

        period.isClosed = "N"
        delegator.store(period)

        request.setAttribute("customTimePeriodId", customTimePeriodId)
        request.setAttribute("_EVENT_MESSAGE_", "Period reopened successfully: " + customTimePeriodId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error reopening custom time period: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. deleteCustomTimePeriod
 */
String deleteCustomTimePeriod() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String customTimePeriodId = parameters.customTimePeriodId?.trim()
        if (!customTimePeriodId) {
            request.setAttribute("_ERROR_MESSAGE_", "customTimePeriodId is required")
            return "error"
        }

        GenericValue period = EntityQuery.use(delegator).from("CustomTimePeriod").where("customTimePeriodId", customTimePeriodId).queryOne()
        if (!period) {
            request.setAttribute("_ERROR_MESSAGE_", "Period not found")
            return "error"
        }

        // Check if there are children
        long childCount = EntityQuery.use(delegator).from("CustomTimePeriod").where("parentPeriodId", customTimePeriodId).queryCount()
        if (childCount > 0) {
            request.setAttribute("_ERROR_MESSAGE_", "Cannot delete period because it has child periods")
            return "error"
        }

        delegator.removeValue(period)
        request.setAttribute("_EVENT_MESSAGE_", "Period deleted successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error deleting custom time period: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
