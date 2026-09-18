package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.*
import org.apache.ofbiz.entity.*
import org.apache.ofbiz.entity.condition.*
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.*
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "TaxAndGlMappingEvents.groovy"

/**
 * Helper to retrieve system or session user login.
 */
GenericValue getSystemUserLogin() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")
    if (!userLogin) {
        userLogin = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    }
    return userLogin
}

/**
 * Helper to parse timestamps safely.
 */
Timestamp parseTimestamp(String dateStr) {
    if (!dateStr || dateStr.trim().isEmpty()) return null
    try {
        String cleanStr = dateStr.trim()
        if (cleanStr.length() == 10) {
            cleanStr += " 00:00:00"
        } else if (cleanStr.contains("T")) {
            cleanStr = cleanStr.replace("T", " ")
            if (cleanStr.contains(".")) {
                cleanStr = cleanStr.substring(0, cleanStr.indexOf("."))
            }
            if (cleanStr.endsWith("Z")) {
                cleanStr = cleanStr.substring(0, cleanStr.length() - 1)
            }
        }
        return Timestamp.valueOf(cleanStr)
    } catch (Exception e) {
        Debug.logWarning("Could not parse timestamp '" + dateStr + "': " + e.getMessage(), MODULE)
        return null
    }
}

// ==========================================
// 1. METADATA & BOOTSTRAP
// ==========================================

/**
 * getTaxAndGlMappingMetadata
 * Returns dropdown options for tax authorities, geos, rate types, GL accounts,
 * invoice item types, payment method types, GL account types and organizations.
 */
String getTaxAndGlMappingMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Tax Authorities
        List taxAuths = EntityQuery.use(delegator).from("TaxAuthority").queryList()
        List taxAuthorityList = []
        for (GenericValue ta : taxAuths) {
            String geoName = ta.taxAuthGeoId
            GenericValue geo = EntityQuery.use(delegator).from("Geo").where("geoId", ta.taxAuthGeoId).cache().queryOne()
            if (geo) geoName = geo.geoName ?: geo.geoId

            String partyName = ta.taxAuthPartyId
            GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", ta.taxAuthPartyId).cache().queryOne()
            if (pg && pg.groupName) {
                partyName = pg.groupName
            }

            taxAuthorityList << [
                taxAuthGeoId: ta.taxAuthGeoId,
                taxAuthPartyId: ta.taxAuthPartyId,
                geoName: geoName,
                partyName: partyName,
                label: geoName + " - " + partyName + " (" + ta.taxAuthGeoId + "/" + ta.taxAuthPartyId + ")"
            ]
        }

        // Geos (Countries and States/Provinces)
        List geosRaw = EntityQuery.use(delegator).from("Geo")
            .where(EntityCondition.makeCondition("geoTypeId", EntityOperator.IN, ["COUNTRY", "STATE", "PROVINCE", "COUNTY"]))
            .orderBy("geoName")
            .maxRows(300)
            .queryList()

        List geoList = geosRaw.collect {
            [
                geoId: it.geoId,
                geoName: it.geoName ?: it.geoId,
                geoCode: it.geoCode ?: "",
                geoTypeId: it.geoTypeId ?: ""
            ]
        }

        // Tax Authority Rate Types
        List rateTypes = EntityQuery.use(delegator).from("TaxAuthorityRateType").orderBy("description").queryList()
        List rateTypeList = rateTypes.collect {
            [id: it.taxAuthorityRateTypeId, description: it.description ?: it.taxAuthorityRateTypeId]
        }

        // GL Accounts
        List glAccountsRaw = EntityQuery.use(delegator).from("GlAccount").orderBy("accountCode", "glAccountId").queryList()
        List glAccountList = glAccountsRaw.collect {
            [
                glAccountId: it.glAccountId,
                accountName: it.accountName ?: it.glAccountId,
                accountCode: it.accountCode ?: "",
                glAccountTypeId: it.glAccountTypeId ?: "",
                glAccountClassId: it.glAccountClassId ?: "",
                label: (it.accountCode ? it.accountCode + " - " : "") + (it.accountName ?: it.glAccountId) + " (" + it.glAccountId + ")"
            ]
        }

        // Invoice Item Types
        List invItemTypes = EntityQuery.use(delegator).from("InvoiceItemType").orderBy("invoiceItemTypeId").queryList()
        List invoiceItemTypeList = invItemTypes.collect {
            [
                invoiceItemTypeId: it.invoiceItemTypeId,
                description: it.description ?: it.invoiceItemTypeId,
                parentTypeId: it.parentTypeId ?: ""
            ]
        }

        // Payment Method Types
        List pmTypes = EntityQuery.use(delegator).from("PaymentMethodType").orderBy("paymentMethodTypeId").queryList()
        List paymentMethodTypeList = pmTypes.collect {
            [
                paymentMethodTypeId: it.paymentMethodTypeId,
                description: it.description ?: it.paymentMethodTypeId
            ]
        }

        // GL Account Types
        List glAcctTypes = EntityQuery.use(delegator).from("GlAccountType").orderBy("glAccountTypeId").queryList()
        List glAccountTypeList = glAcctTypes.collect {
            [
                glAccountTypeId: it.glAccountTypeId,
                description: it.description ?: it.glAccountTypeId
            ]
        }

        // Internal Organizations (e.g., Company)
        List orgsRaw = EntityQuery.use(delegator).from("PartyAcctgPreference").queryList()
        List organizationList = []
        for (GenericValue pap : orgsRaw) {
            String orgName = pap.partyId
            GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", pap.partyId).cache().queryOne()
            if (pg && pg.groupName) orgName = pg.groupName
            organizationList << [
                partyId: pap.partyId,
                name: orgName,
                currencyUomId: pap.baseCurrencyUomId ?: "TRY"
            ]
        }
        if (organizationList.isEmpty()) {
            organizationList << [partyId: "Company", name: "Company", currencyUomId: "TRY"]
        }

        request.setAttribute("taxAuthorities", taxAuthorityList)
        request.setAttribute("geos", geoList)
        request.setAttribute("taxAuthorityRateTypes", rateTypeList)
        request.setAttribute("glAccounts", glAccountList)
        request.setAttribute("invoiceItemTypes", invoiceItemTypeList)
        request.setAttribute("paymentMethodTypes", paymentMethodTypeList)
        request.setAttribute("glAccountTypes", glAccountTypeList)
        request.setAttribute("organizations", organizationList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTaxAndGlMappingMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// 2. TAX AUTHORITIES (Vergi Daireleri)
// ==========================================

/**
 * getTaxAuthorities
 * Lists all tax authorities with party names, geo details, rate counts, and GL settings.
 */
String getTaxAuthorities() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List taxAuths = EntityQuery.use(delegator).from("TaxAuthority").orderBy("taxAuthGeoId", "taxAuthPartyId").queryList()
        List resultList = []

        for (GenericValue ta : taxAuths) {
            String geoId = ta.taxAuthGeoId
            String partyId = ta.taxAuthPartyId

            String geoName = geoId
            GenericValue geo = EntityQuery.use(delegator).from("Geo").where("geoId", geoId).cache().queryOne()
            if (geo) geoName = geo.geoName ?: geo.geoId

            String partyName = partyId
            GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).cache().queryOne()
            if (pg && pg.groupName) {
                partyName = pg.groupName
            }

            long rateCount = EntityQuery.use(delegator).from("TaxAuthorityRateProduct")
                .where("taxAuthGeoId", geoId, "taxAuthPartyId", partyId)
                .queryCount()

            long glAccountCount = EntityQuery.use(delegator).from("TaxAuthorityGlAccount")
                .where("taxAuthGeoId", geoId, "taxAuthPartyId", partyId)
                .queryCount()

            resultList << [
                taxAuthGeoId: geoId,
                taxAuthPartyId: partyId,
                geoName: geoName,
                partyName: partyName,
                requireTaxIdForExemption: ta.requireTaxIdForExemption ?: "N",
                taxIdFormatPattern: ta.taxIdFormatPattern ?: "",
                includeTaxInPrice: ta.includeTaxInPrice ?: "N",
                rateCount: rateCount,
                glAccountCount: glAccountCount
            ]
        }

        request.setAttribute("taxAuthorities", resultList)
        request.setAttribute("totalCount", resultList.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTaxAuthorities: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * createTaxAuthority
 * Creates a new Tax Authority record.
 */
String createTaxAuthority() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()

        if (UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(taxAuthPartyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Bölge Kodu (Geo) ve Vergi Dairesi Tarafı (Party) zorunludur.")
            return "error"
        }

        Map ctx = [
            userLogin: uL,
            taxAuthGeoId: taxAuthGeoId,
            taxAuthPartyId: taxAuthPartyId,
            requireTaxIdForExemption: parameters.requireTaxIdForExemption ?: "N",
            taxIdFormatPattern: parameters.taxIdFormatPattern?.trim() ?: null,
            includeTaxInPrice: parameters.includeTaxInPrice ?: "N"
        ]

        Map res = dispatcher.runSync("createTaxAuthority", ctx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("taxAuthGeoId", taxAuthGeoId)
        request.setAttribute("taxAuthPartyId", taxAuthPartyId)
        request.setAttribute("_EVENT_MESSAGE_", "Vergi dairesi başarıyla oluşturuldu: " + taxAuthGeoId + " / " + taxAuthPartyId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createTaxAuthority: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * updateTaxAuthority
 * Updates settings of an existing Tax Authority.
 */
String updateTaxAuthority() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()

        if (UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(taxAuthPartyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthGeoId ve taxAuthPartyId zorunludur.")
            return "error"
        }

        Map ctx = [
            userLogin: uL,
            taxAuthGeoId: taxAuthGeoId,
            taxAuthPartyId: taxAuthPartyId,
            requireTaxIdForExemption: parameters.requireTaxIdForExemption ?: "N",
            taxIdFormatPattern: parameters.taxIdFormatPattern?.trim() ?: null,
            includeTaxInPrice: parameters.includeTaxInPrice ?: "N"
        ]

        Map res = dispatcher.runSync("updateTaxAuthority", ctx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("taxAuthGeoId", taxAuthGeoId)
        request.setAttribute("taxAuthPartyId", taxAuthPartyId)
        request.setAttribute("_EVENT_MESSAGE_", "Vergi dairesi ayarları güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateTaxAuthority: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * deleteTaxAuthority
 * Deletes a Tax Authority if no dependencies block it.
 */
String deleteTaxAuthority() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()

        if (UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(taxAuthPartyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthGeoId ve taxAuthPartyId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("deleteTaxAuthority", [
            userLogin: uL,
            taxAuthGeoId: taxAuthGeoId,
            taxAuthPartyId: taxAuthPartyId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Vergi dairesi silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteTaxAuthority: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// 3. TAX RATES (KDV / Vergi Oranları)
// ==========================================

/**
 * getTaxRates
 * Lists tax rates with filters and descriptions.
 */
String getTaxRates() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthorityRateTypeId = parameters.taxAuthorityRateTypeId?.trim()

        List conds = []
        if (UtilValidate.isNotEmpty(taxAuthGeoId)) conds << EntityCondition.makeCondition("taxAuthGeoId", taxAuthGeoId)
        if (UtilValidate.isNotEmpty(taxAuthPartyId)) conds << EntityCondition.makeCondition("taxAuthPartyId", taxAuthPartyId)
        if (UtilValidate.isNotEmpty(taxAuthorityRateTypeId)) conds << EntityCondition.makeCondition("taxAuthorityRateTypeId", taxAuthorityRateTypeId)

        def query = EntityQuery.use(delegator).from("TaxAuthorityRateProduct")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }
        List ratesRaw = query.orderBy("-taxPercentage", "taxAuthorityRateSeqId").queryList()

        List resultList = []
        for (GenericValue rate : ratesRaw) {
            String geoName = rate.taxAuthGeoId
            GenericValue geo = EntityQuery.use(delegator).from("Geo").where("geoId", rate.taxAuthGeoId).cache().queryOne()
            if (geo) geoName = geo.geoName ?: geo.geoId

            String partyName = rate.taxAuthPartyId
            GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", rate.taxAuthPartyId).cache().queryOne()
            if (pg && pg.groupName) partyName = pg.groupName

            String rateTypeDesc = rate.taxAuthorityRateTypeId
            GenericValue rtt = EntityQuery.use(delegator).from("TaxAuthorityRateType").where("taxAuthorityRateTypeId", rate.taxAuthorityRateTypeId).cache().queryOne()
            if (rtt) rateTypeDesc = rtt.description ?: rtt.taxAuthorityRateTypeId

            String catName = ""
            if (rate.productCategoryId) {
                GenericValue cat = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", rate.productCategoryId).cache().queryOne()
                if (cat) catName = cat.categoryName ?: cat.productCategoryId
            }

            resultList << [
                taxAuthorityRateSeqId: rate.taxAuthorityRateSeqId,
                taxAuthGeoId: rate.taxAuthGeoId,
                taxAuthPartyId: rate.taxAuthPartyId,
                geoName: geoName,
                partyName: partyName,
                taxAuthorityRateTypeId: rate.taxAuthorityRateTypeId,
                taxAuthorityRateTypeDesc: rateTypeDesc,
                taxPercentage: rate.taxPercentage != null ? rate.getBigDecimal("taxPercentage") : BigDecimal.ZERO,
                description: rate.description ?: "",
                taxShipping: rate.taxShipping ?: "N",
                fromDate: rate.fromDate ? rate.fromDate.toString() : "",
                thruDate: rate.thruDate ? rate.thruDate.toString() : "",
                productCategoryId: rate.productCategoryId ?: "",
                productCategoryName: catName
            ]
        }

        request.setAttribute("taxRates", resultList)
        request.setAttribute("totalCount", resultList.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTaxRates: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * createTaxRate
 * Adds a new tax rate (percentage, type, authority, categories).
 */
String createTaxRate() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String taxAuthorityRateTypeId = parameters.taxAuthorityRateTypeId?.trim() ?: "SALES_TAX"
        String taxPercentageStr = parameters.taxPercentage?.toString()?.trim()

        if (UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(taxPercentageStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "Vergi Dairesi (Bölge/Taraf) ve Vergi Oranı (%) zorunludur.")
            return "error"
        }

        BigDecimal taxPercentage = new BigDecimal(taxPercentageStr)
        Timestamp fromDate = parseTimestamp(parameters.fromDate?.toString()) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(parameters.thruDate?.toString())

        Map ctx = [
            userLogin: uL,
            taxAuthGeoId: taxAuthGeoId,
            taxAuthPartyId: taxAuthPartyId,
            taxAuthorityRateTypeId: taxAuthorityRateTypeId,
            taxPercentage: taxPercentage,
            description: parameters.description?.trim() ?: ("%" + taxPercentage + " " + taxAuthorityRateTypeId),
            taxShipping: parameters.taxShipping ?: "N",
            fromDate: fromDate,
            thruDate: thruDate,
            productCategoryId: parameters.productCategoryId?.trim() ?: null,
            productStoreId: parameters.productStoreId?.trim() ?: null
        ]

        Map res = dispatcher.runSync("createTaxAuthorityRateProduct", ctx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("taxAuthorityRateSeqId", res.taxAuthorityRateSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Vergi oranı başarıyla oluşturuldu: %" + taxPercentage)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createTaxRate: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * updateTaxRate
 * Modifies an existing tax rate percentage or dates.
 */
String updateTaxRate() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthorityRateSeqId = parameters.taxAuthorityRateSeqId?.trim()

        if (UtilValidate.isEmpty(taxAuthorityRateSeqId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthorityRateSeqId zorunludur.")
            return "error"
        }

        Map ctx = [
            userLogin: uL,
            taxAuthorityRateSeqId: taxAuthorityRateSeqId
        ]

        if (parameters.taxPercentage != null && !parameters.taxPercentage.toString().trim().isEmpty()) {
            ctx.taxPercentage = new BigDecimal(parameters.taxPercentage.toString().trim())
        }
        if (parameters.description != null) {
            ctx.description = parameters.description.trim()
        }
        if (parameters.taxShipping != null) {
            ctx.taxShipping = parameters.taxShipping
        }
        if (parameters.thruDate != null) {
            ctx.thruDate = parseTimestamp(parameters.thruDate.toString())
        }

        Map res = dispatcher.runSync("updateTaxAuthorityRateProduct", ctx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("taxAuthorityRateSeqId", taxAuthorityRateSeqId)
        request.setAttribute("_EVENT_MESSAGE_", "Vergi oranı güncellendi: " + taxAuthorityRateSeqId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateTaxRate: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * deleteTaxRate
 * Deletes a tax rate rule.
 */
String deleteTaxRate() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthorityRateSeqId = parameters.taxAuthorityRateSeqId?.trim()

        if (UtilValidate.isEmpty(taxAuthorityRateSeqId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthorityRateSeqId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("deleteTaxAuthorityRateProduct", [
            userLogin: uL,
            taxAuthorityRateSeqId: taxAuthorityRateSeqId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Vergi oranı kuralı silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteTaxRate: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// 4. TAX AUTHORITY GL ACCOUNTS (Vergi GL Hesap Eşlemeleri)
// ==========================================

/**
 * getTaxAuthorityGlAccounts
 * Lists GL accounts mapped to a tax authority.
 */
String getTaxAuthorityGlAccounts() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()

        List conds = []
        if (UtilValidate.isNotEmpty(taxAuthGeoId)) conds << EntityCondition.makeCondition("taxAuthGeoId", taxAuthGeoId)
        if (UtilValidate.isNotEmpty(taxAuthPartyId)) conds << EntityCondition.makeCondition("taxAuthPartyId", taxAuthPartyId)

        def query = EntityQuery.use(delegator).from("TaxAuthorityGlAccount")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }
        List itemsRaw = query.queryList()

        List resultList = []
        for (GenericValue item : itemsRaw) {
            String acctName = item.glAccountId
            String acctCode = ""
            GenericValue acct = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", item.glAccountId).cache().queryOne()
            if (acct) {
                acctName = acct.accountName ?: acct.glAccountId
                acctCode = acct.accountCode ?: ""
            }

            resultList << [
                taxAuthGeoId: item.taxAuthGeoId,
                taxAuthPartyId: item.taxAuthPartyId,
                organizationPartyId: item.organizationPartyId,
                glAccountId: item.glAccountId,
                accountName: acctName,
                accountCode: acctCode
            ]
        }

        request.setAttribute("taxAuthorityGlAccounts", resultList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getTaxAuthorityGlAccounts: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * setTaxAuthorityGlAccount
 * Assigns or updates a GL account for a Tax Authority in an Organization.
 */
String setTaxAuthorityGlAccount() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String glAccountId = parameters.glAccountId?.trim()

        if (UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(taxAuthPartyId) || UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthGeoId, taxAuthPartyId ve glAccountId zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator).from("TaxAuthorityGlAccount")
            .where("taxAuthGeoId", taxAuthGeoId, "taxAuthPartyId", taxAuthPartyId, "organizationPartyId", organizationPartyId)
            .queryOne()

        if (existing) {
            existing.glAccountId = glAccountId
            delegator.store(existing)
        } else {
            Map res = dispatcher.runSync("createTaxAuthorityGlAccount", [
                userLogin: uL,
                taxAuthGeoId: taxAuthGeoId,
                taxAuthPartyId: taxAuthPartyId,
                organizationPartyId: organizationPartyId,
                glAccountId: glAccountId
            ])
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
        }

        request.setAttribute("_EVENT_MESSAGE_", "Vergi dairesi muhasebe hesabı eşleştirildi: " + glAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setTaxAuthorityGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * deleteTaxAuthorityGlAccount
 * Removes a GL account assignment from a Tax Authority.
 */
String deleteTaxAuthorityGlAccount() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim()
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        if (UtilValidate.isEmpty(taxAuthGeoId) || UtilValidate.isEmpty(taxAuthPartyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "taxAuthGeoId ve taxAuthPartyId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("deleteTaxAuthorityGlAccount", [
            userLogin: uL,
            taxAuthGeoId: taxAuthGeoId,
            taxAuthPartyId: taxAuthPartyId,
            organizationPartyId: organizationPartyId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Vergi dairesi muhasebe hesabı bağlantısı kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteTaxAuthorityGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ==========================================
// 5. GL ACCOUNT MAPPINGS (Otomatik Muhasebe Eşlemeleri)
// ==========================================

/**
 * getGlMappings
 * Lists all active GL assignments: Invoice Item Types, Payment Method Types, and Default GL Account Types.
 */
String getGlMappings() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String orgId = parameters.organizationPartyId?.trim() ?: "Company"

        // 1. Invoice Item Type GL Accounts
        List invoiceItemGlRaw = EntityQuery.use(delegator).from("InvoiceItemTypeGlAccount")
            .where("organizationPartyId", orgId)
            .queryList()

        List invoiceItemTypeGlAccounts = []
        for (GenericValue item : invoiceItemGlRaw) {
            String itemTypeDesc = item.invoiceItemTypeId
            GenericValue iit = EntityQuery.use(delegator).from("InvoiceItemType").where("invoiceItemTypeId", item.invoiceItemTypeId).cache().queryOne()
            if (iit) itemTypeDesc = iit.description ?: iit.invoiceItemTypeId

            String acctName = item.glAccountId
            String acctCode = ""
            GenericValue acct = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", item.glAccountId).cache().queryOne()
            if (acct) {
                acctName = acct.accountName ?: acct.glAccountId
                acctCode = acct.accountCode ?: ""
            }

            invoiceItemTypeGlAccounts << [
                invoiceItemTypeId: item.invoiceItemTypeId,
                itemTypeDesc: itemTypeDesc,
                organizationPartyId: orgId,
                glAccountId: item.glAccountId,
                accountName: acctName,
                accountCode: acctCode
            ]
        }

        // 2. Payment Method Type GL Accounts
        List pmGlRaw = EntityQuery.use(delegator).from("PaymentMethodTypeGlAccount")
            .where("organizationPartyId", orgId)
            .queryList()

        List paymentMethodTypeGlAccounts = []
        for (GenericValue item : pmGlRaw) {
            String pmDesc = item.paymentMethodTypeId
            GenericValue pmt = EntityQuery.use(delegator).from("PaymentMethodType").where("paymentMethodTypeId", item.paymentMethodTypeId).cache().queryOne()
            if (pmt) pmDesc = pmt.description ?: pmt.paymentMethodTypeId

            String acctName = item.glAccountId
            String acctCode = ""
            GenericValue acct = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", item.glAccountId).cache().queryOne()
            if (acct) {
                acctName = acct.accountName ?: acct.glAccountId
                acctCode = acct.accountCode ?: ""
            }

            paymentMethodTypeGlAccounts << [
                paymentMethodTypeId: item.paymentMethodTypeId,
                methodTypeDesc: pmDesc,
                organizationPartyId: orgId,
                glAccountId: item.glAccountId,
                accountName: acctName,
                accountCode: acctCode
            ]
        }

        // 3. GL Account Type Defaults
        List glTypeDefaultRaw = EntityQuery.use(delegator).from("GlAccountTypeDefault")
            .where("organizationPartyId", orgId)
            .queryList()

        List glAccountTypeDefaults = []
        for (GenericValue item : glTypeDefaultRaw) {
            String typeDesc = item.glAccountTypeId
            GenericValue gat = EntityQuery.use(delegator).from("GlAccountType").where("glAccountTypeId", item.glAccountTypeId).cache().queryOne()
            if (gat) typeDesc = gat.description ?: gat.glAccountTypeId

            String acctName = item.glAccountId
            String acctCode = ""
            GenericValue acct = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", item.glAccountId).cache().queryOne()
            if (acct) {
                acctName = acct.accountName ?: acct.glAccountId
                acctCode = acct.accountCode ?: ""
            }

            glAccountTypeDefaults << [
                glAccountTypeId: item.glAccountTypeId,
                glAccountTypeDesc: typeDesc,
                organizationPartyId: orgId,
                glAccountId: item.glAccountId,
                accountName: acctName,
                accountCode: acctCode
            ]
        }

        request.setAttribute("organizationPartyId", orgId)
        request.setAttribute("invoiceItemTypeGlAccounts", invoiceItemTypeGlAccounts)
        request.setAttribute("paymentMethodTypeGlAccounts", paymentMethodTypeGlAccounts)
        request.setAttribute("glAccountTypeDefaults", glAccountTypeDefaults)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getGlMappings: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * setInvoiceItemTypeGlAccount
 * Assigns or updates the GL account for an Invoice Item Type.
 */
String setInvoiceItemTypeGlAccount() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String invoiceItemTypeId = parameters.invoiceItemTypeId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String glAccountId = parameters.glAccountId?.trim()

        if (UtilValidate.isEmpty(invoiceItemTypeId) || UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Fatura Kalem Tipi ve Muhasebe Hesabı zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator).from("InvoiceItemTypeGlAccount")
            .where("invoiceItemTypeId", invoiceItemTypeId, "organizationPartyId", organizationPartyId)
            .queryOne()

        if (existing) {
            existing.glAccountId = glAccountId
            delegator.store(existing)
        } else {
            Map res = dispatcher.runSync("addInvoiceItemTypeGlAssignment", [
                userLogin: uL,
                invoiceItemTypeId: invoiceItemTypeId,
                organizationPartyId: organizationPartyId,
                glAccountId: glAccountId
            ])
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
        }

        request.setAttribute("_EVENT_MESSAGE_", "Fatura kalemi muhasebe hesabı eşleştirildi: " + invoiceItemTypeId + " -> " + glAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setInvoiceItemTypeGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removeInvoiceItemTypeGlAccount
 * Removes an Invoice Item Type GL mapping.
 */
String removeInvoiceItemTypeGlAccount() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String invoiceItemTypeId = parameters.invoiceItemTypeId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        if (UtilValidate.isEmpty(invoiceItemTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "invoiceItemTypeId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("removeInvoiceItemTypeGlAssignment", [
            userLogin: uL,
            invoiceItemTypeId: invoiceItemTypeId,
            organizationPartyId: organizationPartyId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Fatura kalemi muhasebe eşleşmesi kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeInvoiceItemTypeGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * setPaymentMethodTypeGlAccount
 * Assigns or updates the GL account for a Payment Method Type.
 */
String setPaymentMethodTypeGlAccount() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String paymentMethodTypeId = parameters.paymentMethodTypeId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String glAccountId = parameters.glAccountId?.trim()

        if (UtilValidate.isEmpty(paymentMethodTypeId) || UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Ödeme Yöntemi ve Muhasebe Hesabı zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator).from("PaymentMethodTypeGlAccount")
            .where("paymentMethodTypeId", paymentMethodTypeId, "organizationPartyId", organizationPartyId)
            .queryOne()

        if (existing) {
            existing.glAccountId = glAccountId
            delegator.store(existing)
        } else {
            Map res = dispatcher.runSync("addPaymentMethodTypeGlAssignment", [
                userLogin: uL,
                paymentMethodTypeId: paymentMethodTypeId,
                organizationPartyId: organizationPartyId,
                glAccountId: glAccountId
            ])
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
        }

        request.setAttribute("_EVENT_MESSAGE_", "Ödeme yöntemi muhasebe hesabı eşleştirildi: " + paymentMethodTypeId + " -> " + glAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setPaymentMethodTypeGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removePaymentMethodTypeGlAccount
 * Removes a Payment Method Type GL mapping.
 */
String removePaymentMethodTypeGlAccount() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String paymentMethodTypeId = parameters.paymentMethodTypeId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        if (UtilValidate.isEmpty(paymentMethodTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentMethodTypeId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("removePaymentMethodTypeGlAssignment", [
            userLogin: uL,
            paymentMethodTypeId: paymentMethodTypeId,
            organizationPartyId: organizationPartyId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Ödeme yöntemi muhasebe eşleşmesi kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removePaymentMethodTypeGlAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * setGlAccountTypeDefault
 * Assigns or updates the default GL account for a GL Account Type.
 */
String setGlAccountTypeDefault() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String glAccountTypeId = parameters.glAccountTypeId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        String glAccountId = parameters.glAccountId?.trim()

        if (UtilValidate.isEmpty(glAccountTypeId) || UtilValidate.isEmpty(glAccountId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Hesap Tipi ve Muhasebe Hesabı zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator).from("GlAccountTypeDefault")
            .where("glAccountTypeId", glAccountTypeId, "organizationPartyId", organizationPartyId)
            .queryOne()

        if (existing) {
            existing.glAccountId = glAccountId
            delegator.store(existing)
        } else {
            Map res = dispatcher.runSync("createGlAccountTypeDefault", [
                userLogin: uL,
                glAccountTypeId: glAccountTypeId,
                organizationPartyId: organizationPartyId,
                glAccountId: glAccountId
            ])
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
        }

        request.setAttribute("_EVENT_MESSAGE_", "Varsayılan muhasebe hesabı güncellendi: " + glAccountTypeId + " -> " + glAccountId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setGlAccountTypeDefault: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * removeGlAccountTypeDefault
 * Removes a default GL Account Type assignment.
 */
String removeGlAccountTypeDefault() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String glAccountTypeId = parameters.glAccountTypeId?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

        if (UtilValidate.isEmpty(glAccountTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "glAccountTypeId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("removeGlAccountTypeDefault", [
            userLogin: uL,
            glAccountTypeId: glAccountTypeId,
            organizationPartyId: organizationPartyId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Varsayılan muhasebe hesabı eşleşmesi kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeGlAccountTypeDefault: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
