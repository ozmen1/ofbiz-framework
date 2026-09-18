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
import groovy.json.JsonSlurper
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "FinancialAccountEvents.groovy"

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
    if (!partyId) return ""
    try {
        GenericValue p = EntityQuery.use(delegator).from("PartyNameView").where("partyId", partyId).queryOne()
        if (p) {
            String name = p.groupName ?: ((p.firstName ?: "") + " " + (p.lastName ?: "")).trim()
            return name ?: partyId
        }
    } catch (Exception e) {
        Debug.logWarning("Error finding party name for " + partyId + ": " + e.getMessage(), MODULE)
    }
    return partyId
}

/**
 * 1. getFinAccounts
 * List financial accounts (bank, cash, credit card) with search and filters
 */
String getFinAccounts() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String search = parameters.search?.trim()
        String finAccountTypeId = parameters.finAccountTypeId?.trim()
        String statusId = parameters.statusId?.trim()

        int viewIndex = 0
        int viewSize = 50
        try { if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString().trim()) } catch (Exception ignored) {}
        try { if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString().trim()) } catch (Exception ignored) {}

        // Type Map
        Map<String, String> typeMap = [:]
        EntityQuery.use(delegator).from("FinAccountType").queryList().each {
            typeMap[it.finAccountTypeId] = it.description ?: it.finAccountTypeId
        }

        // Status Map
        Map<String, String> statusMap = [:]
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "FINACCT_STATUS").queryList().each {
            statusMap[it.statusId] = it.description ?: it.statusId
        }

        List<EntityCondition> conds = []
        if (orgPartyId) {
            conds.add(EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId))
        }
        if (finAccountTypeId) {
            conds.add(EntityCondition.makeCondition("finAccountTypeId", EntityOperator.EQUALS, finAccountTypeId))
        }
        if (statusId) {
            conds.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (search) {
            String term = "%" + search.toLowerCase() + "%"
            conds.add(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("finAccountId", EntityOperator.LIKE, term),
                    EntityCondition.makeCondition("finAccountName", EntityOperator.LIKE, term),
                    EntityCondition.makeCondition("finAccountCode", EntityOperator.LIKE, term)
            ], EntityOperator.OR))
        }

        EntityCondition whereCond = conds ? EntityCondition.makeCondition(conds, EntityOperator.AND) : null

        long totalCount = whereCond ? EntityQuery.use(delegator).from("FinAccount").where(whereCond).queryCount() : EntityQuery.use(delegator).from("FinAccount").queryCount()

        def query = EntityQuery.use(delegator).from("FinAccount").orderBy("finAccountName", "finAccountId")
        if (whereCond) query = query.where(whereCond)
        if (viewSize > 0) {
            query = query.offset(viewIndex * viewSize).maxRows(viewSize)
        }

        List<GenericValue> rawAccounts = query.queryList()
        List<Map> accountList = []
        BigDecimal totalActiveBalance = BigDecimal.ZERO

        for (GenericValue fa : rawAccounts) {
            BigDecimal actualBal = fa.actualBalance ?: BigDecimal.ZERO
            BigDecimal availBal = fa.availableBalance ?: BigDecimal.ZERO
            if ("FNACT_ACTIVE".equals(fa.statusId)) {
                totalActiveBalance = totalActiveBalance.add(actualBal)
            }

            // GL Account Name
            String glAccountName = ""
            if (fa.postToGlAccountId) {
                GenericValue gla = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", fa.postToGlAccountId).queryOne()
                if (gla) glAccountName = (gla.accountCode ?: gla.glAccountId) + " - " + (gla.accountName ?: "")
            }

            // Transaction count
            long transCount = EntityQuery.use(delegator).from("FinAccountTrans").where("finAccountId", fa.finAccountId).queryCount()

            accountList.add([
                    finAccountId: fa.finAccountId,
                    finAccountName: fa.finAccountName ?: fa.finAccountId,
                    finAccountCode: fa.finAccountCode ?: "",
                    finAccountTypeId: fa.finAccountTypeId ?: "",
                    finAccountTypeDesc: typeMap[fa.finAccountTypeId] ?: (fa.finAccountTypeId ?: ""),
                    statusId: fa.statusId ?: "FNACT_ACTIVE",
                    statusDesc: statusMap[fa.statusId] ?: (fa.statusId ?: "Aktif"),
                    currencyUomId: fa.currencyUomId ?: "USD",
                    organizationPartyId: fa.organizationPartyId ?: "",
                    ownerPartyId: fa.ownerPartyId ?: "",
                    postToGlAccountId: fa.postToGlAccountId ?: "",
                    postToGlAccountName: glAccountName,
                    actualBalance: actualBal,
                    availableBalance: availBal,
                    fromDate: fa.fromDate ? fa.fromDate.toString() : "",
                    thruDate: fa.thruDate ? fa.thruDate.toString() : "",
                    transactionCount: transCount
            ])
        }

        request.setAttribute("accounts", accountList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("totalActiveBalance", totalActiveBalance)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFinAccounts: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getFinAccountDetails
 * Detail of a single financial account with recent transactions
 */
String getFinAccountDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String finAccountId = parameters.finAccountId?.trim()
        if (UtilValidate.isEmpty(finAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "finAccountId zorunludur.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", finAccountId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Finansal hesap bulunamadı: " + finAccountId)
            return "error"
        }

        GenericValue typeGv = fa.finAccountTypeId ? EntityQuery.use(delegator).from("FinAccountType").where("finAccountTypeId", fa.finAccountTypeId).queryOne() : null
        GenericValue statusGv = fa.statusId ? EntityQuery.use(delegator).from("StatusItem").where("statusId", fa.statusId).queryOne() : null

        String glAccountName = ""
        if (fa.postToGlAccountId) {
            GenericValue gla = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", fa.postToGlAccountId).queryOne()
            if (gla) glAccountName = (gla.accountCode ?: gla.glAccountId) + " - " + (gla.accountName ?: "")
        }

        // Recent transactions
        List<GenericValue> rawTrans = EntityQuery.use(delegator).from("FinAccountTrans")
                .where("finAccountId", finAccountId)
                .orderBy("-transactionDate", "-finAccountTransId")
                .maxRows(50)
                .queryList()

        Map<String, String> transTypeMap = [:]
        EntityQuery.use(delegator).from("FinAccountTransType").queryList().each {
            transTypeMap[it.finAccountTransTypeId] = it.description ?: it.finAccountTransTypeId
        }

        Map<String, String> transStatusMap = [:]
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "FINACT_TRNS_STATUS").queryList().each {
            transStatusMap[it.statusId] = it.description ?: it.statusId
        }

        List<Map> transactionList = []
        for (GenericValue tr : rawTrans) {
            transactionList.add([
                    finAccountTransId: tr.finAccountTransId,
                    finAccountId: tr.finAccountId,
                    finAccountTransTypeId: tr.finAccountTransTypeId ?: "",
                    finAccountTransTypeDesc: transTypeMap[tr.finAccountTransTypeId] ?: (tr.finAccountTransTypeId ?: ""),
                    partyId: tr.partyId ?: "",
                    partyName: getPartyName(delegator, tr.partyId),
                    glReconciliationId: tr.glReconciliationId ?: "",
                    transactionDate: tr.transactionDate ? tr.transactionDate.toString() : "",
                    entryDate: tr.entryDate ? tr.entryDate.toString() : "",
                    amount: tr.amount ?: BigDecimal.ZERO,
                    paymentId: tr.paymentId ?: "",
                    orderId: tr.orderId ?: "",
                    comments: tr.comments ?: "",
                    statusId: tr.statusId ?: "FINACT_TRNS_APPROVED",
                    statusDesc: transStatusMap[tr.statusId] ?: (tr.statusId ?: "Onaylı")
            ])
        }

        // Reconciliations for this account's GL account
        List<Map> reconciliations = []
        if (fa.postToGlAccountId) {
            List<GenericValue> recList = EntityQuery.use(delegator).from("GlReconciliation")
                    .where("glAccountId", fa.postToGlAccountId)
                    .orderBy("-reconciledDate", "-glReconciliationId")
                    .maxRows(10)
                    .queryList()
            for (GenericValue r : recList) {
                reconciliations.add([
                        glReconciliationId: r.glReconciliationId,
                        glReconciliationName: r.glReconciliationName ?: r.glReconciliationId,
                        glAccountId: r.glAccountId,
                        statusId: r.statusId ?: "",
                        reconciledBalance: r.reconciledBalance ?: BigDecimal.ZERO,
                        openingBalance: r.openingBalance ?: BigDecimal.ZERO,
                        reconciledDate: r.reconciledDate ? r.reconciledDate.toString() : "",
                        description: r.description ?: ""
                ])
            }
        }

        Map accountData = [
                finAccountId: fa.finAccountId,
                finAccountName: fa.finAccountName ?: fa.finAccountId,
                finAccountCode: fa.finAccountCode ?: "",
                finAccountTypeId: fa.finAccountTypeId ?: "",
                finAccountTypeDesc: typeGv?.description ?: (fa.finAccountTypeId ?: ""),
                statusId: fa.statusId ?: "FNACT_ACTIVE",
                statusDesc: statusGv?.description ?: (fa.statusId ?: "Aktif"),
                currencyUomId: fa.currencyUomId ?: "USD",
                organizationPartyId: fa.organizationPartyId ?: "",
                ownerPartyId: fa.ownerPartyId ?: "",
                ownerPartyName: getPartyName(delegator, fa.ownerPartyId),
                postToGlAccountId: fa.postToGlAccountId ?: "",
                postToGlAccountName: glAccountName,
                actualBalance: fa.actualBalance ?: BigDecimal.ZERO,
                availableBalance: fa.availableBalance ?: BigDecimal.ZERO,
                fromDate: fa.fromDate ? fa.fromDate.toString() : "",
                thruDate: fa.thruDate ? fa.thruDate.toString() : "",
                isRefundable: fa.isRefundable ?: "Y"
        ]

        request.setAttribute("account", accountData)
        request.setAttribute("transactions", transactionList)
        request.setAttribute("reconciliations", reconciliations)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFinAccountDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. createFinAccount
 * Create a new financial account (kasa, banka, kredi kartı)
 */
String createFinAccount() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String finAccountName = parameters.finAccountName?.trim()
        String finAccountTypeId = parameters.finAccountTypeId?.trim()

        if (UtilValidate.isEmpty(finAccountName)) {
            request.setAttribute("_ERROR_MESSAGE_", "Hesap Adı zorunludur.")
            return "error"
        }
        if (UtilValidate.isEmpty(finAccountTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Hesap Türü zorunludur.")
            return "error"
        }

        String finAccountId = parameters.finAccountId?.trim()
        if (UtilValidate.isEmpty(finAccountId)) {
            finAccountId = delegator.getNextSeqId("FinAccount")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", finAccountId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu Finansal Hesap No (" + finAccountId + ") zaten sistemde kayıtlı.")
                return "error"
            }
        }

        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String currencyUomId = parameters.currencyUomId?.trim() ?: "USD"
        String postToGlAccountId = parameters.postToGlAccountId?.trim() ?: null

        // Ensure postToGlAccountId is assigned to org if set
        if (postToGlAccountId) {
            GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                    .where("glAccountId", postToGlAccountId, "organizationPartyId", orgPartyId).queryOne()
            if (!gao) {
                delegator.create("GlAccountOrganization", [glAccountId: postToGlAccountId, organizationPartyId: orgPartyId])
            }
        }

        GenericValue newAccount = delegator.makeValue("FinAccount", [
                finAccountId: finAccountId,
                finAccountName: finAccountName,
                finAccountTypeId: finAccountTypeId,
                finAccountCode: parameters.finAccountCode?.trim() ?: null,
                currencyUomId: currencyUomId,
                organizationPartyId: orgPartyId,
                ownerPartyId: parameters.ownerPartyId?.trim() ?: orgPartyId,
                postToGlAccountId: postToGlAccountId,
                statusId: parameters.statusId?.trim() ?: "FNACT_ACTIVE",
                fromDate: UtilDateTime.nowTimestamp(),
                isRefundable: "Y",
                actualBalance: BigDecimal.ZERO,
                availableBalance: BigDecimal.ZERO
        ])
        newAccount.create()

        // Handle initial balance if specified > 0
        if (parameters.initialBalance) {
            BigDecimal initBal = BigDecimal.ZERO
            try { initBal = new BigDecimal(parameters.initialBalance.toString().trim()) } catch (Exception ignored) {}
            if (initBal.compareTo(BigDecimal.ZERO) > 0) {
                Map transCtx = [
                        userLogin: uL,
                        finAccountId: finAccountId,
                        finAccountTransTypeId: "DEPOSIT",
                        partyId: orgPartyId,
                        amount: initBal,
                        transactionDate: UtilDateTime.nowTimestamp(),
                        entryDate: UtilDateTime.nowTimestamp(),
                        comments: "Açılış Bakiyesi (Initial Balance)",
                        statusId: "FINACT_TRNS_APPROVED"
                ]
                dispatcher.runSync("createFinAccountTrans", transCtx)
            }
        }

        request.setAttribute("finAccountId", finAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Finansal hesap başarıyla oluşturuldu: " + finAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFinAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. updateFinAccount
 * Update account name, code, GL mapping, status
 */
String updateFinAccount() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String finAccountId = parameters.finAccountId?.trim()
        if (UtilValidate.isEmpty(finAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "finAccountId zorunludur.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", finAccountId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Finansal hesap bulunamadı: " + finAccountId)
            return "error"
        }

        if (parameters.finAccountName != null && !parameters.finAccountName.trim().isEmpty()) {
            fa.finAccountName = parameters.finAccountName.trim()
        }
        if (parameters.finAccountCode != null) {
            fa.finAccountCode = parameters.finAccountCode.trim().isEmpty() ? null : parameters.finAccountCode.trim()
        }
        if (parameters.finAccountTypeId != null && !parameters.finAccountTypeId.trim().isEmpty()) {
            fa.finAccountTypeId = parameters.finAccountTypeId.trim()
        }
        if (parameters.statusId != null && !parameters.statusId.trim().isEmpty()) {
            fa.statusId = parameters.statusId.trim()
        }
        if (parameters.currencyUomId != null && !parameters.currencyUomId.trim().isEmpty()) {
            fa.currencyUomId = parameters.currencyUomId.trim()
        }
        if (parameters.postToGlAccountId != null) {
            fa.postToGlAccountId = parameters.postToGlAccountId.trim().isEmpty() ? null : parameters.postToGlAccountId.trim()
            if (fa.postToGlAccountId) {
                String orgPartyId = fa.organizationPartyId ?: "Company"
                GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                        .where("glAccountId", fa.postToGlAccountId, "organizationPartyId", orgPartyId).queryOne()
                if (!gao) {
                    delegator.create("GlAccountOrganization", [glAccountId: fa.postToGlAccountId, organizationPartyId: orgPartyId])
                }
            }
        }

        fa.store()

        request.setAttribute("finAccountId", finAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Finansal hesap başarıyla güncellendi: " + finAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateFinAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. getFinAccountTransactions
 * List transactions across accounts or for a specific account
 */
String getFinAccountTransactions() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String finAccountId = parameters.finAccountId?.trim()
        String finAccountTransTypeId = parameters.finAccountTransTypeId?.trim()
        String statusId = parameters.statusId?.trim()
        String search = parameters.search?.trim()

        Timestamp fromDate = parseTimestamp(parameters.fromDate)
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        int viewIndex = 0
        int viewSize = 50
        try { if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString().trim()) } catch (Exception ignored) {}
        try { if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString().trim()) } catch (Exception ignored) {}

        List<EntityCondition> conds = []
        if (finAccountId) {
            conds.add(EntityCondition.makeCondition("finAccountId", EntityOperator.EQUALS, finAccountId))
        }
        if (finAccountTransTypeId) {
            conds.add(EntityCondition.makeCondition("finAccountTransTypeId", EntityOperator.EQUALS, finAccountTransTypeId))
        }
        if (statusId) {
            conds.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (fromDate) {
            conds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        if (thruDate) {
            conds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }
        if (search) {
            String term = "%" + search.toLowerCase() + "%"
            conds.add(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("finAccountTransId", EntityOperator.LIKE, term),
                    EntityCondition.makeCondition("finAccountId", EntityOperator.LIKE, term),
                    EntityCondition.makeCondition("comments", EntityOperator.LIKE, term)
            ], EntityOperator.OR))
        }

        EntityCondition whereCond = conds ? EntityCondition.makeCondition(conds, EntityOperator.AND) : null

        long totalCount = whereCond ? EntityQuery.use(delegator).from("FinAccountTrans").where(whereCond).queryCount() : EntityQuery.use(delegator).from("FinAccountTrans").queryCount()

        def query = EntityQuery.use(delegator).from("FinAccountTrans").orderBy("-transactionDate", "-finAccountTransId")
        if (whereCond) query = query.where(whereCond)
        if (viewSize > 0) {
            query = query.offset(viewIndex * viewSize).maxRows(viewSize)
        }

        List<GenericValue> rawTrans = query.queryList()

        // Cache account names
        Map<String, String> accountNameMap = [:]
        EntityQuery.use(delegator).from("FinAccount").queryList().each {
            accountNameMap[it.finAccountId] = it.finAccountName ?: it.finAccountId
        }

        // Cache types & status
        Map<String, String> transTypeMap = [:]
        EntityQuery.use(delegator).from("FinAccountTransType").queryList().each {
            transTypeMap[it.finAccountTransTypeId] = it.description ?: it.finAccountTransTypeId
        }
        Map<String, String> transStatusMap = [:]
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "FINACT_TRNS_STATUS").queryList().each {
            transStatusMap[it.statusId] = it.description ?: it.statusId
        }

        List<Map> transactionList = []
        for (GenericValue tr : rawTrans) {
            transactionList.add([
                    finAccountTransId: tr.finAccountTransId,
                    finAccountId: tr.finAccountId,
                    finAccountName: accountNameMap[tr.finAccountId] ?: tr.finAccountId,
                    finAccountTransTypeId: tr.finAccountTransTypeId ?: "",
                    finAccountTransTypeDesc: transTypeMap[tr.finAccountTransTypeId] ?: (tr.finAccountTransTypeId ?: ""),
                    partyId: tr.partyId ?: "",
                    partyName: getPartyName(delegator, tr.partyId),
                    glReconciliationId: tr.glReconciliationId ?: "",
                    transactionDate: tr.transactionDate ? tr.transactionDate.toString() : "",
                    entryDate: tr.entryDate ? tr.entryDate.toString() : "",
                    amount: tr.amount ?: BigDecimal.ZERO,
                    paymentId: tr.paymentId ?: "",
                    orderId: tr.orderId ?: "",
                    comments: tr.comments ?: "",
                    statusId: tr.statusId ?: "FINACT_TRNS_APPROVED",
                    statusDesc: transStatusMap[tr.statusId] ?: (tr.statusId ?: "Onaylı")
            ])
        }

        request.setAttribute("transactions", transactionList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFinAccountTransactions: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. createFinAccountTrans
 * Record deposit, withdrawal, or adjustment transaction
 */
String createFinAccountTrans() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String finAccountId = parameters.finAccountId?.trim()
        String transTypeId = parameters.finAccountTransTypeId?.trim()
        String amountStr = parameters.amount?.toString()?.trim()

        if (UtilValidate.isEmpty(finAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "finAccountId zorunludur.")
            return "error"
        }
        if (UtilValidate.isEmpty(transTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "İşlem türü (DEPOSIT, WITHDRAWAL, ADJUSTMENT) zorunludur.")
            return "error"
        }
        if (UtilValidate.isEmpty(amountStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "Tutar zorunludur.")
            return "error"
        }

        BigDecimal amount = new BigDecimal(amountStr)
        if (amount.compareTo(BigDecimal.ZERO) <= 0 && !"ADJUSTMENT".equals(transTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Tutar sıfırdan büyük olmalıdır.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", finAccountId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Finansal hesap bulunamadı: " + finAccountId)
            return "error"
        }

        if ("FNACT_CANCELLED".equals(fa.statusId) || "FNACT_MANFROZEN".equals(fa.statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu hesap pasif veya dondurulmuş olduğu için işlem yapılamaz.")
            return "error"
        }

        Timestamp transDate = parseTimestamp(parameters.transactionDate) ?: UtilDateTime.nowTimestamp()

        Map serviceCtx = [
                userLogin: uL,
                finAccountId: finAccountId,
                finAccountTransTypeId: transTypeId,
                partyId: parameters.partyId?.trim() ?: fa.organizationPartyId ?: "Company",
                amount: amount,
                transactionDate: transDate,
                entryDate: UtilDateTime.nowTimestamp(),
                comments: parameters.comments?.trim() ?: null,
                statusId: parameters.statusId?.trim() ?: "FINACT_TRNS_APPROVED"
        ]

        if (parameters.paymentId) serviceCtx.paymentId = parameters.paymentId.trim()
        if (parameters.orderId) serviceCtx.orderId = parameters.orderId.trim()

        Map serviceRes = dispatcher.runSync("createFinAccountTrans", serviceCtx)
        if (ServiceUtil.isError(serviceRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceRes))
            return "error"
        }

        String transId = serviceRes.finAccountTransId

        // Trigger balance recalculation
        try {
            dispatcher.runSync("updateFinAccountBalancesFromTrans", [finAccountTransId: transId, userLogin: uL])
        } catch (Exception be) {
            Debug.logWarning("Could not run updateFinAccountBalancesFromTrans: " + be.getMessage(), MODULE)
        }

        request.setAttribute("finAccountTransId", transId)
        request.setAttribute("finAccountId", finAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Finansal hesap işlemi başarıyla kaydedildi: " + transId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFinAccountTrans: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. setFinAccountTransStatus
 * Approve or cancel a transaction
 */
String setFinAccountTransStatus() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String finAccountTransId = parameters.finAccountTransId?.trim()
        String statusId = parameters.statusId?.trim()

        if (UtilValidate.isEmpty(finAccountTransId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "finAccountTransId ve statusId zorunludur.")
            return "error"
        }

        GenericValue tr = EntityQuery.use(delegator).from("FinAccountTrans").where("finAccountTransId", finAccountTransId).queryOne()
        if (!tr) {
            request.setAttribute("_ERROR_MESSAGE_", "İşlem bulunamadı: " + finAccountTransId)
            return "error"
        }

        tr.statusId = statusId
        tr.store()

        // Recalculate balance
        try {
            dispatcher.runSync("updateFinAccountBalancesFromTrans", [finAccountTransId: finAccountTransId, userLogin: uL])
        } catch (Exception be) {
            Debug.logWarning("Could not run updateFinAccountBalancesFromTrans: " + be.getMessage(), MODULE)
        }

        request.setAttribute("finAccountTransId", finAccountTransId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("_EVENT_MESSAGE_", "İşlem durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setFinAccountTransStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. transferBetweenFinAccounts
 * Virman: Transfer funds from one financial account to another
 */
String transferBetweenFinAccounts() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String fromAccountId = parameters.fromFinAccountId?.trim()
        String toAccountId = parameters.toFinAccountId?.trim()
        String amountStr = parameters.amount?.toString()?.trim()
        String comments = parameters.comments?.trim() ?: ""

        if (UtilValidate.isEmpty(fromAccountId) || UtilValidate.isEmpty(toAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kaynak ve Hedef hesaplar seçilmelidir.")
            return "error"
        }
        if (fromAccountId.equals(toAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kaynak ve Hedef hesap aynı olamaz.")
            return "error"
        }
        if (UtilValidate.isEmpty(amountStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "Transfer tutarı zorunludur.")
            return "error"
        }

        BigDecimal amount = new BigDecimal(amountStr)
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            request.setAttribute("_ERROR_MESSAGE_", "Transfer tutarı sıfırdan büyük olmalıdır.")
            return "error"
        }

        GenericValue fromAcc = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", fromAccountId).queryOne()
        GenericValue toAcc = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", toAccountId).queryOne()

        if (!fromAcc || !toAcc) {
            request.setAttribute("_ERROR_MESSAGE_", "Seçilen hesaplardan biri bulunamadı.")
            return "error"
        }

        Timestamp transDate = parseTimestamp(parameters.transactionDate) ?: UtilDateTime.nowTimestamp()

        String fromComment = "Virman Çıkışı: [" + (toAcc.finAccountName ?: toAccountId) + " hesabına] " + comments
        String toComment = "Virman Girişi: [" + (fromAcc.finAccountName ?: fromAccountId) + " hesabından] " + comments

        // 1. Withdrawal from source
        Map withdrawRes = dispatcher.runSync("createFinAccountTrans", [
                userLogin: uL,
                finAccountId: fromAccountId,
                finAccountTransTypeId: "WITHDRAWAL",
                partyId: fromAcc.organizationPartyId ?: "Company",
                amount: amount,
                transactionDate: transDate,
                entryDate: UtilDateTime.nowTimestamp(),
                comments: fromComment.trim(),
                statusId: "FINACT_TRNS_APPROVED"
        ])

        // 2. Deposit to target
        Map depositRes = dispatcher.runSync("createFinAccountTrans", [
                userLogin: uL,
                finAccountId: toAccountId,
                finAccountTransTypeId: "DEPOSIT",
                partyId: toAcc.organizationPartyId ?: "Company",
                amount: amount,
                transactionDate: transDate,
                entryDate: UtilDateTime.nowTimestamp(),
                comments: toComment.trim(),
                statusId: "FINACT_TRNS_APPROVED"
        ])

        // Recalculate both accounts
        try {
            if (withdrawRes.finAccountTransId) {
                dispatcher.runSync("updateFinAccountBalancesFromTrans", [finAccountTransId: withdrawRes.finAccountTransId, userLogin: uL])
            }
            if (depositRes.finAccountTransId) {
                dispatcher.runSync("updateFinAccountBalancesFromTrans", [finAccountTransId: depositRes.finAccountTransId, userLogin: uL])
            }
        } catch (Exception be) {
            Debug.logWarning("Could not run updateFinAccountBalancesFromTrans: " + be.getMessage(), MODULE)
        }

        request.setAttribute("fromTransId", withdrawRes.finAccountTransId)
        request.setAttribute("toTransId", depositRes.finAccountTransId)
        request.setAttribute("_EVENT_MESSAGE_", "Virman işlemi başarıyla gerçekleştirildi. Tutar: " + amount)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in transferBetweenFinAccounts: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 9. getGlReconciliations
 * List reconciliations for bank statements
 */
String getGlReconciliations() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String glAccountId = parameters.glAccountId?.trim()
        String statusId = parameters.statusId?.trim()
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        List<EntityCondition> conds = [
                EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId)
        ]
        if (glAccountId) {
            conds.add(EntityCondition.makeCondition("glAccountId", EntityOperator.EQUALS, glAccountId))
        }
        if (statusId) {
            conds.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }

        List<GenericValue> recList = EntityQuery.use(delegator).from("GlReconciliation")
                .where(conds)
                .orderBy("-reconciledDate", "-glReconciliationId")
                .queryList()

        List<Map> result = []
        for (GenericValue r : recList) {
            // Count transactions assigned
            long transCount = EntityQuery.use(delegator).from("FinAccountTrans")
                    .where("glReconciliationId", r.glReconciliationId).queryCount()

            // GL account name
            GenericValue gla = r.glAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", r.glAccountId).queryOne() : null
            String glaName = gla ? ((gla.accountCode ?: gla.glAccountId) + " - " + (gla.accountName ?: "")) : (r.glAccountId ?: "")

            result.add([
                    glReconciliationId: r.glReconciliationId,
                    glReconciliationName: r.glReconciliationName ?: r.glReconciliationId,
                    glAccountId: r.glAccountId ?: "",
                    glAccountName: glaName,
                    statusId: r.statusId ?: "GLREC_CREATED",
                    statusDesc: "GLREC_RECONCILED".equals(r.statusId) ? "Mutabakat Sağlandı" : "Devam Ediyor (Taslak)",
                    reconciledBalance: r.reconciledBalance ?: BigDecimal.ZERO,
                    openingBalance: r.openingBalance ?: BigDecimal.ZERO,
                    reconciledDate: r.reconciledDate ? r.reconciledDate.toString() : "",
                    description: r.description ?: "",
                    transactionCount: transCount
            ])
        }

        request.setAttribute("reconciliations", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlReconciliations: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 10. getGlReconciliationDetails
 * Detail of a reconciliation with linked and unlinked transactions
 */
String getGlReconciliationDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String glReconciliationId = parameters.glReconciliationId?.trim()
        if (UtilValidate.isEmpty(glReconciliationId)) {
            request.setAttribute("_ERROR_MESSAGE_", "glReconciliationId zorunludur.")
            return "error"
        }

        GenericValue r = EntityQuery.use(delegator).from("GlReconciliation").where("glReconciliationId", glReconciliationId).queryOne()
        if (!r) {
            request.setAttribute("_ERROR_MESSAGE_", "Mutabakat kaydı bulunamadı: " + glReconciliationId)
            return "error"
        }

        GenericValue gla = r.glAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", r.glAccountId).queryOne() : null
        String glaName = gla ? ((gla.accountCode ?: gla.glAccountId) + " - " + (gla.accountName ?: "")) : (r.glAccountId ?: "")

        // Transactions assigned to this reconciliation
        List<GenericValue> linkedTrans = EntityQuery.use(delegator).from("FinAccountTrans")
                .where("glReconciliationId", glReconciliationId)
                .orderBy("transactionDate")
                .queryList()

        BigDecimal totalLinked = BigDecimal.ZERO
        List<Map> linkedList = []
        for (GenericValue tr : linkedTrans) {
            BigDecimal amt = tr.amount ?: BigDecimal.ZERO
            if ("WITHDRAWAL".equals(tr.finAccountTransTypeId)) amt = amt.negate()
            totalLinked = totalLinked.add(amt)

            linkedList.add([
                    finAccountTransId: tr.finAccountTransId,
                    finAccountId: tr.finAccountId,
                    finAccountTransTypeId: tr.finAccountTransTypeId,
                    transactionDate: tr.transactionDate ? tr.transactionDate.toString() : "",
                    amount: tr.amount ?: BigDecimal.ZERO,
                    comments: tr.comments ?: "",
                    statusId: tr.statusId ?: ""
            ])
        }

        // Unlinked transactions for this account's financial accounts
        List<GenericValue> unlinkedTrans = []
        if (r.glAccountId) {
            List<GenericValue> finAccs = EntityQuery.use(delegator).from("FinAccount").where("postToGlAccountId", r.glAccountId).queryList()
            List<String> faIds = finAccs.collect { it.finAccountId }
            if (faIds) {
                unlinkedTrans = EntityQuery.use(delegator).from("FinAccountTrans")
                        .where(
                                EntityCondition.makeCondition("finAccountId", EntityOperator.IN, faIds),
                                EntityCondition.makeCondition("glReconciliationId", EntityOperator.EQUALS, null)
                        )
                        .orderBy("-transactionDate")
                        .maxRows(100)
                        .queryList()
            }
        }

        List<Map> unlinkedList = []
        for (GenericValue tr : unlinkedTrans) {
            unlinkedList.add([
                    finAccountTransId: tr.finAccountTransId,
                    finAccountId: tr.finAccountId,
                    finAccountTransTypeId: tr.finAccountTransTypeId,
                    transactionDate: tr.transactionDate ? tr.transactionDate.toString() : "",
                    amount: tr.amount ?: BigDecimal.ZERO,
                    comments: tr.comments ?: "",
                    statusId: tr.statusId ?: ""
            ])
        }

        Map headerData = [
                glReconciliationId: r.glReconciliationId,
                glReconciliationName: r.glReconciliationName ?: r.glReconciliationId,
                glAccountId: r.glAccountId ?: "",
                glAccountName: glaName,
                statusId: r.statusId ?: "GLREC_CREATED",
                statusDesc: "GLREC_RECONCILED".equals(r.statusId) ? "Mutabakat Sağlandı" : "Devam Ediyor (Taslak)",
                reconciledBalance: r.reconciledBalance ?: BigDecimal.ZERO,
                openingBalance: r.openingBalance ?: BigDecimal.ZERO,
                reconciledDate: r.reconciledDate ? r.reconciledDate.toString() : "",
                description: r.description ?: "",
                totalLinkedAmount: totalLinked
        ]

        request.setAttribute("reconciliation", headerData)
        request.setAttribute("linkedTransactions", linkedList)
        request.setAttribute("unlinkedTransactions", unlinkedList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlReconciliationDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 11. createGlReconciliation
 * Create new bank reconciliation batch
 */
String createGlReconciliation() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String name = parameters.glReconciliationName?.trim()
        String glAccountId = parameters.glAccountId?.trim()

        if (UtilValidate.isEmpty(name)) {
            request.setAttribute("_ERROR_MESSAGE_", "Mutabakat Adı zorunludur.")
            return "error"
        }
        if (UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "İlgili GL Hesabı zorunludur.")
            return "error"
        }

        BigDecimal recBal = BigDecimal.ZERO
        if (parameters.reconciledBalance) {
            try { recBal = new BigDecimal(parameters.reconciledBalance.toString().trim()) } catch (Exception ignored) {}
        }
        BigDecimal openBal = BigDecimal.ZERO
        if (parameters.openingBalance) {
            try { openBal = new BigDecimal(parameters.openingBalance.toString().trim()) } catch (Exception ignored) {}
        }

        String recId = delegator.getNextSeqId("GlReconciliation")
        GenericValue newRec = delegator.makeValue("GlReconciliation", [
                glReconciliationId: recId,
                glReconciliationName: name,
                glAccountId: glAccountId,
                organizationPartyId: parameters.organizationPartyId?.trim() ?: "Company",
                statusId: "GLREC_CREATED",
                openingBalance: openBal,
                reconciledBalance: recBal,
                reconciledDate: parseTimestamp(parameters.reconciledDate) ?: UtilDateTime.nowTimestamp(),
                description: parameters.description?.trim() ?: null,
                createdDate: UtilDateTime.nowTimestamp(),
                createdByUserLogin: uL.userLoginId,
                lastModifiedByUserLogin: uL.userLoginId
        ])
        newRec.create()

        request.setAttribute("glReconciliationId", recId)
        request.setAttribute("_EVENT_MESSAGE_", "Banka mutabakat kaydı başarıyla oluşturuldu: " + recId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createGlReconciliation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 12. reconcileTransactions
 * Associate or dissociate transactions to a reconciliation and mark reconciled
 */
String reconcileTransactions() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String glReconciliationId = parameters.glReconciliationId?.trim()
        if (UtilValidate.isEmpty(glReconciliationId)) {
            request.setAttribute("_ERROR_MESSAGE_", "glReconciliationId zorunludur.")
            return "error"
        }

        GenericValue r = EntityQuery.use(delegator).from("GlReconciliation").where("glReconciliationId", glReconciliationId).queryOne()
        if (!r) {
            request.setAttribute("_ERROR_MESSAGE_", "Mutabakat kaydı bulunamadı: " + glReconciliationId)
            return "error"
        }

        // Parse transIds
        List transIds = []
        if (parameters.finAccountTransIds) {
            if (parameters.finAccountTransIds instanceof List) {
                transIds = (List) parameters.finAccountTransIds
            } else {
                String s = parameters.finAccountTransIds.toString().trim()
                if (s.startsWith("[")) {
                    transIds = (List) new JsonSlurper().parseText(s)
                } else {
                    transIds = s.split(",").collect { it.trim() }.findAll { !it.isEmpty() }
                }
            }
        }

        String action = parameters.action?.trim() ?: "LINK" // 'LINK' or 'UNLINK'

        for (Object tIdObj : transIds) {
            String tId = tIdObj.toString().trim()
            GenericValue tr = EntityQuery.use(delegator).from("FinAccountTrans").where("finAccountTransId", tId).queryOne()
            if (tr) {
                tr.glReconciliationId = "UNLINK".equalsIgnoreCase(action) ? null : glReconciliationId
                tr.store()
            }
        }

        if ("Y".equalsIgnoreCase(parameters.markReconciled?.toString())) {
            r.statusId = "GLREC_RECONCILED"
            r.reconciledDate = UtilDateTime.nowTimestamp()
            r.store()
        }

        request.setAttribute("glReconciliationId", glReconciliationId)
        request.setAttribute("_EVENT_MESSAGE_", "Mutabakat satırları başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in reconcileTransactions: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 13. getFinAccountMetadata
 * Metadata for financial account creation, transactions, and filters
 */
String getFinAccountMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Account types
        List<Map> types = []
        EntityQuery.use(delegator).from("FinAccountType").orderBy("description").queryList().each {
            types.add([
                    finAccountTypeId: it.finAccountTypeId,
                    description: it.description ?: it.finAccountTypeId,
                    isRefundable: it.isRefundable ?: "Y"
            ])
        }

        // Transaction types
        List<Map> transTypes = []
        EntityQuery.use(delegator).from("FinAccountTransType").orderBy("description").queryList().each {
            transTypes.add([
                    finAccountTransTypeId: it.finAccountTransTypeId,
                    description: it.description ?: it.finAccountTransTypeId
            ])
        }

        // Account status items
        List<Map> statuses = []
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "FINACCT_STATUS").orderBy("sequenceId").queryList().each {
            statuses.add([
                    statusId: it.statusId,
                    description: it.description ?: it.statusId
            ])
        }

        // Eligible cash/bank GL accounts (accounts in CASH_EQUIVALENT, ASSET, or CURRENT_ASSET)
        List<Map> glAccounts = []
        EntityQuery.use(delegator).from("GlAccount")
                .orderBy("accountCode", "glAccountId")
                .queryList().each {
            glAccounts.add([
                    glAccountId: it.glAccountId,
                    accountCode: it.accountCode ?: it.glAccountId,
                    accountName: it.accountName ?: "",
                    glAccountClassId: it.glAccountClassId ?: ""
            ])
        }

        // Currencies
        List<Map> currencies = [
                [uomId: 'USD', description: 'US Dollar ($)'],
                [uomId: 'TRY', description: 'Turkish Lira (₺)'],
                [uomId: 'EUR', description: 'Euro (€)'],
                [uomId: 'GBP', description: 'British Pound (£)']
        ]

        Map meta = [
                finAccountTypes: types,
                finAccountTransTypes: transTypes,
                finAccountStatuses: statuses,
                glAccounts: glAccounts,
                currencies: currencies,
                organizations: [
                        [partyId: "Company", name: "Company (Ana Şirket)"]
                ]
        ]

        request.setAttribute("metadata", meta)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFinAccountMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
