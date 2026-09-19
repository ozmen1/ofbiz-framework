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
import org.apache.ofbiz.accounting.invoice.InvoiceWorker
import org.apache.ofbiz.service.ServiceUtil
import java.sql.Timestamp
import java.math.BigDecimal
import java.math.RoundingMode

final String MODULE = "CommissionEvents.groovy"

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
 * 1. getCommissionRuns
 * Returns list of generated commission invoices (COMMISSION_INVOICE) with KPI stats
 */
String getCommissionRuns() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String salesRepId = parameters.salesRepPartyId?.trim()

        List<EntityCondition> conds = [
            EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "COMMISSION_INVOICE")
        ]

        if (salesRepId) {
            conds.add(EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, salesRepId))
        }

        List<GenericValue> rawInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("-invoiceDate", "-invoiceId")
            .queryList()

        List commissionRuns = []
        BigDecimal totalCommissionVolume = BigDecimal.ZERO
        Set<String> uniqueReps = []

        for (GenericValue inv : rawInvoices) {
            String invId = inv.invoiceId
            String repId = inv.partyIdFrom
            String repName = getPartyName(delegator, repId)
            BigDecimal totalAmt = InvoiceWorker.getInvoiceTotal(inv) ?: BigDecimal.ZERO
            totalCommissionVolume = totalCommissionVolume.add(totalAmt)
            if (repId) uniqueReps.add(repId)

            // Find associated source sales invoices
            List<GenericValue> assocs = EntityQuery.use(delegator)
                .from("InvoiceItemAssoc")
                .where("invoiceIdTo", invId)
                .queryList()

            Set<String> sourceInvoiceIds = []
            for (GenericValue a : assocs) {
                if (a.invoiceIdFrom) sourceInvoiceIds.add(a.invoiceIdFrom)
            }

            if (search) {
                String searchLower = search.toLowerCase()
                boolean match = invId.toLowerCase().contains(searchLower) ||
                                (repId && repId.toLowerCase().contains(searchLower)) ||
                                (repName && repName.toLowerCase().contains(searchLower)) ||
                                (inv.description && inv.description.toLowerCase().contains(searchLower))
                if (!match) continue
            }

            commissionRuns.add([
                invoiceId: invId,
                salesRepPartyId: repId,
                salesRepName: repName,
                payerPartyId: inv.partyId,
                invoiceDate: inv.invoiceDate ? inv.invoiceDate.toString().substring(0, 10) : null,
                dueDate: inv.dueDate ? inv.dueDate.toString().substring(0, 10) : null,
                statusId: inv.statusId,
                totalAmount: totalAmt.doubleValue(),
                currencyUomId: inv.currencyUomId ?: "USD",
                description: inv.description ?: ("Commission for " + sourceInvoiceIds.size() + " sales invoice(s)"),
                sourceInvoiceCount: sourceInvoiceIds.size(),
                sourceInvoiceIds: sourceInvoiceIds.toList()
            ])
        }

        // Calculate pending eligible sales invoices count
        List<GenericValue> salesInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "SALES_INVOICE"))
            .queryList()

        int pendingCount = 0
        for (GenericValue sInv : salesInvoices) {
            // check if already associated with a commission
            long assocCount = EntityQuery.use(delegator)
                .from("InvoiceItemAssoc")
                .where("invoiceIdFrom", sInv.invoiceId, "invoiceItemAssocTypeId", "COMMISSION_INVOICE")
                .queryCount()
            if (assocCount == 0 && "INVOICE_PAID".equals(sInv.statusId)) {
                pendingCount++
            }
        }

        request.setAttribute("commissionRuns", commissionRuns)
        request.setAttribute("stats", [
            totalCommissionVolume: totalCommissionVolume.doubleValue(),
            totalInvoicesGenerated: commissionRuns.size(),
            activeSalesReps: uniqueReps.size(),
            pendingSalesInvoices: pendingCount
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCommissionRuns: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load commission runs: " + e.getMessage())
        return "error"
    }
}

/**
 * 2. getEligibleSalesInvoices
 * Lists sales invoices eligible for commission processing
 */
String getEligibleSalesInvoices() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String salesRepPartyId = parameters.salesRepPartyId?.trim()
        String fromDateStr = parameters.fromDate?.trim()
        String thruDateStr = parameters.thruDate?.trim()
        Timestamp fromDate = parseDateToTimestamp(fromDateStr, false)
        Timestamp thruDate = parseDateToTimestamp(thruDateStr, true)

        List<EntityCondition> conds = [
            EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "SALES_INVOICE"),
            EntityCondition.makeCondition("statusId", EntityOperator.IN, ["INVOICE_READY", "INVOICE_PAID", "INVOICE_APPROVED"])
        ]

        if (fromDate) {
            conds.add(EntityCondition.makeCondition("invoiceDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        if (thruDate) {
            conds.add(EntityCondition.makeCondition("invoiceDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }

        List<GenericValue> rawInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("-invoiceDate")
            .queryList()

        List eligibleInvoices = []
        BigDecimal totalSalesVolume = BigDecimal.ZERO
        BigDecimal totalEstimatedCommission = BigDecimal.ZERO

        for (GenericValue sInv : rawInvoices) {
            String invId = sInv.invoiceId

            // Check if already commissioned
            long assocCount = EntityQuery.use(delegator)
                .from("InvoiceItemAssoc")
                .where("invoiceIdFrom", invId, "invoiceItemAssocTypeId", "COMMISSION_INVOICE")
                .queryCount()

            if (assocCount > 0) continue

            // Determine sales rep
            String assignedRepId = null
            GenericValue role = EntityQuery.use(delegator)
                .from("InvoiceRole")
                .where("invoiceId", invId, "roleTypeId", "SALES_REP")
                .queryFirst()

            if (role) {
                assignedRepId = role.partyId
            } else if (salesRepPartyId) {
                assignedRepId = salesRepPartyId
            } else {
                // Default to DemoCustAgent or admin
                assignedRepId = "DemoCustAgent"
            }

            if (salesRepPartyId && assignedRepId != salesRepPartyId) {
                continue
            }

            String repName = getPartyName(delegator, assignedRepId)
            String custName = getPartyName(delegator, sInv.partyId)

            BigDecimal invTotal = InvoiceWorker.getInvoiceTotal(sInv) ?: BigDecimal.ZERO
            if (invTotal.compareTo(BigDecimal.ZERO) <= 0) continue

            // Determine commission rate (check Agreement if exists)
            BigDecimal commissionRate = new BigDecimal("5.0") // default 5%
            GenericValue agr = EntityQuery.use(delegator)
                .from("Agreement")
                .where("agreementTypeId", "COMMISSION_AGREEMENT", "partyIdTo", assignedRepId)
                .queryFirst()

            if (agr) {
                GenericValue term = EntityQuery.use(delegator)
                    .from("AgreementTerm")
                    .where("agreementId", agr.agreementId, "termTypeId", "FIN_COMM_VARIABLE")
                    .queryFirst()
                if (term && term.termValue) {
                    commissionRate = term.termValue
                }
            }

            BigDecimal estCommission = invTotal.multiply(commissionRate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)

            totalSalesVolume = totalSalesVolume.add(invTotal)
            totalEstimatedCommission = totalEstimatedCommission.add(estCommission)

            eligibleInvoices.add([
                invoiceId: invId,
                invoiceDate: sInv.invoiceDate ? sInv.invoiceDate.toString().substring(0, 10) : null,
                statusId: sInv.statusId,
                partyId: sInv.partyId,
                customerName: custName,
                totalAmount: invTotal.doubleValue(),
                salesRepPartyId: assignedRepId,
                salesRepName: repName,
                commissionRate: commissionRate.doubleValue(),
                estimatedCommission: estCommission.doubleValue(),
                currencyUomId: sInv.currencyUomId ?: "USD",
                description: sInv.description ?: ""
            ])
        }

        request.setAttribute("eligibleInvoices", eligibleInvoices)
        request.setAttribute("totalSalesVolume", totalSalesVolume.doubleValue())
        request.setAttribute("totalEstimatedCommission", totalEstimatedCommission.doubleValue())
        request.setAttribute("invoiceCount", eligibleInvoices.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getEligibleSalesInvoices: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load eligible sales invoices: " + e.getMessage())
        return "error"
    }
}

/**
 * 3. createCommissionRun
 * Generates commission invoices (COMMISSION_INVOICE) for selected sales invoices
 */
String createCommissionRun() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    try {
        Object rawInvoiceIds = parameters.invoiceIds
        String overrideRepId = parameters.salesRepPartyId?.trim()
        String customRateStr = parameters.commissionRate?.toString()?.trim()
        String runDescription = parameters.description?.trim()

        List<String> invoiceIdList = []
        if (rawInvoiceIds instanceof List) {
            invoiceIdList = (List<String>) rawInvoiceIds
        } else if (rawInvoiceIds instanceof String) {
            String str = (String) rawInvoiceIds
            if (str.startsWith("[") && str.endsWith("]")) {
                str = str.substring(1, str.length() - 1)
            }
            invoiceIdList = str.split(",").collect { it.replace("\"", "").replace("'", "").trim() }.findAll { !it.isEmpty() }
        }

        if (!invoiceIdList) {
            request.setAttribute("_ERROR_MESSAGE_", "At least one sales invoice must be selected for commission run")
            return "error"
        }

        // Group invoices by sales rep
        Map<String, List<GenericValue>> repInvoiceMap = [:]

        for (String sInvId : invoiceIdList) {
            GenericValue sInv = EntityQuery.use(delegator).from("Invoice").where("invoiceId", sInvId).queryOne()
            if (!sInv) continue

            String repId = overrideRepId
            if (!repId) {
                GenericValue role = EntityQuery.use(delegator)
                    .from("InvoiceRole")
                    .where("invoiceId", sInvId, "roleTypeId", "SALES_REP")
                    .queryFirst()
                repId = role ? role.partyId : "DemoCustAgent"
            }

            if (!repInvoiceMap.containsKey(repId)) {
                repInvoiceMap[repId] = []
            }
            repInvoiceMap[repId].add(sInv)
        }

        List createdInvoices = []
        Timestamp now = UtilDateTime.nowTimestamp()

        for (Map.Entry<String, List<GenericValue>> entry : repInvoiceMap.entrySet()) {
            String repId = entry.key
            List<GenericValue> invList = entry.value

            // Determine commission rate for this rep
            BigDecimal rate = new BigDecimal("5.0")
            if (customRateStr) {
                try {
                    rate = new BigDecimal(customRateStr)
                } catch (Exception ignored) {}
            } else {
                GenericValue agr = EntityQuery.use(delegator)
                    .from("Agreement")
                    .where("agreementTypeId", "COMMISSION_AGREEMENT", "partyIdTo", repId)
                    .queryFirst()
                if (agr) {
                    GenericValue term = EntityQuery.use(delegator)
                        .from("AgreementTerm")
                        .where("agreementId", agr.agreementId, "termTypeId", "FIN_COMM_VARIABLE")
                        .queryFirst()
                    if (term && term.termValue) rate = term.termValue
                }
            }

            // Create COMMISSION_INVOICE
            Map createInvCtx = [
                invoiceTypeId: "COMMISSION_INVOICE",
                partyIdFrom: repId,
                partyId: "Company",
                invoiceDate: now,
                dueDate: UtilDateTime.getDayEnd(now, 30L),
                statusId: "INVOICE_READY",
                currencyUomId: "USD",
                description: runDescription ?: ("Sales commission payout (" + invList.size() + " sales invoices @ " + rate + "%)"),
                userLogin: userLogin
            ]

            Map invResult = dispatcher.runSync("createInvoice", createInvCtx)
            if (ServiceUtil.isError(invResult)) {
                String errMsg = ServiceUtil.getErrorMessage(invResult)
                request.setAttribute("_ERROR_MESSAGE_", errMsg)
                return "error"
            }

            String commissionInvoiceId = (String) invResult.invoiceId
            int itemSeq = 1
            BigDecimal totalRunAmt = BigDecimal.ZERO

            for (GenericValue sInv : invList) {
                BigDecimal sTotal = InvoiceWorker.getInvoiceTotal(sInv) ?: BigDecimal.ZERO
                BigDecimal commAmt = sTotal.multiply(rate).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP)
                totalRunAmt = totalRunAmt.add(commAmt)

                String itemSeqId = String.format("%05d", itemSeq++)
                dispatcher.runSync("createInvoiceItem", [
                    invoiceId: commissionInvoiceId,
                    invoiceItemSeqId: itemSeqId,
                    invoiceItemTypeId: "COMM_INV_ITEM",
                    quantity: BigDecimal.ONE,
                    amount: commAmt,
                    description: "Commission for Sales Invoice #" + sInv.invoiceId + " (" + sTotal + " USD @ " + rate + "%)",
                    userLogin: userLogin
                ])

                // Link in InvoiceItemAssoc
                GenericValue assoc = delegator.makeValue("InvoiceItemAssoc", [
                    invoiceIdFrom: sInv.invoiceId,
                    invoiceItemSeqIdFrom: "00001",
                    invoiceIdTo: commissionInvoiceId,
                    invoiceItemSeqIdTo: itemSeqId,
                    invoiceItemAssocTypeId: "COMMISSION_INVOICE",
                    fromDate: now,
                    partyIdFrom: sInv.partyIdFrom,
                    partyIdTo: repId,
                    amount: commAmt
                ])
                assoc.create()
            }

            createdInvoices.add([
                commissionInvoiceId: commissionInvoiceId,
                salesRepPartyId: repId,
                salesRepName: getPartyName(delegator, repId),
                salesInvoiceCount: invList.size(),
                commissionAmount: totalRunAmt.doubleValue()
            ])
        }

        request.setAttribute("createdInvoices", createdInvoices)
        request.setAttribute("_EVENT_MESSAGE_", "Commission Run created successfully: " + createdInvoices.size() + " commission invoice(s) generated.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createCommissionRun: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to execute commission run: " + e.getMessage())
        return "error"
    }
}

/**
 * 4. getInventoryValuationReport
 * Returns stock valuation report grouped by product and facility
 */
String getInventoryValuationReport() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String facilityId = parameters.facilityId?.trim()
        String search = parameters.search?.trim()

        List<EntityCondition> conds = [
            EntityCondition.makeCondition("quantityOnHandTotal", EntityOperator.GREATER_THAN, BigDecimal.ZERO)
        ]

        if (facilityId) {
            conds.add(EntityCondition.makeCondition("facilityId", EntityOperator.EQUALS, facilityId))
        }

        List<GenericValue> items = EntityQuery.use(delegator)
            .from("InventoryItem")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("productId", "facilityId")
            .queryList()

        List valuationList = []
        BigDecimal totalInventoryValue = BigDecimal.ZERO
        BigDecimal totalQtyOnHand = BigDecimal.ZERO
        Set<String> uniqueProducts = []

        for (GenericValue item : items) {
            String pId = item.productId
            if (!pId) continue

            BigDecimal qoh = item.quantityOnHandTotal ?: BigDecimal.ZERO
            BigDecimal unitCost = item.unitCost ?: BigDecimal.ZERO
            BigDecimal lineVal = qoh.multiply(unitCost).setScale(2, RoundingMode.HALF_UP)

            totalInventoryValue = totalInventoryValue.add(lineVal)
            totalQtyOnHand = totalQtyOnHand.add(qoh)
            uniqueProducts.add(pId)

            String pName = pId
            GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", pId).queryOne()
            if (prod) {
                pName = prod.productName ?: prod.internalName ?: pId
            }

            String fName = item.facilityId ?: "—"
            if (item.facilityId) {
                GenericValue fac = EntityQuery.use(delegator).from("Facility").where("facilityId", item.facilityId).queryOne()
                if (fac && fac.facilityName) fName = fac.facilityName
            }

            if (search) {
                String searchLower = search.toLowerCase()
                boolean match = pId.toLowerCase().contains(searchLower) ||
                                pName.toLowerCase().contains(searchLower) ||
                                (fName && fName.toLowerCase().contains(searchLower))
                if (!match) continue
            }

            valuationList.add([
                inventoryItemId: item.inventoryItemId,
                productId: pId,
                productName: pName,
                facilityId: item.facilityId ?: "—",
                facilityName: fName,
                quantityOnHand: qoh.doubleValue(),
                unitCost: unitCost.doubleValue(),
                totalValuation: lineVal.doubleValue(),
                currencyUomId: item.currencyUomId ?: "USD",
                datetimeReceived: item.datetimeReceived ? item.datetimeReceived.toString().substring(0, 10) : null
            ])
        }

        request.setAttribute("valuationList", valuationList)
        request.setAttribute("summary", [
            totalSkuCount: uniqueProducts.size(),
            totalQuantityOnHand: totalQtyOnHand.doubleValue(),
            totalInventoryValue: totalInventoryValue.doubleValue(),
            itemCount: valuationList.size()
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInventoryValuationReport: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load inventory valuation: " + e.getMessage())
        return "error"
    }
}

/**
 * 5. getPastDueInvoicesReport
 * Returns AP & AR past due and due soon aging buckets
 */
String getPastDueInvoicesReport() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String invoiceTypeId = parameters.invoiceTypeId?.trim() // 'PURCHASE_INVOICE' or 'SALES_INVOICE'
        Timestamp now = UtilDateTime.nowTimestamp()
        Timestamp sevenDaysLater = UtilDateTime.getDayEnd(now, 7L)

        List<EntityCondition> conds = [
            EntityCondition.makeCondition("statusId", EntityOperator.NOT_IN, ["INVOICE_PAID", "INVOICE_CANCELLED", "INVOICE_WRITEOFF"])
        ]

        if (invoiceTypeId) {
            conds.add(EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, invoiceTypeId))
        }

        List<GenericValue> invoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("dueDate", "invoiceDate")
            .queryList()

        List pastDueInvoices = []
        List dueSoonInvoices = []

        BigDecimal totalPastDue = BigDecimal.ZERO
        BigDecimal totalDueSoon = BigDecimal.ZERO

        Map<String, BigDecimal> buckets = [
            "1_30": BigDecimal.ZERO,
            "31_60": BigDecimal.ZERO,
            "61_90": BigDecimal.ZERO,
            "90_plus": BigDecimal.ZERO
        ]

        for (GenericValue inv : invoices) {
            Timestamp due = inv.dueDate
            if (!due) continue

            BigDecimal outstanding = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO
            if (outstanding.compareTo(BigDecimal.ZERO) <= 0) continue

            String partyFrom = inv.partyIdFrom
            String partyTo = inv.partyId
            String partnerName = inv.invoiceTypeId == "SALES_INVOICE" ? getPartyName(delegator, partyTo) : getPartyName(delegator, partyFrom)

            long diffDays = (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)

            Map invDto = [
                invoiceId: inv.invoiceId,
                invoiceTypeId: inv.invoiceTypeId,
                invoiceDate: inv.invoiceDate ? inv.invoiceDate.toString().substring(0, 10) : null,
                dueDate: due.toString().substring(0, 10),
                partnerName: partnerName,
                partnerPartyId: inv.invoiceTypeId == "SALES_INVOICE" ? partyTo : partyFrom,
                statusId: inv.statusId,
                totalAmount: (InvoiceWorker.getInvoiceTotal(inv) ?: BigDecimal.ZERO).doubleValue(),
                outstandingAmount: outstanding.doubleValue(),
                currencyUomId: inv.currencyUomId ?: "USD",
                daysOverdue: diffDays > 0 ? (int) diffDays : 0
            ]

            if (due.before(now)) {
                totalPastDue = totalPastDue.add(outstanding)
                pastDueInvoices.add(invDto)

                if (diffDays <= 30) buckets["1_30"] = buckets["1_30"].add(outstanding)
                else if (diffDays <= 60) buckets["31_60"] = buckets["31_60"].add(outstanding)
                else if (diffDays <= 90) buckets["61_90"] = buckets["61_90"].add(outstanding)
                else buckets["90_plus"] = buckets["90_plus"].add(outstanding)
            } else if (due.before(sevenDaysLater)) {
                totalDueSoon = totalDueSoon.add(outstanding)
                dueSoonInvoices.add(invDto)
            }
        }

        request.setAttribute("pastDueInvoices", pastDueInvoices)
        request.setAttribute("dueSoonInvoices", dueSoonInvoices)
        request.setAttribute("summary", [
            totalPastDueCount: pastDueInvoices.size(),
            totalPastDueAmount: totalPastDue.doubleValue(),
            totalDueSoonCount: dueSoonInvoices.size(),
            totalDueSoonAmount: totalDueSoon.doubleValue(),
            buckets: [
                "1_30": buckets["1_30"].doubleValue(),
                "31_60": buckets["31_60"].doubleValue(),
                "61_90": buckets["61_90"].doubleValue(),
                "90_plus": buckets["90_plus"].doubleValue()
            ]
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPastDueInvoicesReport: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load past due report: " + e.getMessage())
        return "error"
    }
}

/**
 * 6. getCommissionMetadata
 * Returns sales reps, agreements, and facilities
 */
String getCommissionMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Sales Reps
        List<GenericValue> repRoles = EntityQuery.use(delegator)
            .from("PartyRole")
            .where("roleTypeId", "SALES_REP")
            .queryList()

        List salesReps = []
        for (GenericValue r : repRoles) {
            salesReps.add([
                partyId: r.partyId,
                name: getPartyName(delegator, r.partyId)
            ])
        }

        // Facilities
        List<GenericValue> facs = EntityQuery.use(delegator)
            .from("Facility")
            .queryList()

        List facilities = []
        for (GenericValue f : facs) {
            facilities.add([
                facilityId: f.facilityId,
                facilityName: f.facilityName ?: f.facilityId,
                facilityTypeId: f.facilityTypeId
            ])
        }

        request.setAttribute("metadata", [
            salesReps: salesReps,
            facilities: facilities,
            defaultCommissionRate: 5.0
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCommissionMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load commission metadata: " + e.getMessage())
        return "error"
    }
}
