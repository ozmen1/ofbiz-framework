/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.Debug
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "CostCenterEvents.groovy"

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
 * 1. getGlAccountCategories
 */
String getGlAccountCategories() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String typeId = parameters.glAccountCategoryTypeId?.trim() ?: "COST_CENTER"
        String search = parameters.search?.trim()

        List<EntityCondition> conds = []
        if (typeId && !"ALL".equalsIgnoreCase(typeId)) {
            conds.add(EntityCondition.makeCondition("glAccountCategoryTypeId", EntityOperator.EQUALS, typeId))
        }

        def query = EntityQuery.use(delegator).from("GlAccountCategory")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        List<GenericValue> rawList = query.orderBy("glAccountCategoryId").queryList()

        // Fetch types
        List<GenericValue> typesGv = EntityQuery.use(delegator).from("GlAccountCategoryType").orderBy("glAccountCategoryTypeId").queryList()
        List types = []
        typesGv.each { t ->
            types.add([glAccountCategoryTypeId: t.glAccountCategoryTypeId, description: t.description ?: t.glAccountCategoryTypeId])
        }

        List categories = []
        rawList.each { cat ->
            if (search) {
                String sLower = search.toLowerCase()
                boolean m = (cat.glAccountCategoryId && cat.glAccountCategoryId.toLowerCase().contains(sLower)) ||
                            (cat.description && cat.description.toLowerCase().contains(sLower))
                if (!m) return
            }

            long memberCount = EntityQuery.use(delegator).from("GlAccountCategoryMember")
                .where("glAccountCategoryId", cat.glAccountCategoryId)
                .filterByDate()
                .queryCount()

            categories.add([
                glAccountCategoryId: cat.glAccountCategoryId,
                glAccountCategoryTypeId: cat.glAccountCategoryTypeId,
                description: cat.description ?: cat.glAccountCategoryId,
                memberCount: memberCount
            ])
        }

        request.setAttribute("categories", categories)
        request.setAttribute("types", types)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlAccountCategories: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getGlAccountCategoryMembers
 */
String getGlAccountCategoryMembers() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String catId = parameters.glAccountCategoryId?.trim()
        if (!catId) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountCategoryId is required")
            return "error"
        }

        List<GenericValue> membersGv = EntityQuery.use(delegator).from("GlAccountCategoryMember")
            .where("glAccountCategoryId", catId)
            .orderBy("glAccountId")
            .queryList()

        List members = []
        membersGv.each { m ->
            GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", m.glAccountId).queryOne()
            members.add([
                glAccountId: m.glAccountId,
                accountName: acc ? (acc.accountName ?: m.glAccountId) : m.glAccountId,
                accountCode: acc ? (acc.accountCode ?: m.glAccountId) : m.glAccountId,
                glAccountCategoryId: m.glAccountCategoryId,
                fromDate: m.fromDate ? m.fromDate.toString() : null,
                thruDate: m.thruDate ? m.thruDate.toString() : null,
                amountPercentage: m.amountPercentage != null ? m.amountPercentage.doubleValue() : 100.0
            ])
        }

        request.setAttribute("members", members)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlAccountCategoryMembers: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. createGlAccountCategory
 */
String createGlAccountCategory() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String description = parameters.description?.trim()
        String typeId = parameters.glAccountCategoryTypeId?.trim() ?: "COST_CENTER"
        String catId = parameters.glAccountCategoryId?.trim()

        if (!description) {
            request.setAttribute("_ERROR_MESSAGE_", "description is required")
            return "error"
        }
        if (!catId) {
            catId = delegator.getNextSeqId("GlAccountCategory")
        }

        GenericValue cat = delegator.makeValue("GlAccountCategory", [
            glAccountCategoryId: catId,
            glAccountCategoryTypeId: typeId,
            description: description
        ])
        delegator.create(cat)

        request.setAttribute("glAccountCategoryId", catId)
        request.setAttribute("_EVENT_MESSAGE_", "Category created successfully: " + catId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createGlAccountCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. addGlAccountToCategory
 */
String addGlAccountToCategory() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String catId = parameters.glAccountCategoryId?.trim()
        String glAccountId = parameters.glAccountId?.trim()

        if (!catId || !glAccountId) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountCategoryId and glAccountId are required")
            return "error"
        }

        Timestamp fromDate = parseDateToTimestamp(parameters.fromDate, false) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseDateToTimestamp(parameters.thruDate, true)

        BigDecimal pct = BigDecimal.valueOf(100.0)
        if (parameters.amountPercentage != null) {
            try { pct = new BigDecimal(parameters.amountPercentage.toString().trim()) } catch (Exception ignored) {}
        }

        GenericValue member = delegator.makeValue("GlAccountCategoryMember", [
            glAccountCategoryId: catId,
            glAccountId: glAccountId,
            fromDate: fromDate,
            thruDate: thruDate,
            amountPercentage: pct
        ])
        delegator.create(member)

        request.setAttribute("_EVENT_MESSAGE_", "Account added to category successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error adding account to category: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. removeGlAccountFromCategory
 */
String removeGlAccountFromCategory() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String catId = parameters.glAccountCategoryId?.trim()
        String glAccountId = parameters.glAccountId?.trim()
        String fromDateStr = parameters.fromDate?.trim()

        if (!catId || !glAccountId || !fromDateStr) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountCategoryId, glAccountId, and fromDate are required")
            return "error"
        }

        Timestamp fromDate = parseDateToTimestamp(fromDateStr, false)
        GenericValue member = EntityQuery.use(delegator).from("GlAccountCategoryMember")
            .where("glAccountCategoryId", catId, "glAccountId", glAccountId, "fromDate", fromDate)
            .queryOne()

        if (!member) {
            request.setAttribute("_ERROR_MESSAGE_", "Category member not found")
            return "error"
        }

        delegator.removeValue(member)
        request.setAttribute("_EVENT_MESSAGE_", "Account removed from category")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error removing account from category: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. getCostCenterBalances
 * Returns financial balances broken down by Cost Center categories
 */
String getCostCenterBalances() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    String orgPartyId = parameters.organizationPartyId ?: "Company"

    try {
        Timestamp fromDate = null
        Timestamp thruDate = null
        if (parameters.year) {
            String y = parameters.year.trim()
            fromDate = Timestamp.valueOf(y + "-01-01 00:00:00.0")
            thruDate = Timestamp.valueOf(y + "-12-31 23:59:59.9")
        }
        if (parameters.fromDate) fromDate = parseDateToTimestamp(parameters.fromDate, false)
        if (parameters.thruDate) thruDate = parseDateToTimestamp(parameters.thruDate, true)

        List<GenericValue> costCenters = EntityQuery.use(delegator).from("GlAccountCategory")
            .where("glAccountCategoryTypeId", "COST_CENTER")
            .orderBy("glAccountCategoryId")
            .queryList()

        List costCenterReports = []

        costCenters.each { cc ->
            List<GenericValue> members = EntityQuery.use(delegator).from("GlAccountCategoryMember")
                .where("glAccountCategoryId", cc.glAccountCategoryId)
                .filterByDate()
                .queryList()

            List accountRows = []
            BigDecimal totalDebit = BigDecimal.ZERO
            BigDecimal totalCredit = BigDecimal.ZERO

            members.each { m ->
                GenericValue acc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", m.glAccountId).queryOne()
                if (!acc) return

                List<EntityCondition> entryConds = [
                    EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId),
                    EntityCondition.makeCondition("glAccountId", EntityOperator.EQUALS, m.glAccountId)
                ]
                if (fromDate) entryConds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
                if (thruDate) entryConds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))

                List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransAndEntries")
                    .where(EntityCondition.makeCondition(entryConds, EntityOperator.AND))
                    .queryList()

                BigDecimal d = BigDecimal.ZERO
                BigDecimal c = BigDecimal.ZERO
                entries.each { pe ->
                    BigDecimal a = pe.getBigDecimal("amount") ?: BigDecimal.ZERO
                    String flag = pe.getString("debitCreditFlag")
                    if ("D".equals(flag)) d = d.add(a)
                    else if ("C".equals(flag)) c = c.add(a)
                }

                BigDecimal pctFactor = m.amountPercentage != null ? m.amountPercentage.divide(BigDecimal.valueOf(100.0)) : BigDecimal.ONE
                BigDecimal allocD = d.multiply(pctFactor)
                BigDecimal allocC = c.multiply(pctFactor)
                BigDecimal bal = allocD.subtract(allocC)

                totalDebit = totalDebit.add(allocD)
                totalCredit = totalCredit.add(allocC)

                accountRows.add([
                    glAccountId: m.glAccountId,
                    accountName: acc.accountName ?: m.glAccountId,
                    accountCode: acc.accountCode ?: m.glAccountId,
                    amountPercentage: m.amountPercentage != null ? m.amountPercentage.doubleValue() : 100.0,
                    debit: allocD.doubleValue(),
                    credit: allocC.doubleValue(),
                    balance: bal.doubleValue()
                ])
            }

            BigDecimal netBal = totalDebit.subtract(totalCredit)
            costCenterReports.add([
                glAccountCategoryId: cc.glAccountCategoryId,
                description: cc.description ?: cc.glAccountCategoryId,
                totalDebit: totalDebit.doubleValue(),
                totalCredit: totalCredit.doubleValue(),
                netBalance: netBal.doubleValue(),
                accounts: accountRows
            ])
        }

        request.setAttribute("costCenters", costCenterReports)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCostCenterBalances: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
