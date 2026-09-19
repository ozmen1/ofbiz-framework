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

final String MODULE = "AccountingPreferenceEvents.groovy"

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

/**
 * 1. getAccountingPreferences
 * Returns current PartyAcctgPreference, list of internal organizations, and supporting metadata
 */
String getAccountingPreferences() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        // 1. Fetch PartyAcctgPreference
        GenericValue prefGv = EntityQuery.use(delegator)
            .from("PartyAcctgPreference")
            .where("partyId", orgPartyId)
            .queryOne()

        Map<String, Object> prefMap = [:]
        if (prefGv) {
            prefMap = [
                partyId: prefGv.partyId,
                fiscalYearStartMonth: prefGv.fiscalYearStartMonth,
                fiscalYearStartDay: prefGv.fiscalYearStartDay,
                taxFormId: prefGv.taxFormId,
                cogsMethodId: prefGv.cogsMethodId,
                baseCurrencyUomId: prefGv.baseCurrencyUomId,
                invoiceSeqCustMethId: prefGv.invoiceSeqCustMethId,
                invoiceIdPrefix: prefGv.invoiceIdPrefix,
                lastInvoiceNumber: prefGv.lastInvoiceNumber,
                lastInvoiceRestartDate: prefGv.lastInvoiceRestartDate?.toString(),
                useInvoiceIdForReturns: prefGv.useInvoiceIdForReturns,
                quoteSeqCustMethId: prefGv.quoteSeqCustMethId,
                quoteIdPrefix: prefGv.quoteIdPrefix,
                lastQuoteNumber: prefGv.lastQuoteNumber,
                orderSeqCustMethId: prefGv.orderSeqCustMethId,
                orderIdPrefix: prefGv.orderIdPrefix,
                lastOrderNumber: prefGv.lastOrderNumber,
                refundPaymentMethodId: prefGv.refundPaymentMethodId,
                errorGlJournalId: prefGv.errorGlJournalId,
                enableAccounting: prefGv.enableAccounting
            ]
        } else {
            prefMap = [
                partyId: orgPartyId,
                baseCurrencyUomId: "USD",
                fiscalYearStartMonth: 1,
                fiscalYearStartDay: 1,
                invoiceIdPrefix: "INV",
                quoteIdPrefix: "QUO",
                orderIdPrefix: "ORD"
            ]
        }

        // Add descriptive fields
        if (prefMap.baseCurrencyUomId) {
            GenericValue uomGv = EntityQuery.use(delegator).from("Uom").where("uomId", prefMap.baseCurrencyUomId).cache().queryOne()
            prefMap.baseCurrencyDesc = uomGv ? "${uomGv.description ?: uomGv.uomId} (${uomGv.abbreviation ?: uomGv.uomId})" : prefMap.baseCurrencyUomId
        }
        if (prefMap.errorGlJournalId) {
            GenericValue jrnlGv = EntityQuery.use(delegator).from("GlJournal").where("glJournalId", prefMap.errorGlJournalId).queryOne()
            prefMap.errorGlJournalName = jrnlGv?.glJournalName ?: prefMap.errorGlJournalId
        }

        // 2. Internal Organizations
        List<GenericValue> orgRoles = EntityQuery.use(delegator)
            .from("PartyRole")
            .where("roleTypeId", "INTERNAL_ORGANIZATIO")
            .queryList()

        List<Map<String, Object>> organizations = []
        for (GenericValue role : orgRoles) {
            String pId = role.partyId
            GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", pId).queryOne()
            String name = pg?.groupName ?: pId
            organizations.add([partyId: pId, groupName: name])
        }

        // 3. Currencies
        List<GenericValue> currs = EntityQuery.use(delegator)
            .from("Uom")
            .where("uomTypeId", "CURRENCY_MEASURE")
            .orderBy("description")
            .cache()
            .queryList()
        List<Map<String, Object>> currencies = currs.collect {
            [uomId: it.uomId, description: it.description ?: it.uomId, abbreviation: it.abbreviation ?: it.uomId]
        }

        // 4. Tax Forms
        List<GenericValue> taxFormsGv = EntityQuery.use(delegator)
            .from("Enumeration")
            .where("enumTypeId", "TAX_FORMS")
            .orderBy("description")
            .cache()
            .queryList()
        List<Map<String, Object>> taxForms = taxFormsGv.collect {
            [enumId: it.enumId, description: it.description ?: it.enumId]
        }

        // 5. COGS Methods
        List<GenericValue> cogsGv = EntityQuery.use(delegator)
            .from("Enumeration")
            .where("enumTypeId", "COGS_METHODS")
            .orderBy("description")
            .cache()
            .queryList()
        List<Map<String, Object>> cogsMethods = cogsGv.collect {
            [enumId: it.enumId, description: it.description ?: it.enumId]
        }

        // 6. Custom Methods (for Invoice / Quote / Order sequencing)
        List<GenericValue> cmGv = EntityQuery.use(delegator)
            .from("CustomMethod")
            .where(EntityCondition.makeCondition("customMethodTypeId", EntityOperator.IN, ["INVOICE_HOOK", "QUOTE_HOOK", "ORDER_HOOK"]))
            .orderBy("description")
            .cache()
            .queryList()
        List<Map<String, Object>> customMethods = cmGv.collect {
            [customMethodId: it.customMethodId, customMethodTypeId: it.customMethodTypeId, description: it.description ?: it.customMethodId]
        }

        // 7. GL Journals for this organization
        List<GenericValue> jrnls = EntityQuery.use(delegator)
            .from("GlJournal")
            .where("organizationPartyId", orgPartyId)
            .orderBy("glJournalName")
            .queryList()
        List<Map<String, Object>> journals = jrnls.collect {
            [glJournalId: it.glJournalId, glJournalName: it.glJournalName ?: it.glJournalId]
        }

        request.setAttribute("preferences", prefMap)
        request.setAttribute("organizations", organizations)
        request.setAttribute("metadata", [
            currencies: currencies,
            taxForms: taxForms,
            cogsMethods: cogsMethods,
            customMethods: customMethods,
            journals: journals
        ])
        request.setAttribute("success", true)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error fetching accounting preferences: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 2. saveAccountingPreferences
 * Creates or updates PartyAcctgPreference for the selected organization
 */
String saveAccountingPreferences() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (!partyId) {
            request.setAttribute("error", "partyId is required")
            return "error"
        }

        GenericValue pref = EntityQuery.use(delegator).from("PartyAcctgPreference").where("partyId", partyId).queryOne()
        boolean isNew = false
        if (!pref) {
            pref = delegator.makeValue("PartyAcctgPreference", [partyId: partyId])
            isNew = true
        }

        if (parameters.containsKey("baseCurrencyUomId")) {
            pref.baseCurrencyUomId = parameters.baseCurrencyUomId?.trim() ?: null
        }
        if (parameters.containsKey("fiscalYearStartMonth")) {
            String mStr = parameters.fiscalYearStartMonth?.toString()?.trim()
            pref.fiscalYearStartMonth = mStr ? Long.valueOf(mStr) : null
        }
        if (parameters.containsKey("fiscalYearStartDay")) {
            String dStr = parameters.fiscalYearStartDay?.toString()?.trim()
            pref.fiscalYearStartDay = dStr ? Long.valueOf(dStr) : null
        }
        if (parameters.containsKey("taxFormId")) {
            pref.taxFormId = parameters.taxFormId?.trim() ?: null
        }
        if (parameters.containsKey("cogsMethodId")) {
            pref.cogsMethodId = parameters.cogsMethodId?.trim() ?: null
        }
        if (parameters.containsKey("invoiceSeqCustMethId")) {
            pref.invoiceSeqCustMethId = parameters.invoiceSeqCustMethId?.trim() ?: null
        }
        if (parameters.containsKey("invoiceIdPrefix")) {
            pref.invoiceIdPrefix = parameters.invoiceIdPrefix?.trim() ?: null
        }
        if (parameters.containsKey("lastInvoiceNumber")) {
            String numStr = parameters.lastInvoiceNumber?.toString()?.trim()
            pref.lastInvoiceNumber = numStr ? Long.valueOf(numStr) : null
        }
        if (parameters.containsKey("useInvoiceIdForReturns")) {
            pref.useInvoiceIdForReturns = parameters.useInvoiceIdForReturns?.trim() ?: "N"
        }
        if (parameters.containsKey("quoteSeqCustMethId")) {
            pref.quoteSeqCustMethId = parameters.quoteSeqCustMethId?.trim() ?: null
        }
        if (parameters.containsKey("quoteIdPrefix")) {
            pref.quoteIdPrefix = parameters.quoteIdPrefix?.trim() ?: null
        }
        if (parameters.containsKey("lastQuoteNumber")) {
            String qStr = parameters.lastQuoteNumber?.toString()?.trim()
            pref.lastQuoteNumber = qStr ? Long.valueOf(qStr) : null
        }
        if (parameters.containsKey("orderSeqCustMethId")) {
            pref.orderSeqCustMethId = parameters.orderSeqCustMethId?.trim() ?: null
        }
        if (parameters.containsKey("orderIdPrefix")) {
            pref.orderIdPrefix = parameters.orderIdPrefix?.trim() ?: null
        }
        if (parameters.containsKey("lastOrderNumber")) {
            String oStr = parameters.lastOrderNumber?.toString()?.trim()
            pref.lastOrderNumber = oStr ? Long.valueOf(oStr) : null
        }
        if (parameters.containsKey("errorGlJournalId")) {
            pref.errorGlJournalId = parameters.errorGlJournalId?.trim() ?: null
        }
        if (parameters.containsKey("enableAccounting")) {
            pref.enableAccounting = parameters.enableAccounting?.trim() ?: "Y"
        }
        if (parameters.containsKey("refundPaymentMethodId")) {
            pref.refundPaymentMethodId = parameters.refundPaymentMethodId?.trim() ?: null
        }

        if (isNew) {
            delegator.create(pref)
        } else {
            delegator.store(pref)
        }

        request.setAttribute("success", true)
        request.setAttribute("partyId", partyId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error saving accounting preferences: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 3. getGlJournals
 * Lists GL Journals for an organization with transaction counts and trial balance totals
 */
String getGlJournals() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        List<GenericValue> rawJournals = EntityQuery.use(delegator)
            .from("GlJournal")
            .where("organizationPartyId", orgPartyId)
            .orderBy("glJournalName")
            .queryList()

        List<Map<String, Object>> journals = []
        for (GenericValue jGv : rawJournals) {
            String jId = jGv.glJournalId

            // Count transactions in this journal
            long txCount = EntityQuery.use(delegator)
                .from("AcctgTrans")
                .where("glJournalId", jId)
                .queryCount()

            // Calculate trial balance totals using calculateGlJournalTrialBalance service
            BigDecimal debitTotal = BigDecimal.ZERO
            BigDecimal creditTotal = BigDecimal.ZERO
            BigDecimal debitCreditDifference = BigDecimal.ZERO

            try {
                Map tbResult = dispatcher.runSync("calculateGlJournalTrialBalance", [
                    glJournalId: jId,
                    userLogin: getSystemUserLogin()
                ])
                if (tbResult && tbResult.debitTotal != null) {
                    debitTotal = (BigDecimal) tbResult.debitTotal
                    creditTotal = (BigDecimal) tbResult.creditTotal
                    debitCreditDifference = (BigDecimal) tbResult.debitCreditDifference
                }
            } catch (Exception tbEx) {
                Debug.logWarning("Could not calculate trial balance for journal ${jId}: " + tbEx.getMessage(), MODULE)
            }

            journals.add([
                glJournalId: jGv.glJournalId,
                glJournalName: jGv.glJournalName ?: jGv.glJournalId,
                organizationPartyId: jGv.organizationPartyId,
                isPosted: jGv.isPosted ?: "N",
                postedDate: jGv.postedDate?.toString(),
                transCount: txCount,
                debitTotal: debitTotal.doubleValue(),
                creditTotal: creditTotal.doubleValue(),
                debitCreditDifference: debitCreditDifference.doubleValue()
            ])
        }

        request.setAttribute("journals", journals)
        request.setAttribute("organizationPartyId", orgPartyId)
        request.setAttribute("success", true)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error fetching GL journals: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 4. createGlJournal
 * Creates a new GL Journal
 */
String createGlJournal() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String journalName = parameters.glJournalName?.trim()
        String journalId = parameters.glJournalId?.trim()

        if (!journalName) {
            request.setAttribute("error", "glJournalName is required")
            return "error"
        }

        if (!journalId) {
            journalId = delegator.getNextSeqId("GlJournal")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("GlJournal").where("glJournalId", journalId).queryOne()
            if (existing) {
                request.setAttribute("error", "Journal ID already exists: " + journalId)
                return "error"
            }
        }

        GenericValue newJournal = delegator.makeValue("GlJournal", [
            glJournalId: journalId,
            glJournalName: journalName,
            organizationPartyId: orgPartyId,
            isPosted: "N"
        ])
        delegator.create(newJournal)

        request.setAttribute("success", true)
        request.setAttribute("glJournalId", journalId)
        request.setAttribute("glJournalName", journalName)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error creating GL journal: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 5. updateGlJournal
 * Updates an existing GL Journal name
 */
String updateGlJournal() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String journalId = parameters.glJournalId?.trim()
        String journalName = parameters.glJournalName?.trim()

        if (!journalId || !journalName) {
            request.setAttribute("error", "glJournalId and glJournalName are required")
            return "error"
        }

        GenericValue journal = EntityQuery.use(delegator).from("GlJournal").where("glJournalId", journalId).queryOne()
        if (!journal) {
            request.setAttribute("error", "GL Journal not found: " + journalId)
            return "error"
        }

        journal.glJournalName = journalName
        delegator.store(journal)

        request.setAttribute("success", true)
        request.setAttribute("glJournalId", journalId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error updating GL journal: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 6. deleteGlJournal
 * Deletes a GL Journal if no transactions reference it
 */
String deleteGlJournal() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String journalId = parameters.glJournalId?.trim()
        if (!journalId) {
            request.setAttribute("error", "glJournalId is required")
            return "error"
        }

        // Check if any AcctgTrans references this journal
        long txCount = EntityQuery.use(delegator).from("AcctgTrans").where("glJournalId", journalId).queryCount()
        if (txCount > 0) {
            request.setAttribute("error", "Cannot delete GL Journal '${journalId}': it has ${txCount} transaction(s) assigned to it.")
            return "error"
        }

        // Check if referenced in PartyAcctgPreference as errorGlJournalId
        long prefCount = EntityQuery.use(delegator).from("PartyAcctgPreference").where("errorGlJournalId", journalId).queryCount()
        if (prefCount > 0) {
            request.setAttribute("error", "Cannot delete GL Journal '${journalId}': it is configured as the default Error Journal in Accounting Preferences.")
            return "error"
        }

        GenericValue journal = EntityQuery.use(delegator).from("GlJournal").where("glJournalId", journalId).queryOne()
        if (journal) {
            delegator.removeValue(journal)
        }

        request.setAttribute("success", true)
        request.setAttribute("glJournalId", journalId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error deleting GL journal: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 7. postGlJournal
 * Posts all unposted transactions in a GL Journal
 */
String postGlJournal() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String journalId = parameters.glJournalId?.trim()
        if (!journalId) {
            request.setAttribute("error", "glJournalId is required")
            return "error"
        }

        Map result = dispatcher.runSync("postGlJournal", [
            glJournalId: journalId,
            userLogin: getSystemUserLogin()
        ])

        if (result && result.responseMessage == "error") {
            request.setAttribute("error", result.errorMessage ?: "Failed to post GL journal")
            return "error"
        }

        request.setAttribute("success", true)
        request.setAttribute("glJournalId", journalId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error posting GL journal: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}
