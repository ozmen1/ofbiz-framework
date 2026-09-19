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

final String MODULE = "PaymentGatewayEvents.groovy"

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
 * 1. getPaymentGatewayConfigs
 * Returns all PaymentGatewayConfig records
 */
String getPaymentGatewayConfigs() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> rawConfigs = EntityQuery.use(delegator)
            .from("PaymentGatewayConfig")
            .orderBy("paymentGatewayConfigId")
            .queryList()

        List<Map<String, Object>> configs = []
        for (GenericValue cfg : rawConfigs) {
            String typeId = cfg.paymentGatewayConfigTypeId
            String typeDesc = typeId
            if (typeId) {
                GenericValue typeGv = EntityQuery.use(delegator).from("PaymentGatewayConfigType").where("paymentGatewayConfigTypeId", typeId).cache().queryOne()
                if (typeGv && typeGv.description) {
                    typeDesc = typeGv.description
                }
            }

            configs.add([
                paymentGatewayConfigId: cfg.paymentGatewayConfigId,
                paymentGatewayConfigTypeId: typeId,
                typeDescription: typeDesc,
                description: cfg.description ?: cfg.paymentGatewayConfigId
            ])
        }

        request.setAttribute("configs", configs)
        request.setAttribute("success", true)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error fetching payment gateway configs: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 2. savePaymentGatewayConfig
 * Creates or updates PaymentGatewayConfig
 */
String savePaymentGatewayConfig() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String configId = parameters.paymentGatewayConfigId?.trim()
        String configTypeId = parameters.paymentGatewayConfigTypeId?.trim()
        String description = parameters.description?.trim()

        if (!configId) {
            configId = delegator.getNextSeqId("PaymentGatewayConfig")
        }

        GenericValue cfg = EntityQuery.use(delegator).from("PaymentGatewayConfig").where("paymentGatewayConfigId", configId).queryOne()
        boolean isNew = false
        if (!cfg) {
            cfg = delegator.makeValue("PaymentGatewayConfig", [paymentGatewayConfigId: configId])
            isNew = true
        }

        cfg.paymentGatewayConfigTypeId = configTypeId ?: null
        cfg.description = description ?: null

        if (isNew) {
            delegator.create(cfg)
        } else {
            delegator.store(cfg)
        }

        request.setAttribute("success", true)
        request.setAttribute("paymentGatewayConfigId", configId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error saving payment gateway config: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 3. deletePaymentGatewayConfig
 * Deletes PaymentGatewayConfig
 */
String deletePaymentGatewayConfig() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String configId = parameters.paymentGatewayConfigId?.trim()
        if (!configId) {
            request.setAttribute("error", "paymentGatewayConfigId is required")
            return "error"
        }

        GenericValue cfg = EntityQuery.use(delegator).from("PaymentGatewayConfig").where("paymentGatewayConfigId", configId).queryOne()
        if (cfg) {
            delegator.removeValue(cfg)
        }

        request.setAttribute("success", true)
        request.setAttribute("paymentGatewayConfigId", configId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error deleting payment gateway config: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 4. getPaymentGatewayResponses
 * Returns paginated PaymentGatewayResponse logs with filters and summary KPI
 */
String getPaymentGatewayResponses() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String serviceTypeId = parameters.paymentServiceTypeEnumId?.trim()
        String paymentMethodTypeId = parameters.paymentMethodTypeId?.trim()
        String statusFilter = parameters.statusFilter?.trim() // 'APPROVED', 'CAPTURED', 'DECLINED'
        Timestamp fromDate = parseDateToTimestamp(parameters.fromDate, false)
        Timestamp thruDate = parseDateToTimestamp(parameters.thruDate, true)

        int viewIndex = parameters.viewIndex ? Integer.parseInt(parameters.viewIndex.toString()) : 0
        int viewSize = parameters.viewSize ? Integer.parseInt(parameters.viewSize.toString()) : 25

        List<EntityCondition> conds = []

        if (serviceTypeId) {
            conds.add(EntityCondition.makeCondition("paymentServiceTypeEnumId", EntityOperator.EQUALS, serviceTypeId))
        }
        if (paymentMethodTypeId) {
            conds.add(EntityCondition.makeCondition("paymentMethodTypeId", EntityOperator.EQUALS, paymentMethodTypeId))
        }
        if (fromDate) {
            conds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        if (thruDate) {
            conds.add(EntityCondition.makeCondition("transactionDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }

        if (statusFilter == "DECLINED") {
            conds.add(EntityCondition.makeCondition(
                EntityOperator.OR,
                EntityCondition.makeCondition("resultDeclined", EntityOperator.EQUALS, "Y"),
                EntityCondition.makeCondition("resultNsf", EntityOperator.EQUALS, "Y"),
                EntityCondition.makeCondition("resultBadExpire", EntityOperator.EQUALS, "Y"),
                EntityCondition.makeCondition("resultBadCardNumber", EntityOperator.EQUALS, "Y")
            ))
        } else if (statusFilter == "CAPTURED") {
            conds.add(EntityCondition.makeCondition("gatewayFlag", EntityOperator.EQUALS, "C"))
        } else if (statusFilter == "APPROVED") {
            conds.add(EntityCondition.makeCondition("gatewayFlag", EntityOperator.EQUALS, "A"))
        }

        if (search) {
            List<EntityCondition> searchConds = [
                EntityCondition.makeCondition("paymentGatewayResponseId", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("referenceNum", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("altReference", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("gatewayCode", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("gatewayMessage", EntityOperator.LIKE, "%" + search + "%"),
                EntityCondition.makeCondition("orderPaymentPreferenceId", EntityOperator.LIKE, "%" + search + "%")
            ]
            conds.add(EntityCondition.makeCondition(searchConds, EntityOperator.OR))
        }

        EntityCondition mainCond = conds ? EntityCondition.makeCondition(conds, EntityOperator.AND) : null

        long totalCount = EntityQuery.use(delegator)
            .from("PaymentGatewayResponse")
            .where(mainCond)
            .queryCount()

        List<GenericValue> rawResponses = EntityQuery.use(delegator)
            .from("PaymentGatewayResponse")
            .where(mainCond)
            .orderBy("transactionDate DESC")
            .cursorScroll(true)
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List<Map<String, Object>> responses = []
        for (GenericValue r : rawResponses) {
            String sTypeDesc = r.paymentServiceTypeEnumId
            if (r.paymentServiceTypeEnumId) {
                GenericValue sEnum = EntityQuery.use(delegator).from("Enumeration").where("enumId", r.paymentServiceTypeEnumId).cache().queryOne()
                if (sEnum && sEnum.description) sTypeDesc = sEnum.description
            }

            String pmTypeDesc = r.paymentMethodTypeId
            if (r.paymentMethodTypeId) {
                GenericValue pmTypeGv = EntityQuery.use(delegator).from("PaymentMethodType").where("paymentMethodTypeId", r.paymentMethodTypeId).cache().queryOne()
                if (pmTypeGv && pmTypeGv.description) pmTypeDesc = pmTypeGv.description
            }

            boolean isDeclined = r.resultDeclined == "Y" || r.resultNsf == "Y" || r.resultBadExpire == "Y" || r.resultBadCardNumber == "Y"
            String status = isDeclined ? "DECLINED" : (r.gatewayFlag == "C" ? "CAPTURED" : (r.gatewayFlag == "A" ? "APPROVED" : (r.gatewayFlag ?: "UNKNOWN")))

            responses.add([
                paymentGatewayResponseId: r.paymentGatewayResponseId,
                paymentServiceTypeEnumId: r.paymentServiceTypeEnumId,
                paymentServiceTypeDesc: sTypeDesc,
                orderPaymentPreferenceId: r.orderPaymentPreferenceId,
                paymentMethodTypeId: r.paymentMethodTypeId,
                paymentMethodTypeDesc: pmTypeDesc,
                paymentMethodId: r.paymentMethodId,
                transCodeEnumId: r.transCodeEnumId,
                amount: r.amount ? ((BigDecimal) r.amount).doubleValue() : 0.0,
                currencyUomId: r.currencyUomId ?: "USD",
                referenceNum: r.referenceNum,
                altReference: r.altReference,
                gatewayCode: r.gatewayCode,
                gatewayFlag: r.gatewayFlag,
                gatewayMessage: r.gatewayMessage,
                transactionDate: r.transactionDate?.toString(),
                status: status,
                resultDeclined: r.resultDeclined ?: "N",
                resultNsf: r.resultNsf ?: "N",
                resultBadExpire: r.resultBadExpire ?: "N",
                resultBadCardNumber: r.resultBadCardNumber ?: "N"
            ])
        }

        // Global KPI summary stats
        long allCount = EntityQuery.use(delegator).from("PaymentGatewayResponse").queryCount()
        long approvedCount = EntityQuery.use(delegator).from("PaymentGatewayResponse").where(EntityCondition.makeCondition("gatewayFlag", EntityOperator.IN, ["A", "C"])).queryCount()
        long declinedCount = EntityQuery.use(delegator).from("PaymentGatewayResponse").where(EntityCondition.makeCondition("resultDeclined", EntityOperator.EQUALS, "Y")).queryCount()

        double totalCapturedAmount = 0.0
        List<GenericValue> capturedGvs = EntityQuery.use(delegator).from("PaymentGatewayResponse").where("gatewayFlag", "C").queryList()
        for (GenericValue cGv : capturedGvs) {
            if (cGv.amount) totalCapturedAmount += ((BigDecimal) cGv.amount).doubleValue()
        }

        request.setAttribute("responses", responses)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("stats", [
            totalTransactions: allCount,
            approvedCount: approvedCount,
            declinedCount: declinedCount,
            totalCapturedAmount: totalCapturedAmount
        ])
        request.setAttribute("success", true)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error fetching payment gateway responses: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 5. getPaymentGatewayResponseDetail
 * Returns single PaymentGatewayResponse with all fields and linked messages
 */
String getPaymentGatewayResponseDetail() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String responseId = parameters.paymentGatewayResponseId?.trim()
        if (!responseId) {
            request.setAttribute("error", "paymentGatewayResponseId is required")
            return "error"
        }

        GenericValue r = EntityQuery.use(delegator).from("PaymentGatewayResponse").where("paymentGatewayResponseId", responseId).queryOne()
        if (!r) {
            request.setAttribute("error", "PaymentGatewayResponse not found: " + responseId)
            return "error"
        }

        List<GenericValue> msgsGv = EntityQuery.use(delegator)
            .from("PaymentGatewayRespMsg")
            .where("paymentGatewayResponseId", responseId)
            .queryList()
        List<String> messages = msgsGv.collect { it.pgrMessage }

        // Linked payments (if any payment has paymentGatewayResponseId)
        List<GenericValue> linkedPayments = EntityQuery.use(delegator)
            .from("Payment")
            .where("paymentGatewayResponseId", responseId)
            .queryList()
        List<Map<String, Object>> paymentsList = linkedPayments.collect {
            [
                paymentId: it.paymentId,
                paymentTypeId: it.paymentTypeId,
                partyIdFrom: it.partyIdFrom,
                partyIdTo: it.partyIdTo,
                amount: it.amount ? ((BigDecimal) it.amount).doubleValue() : 0.0,
                statusId: it.statusId
            ]
        }

        boolean isDeclined = r.resultDeclined == "Y" || r.resultNsf == "Y" || r.resultBadExpire == "Y" || r.resultBadCardNumber == "Y"
        String status = isDeclined ? "DECLINED" : (r.gatewayFlag == "C" ? "CAPTURED" : (r.gatewayFlag == "A" ? "APPROVED" : (r.gatewayFlag ?: "UNKNOWN")))

        Map<String, Object> detail = [
            paymentGatewayResponseId: r.paymentGatewayResponseId,
            paymentServiceTypeEnumId: r.paymentServiceTypeEnumId,
            orderPaymentPreferenceId: r.orderPaymentPreferenceId,
            paymentMethodTypeId: r.paymentMethodTypeId,
            paymentMethodId: r.paymentMethodId,
            transCodeEnumId: r.transCodeEnumId,
            amount: r.amount ? ((BigDecimal) r.amount).doubleValue() : 0.0,
            currencyUomId: r.currencyUomId ?: "USD",
            referenceNum: r.referenceNum,
            altReference: r.altReference,
            subReference: r.subReference,
            gatewayCode: r.gatewayCode,
            gatewayFlag: r.gatewayFlag,
            gatewayAvsResult: r.gatewayAvsResult,
            gatewayCvResult: r.gatewayCvResult,
            gatewayScoreResult: r.gatewayScoreResult,
            gatewayMessage: r.gatewayMessage,
            transactionDate: r.transactionDate?.toString(),
            resultDeclined: r.resultDeclined ?: "N",
            resultNsf: r.resultNsf ?: "N",
            resultBadExpire: r.resultBadExpire ?: "N",
            resultBadCardNumber: r.resultBadCardNumber ?: "N",
            status: status,
            messages: messages,
            linkedPayments: paymentsList
        ]

        request.setAttribute("responseDetail", detail)
        request.setAttribute("success", true)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error fetching payment gateway response detail: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}

/**
 * 6. getPaymentGatewayMetadata
 * Returns types, enums, and payment method types
 */
String getPaymentGatewayMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Config types
        List<GenericValue> configTypesGv = EntityQuery.use(delegator)
            .from("PaymentGatewayConfigType")
            .orderBy("description")
            .cache()
            .queryList()
        List<Map<String, Object>> configTypes = configTypesGv.collect {
            [paymentGatewayConfigTypeId: it.paymentGatewayConfigTypeId, description: it.description ?: it.paymentGatewayConfigTypeId]
        }

        // Service types (PRDS_PAYSVC)
        List<GenericValue> svcTypesGv = EntityQuery.use(delegator)
            .from("Enumeration")
            .where("enumTypeId", "PRDS_PAYSVC")
            .orderBy("sequenceId")
            .cache()
            .queryList()
        List<Map<String, Object>> serviceTypes = svcTypesGv.collect {
            [enumId: it.enumId, description: it.description ?: it.enumId]
        }

        // Trans codes (PGT_CODE)
        List<GenericValue> txCodesGv = EntityQuery.use(delegator)
            .from("Enumeration")
            .where("enumTypeId", "PGT_CODE")
            .orderBy("sequenceId")
            .cache()
            .queryList()
        List<Map<String, Object>> transCodes = txCodesGv.collect {
            [enumId: it.enumId, description: it.description ?: it.enumId]
        }

        // Payment Method Types
        List<GenericValue> pmtTypesGv = EntityQuery.use(delegator)
            .from("PaymentMethodType")
            .orderBy("description")
            .cache()
            .queryList()
        List<Map<String, Object>> paymentMethodTypes = pmtTypesGv.collect {
            [paymentMethodTypeId: it.paymentMethodTypeId, description: it.description ?: it.paymentMethodTypeId]
        }

        request.setAttribute("metadata", [
            configTypes: configTypes,
            serviceTypes: serviceTypes,
            transCodes: transCodes,
            paymentMethodTypes: paymentMethodTypes
        ])
        request.setAttribute("success", true)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error fetching payment gateway metadata: " + e.getMessage(), MODULE)
        request.setAttribute("error", e.getMessage())
        return "error"
    }
}
