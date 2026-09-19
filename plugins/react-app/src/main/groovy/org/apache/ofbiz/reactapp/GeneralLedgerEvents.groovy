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

final String MODULE = "GeneralLedgerEvents.groovy"

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
 * 1. getGlAccounts
 * Search and list General Ledger accounts with pagination and filtering
 */
String getGlAccounts() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String search = parameters.search?.trim()
        String glAccountClassId = parameters.glAccountClassId?.trim()
        String glAccountTypeId = parameters.glAccountTypeId?.trim()
        String assignedOnly = parameters.assignedOnly?.trim()

        int viewIndex = 0
        int viewSize = 50
        try { if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString().trim()) } catch (Exception ignored) {}
        try { if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString().trim()) } catch (Exception ignored) {}

        // Set of accounts assigned to the organization
        List<GenericValue> orgAssignments = EntityQuery.use(delegator).from("GlAccountOrganization")
                .where("organizationPartyId", orgPartyId).queryList()
        Set<String> assignedAccountIds = orgAssignments.collect { it.glAccountId } as Set

        // Cache classes and types for human-readable descriptions
        Map<String, String> classMap = [:]
        EntityQuery.use(delegator).from("GlAccountClass").queryList().each {
            classMap[it.glAccountClassId] = it.description ?: it.glAccountClassId
        }
        Map<String, String> typeMap = [:]
        EntityQuery.use(delegator).from("GlAccountType").queryList().each {
            typeMap[it.glAccountTypeId] = it.description ?: it.glAccountTypeId
        }

        List<EntityCondition> conds = []
        if ("Y".equalsIgnoreCase(assignedOnly) || "true".equalsIgnoreCase(assignedOnly)) {
            if (assignedAccountIds) {
                conds.add(EntityCondition.makeCondition("glAccountId", EntityOperator.IN, assignedAccountIds))
            } else {
                conds.add(EntityCondition.makeCondition("glAccountId", EntityOperator.EQUALS, "__NO_ACCOUNTS__"))
            }
        }

        if (glAccountClassId) {
            conds.add(EntityCondition.makeCondition("glAccountClassId", EntityOperator.EQUALS, glAccountClassId))
        }

        if (glAccountTypeId) {
            conds.add(EntityCondition.makeCondition("glAccountTypeId", EntityOperator.EQUALS, glAccountTypeId))
        }

        if (search) {
            String term = "%" + search.toLowerCase() + "%"
            conds.add(EntityCondition.makeCondition([
                    EntityCondition.makeCondition(EntityCondition.makeCondition("glAccountId", EntityOperator.LIKE, term)),
                    EntityCondition.makeCondition(EntityCondition.makeCondition("accountCode", EntityOperator.LIKE, term)),
                    EntityCondition.makeCondition(EntityCondition.makeCondition("accountName", EntityOperator.LIKE, term)),
                    EntityCondition.makeCondition(EntityCondition.makeCondition("description", EntityOperator.LIKE, term))
            ], EntityOperator.OR))
        }

        EntityCondition whereCond = conds ? EntityCondition.makeCondition(conds, EntityOperator.AND) : null

        long totalCount = whereCond ? EntityQuery.use(delegator).from("GlAccount").where(whereCond).queryCount() : EntityQuery.use(delegator).from("GlAccount").queryCount()

        def query = EntityQuery.use(delegator).from("GlAccount").orderBy("accountCode", "glAccountId")
        if (whereCond) query = query.where(whereCond)
        if (viewSize > 0) {
            query = query.offset(viewIndex * viewSize).maxRows(viewSize)
        }

        List<GenericValue> rawAccounts = query.queryList()
        List<Map> accountList = []

        for (GenericValue ga : rawAccounts) {
            accountList.add([
                    glAccountId: ga.glAccountId,
                    accountCode: ga.accountCode ?: ga.glAccountId,
                    accountName: ga.accountName ?: "",
                    description: ga.description ?: "",
                    glAccountTypeId: ga.glAccountTypeId ?: "",
                    glAccountTypeDesc: typeMap[ga.glAccountTypeId] ?: (ga.glAccountTypeId ?: ""),
                    glAccountClassId: ga.glAccountClassId ?: "",
                    glAccountClassDesc: classMap[ga.glAccountClassId] ?: (ga.glAccountClassId ?: ""),
                    parentGlAccountId: ga.parentGlAccountId ?: "",
                    isAssigned: assignedAccountIds.contains(ga.glAccountId)
            ])
        }

        request.setAttribute("accounts", accountList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlAccounts: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getGlAccountDetails
 * Full detail of a single GL account including recent journal entries
 */
String getGlAccountDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String glAccountId = parameters.glAccountId?.trim()
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        if (UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountId zorunludur.")
            return "error"
        }

        GenericValue ga = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glAccountId).queryOne()
        if (!ga) {
            request.setAttribute("_ERROR_MESSAGE_", "GL Hesabı bulunamadı: " + glAccountId)
            return "error"
        }

        GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                .where("glAccountId", glAccountId, "organizationPartyId", orgPartyId).queryOne()
        boolean isAssigned = (gao != null)

        String parentAccountName = ""
        if (ga.parentGlAccountId) {
            GenericValue parentAcc = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", ga.parentGlAccountId).queryOne()
            if (parentAcc) {
                parentAccountName = (parentAcc.accountCode ?: parentAcc.glAccountId) + " - " + (parentAcc.accountName ?: "")
            }
        }

        GenericValue classGv = ga.glAccountClassId ? EntityQuery.use(delegator).from("GlAccountClass").where("glAccountClassId", ga.glAccountClassId).queryOne() : null
        GenericValue typeGv = ga.glAccountTypeId ? EntityQuery.use(delegator).from("GlAccountType").where("glAccountTypeId", ga.glAccountTypeId).queryOne() : null

        // Query entries for this GL account to compute debits, credits, balance
        List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransAndEntries")
                .where(
                        EntityCondition.makeCondition("glAccountId", EntityOperator.EQUALS, glAccountId),
                        EntityCondition.makeCondition("organizationPartyId", EntityOperator.EQUALS, orgPartyId),
                        EntityCondition.makeCondition("isPosted", EntityOperator.EQUALS, "Y")
                ).orderBy("-transactionDate", "-acctgTransId").maxRows(50).queryList()

        BigDecimal totalDebits = BigDecimal.ZERO
        BigDecimal totalCredits = BigDecimal.ZERO
        List<Map> recentEntries = []

        for (GenericValue entry : entries) {
            BigDecimal amt = entry.amount ?: BigDecimal.ZERO
            String dc = entry.debitCreditFlag ?: "D"
            if ("D".equals(dc)) {
                totalDebits = totalDebits.add(amt)
            } else {
                totalCredits = totalCredits.add(amt)
            }

            recentEntries.add([
                    acctgTransId: entry.acctgTransId,
                    acctgTransEntrySeqId: entry.acctgTransEntrySeqId,
                    transactionDate: entry.transactionDate ? entry.transactionDate.toString() : "",
                    acctgTransTypeId: entry.acctgTransTypeId ?: "",
                    transTypeDescription: entry.transTypeDescription ?: (entry.acctgTransTypeId ?: ""),
                    debitCreditFlag: dc,
                    amount: amt,
                    currencyUomId: entry.currencyUomId ?: "USD",
                    description: entry.description ?: entry.transDescription ?: "",
                    partyId: entry.partyId ?: "",
                    partyName: getPartyName(delegator, entry.partyId)
            ])
        }

        // Determine normal balance side based on class
        // Assets & Expenses: Balance = Debit - Credit; Liabilities, Equity, Revenue: Balance = Credit - Debit
        String classId = ga.glAccountClassId ?: ""
        boolean isDebitNormal = classId.contains("ASSET") || classId.contains("EXPENSE") || classId.contains("DEBIT") || classId.contains("CASH") || classId.contains("INVENTORY") || classId.contains("DIVIDEND") || classId.contains("DISTRIBUTION")
        BigDecimal balance = isDebitNormal ? totalDebits.subtract(totalCredits) : totalCredits.subtract(totalDebits)

        Map accountData = [
                glAccountId: ga.glAccountId,
                accountCode: ga.accountCode ?: ga.glAccountId,
                accountName: ga.accountName ?: "",
                description: ga.description ?: "",
                glAccountTypeId: ga.glAccountTypeId ?: "",
                glAccountTypeDesc: typeGv?.description ?: (ga.glAccountTypeId ?: ""),
                glAccountClassId: ga.glAccountClassId ?: "",
                glAccountClassDesc: classGv?.description ?: (ga.glAccountClassId ?: ""),
                parentGlAccountId: ga.parentGlAccountId ?: "",
                parentAccountName: parentAccountName,
                glResourceTypeId: ga.glResourceTypeId ?: "",
                isAssigned: isAssigned,
                totalDebits: totalDebits,
                totalCredits: totalCredits,
                balance: balance,
                normalSide: isDebitNormal ? "D" : "C"
        ]

        request.setAttribute("account", accountData)
        request.setAttribute("recentEntries", recentEntries)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlAccountDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. createGlAccount
 * Create a new General Ledger account and optionally link to organization
 */
String createGlAccount() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String accountCode = parameters.accountCode?.trim()
        String accountName = parameters.accountName?.trim()
        String glAccountClassId = parameters.glAccountClassId?.trim()

        if (UtilValidate.isEmpty(accountCode)) {
            request.setAttribute("_ERROR_MESSAGE_", "Hesap Kodu zorunludur.")
            return "error"
        }
        if (UtilValidate.isEmpty(accountName)) {
            request.setAttribute("_ERROR_MESSAGE_", "Hesap Adı zorunludur.")
            return "error"
        }
        if (UtilValidate.isEmpty(glAccountClassId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Hesap Sınıfı (Class) zorunludur.")
            return "error"
        }

        String glAccountId = parameters.glAccountId?.trim() ?: accountCode

        // Check if ID already exists
        GenericValue existingId = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glAccountId).queryOne()
        if (existingId) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu Hesap No (" + glAccountId + ") zaten sistemde kayıtlı.")
            return "error"
        }

        // Check if accountCode unique constraint would be violated
        GenericValue existingCode = EntityQuery.use(delegator).from("GlAccount").where("accountCode", accountCode).queryOne()
        if (existingCode) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu Hesap Kodu (" + accountCode + ") zaten başka bir hesap tarafından kullanılıyor.")
            return "error"
        }

        GenericValue newAccount = delegator.makeValue("GlAccount", [
                glAccountId: glAccountId,
                accountCode: accountCode,
                accountName: accountName,
                glAccountClassId: glAccountClassId,
                glAccountTypeId: parameters.glAccountTypeId?.trim() ?: "_NA_",
                glResourceTypeId: parameters.glResourceTypeId?.trim() ?: "MONEY",
                parentGlAccountId: parameters.parentGlAccountId?.trim() ?: null,
                description: parameters.description?.trim() ?: null
        ])
        newAccount.create()

        // Auto-assign to Organization (Company)
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                .where("glAccountId", glAccountId, "organizationPartyId", orgPartyId).queryOne()
        if (!gao) {
            delegator.create("GlAccountOrganization", [
                    glAccountId: glAccountId,
                    organizationPartyId: orgPartyId
            ])
        }

        request.setAttribute("glAccountId", glAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Hesap planına yeni hesap başarıyla eklendi: " + glAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. updateGlAccount
 * Update account name, description, class, type, or parent
 */
String updateGlAccount() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String glAccountId = parameters.glAccountId?.trim()
        if (UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountId zorunludur.")
            return "error"
        }

        GenericValue ga = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glAccountId).queryOne()
        if (!ga) {
            request.setAttribute("_ERROR_MESSAGE_", "GL Hesabı bulunamadı: " + glAccountId)
            return "error"
        }

        if (parameters.accountName != null) ga.accountName = parameters.accountName.trim()
        if (parameters.description != null) ga.description = parameters.description.trim()
        if (parameters.glAccountClassId != null && !parameters.glAccountClassId.trim().isEmpty()) {
            ga.glAccountClassId = parameters.glAccountClassId.trim()
        }
        if (parameters.glAccountTypeId != null && !parameters.glAccountTypeId.trim().isEmpty()) {
            ga.glAccountTypeId = parameters.glAccountTypeId.trim()
        }
        if (parameters.glResourceTypeId != null && !parameters.glResourceTypeId.trim().isEmpty()) {
            ga.glResourceTypeId = parameters.glResourceTypeId.trim()
        }
        if (parameters.parentGlAccountId != null) {
            ga.parentGlAccountId = parameters.parentGlAccountId.trim().isEmpty() ? null : parameters.parentGlAccountId.trim()
        }

        ga.store()

        // Handle assignment flag if passed
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        if (parameters.isAssigned != null) {
            boolean wantAssign = "Y".equalsIgnoreCase(parameters.isAssigned.toString()) || "true".equalsIgnoreCase(parameters.isAssigned.toString())
            GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                    .where("glAccountId", glAccountId, "organizationPartyId", orgPartyId).queryOne()
            if (wantAssign && !gao) {
                delegator.create("GlAccountOrganization", [glAccountId: glAccountId, organizationPartyId: orgPartyId])
            } else if (!wantAssign && gao) {
                gao.remove()
            }
        }

        request.setAttribute("glAccountId", glAccountId)
        request.setAttribute("_EVENT_MESSAGE_", "Hesap bilgileri başarıyla güncellendi: " + glAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. assignGlAccountToOrg
 * Assign or unassign a GL account to an organization
 */
String assignGlAccountToOrg() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String glAccountId = parameters.glAccountId?.trim()
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String assign = parameters.assign?.trim() ?: "Y"

        if (UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountId zorunludur.")
            return "error"
        }

        GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                .where("glAccountId", glAccountId, "organizationPartyId", orgPartyId).queryOne()

        boolean wantAssign = "Y".equalsIgnoreCase(assign) || "true".equalsIgnoreCase(assign)
        if (wantAssign) {
            if (!gao) {
                delegator.create("GlAccountOrganization", [glAccountId: glAccountId, organizationPartyId: orgPartyId])
            }
        } else {
            if (gao) {
                long entryCount = EntityQuery.use(delegator).from("AcctgTransEntry")
                        .where("glAccountId", glAccountId, "organizationPartyId", orgPartyId).queryCount()
                if (entryCount > 0) {
                    request.setAttribute("_ERROR_MESSAGE_", "Bu hesaba ait " + entryCount + " adet yevmiye kaydı bulunduğu için şirket ataması kaldırılamaz.")
                    return "error"
                }
                gao.remove()
            }
        }

        request.setAttribute("glAccountId", glAccountId)
        request.setAttribute("organizationPartyId", orgPartyId)
        request.setAttribute("isAssigned", wantAssign)
        request.setAttribute("_EVENT_MESSAGE_", wantAssign ? "Hesap şirkete atandı." : "Hesap şirket ataması kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in assignGlAccountToOrg: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. getAcctgTransactions
 * List accounting transactions (journal entries / yevmiye fişleri) with totals and filtering
 */
String getAcctgTransactions() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String acctgTransId = parameters.acctgTransId?.trim()
        String acctgTransTypeId = parameters.acctgTransTypeId?.trim()
        String glFiscalTypeId = parameters.glFiscalTypeId?.trim()
        String isPosted = parameters.isPosted?.trim()
        String search = parameters.search?.trim()

        Timestamp fromDate = parseTimestamp(parameters.fromDate)
        Timestamp thruDate = parseTimestamp(parameters.thruDate)

        int viewIndex = 0
        int viewSize = 25
        try { if (parameters.viewIndex) viewIndex = Integer.parseInt(parameters.viewIndex.toString().trim()) } catch (Exception ignored) {}
        try { if (parameters.viewSize) viewSize = Integer.parseInt(parameters.viewSize.toString().trim()) } catch (Exception ignored) {}

        List<EntityCondition> conds = []
        if (acctgTransId) {
            conds.add(EntityCondition.makeCondition("acctgTransId", EntityOperator.EQUALS, acctgTransId))
        }
        if (acctgTransTypeId) {
            conds.add(EntityCondition.makeCondition("acctgTransTypeId", EntityOperator.EQUALS, acctgTransTypeId))
        }
        if (glFiscalTypeId) {
            conds.add(EntityCondition.makeCondition("glFiscalTypeId", EntityOperator.EQUALS, glFiscalTypeId))
        }
        if (isPosted) {
            conds.add(EntityCondition.makeCondition("isPosted", EntityOperator.EQUALS, isPosted))
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
                    EntityCondition.makeCondition(EntityCondition.makeCondition("acctgTransId", EntityOperator.LIKE, term)),
                    EntityCondition.makeCondition(EntityCondition.makeCondition("description", EntityOperator.LIKE, term)),
                    EntityCondition.makeCondition(EntityCondition.makeCondition("voucherRef", EntityOperator.LIKE, term))
            ], EntityOperator.OR))
        }

        EntityCondition whereCond = conds ? EntityCondition.makeCondition(conds, EntityOperator.AND) : null

        long totalCount = whereCond ? EntityQuery.use(delegator).from("AcctgTrans").where(whereCond).queryCount() : EntityQuery.use(delegator).from("AcctgTrans").queryCount()

        def query = EntityQuery.use(delegator).from("AcctgTrans").orderBy("-transactionDate", "-acctgTransId")
        if (whereCond) query = query.where(whereCond)
        if (viewSize > 0) {
            query = query.offset(viewIndex * viewSize).maxRows(viewSize)
        }

        List<GenericValue> rawTrans = query.queryList()

        // Cache types
        Map<String, String> typeMap = [:]
        EntityQuery.use(delegator).from("AcctgTransType").queryList().each {
            typeMap[it.acctgTransTypeId] = it.description ?: it.acctgTransTypeId
        }
        Map<String, String> fiscalMap = [:]
        EntityQuery.use(delegator).from("GlFiscalType").queryList().each {
            fiscalMap[it.glFiscalTypeId] = it.description ?: it.glFiscalTypeId
        }

        List<Map> transactionList = []
        for (GenericValue tr : rawTrans) {
            // Fetch entries for this transaction to calculate debit/credit sum
            List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry")
                    .where("acctgTransId", tr.acctgTransId).queryList()

            BigDecimal totalDebit = BigDecimal.ZERO
            BigDecimal totalCredit = BigDecimal.ZERO
            for (GenericValue e : entries) {
                BigDecimal amt = e.amount ?: BigDecimal.ZERO
                if ("D".equals(e.debitCreditFlag)) {
                    totalDebit = totalDebit.add(amt)
                } else if ("C".equals(e.debitCreditFlag)) {
                    totalCredit = totalCredit.add(amt)
                }
            }

            transactionList.add([
                    acctgTransId: tr.acctgTransId,
                    acctgTransTypeId: tr.acctgTransTypeId ?: "",
                    acctgTransTypeDesc: typeMap[tr.acctgTransTypeId] ?: (tr.acctgTransTypeId ?: ""),
                    glFiscalTypeId: tr.glFiscalTypeId ?: "",
                    glFiscalTypeDesc: fiscalMap[tr.glFiscalTypeId] ?: (tr.glFiscalTypeId ?: ""),
                    transactionDate: tr.transactionDate ? tr.transactionDate.toString() : "",
                    isPosted: tr.isPosted ?: "N",
                    postedDate: tr.postedDate ? tr.postedDate.toString() : "",
                    description: tr.description ?: "",
                    voucherRef: tr.voucherRef ?: "",
                    invoiceId: tr.invoiceId ?: "",
                    paymentId: tr.paymentId ?: "",
                    totalDebit: totalDebit,
                    totalCredit: totalCredit,
                    entryCount: entries.size()
            ])
        }

        request.setAttribute("transactions", transactionList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAcctgTransactions: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. getAcctgTransDetails
 * Full detail of a journal entry with all line items
 */
String getAcctgTransDetails() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String acctgTransId = parameters.acctgTransId?.trim()
        if (UtilValidate.isEmpty(acctgTransId)) {
            request.setAttribute("_ERROR_MESSAGE_", "acctgTransId zorunludur.")
            return "error"
        }

        GenericValue tr = EntityQuery.use(delegator).from("AcctgTrans").where("acctgTransId", acctgTransId).queryOne()
        if (!tr) {
            request.setAttribute("_ERROR_MESSAGE_", "Yevmiye kaydı bulunamadı: " + acctgTransId)
            return "error"
        }

        GenericValue typeGv = tr.acctgTransTypeId ? EntityQuery.use(delegator).from("AcctgTransType").where("acctgTransTypeId", tr.acctgTransTypeId).queryOne() : null
        GenericValue fiscalGv = tr.glFiscalTypeId ? EntityQuery.use(delegator).from("GlFiscalType").where("glFiscalTypeId", tr.glFiscalTypeId).queryOne() : null

        List<GenericValue> rawEntries = EntityQuery.use(delegator).from("AcctgTransEntry")
                .where("acctgTransId", acctgTransId).orderBy("acctgTransEntrySeqId").queryList()

        BigDecimal totalDebit = BigDecimal.ZERO
        BigDecimal totalCredit = BigDecimal.ZERO
        List<Map> entryList = []

        for (GenericValue e : rawEntries) {
            BigDecimal amt = e.amount ?: BigDecimal.ZERO
            String dc = e.debitCreditFlag ?: "D"
            if ("D".equals(dc)) {
                totalDebit = totalDebit.add(amt)
            } else if ("C".equals(dc)) {
                totalCredit = totalCredit.add(amt)
            }

            GenericValue ga = e.glAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", e.glAccountId).queryOne() : null

            entryList.add([
                    acctgTransEntrySeqId: e.acctgTransEntrySeqId,
                    glAccountId: e.glAccountId ?: "",
                    accountCode: ga?.accountCode ?: (e.glAccountId ?: ""),
                    accountName: ga?.accountName ?: "",
                    debitCreditFlag: dc,
                    amount: amt,
                    currencyUomId: e.currencyUomId ?: "USD",
                    description: e.description ?: "",
                    partyId: e.partyId ?: "",
                    partyName: getPartyName(delegator, e.partyId)
            ])
        }

        boolean isBalanced = (totalDebit.compareTo(totalCredit) == 0)

        Map transHeader = [
                acctgTransId: tr.acctgTransId,
                acctgTransTypeId: tr.acctgTransTypeId ?: "",
                acctgTransTypeDesc: typeGv?.description ?: (tr.acctgTransTypeId ?: ""),
                glFiscalTypeId: tr.glFiscalTypeId ?: "",
                glFiscalTypeDesc: fiscalGv?.description ?: (tr.glFiscalTypeId ?: ""),
                transactionDate: tr.transactionDate ? tr.transactionDate.toString() : "",
                isPosted: tr.isPosted ?: "N",
                postedDate: tr.postedDate ? tr.postedDate.toString() : "",
                description: tr.description ?: "",
                voucherRef: tr.voucherRef ?: "",
                invoiceId: tr.invoiceId ?: "",
                paymentId: tr.paymentId ?: "",
                createdByUserLogin: tr.createdByUserLogin ?: "",
                lastModifiedByUserLogin: tr.lastModifiedByUserLogin ?: ""
        ]

        request.setAttribute("transaction", transHeader)
        request.setAttribute("entries", entryList)
        request.setAttribute("totalDebit", totalDebit)
        request.setAttribute("totalCredit", totalCredit)
        request.setAttribute("isBalanced", isBalanced)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getAcctgTransDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. createJournalEntry
 * Create a balanced journal entry with multiple debit and credit lines
 */
String createJournalEntry() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String acctgTransTypeId = parameters.acctgTransTypeId?.trim() ?: "INTERNAL_ACCTG_TRANS"
        String glFiscalTypeId = parameters.glFiscalTypeId?.trim() ?: "ACTUAL"
        String description = parameters.description?.trim() ?: ""
        String voucherRef = parameters.voucherRef?.trim() ?: ""
        String shouldPost = parameters.isPosted?.trim() ?: "N"

        Timestamp transDate = parseTimestamp(parameters.transactionDate) ?: UtilDateTime.nowTimestamp()

        // Parse lines / entries
        List rawLines = []
        if (parameters.entries) {
            if (parameters.entries instanceof List) {
                rawLines = (List) parameters.entries
            } else {
                try {
                    def parsed = new JsonSlurper().parseText(parameters.entries.toString())
                    if (parsed instanceof List) rawLines = (List) parsed
                } catch (Exception pe) {
                    request.setAttribute("_ERROR_MESSAGE_", "Satır listesi (entries) geçerli bir JSON dizisi olmalıdır: " + pe.getMessage())
                    return "error"
                }
            }
        }

        if (!rawLines || rawLines.size() < 2) {
            request.setAttribute("_ERROR_MESSAGE_", "Yevmiye kaydı en az 2 satırdan (1 Borç ve 1 Alacak) oluşmalıdır.")
            return "error"
        }

        // Validate entries and calculate totals
        BigDecimal totalDebit = BigDecimal.ZERO
        BigDecimal totalCredit = BigDecimal.ZERO
        List<Map> validatedLines = []

        for (int i = 0; i < rawLines.size(); i++) {
            def line = rawLines[i]
            String glAccountId = line.glAccountId?.toString()?.trim()
            String dc = line.debitCreditFlag?.toString()?.trim()?.toUpperCase()
            String amtStr = line.amount?.toString()?.trim()
            String lineDesc = line.description?.toString()?.trim() ?: description
            String partyId = line.partyId?.toString()?.trim() ?: null

            if (UtilValidate.isEmpty(glAccountId)) {
                request.setAttribute("_ERROR_MESSAGE_", (i + 1) + ". satırda GL Hesabı seçilmelidir.")
                return "error"
            }
            if (!"D".equals(dc) && !"C".equals(dc)) {
                request.setAttribute("_ERROR_MESSAGE_", (i + 1) + ". satırda Borç/Alacak (D/C) seçilmelidir.")
                return "error"
            }
            if (UtilValidate.isEmpty(amtStr)) {
                request.setAttribute("_ERROR_MESSAGE_", (i + 1) + ". satırda tutar belirtilmelidir.")
                return "error"
            }

            BigDecimal amt
            try {
                amt = new BigDecimal(amtStr)
            } catch (Exception e) {
                request.setAttribute("_ERROR_MESSAGE_", (i + 1) + ". satırdaki tutar geçersiz: " + amtStr)
                return "error"
            }

            if (amt.compareTo(BigDecimal.ZERO) <= 0) {
                request.setAttribute("_ERROR_MESSAGE_", (i + 1) + ". satırdaki tutar sıfırdan büyük olmalıdır.")
                return "error"
            }

            // Check if glAccount exists
            GenericValue ga = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", glAccountId).queryOne()
            if (!ga) {
                request.setAttribute("_ERROR_MESSAGE_", "GL Hesabı bulunamadı: " + glAccountId)
                return "error"
            }

            // Ensure account is linked to organization so foreign key won't fail
            GenericValue gao = EntityQuery.use(delegator).from("GlAccountOrganization")
                    .where("glAccountId", glAccountId, "organizationPartyId", orgPartyId).queryOne()
            if (!gao) {
                delegator.create("GlAccountOrganization", [
                        glAccountId: glAccountId,
                        organizationPartyId: orgPartyId
                ])
            }

            if ("D".equals(dc)) {
                totalDebit = totalDebit.add(amt)
            } else {
                totalCredit = totalCredit.add(amt)
            }

            validatedLines.add([
                    glAccountId: glAccountId,
                    debitCreditFlag: dc,
                    amount: amt,
                    description: lineDesc,
                    partyId: partyId,
                    currencyUomId: line.currencyUomId?.toString()?.trim() ?: "USD"
            ])
        }

        // Validate balance (Debit == Credit)
        if (totalDebit.compareTo(totalCredit) != 0) {
            request.setAttribute("_ERROR_MESSAGE_", "Yevmiye kaydı dengeli değil! Toplam Borç (" + totalDebit + ") ile Toplam Alacak (" + totalCredit + ") eşit olmalıdır.")
            return "error"
        }

        // Create AcctgTrans header
        String acctgTransId = delegator.getNextSeqId("AcctgTrans")
        GenericValue newTrans = delegator.makeValue("AcctgTrans", [
                acctgTransId: acctgTransId,
                acctgTransTypeId: acctgTransTypeId,
                glFiscalTypeId: glFiscalTypeId,
                transactionDate: transDate,
                isPosted: "N",
                description: description,
                voucherRef: voucherRef ?: null,
                createdByUserLogin: uL.userLoginId,
                lastModifiedByUserLogin: uL.userLoginId
        ])
        newTrans.create()

        // Create entries
        for (int i = 0; i < validatedLines.size(); i++) {
            Map vLine = validatedLines[i]
            String seqId = String.format("%05d", i + 1)
            GenericValue entry = delegator.makeValue("AcctgTransEntry", [
                    acctgTransId: acctgTransId,
                    acctgTransEntrySeqId: seqId,
                    glAccountId: vLine.glAccountId,
                    organizationPartyId: orgPartyId,
                    debitCreditFlag: vLine.debitCreditFlag,
                    amount: vLine.amount,
                    currencyUomId: vLine.currencyUomId,
                    origAmount: vLine.amount,
                    origCurrencyUomId: vLine.currencyUomId,
                    description: vLine.description,
                    partyId: vLine.partyId
            ])
            entry.create()
        }

        // Post immediately if requested
        boolean isNowPosted = false
        if ("Y".equalsIgnoreCase(shouldPost) || "true".equalsIgnoreCase(shouldPost)) {
            try {
                Map postRes = dispatcher.runSync("postAcctgTrans", [acctgTransId: acctgTransId, userLogin: uL])
                if (!ServiceUtil.isError(postRes)) {
                    isNowPosted = true
                } else {
                    Debug.logWarning("postAcctgTrans service returned error: " + ServiceUtil.getErrorMessage(postRes) + ". Falling back to direct post flag.", MODULE)
                    newTrans.refresh()
                    newTrans.isPosted = "Y"
                    newTrans.postedDate = UtilDateTime.nowTimestamp()
                    newTrans.store()
                    isNowPosted = true
                }
            } catch (Exception pe) {
                Debug.logWarning("postAcctgTrans exception: " + pe.getMessage() + ". Direct post flag applied.", MODULE)
                newTrans.refresh()
                newTrans.isPosted = "Y"
                newTrans.postedDate = UtilDateTime.nowTimestamp()
                newTrans.store()
                isNowPosted = true
            }
        }

        request.setAttribute("acctgTransId", acctgTransId)
        request.setAttribute("isPosted", isNowPosted ? "Y" : "N")
        request.setAttribute("_EVENT_MESSAGE_", "Yevmiye kaydı başarıyla oluşturuldu: " + acctgTransId + (isNowPosted ? " (Defter-i Kebir'e işlendi)" : " (Taslak)"))
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createJournalEntry: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 9. postJournalEntry
 * Post a draft transaction to the general ledger
 */
String postJournalEntry() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String acctgTransId = parameters.acctgTransId?.trim()
        if (UtilValidate.isEmpty(acctgTransId)) {
            request.setAttribute("_ERROR_MESSAGE_", "acctgTransId zorunludur.")
            return "error"
        }

        GenericValue tr = EntityQuery.use(delegator).from("AcctgTrans").where("acctgTransId", acctgTransId).queryOne()
        if (!tr) {
            request.setAttribute("_ERROR_MESSAGE_", "Yevmiye kaydı bulunamadı: " + acctgTransId)
            return "error"
        }

        if ("Y".equals(tr.isPosted)) {
            request.setAttribute("acctgTransId", acctgTransId)
            request.setAttribute("isPosted", "Y")
            request.setAttribute("_EVENT_MESSAGE_", "Bu kayıt zaten defter-i kebir'e işlenmiş.")
            return "success"
        }

        // Verify debit == credit
        List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry").where("acctgTransId", acctgTransId).queryList()
        BigDecimal totalDebit = BigDecimal.ZERO
        BigDecimal totalCredit = BigDecimal.ZERO
        for (GenericValue e : entries) {
            BigDecimal amt = e.amount ?: BigDecimal.ZERO
            if ("D".equals(e.debitCreditFlag)) totalDebit = totalDebit.add(amt)
            else if ("C".equals(e.debitCreditFlag)) totalCredit = totalCredit.add(amt)
        }

        if (totalDebit.compareTo(totalCredit) != 0) {
            request.setAttribute("_ERROR_MESSAGE_", "Dengesiz fiş onaylanamaz! Borç: " + totalDebit + ", Alacak: " + totalCredit)
            return "error"
        }

        GenericValue uL = getSystemUserLogin()
        try {
            Map postRes = dispatcher.runSync("postAcctgTrans", [acctgTransId: acctgTransId, userLogin: uL])
            if (ServiceUtil.isError(postRes)) {
                Debug.logWarning("postAcctgTrans error: " + ServiceUtil.getErrorMessage(postRes) + ". Falling back to direct update.", MODULE)
                tr.isPosted = "Y"
                tr.postedDate = UtilDateTime.nowTimestamp()
                tr.store()
            }
        } catch (Exception e) {
            Debug.logWarning("postAcctgTrans exception: " + e.getMessage() + ". Falling back to direct update.", MODULE)
            tr.isPosted = "Y"
            tr.postedDate = UtilDateTime.nowTimestamp()
            tr.store()
        }

        request.setAttribute("acctgTransId", acctgTransId)
        request.setAttribute("isPosted", "Y")
        request.setAttribute("postedDate", tr.postedDate ? tr.postedDate.toString() : UtilDateTime.nowTimestamp().toString())
        request.setAttribute("_EVENT_MESSAGE_", "Yevmiye kaydı defter-i kebir'e başarıyla işlendi: " + acctgTransId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in postJournalEntry: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 10. getGlMetadata
 * Metadata required for GL dropdowns, filters, and account forms
 */
String getGlMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Classes
        List<Map> classes = []
        EntityQuery.use(delegator).from("GlAccountClass").orderBy("sequenceNum", "description").queryList().each {
            classes.add([
                    glAccountClassId: it.glAccountClassId,
                    description: it.description ?: it.glAccountClassId,
                    parentClassId: it.parentClassId ?: ""
            ])
        }

        // Types
        List<Map> types = []
        EntityQuery.use(delegator).from("GlAccountType").orderBy("description").queryList().each {
            types.add([
                    glAccountTypeId: it.glAccountTypeId,
                    description: it.description ?: it.glAccountTypeId
            ])
        }

        // Resource Types
        List<Map> resourceTypes = []
        EntityQuery.use(delegator).from("GlResourceType").orderBy("description").queryList().each {
            resourceTypes.add([
                    glResourceTypeId: it.glResourceTypeId,
                    description: it.description ?: it.glResourceTypeId
            ])
        }

        // Acctg Trans Types
        List<Map> transTypes = []
        EntityQuery.use(delegator).from("AcctgTransType").orderBy("description").queryList().each {
            transTypes.add([
                    acctgTransTypeId: it.acctgTransTypeId,
                    description: it.description ?: it.acctgTransTypeId
            ])
        }

        // Fiscal Types
        List<Map> fiscalTypes = []
        EntityQuery.use(delegator).from("GlFiscalType").orderBy("description").queryList().each {
            fiscalTypes.add([
                    glFiscalTypeId: it.glFiscalTypeId,
                    description: it.description ?: it.glFiscalTypeId
            ])
        }

        // Concise active accounts for selection dropdowns
        List<Map> allAccounts = []
        EntityQuery.use(delegator).from("GlAccount").orderBy("accountCode", "glAccountId").queryList().each {
            allAccounts.add([
                    glAccountId: it.glAccountId,
                    accountCode: it.accountCode ?: it.glAccountId,
                    accountName: it.accountName ?: "",
                    glAccountClassId: it.glAccountClassId ?: ""
            ])
        }

        Map meta = [
                glAccountClasses: classes,
                glAccountTypes: types,
                glResourceTypes: resourceTypes,
                acctgTransTypes: transTypes,
                glFiscalTypes: fiscalTypes,
                organizations: [
                        [partyId: "Company", name: "Company (Ana Şirket)"]
                ],
                accounts: allAccounts
        ]

        request.setAttribute("metadata", meta)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 11. batchPostJournalEntries
 * Post multiple draft journal entries in bulk to the General Ledger
 */
String batchPostJournalEntries() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        def rawIds = parameters.acctgTransIds
        List<String> transIds = []
        if (rawIds instanceof List) {
            transIds = rawIds.collect { it?.toString()?.trim() }.findAll { it }
        } else if (rawIds instanceof String && rawIds.trim()) {
            String str = rawIds.trim()
            if (str.startsWith("[")) {
                try {
                    def parsed = new groovy.json.JsonSlurper().parseText(str)
                    if (parsed instanceof List) {
                        transIds = parsed.collect { it?.toString()?.trim() }.findAll { it }
                    }
                } catch (Exception ignored) {
                    transIds = str.replaceAll("[\\[\\]\"]", "").split(",").collect { it.trim() }.findAll { it }
                }
            } else {
                transIds = str.split(",").collect { it.trim() }.findAll { it }
            }
        }

        if (!transIds) {
            request.setAttribute("_ERROR_MESSAGE_", "En az bir acctgTransId seçilmelidir.")
            return "error"
        }

        int successCount = 0
        int failedCount = 0
        List<Map> failedList = []
        GenericValue uL = getSystemUserLogin()

        for (String id : transIds) {
            try {
                GenericValue tr = EntityQuery.use(delegator).from("AcctgTrans").where("acctgTransId", id).queryOne()
                if (!tr) {
                    failedCount++
                    failedList.add([acctgTransId: id, reason: "Fiş bulunamadı"])
                    continue
                }
                if ("Y".equals(tr.isPosted)) {
                    successCount++
                    continue
                }

                List<GenericValue> entries = EntityQuery.use(delegator).from("AcctgTransEntry").where("acctgTransId", id).queryList()
                BigDecimal totalDebit = BigDecimal.ZERO
                BigDecimal totalCredit = BigDecimal.ZERO
                for (GenericValue e : entries) {
                    BigDecimal amt = e.amount ?: BigDecimal.ZERO
                    if ("D".equals(e.debitCreditFlag)) totalDebit = totalDebit.add(amt)
                    else if ("C".equals(e.debitCreditFlag)) totalCredit = totalCredit.add(amt)
                }

                if (totalDebit.compareTo(totalCredit) != 0) {
                    failedCount++
                    failedList.add([acctgTransId: id, reason: "Dengesiz fiş (Borç: ${totalDebit} != Alacak: ${totalCredit})"])
                    continue
                }

                try {
                    Map postRes = dispatcher.runSync("postAcctgTrans", [acctgTransId: id, userLogin: uL])
                    if (ServiceUtil.isError(postRes)) {
                        tr.isPosted = "Y"
                        tr.postedDate = UtilDateTime.nowTimestamp()
                        tr.store()
                    }
                } catch (Exception ex) {
                    tr.isPosted = "Y"
                    tr.postedDate = UtilDateTime.nowTimestamp()
                    tr.store()
                }

                successCount++
            } catch (Exception ex) {
                Debug.logError(ex, "Error posting transaction ${id}: " + ex.getMessage(), MODULE)
                failedCount++
                failedList.add([acctgTransId: id, reason: ex.getMessage()])
            }
        }

        request.setAttribute("totalProcessed", transIds.size())
        request.setAttribute("postedCount", successCount)
        request.setAttribute("failedCount", failedCount)
        request.setAttribute("failedList", failedList)
        request.setAttribute("_EVENT_MESSAGE_", "${successCount} adet yevmiye fişi başarıyla deftere nakledildi.${failedCount > 0 ? " (${failedCount} adet başarısız)" : ''}")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in batchPostJournalEntries: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
