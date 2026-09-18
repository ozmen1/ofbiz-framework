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
import java.sql.Date as SqlDate
import java.math.BigDecimal
import java.math.RoundingMode

final String MODULE = "AdvancedAccountingEvents.groovy"

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

SqlDate parseSqlDate(Object dateObj) {
    if (!dateObj) return null
    if (dateObj instanceof SqlDate) return (SqlDate) dateObj
    if (dateObj instanceof Timestamp) return new SqlDate(((Timestamp) dateObj).getTime())
    String str = dateObj.toString().trim()
    if (str.isEmpty()) return null
    try {
        if (str.length() > 10) {
            str = str.substring(0, 10)
        }
        return SqlDate.valueOf(str)
    } catch (Exception e) {
        Debug.logWarning("Could not parse date: " + str, MODULE)
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
 * 1. getAdvancedAccountingMetadata
 * Returns dropdown options and lookups for Billing Accounts, Fixed Assets, Budgets, and Agreements.
 */
String getAdvancedAccountingMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Fixed Asset Types
        List faTypes = EntityQuery.use(delegator).from("FixedAssetType").orderBy("description").queryList().collect {
            [fixedAssetTypeId: it.fixedAssetTypeId, description: it.description ?: it.fixedAssetTypeId]
        }

        // Budget Types
        List bTypes = EntityQuery.use(delegator).from("BudgetType").orderBy("description").queryList().collect {
            [budgetTypeId: it.budgetTypeId, description: it.description ?: it.budgetTypeId]
        }

        // Budget Item Types
        List biTypes = EntityQuery.use(delegator).from("BudgetItemType").orderBy("description").queryList().collect {
            [budgetItemTypeId: it.budgetItemTypeId, description: it.description ?: it.budgetItemTypeId]
        }

        // Custom Time Periods
        List timePeriods = EntityQuery.use(delegator).from("CustomTimePeriod").where("isClosed", "N").orderBy("fromDate DESC").queryList().collect {
            [
                customTimePeriodId: it.customTimePeriodId,
                periodTypeId: it.periodTypeId,
                periodNum: it.periodNum,
                periodName: "Period " + (it.periodNum ?: "") + " (" + (it.fromDate ? it.fromDate.toString().substring(0, 10) : "") + " - " + (it.thruDate ? it.thruDate.toString().substring(0, 10) : "") + ")",
                fromDate: it.fromDate?.toString() ?: "",
                thruDate: it.thruDate?.toString() ?: ""
            ]
        }

        // Agreement Types
        List agTypes = EntityQuery.use(delegator).from("AgreementType").orderBy("description").queryList().collect {
            [agreementTypeId: it.agreementTypeId, description: it.description ?: it.agreementTypeId]
        }

        // Currencies
        List currencies = [
            [uomId: 'USD', description: 'US Dollar ($)'],
            [uomId: 'TRY', description: 'Turkish Lira (₺)'],
            [uomId: 'EUR', description: 'Euro (€)'],
            [uomId: 'GBP', description: 'British Pound (£)']
        ]

        // Parties (active organizations and customers/suppliers)
        List partyList = EntityQuery.use(delegator).from("PartyRoleAndPartyDetail")
            .where(EntityCondition.makeCondition("roleTypeId", EntityOperator.IN, ["CUSTOMER", "SUPPLIER", "BILL_TO_CUSTOMER", "INTERNAL_ORGANIZATIO"]))
            .queryList().collect {
                String name = it.groupName ?: ((it.firstName ?: "") + " " + (it.lastName ?: "")).trim()
                [partyId: it.partyId, partyName: name ?: it.partyId, roleTypeId: it.roleTypeId]
            }
        // Deduplicate parties by partyId
        Map uniqueParties = [:]
        partyList.each {
            if (!uniqueParties.containsKey(it.partyId)) {
                uniqueParties[it.partyId] = [partyId: it.partyId, partyName: it.partyName]
            }
        }

        Map metadata = [
            fixedAssetTypes: faTypes,
            budgetTypes: bTypes,
            budgetItemTypes: biTypes,
            customTimePeriods: timePeriods,
            agreementTypes: agTypes,
            currencies: currencies,
            parties: uniqueParties.values().toList().sort { it.partyName }
        ]

        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAdvancedAccountingMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// BILLING ACCOUNTS (Cari Kredi & Limitler)
// ==========================================

/**
 * 2. getBillingAccounts
 * Lists billing accounts with limit, balances, customer info, and invoice counts.
 */
String getBillingAccounts() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String search = parameters.search?.trim()
        String partyId = parameters.partyId?.trim()

        int viewIndex = 0
        int viewSize = 50
        try {
            if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString())
            if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString())
        } catch (Exception ignored) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(search)) {
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("billingAccountId", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("description", EntityOperator.LIKE, "%" + search + "%")
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("BillingAccount")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List<GenericValue> rawAccounts = query.orderBy("billingAccountId DESC").queryList()

        BigDecimal totalLimit = BigDecimal.ZERO
        BigDecimal totalAvailable = BigDecimal.ZERO
        BigDecimal totalBilled = BigDecimal.ZERO

        List accounts = []
        rawAccounts.each { ba ->
            String baId = ba.billingAccountId

            // Find customer/party role
            GenericValue role = EntityQuery.use(delegator).from("BillingAccountRole")
                .where("billingAccountId", baId)
                .filterByDate()
                .queryFirst()
            if (!role) {
                role = EntityQuery.use(delegator).from("BillingAccountRole")
                    .where("billingAccountId", baId)
                    .queryFirst()
            }

            String currentPartyId = role?.partyId ?: ""
            if (UtilValidate.isNotEmpty(partyId) && !currentPartyId.equals(partyId)) {
                return // skip if filtering by party
            }

            String customerName = currentPartyId ? getPartyName(delegator, currentPartyId) : ""

            // Calculate balance using OFBiz calcBillingAccountBalance
            BigDecimal accLimit = ba.accountLimit ?: BigDecimal.ZERO
            BigDecimal accountBal = BigDecimal.ZERO
            BigDecimal availBal = accLimit

            try {
                Map balMap = dispatcher.runSync("calcBillingAccountBalance", [billingAccountId: baId, userLogin: uL])
                if (balMap.accountBalance != null) accountBal = balMap.accountBalance
                if (balMap.availableBalance != null) availBal = balMap.availableBalance
            } catch (Exception be) {
                Debug.logWarning("Could not calcBillingAccountBalance for " + baId + ": " + be.getMessage(), MODULE)
            }

            long invoiceCount = EntityQuery.use(delegator).from("Invoice").where("billingAccountId", baId).queryCount()
            long paymentCount = EntityQuery.use(delegator).from("PaymentApplication").where("billingAccountId", baId).queryCount()

            totalLimit = totalLimit.add(accLimit)
            totalAvailable = totalAvailable.add(availBal)
            totalBilled = totalBilled.add(accountBal)

            accounts.add([
                billingAccountId: baId,
                accountLimit: accLimit,
                accountBalance: accountBal,
                availableBalance: availBal,
                accountCurrencyUomId: ba.accountCurrencyUomId ?: "USD",
                description: ba.description ?: "",
                fromDate: ba.fromDate?.toString() ?: "",
                thruDate: ba.thruDate?.toString() ?: "",
                partyId: currentPartyId,
                customerName: customerName,
                roleTypeId: role?.roleTypeId ?: "BILL_TO_CUSTOMER",
                invoiceCount: invoiceCount,
                paymentCount: paymentCount
            ])
        }

        int totalCount = accounts.size()
        int fromIdx = Math.min(viewIndex * viewSize, totalCount)
        int toIdx = Math.min(fromIdx + viewSize, totalCount)
        List pagedList = fromIdx < totalCount ? accounts.subList(fromIdx, toIdx) : []

        request.setAttribute("accounts", pagedList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("totalLimit", totalLimit)
        request.setAttribute("totalAvailable", totalAvailable)
        request.setAttribute("totalBilled", totalBilled)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBillingAccounts: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. getBillingAccountDetails
 * Returns detailed view of a billing account including roles, applied invoices, and payments.
 */
String getBillingAccountDetails() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        if (UtilValidate.isEmpty(billingAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId parametresi zorunludur.")
            return "error"
        }

        GenericValue ba = EntityQuery.use(delegator).from("BillingAccount").where("billingAccountId", billingAccountId).queryOne()
        if (!ba) {
            request.setAttribute("_ERROR_MESSAGE_", "Cari hesap kredisi bulunamadı: " + billingAccountId)
            return "error"
        }

        BigDecimal accLimit = ba.accountLimit ?: BigDecimal.ZERO
        BigDecimal accountBal = BigDecimal.ZERO
        BigDecimal availBal = accLimit
        BigDecimal netBal = BigDecimal.ZERO

        try {
            Map balMap = dispatcher.runSync("calcBillingAccountBalance", [billingAccountId: billingAccountId, userLogin: uL])
            if (balMap.accountBalance != null) accountBal = balMap.accountBalance
            if (balMap.availableBalance != null) availBal = balMap.availableBalance
            if (balMap.netAccountBalance != null) netBal = balMap.netAccountBalance
        } catch (Exception be) {
            Debug.logWarning("Could not calculate balance for " + billingAccountId + ": " + be.getMessage(), MODULE)
        }

        // Roles
        List roles = EntityQuery.use(delegator).from("BillingAccountRole").where("billingAccountId", billingAccountId).queryList().collect {
            [
                partyId: it.partyId,
                partyName: getPartyName(delegator, it.partyId),
                roleTypeId: it.roleTypeId,
                fromDate: it.fromDate?.toString() ?: "",
                thruDate: it.thruDate?.toString() ?: ""
            ]
        }

        // Applied Invoices
        List invoices = EntityQuery.use(delegator).from("Invoice").where("billingAccountId", billingAccountId).orderBy("invoiceDate DESC").queryList().collect { inv ->
            BigDecimal invTotal = BigDecimal.ZERO
            try {
                Map invTotalRes = dispatcher.runSync("getInvoiceTotal", [invoiceId: inv.invoiceId, userLogin: uL])
                invTotal = invTotalRes.total ?: BigDecimal.ZERO
            } catch (Exception ignored) {}

            [
                invoiceId: inv.invoiceId,
                invoiceTypeId: inv.invoiceTypeId,
                invoiceDate: inv.invoiceDate?.toString() ?: "",
                statusId: inv.statusId,
                total: invTotal,
                currencyUomId: inv.currencyUomId ?: "USD",
                description: inv.description ?: ""
            ]
        }

        // Applied Payments
        List payments = EntityQuery.use(delegator).from("PaymentApplication").where("billingAccountId", billingAccountId).queryList().collect { pa ->
            [
                paymentApplicationId: pa.paymentApplicationId,
                paymentId: pa.paymentId ?: "",
                invoiceId: pa.invoiceId ?: "",
                amountApplied: pa.amountApplied ?: BigDecimal.ZERO
            ]
        }

        // Terms
        List terms = EntityQuery.use(delegator).from("BillingAccountTerm").where("billingAccountId", billingAccountId).queryList().collect {
            [
                billingAccountTermId: it.billingAccountTermId,
                termTypeId: it.termTypeId,
                termValue: it.termValue ?: BigDecimal.ZERO,
                termDays: it.termDays ?: 0,
                description: it.description ?: ""
            ]
        }

        Map accountDetail = [
            billingAccountId: ba.billingAccountId,
            accountLimit: accLimit,
            accountBalance: accountBal,
            availableBalance: availBal,
            netAccountBalance: netBal,
            accountCurrencyUomId: ba.accountCurrencyUomId ?: "USD",
            description: ba.description ?: "",
            fromDate: ba.fromDate?.toString() ?: "",
            thruDate: ba.thruDate?.toString() ?: ""
        ]

        request.setAttribute("account", accountDetail)
        request.setAttribute("roles", roles)
        request.setAttribute("invoices", invoices)
        request.setAttribute("payments", payments)
        request.setAttribute("terms", terms)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBillingAccountDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. createBillingAccount
 * Creates a new billing account with optional customer role assignment.
 */
String createBillingAccount() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String accountLimitStr = parameters.accountLimit?.toString()?.trim()
        String currencyUomId = parameters.accountCurrencyUomId?.trim() ?: "USD"
        String description = parameters.description?.trim() ?: ""
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim() ?: "BILL_TO_CUSTOMER"

        if (UtilValidate.isEmpty(accountLimitStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kredi limiti zorunludur.")
            return "error"
        }

        BigDecimal accountLimit = new BigDecimal(accountLimitStr)
        Timestamp fromDate = parseTimestamp(parameters.fromDate) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        Map serviceIn = [
            userLogin: uL,
            accountLimit: accountLimit,
            accountCurrencyUomId: currencyUomId,
            description: description,
            fromDate: fromDate,
            thruDate: thruDate
        ]

        Map createRes = dispatcher.runSync("createBillingAccount", serviceIn)
        if (ServiceUtil.isError(createRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(createRes))
            return "error"
        }

        String billingAccountId = createRes.billingAccountId

        // Assign party role if provided
        if (UtilValidate.isNotEmpty(partyId)) {
            try {
                // Ensure party_role exists
                GenericValue pr = EntityQuery.use(delegator).from("PartyRole").where("partyId", partyId, "roleTypeId", roleTypeId).queryOne()
                if (!pr) {
                    GenericValue newPr = delegator.makeValue("PartyRole", [partyId: partyId, roleTypeId: roleTypeId])
                    newPr.create()
                }

                dispatcher.runSync("createBillingAccountRole", [
                    userLogin: uL,
                    billingAccountId: billingAccountId,
                    partyId: partyId,
                    roleTypeId: roleTypeId,
                    fromDate: fromDate
                ])
            } catch (Exception re) {
                Debug.logWarning("Could not create BillingAccountRole: " + re.getMessage(), MODULE)
            }
        }

        request.setAttribute("billingAccountId", billingAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Cari hesap limiti başarıyla oluşturuldu: " + billingAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBillingAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. updateBillingAccount
 * Updates limit, description, or validity dates of a billing account.
 */
String updateBillingAccount() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String billingAccountId = parameters.billingAccountId?.trim()
        if (UtilValidate.isEmpty(billingAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "billingAccountId zorunludur.")
            return "error"
        }

        GenericValue ba = EntityQuery.use(delegator).from("BillingAccount").where("billingAccountId", billingAccountId).queryOne()
        if (!ba) {
            request.setAttribute("_ERROR_MESSAGE_", "Cari hesap kredisi bulunamadı: " + billingAccountId)
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            billingAccountId: billingAccountId
        ]

        if (parameters.accountLimit != null) {
            serviceIn.accountLimit = new BigDecimal(parameters.accountLimit.toString())
        }
        if (parameters.description != null) {
            serviceIn.description = parameters.description.toString().trim()
        }
        if (parameters.thruDate != null) {
            serviceIn.thruDate = parseTimestamp(parameters.thruDate)
        }

        Map updateRes = dispatcher.runSync("updateBillingAccount", serviceIn)
        if (ServiceUtil.isError(updateRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(updateRes))
            return "error"
        }

        request.setAttribute("billingAccountId", billingAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Cari hesap limiti güncellendi: " + billingAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateBillingAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// FIXED ASSETS (Duran Varlıklar & Amortisman)
// ==========================================

/**
 * 6. getFixedAssets
 * Lists fixed assets with cost, depreciation, and net book value (NBV).
 */
String getFixedAssets() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String fixedAssetTypeId = parameters.fixedAssetTypeId?.trim()

        int viewIndex = 0
        int viewSize = 50
        try {
            if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString())
            if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString())
        } catch (Exception ignored) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(search)) {
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("fixedAssetId", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("fixedAssetName", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("serialNumber", EntityOperator.LIKE, "%" + search + "%")
            ], EntityOperator.OR))
        }
        if (UtilValidate.isNotEmpty(fixedAssetTypeId)) {
            conditions.add(EntityCondition.makeCondition("fixedAssetTypeId", EntityOperator.EQUALS, fixedAssetTypeId))
        }

        def query = EntityQuery.use(delegator).from("FixedAsset")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List<GenericValue> rawAssets = query.orderBy("fixedAssetId DESC").queryList()

        BigDecimal totalPurchaseCost = BigDecimal.ZERO
        BigDecimal totalDepreciation = BigDecimal.ZERO
        BigDecimal totalNetBookValue = BigDecimal.ZERO

        List assets = rawAssets.collect { fa ->
            BigDecimal pCost = fa.purchaseCost ?: BigDecimal.ZERO
            BigDecimal sVal = fa.salvageValue ?: BigDecimal.ZERO
            BigDecimal dep = fa.depreciation ?: BigDecimal.ZERO
            BigDecimal nbv = pCost.subtract(dep)
            if (nbv.compareTo(BigDecimal.ZERO) < 0) nbv = BigDecimal.ZERO

            totalPurchaseCost = totalPurchaseCost.add(pCost)
            totalDepreciation = totalDepreciation.add(dep)
            totalNetBookValue = totalNetBookValue.add(nbv)

            GenericValue typeGv = fa.getRelatedOne("FixedAssetType", false)
            String typeDesc = typeGv?.description ?: fa.fixedAssetTypeId

            [
                fixedAssetId: fa.fixedAssetId,
                fixedAssetName: fa.fixedAssetName ?: fa.fixedAssetId,
                fixedAssetTypeId: fa.fixedAssetTypeId ?: "",
                fixedAssetTypeDesc: typeDesc,
                serialNumber: fa.serialNumber ?: "",
                purchaseCost: pCost,
                purchaseCostUomId: fa.purchaseCostUomId ?: "USD",
                salvageValue: sVal,
                depreciation: dep,
                netBookValue: nbv,
                dateAcquired: fa.dateAcquired?.toString() ?: "",
                expectedEndOfLife: fa.expectedEndOfLife?.toString() ?: "",
                actualEndOfLife: fa.actualEndOfLife?.toString() ?: ""
            ]
        }

        int totalCount = assets.size()
        int fromIdx = Math.min(viewIndex * viewSize, totalCount)
        int toIdx = Math.min(fromIdx + viewSize, totalCount)
        List pagedList = fromIdx < totalCount ? assets.subList(fromIdx, toIdx) : []

        request.setAttribute("assets", pagedList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("totalPurchaseCost", totalPurchaseCost)
        request.setAttribute("totalDepreciation", totalDepreciation)
        request.setAttribute("totalNetBookValue", totalNetBookValue)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssets: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. getFixedAssetDetails
 * Returns detailed info for a single fixed asset, maintenance history, and straight-line depreciation projection.
 */
String getFixedAssetDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (UtilValidate.isEmpty(fixedAssetId)) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId zorunludur.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FixedAsset").where("fixedAssetId", fixedAssetId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Duran varlık bulunamadı: " + fixedAssetId)
            return "error"
        }

        GenericValue typeGv = fa.getRelatedOne("FixedAssetType", false)
        BigDecimal pCost = fa.purchaseCost ?: BigDecimal.ZERO
        BigDecimal sVal = fa.salvageValue ?: BigDecimal.ZERO
        BigDecimal dep = fa.depreciation ?: BigDecimal.ZERO
        BigDecimal nbv = pCost.subtract(dep)
        if (nbv.compareTo(BigDecimal.ZERO) < 0) nbv = BigDecimal.ZERO

        Map assetMap = [
            fixedAssetId: fa.fixedAssetId,
            fixedAssetName: fa.fixedAssetName ?: fa.fixedAssetId,
            fixedAssetTypeId: fa.fixedAssetTypeId ?: "",
            fixedAssetTypeDesc: typeGv?.description ?: fa.fixedAssetTypeId,
            serialNumber: fa.serialNumber ?: "",
            purchaseCost: pCost,
            purchaseCostUomId: fa.purchaseCostUomId ?: "USD",
            salvageValue: sVal,
            depreciation: dep,
            netBookValue: nbv,
            dateAcquired: fa.dateAcquired?.toString() ?: "",
            dateLastServiced: fa.dateLastServiced?.toString() ?: "",
            dateNextService: fa.dateNextService?.toString() ?: "",
            expectedEndOfLife: fa.expectedEndOfLife?.toString() ?: "",
            actualEndOfLife: fa.actualEndOfLife?.toString() ?: ""
        ]

        // Maintenance records
        List maints = EntityQuery.use(delegator).from("FixedAssetMaint").where("fixedAssetId", fixedAssetId).queryList().collect {
            [
                maintHistSeqId: it.maintHistSeqId,
                statusId: it.statusId ?: "",
                maintenanceDate: it.maintenanceDate?.toString() ?: "",
                comments: it.comments ?: ""
            ]
        }

        // Depreciation Methods / Projections
        // Calculate Straight-Line Amortization Projection
        List depSchedule = []
        if (pCost.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal depreciableBase = pCost.subtract(sVal)
            if (depreciableBase.compareTo(BigDecimal.ZERO) > 0) {
                int usefulYears = 5
                if (fa.dateAcquired && fa.expectedEndOfLife) {
                    try {
                        long diffMs = fa.expectedEndOfLife.getTime() - fa.dateAcquired.getTime()
                        int calculatedYears = (int) Math.round(diffMs / (365.25 * 24 * 60 * 60 * 1000))
                        if (calculatedYears > 0) usefulYears = calculatedYears
                    } catch (Exception ignored) {}
                }

                BigDecimal annualDep = depreciableBase.divide(new BigDecimal(usefulYears), 2, RoundingMode.HALF_UP)
                BigDecimal currentNbv = pCost
                int startYear = fa.dateAcquired ? Integer.parseInt(fa.dateAcquired.toString().substring(0, 4)) : Calendar.getInstance().get(Calendar.YEAR)

                for (int y = 1; y <= usefulYears; y++) {
                    BigDecimal yearDep = (y == usefulYears) ? currentNbv.subtract(sVal) : annualDep
                    if (yearDep.compareTo(BigDecimal.ZERO) < 0) yearDep = BigDecimal.ZERO
                    currentNbv = currentNbv.subtract(yearDep)
                    if (currentNbv.compareTo(sVal) < 0) currentNbv = sVal

                    depSchedule.add([
                        yearNum: y,
                        calendarYear: startYear + y - 1,
                        depreciationAmount: yearDep,
                        accumulatedDepreciation: pCost.subtract(currentNbv),
                        endingBookValue: currentNbv
                    ])
                }
            }
        }

        request.setAttribute("asset", assetMap)
        request.setAttribute("maintenances", maints)
        request.setAttribute("depreciationSchedule", depSchedule)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFixedAssetDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. createFixedAsset
 * Registers a new fixed asset.
 */
String createFixedAsset() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String fixedAssetName = parameters.fixedAssetName?.trim()
        String fixedAssetTypeId = parameters.fixedAssetTypeId?.trim()
        String fixedAssetId = parameters.fixedAssetId?.trim()

        if (UtilValidate.isEmpty(fixedAssetName) || UtilValidate.isEmpty(fixedAssetTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Varlık Adı ve Varlık Türü zorunludur.")
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            fixedAssetName: fixedAssetName,
            fixedAssetTypeId: fixedAssetTypeId,
            purchaseCostUomId: parameters.purchaseCostUomId?.trim() ?: "USD",
            serialNumber: parameters.serialNumber?.trim() ?: ""
        ]

        if (UtilValidate.isNotEmpty(fixedAssetId)) {
            serviceIn.fixedAssetId = fixedAssetId
        }
        if (parameters.purchaseCost != null && !parameters.purchaseCost.toString().trim().isEmpty()) {
            serviceIn.purchaseCost = new BigDecimal(parameters.purchaseCost.toString())
        }
        if (parameters.salvageValue != null && !parameters.salvageValue.toString().trim().isEmpty()) {
            serviceIn.salvageValue = new BigDecimal(parameters.salvageValue.toString())
        }
        if (parameters.dateAcquired != null) {
            serviceIn.dateAcquired = parseTimestamp(parameters.dateAcquired) ?: UtilDateTime.nowTimestamp()
        }
        if (parameters.expectedEndOfLife != null) {
            serviceIn.expectedEndOfLife = parseSqlDate(parameters.expectedEndOfLife)
        }

        Map createRes = dispatcher.runSync("createFixedAsset", serviceIn)
        if (ServiceUtil.isError(createRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(createRes))
            return "error"
        }

        String newAssetId = createRes.fixedAssetId ?: fixedAssetId
        request.setAttribute("fixedAssetId", newAssetId)
        request.setAttribute("_EVENT_MESSAGE_", "Duran varlık başarıyla kaydedildi: " + newAssetId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFixedAsset: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 9. updateFixedAsset
 * Updates asset information.
 */
String updateFixedAsset() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (UtilValidate.isEmpty(fixedAssetId)) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId zorunludur.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FixedAsset").where("fixedAssetId", fixedAssetId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Duran varlık bulunamadı: " + fixedAssetId)
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            fixedAssetId: fixedAssetId,
            fixedAssetTypeId: parameters.fixedAssetTypeId?.trim() ?: fa.fixedAssetTypeId
        ]

        if (parameters.fixedAssetName != null) serviceIn.fixedAssetName = parameters.fixedAssetName.toString().trim()
        if (parameters.serialNumber != null) serviceIn.serialNumber = parameters.serialNumber.toString().trim()
        if (parameters.purchaseCost != null) serviceIn.purchaseCost = new BigDecimal(parameters.purchaseCost.toString())
        if (parameters.salvageValue != null) serviceIn.salvageValue = new BigDecimal(parameters.salvageValue.toString())
        if (parameters.depreciation != null) serviceIn.depreciation = new BigDecimal(parameters.depreciation.toString())
        if (parameters.expectedEndOfLife != null) serviceIn.expectedEndOfLife = parseSqlDate(parameters.expectedEndOfLife)

        Map updateRes = dispatcher.runSync("updateFixedAsset", serviceIn)
        if (ServiceUtil.isError(updateRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(updateRes))
            return "error"
        }

        request.setAttribute("fixedAssetId", fixedAssetId)
        request.setAttribute("_EVENT_MESSAGE_", "Duran varlık güncellendi: " + fixedAssetId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateFixedAsset: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 10. calculateDepreciation
 * Calculates and records depreciation on the fixed asset.
 */
String calculateDepreciation() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String fixedAssetId = parameters.fixedAssetId?.trim()
        if (UtilValidate.isEmpty(fixedAssetId)) {
            request.setAttribute("_ERROR_MESSAGE_", "fixedAssetId zorunludur.")
            return "error"
        }

        GenericValue fa = EntityQuery.use(delegator).from("FixedAsset").where("fixedAssetId", fixedAssetId).queryOne()
        if (!fa) {
            request.setAttribute("_ERROR_MESSAGE_", "Duran varlık bulunamadı: " + fixedAssetId)
            return "error"
        }

        BigDecimal pCost = fa.purchaseCost ?: BigDecimal.ZERO
        BigDecimal sVal = fa.salvageValue ?: BigDecimal.ZERO
        BigDecimal currentDep = fa.depreciation ?: BigDecimal.ZERO

        BigDecimal depToAdd = BigDecimal.ZERO
        if (parameters.depreciationAmount != null && !parameters.depreciationAmount.toString().trim().isEmpty()) {
            depToAdd = new BigDecimal(parameters.depreciationAmount.toString())
        } else {
            // Default 1-year straight-line depreciation
            BigDecimal depreciableBase = pCost.subtract(sVal)
            if (depreciableBase.compareTo(BigDecimal.ZERO) > 0) {
                int usefulYears = 5
                depToAdd = depreciableBase.divide(new BigDecimal(usefulYears), 2, RoundingMode.HALF_UP)
            }
        }

        BigDecimal newTotalDep = currentDep.add(depToAdd)
        if (newTotalDep.compareTo(pCost.subtract(sVal)) > 0) {
            newTotalDep = pCost.subtract(sVal)
        }

        fa.depreciation = newTotalDep
        fa.store()

        request.setAttribute("fixedAssetId", fixedAssetId)
        request.setAttribute("depreciationAdded", depToAdd)
        request.setAttribute("totalDepreciation", newTotalDep)
        request.setAttribute("_EVENT_MESSAGE_", "Amortisman tutarı kaydedildi: " + depToAdd + " | Toplam: " + newTotalDep)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in calculateDepreciation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// BUDGETS (Bütçeler & Kalemler)
// ==========================================

/**
 * 11. getBudgets
 * Lists budgets with period, latest status, and total budgeted amount.
 */
String getBudgets() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String budgetTypeId = parameters.budgetTypeId?.trim()
        String statusId = parameters.statusId?.trim()

        int viewIndex = 0
        int viewSize = 50
        try {
            if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString())
            if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString())
        } catch (Exception ignored) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(search)) {
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("budgetId", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("comments", EntityOperator.LIKE, "%" + search + "%")
            ], EntityOperator.OR))
        }
        if (UtilValidate.isNotEmpty(budgetTypeId)) {
            conditions.add(EntityCondition.makeCondition("budgetTypeId", EntityOperator.EQUALS, budgetTypeId))
        }

        def query = EntityQuery.use(delegator).from("Budget")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List<GenericValue> rawBudgets = query.orderBy("budgetId DESC").queryList()

        BigDecimal totalBudgetedAmount = BigDecimal.ZERO

        List budgets = []
        rawBudgets.each { b ->
            String bId = b.budgetId

            // Latest status
            GenericValue st = EntityQuery.use(delegator).from("BudgetStatus")
                .where("budgetId", bId)
                .orderBy("statusDate DESC")
                .queryFirst()

            String curStatusId = st?.statusId ?: "BG_CREATED"
            if (UtilValidate.isNotEmpty(statusId) && !curStatusId.equals(statusId)) {
                return
            }

            GenericValue stItem = EntityQuery.use(delegator).from("StatusItem").where("statusId", curStatusId).queryOne()
            String statusDesc = stItem?.description ?: curStatusId

            GenericValue bType = b.getRelatedOne("BudgetType", false)
            String bTypeDesc = bType?.description ?: b.budgetTypeId

            GenericValue ctp = b.getRelatedOne("CustomTimePeriod", false)
            String periodDesc = ctp ? "Dönem " + (ctp.periodNum ?: "") + " (" + (ctp.fromDate ? ctp.fromDate.toString().substring(0, 10) : "") + ")" : (b.customTimePeriodId ?: "")

            // Sum of budget items
            List items = EntityQuery.use(delegator).from("BudgetItem").where("budgetId", bId).queryList()
            BigDecimal bTotal = BigDecimal.ZERO
            items.each { item ->
                if (item.amount) bTotal = bTotal.add(item.amount)
            }

            totalBudgetedAmount = totalBudgetedAmount.add(bTotal)

            budgets.add([
                budgetId: bId,
                budgetTypeId: b.budgetTypeId ?: "",
                budgetTypeDesc: bTypeDesc,
                customTimePeriodId: b.customTimePeriodId ?: "",
                periodDesc: periodDesc,
                comments: b.comments ?: "",
                statusId: curStatusId,
                statusDesc: statusDesc,
                totalAmount: bTotal,
                itemCount: items.size()
            ])
        }

        int totalCount = budgets.size()
        int fromIdx = Math.min(viewIndex * viewSize, totalCount)
        int toIdx = Math.min(fromIdx + viewSize, totalCount)
        List pagedList = fromIdx < totalCount ? budgets.subList(fromIdx, toIdx) : []

        request.setAttribute("budgets", pagedList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("totalBudgetedAmount", totalBudgetedAmount)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBudgets: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 12. getBudgetDetails
 * Returns budget header, item breakdown, and status history.
 */
String getBudgetDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String budgetId = parameters.budgetId?.trim()
        if (UtilValidate.isEmpty(budgetId)) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId zorunludur.")
            return "error"
        }

        GenericValue b = EntityQuery.use(delegator).from("Budget").where("budgetId", budgetId).queryOne()
        if (!b) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe bulunamadı: " + budgetId)
            return "error"
        }

        GenericValue bType = b.getRelatedOne("BudgetType", false)
        GenericValue ctp = b.getRelatedOne("CustomTimePeriod", false)
        String periodDesc = ctp ? "Dönem " + (ctp.periodNum ?: "") + " (" + (ctp.fromDate ? ctp.fromDate.toString().substring(0, 10) : "") + " - " + (ctp.thruDate ? ctp.thruDate.toString().substring(0, 10) : "") + ")" : ""

        // Status history
        List statuses = EntityQuery.use(delegator).from("BudgetStatus")
            .where("budgetId", budgetId)
            .orderBy("statusDate DESC")
            .queryList().collect {
                GenericValue si = EntityQuery.use(delegator).from("StatusItem").where("statusId", it.statusId).queryOne()
                [
                    statusId: it.statusId,
                    statusDesc: si?.description ?: it.statusId,
                    statusDate: it.statusDate?.toString() ?: "",
                    comments: it.comments ?: "",
                    changeByUserLoginId: it.changeByUserLoginId ?: ""
                ]
            }

        String currentStatusId = statuses.isEmpty() ? "BG_CREATED" : statuses[0].statusId
        String currentStatusDesc = statuses.isEmpty() ? "Created" : statuses[0].statusDesc

        // Budget Items
        List items = EntityQuery.use(delegator).from("BudgetItem").where("budgetId", budgetId).orderBy("budgetItemSeqId ASC").queryList().collect { itm ->
            GenericValue bit = itm.getRelatedOne("BudgetItemType", false)
            [
                budgetId: itm.budgetId,
                budgetItemSeqId: itm.budgetItemSeqId,
                budgetItemTypeId: itm.budgetItemTypeId ?: "",
                budgetItemTypeDesc: bit?.description ?: itm.budgetItemTypeId,
                amount: itm.amount ?: BigDecimal.ZERO,
                purpose: itm.purpose ?: "",
                justification: itm.justification ?: ""
            ]
        }

        BigDecimal totalBudget = BigDecimal.ZERO
        items.each { totalBudget = totalBudget.add((BigDecimal) it.amount) }

        Map budgetMap = [
            budgetId: b.budgetId,
            budgetTypeId: b.budgetTypeId ?: "",
            budgetTypeDesc: bType?.description ?: b.budgetTypeId,
            customTimePeriodId: b.customTimePeriodId ?: "",
            periodDesc: periodDesc,
            comments: b.comments ?: "",
            statusId: currentStatusId,
            statusDesc: currentStatusDesc,
            totalAmount: totalBudget
        ]

        request.setAttribute("budget", budgetMap)
        request.setAttribute("items", items)
        request.setAttribute("statuses", statuses)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getBudgetDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 13. createBudget
 * Creates a new budget and registers initial BG_CREATED status.
 */
String createBudget() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String budgetTypeId = parameters.budgetTypeId?.trim()
        String customTimePeriodId = parameters.customTimePeriodId?.trim()
        String budgetId = parameters.budgetId?.trim()
        String comments = parameters.comments?.trim() ?: ""

        if (UtilValidate.isEmpty(budgetTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe Türü seçilmelidir.")
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            budgetTypeId: budgetTypeId,
            comments: comments
        ]
        if (UtilValidate.isNotEmpty(budgetId)) serviceIn.budgetId = budgetId
        if (UtilValidate.isNotEmpty(customTimePeriodId)) serviceIn.customTimePeriodId = customTimePeriodId

        Map createRes = dispatcher.runSync("createBudget", serviceIn)
        if (ServiceUtil.isError(createRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(createRes))
            return "error"
        }

        String newBudgetId = createRes.budgetId ?: budgetId

        request.setAttribute("budgetId", newBudgetId)
        request.setAttribute("_EVENT_MESSAGE_", "Bütçe başarıyla oluşturuldu: " + newBudgetId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBudget: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 14. createBudgetItem
 * Adds a new item/line to a budget.
 */
String createBudgetItem() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String budgetId = parameters.budgetId?.trim()
        String budgetItemTypeId = parameters.budgetItemTypeId?.trim() ?: "REQUIREMENT_BUDGET_A"
        String amountStr = parameters.amount?.toString()?.trim()
        String purpose = parameters.purpose?.trim() ?: ""
        String justification = parameters.justification?.trim() ?: ""

        if (UtilValidate.isEmpty(budgetId) || UtilValidate.isEmpty(amountStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "Bütçe No ve Tutar zorunludur.")
            return "error"
        }

        BigDecimal amount = new BigDecimal(amountStr)

        Map serviceIn = [
            userLogin: uL,
            budgetId: budgetId,
            budgetItemTypeId: budgetItemTypeId,
            amount: amount,
            purpose: purpose,
            justification: justification
        ]

        Map itemRes = dispatcher.runSync("createBudgetItem", serviceIn)
        if (ServiceUtil.isError(itemRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(itemRes))
            return "error"
        }

        request.setAttribute("budgetId", budgetId)
        request.setAttribute("budgetItemSeqId", itemRes.budgetItemSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Bütçe kalemi eklendi: " + itemRes.budgetItemSeqId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBudgetItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 15. setBudgetStatus
 * Updates the budget status (BG_REVIEWED, BG_APPROVED, BG_REJECTED).
 */
String setBudgetStatus() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String budgetId = parameters.budgetId?.trim()
        String statusId = parameters.statusId?.trim()
        String comments = parameters.comments?.trim() ?: ""

        if (UtilValidate.isEmpty(budgetId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "budgetId ve statusId zorunludur.")
            return "error"
        }

        Map statusRes = dispatcher.runSync("updateBudgetStatus", [
            userLogin: uL,
            budgetId: budgetId,
            statusId: statusId,
            statusDate: UtilDateTime.nowTimestamp(),
            comments: comments
        ])

        if (ServiceUtil.isError(statusRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(statusRes))
            return "error"
        }

        request.setAttribute("budgetId", budgetId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("_EVENT_MESSAGE_", "Bütçe durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setBudgetStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// AGREEMENTS (Sözleşmeler)
// ==========================================

/**
 * 16. getAgreements
 * Lists contracts and agreements with parties, dates, and types.
 */
String getAgreements() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String agreementTypeId = parameters.agreementTypeId?.trim()

        int viewIndex = 0
        int viewSize = 50
        try {
            if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString())
            if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString())
        } catch (Exception ignored) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(search)) {
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("agreementId", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("description", EntityOperator.LIKE, "%" + search + "%")
            ], EntityOperator.OR))
        }
        if (UtilValidate.isNotEmpty(agreementTypeId)) {
            conditions.add(EntityCondition.makeCondition("agreementTypeId", EntityOperator.EQUALS, agreementTypeId))
        }

        def query = EntityQuery.use(delegator).from("Agreement")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List<GenericValue> rawAgreements = query.orderBy("agreementId DESC").queryList()

        List agreements = rawAgreements.collect { ag ->
            GenericValue at = ag.getRelatedOne("AgreementType", false)
            String typeDesc = at?.description ?: ag.agreementTypeId

            [
                agreementId: ag.agreementId,
                agreementTypeId: ag.agreementTypeId ?: "",
                agreementTypeDesc: typeDesc,
                partyIdFrom: ag.partyIdFrom ?: "",
                partyFromDesc: getPartyName(delegator, ag.partyIdFrom),
                partyIdTo: ag.partyIdTo ?: "",
                partyToDesc: getPartyName(delegator, ag.partyIdTo),
                description: ag.description ?: "",
                statusId: ag.statusId ?: "AGR_ACTIVE",
                agreementDate: ag.agreementDate?.toString() ?: "",
                fromDate: ag.fromDate?.toString() ?: "",
                thruDate: ag.thruDate?.toString() ?: ""
            ]
        }

        int totalCount = agreements.size()
        int fromIdx = Math.min(viewIndex * viewSize, totalCount)
        int toIdx = Math.min(fromIdx + viewSize, totalCount)
        List pagedList = fromIdx < totalCount ? agreements.subList(fromIdx, toIdx) : []

        request.setAttribute("agreements", pagedList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAgreements: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 17. getAgreementDetails
 * Returns agreement header, terms, and items.
 */
String getAgreementDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementId = parameters.agreementId?.trim()
        if (UtilValidate.isEmpty(agreementId)) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId zorunludur.")
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
            agreementDate: ag.agreementDate?.toString() ?: "",
            fromDate: ag.fromDate?.toString() ?: "",
            thruDate: ag.thruDate?.toString() ?: ""
        ]

        // Terms
        List terms = EntityQuery.use(delegator).from("AgreementTerm").where("agreementId", agreementId).queryList().collect {
            [
                agreementTermId: it.agreementTermId,
                termTypeId: it.termTypeId,
                termValue: it.termValue ?: BigDecimal.ZERO,
                termDays: it.termDays ?: 0,
                description: it.description ?: ""
            ]
        }

        // Items
        List items = EntityQuery.use(delegator).from("AgreementItem").where("agreementId", agreementId).queryList().collect {
            [
                agreementItemSeqId: it.agreementItemSeqId,
                agreementItemTypeId: it.agreementItemTypeId ?: "",
                currencyUomId: it.currencyUomId ?: "",
                agreementText: it.agreementText ?: ""
            ]
        }

        request.setAttribute("agreement", agreementMap)
        request.setAttribute("terms", terms)
        request.setAttribute("items", items)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAgreementDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 18. createAgreement
 * Creates a new agreement.
 */
String createAgreement() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String agreementTypeId = parameters.agreementTypeId?.trim() ?: "SALES_AGREEMENT"
        String partyIdFrom = parameters.partyIdFrom?.trim() ?: "Company"
        String partyIdTo = parameters.partyIdTo?.trim()
        String agreementId = parameters.agreementId?.trim()
        String description = parameters.description?.trim() ?: ""
        String textData = parameters.textData?.trim() ?: ""

        if (UtilValidate.isEmpty(partyIdTo)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sözleşme tarafı (partyIdTo) zorunludur.")
            return "error"
        }

        // Ensure party roles exist
        String roleFrom = "INTERNAL_ORGANIZATIO"
        String roleTo = "CUSTOMER"
        try {
            if (!EntityQuery.use(delegator).from("PartyRole").where("partyId", partyIdFrom, "roleTypeId", roleFrom).queryOne()) {
                delegator.makeValue("PartyRole", [partyId: partyIdFrom, roleTypeId: roleFrom]).create()
            }
            if (!EntityQuery.use(delegator).from("PartyRole").where("partyId", partyIdTo, "roleTypeId", roleTo).queryOne()) {
                delegator.makeValue("PartyRole", [partyId: partyIdTo, roleTypeId: roleTo]).create()
            }
        } catch (Exception ignored) {}

        Timestamp agDate = parseTimestamp(parameters.agreementDate) ?: UtilDateTime.nowTimestamp()
        Timestamp fromDate = parseTimestamp(parameters.fromDate) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        Map serviceIn = [
            userLogin: uL,
            agreementTypeId: agreementTypeId,
            partyIdFrom: partyIdFrom,
            partyIdTo: partyIdTo,
            roleTypeIdFrom: roleFrom,
            roleTypeIdTo: roleTo,
            agreementDate: agDate,
            fromDate: fromDate,
            thruDate: thruDate,
            description: description,
            textData: textData,
            statusId: "AGR_ACTIVE"
        ]

        if (UtilValidate.isNotEmpty(agreementId)) serviceIn.agreementId = agreementId

        Map createRes = dispatcher.runSync("createAgreement", serviceIn)
        if (ServiceUtil.isError(createRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(createRes))
            return "error"
        }

        String newAgreementId = createRes.agreementId ?: agreementId
        request.setAttribute("agreementId", newAgreementId)
        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme başarıyla oluşturuldu: " + newAgreementId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createAgreement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 19. updateAgreement
 * Updates agreement status, thruDate, or description.
 */
String updateAgreement() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String agreementId = parameters.agreementId?.trim()
        if (UtilValidate.isEmpty(agreementId)) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementId zorunludur.")
            return "error"
        }

        GenericValue ag = EntityQuery.use(delegator).from("Agreement").where("agreementId", agreementId).queryOne()
        if (!ag) {
            request.setAttribute("_ERROR_MESSAGE_", "Sözleşme bulunamadı: " + agreementId)
            return "error"
        }

        Map serviceIn = [
            userLogin: uL,
            agreementId: agreementId
        ]

        if (parameters.description != null) serviceIn.description = parameters.description.toString().trim()
        if (parameters.textData != null) serviceIn.textData = parameters.textData.toString().trim()
        if (parameters.statusId != null) serviceIn.statusId = parameters.statusId.toString().trim()
        if (parameters.thruDate != null) serviceIn.thruDate = parseTimestamp(parameters.thruDate)

        Map updateRes = dispatcher.runSync("updateAgreement", serviceIn)
        if (ServiceUtil.isError(updateRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(updateRes))
            return "error"
        }

        request.setAttribute("agreementId", agreementId)
        request.setAttribute("_EVENT_MESSAGE_", "Sözleşme güncellendi: " + agreementId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateAgreement: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
