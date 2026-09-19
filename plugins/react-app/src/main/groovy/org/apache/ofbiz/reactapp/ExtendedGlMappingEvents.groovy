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
     * Returns dropdown metadata for variance reasons, roles, card types, GL account types
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

            request.setAttribute("metadata", [
                    varianceReasons: varianceReasons,
                    roleTypes: roleTypes,
                    glAccountTypes: glAccountTypes,
                    cardTypes: cardTypes
            ])
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getExtendedGlMetadata: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }
}
