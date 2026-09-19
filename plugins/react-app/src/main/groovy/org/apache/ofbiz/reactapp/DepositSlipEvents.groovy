/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.accounting.util.UtilAccounting
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "DepositSlipEvents.groovy"

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
 * 1. getDepositSlips
 * Lists all PaymentGroups with paymentGroupTypeId = 'BATCH_PAYMENT' (Deposit Slips)
 */
String getDepositSlips() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String finAccountId = parameters.finAccountId?.trim()
        String search = parameters.search?.trim()

        List<GenericValue> rawGroups = EntityQuery.use(delegator)
            .from("PaymentGroup")
            .where("paymentGroupTypeId", "BATCH_PAYMENT")
            .queryList()

        List depositSlips = []

        rawGroups.each { pg ->
            String pgId = pg.paymentGroupId
            String pgName = pg.paymentGroupName ?: pgId

            // Search filter
            if (search) {
                String sLower = search.toLowerCase()
                boolean match = pgId.toLowerCase().contains(sLower) || pgName.toLowerCase().contains(sLower)
                if (!match) return
            }

            // Find members from PmtGrpMembrPaymentAndFinAcctTrans or PaymentGroupMember
            List<GenericValue> transMembers = EntityQuery.use(delegator)
                .from("PmtGrpMembrPaymentAndFinAcctTrans")
                .where("paymentGroupId", pgId)
                .queryList()

            String slipFinAccountId = null
            String slipFinAccountName = null
            String slipFinAccountTransId = null
            String slipTransStatusId = null
            BigDecimal totalAmount = BigDecimal.ZERO
            int paymentCount = 0
            Timestamp createdDate = pg.getTimestamp("createdStamp")

            if (transMembers && !transMembers.isEmpty()) {
                slipFinAccountId = transMembers[0].finAccountId
                slipFinAccountTransId = transMembers[0].finAccountTransId
                slipTransStatusId = transMembers[0].finAccountTransStatusId

                transMembers.each { tm ->
                    BigDecimal amt = tm.getBigDecimal("amount") ?: BigDecimal.ZERO
                    totalAmount = totalAmount.add(amt)
                    paymentCount++
                    if (tm.getTimestamp("fromDate") && (!createdDate || tm.getTimestamp("fromDate").before(createdDate))) {
                        createdDate = tm.getTimestamp("fromDate")
                    }
                }
            } else {
                // Check direct PaymentGroupMembers
                List<GenericValue> members = EntityQuery.use(delegator)
                    .from("PaymentGroupMember")
                    .where("paymentGroupId", pgId)
                    .filterByDate()
                    .queryList()

                paymentCount = members.size()
                members.each { m ->
                    GenericValue p = EntityQuery.use(delegator).from("Payment").where("paymentId", m.paymentId).queryOne()
                    if (p) {
                        BigDecimal amt = p.getBigDecimal("amount") ?: BigDecimal.ZERO
                        totalAmount = totalAmount.add(amt)
                        if (!slipFinAccountTransId && p.finAccountTransId) {
                            slipFinAccountTransId = p.finAccountTransId
                        }
                    }
                }
                if (slipFinAccountTransId) {
                    GenericValue fat = EntityQuery.use(delegator).from("FinAccountTrans").where("finAccountTransId", slipFinAccountTransId).queryOne()
                    if (fat) {
                        slipFinAccountId = fat.finAccountId
                        slipTransStatusId = fat.statusId
                    }
                }
            }

            // If filtered by specific finAccountId
            if (finAccountId && slipFinAccountId != finAccountId) {
                return
            }

            if (slipFinAccountId) {
                GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", slipFinAccountId).queryOne()
                if (fa) {
                    slipFinAccountName = fa.finAccountName ?: fa.finAccountId
                }
            }

            depositSlips.add([
                paymentGroupId: pgId,
                paymentGroupName: pgName,
                paymentGroupTypeId: pg.paymentGroupTypeId,
                finAccountId: slipFinAccountId,
                finAccountName: slipFinAccountName ?: slipFinAccountId ?: "—",
                finAccountTransId: slipFinAccountTransId,
                transStatusId: slipTransStatusId ?: "CREATED",
                totalAmount: totalAmount.doubleValue(),
                paymentCount: paymentCount,
                createdDate: createdDate ? createdDate.toString().substring(0, 19) : null
            ])
        }

        // Sort descending by createdDate
        depositSlips.sort { a, b -> (b.createdDate ?: "") <=> (a.createdDate ?: "") }

        request.setAttribute("depositSlips", depositSlips)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getDepositSlips: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getDepositSlipDetail
 * Gets detailed breakdown of a single deposit slip
 */
String getDepositSlipDetail() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String paymentGroupId = parameters.paymentGroupId?.trim()
        if (!paymentGroupId) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentGroupId is required")
            return "error"
        }

        GenericValue pg = EntityQuery.use(delegator).from("PaymentGroup").where("paymentGroupId", paymentGroupId).queryOne()
        if (!pg) {
            request.setAttribute("_ERROR_MESSAGE_", "Deposit slip not found: " + paymentGroupId)
            return "error"
        }

        // Query member payments
        List<GenericValue> pgmList = EntityQuery.use(delegator)
            .from("PaymentGroupMember")
            .where("paymentGroupId", paymentGroupId)
            .filterByDate()
            .queryList()

        List memberPayments = []
        BigDecimal totalAmount = BigDecimal.ZERO
        String finAccountId = null
        String finAccountTransId = null
        String transStatusId = null

        pgmList.each { m ->
            GenericValue p = EntityQuery.use(delegator).from("Payment").where("paymentId", m.paymentId).queryOne()
            if (p) {
                BigDecimal amt = p.getBigDecimal("amount") ?: BigDecimal.ZERO
                totalAmount = totalAmount.add(amt)
                if (!finAccountTransId && p.finAccountTransId) {
                    finAccountTransId = p.finAccountTransId
                }

                // Party names
                String partyFromName = p.partyIdFrom
                if (p.partyIdFrom) {
                    GenericValue pnv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", p.partyIdFrom).queryOne()
                    if (pnv) {
                        partyFromName = pnv.groupName ?: ((pnv.firstName ?: "") + " " + (pnv.lastName ?: "")).trim()
                    }
                }

                // Method type desc
                String methodDesc = p.paymentMethodTypeId
                if (p.paymentMethodTypeId) {
                    GenericValue pmt = EntityQuery.use(delegator).from("PaymentMethodType").where("paymentMethodTypeId", p.paymentMethodTypeId).queryOne()
                    if (pmt) methodDesc = pmt.description ?: p.paymentMethodTypeId
                }

                // Status desc
                String statusDesc = p.statusId
                if (p.statusId) {
                    GenericValue st = EntityQuery.use(delegator).from("StatusItem").where("statusId", p.statusId).queryOne()
                    if (st) statusDesc = st.description ?: p.statusId
                }

                memberPayments.add([
                    paymentId: p.paymentId,
                    partyIdFrom: p.partyIdFrom,
                    partyFromName: partyFromName ?: p.partyIdFrom,
                    paymentTypeId: p.paymentTypeId,
                    paymentMethodTypeId: p.paymentMethodTypeId,
                    paymentMethodTypeDesc: methodDesc,
                    amount: amt.doubleValue(),
                    currencyUomId: p.currencyUomId ?: "USD",
                    effectiveDate: p.effectiveDate ? p.effectiveDate.toString().substring(0, 10) : null,
                    paymentRefNum: p.paymentRefNum ?: "",
                    statusId: p.statusId,
                    statusDesc: statusDesc
                ])
            }
        }

        String finAccountName = null
        String finAccountCode = null
        if (finAccountTransId) {
            GenericValue fat = EntityQuery.use(delegator).from("FinAccountTrans").where("finAccountTransId", finAccountTransId).queryOne()
            if (fat) {
                finAccountId = fat.finAccountId
                transStatusId = fat.statusId
            }
        }
        if (finAccountId) {
            GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", finAccountId).queryOne()
            if (fa) {
                finAccountName = fa.finAccountName
                finAccountCode = fa.finAccountCode
            }
        }

        Map depositSlip = [
            paymentGroupId: pg.paymentGroupId,
            paymentGroupName: pg.paymentGroupName ?: pg.paymentGroupId,
            paymentGroupTypeId: pg.paymentGroupTypeId,
            finAccountId: finAccountId,
            finAccountName: finAccountName ?: finAccountId ?: "—",
            finAccountCode: finAccountCode ?: "",
            finAccountTransId: finAccountTransId,
            transStatusId: transStatusId ?: "FINACT_TRNS_CREATED",
            totalAmount: totalAmount.doubleValue(),
            paymentCount: memberPayments.size(),
            memberPayments: memberPayments
        ]

        request.setAttribute("depositSlip", depositSlip)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getDepositSlipDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. getUndepositedPayments
 * Returns payments that are received (receipts) and not yet linked to any FinAccountTrans or active Deposit Slip
 */
String getUndepositedPayments() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String paymentMethodTypeId = parameters.paymentMethodTypeId?.trim()
        String partyIdFrom = parameters.partyIdFrom?.trim()
        String search = parameters.search?.trim()
        Timestamp fromDate = parseDateToTimestamp(parameters.fromDate)
        Timestamp thruDate = parseDateToTimestamp(parameters.thruDate, true)

        List<EntityCondition> conds = []

        // Status is PMNT_RECEIVED or PMNT_SENT (positive receipts)
        conds.add(EntityCondition.makeCondition([
            EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, "PMNT_RECEIVED"),
            EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, "PMNT_SENT")
        ], EntityOperator.OR))

        // Not yet associated with a finAccountTransId
        conds.add(EntityCondition.makeCondition("finAccountTransId", EntityOperator.EQUALS, null))

        if (paymentMethodTypeId) {
            conds.add(EntityCondition.makeCondition("paymentMethodTypeId", EntityOperator.EQUALS, paymentMethodTypeId))
        }
        if (partyIdFrom) {
            conds.add(EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyIdFrom))
        }
        if (fromDate) {
            conds.add(EntityCondition.makeCondition("effectiveDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        if (thruDate) {
            conds.add(EntityCondition.makeCondition("effectiveDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }

        List<GenericValue> rawPayments = EntityQuery.use(delegator)
            .from("Payment")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("-effectiveDate")
            .queryList()

        List undeposited = []

        rawPayments.each { p ->
            // Must be receipt
            boolean isReceipt = UtilAccounting.isReceipt(p)
            if (!isReceipt) return

            // Check if already in any active PaymentGroupMember
            long activeMemberCount = EntityQuery.use(delegator)
                .from("PaymentGroupMember")
                .where("paymentId", p.paymentId)
                .filterByDate()
                .queryCount()

            if (activeMemberCount > 0) return

            // Party names
            String partyFromName = p.partyIdFrom
            if (p.partyIdFrom) {
                GenericValue pnv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", p.partyIdFrom).queryOne()
                if (pnv) {
                    partyFromName = pnv.groupName ?: ((pnv.firstName ?: "") + " " + (pnv.lastName ?: "")).trim()
                }
            }

            if (search) {
                String sLower = search.toLowerCase()
                boolean match = (p.paymentId && p.paymentId.toLowerCase().contains(sLower)) ||
                                (partyFromName && partyFromName.toLowerCase().contains(sLower)) ||
                                (p.paymentRefNum && p.paymentRefNum.toLowerCase().contains(sLower))
                if (!match) return
            }

            String methodDesc = p.paymentMethodTypeId
            if (p.paymentMethodTypeId) {
                GenericValue pmt = EntityQuery.use(delegator).from("PaymentMethodType").where("paymentMethodTypeId", p.paymentMethodTypeId).queryOne()
                if (pmt) methodDesc = pmt.description ?: p.paymentMethodTypeId
            }

            undeposited.add([
                paymentId: p.paymentId,
                partyIdFrom: p.partyIdFrom,
                partyFromName: partyFromName ?: p.partyIdFrom,
                paymentTypeId: p.paymentTypeId,
                paymentMethodTypeId: p.paymentMethodTypeId,
                paymentMethodTypeDesc: methodDesc,
                amount: (p.getBigDecimal("amount") ?: BigDecimal.ZERO).doubleValue(),
                currencyUomId: p.currencyUomId ?: "USD",
                effectiveDate: p.effectiveDate ? p.effectiveDate.toString().substring(0, 10) : null,
                paymentRefNum: p.paymentRefNum ?: "",
                statusId: p.statusId
            ])
        }

        request.setAttribute("payments", undeposited)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getUndepositedPayments: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. createDepositSlip
 * Batches selected paymentIds into a single deposit slip for a bank account
 */
String createDepositSlip() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    try {
        String finAccountId = parameters.finAccountId?.trim()
        String paymentGroupName = parameters.paymentGroupName?.trim()
        Object rawPaymentIds = parameters.paymentIds

        if (!finAccountId) {
            request.setAttribute("_ERROR_MESSAGE_", "finAccountId is required")
            return "error"
        }

        List<String> paymentIds = []
        if (rawPaymentIds instanceof List) {
            paymentIds = (List<String>) rawPaymentIds
        } else if (rawPaymentIds instanceof String) {
            paymentIds = rawPaymentIds.split(",").collect { it.trim() }.findAll { !it.isEmpty() }
        }

        if (paymentIds.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "At least one payment must be selected")
            return "error"
        }

        // Verify finAccount
        GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", finAccountId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Target financial account not found: " + finAccountId)
            return "error"
        }
        if (fa.statusId == "FNACT_MANFROZEN" || fa.statusId == "FNACT_CANCELLED") {
            request.setAttribute("_ERROR_MESSAGE_", "Financial account is frozen or cancelled")
            return "error"
        }

        if (!paymentGroupName) {
            paymentGroupName = "Mevduat Fişi - " + (fa.finAccountName ?: finAccountId) + " (" + UtilDateTime.nowDateString("yyyy-MM-dd") + ")"
        }

        Map serviceCtx = [
            paymentIds: paymentIds,
            finAccountId: finAccountId,
            groupInOneTransaction: "Y",
            paymentGroupTypeId: "BATCH_PAYMENT",
            paymentGroupName: paymentGroupName,
            userLogin: userLogin
        ]

        Map result = dispatcher.runSync("depositWithdrawPayments", serviceCtx)
        if (org.apache.ofbiz.service.ServiceUtil.isError(result)) {
            String errMsg = org.apache.ofbiz.service.ServiceUtil.getErrorMessage(result)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        String paymentGroupId = (String) result.paymentGroupId
        String finAccountTransId = (String) result.finAccountTransId

        request.setAttribute("paymentGroupId", paymentGroupId)
        request.setAttribute("finAccountTransId", finAccountTransId)
        request.setAttribute("_EVENT_MESSAGE_", "Mevduat fişi (" + paymentGroupId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createDepositSlip: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. cancelDepositSlip
 * Cancels a deposit slip and releases its payments
 */
String cancelDepositSlip() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    try {
        String paymentGroupId = parameters.paymentGroupId?.trim()
        if (!paymentGroupId) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentGroupId is required")
            return "error"
        }

        Map result = dispatcher.runSync("cancelPaymentBatch", [
            paymentGroupId: paymentGroupId,
            userLogin: userLogin
        ])

        if (org.apache.ofbiz.service.ServiceUtil.isError(result)) {
            String errMsg = org.apache.ofbiz.service.ServiceUtil.getErrorMessage(result)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        request.setAttribute("paymentGroupId", paymentGroupId)
        request.setAttribute("_EVENT_MESSAGE_", "Mevduat fişi başarıyla iptal edildi ve bağlı ödemeler serbest bırakıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in cancelDepositSlip: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. getDepositSlipMetadata
 * Dropdown data for financial accounts and payment method types
 */
String getDepositSlipMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // FinAccounts (Bank and Cash)
        List<GenericValue> accountsGv = EntityQuery.use(delegator)
            .from("FinAccount")
            .where("statusId", "FNACT_ACTIVE")
            .orderBy("finAccountName")
            .queryList()

        List finAccounts = []
        accountsGv.each { fa ->
            finAccounts.add([
                finAccountId: fa.finAccountId,
                finAccountName: fa.finAccountName ?: fa.finAccountId,
                finAccountCode: fa.finAccountCode ?: "",
                finAccountTypeId: fa.finAccountTypeId,
                currencyUomId: fa.currencyUomId ?: "USD",
                actualBalance: (fa.getBigDecimal("actualBalance") ?: BigDecimal.ZERO).doubleValue()
            ])
        }

        // PaymentMethodTypes
        List<GenericValue> pmtGv = EntityQuery.use(delegator)
            .from("PaymentMethodType")
            .orderBy("description")
            .queryList()

        List paymentMethodTypes = []
        pmtGv.each { t ->
            paymentMethodTypes.add([
                paymentMethodTypeId: t.paymentMethodTypeId,
                description: t.description ?: t.paymentMethodTypeId
            ])
        }

        request.setAttribute("finAccounts", finAccounts)
        request.setAttribute("paymentMethodTypes", paymentMethodTypes)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getDepositSlipMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
