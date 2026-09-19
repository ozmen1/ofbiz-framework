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
import java.sql.Date as SqlDate
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Calendar

final String MODULE = "FixedAssetLifecycleEvents.groovy"

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

SqlDate parseSqlDate(Object dateObj) {
    if (!dateObj) return null
    if (dateObj instanceof SqlDate) return (SqlDate) dateObj
    String str = dateObj.toString().trim()
    if (str.isEmpty()) return null
    try {
        if (str.length() > 10) str = str.substring(0, 10)
        return SqlDate.valueOf(str)
    } catch (Exception e) {
        Debug.logWarning("Could not parse sql date: " + str + " - " + e.getMessage(), MODULE)
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

/**
 * 1. getFixedAssetDepreciation
 * Returns depreciation parameters, calculation projection, methods, and historical GL transactions.
 */
String getFixedAssetDepreciation() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FixedAsset").where("fixedAssetId", fixedAssetId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Fixed asset not found: " + fixedAssetId)
            return "error"
        }

        BigDecimal purchaseCost = fa.purchaseCost ?: BigDecimal.ZERO
        BigDecimal salvageValue = fa.salvageValue ?: BigDecimal.ZERO
        BigDecimal accumulatedDep = fa.depreciation ?: BigDecimal.ZERO
        BigDecimal nbv = purchaseCost.subtract(accumulatedDep)
        if (nbv.compareTo(BigDecimal.ZERO) < 0) nbv = BigDecimal.ZERO

        // Depreciation Methods
        List<GenericValue> depMethods = EntityQuery.use(delegator)
            .from("FixedAssetDepMethod")
            .where("fixedAssetId", fixedAssetId)
            .filterByDate()
            .queryList()

        String activeMethodId = "ST_LINE_DEP"
        if (depMethods && depMethods.size() > 0) {
            activeMethodId = depMethods[0].depreciationCustomMethodId ?: "ST_LINE_DEP"
        }

        // Calculate straight line projection
        int acquiredYear = 2024
        if (fa.dateAcquired) {
            Calendar cal = Calendar.getInstance()
            cal.setTime(fa.dateAcquired)
            acquiredYear = cal.get(Calendar.YEAR)
        }
        int endYear = acquiredYear + 5
        if (fa.expectedEndOfLife) {
            Calendar cal = Calendar.getInstance()
            cal.setTime(fa.expectedEndOfLife)
            endYear = cal.get(Calendar.YEAR)
        }
        int usefulYears = endYear - acquiredYear
        if (usefulYears <= 0) usefulYears = 5

        BigDecimal depreciableBase = purchaseCost.subtract(salvageValue)
        if (depreciableBase.compareTo(BigDecimal.ZERO) < 0) depreciableBase = BigDecimal.ZERO
        BigDecimal annualStraightLine = usefulYears > 0 ? depreciableBase.divide(new BigDecimal(usefulYears), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO

        List schedule = []
        BigDecimal runningDep = BigDecimal.ZERO
        BigDecimal runningCost = purchaseCost
        for (int i = 1; i <= usefulYears; i++) {
            BigDecimal yearDep = annualStraightLine
            if (runningDep.add(yearDep).compareTo(depreciableBase) > 0) {
                yearDep = depreciableBase.subtract(runningDep)
            }
            runningDep = runningDep.add(yearDep)
            runningCost = runningCost.subtract(yearDep)
            schedule.add([
                year: acquiredYear + i - 1,
                yearNumber: i,
                depreciationAmount: yearDep.doubleValue(),
                accumulatedDepreciation: runningDep.doubleValue(),
                netBookValue: runningCost.doubleValue()
            ])
        }

        // Historical GL Transactions for this asset
        List<GenericValue> transList = EntityQuery.use(delegator)
            .from("AcctgTrans")
            .where("fixedAssetId", fixedAssetId, "acctgTransTypeId", "DEPRECIATION")
            .orderBy("-transactionDate", "-acctgTransId")
            .queryList()

        List history = []
        for (GenericValue tr : transList) {
            List<GenericValue> entries = tr.getRelated("AcctgTransEntry", null, ["acctgTransEntrySeqId"], false)
            BigDecimal transAmt = BigDecimal.ZERO
            for (GenericValue entry : entries) {
                if ("D".equals(entry.debitCreditFlag)) {
                    transAmt = transAmt.add(entry.origAmount ?: BigDecimal.ZERO)
                }
            }
            history.add([
                acctgTransId: tr.acctgTransId,
                transactionDate: tr.transactionDate ? tr.transactionDate.toString().substring(0, 10) : "",
                description: tr.description ?: "Amortisman Mahsubu",
                isPosted: tr.isPosted ?: "N",
                postedDate: tr.postedDate ? tr.postedDate.toString().substring(0, 10) : "",
                amount: transAmt.doubleValue(),
                glJournalId: tr.glJournalId ?: ""
            ])
        }

        // Suggested next depreciation amount
        BigDecimal nextSuggestedAmount = annualStraightLine
        BigDecimal remainingToDepreciate = depreciableBase.subtract(accumulatedDep)
        if (remainingToDepreciate.compareTo(BigDecimal.ZERO) <= 0) {
            nextSuggestedAmount = BigDecimal.ZERO
        } else if (nextSuggestedAmount.compareTo(remainingToDepreciate) > 0) {
            nextSuggestedAmount = remainingToDepreciate
        }

        request.setAttribute("fixedAssetId", fixedAssetId)
        request.setAttribute("purchaseCost", purchaseCost.doubleValue())
        request.setAttribute("salvageValue", salvageValue.doubleValue())
        request.setAttribute("accumulatedDepreciation", accumulatedDep.doubleValue())
        request.setAttribute("netBookValue", nbv.doubleValue())
        request.setAttribute("usefulYears", usefulYears)
        request.setAttribute("depreciationMethod", activeMethodId)
        request.setAttribute("nextSuggestedAmount", nextSuggestedAmount.doubleValue())
        request.setAttribute("projectionSchedule", schedule)
        request.setAttribute("transactionHistory", history)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssetDepreciation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load depreciation data: " + e.getMessage())
        return "error"
    }
}

/**
 * 2. postFixedAssetDepreciation
 * Calculates depreciation for a single asset, records GL transaction and updates FixedAsset.
 */
String postFixedAssetDepreciation() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FixedAsset").where("fixedAssetId", fixedAssetId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Fixed asset not found: " + fixedAssetId)
            return "error"
        }

        BigDecimal pCost = fa.purchaseCost ?: BigDecimal.ZERO
        BigDecimal sVal = fa.salvageValue ?: BigDecimal.ZERO
        BigDecimal currentDep = fa.depreciation ?: BigDecimal.ZERO
        BigDecimal maxDepreciable = pCost.subtract(sVal)
        if (maxDepreciable.compareTo(BigDecimal.ZERO) < 0) maxDepreciable = BigDecimal.ZERO

        BigDecimal depAmount = BigDecimal.ZERO
        if (parameters.amount) {
            depAmount = new BigDecimal(parameters.amount.toString().trim())
        }
        if (depAmount.compareTo(BigDecimal.ZERO) <= 0) {
            // Default 1 year straight-line
            int usefulYears = 5
            depAmount = maxDepreciable.divide(new BigDecimal(usefulYears), 2, RoundingMode.HALF_UP)
        }

        BigDecimal remaining = maxDepreciable.subtract(currentDep)
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu duran varlık tamamen amorti edilmiştir, ek amortisman ayrılamaz.")
            return "error"
        }
        if (depAmount.compareTo(remaining) > 0) {
            depAmount = remaining
        }

        String orgPartyId = parameters.organizationPartyId?.trim() ?: (fa.partyId ?: "Company")
        Timestamp nowTs = UtilDateTime.nowTimestamp()
        String description = parameters.description?.trim() ?: ("Amortisman Gider Kaydı - " + (fa.fixedAssetName ?: fa.fixedAssetId))

        // Find GL accounts (Default 657000 Amortisman Gideri / 257000 Birikmiş Amortisman or Demo equivalent)
        String debitGlAccountId = parameters.debitGlAccountId?.trim()
        String creditGlAccountId = parameters.creditGlAccountId?.trim()

        if (!debitGlAccountId) {
            // Check for demo or standard depreciation expense account
            GenericValue expAcc = EntityQuery.use(delegator).from("GlAccount")
                .where(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("glAccountClassId", EntityOperator.EQUALS, "EXPENSE"),
                    EntityCondition.makeCondition("accountName", EntityOperator.LIKE, "%Depreciation%")
                ], EntityOperator.AND))
                .queryFirst()
            debitGlAccountId = expAcc ? expAcc.glAccountId : "600000"
        }

        if (!creditGlAccountId) {
            GenericValue contraAcc = EntityQuery.use(delegator).from("GlAccount")
                .where(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("accountName", EntityOperator.LIKE, "%Accumulated%")
                ], EntityOperator.AND))
                .queryFirst()
            creditGlAccountId = contraAcc ? contraAcc.glAccountId : "175000"
        }

        // Create AcctgTrans
        String acctgTransId = delegator.getNextSeqId("AcctgTrans")
        GenericValue acctgTrans = delegator.makeValue("AcctgTrans", [
            acctgTransId: acctgTransId,
            acctgTransTypeId: "DEPRECIATION",
            description: description,
            transactionDate: nowTs,
            isPosted: "Y",
            postedDate: nowTs,
            glFiscalTypeId: "ACTUAL",
            fixedAssetId: fixedAssetId,
            partyId: orgPartyId
        ])
        acctgTrans.create()

        // Create Debit Entry
        GenericValue debitEntry = delegator.makeValue("AcctgTransEntry", [
            acctgTransId: acctgTransId,
            acctgTransEntrySeqId: "00001",
            acctgTransEntryTypeId: "_NA_",
            description: description,
            glAccountId: debitGlAccountId,
            organizationPartyId: orgPartyId,
            amount: depAmount,
            origAmount: depAmount,
            currencyUomId: fa.purchaseCostUomId ?: "USD",
            origCurrencyUomId: fa.purchaseCostUomId ?: "USD",
            debitCreditFlag: "D",
            reconcileStatusId: "AES_NOT_RECONCILED"
        ])
        debitEntry.create()

        // Create Credit Entry
        GenericValue creditEntry = delegator.makeValue("AcctgTransEntry", [
            acctgTransId: acctgTransId,
            acctgTransEntrySeqId: "00002",
            acctgTransEntryTypeId: "_NA_",
            description: description,
            glAccountId: creditGlAccountId,
            organizationPartyId: orgPartyId,
            amount: depAmount,
            origAmount: depAmount,
            currencyUomId: fa.purchaseCostUomId ?: "USD",
            origCurrencyUomId: fa.purchaseCostUomId ?: "USD",
            debitCreditFlag: "C",
            reconcileStatusId: "AES_NOT_RECONCILED"
        ])
        creditEntry.create()

        // Update FixedAsset depreciation
        BigDecimal newAccumulated = currentDep.add(depAmount)
        fa.depreciation = newAccumulated
        fa.store()

        request.setAttribute("acctgTransId", acctgTransId)
        request.setAttribute("depreciationAmount", depAmount.doubleValue())
        request.setAttribute("totalDepreciation", newAccumulated.doubleValue())
        request.setAttribute("netBookValue", pCost.subtract(newAccumulated).doubleValue())
        request.setAttribute("_EVENT_MESSAGE_", "Amortisman başarıyla hesaplandı ve GL yevmiye fişi (" + acctgTransId + ") oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in postFixedAssetDepreciation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Amortisman muhasebeleştirilemedi: " + e.getMessage())
        return "error"
    }
}

/**
 * 3. runBatchDepreciation
 * Runs depreciation for all eligible active fixed assets in the company.
 */
String runBatchDepreciation() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String fixedAssetTypeId = parameters.fixedAssetTypeId?.trim()

        List conditions = [
            EntityCondition.makeCondition("actualEndOfLife", EntityOperator.EQUALS, null),
            EntityCondition.makeCondition("purchaseCost", EntityOperator.GREATER_THAN, BigDecimal.ZERO)
        ]
        if (fixedAssetTypeId) {
            conditions.add(EntityCondition.makeCondition("fixedAssetTypeId", EntityOperator.EQUALS, fixedAssetTypeId))
        }

        List<GenericValue> assets = EntityQuery.use(delegator)
            .from("FixedAsset")
            .where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
            .queryList()

        int processedCount = 0
        BigDecimal totalBatchDep = BigDecimal.ZERO
        List createdTransactions = []

        Timestamp nowTs = UtilDateTime.nowTimestamp()

        for (GenericValue fa : assets) {
            BigDecimal pCost = fa.purchaseCost ?: BigDecimal.ZERO
            BigDecimal sVal = fa.salvageValue ?: BigDecimal.ZERO
            BigDecimal curDep = fa.depreciation ?: BigDecimal.ZERO
            BigDecimal maxDep = pCost.subtract(sVal)

            BigDecimal remaining = maxDep.subtract(curDep)
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) continue

            int usefulYears = 5
            if (fa.dateAcquired && fa.expectedEndOfLife) {
                Calendar c1 = Calendar.getInstance()
                c1.setTime(fa.dateAcquired)
                Calendar c2 = Calendar.getInstance()
                c2.setTime(fa.expectedEndOfLife)
                int diff = c2.get(Calendar.YEAR) - c1.get(Calendar.YEAR)
                if (diff > 0) usefulYears = diff
            }

            BigDecimal annualDep = maxDep.divide(new BigDecimal(usefulYears), 2, RoundingMode.HALF_UP)
            if (annualDep.compareTo(remaining) > 0) annualDep = remaining
            if (annualDep.compareTo(BigDecimal.ZERO) <= 0) continue

            // Create AcctgTrans
            String acctgTransId = delegator.getNextSeqId("AcctgTrans")
            String desc = "Toplu Dönem Amortismanı - " + (fa.fixedAssetName ?: fa.fixedAssetId)
            GenericValue acctgTrans = delegator.makeValue("AcctgTrans", [
                acctgTransId: acctgTransId,
                acctgTransTypeId: "DEPRECIATION",
                description: desc,
                transactionDate: nowTs,
                isPosted: "Y",
                postedDate: nowTs,
                glFiscalTypeId: "ACTUAL",
                fixedAssetId: fa.fixedAssetId,
                partyId: orgPartyId
            ])
            acctgTrans.create()

            // Debit entry
            delegator.makeValue("AcctgTransEntry", [
                acctgTransId: acctgTransId,
                acctgTransEntrySeqId: "00001",
                acctgTransEntryTypeId: "_NA_",
                description: desc,
                glAccountId: "600000",
                organizationPartyId: orgPartyId,
                amount: annualDep,
                origAmount: annualDep,
                currencyUomId: fa.purchaseCostUomId ?: "USD",
                origCurrencyUomId: fa.purchaseCostUomId ?: "USD",
                debitCreditFlag: "D",
                reconcileStatusId: "AES_NOT_RECONCILED"
            ]).create()

            // Credit entry
            delegator.makeValue("AcctgTransEntry", [
                acctgTransId: acctgTransId,
                acctgTransEntrySeqId: "00002",
                acctgTransEntryTypeId: "_NA_",
                description: desc,
                glAccountId: "175000",
                organizationPartyId: orgPartyId,
                amount: annualDep,
                origAmount: annualDep,
                currencyUomId: fa.purchaseCostUomId ?: "USD",
                origCurrencyUomId: fa.purchaseCostUomId ?: "USD",
                debitCreditFlag: "C",
                reconcileStatusId: "AES_NOT_RECONCILED"
            ]).create()

            // Update asset
            fa.depreciation = curDep.add(annualDep)
            fa.store()

            processedCount++
            totalBatchDep = totalBatchDep.add(annualDep)
            createdTransactions.add([
                fixedAssetId: fa.fixedAssetId,
                fixedAssetName: fa.fixedAssetName ?: fa.fixedAssetId,
                acctgTransId: acctgTransId,
                depreciationAmount: annualDep.doubleValue()
            ])
        }

        request.setAttribute("processedCount", processedCount)
        request.setAttribute("totalBatchDepreciation", totalBatchDep.doubleValue())
        request.setAttribute("createdTransactions", createdTransactions)
        request.setAttribute("_EVENT_MESSAGE_", processedCount + " adet duran varlık için toplam " + totalBatchDep + " tutarında amortisman deftere kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in runBatchDepreciation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Toplu amortisman koşusu başarısız: " + e.getMessage())
        return "error"
    }
}

/**
 * 4. getFixedAssetMaintenances
 * Returns maintenance log and service orders for a fixed asset.
 */
String getFixedAssetMaintenances() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        List<GenericValue> maints = EntityQuery.use(delegator)
            .from("FixedAssetMaint")
            .where("fixedAssetId", fixedAssetId)
            .orderBy("-maintHistSeqId")
            .queryList()

        List list = []
        for (GenericValue m : maints) {
            list.add([
                fixedAssetId: m.fixedAssetId,
                maintHistSeqId: m.maintHistSeqId,
                statusId: m.statusId ?: "FAM_CREATED",
                productMaintTypeId: m.productMaintTypeId ?: "SERVICE",
                maintenanceDate: m.maintenanceDate ? m.maintenanceDate.toString().substring(0, 10) : "",
                intervalQuantity: m.intervalQuantity ? m.intervalQuantity.doubleValue() : null,
                intervalUomId: m.intervalUomId ?: "",
                intervalMeterTypeId: m.intervalMeterTypeId ?: "",
                purchaseOrderId: m.purchaseOrderId ?: "",
                comments: m.comments ?: ""
            ])
        }

        request.setAttribute("maintenances", list)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssetMaintenances: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. createFixedAssetMaint
 * Creates a maintenance order/task for a fixed asset.
 */
String createFixedAssetMaint() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        String nextSeqId = delegator.getNextSeqId("FixedAssetMaint")
        String statusId = parameters.statusId?.trim() ?: "FAM_CREATED"
        String maintType = parameters.productMaintTypeId?.trim() ?: "ROUTINE_MAINT"

        GenericValue fam = delegator.makeValue("FixedAssetMaint", [
            fixedAssetId: fixedAssetId,
            maintHistSeqId: nextSeqId,
            statusId: statusId,
            productMaintTypeId: maintType,
            maintenanceDate: parseTimestamp(parameters.maintenanceDate) ?: UtilDateTime.nowTimestamp(),
            comments: parameters.comments?.trim() ?: "",
            purchaseOrderId: parameters.purchaseOrderId?.trim() ?: null
        ])

        if (parameters.intervalQuantity) {
            try {
                fam.intervalQuantity = new BigDecimal(parameters.intervalQuantity.toString())
            } catch (Exception ignored) {}
        }
        if (parameters.intervalUomId) fam.intervalUomId = parameters.intervalUomId.toString()
        if (parameters.intervalMeterTypeId) fam.intervalMeterTypeId = parameters.intervalMeterTypeId.toString()

        fam.create()

        request.setAttribute("maintHistSeqId", nextSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Bakım kaydı başarıyla oluşturuldu (#" + nextSeqId + ").")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFixedAssetMaint: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. updateFixedAssetMaintStatus
 * Updates status of a maintenance task.
 */
String updateFixedAssetMaintStatus() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        String maintHistSeqId = parameters.maintHistSeqId?.trim()
        String statusId = parameters.statusId?.trim()

        if (!fixedAssetId || !maintHistSeqId || !statusId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId, maintHistSeqId and statusId are required.")
            return "error"
        }

        GenericValue fam = EntityQuery.use(delegator)
            .from("FixedAssetMaint")
            .where("fixedAssetId", fixedAssetId, "maintHistSeqId", maintHistSeqId)
            .queryOne()

        if (!fam) {
            request.setAttribute("_ERROR_MESSAGE_", "Bakım kaydı bulunamadı.")
            return "error"
        }

        fam.statusId = statusId
        if (parameters.comments) fam.comments = parameters.comments.trim()
        fam.store()

        request.setAttribute("_EVENT_MESSAGE_", "Bakım durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateFixedAssetMaintStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. getFixedAssetMeters
 * Returns odometer/operating hour meter readings for a fixed asset.
 */
String getFixedAssetMeters() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        List<GenericValue> meters = EntityQuery.use(delegator)
            .from("FixedAssetMeter")
            .where("fixedAssetId", fixedAssetId)
            .orderBy("-readingDate")
            .queryList()

        List list = []
        for (GenericValue m : meters) {
            list.add([
                fixedAssetId: m.fixedAssetId,
                productMeterTypeId: m.productMeterTypeId,
                readingDate: m.readingDate ? m.readingDate.toString() : "",
                meterValue: m.meterValue ? m.meterValue.doubleValue() : 0.0
            ])
        }

        request.setAttribute("meters", list)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssetMeters: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. createFixedAssetMeter
 * Logs a new meter reading (km, hours).
 */
String createFixedAssetMeter() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        String meterType = parameters.productMeterTypeId?.trim() ?: "ODOMETER"
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        BigDecimal meterVal = BigDecimal.ZERO
        if (parameters.meterValue) {
            meterVal = new BigDecimal(parameters.meterValue.toString().trim())
        }

        Timestamp readingDate = parseTimestamp(parameters.readingDate) ?: UtilDateTime.nowTimestamp()

        GenericValue meter = delegator.makeValue("FixedAssetMeter", [
            fixedAssetId: fixedAssetId,
            productMeterTypeId: meterType,
            readingDate: readingDate,
            meterValue: meterVal
        ])
        meter.create()

        request.setAttribute("_EVENT_MESSAGE_", "Sayaç okuması kaydedildi (" + meterVal + ").")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFixedAssetMeter: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 9. getFixedAssetAssignments
 * Lists employees/parties to whom the fixed asset is currently or historically assigned (Zimmet).
 */
String getFixedAssetAssignments() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        List<GenericValue> assigns = EntityQuery.use(delegator)
            .from("PartyFixedAssetAssignment")
            .where("fixedAssetId", fixedAssetId)
            .orderBy("-fromDate")
            .queryList()

        List list = []
        Timestamp nowTs = UtilDateTime.nowTimestamp()

        for (GenericValue a : assigns) {
            boolean isActive = a.thruDate == null || a.thruDate.after(nowTs)
            list.add([
                fixedAssetId: a.fixedAssetId,
                partyId: a.partyId,
                partyName: getPartyName(delegator, a.partyId),
                roleTypeId: a.roleTypeId ?: "OPERATOR",
                fromDate: a.fromDate ? a.fromDate.toString().substring(0, 10) : "",
                thruDate: a.thruDate ? a.thruDate.toString().substring(0, 10) : "",
                statusId: a.statusId ?: (isActive ? "PRTYASGN_ASSIGNED" : "PRTYASGN_RELEASED"),
                allocatedCost: a.allocatedCost ? a.allocatedCost.doubleValue() : null,
                comments: a.comments ?: "",
                isActive: isActive
            ])
        }

        request.setAttribute("assignments", list)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssetAssignments: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 10. createFixedAssetAssignment
 * Assigns asset to a party (Zimmetle).
 */
String createFixedAssetAssignment() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim() ?: "OPERATOR"

        if (!fixedAssetId || !partyId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId and partyId are required.")
            return "error"
        }

        Timestamp fromDate = parseTimestamp(parameters.fromDate) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        GenericValue assign = delegator.makeValue("PartyFixedAssetAssignment", [
            fixedAssetId: fixedAssetId,
            partyId: partyId,
            roleTypeId: roleTypeId,
            fromDate: fromDate,
            thruDate: thruDate,
            statusId: "PRTYASGN_ASSIGNED",
            comments: parameters.comments?.trim() ?: ""
        ])
        if (parameters.allocatedCost) {
            try {
                assign.allocatedCost = new BigDecimal(parameters.allocatedCost.toString())
            } catch (Exception ignored) {}
        }
        assign.create()

        request.setAttribute("_EVENT_MESSAGE_", "Duran varlık (" + fixedAssetId + ") " + partyId + " carisine zimmetlendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFixedAssetAssignment: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 11. releaseFixedAssetAssignment
 * Releases/returns asset from party assignment (Zimmetten Düşür).
 */
String releaseFixedAssetAssignment() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim()
        Timestamp fromDate = parseTimestamp(parameters.fromDate)

        if (!fixedAssetId || !partyId || !roleTypeId || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId, partyId, roleTypeId and fromDate are required.")
            return "error"
        }

        GenericValue assign = EntityQuery.use(delegator)
            .from("PartyFixedAssetAssignment")
            .where("fixedAssetId", fixedAssetId, "partyId", partyId, "roleTypeId", roleTypeId, "fromDate", fromDate)
            .queryOne()

        if (!assign) {
            request.setAttribute("_ERROR_MESSAGE_", "Zimmet kaydı bulunamadı.")
            return "error"
        }

        assign.thruDate = UtilDateTime.nowTimestamp()
        assign.statusId = "PRTYASGN_RELEASED"
        assign.store()

        request.setAttribute("_EVENT_MESSAGE_", "Duran varlık zimmetten başarıyla düşürüldü.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in releaseFixedAssetAssignment: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 12. getFixedAssetRegistrations
 * Lists licenses, plates, and identity registrations.
 */
String getFixedAssetRegistrations() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        List<GenericValue> regs = EntityQuery.use(delegator)
            .from("FixedAssetRegistration")
            .where("fixedAssetId", fixedAssetId)
            .orderBy("-fromDate")
            .queryList()

        List list = []
        for (GenericValue r : regs) {
            list.add([
                fixedAssetId: r.fixedAssetId,
                fromDate: r.fromDate ? r.fromDate.toString().substring(0, 10) : "",
                thruDate: r.thruDate ? r.thruDate.toString().substring(0, 10) : "",
                registrationDate: r.registrationDate ? r.registrationDate.toString().substring(0, 10) : "",
                govAgencyPartyId: r.govAgencyPartyId ?: "",
                registrationNumber: r.registrationNumber ?: "",
                licenseNumber: r.licenseNumber ?: ""
            ])
        }

        List<GenericValue> idents = EntityQuery.use(delegator)
            .from("FixedAssetIdent")
            .where("fixedAssetId", fixedAssetId)
            .queryList()

        List identList = []
        for (GenericValue id : idents) {
            identList.add([
                fixedAssetId: id.fixedAssetId,
                fixedAssetIdentTypeId: id.fixedAssetIdentTypeId,
                idValue: id.idValue
            ])
        }

        request.setAttribute("registrations", list)
        request.setAttribute("identifications", identList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssetRegistrations: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 13. createFixedAssetRegistration
 * Adds registration / plate / serial record.
 */
String createFixedAssetRegistration() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (!fixedAssetId) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId is required.")
            return "error"
        }

        Timestamp fromDate = parseTimestamp(parameters.fromDate) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate)
        Timestamp regDate = parseTimestamp(parameters.registrationDate) ?: fromDate

        GenericValue reg = delegator.makeValue("FixedAssetRegistration", [
            fixedAssetId: fixedAssetId,
            fromDate: fromDate,
            thruDate: thruDate,
            registrationDate: regDate,
            govAgencyPartyId: parameters.govAgencyPartyId?.trim() ?: null,
            registrationNumber: parameters.registrationNumber?.trim() ?: "",
            licenseNumber: parameters.licenseNumber?.trim() ?: ""
        ])
        reg.create()

        if (parameters.fixedAssetIdentTypeId && parameters.idValue) {
            GenericValue ident = delegator.makeValue("FixedAssetIdent", [
                fixedAssetId: fixedAssetId,
                fixedAssetIdentTypeId: parameters.fixedAssetIdentTypeId.trim(),
                idValue: parameters.idValue.trim()
            ])
            ident.createOrStore()
        }

        request.setAttribute("_EVENT_MESSAGE_", "Tescil ve kimlik bilgileri başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFixedAssetRegistration: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
