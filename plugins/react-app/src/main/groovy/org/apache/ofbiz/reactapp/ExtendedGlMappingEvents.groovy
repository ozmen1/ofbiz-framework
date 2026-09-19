package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil

class ExtendedGlMappingEvents {

    public static final String MODULE = ExtendedGlMappingEvents.class.getName()

    /**
     * 1. getVarianceReasonGlAccounts
     * List all variance reason to GL account mappings
     */
    static String getVarianceReasonGlAccounts(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("VarianceReasonGlAccount")
                    .orderBy("varianceReasonId")
                    .queryList()

            List<Map> result = []
            for (GenericValue gv : list) {
                GenericValue vr = EntityQuery.use(delegator).from("VarianceReason")
                        .where("varianceReasonId", gv.varianceReasonId).queryOne()
                GenericValue gla = EntityQuery.use(delegator).from("GlAccount")
                        .where("glAccountId", gv.glAccountId).queryOne()

                result.add([
                        varianceReasonId: gv.varianceReasonId,
                        varianceReasonDesc: vr?.description ?: gv.varianceReasonId,
                        organizationPartyId: gv.organizationPartyId,
                        glAccountId: gv.glAccountId,
                        accountName: gla?.accountName ?: "",
                        accountCode: gla?.accountCode ?: gv.glAccountId
                ])
            }

            request.setAttribute("varianceReasonGlAccounts", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getVarianceReasonGlAccounts: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 2. createVarianceReasonGlAccount
     */
    static String createVarianceReasonGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String varianceReasonId = parameters.varianceReasonId?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String glAccountId = parameters.glAccountId?.trim()

            if (UtilValidate.isEmpty(varianceReasonId) || UtilValidate.isEmpty(glAccountId)) {
                request.setAttribute("_ERROR_MESSAGE_", "varianceReasonId ve glAccountId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map inMap = [
                    varianceReasonId: varianceReasonId,
                    organizationPartyId: organizationPartyId,
                    glAccountId: glAccountId,
                    userLogin: userLogin
            ]

            GenericValue existing = EntityQuery.use(delegator).from("VarianceReasonGlAccount")
                    .where("varianceReasonId", varianceReasonId, "organizationPartyId", organizationPartyId)
                    .queryOne()

            if (existing) {
                dispatcher.runSync("updateVarianceReasonGlAccount", inMap)
            } else {
                dispatcher.runSync("createVarianceReasonGlAccount", inMap)
            }

            request.setAttribute("_EVENT_MESSAGE_", "Sayım farkı muhasebe hesabı kaydedildi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createVarianceReasonGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 3. deleteVarianceReasonGlAccount
     */
    static String deleteVarianceReasonGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String varianceReasonId = parameters.varianceReasonId?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

            if (UtilValidate.isEmpty(varianceReasonId)) {
                request.setAttribute("_ERROR_MESSAGE_", "varianceReasonId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            dispatcher.runSync("deleteVarianceReasonGlAccount", [
                    varianceReasonId: varianceReasonId,
                    organizationPartyId: organizationPartyId,
                    userLogin: userLogin
            ])

            request.setAttribute("_EVENT_MESSAGE_", "Sayım farkı muhasebe hesabı silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deleteVarianceReasonGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 4. getPartyGlAccounts
     * List party-specific GL accounts
     */
    static String getPartyGlAccounts(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("PartyGlAccount")
                    .orderBy("partyId", "glAccountTypeId")
                    .queryList()

            List<Map> result = []
            for (GenericValue gv : list) {
                GenericValue party = EntityQuery.use(delegator).from("PartyNameView")
                        .where("partyId", gv.partyId).queryOne()
                String partyName = party ? (party.groupName ?: "${party.firstName ?: ''} ${party.lastName ?: ''}".trim()) : gv.partyId

                GenericValue role = EntityQuery.use(delegator).from("RoleType")
                        .where("roleTypeId", gv.roleTypeId).queryOne()
                GenericValue glType = EntityQuery.use(delegator).from("GlAccountType")
                        .where("glAccountTypeId", gv.glAccountTypeId).queryOne()
                GenericValue gla = EntityQuery.use(delegator).from("GlAccount")
                        .where("glAccountId", gv.glAccountId).queryOne()

                result.add([
                        organizationPartyId: gv.organizationPartyId,
                        partyId: gv.partyId,
                        partyName: partyName,
                        roleTypeId: gv.roleTypeId,
                        roleTypeDesc: role?.description ?: gv.roleTypeId,
                        glAccountTypeId: gv.glAccountTypeId,
                        glAccountTypeDesc: glType?.description ?: gv.glAccountTypeId,
                        glAccountId: gv.glAccountId,
                        accountName: gla?.accountName ?: "",
                        accountCode: gla?.accountCode ?: gv.glAccountId
                ])
            }

            request.setAttribute("partyGlAccounts", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getPartyGlAccounts: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 5. createPartyGlAccount
     */
    static String createPartyGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String partyId = parameters.partyId?.trim()
            String roleTypeId = parameters.roleTypeId?.trim() ?: "_NA_"
            String glAccountTypeId = parameters.glAccountTypeId?.trim()
            String glAccountId = parameters.glAccountId?.trim()

            if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(glAccountTypeId) || UtilValidate.isEmpty(glAccountId)) {
                request.setAttribute("_ERROR_MESSAGE_", "partyId, glAccountTypeId ve glAccountId zorunludur.")
                return "error"
            }

            // Ensure PartyRole exists
            GenericValue pr = EntityQuery.use(delegator).from("PartyRole")
                    .where("partyId", partyId, "roleTypeId", roleTypeId).queryOne()
            if (!pr) {
                delegator.create("PartyRole", [partyId: partyId, roleTypeId: roleTypeId])
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map inMap = [
                    organizationPartyId: organizationPartyId,
                    partyId: partyId,
                    roleTypeId: roleTypeId,
                    glAccountTypeId: glAccountTypeId,
                    glAccountId: glAccountId,
                    userLogin: userLogin
            ]

            GenericValue existing = EntityQuery.use(delegator).from("PartyGlAccount")
                    .where("organizationPartyId", organizationPartyId, "partyId", partyId,
                            "roleTypeId", roleTypeId, "glAccountTypeId", glAccountTypeId).queryOne()

            if (existing) {
                dispatcher.runSync("updatePartyGlAccount", inMap)
            } else {
                dispatcher.runSync("createPartyGlAccount", inMap)
            }

            request.setAttribute("_EVENT_MESSAGE_", "Taraf özel muhasebe hesabı kaydedildi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createPartyGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 6. deletePartyGlAccount
     */
    static String deletePartyGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String partyId = parameters.partyId?.trim()
            String roleTypeId = parameters.roleTypeId?.trim() ?: "_NA_"
            String glAccountTypeId = parameters.glAccountTypeId?.trim()

            if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(glAccountTypeId)) {
                request.setAttribute("_ERROR_MESSAGE_", "partyId ve glAccountTypeId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            dispatcher.runSync("deletePartyGlAccount", [
                    organizationPartyId: organizationPartyId,
                    partyId: partyId,
                    roleTypeId: roleTypeId,
                    glAccountTypeId: glAccountTypeId,
                    userLogin: userLogin
            ])

            request.setAttribute("_EVENT_MESSAGE_", "Taraf özel muhasebe hesabı silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deletePartyGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 7. getCreditCardTypeGlAccounts
     */
    static String getCreditCardTypeGlAccounts(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("CreditCardTypeGlAccount")
                    .orderBy("cardType")
                    .queryList()

            List<Map> result = []
            for (GenericValue gv : list) {
                GenericValue gla = EntityQuery.use(delegator).from("GlAccount")
                        .where("glAccountId", gv.glAccountId).queryOne()

                result.add([
                        cardType: gv.cardType,
                        organizationPartyId: gv.organizationPartyId,
                        glAccountId: gv.glAccountId,
                        accountName: gla?.accountName ?: "",
                        accountCode: gla?.accountCode ?: gv.glAccountId
                ])
            }

            request.setAttribute("creditCardTypeGlAccounts", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getCreditCardTypeGlAccounts: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 8. createCreditCardTypeGlAccount
     */
    static String createCreditCardTypeGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String cardType = parameters.cardType?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String glAccountId = parameters.glAccountId?.trim()

            if (UtilValidate.isEmpty(cardType) || UtilValidate.isEmpty(glAccountId)) {
                request.setAttribute("_ERROR_MESSAGE_", "cardType ve glAccountId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map inMap = [
                    cardType: cardType,
                    organizationPartyId: organizationPartyId,
                    glAccountId: glAccountId,
                    userLogin: userLogin
            ]

            GenericValue existing = EntityQuery.use(delegator).from("CreditCardTypeGlAccount")
                    .where("cardType", cardType, "organizationPartyId", organizationPartyId).queryOne()

            if (existing) {
                dispatcher.runSync("updateCreditCardTypeGlAccount", inMap)
            } else {
                dispatcher.runSync("createCreditCardTypeGlAccount", inMap)
            }

            request.setAttribute("_EVENT_MESSAGE_", "Kredi kartı tipi muhasebe hesabı kaydedildi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createCreditCardTypeGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 9. deleteCreditCardTypeGlAccount
     */
    static String deleteCreditCardTypeGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String cardType = parameters.cardType?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

            if (UtilValidate.isEmpty(cardType)) {
                request.setAttribute("_ERROR_MESSAGE_", "cardType zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            dispatcher.runSync("deleteCreditCardTypeGlAccount", [
                    cardType: cardType,
                    organizationPartyId: organizationPartyId,
                    userLogin: userLogin
            ])

            request.setAttribute("_EVENT_MESSAGE_", "Kredi kartı tipi muhasebe hesabı silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deleteCreditCardTypeGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 10. getExtendedGlMetadata
     * Returns dropdown metadata for variance reasons, roles, card types, GL account types, fixed asset types, fin account types, categories
     */
    static String getExtendedGlMetadata(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> vrList = EntityQuery.use(delegator).from("VarianceReason").orderBy("description").queryList()
            List<Map> varianceReasons = vrList.collect { [id: it.varianceReasonId, description: it.description ?: it.varianceReasonId] }

            List<GenericValue> roleList = EntityQuery.use(delegator).from("RoleType")
                    .where(org.apache.ofbiz.entity.condition.EntityCondition.makeCondition("roleTypeId",
                            org.apache.ofbiz.entity.condition.EntityOperator.IN,
                            ["CUSTOMER", "SUPPLIER", "BILL_TO_CUSTOMER", "BILL_FROM_VENDOR", "_NA_"]))
                    .orderBy("description").queryList()
            List<Map> roleTypes = roleList.collect { [id: it.roleTypeId, description: it.description ?: it.roleTypeId] }

            List<GenericValue> glTypeList = EntityQuery.use(delegator).from("GlAccountType").orderBy("description").queryList()
            List<Map> glAccountTypes = glTypeList.collect { [id: it.glAccountTypeId, description: it.description ?: it.glAccountTypeId] }

            List<String> cardTypes = ["CCT_VISA", "CCT_MASTERCARD", "CCT_AMERICANEXPRESS", "CCT_DISCOVER", "CCT_DINERSCLUB"]

            List<GenericValue> fatList = EntityQuery.use(delegator).from("FixedAssetType").orderBy("description").queryList()
            List<Map> fixedAssetTypes = fatList.collect { [id: it.fixedAssetTypeId, description: it.description ?: it.fixedAssetTypeId] }

            List<GenericValue> fatyList = EntityQuery.use(delegator).from("FinAccountType").orderBy("description").queryList()
            List<Map> finAccountTypes = fatyList.collect { [id: it.finAccountTypeId, description: it.description ?: it.finAccountTypeId] }

            List<GenericValue> catList = EntityQuery.use(delegator).from("ProductCategory").orderBy("categoryName").maxRows(100).queryList()
            List<Map> productCategories = catList.collect { [id: it.productCategoryId, description: (it.categoryName ?: it.description) ?: it.productCategoryId] }

            request.setAttribute("metadata", [
                    varianceReasons: varianceReasons,
                    roleTypes: roleTypes,
                    glAccountTypes: glAccountTypes,
                    cardTypes: cardTypes,
                    fixedAssetTypes: fixedAssetTypes,
                    finAccountTypes: finAccountTypes,
                    productCategories: productCategories
            ])
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getExtendedGlMetadata: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 11. getFixedAssetTypeGlAccounts
     */
    static String getFixedAssetTypeGlAccounts(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("FixedAssetTypeGlAccount")
                    .orderBy("fixedAssetTypeId")
                    .queryList()

            List<Map> result = []
            for (GenericValue gv : list) {
                GenericValue fat = gv.fixedAssetTypeId && !"_NA_".equals(gv.fixedAssetTypeId) ?
                        EntityQuery.use(delegator).from("FixedAssetType").where("fixedAssetTypeId", gv.fixedAssetTypeId).queryOne() : null
                GenericValue agla = gv.assetGlAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.assetGlAccountId).queryOne() : null
                GenericValue accgla = gv.accDepGlAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.accDepGlAccountId).queryOne() : null
                GenericValue dgla = gv.depGlAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.depGlAccountId).queryOne() : null
                GenericValue pgla = gv.profitGlAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.profitGlAccountId).queryOne() : null
                GenericValue lgla = gv.lossGlAccountId ? EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.lossGlAccountId).queryOne() : null

                result.add([
                        fixedAssetTypeId: gv.fixedAssetTypeId,
                        fixedAssetTypeDesc: fat?.description ?: (gv.fixedAssetTypeId ?: "_NA_"),
                        fixedAssetId: gv.fixedAssetId ?: "_NA_",
                        organizationPartyId: gv.organizationPartyId,
                        assetGlAccountId: gv.assetGlAccountId ?: "",
                        assetAccountName: agla?.accountName ?: "",
                        assetAccountCode: agla?.accountCode ?: "",
                        accDepGlAccountId: gv.accDepGlAccountId ?: "",
                        accDepAccountName: accgla?.accountName ?: "",
                        accDepAccountCode: accgla?.accountCode ?: "",
                        depGlAccountId: gv.depGlAccountId ?: "",
                        depAccountName: dgla?.accountName ?: "",
                        depAccountCode: dgla?.accountCode ?: "",
                        profitGlAccountId: gv.profitGlAccountId ?: "",
                        profitAccountName: pgla?.accountName ?: "",
                        profitAccountCode: pgla?.accountCode ?: "",
                        lossGlAccountId: gv.lossGlAccountId ?: "",
                        lossAccountName: lgla?.accountName ?: "",
                        lossAccountCode: lgla?.accountCode ?: ""
                ])
            }

            request.setAttribute("fixedAssetTypeGlAccounts", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getFixedAssetTypeGlAccounts: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 12. createFixedAssetTypeGlAccount
     */
    static String createFixedAssetTypeGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String fixedAssetTypeId = parameters.fixedAssetTypeId?.trim() ?: "_NA_"
            String fixedAssetId = parameters.fixedAssetId?.trim() ?: "_NA_"
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String assetGlAccountId = parameters.assetGlAccountId?.trim()
            String accDepGlAccountId = parameters.accDepGlAccountId?.trim()
            String depGlAccountId = parameters.depGlAccountId?.trim()
            String profitGlAccountId = parameters.profitGlAccountId?.trim()
            String lossGlAccountId = parameters.lossGlAccountId?.trim()

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map inMap = [
                    fixedAssetTypeId: fixedAssetTypeId,
                    fixedAssetId: fixedAssetId,
                    organizationPartyId: organizationPartyId,
                    assetGlAccountId: assetGlAccountId ?: null,
                    accDepGlAccountId: accDepGlAccountId ?: null,
                    depGlAccountId: depGlAccountId ?: null,
                    profitGlAccountId: profitGlAccountId ?: null,
                    lossGlAccountId: lossGlAccountId ?: null,
                    userLogin: userLogin
            ]

            GenericValue existing = EntityQuery.use(delegator).from("FixedAssetTypeGlAccount")
                    .where("fixedAssetTypeId", fixedAssetTypeId, "fixedAssetId", fixedAssetId, "organizationPartyId", organizationPartyId)
                    .queryOne()

            if (existing) {
                dispatcher.runSync("updateFixedAssetTypeGlAccount", inMap)
            } else {
                dispatcher.runSync("createFixedAssetTypeGlAccount", inMap)
            }

            request.setAttribute("_EVENT_MESSAGE_", "Sabit kıymet türü muhasebe hesabı kaydedildi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createFixedAssetTypeGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 13. deleteFixedAssetTypeGlAccount
     */
    static String deleteFixedAssetTypeGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String fixedAssetTypeId = parameters.fixedAssetTypeId?.trim() ?: "_NA_"
            String fixedAssetId = parameters.fixedAssetId?.trim() ?: "_NA_"
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            dispatcher.runSync("deleteFixedAssetTypeGlAccount", [
                    fixedAssetTypeId: fixedAssetTypeId,
                    fixedAssetId: fixedAssetId,
                    organizationPartyId: organizationPartyId,
                    userLogin: userLogin
            ])

            request.setAttribute("_EVENT_MESSAGE_", "Sabit kıymet türü muhasebe hesabı silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deleteFixedAssetTypeGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 14. getFinAccountTypeGlAccounts
     */
    static String getFinAccountTypeGlAccounts(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("FinAccountTypeGlAccount")
                    .orderBy("finAccountTypeId")
                    .queryList()

            List<Map> result = []
            for (GenericValue gv : list) {
                GenericValue fat = EntityQuery.use(delegator).from("FinAccountType").where("finAccountTypeId", gv.finAccountTypeId).queryOne()
                GenericValue gla = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.glAccountId).queryOne()

                result.add([
                        finAccountTypeId: gv.finAccountTypeId,
                        finAccountTypeDesc: fat?.description ?: gv.finAccountTypeId,
                        organizationPartyId: gv.organizationPartyId,
                        glAccountId: gv.glAccountId,
                        accountName: gla?.accountName ?: "",
                        accountCode: gla?.accountCode ?: gv.glAccountId
                ])
            }

            request.setAttribute("finAccountTypeGlAccounts", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getFinAccountTypeGlAccounts: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 15. createFinAccountTypeGlAccount
     */
    static String createFinAccountTypeGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String finAccountTypeId = parameters.finAccountTypeId?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String glAccountId = parameters.glAccountId?.trim()

            if (UtilValidate.isEmpty(finAccountTypeId) || UtilValidate.isEmpty(glAccountId)) {
                request.setAttribute("_ERROR_MESSAGE_", "finAccountTypeId ve glAccountId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map inMap = [
                    finAccountTypeId: finAccountTypeId,
                    organizationPartyId: organizationPartyId,
                    glAccountId: glAccountId,
                    userLogin: userLogin
            ]

            GenericValue existing = EntityQuery.use(delegator).from("FinAccountTypeGlAccount")
                    .where("finAccountTypeId", finAccountTypeId, "organizationPartyId", organizationPartyId)
                    .queryOne()

            if (existing) {
                dispatcher.runSync("updateFinAccountTypeGlAccount", inMap)
            } else {
                dispatcher.runSync("createFinAccountTypeGlAccount", inMap)
            }

            request.setAttribute("_EVENT_MESSAGE_", "Finansal hesap tipi muhasebe hesabı kaydedildi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createFinAccountTypeGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 16. deleteFinAccountTypeGlAccount
     */
    static String deleteFinAccountTypeGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String finAccountTypeId = parameters.finAccountTypeId?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"

            if (UtilValidate.isEmpty(finAccountTypeId)) {
                request.setAttribute("_ERROR_MESSAGE_", "finAccountTypeId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            dispatcher.runSync("deleteFinAccountTypeGlAccount", [
                    finAccountTypeId: finAccountTypeId,
                    organizationPartyId: organizationPartyId,
                    userLogin: userLogin
            ])

            request.setAttribute("_EVENT_MESSAGE_", "Finansal hesap tipi muhasebe hesabı silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deleteFinAccountTypeGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 17. getProductCategoryGlAccounts
     */
    static String getProductCategoryGlAccounts(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("ProductCategoryGlAccount")
                    .orderBy("productCategoryId")
                    .queryList()

            List<Map> result = []
            for (GenericValue gv : list) {
                GenericValue pc = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", gv.productCategoryId).queryOne()
                GenericValue gat = EntityQuery.use(delegator).from("GlAccountType").where("glAccountTypeId", gv.glAccountTypeId).queryOne()
                GenericValue gla = EntityQuery.use(delegator).from("GlAccount").where("glAccountId", gv.glAccountId).queryOne()

                result.add([
                        productCategoryId: gv.productCategoryId,
                        categoryName: pc?.categoryName ?: (pc?.description ?: gv.productCategoryId),
                        organizationPartyId: gv.organizationPartyId,
                        glAccountTypeId: gv.glAccountTypeId,
                        glAccountTypeDesc: gat?.description ?: gv.glAccountTypeId,
                        glAccountId: gv.glAccountId,
                        accountName: gla?.accountName ?: "",
                        accountCode: gla?.accountCode ?: gv.glAccountId
                ])
            }

            request.setAttribute("productCategoryGlAccounts", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getProductCategoryGlAccounts: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 18. createProductCategoryGlAccount
     */
    static String createProductCategoryGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def parameters = request.getParameterMap()

        try {
            String productCategoryId = parameters.productCategoryId?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String glAccountTypeId = parameters.glAccountTypeId?.trim()
            String glAccountId = parameters.glAccountId?.trim()

            if (UtilValidate.isEmpty(productCategoryId) || UtilValidate.isEmpty(glAccountTypeId) || UtilValidate.isEmpty(glAccountId)) {
                request.setAttribute("_ERROR_MESSAGE_", "productCategoryId, glAccountTypeId ve glAccountId zorunludur.")
                return "error"
            }

            GenericValue existing = EntityQuery.use(delegator).from("ProductCategoryGlAccount")
                    .where("productCategoryId", productCategoryId, "organizationPartyId", organizationPartyId, "glAccountTypeId", glAccountTypeId)
                    .queryOne()

            if (existing) {
                existing.set("glAccountId", glAccountId)
                existing.store()
            } else {
                GenericValue gv = delegator.makeValue("ProductCategoryGlAccount", [
                        productCategoryId: productCategoryId,
                        organizationPartyId: organizationPartyId,
                        glAccountTypeId: glAccountTypeId,
                        glAccountId: glAccountId
                ])
                gv.create()
            }

            request.setAttribute("_EVENT_MESSAGE_", "Ürün kategorisi muhasebe hesabı kaydedildi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createProductCategoryGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 19. deleteProductCategoryGlAccount
     */
    static String deleteProductCategoryGlAccount(request, response) {
        def delegator = request.getAttribute("delegator")
        def parameters = request.getParameterMap()

        try {
            String productCategoryId = parameters.productCategoryId?.trim()
            String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
            String glAccountTypeId = parameters.glAccountTypeId?.trim()

            if (UtilValidate.isEmpty(productCategoryId) || UtilValidate.isEmpty(glAccountTypeId)) {
                request.setAttribute("_ERROR_MESSAGE_", "productCategoryId ve glAccountTypeId zorunludur.")
                return "error"
            }

            GenericValue existing = EntityQuery.use(delegator).from("ProductCategoryGlAccount")
                    .where("productCategoryId", productCategoryId, "organizationPartyId", organizationPartyId, "glAccountTypeId", glAccountTypeId)
                    .queryOne()

            if (existing) {
                existing.remove()
            }

            request.setAttribute("_EVENT_MESSAGE_", "Ürün kategorisi muhasebe hesabı silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deleteProductCategoryGlAccount: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }
}
