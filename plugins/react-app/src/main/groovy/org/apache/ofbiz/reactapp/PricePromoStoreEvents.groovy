package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilHttp
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil
import javax.servlet.http.HttpServletRequest
import javax.servlet.http.HttpServletResponse
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "PricePromoStoreEvents.groovy"

String cleanStr(String val) {
    if (val == null) return null
    String trimmed = val.trim()
    return trimmed.isEmpty() ? null : trimmed
}

Timestamp parseTimestamp(String val) {
    if (val == null || val.trim().isEmpty()) return null
    try {
        String s = val.trim()
        if (s.length() == 10) s += " 00:00:00"
        return Timestamp.valueOf(s)
    } catch (Exception e) {
        return null
    }
}

BigDecimal parseBigDecimal(String val) {
    if (val == null || val.trim().isEmpty()) return null
    try {
        return new BigDecimal(val.trim())
    } catch (Exception e) {
        return null
    }
}

Long parseLong(String val) {
    if (val == null || val.trim().isEmpty()) return null
    try {
        return Long.parseLong(val.trim())
    } catch (Exception e) {
        return null
    }
}

GenericValue getEffectiveUserLogin() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    GenericValue uL = (GenericValue) request.getSession().getAttribute("userLogin")
    if (!uL) {
        uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
        if (!uL) {
            uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }
    }
    return uL
}

// =========================================================================
// 1. METADATA & ÖZET KÜTÜPHANESİ
// =========================================================================
String getPricePromoStoreMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        // Price Rule Condition Input Params (PROD_PRICE_IN_PARAM)
        def priceInParams = EntityQuery.use(delegator).from("Enumeration")
            .where("enumTypeId", "PROD_PRICE_IN_PARAM")
            .orderBy("sequenceId", "description")
            .cache(true)
            .queryList()
            .collect { [enumId: it.enumId, description: it.description ?: it.enumId] }

        // Price Rule Operators (PROD_PRICE_COND)
        def priceOperators = EntityQuery.use(delegator).from("Enumeration")
            .where("enumTypeId", "PROD_PRICE_COND")
            .orderBy("sequenceId", "description")
            .cache(true)
            .queryList()
            .collect { [enumId: it.enumId, description: it.description ?: it.enumId] }

        // Price Rule Action Types
        def priceActionTypes = EntityQuery.use(delegator).from("ProductPriceActionType")
            .orderBy("description")
            .cache(true)
            .queryList()
            .collect { [productPriceActionTypeId: it.productPriceActionTypeId, description: it.description ?: it.productPriceActionTypeId] }

        // Promo Condition Input Params (PROD_PROMO_IN_PARAM)
        def promoInParams = EntityQuery.use(delegator).from("Enumeration")
            .where("enumTypeId", "PROD_PROMO_IN_PARAM")
            .orderBy("sequenceId", "description")
            .cache(true)
            .queryList()
            .collect { [enumId: it.enumId, description: it.description ?: it.enumId] }

        // Promo Operators (PROD_PROMO_COND)
        def promoOperators = EntityQuery.use(delegator).from("Enumeration")
            .where("enumTypeId", "PROD_PROMO_COND")
            .orderBy("sequenceId", "description")
            .cache(true)
            .queryList()
            .collect { [enumId: it.enumId, description: it.description ?: it.enumId] }

        // Promo Action Enums (PROD_PROMO_ACTION)
        def promoActions = EntityQuery.use(delegator).from("Enumeration")
            .where("enumTypeId", "PROD_PROMO_ACTION")
            .orderBy("sequenceId", "description")
            .cache(true)
            .queryList()
            .collect { [enumId: it.enumId, description: it.description ?: it.enumId] }

        // Quick Catalogs
        def catalogs = EntityQuery.use(delegator).from("ProdCatalog")
            .orderBy("catalogName", "prodCatalogId")
            .cache(true)
            .queryList()
            .collect { [prodCatalogId: it.prodCatalogId, catalogName: it.catalogName ?: it.prodCatalogId] }

        // Quick Stores
        def stores = EntityQuery.use(delegator).from("ProductStore")
            .orderBy("storeName", "productStoreId")
            .cache(true)
            .queryList()
            .collect { [
                productStoreId: it.productStoreId,
                storeName: it.storeName ?: it.productStoreId,
                companyName: it.companyName,
                defaultCurrencyUomId: it.defaultCurrencyUomId
            ] }

        // Quick Categories (First 150)
        def categories = EntityQuery.use(delegator).from("ProductCategory")
            .maxRows(150)
            .orderBy("categoryName")
            .cache(true)
            .queryList()
            .collect { [productCategoryId: it.productCategoryId, categoryName: it.categoryName ?: it.productCategoryId] }

        // Currencies
        def currencies = EntityQuery.use(delegator).from("Uom")
            .where("uomTypeId", "CURRENCY_MEASURE")
            .orderBy("description", "uomId")
            .cache(true)
            .queryList()
            .collect { [uomId: it.uomId, description: "${it.description ?: it.uomId} (${it.uomId})"] }

        // Facilities
        def facilities = EntityQuery.use(delegator).from("Facility")
            .orderBy("facilityName")
            .cache(true)
            .queryList()
            .collect { [facilityId: it.facilityId, facilityName: it.facilityName ?: it.facilityId] }

        request.setAttribute("metadata", [
            priceInParams: priceInParams,
            priceOperators: priceOperators,
            priceActionTypes: priceActionTypes,
            promoInParams: promoInParams,
            promoOperators: promoOperators,
            promoActions: promoActions,
            catalogs: catalogs,
            stores: stores,
            categories: categories,
            currencies: currencies,
            facilities: facilities
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Metadata alınamadı: " + e.message)
        return "error"
    }
}

// =========================================================================
// 2. FİYAT KURALLARI (ProductPriceRule)
// =========================================================================
String getProductPriceRules() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String searchKeyword = cleanStr(request.getParameter("searchKeyword"))
        String isSale = cleanStr(request.getParameter("isSale"))
        int viewIndex = 0
        int viewSize = 50

        try {
            if (request.getParameter("viewIndex")) viewIndex = Integer.parseInt(request.getParameter("viewIndex"))
            if (request.getParameter("viewSize")) viewSize = Integer.parseInt(request.getParameter("viewSize"))
        } catch (Exception ignored) {}

        List<EntityCondition> conds = []
        if (searchKeyword) {
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("ruleName", EntityOperator.LIKE, "%" + searchKeyword + "%"),
                EntityCondition.makeCondition("description", EntityOperator.LIKE, "%" + searchKeyword + "%"),
                EntityCondition.makeCondition("productPriceRuleId", EntityOperator.LIKE, "%" + searchKeyword + "%")
            ], EntityOperator.OR))
        }
        if (isSale) {
            conds.add(EntityCondition.makeCondition("isSale", isSale))
        }

        def query = EntityQuery.use(delegator).from("ProductPriceRule")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        def ruleList = query.orderBy("-createdStamp", "ruleName")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List<Map> rules = []
        for (GenericValue r : ruleList) {
            String ruleId = r.productPriceRuleId
            long condCount = EntityQuery.use(delegator).from("ProductPriceCond")
                .where("productPriceRuleId", ruleId)
                .queryCount()

            long actionCount = EntityQuery.use(delegator).from("ProductPriceAction")
                .where("productPriceRuleId", ruleId)
                .queryCount()

            rules.add([
                productPriceRuleId: ruleId,
                ruleName: r.ruleName,
                description: r.description,
                isSale: r.isSale,
                fromDate: r.fromDate ? r.fromDate.toString() : null,
                thruDate: r.thruDate ? r.thruDate.toString() : null,
                condCount: condCount,
                actionCount: actionCount
            ])
        }

        // Metrics
        long totalRules = EntityQuery.use(delegator).from("ProductPriceRule").queryCount()
        long totalPromos = EntityQuery.use(delegator).from("ProductPromo").queryCount()
        long totalPromoCodes = EntityQuery.use(delegator).from("ProductPromoCode").queryCount()
        long totalStores = EntityQuery.use(delegator).from("ProductStore").queryCount()

        request.setAttribute("result", [
            rules: rules,
            totalCount: totalCount,
            viewIndex: viewIndex,
            viewSize: viewSize,
            metrics: [
                totalRules: totalRules,
                totalPromos: totalPromos,
                totalPromoCodes: totalPromoCodes,
                totalStores: totalStores
            ]
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat kuralları getirilemedi: " + e.message)
        return "error"
    }
}

String getPriceRuleDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        if (!ruleId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId parametresi zorunludur.")
            return "error"
        }

        GenericValue rule = EntityQuery.use(delegator).from("ProductPriceRule")
            .where("productPriceRuleId", ruleId)
            .queryOne()

        if (!rule) {
            request.setAttribute("_ERROR_MESSAGE_", "Fiyat kuralı bulunamadı: " + ruleId)
            return "error"
        }

        // Conditions
        def condEntities = EntityQuery.use(delegator).from("ProductPriceCond")
            .where("productPriceRuleId", ruleId)
            .orderBy("productPriceCondSeqId")
            .queryList()

        List<Map> conditions = []
        for (GenericValue c : condEntities) {
            String inParamDesc = null
            if (c.inputParamEnumId) {
                GenericValue inParam = EntityQuery.use(delegator).from("Enumeration")
                    .where("enumId", c.inputParamEnumId)
                    .cache(true)
                    .queryOne()
                inParamDesc = inParam?.description ?: c.inputParamEnumId
            }
            String opDesc = null
            if (c.operatorEnumId) {
                GenericValue op = EntityQuery.use(delegator).from("Enumeration")
                    .where("enumId", c.operatorEnumId)
                    .cache(true)
                    .queryOne()
                opDesc = op?.description ?: c.operatorEnumId
            }

            conditions.add([
                productPriceRuleId: c.productPriceRuleId,
                productPriceCondSeqId: c.productPriceCondSeqId,
                inputParamEnumId: c.inputParamEnumId,
                inputParamDesc: inParamDesc,
                operatorEnumId: c.operatorEnumId,
                operatorDesc: opDesc,
                condValue: c.condValue
            ])
        }

        // Actions
        def actionEntities = EntityQuery.use(delegator).from("ProductPriceAction")
            .where("productPriceRuleId", ruleId)
            .orderBy("productPriceActionSeqId")
            .queryList()

        List<Map> actions = []
        for (GenericValue a : actionEntities) {
            String actTypeDesc = null
            if (a.productPriceActionTypeId) {
                GenericValue at = EntityQuery.use(delegator).from("ProductPriceActionType")
                    .where("productPriceActionTypeId", a.productPriceActionTypeId)
                    .cache(true)
                    .queryOne()
                actTypeDesc = at?.description ?: a.productPriceActionTypeId
            }

            actions.add([
                productPriceRuleId: a.productPriceRuleId,
                productPriceActionSeqId: a.productPriceActionSeqId,
                productPriceActionTypeId: a.productPriceActionTypeId,
                actionTypeDesc: actTypeDesc,
                amount: a.amount != null ? a.amount.doubleValue() : null,
                rateCode: a.rateCode
            ])
        }

        request.setAttribute("ruleDetail", [
            productPriceRuleId: rule.productPriceRuleId,
            ruleName: rule.ruleName,
            description: rule.description,
            isSale: rule.isSale,
            fromDate: rule.fromDate ? rule.fromDate.toString() : null,
            thruDate: rule.thruDate ? rule.thruDate.toString() : null,
            conditions: conditions,
            actions: actions
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Kural detayı alınamadı: " + e.message)
        return "error"
    }
}

String createProductPriceRule() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleName = cleanStr(request.getParameter("ruleName"))
        if (!ruleName) {
            request.setAttribute("_ERROR_MESSAGE_", "ruleName zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            ruleName: ruleName,
            description: cleanStr(request.getParameter("description")),
            isSale: cleanStr(request.getParameter("isSale")) ?: "N",
            fromDate: parseTimestamp(request.getParameter("fromDate")),
            thruDate: parseTimestamp(request.getParameter("thruDate"))
        ]
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        if (ruleId) inMap.productPriceRuleId = ruleId

        Map outMap = dispatcher.runSync("createProductPriceRule", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Fiyat kuralı başarıyla oluşturuldu.")
        request.setAttribute("productPriceRuleId", outMap.productPriceRuleId)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat kuralı oluşturulamadı: " + e.message)
        return "error"
    }
}

String updateProductPriceRule() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        String ruleName = cleanStr(request.getParameter("ruleName"))
        if (!ruleId || !ruleName) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId ve ruleName zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            productPriceRuleId: ruleId,
            ruleName: ruleName,
            description: cleanStr(request.getParameter("description")),
            isSale: cleanStr(request.getParameter("isSale")),
            fromDate: parseTimestamp(request.getParameter("fromDate")),
            thruDate: parseTimestamp(request.getParameter("thruDate"))
        ]

        Map outMap = dispatcher.runSync("updateProductPriceRule", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Fiyat kuralı güncellendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat kuralı güncellenemedi: " + e.message)
        return "error"
    }
}

String deleteProductPriceRule() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        if (!ruleId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId zorunludur.")
            return "error"
        }

        // Delete associated conditions first
        delegator.removeByAnd("ProductPriceCond", [productPriceRuleId: ruleId])
        // Delete associated actions first
        delegator.removeByAnd("ProductPriceAction", [productPriceRuleId: ruleId])

        Map outMap = dispatcher.runSync("deleteProductPriceRule", [
            userLogin: userLogin,
            productPriceRuleId: ruleId
        ])
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Fiyat kuralı ve alt bileşenleri silindi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat kuralı silinemedi: " + e.message)
        return "error"
    }
}

String createProductPriceCond() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        String inParam = cleanStr(request.getParameter("inputParamEnumId"))
        String op = cleanStr(request.getParameter("operatorEnumId"))
        String condValue = cleanStr(request.getParameter("condValue"))

        if (!ruleId || !inParam || !op) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId, inputParamEnumId ve operatorEnumId zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            productPriceRuleId: ruleId,
            inputParamEnumId: inParam,
            operatorEnumId: op,
            condValue: condValue,
            condValueInput: condValue
        ]

        Map outMap = dispatcher.runSync("createProductPriceCond", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Fiyat koşulu eklendi.")
        request.setAttribute("productPriceCondSeqId", outMap.productPriceCondSeqId)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat koşulu eklenemedi: " + e.message)
        return "error"
    }
}

String deleteProductPriceCond() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        String condSeqId = cleanStr(request.getParameter("productPriceCondSeqId"))
        if (!ruleId || !condSeqId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId ve productPriceCondSeqId zorunludur.")
            return "error"
        }

        Map outMap = dispatcher.runSync("deleteProductPriceCond", [
            userLogin: userLogin,
            productPriceRuleId: ruleId,
            productPriceCondSeqId: condSeqId
        ])
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Koşul başarıyla silindi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Koşul silinemedi: " + e.message)
        return "error"
    }
}

String createProductPriceAction() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        String actTypeId = cleanStr(request.getParameter("productPriceActionTypeId"))
        BigDecimal amount = parseBigDecimal(request.getParameter("amount"))

        if (!ruleId || !actTypeId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId ve productPriceActionTypeId zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            productPriceRuleId: ruleId,
            productPriceActionTypeId: actTypeId,
            amount: amount,
            rateCode: cleanStr(request.getParameter("rateCode"))
        ]

        Map outMap = dispatcher.runSync("createProductPriceAction", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Fiyat aksiyonu başarıyla eklendi.")
        request.setAttribute("productPriceActionSeqId", outMap.productPriceActionSeqId)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat aksiyonu eklenemedi: " + e.message)
        return "error"
    }
}

String deleteProductPriceAction() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String ruleId = cleanStr(request.getParameter("productPriceRuleId"))
        String actSeqId = cleanStr(request.getParameter("productPriceActionSeqId"))
        if (!ruleId || !actSeqId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPriceRuleId ve productPriceActionSeqId zorunludur.")
            return "error"
        }

        Map outMap = dispatcher.runSync("deleteProductPriceAction", [
            userLogin: userLogin,
            productPriceRuleId: ruleId,
            productPriceActionSeqId: actSeqId
        ])
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Fiyat aksiyonu silindi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Fiyat aksiyonu silinemedi: " + e.message)
        return "error"
    }
}

// =========================================================================
// 3. PROMOSYONLAR & KUPONLAR (ProductPromo, ProductPromoCode)
// =========================================================================
String getProductPromos() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String searchKeyword = cleanStr(request.getParameter("searchKeyword"))
        int viewIndex = 0
        int viewSize = 50

        try {
            if (request.getParameter("viewIndex")) viewIndex = Integer.parseInt(request.getParameter("viewIndex"))
            if (request.getParameter("viewSize")) viewSize = Integer.parseInt(request.getParameter("viewSize"))
        } catch (Exception ignored) {}

        List<EntityCondition> conds = []
        if (searchKeyword) {
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("promoName", EntityOperator.LIKE, "%" + searchKeyword + "%"),
                EntityCondition.makeCondition("promoText", EntityOperator.LIKE, "%" + searchKeyword + "%"),
                EntityCondition.makeCondition("productPromoId", EntityOperator.LIKE, "%" + searchKeyword + "%")
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("ProductPromo")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        def promoList = query.orderBy("-createdStamp", "promoName")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List<Map> promos = []
        for (GenericValue p : promoList) {
            String promoId = p.productPromoId
            long codeCount = EntityQuery.use(delegator).from("ProductPromoCode")
                .where("productPromoId", promoId)
                .queryCount()

            long ruleCount = EntityQuery.use(delegator).from("ProductPromoRule")
                .where("productPromoId", promoId)
                .queryCount()

            promos.add([
                productPromoId: promoId,
                promoName: p.promoName,
                promoText: p.promoText,
                userEntered: p.userEntered,
                showToCustomer: p.showToCustomer,
                requireCode: p.requireCode,
                useLimitPerOrder: p.useLimitPerOrder != null ? p.useLimitPerOrder.longValue() : null,
                useLimitPerCustomer: p.useLimitPerCustomer != null ? p.useLimitPerCustomer.longValue() : null,
                useLimitPerPromotion: p.useLimitPerPromotion != null ? p.useLimitPerPromotion.longValue() : null,
                codeCount: codeCount,
                ruleCount: ruleCount,
                createdDate: p.createdDate ? p.createdDate.toString() : null
            ])
        }

        request.setAttribute("result", [
            promos: promos,
            totalCount: totalCount,
            viewIndex: viewIndex,
            viewSize: viewSize
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Promosyonlar listelenemedi: " + e.message)
        return "error"
    }
}

String getProductPromoDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String promoId = cleanStr(request.getParameter("productPromoId"))
        if (!promoId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPromoId zorunludur.")
            return "error"
        }

        GenericValue promo = EntityQuery.use(delegator).from("ProductPromo")
            .where("productPromoId", promoId)
            .queryOne()

        if (!promo) {
            request.setAttribute("_ERROR_MESSAGE_", "Promosyon bulunamadı: " + promoId)
            return "error"
        }

        // Coupon codes
        def codes = EntityQuery.use(delegator).from("ProductPromoCode")
            .where("productPromoId", promoId)
            .orderBy("-createdStamp")
            .queryList()
            .collect { [
                productPromoCodeId: it.productPromoCodeId,
                productPromoId: it.productPromoId,
                useLimitPerCode: it.useLimitPerCode != null ? it.useLimitPerCode.longValue() : null,
                useLimitPerCustomer: it.useLimitPerCustomer != null ? it.useLimitPerCustomer.longValue() : null,
                fromDate: it.fromDate ? it.fromDate.toString() : null,
                thruDate: it.thruDate ? it.thruDate.toString() : null,
                requireEmailOrParty: it.requireEmailOrParty
            ] }

        // Promo Rules
        def ruleEntities = EntityQuery.use(delegator).from("ProductPromoRule")
            .where("productPromoId", promoId)
            .orderBy("productPromoRuleId")
            .queryList()

        List<Map> rules = []
        for (GenericValue r : ruleEntities) {
            String ruleId = r.productPromoRuleId

            // Conditions
            def conds = EntityQuery.use(delegator).from("ProductPromoCond")
                .where("productPromoId", promoId, "productPromoRuleId", ruleId)
                .orderBy("productPromoCondSeqId")
                .queryList()
                .collect { [
                    productPromoCondSeqId: it.productPromoCondSeqId,
                    inputParamEnumId: it.inputParamEnumId,
                    operatorEnumId: it.operatorEnumId,
                    condValue: it.condValue,
                    otherValue: it.otherValue
                ] }

            // Actions
            def actions = EntityQuery.use(delegator).from("ProductPromoAction")
                .where("productPromoId", promoId, "productPromoRuleId", ruleId)
                .orderBy("productPromoActionSeqId")
                .queryList()
                .collect { [
                    productPromoActionSeqId: it.productPromoActionSeqId,
                    productPromoActionEnumId: it.productPromoActionEnumId,
                    quantity: it.quantity != null ? it.quantity.doubleValue() : null,
                    amount: it.amount != null ? it.amount.doubleValue() : null,
                    productId: it.productId,
                    partyId: it.partyId
                ] }

            rules.add([
                productPromoRuleId: ruleId,
                ruleName: r.ruleName,
                conditions: conds,
                actions: actions
            ])
        }

        request.setAttribute("promoDetail", [
            productPromoId: promo.productPromoId,
            promoName: promo.promoName,
            promoText: promo.promoText,
            userEntered: promo.userEntered,
            showToCustomer: promo.showToCustomer,
            requireCode: promo.requireCode,
            useLimitPerOrder: promo.useLimitPerOrder != null ? promo.useLimitPerOrder.longValue() : null,
            useLimitPerCustomer: promo.useLimitPerCustomer != null ? promo.useLimitPerCustomer.longValue() : null,
            useLimitPerPromotion: promo.useLimitPerPromotion != null ? promo.useLimitPerPromotion.longValue() : null,
            codes: codes,
            rules: rules
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Promosyon detayı alınamadı: " + e.message)
        return "error"
    }
}

String createProductPromo() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String promoName = cleanStr(request.getParameter("promoName"))
        if (!promoName) {
            request.setAttribute("_ERROR_MESSAGE_", "promoName zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            promoName: promoName,
            promoText: cleanStr(request.getParameter("promoText")),
            userEntered: cleanStr(request.getParameter("userEntered")) ?: "Y",
            showToCustomer: cleanStr(request.getParameter("showToCustomer")) ?: "Y",
            requireCode: cleanStr(request.getParameter("requireCode")) ?: "N",
            useLimitPerOrder: parseLong(request.getParameter("useLimitPerOrder")),
            useLimitPerCustomer: parseLong(request.getParameter("useLimitPerCustomer")),
            useLimitPerPromotion: parseLong(request.getParameter("useLimitPerPromotion"))
        ]
        String promoId = cleanStr(request.getParameter("productPromoId"))
        if (promoId) inMap.productPromoId = promoId

        Map outMap = dispatcher.runSync("createProductPromo", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Promosyon başarıyla oluşturuldu.")
        request.setAttribute("productPromoId", outMap.productPromoId)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Promosyon oluşturulamadı: " + e.message)
        return "error"
    }
}

String updateProductPromo() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String promoId = cleanStr(request.getParameter("productPromoId"))
        String promoName = cleanStr(request.getParameter("promoName"))
        if (!promoId || !promoName) {
            request.setAttribute("_ERROR_MESSAGE_", "productPromoId ve promoName zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            productPromoId: promoId,
            promoName: promoName,
            promoText: cleanStr(request.getParameter("promoText")),
            userEntered: cleanStr(request.getParameter("userEntered")),
            showToCustomer: cleanStr(request.getParameter("showToCustomer")),
            requireCode: cleanStr(request.getParameter("requireCode")),
            useLimitPerOrder: parseLong(request.getParameter("useLimitPerOrder")),
            useLimitPerCustomer: parseLong(request.getParameter("useLimitPerCustomer")),
            useLimitPerPromotion: parseLong(request.getParameter("useLimitPerPromotion"))
        ]

        Map outMap = dispatcher.runSync("updateProductPromo", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Promosyon güncellendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Promosyon güncellenemedi: " + e.message)
        return "error"
    }
}

String deleteProductPromo() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String promoId = cleanStr(request.getParameter("productPromoId"))
        if (!promoId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPromoId zorunludur.")
            return "error"
        }

        // Remove associated codes, conditions, actions, rules
        delegator.removeByAnd("ProductPromoCodeEmail", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoCodeParty", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoCode", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoAction", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoCond", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoCategory", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoProduct", [productPromoId: promoId])
        delegator.removeByAnd("ProductPromoRule", [productPromoId: promoId])

        Map outMap = dispatcher.runSync("deleteProductPromo", [
            userLogin: userLogin,
            productPromoId: promoId
        ])
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Promosyon başarıyla silindi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Promosyon silinemedi: " + e.message)
        return "error"
    }
}

String createProductPromoCode() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String promoId = cleanStr(request.getParameter("productPromoId"))
        String codeId = cleanStr(request.getParameter("productPromoCodeId"))
        if (!promoId || !codeId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPromoId ve productPromoCodeId zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            productPromoId: promoId,
            productPromoCodeId: codeId,
            useLimitPerCode: parseLong(request.getParameter("useLimitPerCode")),
            useLimitPerCustomer: parseLong(request.getParameter("useLimitPerCustomer")),
            fromDate: parseTimestamp(request.getParameter("fromDate")),
            thruDate: parseTimestamp(request.getParameter("thruDate")),
            requireEmailOrParty: cleanStr(request.getParameter("requireEmailOrParty")) ?: "N"
        ]

        Map outMap = dispatcher.runSync("createProductPromoCode", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Promosyon / kupon kodu eklendi.")
        request.setAttribute("productPromoCodeId", outMap.productPromoCodeId)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Promosyon kodu eklenemedi: " + e.message)
        return "error"
    }
}

String deleteProductPromoCode() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String codeId = cleanStr(request.getParameter("productPromoCodeId"))
        if (!codeId) {
            request.setAttribute("_ERROR_MESSAGE_", "productPromoCodeId zorunludur.")
            return "error"
        }

        delegator.removeByAnd("ProductPromoCodeEmail", [productPromoCodeId: codeId])
        delegator.removeByAnd("ProductPromoCodeParty", [productPromoCodeId: codeId])
        delegator.removeByAnd("ProductPromoUse", [productPromoCodeId: codeId])
        delegator.removeByAnd("ProductPromoCode", [productPromoCodeId: codeId])

        request.setAttribute("message", "Kupon kodu silindi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Kupon kodu silinemedi: " + e.message)
        return "error"
    }
}

// =========================================================================
// 4. MAĞAZALAR & KATALOG DAĞITIMI (ProductStore, ProductStoreCatalog)
// =========================================================================
String getProductStores() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String searchKeyword = cleanStr(request.getParameter("searchKeyword"))
        List<EntityCondition> conds = []

        if (searchKeyword) {
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("storeName", EntityOperator.LIKE, "%" + searchKeyword + "%"),
                EntityCondition.makeCondition("companyName", EntityOperator.LIKE, "%" + searchKeyword + "%"),
                EntityCondition.makeCondition("productStoreId", EntityOperator.LIKE, "%" + searchKeyword + "%")
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("ProductStore")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        def storeList = query.orderBy("storeName", "productStoreId")
            .queryList()

        List<Map> stores = []
        for (GenericValue s : storeList) {
            String storeId = s.productStoreId
            long catalogCount = EntityQuery.use(delegator).from("ProductStoreCatalog")
                .where("productStoreId", storeId)
                .queryCount()

            stores.add([
                productStoreId: storeId,
                storeName: s.storeName,
                companyName: s.companyName,
                title: s.title,
                subtitle: s.subtitle,
                defaultCurrencyUomId: s.defaultCurrencyUomId,
                inventoryFacilityId: s.inventoryFacilityId,
                oneInventoryFacility: s.oneInventoryFacility,
                checkInventory: s.checkInventory,
                reserveInventory: s.reserveInventory,
                requireInventory: s.requireInventory,
                catalogCount: catalogCount
            ])
        }

        request.setAttribute("stores", stores)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Mağazalar listelenemedi: " + e.message)
        return "error"
    }
}

String getProductStoreDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        String storeId = cleanStr(request.getParameter("productStoreId"))
        if (!storeId) {
            request.setAttribute("_ERROR_MESSAGE_", "productStoreId zorunludur.")
            return "error"
        }

        GenericValue store = EntityQuery.use(delegator).from("ProductStore")
            .where("productStoreId", storeId)
            .queryOne()

        if (!store) {
            request.setAttribute("_ERROR_MESSAGE_", "Mağaza bulunamadı: " + storeId)
            return "error"
        }

        // Catalogs assigned to this store
        def storeCatalogs = EntityQuery.use(delegator).from("ProductStoreCatalog")
            .where("productStoreId", storeId)
            .orderBy("sequenceNum", "fromDate")
            .queryList()

        List<Map> catalogs = []
        for (GenericValue sc : storeCatalogs) {
            GenericValue cat = EntityQuery.use(delegator).from("ProdCatalog")
                .where("prodCatalogId", sc.prodCatalogId)
                .cache(true)
                .queryOne()

            catalogs.add([
                productStoreId: sc.productStoreId,
                prodCatalogId: sc.prodCatalogId,
                catalogName: cat?.catalogName ?: sc.prodCatalogId,
                sequenceNum: sc.sequenceNum != null ? sc.sequenceNum.longValue() : null,
                fromDate: sc.fromDate ? sc.fromDate.toString() : null,
                thruDate: sc.thruDate ? sc.thruDate.toString() : null
            ])
        }

        request.setAttribute("storeDetail", [
            productStoreId: store.productStoreId,
            storeName: store.storeName,
            companyName: store.companyName,
            title: store.title,
            subtitle: store.subtitle,
            defaultCurrencyUomId: store.defaultCurrencyUomId,
            inventoryFacilityId: store.inventoryFacilityId,
            oneInventoryFacility: store.oneInventoryFacility,
            checkInventory: store.checkInventory,
            reserveInventory: store.reserveInventory,
            requireInventory: store.requireInventory,
            catalogs: catalogs
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Mağaza detayı alınamadı: " + e.message)
        return "error"
    }
}

String createProductStore() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String storeName = cleanStr(request.getParameter("storeName"))
        if (!storeName) {
            request.setAttribute("_ERROR_MESSAGE_", "storeName zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            storeName: storeName,
            companyName: cleanStr(request.getParameter("companyName")),
            title: cleanStr(request.getParameter("title")),
            subtitle: cleanStr(request.getParameter("subtitle")),
            defaultCurrencyUomId: cleanStr(request.getParameter("defaultCurrencyUomId")) ?: "TRY",
            inventoryFacilityId: cleanStr(request.getParameter("inventoryFacilityId")),
            checkInventory: cleanStr(request.getParameter("checkInventory")) ?: "Y",
            reserveInventory: cleanStr(request.getParameter("reserveInventory")) ?: "Y",
            requireInventory: cleanStr(request.getParameter("requireInventory")) ?: "N"
        ]
        String storeId = cleanStr(request.getParameter("productStoreId"))
        if (storeId) inMap.productStoreId = storeId

        Map outMap = dispatcher.runSync("createProductStore", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Mağaza başarıyla oluşturuldu.")
        request.setAttribute("productStoreId", outMap.productStoreId)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Mağaza oluşturulamadı: " + e.message)
        return "error"
    }
}

String updateProductStore() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String storeId = cleanStr(request.getParameter("productStoreId"))
        String storeName = cleanStr(request.getParameter("storeName"))
        if (!storeId || !storeName) {
            request.setAttribute("_ERROR_MESSAGE_", "productStoreId ve storeName zorunludur.")
            return "error"
        }

        Map inMap = [
            userLogin: userLogin,
            productStoreId: storeId,
            storeName: storeName,
            companyName: cleanStr(request.getParameter("companyName")),
            title: cleanStr(request.getParameter("title")),
            subtitle: cleanStr(request.getParameter("subtitle")),
            defaultCurrencyUomId: cleanStr(request.getParameter("defaultCurrencyUomId")),
            inventoryFacilityId: cleanStr(request.getParameter("inventoryFacilityId")),
            checkInventory: cleanStr(request.getParameter("checkInventory")),
            reserveInventory: cleanStr(request.getParameter("reserveInventory")),
            requireInventory: cleanStr(request.getParameter("requireInventory"))
        ]

        Map outMap = dispatcher.runSync("updateProductStore", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Mağaza güncellendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Mağaza güncellenemedi: " + e.message)
        return "error"
    }
}

String assignCatalogToStore() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String storeId = cleanStr(request.getParameter("productStoreId"))
        String catalogId = cleanStr(request.getParameter("prodCatalogId"))
        if (!storeId || !catalogId) {
            request.setAttribute("_ERROR_MESSAGE_", "productStoreId ve prodCatalogId zorunludur.")
            return "error"
        }

        Timestamp fromDate = parseTimestamp(request.getParameter("fromDate")) ?: UtilDateTime.nowTimestamp()
        Timestamp thruDate = parseTimestamp(request.getParameter("thruDate"))
        Long seq = parseLong(request.getParameter("sequenceNum"))

        Map inMap = [
            userLogin: userLogin,
            productStoreId: storeId,
            prodCatalogId: catalogId,
            fromDate: fromDate,
            thruDate: thruDate,
            sequenceNum: seq
        ]

        Map outMap = dispatcher.runSync("createProductStoreCatalog", inMap)
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Katalog mağazaya başarıyla bağlandı.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Katalog mağazaya bağlanamadı: " + e.message)
        return "error"
    }
}

String removeCatalogFromStore() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    def userLogin = getEffectiveUserLogin()
    try {
        String storeId = cleanStr(request.getParameter("productStoreId"))
        String catalogId = cleanStr(request.getParameter("prodCatalogId"))
        Timestamp fromDate = parseTimestamp(request.getParameter("fromDate"))

        if (!storeId || !catalogId || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "productStoreId, prodCatalogId ve fromDate zorunludur.")
            return "error"
        }

        Map outMap = dispatcher.runSync("deleteProductStoreCatalog", [
            userLogin: userLogin,
            productStoreId: storeId,
            prodCatalogId: catalogId,
            fromDate: fromDate
        ])
        if (ServiceUtil.isError(outMap)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(outMap))
            return "error"
        }

        request.setAttribute("message", "Katalog mağazadan kaldırıldı.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Katalog mağazadan kaldırılamadı: " + e.message)
        return "error"
    }
}
