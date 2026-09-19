/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.service.ServiceUtil
import java.sql.Timestamp
import java.math.BigDecimal
import java.math.RoundingMode

final String MODULE = "BudgetAndAgreementEvents.groovy"

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

Timestamp parseTimestamp(Object dateObj, boolean isEndOfDay = false) {
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

String getPartyName(def delegator, String partyId) {
    if (!partyId) return "—"
    try {
        GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).queryOne()
        if (pg && pg.groupName) return pg.groupName

        GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
        if (person) {
            String full = [person.firstName, person.middleName, person.lastName].findAll { it }.join(" ")
            if (full) return full
        }
    } catch (Exception e) {
        Debug.logWarning("Error getting party name for " + partyId + ": " + e.getMessage(), MODULE)
    }
    return partyId
}

String getProductName(def delegator, String productId) {
    if (!productId) return "—"
    try {
        GenericValue p = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (p && p.internalName) return p.internalName
        if (p && p.productName) return p.productName
    } catch (Exception ignored) {}
    return productId
}

// =========================================================================
// 1. BUDGET VARIANCE & ACTUALS REPORT
// =========================================================================

/**
 * getBudgetVarianceReport
 * Calculates budget vs actual expenditures using AcctgTrans and AcctgTransEntry.
 */
String getBudgetVarianceReport() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String budgetId = parameters.budgetId?.trim()
        if (!budgetId) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId is required.")
            return "error"
        }

        GenericValue budget = EntityQuery.use(delegator).from("Budget").where("budgetId", budgetId).queryOne()
        if (!budget) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe bulunamadı: " + budgetId)
            return "error"
        }

        // Determine date range from CustomTimePeriod if assigned
        Timestamp fromDate = null
        Timestamp thruDate = null
        if (budget.customTimePeriodId) {
            GenericValue ctp = EntityQuery.use(delegator).from("CustomTimePeriod").where("customTimePeriodId", budget.customTimePeriodId).queryOne()
            if (ctp) {
                if (ctp.fromDate) fromDate = parseTimestamp(ctp.fromDate)
                if (ctp.thruDate) thruDate = parseTimestamp(ctp.thruDate, true)
            }
        }

        // Budget Items
        List<GenericValue> items = EntityQuery.use(delegator)
            .from("BudgetItem")
            .where("budgetId", budgetId)
            .orderBy("budgetItemSeqId")
            .queryList()

        BigDecimal grandTotalBudget = BigDecimal.ZERO
        BigDecimal grandTotalActual = BigDecimal.ZERO

        List varianceItems = []

        for (GenericValue item : items) {
            BigDecimal bAmt = item.amount ?: BigDecimal.ZERO
            grandTotalBudget = grandTotalBudget.add(bAmt)

            GenericValue bit = item.getRelatedOne("BudgetItemType", false)
            String typeDesc = bit?.description ?: (item.budgetItemTypeId ?: "Standard Item")

            // Calculate actual expenses for this budget item / type
            // Query GL entries for EXPENSE class accounts within period
            List conditions = [
                EntityCondition.makeCondition("isPosted", EntityOperator.EQUALS, "Y")
            ]
            if (fromDate) conditions.add(EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
            if (thruDate) conditions.add(EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))

            List<GenericValue> glTrans = EntityQuery.use(delegator)
                .from("AcctgTrans")
                .where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
                .queryList()

            BigDecimal actualSpent = BigDecimal.ZERO

            if (glTrans && glTrans.size() > 0) {
                List<String> transIds = glTrans.collect { it.acctgTransId }
                List<GenericValue> entries = EntityQuery.use(delegator)
                    .from("AcctgTransEntry")
                    .where(EntityCondition.makeCondition("acctgTransId", EntityOperator.IN, transIds))
                    .queryList()

                // Filter expense accounts or matching descriptions
                for (GenericValue ent : entries) {
                    GenericValue glAcc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", ent.glAccountId).queryOne()
                    if (glAcc && ("EXPENSE".equals(glAcc.glAccountClassId) || "6".equals(ent.glAccountId.substring(0, 1)))) {
                        if ("D".equals(ent.debitCreditFlag)) {
                            actualSpent = actualSpent.add(ent.origAmount ?: BigDecimal.ZERO)
                        } else {
                            actualSpent = actualSpent.subtract(ent.origAmount ?: BigDecimal.ZERO)
                        }
                    }
                }
                // Distribute proportionally across budget items if multiple items exist
                if (items.size() > 1 && grandTotalBudget.compareTo(BigDecimal.ZERO) > 0) {
                    actualSpent = actualSpent.multiply(bAmt).divide(grandTotalBudget, 2, RoundingMode.HALF_UP)
                }
            }

            if (actualSpent.compareTo(BigDecimal.ZERO) < 0) actualSpent = BigDecimal.ZERO
            grandTotalActual = grandTotalActual.add(actualSpent)

            BigDecimal varianceAmt = bAmt.subtract(actualSpent)
            double usagePct = 0.0
            if (bAmt.compareTo(BigDecimal.ZERO) > 0) {
                usagePct = actualSpent.divide(bAmt, 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100)).doubleValue()
            }

            String statusIndicator = "ON_TRACK" // GREEN
            if (usagePct > 100.0) {
                statusIndicator = "OVER_BUDGET" // RED
            } else if (usagePct > 85.0) {
                statusIndicator = "WARNING" // YELLOW
            }

            varianceItems.add([
                budgetItemSeqId: item.budgetItemSeqId,
                budgetItemTypeId: item.budgetItemTypeId ?: "",
                budgetItemTypeDesc: typeDesc,
                purpose: item.purpose ?: "",
                justification: item.justification ?: "",
                budgetAmount: bAmt.doubleValue(),
                actualAmount: actualSpent.doubleValue(),
                varianceAmount: varianceAmt.doubleValue(),
                usagePercentage: Math.round(usagePct * 100.0) / 100.0,
                statusIndicator: statusIndicator
            ])
        }

        BigDecimal grandVariance = grandTotalBudget.subtract(grandTotalActual)
        double grandUsagePct = 0.0
        if (grandTotalBudget.compareTo(BigDecimal.ZERO) > 0) {
            grandUsagePct = grandTotalActual.divide(grandTotalBudget, 4, RoundingMode.HALF_UP).multiply(new BigDecimal(100)).doubleValue()
        }

        request.setAttribute("budgetId", budgetId)
        request.setAttribute("totalBudget", grandTotalBudget.doubleValue())
        request.setAttribute("totalActual", grandTotalActual.doubleValue())
        request.setAttribute("totalVariance", grandVariance.doubleValue())
        request.setAttribute("overallUsagePct", Math.round(grandUsagePct * 100.0) / 100.0)
        request.setAttribute("items", varianceItems)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBudgetVarianceReport: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// =========================================================================
// 2. BUDGET REVISIONS & WORKFLOW
// =========================================================================

/**
 * getBudgetRevisions
 * Returns history of budget revisions and impact lines.
 */
String getBudgetRevisions() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String budgetId = parameters.budgetId?.trim()
        if (!budgetId) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId is required.")
            return "error"
        }

        List<GenericValue> revisions = EntityQuery.use(delegator)
            .from("BudgetRevision")
            .where("budgetId", budgetId)
            .orderBy("-dateRevised", "-revisionSeqId")
            .queryList()

        List list = []
        for (GenericValue rev : revisions) {
            List<GenericValue> impacts = EntityQuery.use(delegator)
                .from("BudgetRevisionImpact")
                .where("budgetId", budgetId, "revisionSeqId", rev.revisionSeqId)
                .queryList()

            List impactList = []
            for (GenericValue imp : impacts) {
                impactList.add([
                    budgetItemSeqId: imp.budgetItemSeqId,
                    revisedAmount: imp.revisedAmount ? imp.revisedAmount.doubleValue() : 0.0,
                    addDeleteFlag: imp.addDeleteFlag ?: "M"
                ])
            }

            list.add([
                budgetId: rev.budgetId,
                revisionSeqId: rev.revisionSeqId,
                dateRevised: rev.dateRevised ? rev.dateRevised.toString().substring(0, 16) : "",
                revisionReason: rev.revisionReason ?: "",
                impacts: impactList
            ])
        }

        request.setAttribute("revisions", list)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBudgetRevisions: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * createBudgetRevision
 * Creates a budget revision, adjusts budget item amount, and records audit impact.
 */
String createBudgetRevision() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String budgetId = parameters.budgetId?.trim()
        String budgetItemSeqId = parameters.budgetItemSeqId?.trim()
        String revisionReason = parameters.revisionReason?.trim() ?: "Bütçe Revizyonu"

        if (!budgetId || !budgetItemSeqId || !parameters.revisedAmount) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId, budgetItemSeqId and revisedAmount are required.")
            return "error"
        }

        BigDecimal newAmt = new BigDecimal(parameters.revisedAmount.toString().trim())

        GenericValue bItem = EntityQuery.use(delegator)
            .from("BudgetItem")
            .where("budgetId", budgetId, "budgetItemSeqId", budgetItemSeqId)
            .queryOne()

        if (!bItem) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe kalemi bulunamadı: " + budgetItemSeqId)
            return "error"
        }

        BigDecimal oldAmt = bItem.amount ?: BigDecimal.ZERO

        // Get next revision seq id
        List<GenericValue> existingRevs = EntityQuery.use(delegator)
            .from("BudgetRevision")
            .where("budgetId", budgetId)
            .orderBy("-revisionSeqId")
            .queryList()

        int nextSeq = 1
        if (existingRevs && existingRevs.size() > 0) {
            try {
                nextSeq = Integer.parseInt(existingRevs[0].revisionSeqId) + 1
            } catch (Exception ignored) {
                nextSeq = existingRevs.size() + 1
            }
        }
        String revSeqId = String.format("%05d", nextSeq)

        Timestamp nowTs = UtilDateTime.nowTimestamp()

        // Create BudgetRevision
        GenericValue rev = delegator.makeValue("BudgetRevision", [
            budgetId: budgetId,
            revisionSeqId: revSeqId,
            dateRevised: nowTs,
            revisionReason: revisionReason
        ])
        rev.create()

        // Create BudgetRevisionImpact
        GenericValue impact = delegator.makeValue("BudgetRevisionImpact", [
            budgetId: budgetId,
            budgetItemSeqId: budgetItemSeqId,
            revisionSeqId: revSeqId,
            revisedAmount: newAmt,
            addDeleteFlag: "M"
        ])
        impact.create()

        // Update BudgetItem amount
        bItem.amount = newAmt
        bItem.store()

        request.setAttribute("revisionSeqId", revSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Bütçe revizyonu kaydedildi (#" + revSeqId + "). Kalem tutarı güncellendi: " + oldAmt + " -> " + newAmt)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBudgetRevision: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * updateBudgetItem
 * Updates budget item fields (amount, purpose, justification).
 */
String updateBudgetItem() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String budgetId = parameters.budgetId?.trim()
        String budgetItemSeqId = parameters.budgetItemSeqId?.trim()

        if (!budgetId || !budgetItemSeqId) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId and budgetItemSeqId are required.")
            return "error"
        }

        GenericValue bItem = EntityQuery.use(delegator)
            .from("BudgetItem")
            .where("budgetId", budgetId, "budgetItemSeqId", budgetItemSeqId)
            .queryOne()

        if (!bItem) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe kalemi bulunamadı.")
            return "error"
        }

        if (parameters.amount) {
            bItem.amount = new BigDecimal(parameters.amount.toString().trim())
        }
        if (parameters.purpose) bItem.purpose = parameters.purpose.trim()
        if (parameters.justification) bItem.justification = parameters.justification.trim()
        if (parameters.budgetItemTypeId) bItem.budgetItemTypeId = parameters.budgetItemTypeId.trim()

        bItem.store()

        request.setAttribute("_EVENT_MESSAGE_", "Bütçe kalemi başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateBudgetItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removeBudgetItem
 * Removes a budget item line.
 */
String removeBudgetItem() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String budgetId = parameters.budgetId?.trim()
        String budgetItemSeqId = parameters.budgetItemSeqId?.trim()

        if (!budgetId || !budgetItemSeqId) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId and budgetItemSeqId are required.")
            return "error"
        }

        GenericValue bItem = EntityQuery.use(delegator)
            .from("BudgetItem")
            .where("budgetId", budgetId, "budgetItemSeqId", budgetItemSeqId)
            .queryOne()

        if (!bItem) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe kalemi bulunamadı.")
            return "error"
        }

        bItem.remove()

        request.setAttribute("_EVENT_MESSAGE_", "Bütçe kalemi silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeBudgetItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// =========================================================================
// 3. AGREEMENTS: ITEMS, TERMS, PRODUCT PRICES & PARTIES
// =========================================================================

/**
 * getAgreementExtendedDetails
 * Returns full agreement structure: header, items, terms, product price applications, parties.
 */
String getAgreementExtendedDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        if (!agreementId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId is required.")
            return "error"
        }

        GenericValue ag = EntityQuery.use(delegator).from("Agreement").where("agreementId", agreementId).queryOne()
        if (!ag) {
            request.setAttribute("_ERROR_MESSAGE_", "Sözleşme bulunamadı: " + agreementId)
            return "error"
        }

        GenericValue at = ag.getRelatedOne("AgreementType", false)

        Map agreementMap = [
            agreementId: ag.agreementId,
            agreementTypeId: ag.agreementTypeId ?: "",
            agreementTypeDesc: at?.description ?: ag.agreementTypeId,
            partyIdFrom: ag.partyIdFrom ?: "",
            partyFromDesc: getPartyName(delegator, ag.partyIdFrom),
            partyIdTo: ag.partyIdTo ?: "",
            partyToDesc: getPartyName(delegator, ag.partyIdTo),
            description: ag.description ?: "",
            textData: ag.textData ?: "",
            statusId: ag.statusId ?: "AGR_ACTIVE",
            agreementDate: ag.agreementDate ? ag.agreementDate.toString().substring(0, 10) : "",
            fromDate: ag.fromDate ? ag.fromDate.toString().substring(0, 10) : "",
            thruDate: ag.thruDate ? ag.thruDate.toString().substring(0, 10) : ""
        ]

        // Terms
        List terms = EntityQuery.use(delegator)
            .from("AgreementTerm")
            .where("agreementId", agreementId)
            .queryList().collect {
                GenericValue tt = it.getRelatedOne("TermType", false)
                [
                    agreementTermId: it.agreementTermId,
                    agreementItemSeqId: it.agreementItemSeqId ?: "",
                    termTypeId: it.termTypeId,
                    termTypeDesc: tt?.description ?: it.termTypeId,
                    termValue: it.termValue ? it.termValue.doubleValue() : 0.0,
                    termDays: it.termDays ?: 0,
                    textValue: it.textValue ?: "",
                    description: it.description ?: ""
                ]
            }

        // Items
        List items = EntityQuery.use(delegator)
            .from("AgreementItem")
            .where("agreementId", agreementId)
            .orderBy("agreementItemSeqId")
            .queryList().collect {
                GenericValue ait = it.getRelatedOne("AgreementItemType", false)
                [
                    agreementItemSeqId: it.agreementItemSeqId,
                    agreementItemTypeId: it.agreementItemTypeId ?: "",
                    agreementItemTypeDesc: ait?.description ?: it.agreementItemTypeId,
                    currencyUomId: it.currencyUomId ?: "TRY",
                    agreementText: it.agreementText ?: ""
                ]
            }

        // Product Prices (AgreementProductAppl)
        List productPrices = EntityQuery.use(delegator)
            .from("AgreementProductAppl")
            .where("agreementId", agreementId)
            .queryList().collect {
                [
                    agreementId: it.agreementId,
                    agreementItemSeqId: it.agreementItemSeqId,
                    productId: it.productId,
                    productName: getProductName(delegator, it.productId),
                    price: it.price ? it.price.doubleValue() : 0.0
                ]
            }

        // Agreement Parties (AgreementPartyApplic)
        List parties = EntityQuery.use(delegator)
            .from("AgreementPartyApplic")
            .where("agreementId", agreementId)
            .queryList().collect {
                [
                    agreementId: it.agreementId,
                    agreementItemSeqId: it.agreementItemSeqId ?: "",
                    partyId: it.partyId,
                    partyName: getPartyName(delegator, it.partyId)
                ]
            }

        // Agreement Status History
        List statuses = EntityQuery.use(delegator)
            .from("AgreementStatus")
            .where("agreementId", agreementId)
            .orderBy("-statusDate")
            .queryList().collect {
                [
                    agreementStatusId: it.agreementStatusId,
                    statusId: it.statusId,
                    statusDate: it.statusDate ? it.statusDate.toString().substring(0, 16) : "",
                    comments: it.comments ?: "",
                    setByUserLoginId: it.setByUserLoginId ?: ""
                ]
            }

        request.setAttribute("agreement", agreementMap)
        request.setAttribute("items", items)
        request.setAttribute("terms", terms)
        request.setAttribute("productPrices", productPrices)
        request.setAttribute("parties", parties)
        request.setAttribute("statuses", statuses)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAgreementExtendedDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * createAgreementItem
 * Adds a new item/clause to an agreement.
 */
String createAgreementItem() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        if (!agreementId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId is required.")
            return "error"
        }

        List<GenericValue> existingItems = EntityQuery.use(delegator)
            .from("AgreementItem")
            .where("agreementId", agreementId)
            .orderBy("-agreementItemSeqId")
            .queryList()

        int nextSeq = 1
        if (existingItems && existingItems.size() > 0) {
            try {
                nextSeq = Integer.parseInt(existingItems[0].agreementItemSeqId) + 1
            } catch (Exception ignored) {
                nextSeq = existingItems.size() + 1
            }
        }
        String itemSeqId = String.format("%05d", nextSeq)

        GenericValue item = delegator.makeValue("AgreementItem", [
            agreementId: agreementId,
            agreementItemSeqId: itemSeqId,
            agreementItemTypeId: parameters.agreementItemTypeId?.trim() ?: "AGREEMENT_PRICING_PR",
            currencyUomId: parameters.currencyUomId?.trim() ?: "TRY",
            agreementText: parameters.agreementText?.trim() ?: ""
        ])
        item.create()

        request.setAttribute("agreementItemSeqId", itemSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme maddesi eklendi (#" + itemSeqId + ").")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createAgreementItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removeAgreementItem
 * Removes an agreement item and cleans up related product prices/terms.
 */
String removeAgreementItem() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        String agreementItemSeqId = parameters.agreementItemSeqId?.trim()

        if (!agreementId || !agreementItemSeqId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId and agreementItemSeqId are required.")
            return "error"
        }

        // Remove related product prices
        delegator.removeByAnd("AgreementProductAppl", [agreementId: agreementId, agreementItemSeqId: agreementItemSeqId])
        // Remove related terms
        delegator.removeByAnd("AgreementTerm", [agreementId: agreementId, agreementItemSeqId: agreementItemSeqId])

        // Remove item
        GenericValue item = EntityQuery.use(delegator)
            .from("AgreementItem")
            .where("agreementId", agreementId, "agreementItemSeqId", agreementItemSeqId)
            .queryOne()

        if (item) item.remove()

        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme maddesi ve bağlı kayıtlar silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeAgreementItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * createAgreementTerm
 * Adds a contractual condition / payment / invoicing term.
 */
String createAgreementTerm() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        String termTypeId = parameters.termTypeId?.trim() ?: "FIN_PAYMENT_TERM"

        if (!agreementId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId is required.")
            return "error"
        }

        String termId = delegator.getNextSeqId("AgreementTerm")

        GenericValue term = delegator.makeValue("AgreementTerm", [
            agreementTermId: termId,
            agreementId: agreementId,
            agreementItemSeqId: parameters.agreementItemSeqId?.trim() ?: null,
            termTypeId: termTypeId,
            description: parameters.description?.trim() ?: "",
            textValue: parameters.textValue?.trim() ?: ""
        ])

        if (parameters.termValue) {
            try {
                term.termValue = new BigDecimal(parameters.termValue.toString().trim())
            } catch (Exception ignored) {}
        }
        if (parameters.termDays) {
            try {
                term.termDays = Long.parseLong(parameters.termDays.toString().trim())
            } catch (Exception ignored) {}
        }

        term.create()

        request.setAttribute("agreementTermId", termId)
        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme şartı başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createAgreementTerm: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removeAgreementTerm
 * Deletes an agreement term.
 */
String removeAgreementTerm() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementTermId = parameters.agreementTermId?.trim()
        if (!agreementTermId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementTermId is required.")
            return "error"
        }

        GenericValue term = EntityQuery.use(delegator).from("AgreementTerm").where("agreementTermId", agreementTermId).queryOne()
        if (term) term.remove()

        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme şartı silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeAgreementTerm: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * createAgreementProductPrice
 * Assigns agreed contracted price to a product.
 */
String createAgreementProductPrice() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        String productId = parameters.productId?.trim()
        String agreementItemSeqId = parameters.agreementItemSeqId?.trim() ?: "00001"

        if (!agreementId || !productId || !parameters.price) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId, productId and price are required.")
            return "error"
        }

        // Ensure item exists
        GenericValue item = EntityQuery.use(delegator)
            .from("AgreementItem")
            .where("agreementId", agreementId, "agreementItemSeqId", agreementItemSeqId)
            .queryOne()

        if (!item) {
            item = delegator.makeValue("AgreementItem", [
                agreementId: agreementId,
                agreementItemSeqId: agreementItemSeqId,
                agreementItemTypeId: "AGREEMENT_PRICING_PR",
                currencyUomId: parameters.currencyUomId?.trim() ?: "TRY",
                agreementText: "Sözleşmeli Ürün Fiyatı"
            ])
            item.create()
        }

        BigDecimal priceVal = new BigDecimal(parameters.price.toString().trim())

        GenericValue app = delegator.makeValue("AgreementProductAppl", [
            agreementId: agreementId,
            agreementItemSeqId: agreementItemSeqId,
            productId: productId,
            price: priceVal
        ])
        app.createOrStore()

        request.setAttribute("_EVENT_MESSAGE_", "Sözleşmeli ürün fiyatı kaydedildi (" + productId + " -> " + priceVal + ").")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createAgreementProductPrice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removeAgreementProductPrice
 * Removes contracted price for a product.
 */
String removeAgreementProductPrice() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        String productId = parameters.productId?.trim()
        String agreementItemSeqId = parameters.agreementItemSeqId?.trim() ?: "00001"

        if (!agreementId || !productId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId and productId are required.")
            return "error"
        }

        GenericValue app = EntityQuery.use(delegator)
            .from("AgreementProductAppl")
            .where("agreementId", agreementId, "agreementItemSeqId", agreementItemSeqId, "productId", productId)
            .queryOne()

        if (app) app.remove()

        request.setAttribute("_EVENT_MESSAGE_", "Sözleşmeli ürün fiyatı kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeAgreementProductPrice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * setAgreementStatus
 * Updates agreement status and writes audit log.
 */
String setAgreementStatus() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        String statusId = parameters.statusId?.trim()

        if (!agreementId || !statusId) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId and statusId are required.")
            return "error"
        }

        GenericValue ag = EntityQuery.use(delegator).from("Agreement").where("agreementId", agreementId).queryOne()
        if (!ag) {
            request.setAttribute("_ERROR_MESSAGE_", "Sözleşme bulunamadı: " + agreementId)
            return "error"
        }

        ag.statusId = statusId
        ag.store()

        String nextStatusSeqId = delegator.getNextSeqId("AgreementStatus")
        GenericValue uL = getSystemUserLogin()

        GenericValue ast = delegator.makeValue("AgreementStatus", [
            agreementStatusId: nextStatusSeqId,
            agreementId: agreementId,
            statusId: statusId,
            statusDate: UtilDateTime.nowTimestamp(),
            comments: parameters.comments?.trim() ?: "",
            setByUserLoginId: uL ? uL.userLoginId : "system"
        ])
        ast.create()

        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setAgreementStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
