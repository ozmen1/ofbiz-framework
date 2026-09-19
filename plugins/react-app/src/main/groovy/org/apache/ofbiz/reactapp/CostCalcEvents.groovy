package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil

class CostCalcEvents {

    public static final String MODULE = CostCalcEvents.class.getName()

    /**
     * 1. getCostComponentCalcs
     * List all cost component calculation formulas
     */
    static String getCostComponentCalcs(request, response) {
        def delegator = request.getAttribute("delegator")
        try {
            List<GenericValue> list = EntityQuery.use(delegator)
                    .from("CostComponentCalc")
                    .orderBy("costComponentCalcId")
                    .queryList()

            List<Map> result = []
            for (GenericValue c : list) {
                GenericValue costGlType = c.costGlAccountTypeId ? EntityQuery.use(delegator).from("GlAccountType").where("glAccountTypeId", c.costGlAccountTypeId).queryOne() : null
                GenericValue offsetGlType = c.offsettingGlAccountTypeId ? EntityQuery.use(delegator).from("GlAccountType").where("glAccountTypeId", c.offsettingGlAccountTypeId).queryOne() : null

                result.add([
                        costComponentCalcId: c.costComponentCalcId,
                        description: c.description ?: "",
                        costGlAccountTypeId: c.costGlAccountTypeId ?: "",
                        costGlAccountTypeDesc: costGlType?.description ?: (c.costGlAccountTypeId ?: ""),
                        offsettingGlAccountTypeId: c.offsettingGlAccountTypeId ?: "",
                        offsettingGlAccountTypeDesc: offsetGlType?.description ?: (c.offsettingGlAccountTypeId ?: ""),
                        fixedCost: c.fixedCost ?: BigDecimal.ZERO,
                        variableCost: c.variableCost ?: BigDecimal.ZERO,
                        perMilliSecond: c.perMilliSecond ?: 0L,
                        currencyUomId: c.currencyUomId ?: "TRY",
                        costCustomMethodId: c.costCustomMethodId ?: ""
                ])
            }

            request.setAttribute("costCalcs", result)
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in getCostComponentCalcs: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 2. createCostComponentCalc
     */
    static String createCostComponentCalc(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String description = parameters.description?.trim()
            if (UtilValidate.isEmpty(description)) {
                request.setAttribute("_ERROR_MESSAGE_", "Açıklama (description) zorunludur.")
                return "error"
            }

            String costComponentCalcId = parameters.costComponentCalcId?.trim() ?: delegator.getNextSeqId("CostComponentCalc")
            BigDecimal fixedCost = parameters.fixedCost ? new BigDecimal(parameters.fixedCost.toString()) : BigDecimal.ZERO
            BigDecimal variableCost = parameters.variableCost ? new BigDecimal(parameters.variableCost.toString()) : BigDecimal.ZERO
            Long perMilliSecond = parameters.perMilliSecond ? Long.parseLong(parameters.perMilliSecond.toString()) : 0L
            String currencyUomId = parameters.currencyUomId?.trim() ?: "TRY"
            String costGlAccountTypeId = parameters.costGlAccountTypeId?.trim() ?: null
            String offsettingGlAccountTypeId = parameters.offsettingGlAccountTypeId?.trim() ?: null

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map serviceIn = [
                    costComponentCalcId: costComponentCalcId,
                    description: description,
                    costGlAccountTypeId: costGlAccountTypeId,
                    offsettingGlAccountTypeId: offsettingGlAccountTypeId,
                    fixedCost: fixedCost,
                    variableCost: variableCost,
                    perMilliSecond: perMilliSecond,
                    currencyUomId: currencyUomId,
                    userLogin: userLogin
            ]

            Map sRes = dispatcher.runSync("createCostComponentCalc", serviceIn)
            if (ServiceUtil.isError(sRes)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(sRes))
                return "error"
            }

            request.setAttribute("costComponentCalcId", costComponentCalcId)
            request.setAttribute("_EVENT_MESSAGE_", "Maliyet hesaplama bileşeni oluşturuldu: ${costComponentCalcId}")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in createCostComponentCalc: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 3. updateCostComponentCalc
     */
    static String updateCostComponentCalc(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String costComponentCalcId = parameters.costComponentCalcId?.trim()
            if (UtilValidate.isEmpty(costComponentCalcId)) {
                request.setAttribute("_ERROR_MESSAGE_", "costComponentCalcId zorunludur.")
                return "error"
            }

            GenericValue existing = EntityQuery.use(delegator).from("CostComponentCalc")
                    .where("costComponentCalcId", costComponentCalcId).queryOne()
            if (!existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Maliyet bileşeni bulunamadı: ${costComponentCalcId}")
                return "error"
            }

            BigDecimal fixedCost = parameters.fixedCost ? new BigDecimal(parameters.fixedCost.toString()) : existing.fixedCost
            BigDecimal variableCost = parameters.variableCost ? new BigDecimal(parameters.variableCost.toString()) : existing.variableCost
            Long perMilliSecond = parameters.perMilliSecond ? Long.parseLong(parameters.perMilliSecond.toString()) : existing.perMilliSecond
            String currencyUomId = parameters.currencyUomId?.trim() ?: existing.currencyUomId
            String costGlAccountTypeId = parameters.costGlAccountTypeId != null ? parameters.costGlAccountTypeId.trim() : existing.costGlAccountTypeId
            String offsettingGlAccountTypeId = parameters.offsettingGlAccountTypeId != null ? parameters.offsettingGlAccountTypeId.trim() : existing.offsettingGlAccountTypeId
            String description = parameters.description?.trim() ?: existing.description

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map serviceIn = [
                    costComponentCalcId: costComponentCalcId,
                    description: description,
                    costGlAccountTypeId: costGlAccountTypeId,
                    offsettingGlAccountTypeId: offsettingGlAccountTypeId,
                    fixedCost: fixedCost,
                    variableCost: variableCost,
                    perMilliSecond: perMilliSecond,
                    currencyUomId: currencyUomId,
                    userLogin: userLogin
            ]

            Map sRes = dispatcher.runSync("updateCostComponentCalc", serviceIn)
            if (ServiceUtil.isError(sRes)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(sRes))
                return "error"
            }

            request.setAttribute("costComponentCalcId", costComponentCalcId)
            request.setAttribute("_EVENT_MESSAGE_", "Maliyet bileşeni güncellendi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in updateCostComponentCalc: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }

    /**
     * 4. deleteCostComponentCalc
     */
    static String deleteCostComponentCalc(request, response) {
        def delegator = request.getAttribute("delegator")
        def dispatcher = request.getAttribute("dispatcher")
        def parameters = request.getParameterMap()

        try {
            String costComponentCalcId = parameters.costComponentCalcId?.trim()
            if (UtilValidate.isEmpty(costComponentCalcId)) {
                request.setAttribute("_ERROR_MESSAGE_", "costComponentCalcId zorunludur.")
                return "error"
            }

            GenericValue userLogin = delegator.findOne("UserLogin", [userLoginId: "system"], true)
            Map sRes = dispatcher.runSync("removeCostComponentCalc", [
                    costComponentCalcId: costComponentCalcId,
                    userLogin: userLogin
            ])
            if (ServiceUtil.isError(sRes)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(sRes))
                return "error"
            }

            request.setAttribute("_EVENT_MESSAGE_", "Maliyet hesaplama bileşeni silindi.")
            return "success"
        } catch (Exception e) {
            Debug.logError(e, "Error in deleteCostComponentCalc: " + e.getMessage(), MODULE)
            request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
            return "error"
        }
    }
}
