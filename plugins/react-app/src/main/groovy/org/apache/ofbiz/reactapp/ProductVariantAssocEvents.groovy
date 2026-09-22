package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilHttp
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "ProductVariantAssocEvents.groovy"

/**
 * Varyant, Özellik ve Ürün İlişkisi meta verilerini döndürür.
 */
String getVariantAssocMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List featureTypesGv = EntityQuery.use(delegator).from("ProductFeatureType")
                .orderBy("description", "productFeatureTypeId")
                .cache()
                .queryList()

        List featureCategoriesGv = EntityQuery.use(delegator).from("ProductFeatureCategory")
                .orderBy("description", "productFeatureCategoryId")
                .cache()
                .queryList()

        List applTypesGv = EntityQuery.use(delegator).from("ProductFeatureApplType")
                .orderBy("description", "productFeatureApplTypeId")
                .cache()
                .queryList()

        List assocTypesGv = EntityQuery.use(delegator).from("ProductAssocType")
                .orderBy("description", "productAssocTypeId")
                .cache()
                .queryList()

        List featureTypes = featureTypesGv.collect { [productFeatureTypeId: it.productFeatureTypeId, description: it.description ?: it.productFeatureTypeId] }
        List featureCategories = featureCategoriesGv.collect { [productFeatureCategoryId: it.productFeatureCategoryId, description: it.description ?: it.productFeatureCategoryId] }
        List applTypes = applTypesGv.collect { [productFeatureApplTypeId: it.productFeatureApplTypeId, description: it.description ?: it.productFeatureApplTypeId] }
        List assocTypes = assocTypesGv.collect { [productAssocTypeId: it.productAssocTypeId, description: it.description ?: it.productAssocTypeId] }

        // Hızlı seçim için mevcut ürün listesi (id, name, isVirtual, isVariant)
        List productsGv = EntityQuery.use(delegator).from("Product")
                .select("productId", "productName", "internalName", "isVirtual", "isVariant")
                .orderBy("productName", "productId")
                .maxRows(200)
                .queryList()

        List products = productsGv.collect {
            [
                    productId: it.productId,
                    productName: it.productName ?: (it.internalName ?: it.productId),
                    isVirtual: it.isVirtual ?: "N",
                    isVariant: it.isVariant ?: "N"
            ]
        }

        Map metadata = [
                featureTypes: featureTypes,
                featureCategories: featureCategories,
                featureApplTypes: applTypes,
                assocTypes: assocTypes,
                products: products
        ]

        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getVariantAssocMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün Özelliklerini (ProductFeature) filtreli ve sayfalı olarak listeler.
 */
String getProductFeatures() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String searchKeyword = params.searchKeyword
        String productFeatureTypeId = params.productFeatureTypeId
        String productFeatureCategoryId = params.productFeatureCategoryId

        int viewIndex = 0
        int viewSize = 50
        try {
            if (params.viewIndex) viewIndex = Integer.parseInt(params.viewIndex)
            if (params.viewSize) viewSize = Integer.parseInt(params.viewSize)
        } catch (Exception ignore) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(productFeatureTypeId)) {
            conditions.add(EntityCondition.makeCondition("productFeatureTypeId", EntityOperator.EQUALS, productFeatureTypeId))
        }
        if (UtilValidate.isNotEmpty(productFeatureCategoryId)) {
            conditions.add(EntityCondition.makeCondition("productFeatureCategoryId", EntityOperator.EQUALS, productFeatureCategoryId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim() + "%"
            conditions.add(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("productFeatureId", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("description", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("idCode", EntityOperator.LIKE, kw)
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("ProductFeature")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        List<GenericValue> featuresGv = query
                .orderBy("productFeatureTypeId", "description", "productFeatureId")
                .cursorScrollInsensitive()
                .maxRows(viewSize)
                .offset(viewIndex * viewSize)
                .queryList()

        List features = []
        featuresGv.each { f ->
            String fId = f.productFeatureId

            // Kullanım sayısı (kaç ürüne atanmış)
            long applCount = EntityQuery.use(delegator).from("ProductFeatureAppl")
                    .where("productFeatureId", fId)
                    .queryCount()

            // Feature Type Desc
            String typeDesc = f.productFeatureTypeId
            try {
                GenericValue tGv = EntityQuery.use(delegator).from("ProductFeatureType").where("productFeatureTypeId", f.productFeatureTypeId).cache().queryOne()
                if (tGv) typeDesc = tGv.description ?: tGv.productFeatureTypeId
            } catch (Exception ignore) {}

            // Category Desc
            String catDesc = f.productFeatureCategoryId
            try {
                if (f.productFeatureCategoryId) {
                    GenericValue cGv = EntityQuery.use(delegator).from("ProductFeatureCategory").where("productFeatureCategoryId", f.productFeatureCategoryId).cache().queryOne()
                    if (cGv) catDesc = cGv.description ?: cGv.productFeatureCategoryId
                }
            } catch (Exception ignore) {}

            features.add([
                    productFeatureId: fId,
                    productFeatureTypeId: f.productFeatureTypeId,
                    productFeatureTypeDesc: typeDesc,
                    productFeatureCategoryId: f.productFeatureCategoryId,
                    productFeatureCategoryDesc: catDesc,
                    description: f.description ?: fId,
                    idCode: f.idCode,
                    defaultAmount: f.defaultAmount,
                    defaultSequenceNum: f.defaultSequenceNum,
                    applCount: applCount
            ])
        }

        long totalFeatures = EntityQuery.use(delegator).from("ProductFeature").queryCount()
        long totalCategories = EntityQuery.use(delegator).from("ProductFeatureCategory").queryCount()
        long totalAppls = EntityQuery.use(delegator).from("ProductFeatureAppl").queryCount()
        long totalAssocs = EntityQuery.use(delegator).from("ProductAssoc").queryCount()

        Map result = [
                features: features,
                totalCount: totalCount,
                viewIndex: viewIndex,
                viewSize: viewSize,
                metrics: [
                        totalFeatures: totalFeatures,
                        totalFeatureCategories: totalCategories,
                        totalFeatureAppls: totalAppls,
                        totalAssocs: totalAssocs
                ]
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductFeatures: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni Ürün Özelliği oluşturur.
 */
String createProductFeature() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productFeatureId = params.productFeatureId
        String productFeatureTypeId = params.productFeatureTypeId
        String description = params.description

        if (UtilValidate.isEmpty(productFeatureTypeId) || UtilValidate.isEmpty(description)) {
            request.setAttribute("_ERROR_MESSAGE_", "productFeatureTypeId ve description alanları zorunludur.")
            return "error"
        }

        if (UtilValidate.isEmpty(productFeatureId)) {
            productFeatureId = delegator.getNextSeqId("ProductFeature")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("ProductFeature").where("productFeatureId", productFeatureId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu kod ile bir özellik zaten mevcut: " + productFeatureId)
                return "error"
            }
        }

        GenericValue newFeature = delegator.makeValue("ProductFeature")
        newFeature.productFeatureId = productFeatureId
        newFeature.productFeatureTypeId = productFeatureTypeId
        newFeature.productFeatureCategoryId = params.productFeatureCategoryId ?: null
        newFeature.description = description
        newFeature.idCode = params.idCode ?: null
        if (params.defaultAmount) {
            newFeature.defaultAmount = new BigDecimal(params.defaultAmount)
        }
        if (params.defaultSequenceNum) {
            newFeature.defaultSequenceNum = Long.parseLong(params.defaultSequenceNum)
        }
        newFeature.create()

        request.setAttribute("productFeatureId", productFeatureId)
        request.setAttribute("message", "Ürün özelliği başarıyla oluşturuldu: " + productFeatureId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductFeature: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün Özelliğini günceller.
 */
String updateProductFeature() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productFeatureId = params.productFeatureId

        if (UtilValidate.isEmpty(productFeatureId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productFeatureId zorunludur.")
            return "error"
        }

        GenericValue feature = EntityQuery.use(delegator).from("ProductFeature").where("productFeatureId", productFeatureId).queryOne()
        if (!feature) {
            request.setAttribute("_ERROR_MESSAGE_", "Özellik bulunamadı: " + productFeatureId)
            return "error"
        }

        if (params.containsKey("productFeatureTypeId")) feature.productFeatureTypeId = params.productFeatureTypeId
        if (params.containsKey("productFeatureCategoryId")) feature.productFeatureCategoryId = params.productFeatureCategoryId ?: null
        if (params.containsKey("description")) feature.description = params.description
        if (params.containsKey("idCode")) feature.idCode = params.idCode ?: null
        if (params.containsKey("defaultAmount")) {
            feature.defaultAmount = params.defaultAmount ? new BigDecimal(params.defaultAmount) : null
        }
        if (params.containsKey("defaultSequenceNum")) {
            feature.defaultSequenceNum = params.defaultSequenceNum ? Long.parseLong(params.defaultSequenceNum) : null
        }
        feature.store()

        request.setAttribute("message", "Özellik başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProductFeature: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün Özelliğini siler.
 */
String deleteProductFeature() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productFeatureId = params.productFeatureId

        if (UtilValidate.isEmpty(productFeatureId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productFeatureId parametresi zorunludur.")
            return "error"
        }

        // Önce bağlı ProductFeatureAppl kayıtlarını temizle
        delegator.removeByCondition("ProductFeatureAppl", EntityCondition.makeCondition("productFeatureId", EntityOperator.EQUALS, productFeatureId))

        GenericValue feature = EntityQuery.use(delegator).from("ProductFeature").where("productFeatureId", productFeatureId).queryOne()
        if (feature) {
            feature.remove()
        }

        request.setAttribute("message", "Özellik ve ilişkili kayıtlar başarıyla silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductFeature: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Özellik Kategorilerini listeler.
 */
String getProductFeatureCategories() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> categoriesGv = EntityQuery.use(delegator).from("ProductFeatureCategory")
                .orderBy("description", "productFeatureCategoryId")
                .queryList()

        List categories = categoriesGv.collect { c ->
            long featureCount = EntityQuery.use(delegator).from("ProductFeature")
                    .where("productFeatureCategoryId", c.productFeatureCategoryId)
                    .queryCount()

            [
                    productFeatureCategoryId: c.productFeatureCategoryId,
                    description: c.description ?: c.productFeatureCategoryId,
                    featureCount: featureCount
            ]
        }

        request.setAttribute("categories", categories)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductFeatureCategories: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni Özellik Kategorisi oluşturur.
 */
String createProductFeatureCategory() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productFeatureCategoryId = params.productFeatureCategoryId
        String description = params.description

        if (UtilValidate.isEmpty(description)) {
            request.setAttribute("_ERROR_MESSAGE_", "description zorunludur.")
            return "error"
        }

        if (UtilValidate.isEmpty(productFeatureCategoryId)) {
            productFeatureCategoryId = delegator.getNextSeqId("ProductFeatureCategory")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("ProductFeatureCategory").where("productFeatureCategoryId", productFeatureCategoryId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu kod ile bir özellik kategorisi zaten mevcut: " + productFeatureCategoryId)
                return "error"
            }
        }

        GenericValue newCat = delegator.makeValue("ProductFeatureCategory")
        newCat.productFeatureCategoryId = productFeatureCategoryId
        newCat.description = description
        newCat.create()

        request.setAttribute("productFeatureCategoryId", productFeatureCategoryId)
        request.setAttribute("message", "Özellik kategorisi oluşturuldu: " + productFeatureCategoryId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductFeatureCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Bir ürüne atanmış tüm özellikleri (ProductFeatureAppl) listeler.
 */
String getProductFeaturesAppl() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        if (UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId zorunludur.")
            return "error"
        }

        List<GenericValue> applsGv = EntityQuery.use(delegator).from("ProductFeatureAppl")
                .where("productId", productId)
                .orderBy("productFeatureApplTypeId", "sequenceNum")
                .queryList()

        List featureAppls = []
        applsGv.each { appl ->
            String fId = appl.productFeatureId
            GenericValue fGv = EntityQuery.use(delegator).from("ProductFeature").where("productFeatureId", fId).queryOne()
            GenericValue applTypeGv = EntityQuery.use(delegator).from("ProductFeatureApplType").where("productFeatureApplTypeId", appl.productFeatureApplTypeId).cache().queryOne()

            String featureTypeDesc = ""
            if (fGv) {
                GenericValue tGv = EntityQuery.use(delegator).from("ProductFeatureType").where("productFeatureTypeId", fGv.productFeatureTypeId).cache().queryOne()
                if (tGv) featureTypeDesc = tGv.description ?: tGv.productFeatureTypeId
            }

            featureAppls.add([
                    productId: productId,
                    productFeatureId: fId,
                    featureDescription: fGv ? (fGv.description ?: fId) : fId,
                    productFeatureTypeId: fGv ? fGv.productFeatureTypeId : "",
                    productFeatureTypeDesc: featureTypeDesc,
                    productFeatureApplTypeId: appl.productFeatureApplTypeId,
                    productFeatureApplTypeDesc: applTypeGv ? (applTypeGv.description ?: appl.productFeatureApplTypeId) : appl.productFeatureApplTypeId,
                    fromDate: appl.fromDate ? appl.fromDate.toString() : null,
                    thruDate: appl.thruDate ? appl.thruDate.toString() : null,
                    sequenceNum: appl.sequenceNum,
                    amount: appl.amount
            ])
        }

        request.setAttribute("featureAppls", featureAppls)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductFeaturesAppl: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürüne özellik atar (ProductFeatureAppl).
 */
String applyFeatureToProduct() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String productFeatureId = params.productFeatureId
        String productFeatureApplTypeId = params.productFeatureApplTypeId ?: "STANDARD_FEATURE"

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(productFeatureId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId ve productFeatureId zorunludur.")
            return "error"
        }

        Timestamp fromDate = UtilDateTime.nowTimestamp()
        if (params.fromDate) {
            try {
                fromDate = Timestamp.valueOf(params.fromDate)
            } catch (Exception ignore) {}
        }

        GenericValue appl = delegator.makeValue("ProductFeatureAppl")
        appl.productId = productId
        appl.productFeatureId = productFeatureId
        appl.productFeatureApplTypeId = productFeatureApplTypeId
        appl.fromDate = fromDate
        if (params.sequenceNum) appl.sequenceNum = Long.parseLong(params.sequenceNum)
        if (params.amount) appl.amount = new BigDecimal(params.amount)
        appl.create()

        request.setAttribute("message", "Özellik başarıyla ürüne eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in applyFeatureToProduct: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Üründen özellik atamasını kaldırır.
 */
String removeFeatureFromProduct() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String productFeatureId = params.productFeatureId
        String fromDateStr = params.fromDate

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(productFeatureId) || UtilValidate.isEmpty(fromDateStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId, productFeatureId ve fromDate parametreleri zorunludur.")
            return "error"
        }

        Timestamp fromDate = Timestamp.valueOf(fromDateStr)
        GenericValue appl = EntityQuery.use(delegator).from("ProductFeatureAppl")
                .where("productId", productId, "productFeatureId", productFeatureId, "fromDate", fromDate)
                .queryOne()

        if (appl) {
            appl.remove()
        }

        request.setAttribute("message", "Özellik ataması başarıyla kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeFeatureFromProduct: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Bir ürünün tüm ilişkilerini (ProductAssoc - Varyant, Çapraz Satış, İkame vb.) listeler.
 * Hem giden (productId -> productIdTo) hem de gelen (productIdTo -> productId) ilişkileri döner.
 */
String getProductAssocs() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        String productAssocTypeId = request.getParameter("productAssocTypeId")

        // 1. Giden İlişkiler (Bu ürünün bağlı olduğu/sahip olduğu alt ürünler: örneğin Virtual ürünün Varyantları)
        List outgoingConditions = []
        if (UtilValidate.isNotEmpty(productId)) {
            outgoingConditions.add(EntityCondition.makeCondition("productId", EntityOperator.EQUALS, productId))
        }
        if (UtilValidate.isNotEmpty(productAssocTypeId)) {
            outgoingConditions.add(EntityCondition.makeCondition("productAssocTypeId", EntityOperator.EQUALS, productAssocTypeId))
        }

        def outQuery = EntityQuery.use(delegator).from("ProductAssoc")
        if (!outgoingConditions.isEmpty()) {
            outQuery = outQuery.where(EntityCondition.makeCondition(outgoingConditions, EntityOperator.AND))
        }

        List<GenericValue> outGv = outQuery.orderBy("productAssocTypeId", "sequenceNum").maxRows(100).queryList()
        List outgoingAssocs = []
        outGv.each { assoc ->
            GenericValue targetProd = EntityQuery.use(delegator).from("Product").where("productId", assoc.productIdTo).queryOne()
            GenericValue typeGv = EntityQuery.use(delegator).from("ProductAssocType").where("productAssocTypeId", assoc.productAssocTypeId).cache().queryOne()

            outgoingAssocs.add([
                    productId: assoc.productId,
                    productIdTo: assoc.productIdTo,
                    targetProductName: targetProd ? (targetProd.productName ?: targetProd.internalName ?: assoc.productIdTo) : assoc.productIdTo,
                    targetIsVirtual: targetProd ? targetProd.isVirtual : "N",
                    targetIsVariant: targetProd ? targetProd.isVariant : "N",
                    productAssocTypeId: assoc.productAssocTypeId,
                    productAssocTypeDesc: typeGv ? (typeGv.description ?: assoc.productAssocTypeId) : assoc.productAssocTypeId,
                    fromDate: assoc.fromDate ? assoc.fromDate.toString() : null,
                    thruDate: assoc.thruDate ? assoc.thruDate.toString() : null,
                    sequenceNum: assoc.sequenceNum,
                    reason: assoc.reason,
                    quantity: assoc.quantity
            ])
        }

        // 2. Gelen İlişkiler (Bu ürünün hedef olduğu ilişkiler: örneğin bu Variant ise, ana Virtual ürün kim?)
        List incomingAssocs = []
        if (UtilValidate.isNotEmpty(productId)) {
            List<GenericValue> inGv = EntityQuery.use(delegator).from("ProductAssoc")
                    .where("productIdTo", productId)
                    .orderBy("productAssocTypeId")
                    .queryList()

            inGv.each { assoc ->
                GenericValue sourceProd = EntityQuery.use(delegator).from("Product").where("productId", assoc.productId).queryOne()
                GenericValue typeGv = EntityQuery.use(delegator).from("ProductAssocType").where("productAssocTypeId", assoc.productAssocTypeId).cache().queryOne()

                incomingAssocs.add([
                        productId: assoc.productId,
                        productIdTo: assoc.productIdTo,
                        sourceProductName: sourceProd ? (sourceProd.productName ?: sourceProd.internalName ?: assoc.productId) : assoc.productId,
                        sourceIsVirtual: sourceProd ? sourceProd.isVirtual : "N",
                        sourceIsVariant: sourceProd ? sourceProd.isVariant : "N",
                        productAssocTypeId: assoc.productAssocTypeId,
                        productAssocTypeDesc: typeGv ? (typeGv.description ?: assoc.productAssocTypeId) : assoc.productAssocTypeId,
                        fromDate: assoc.fromDate ? assoc.fromDate.toString() : null,
                        thruDate: assoc.thruDate ? assoc.thruDate.toString() : null,
                        sequenceNum: assoc.sequenceNum,
                        reason: assoc.reason,
                        quantity: assoc.quantity
                ])
            }
        }

        Map result = [
                outgoingAssocs: outgoingAssocs,
                incomingAssocs: incomingAssocs
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductAssocs: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * İki ürün arasında ilişki oluşturur (ProductAssoc: PRODUCT_VARIANT, PRODUCT_UPGRADE, CROSS_SELL vb.).
 */
String createProductAssoc() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String productIdTo = params.productIdTo
        String productAssocTypeId = params.productAssocTypeId ?: "PRODUCT_VARIANT"

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(productIdTo)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId ve productIdTo zorunludur.")
            return "error"
        }

        if (productId == productIdTo) {
            request.setAttribute("_ERROR_MESSAGE_", "Bir ürünün kendisiyle ilişki kurulamaz.")
            return "error"
        }

        Timestamp fromDate = UtilDateTime.nowTimestamp()
        if (params.fromDate) {
            try {
                fromDate = Timestamp.valueOf(params.fromDate)
            } catch (Exception ignore) {}
        }

        GenericValue assoc = delegator.makeValue("ProductAssoc")
        assoc.productId = productId
        assoc.productIdTo = productIdTo
        assoc.productAssocTypeId = productAssocTypeId
        assoc.fromDate = fromDate
        if (params.sequenceNum) assoc.sequenceNum = Long.parseLong(params.sequenceNum)
        if (params.reason) assoc.reason = params.reason
        if (params.quantity) assoc.quantity = new BigDecimal(params.quantity)
        assoc.create()

        request.setAttribute("message", "Ürün ilişkisi başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductAssoc: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün ilişkisini siler (ProductAssoc).
 */
String deleteProductAssoc() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String productIdTo = params.productIdTo
        String productAssocTypeId = params.productAssocTypeId
        String fromDateStr = params.fromDate

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(productIdTo) || UtilValidate.isEmpty(productAssocTypeId) || UtilValidate.isEmpty(fromDateStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId, productIdTo, productAssocTypeId ve fromDate parametreleri zorunludur.")
            return "error"
        }

        Timestamp fromDate = Timestamp.valueOf(fromDateStr)
        GenericValue assoc = EntityQuery.use(delegator).from("ProductAssoc")
                .where("productId", productId, "productIdTo", productIdTo, "productAssocTypeId", productAssocTypeId, "fromDate", fromDate)
                .queryOne()

        if (assoc) {
            assoc.remove()
        }

        request.setAttribute("message", "Ürün ilişkisi başarıyla silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductAssoc: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Hızlı Varyant Oluşturma Sihirbazı (Quick Create Variant)
 * Virtual (ana) üründen miras alarak yeni bir Variant ürün kartı üretir,
 * otomatik olarak PRODUCT_VARIANT ilişkisi bağlar ve seçilen özellikleri DISTINGUISHING_FEAT olarak atar.
 */
String quickCreateVariant() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String virtualProductId = params.virtualProductId
        String variantProductId = params.variantProductId
        String variantProductName = params.variantProductName
        String featureIdsStr = params.featureIds // Virgülle ayrılmış özellik ID'leri (örn: "RED,SIZE_L")

        if (UtilValidate.isEmpty(virtualProductId) || UtilValidate.isEmpty(variantProductName)) {
            request.setAttribute("_ERROR_MESSAGE_", "virtualProductId ve variantProductName zorunludur.")
            return "error"
        }

        GenericValue virtualProduct = EntityQuery.use(delegator).from("Product").where("productId", virtualProductId).queryOne()
        if (!virtualProduct) {
            request.setAttribute("_ERROR_MESSAGE_", "Ana Sanal Ürün (Virtual Product) bulunamadı: " + virtualProductId)
            return "error"
        }

        // Ana ürün sanal olarak işaretli değilse otomatik sanal yap
        if (virtualProduct.isVirtual != "Y") {
            virtualProduct.isVirtual = "Y"
            virtualProduct.store()
        }

        // Varyant ürün kodu belirle
        if (UtilValidate.isEmpty(variantProductId)) {
            variantProductId = virtualProductId + "_" + delegator.getNextSeqId("Product")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("Product").where("productId", variantProductId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu ürün kodu zaten mevcut: " + variantProductId)
                return "error"
            }
        }

        Timestamp now = UtilDateTime.nowTimestamp()

        // 1. Yeni Varyant Ürün Kartını Oluştur
        GenericValue variantProduct = delegator.makeValue("Product")
        variantProduct.productId = variantProductId
        variantProduct.productTypeId = virtualProduct.productTypeId ?: "FINISHED_GOOD"
        variantProduct.primaryProductCategoryId = virtualProduct.primaryProductCategoryId
        variantProduct.productName = variantProductName
        variantProduct.internalName = variantProductName
        variantProduct.description = params.description ?: virtualProduct.description
        variantProduct.longDescription = virtualProduct.longDescription
        variantProduct.quantityUomId = virtualProduct.quantityUomId
        variantProduct.isVirtual = "N"
        variantProduct.isVariant = "Y"
        variantProduct.taxable = virtualProduct.taxable ?: "Y"
        variantProduct.chargeShipping = virtualProduct.chargeShipping ?: "Y"
        variantProduct.returnable = virtualProduct.returnable ?: "Y"
        variantProduct.createdDate = now
        variantProduct.create()

        // 2. PRODUCT_VARIANT İlişkisini Kur
        GenericValue assoc = delegator.makeValue("ProductAssoc")
        assoc.productId = virtualProductId
        assoc.productIdTo = variantProductId
        assoc.productAssocTypeId = "PRODUCT_VARIANT"
        assoc.fromDate = now
        assoc.sequenceNum = 1L
        assoc.create()

        // 3. Fiyat Varsa Kopyala / Tanımla
        if (params.price) {
            GenericValue priceGv = delegator.makeValue("ProductPrice")
            priceGv.productId = variantProductId
            priceGv.productPriceTypeId = "DEFAULT_PRICE"
            priceGv.productPricePurposeId = "PURCHASE"
            priceGv.currencyUomId = params.currencyUomId ?: "TRY"
            priceGv.productStoreGroupId = "_NA_"
            priceGv.fromDate = now
            priceGv.price = new BigDecimal(params.price)
            priceGv.taxInPrice = "N"
            priceGv.create()
        }

        // 4. Özellikleri Ata (DISTINGUISHING_FEAT)
        if (UtilValidate.isNotEmpty(featureIdsStr)) {
            List<String> featureIds = featureIdsStr.split(",")*.trim()
            featureIds.each { fId ->
                if (UtilValidate.isNotEmpty(fId)) {
                    GenericValue featAppl = delegator.makeValue("ProductFeatureAppl")
                    featAppl.productId = variantProductId
                    featAppl.productFeatureId = fId
                    featAppl.productFeatureApplTypeId = "DISTINGUISHING_FEAT"
                    featAppl.fromDate = now
                    featAppl.create()
                }
            }
        }

        request.setAttribute("variantProductId", variantProductId)
        request.setAttribute("message", "Varyant ürün başarıyla oluşturuldu ve bağlandı: " + variantProductId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in quickCreateVariant: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
