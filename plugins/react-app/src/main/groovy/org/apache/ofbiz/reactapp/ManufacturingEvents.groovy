/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilHttp
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityFunction
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.LocalDispatcher
import org.apache.ofbiz.service.ServiceUtil

import java.math.BigDecimal
import java.sql.Timestamp
import groovy.json.JsonSlurper

final String MODULE = "ManufacturingEvents.groovy"

GenericValue getSystemUserLogin() {
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
        return null
    }
}

/**
 * Üretim Yönetimi Metadata (Durumlar, Tesisler, Üretilebilir Mamuller, Hammaddeler, Rotalar)
 */
String getManufacturingMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Üretim Emri Durumları
        List<Map<String, Object>> statuses = EntityQuery.use(delegator)
            .from("StatusItem")
            .where("statusTypeId", "PRODUCTION_RUN")
            .orderBy("sequenceId")
            .queryList()
            .collect {
                [
                    statusId: it.getString("statusId"),
                    description: it.getString("description") ?: it.getString("statusId")
                ]
            }

        // Tesisler / Fabrikalar / Depolar
        List<Map<String, Object>> facilities = EntityQuery.use(delegator)
            .from("Facility")
            .orderBy("facilityName")
            .queryList()
            .collect {
                [
                    facilityId: it.getString("facilityId"),
                    facilityName: it.getString("facilityName") ?: it.getString("facilityId")
                ]
            }

        // Rotalar (WorkEffort type ROUTING)
        List<Map<String, Object>> routings = EntityQuery.use(delegator)
            .from("WorkEffort")
            .where("workEffortTypeId", "ROUTING")
            .orderBy("workEffortName")
            .queryList()
            .collect {
                [
                    routingId: it.getString("workEffortId"),
                    routingName: it.getString("workEffortName") ?: it.getString("workEffortId"),
                    description: it.getString("description") ?: ""
                ]
            }

        // Ürün Listesi (Mamuller ve Hammaddeler)
        List<GenericValue> productGvs = EntityQuery.use(delegator)
            .from("Product")
            .orderBy("internalName")
            .maxRows(300)
            .queryList()

        List<Map<String, Object>> products = productGvs.collect {
            [
                productId: it.getString("productId"),
                productName: it.getString("internalName") ?: (it.getString("productName") ?: it.getString("productId")),
                productTypeId: it.getString("productTypeId")
            ]
        }

        request.setAttribute("statuses", statuses)
        request.setAttribute("facilities", facilities)
        request.setAttribute("routings", routings)
        request.setAttribute("products", products)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getManufacturingMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Üretim Emirleri Listeleme, Arama, Filtreleme ve KPI Hesaplama
 */
String findProductionRuns() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        int viewIndex = 0
        int viewSize = 25

        if (params.get("viewIndex") != null) {
            try { viewIndex = Integer.parseInt(params.get("viewIndex").toString()) } catch (Exception ignored) {}
        }
        if (params.get("viewSize") != null) {
            try { viewSize = Integer.parseInt(params.get("viewSize").toString()) } catch (Exception ignored) {}
        }

        String statusId = params.get("statusId")?.toString()?.trim()
        String productId = params.get("productId")?.toString()?.trim()
        String facilityId = params.get("facilityId")?.toString()?.trim()
        String query = params.get("query")?.toString()?.trim()

        List<EntityCondition> condList = []
        condList.add(EntityCondition.makeCondition("workEffortTypeId", EntityOperator.EQUALS, "PROD_ORDER_HEADER"))

        if (UtilValidate.isNotEmpty(statusId)) {
            condList.add(EntityCondition.makeCondition("currentStatusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(facilityId)) {
            condList.add(EntityCondition.makeCondition("facilityId", EntityOperator.EQUALS, facilityId))
        }
        if (UtilValidate.isNotEmpty(query)) {
            condList.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.upperField("workEffortId"), EntityOperator.LIKE, "%" + query.toUpperCase() + "%"),
                EntityCondition.makeCondition(EntityFunction.upperField("workEffortName"), EntityOperator.LIKE, "%" + query.toUpperCase() + "%"),
                EntityCondition.makeCondition(EntityFunction.upperField("description"), EntityOperator.LIKE, "%" + query.toUpperCase() + "%")
            ], EntityOperator.OR))
        }

        EntityCondition mainCond = EntityCondition.makeCondition(condList, EntityOperator.AND)

        // KPI Hesaplamaları
        long totalRuns = EntityQuery.use(delegator).from("WorkEffort").where(EntityCondition.makeCondition("workEffortTypeId", "PROD_ORDER_HEADER")).queryCount()
        long createdCount = EntityQuery.use(delegator).from("WorkEffort").where([workEffortTypeId: "PROD_ORDER_HEADER", currentStatusId: "PRUN_CREATED"]).queryCount()
        long scheduledCount = EntityQuery.use(delegator).from("WorkEffort").where(EntityCondition.makeCondition([
            EntityCondition.makeCondition("workEffortTypeId", "PROD_ORDER_HEADER"),
            EntityCondition.makeCondition("currentStatusId", EntityOperator.IN, ["PRUN_SCHEDULED", "PRUN_DOC_PRINTED"])
        ], EntityOperator.AND)).queryCount()
        long runningCount = EntityQuery.use(delegator).from("WorkEffort").where([workEffortTypeId: "PROD_ORDER_HEADER", currentStatusId: "PRUN_RUNNING"]).queryCount()
        long completedCount = EntityQuery.use(delegator).from("WorkEffort").where(EntityCondition.makeCondition([
            EntityCondition.makeCondition("workEffortTypeId", "PROD_ORDER_HEADER"),
            EntityCondition.makeCondition("currentStatusId", EntityOperator.IN, ["PRUN_COMPLETED", "PRUN_CLOSED"])
        ], EntityOperator.AND)).queryCount()

        Map<String, Object> kpis = [
            totalRuns: totalRuns,
            createdCount: createdCount,
            scheduledCount: scheduledCount,
            runningCount: runningCount,
            completedCount: completedCount
        ]

        // Toplam eşleşen sayısı
        long filteredCount = EntityQuery.use(delegator).from("WorkEffort").where(mainCond).queryCount()

        // Paged sorgu
        List<GenericValue> runGvs = EntityQuery.use(delegator)
            .from("WorkEffort")
            .where(mainCond)
            .orderBy("-estimatedStartDate", "-createdDate", "-workEffortId")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List<Map<String, Object>> productionRuns = []

        for (GenericValue run : runGvs) {
            String pRunId = run.getString("workEffortId")
            String cStatusId = run.getString("currentStatusId")
            String facId = run.getString("facilityId")

            // Status Description
            GenericValue stVal = EntityQuery.use(delegator).from("StatusItem").where("statusId", cStatusId).cache(true).queryOne()
            String statusDesc = stVal ? (stVal.getString("description") ?: cStatusId) : cStatusId

            // Facility Name
            String facName = ""
            if (facId) {
                GenericValue fVal = EntityQuery.use(delegator).from("Facility").where("facilityId", facId).cache(true).queryOne()
                facName = fVal ? (fVal.getString("facilityName") ?: facId) : facId
            }

            // Produced Product (WorkEffortGoodStandard PRUN_PROD_DELIV)
            String runProductId = ""
            String runProductName = ""
            GenericValue goodStd = EntityQuery.use(delegator)
                .from("WorkEffortGoodStandard")
                .where("workEffortId", pRunId, "workEffortGoodStdTypeId", "PRUN_PROD_DELIV")
                .filterByDate()
                .queryFirst()

            if (goodStd) {
                runProductId = goodStd.getString("productId")
            } else {
                // If not filtered by date
                goodStd = EntityQuery.use(delegator)
                    .from("WorkEffortGoodStandard")
                    .where("workEffortId", pRunId, "workEffortGoodStdTypeId", "PRUN_PROD_DELIV")
                    .queryFirst()
                if (goodStd) runProductId = goodStd.getString("productId")
            }

            if (runProductId) {
                GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", runProductId).cache(true).queryOne()
                runProductName = prod ? (prod.getString("internalName") ?: prod.getString("productName")) : runProductId
            }

            productionRuns.add([
                productionRunId: pRunId,
                workEffortName: run.getString("workEffortName") ?: pRunId,
                description: run.getString("description") ?: "",
                statusId: cStatusId,
                statusDesc: statusDesc,
                productId: runProductId,
                productName: runProductName,
                facilityId: facId,
                facilityName: facName,
                quantity: run.getBigDecimal("quantityToProduce") ?: BigDecimal.ZERO,
                quantityProduced: run.getBigDecimal("quantityProduced") ?: BigDecimal.ZERO,
                quantityRejected: run.getBigDecimal("quantityRejected") ?: BigDecimal.ZERO,
                estimatedStartDate: run.getTimestamp("estimatedStartDate") ? run.getTimestamp("estimatedStartDate").toString() : "",
                estimatedCompletionDate: run.getTimestamp("estimatedCompletionDate") ? run.getTimestamp("estimatedCompletionDate").toString() : "",
                actualStartDate: run.getTimestamp("actualStartDate") ? run.getTimestamp("actualStartDate").toString() : "",
                actualCompletionDate: run.getTimestamp("actualCompletionDate") ? run.getTimestamp("actualCompletionDate").toString() : "",
                createdDate: run.getTimestamp("createdDate") ? run.getTimestamp("createdDate").toString() : ""
            ])
        }

        request.setAttribute("productionRuns", productionRuns)
        request.setAttribute("totalCount", filteredCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("kpis", kpis)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findProductionRuns: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Üretim Emri Detayı: Başlık, Operasyon Adımları (Tasks) ve Reçete / Malzeme Kalemleri (Components)
 */
String getProductionRunDetails() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String productionRunId = params.get("productionRunId")?.toString()?.trim()
    if (!productionRunId) {
        request.setAttribute("_ERROR_MESSAGE_", "productionRunId is required")
        return "error"
    }

    try {
        GenericValue run = EntityQuery.use(delegator)
            .from("WorkEffort")
            .where("workEffortId", productionRunId)
            .queryOne()

        if (!run) {
            request.setAttribute("_ERROR_MESSAGE_", "Production run not found: " + productionRunId)
            return "error"
        }

        String cStatusId = run.getString("currentStatusId")
        GenericValue stVal = EntityQuery.use(delegator).from("StatusItem").where("statusId", cStatusId).cache(true).queryOne()
        String statusDesc = stVal ? (stVal.getString("description") ?: cStatusId) : cStatusId

        String facId = run.getString("facilityId")
        String facName = ""
        if (facId) {
            GenericValue fVal = EntityQuery.use(delegator).from("Facility").where("facilityId", facId).cache(true).queryOne()
            facName = fVal ? (fVal.getString("facilityName") ?: facId) : facId
        }

        // Mamul Bilgisi
        String runProductId = ""
        String runProductName = ""
        GenericValue goodStd = EntityQuery.use(delegator)
            .from("WorkEffortGoodStandard")
            .where("workEffortId", productionRunId, "workEffortGoodStdTypeId", "PRUN_PROD_DELIV")
            .queryFirst()

        if (goodStd) {
            runProductId = goodStd.getString("productId")
            GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", runProductId).cache(true).queryOne()
            runProductName = prod ? (prod.getString("internalName") ?: prod.getString("productName")) : runProductId
        }

        Map<String, Object> header = [
            productionRunId: productionRunId,
            workEffortName: run.getString("workEffortName") ?: productionRunId,
            description: run.getString("description") ?: "",
            statusId: cStatusId,
            statusDesc: statusDesc,
            productId: runProductId,
            productName: runProductName,
            facilityId: facId,
            facilityName: facName,
            quantity: run.getBigDecimal("quantityToProduce") ?: BigDecimal.ZERO,
            quantityProduced: run.getBigDecimal("quantityProduced") ?: BigDecimal.ZERO,
            quantityRejected: run.getBigDecimal("quantityRejected") ?: BigDecimal.ZERO,
            estimatedStartDate: run.getTimestamp("estimatedStartDate") ? run.getTimestamp("estimatedStartDate").toString() : "",
            estimatedCompletionDate: run.getTimestamp("estimatedCompletionDate") ? run.getTimestamp("estimatedCompletionDate").toString() : "",
            actualStartDate: run.getTimestamp("actualStartDate") ? run.getTimestamp("actualStartDate").toString() : "",
            actualCompletionDate: run.getTimestamp("actualCompletionDate") ? run.getTimestamp("actualCompletionDate").toString() : "",
            createdDate: run.getTimestamp("createdDate") ? run.getTimestamp("createdDate").toString() : ""
        ]

        // Operasyon Adımları (Routing Tasks / Child WorkEfforts)
        List<GenericValue> taskGvs = EntityQuery.use(delegator)
            .from("WorkEffort")
            .where("workEffortParentId", productionRunId)
            .orderBy("workEffortId")
            .queryList()

        List<Map<String, Object>> tasks = []
        for (GenericValue task : taskGvs) {
            String tStatusId = task.getString("currentStatusId")
            GenericValue tstVal = EntityQuery.use(delegator).from("StatusItem").where("statusId", tStatusId).cache(true).queryOne()
            String tStatusDesc = tstVal ? (tstVal.getString("description") ?: tStatusId) : tStatusId

            tasks.add([
                workEffortId: task.getString("workEffortId"),
                workEffortName: task.getString("workEffortName") ?: task.getString("workEffortId"),
                description: task.getString("description") ?: "",
                statusId: tStatusId,
                statusDesc: tStatusDesc,
                sequenceNum: task.getLong("priority") ?: 0,
                estimatedSetupMillis: task.getBigDecimal("estimatedSetupMillis") ?: BigDecimal.ZERO,
                estimatedMilliSeconds: task.getBigDecimal("estimatedMilliSeconds") ?: BigDecimal.ZERO,
                actualSetupMillis: task.getBigDecimal("actualSetupMillis") ?: BigDecimal.ZERO,
                actualMilliSeconds: task.getBigDecimal("actualMilliSeconds") ?: BigDecimal.ZERO
            ])
        }

        // Hammadde Kalemleri (Components needed / issued)
        List<String> taskIds = taskGvs.collect { it.getString("workEffortId") }
        taskIds.add(productionRunId)

        List<GenericValue> compGvs = EntityQuery.use(delegator)
            .from("WorkEffortGoodStandard")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("workEffortId", EntityOperator.IN, taskIds),
                EntityCondition.makeCondition("workEffortGoodStdTypeId", EntityOperator.IN, ["PRUN_PROD_NEEDED", "PRUNT_PROD_NEEDED"])
            ], EntityOperator.AND))
            .queryList()

        List<Map<String, Object>> components = []
        for (GenericValue comp : compGvs) {
            String cProdId = comp.getString("productId")
            GenericValue cProd = EntityQuery.use(delegator).from("Product").where("productId", cProdId).cache(true).queryOne()
            String cProdName = cProd ? (cProd.getString("internalName") ?: cProd.getString("productName")) : cProdId

            // Çıkışı yapılan miktarı bul (WorkEffortInventoryAssign)
            List<GenericValue> issuances = EntityQuery.use(delegator)
                .from("WorkEffortInventoryAssign")
                .where("workEffortId", comp.getString("workEffortId"))
                .queryList()

            BigDecimal totalIssued = BigDecimal.ZERO
            for (GenericValue iss : issuances) {
                GenericValue ii = EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", iss.getString("inventoryItemId")).queryOne()
                if (ii && ii.getString("productId") == cProdId) {
                    totalIssued = totalIssued.add(iss.getBigDecimal("quantity") ?: BigDecimal.ZERO)
                }
            }

            components.add([
                workEffortId: comp.getString("workEffortId"),
                productId: cProdId,
                productName: cProdName,
                estimatedQuantity: comp.getBigDecimal("estimatedQuantity") ?: BigDecimal.ZERO,
                issuedQuantity: totalIssued,
                fromDate: comp.getTimestamp("fromDate") ? comp.getTimestamp("fromDate").toString() : ""
            ])
        }

        request.setAttribute("productionRun", header)
        request.setAttribute("tasks", tasks)
        request.setAttribute("components", components)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductionRunDetails: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni Üretim Emri Oluşturma
 */
String createProductionRun() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String productId = params.get("productId")?.toString()?.trim()
    String facilityId = params.get("facilityId")?.toString()?.trim()
    String routingId = params.get("routingId")?.toString()?.trim()
    String workEffortName = params.get("workEffortName")?.toString()?.trim()
    String description = params.get("description")?.toString()?.trim()
    Object qtyObj = params.get("quantity") ?: params.get("pRQuantity")
    Object startDateObj = params.get("startDate")

    if (!productId || !facilityId) {
        request.setAttribute("_ERROR_MESSAGE_", "productId ve facilityId zorunludur.")
        return "error"
    }

    BigDecimal quantity = BigDecimal.ONE
    if (qtyObj != null) {
        try { quantity = new BigDecimal(qtyObj.toString()) } catch (Exception ignored) {}
    }

    Timestamp startDate = parseTimestamp(startDateObj) ?: UtilDateTime.nowTimestamp()

    try {
        Map<String, Object> serviceIn = [
            productId: productId,
            facilityId: facilityId,
            pRQuantity: quantity,
            startDate: startDate,
            routingId: routingId ?: null,
            workEffortName: workEffortName ?: ("Üretim: " + productId),
            description: description ?: "",
            userLogin: userLogin
        ]

        Map<String, Object> serviceResult = dispatcher.runSync("createProductionRun", serviceIn)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        String productionRunId = serviceResult.get("productionRunId")?.toString()
        request.setAttribute("productionRunId", productionRunId)
        request.setAttribute("successMessage", "Üretim emri başarıyla oluşturuldu: " + productionRunId)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductionRun: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Üretim Emri Durumu Güncelleme (Planlandı, Başlatıldı, Tamamlandı, İptal)
 */
String changeProductionRunStatus() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String productionRunId = params.get("productionRunId")?.toString()?.trim()
    String statusId = params.get("statusId")?.toString()?.trim()

    if (!productionRunId || !statusId) {
        request.setAttribute("_ERROR_MESSAGE_", "productionRunId ve statusId zorunludur.")
        return "error"
    }

    try {
        Map<String, Object> serviceIn = [
            productionRunId: productionRunId,
            statusId: statusId,
            userLogin: userLogin
        ]

        Map<String, Object> serviceResult = dispatcher.runSync("changeProductionRunStatus", serviceIn)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        request.setAttribute("productionRunId", productionRunId)
        request.setAttribute("newStatusId", serviceResult.get("newStatusId") ?: statusId)
        request.setAttribute("successMessage", "Üretim emri durumu güncellendi: " + (serviceResult.get("newStatusId") ?: statusId))

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in changeProductionRunStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Üretim Tamamlama & Depoya Mamul Girişi (Declare & Produce)
 */
String declareProductionRunCompletion() {
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String productionRunId = params.get("productionRunId")?.toString()?.trim()
    Object qtyObj = params.get("quantity")
    String lotId = params.get("lotId")?.toString()?.trim()

    if (!productionRunId || qtyObj == null) {
        request.setAttribute("_ERROR_MESSAGE_", "productionRunId ve quantity zorunludur.")
        return "error"
    }

    BigDecimal quantity = BigDecimal.ZERO
    try { quantity = new BigDecimal(qtyObj.toString()) } catch (Exception ignored) {}

    try {
        Map<String, Object> serviceIn = [
            workEffortId: productionRunId,
            quantity: quantity,
            lotId: lotId ?: null,
            userLogin: userLogin
        ]

        Map<String, Object> serviceResult = dispatcher.runSync("productionRunProduce", serviceIn)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        request.setAttribute("productionRunId", productionRunId)
        request.setAttribute("inventoryItemIds", serviceResult.get("inventoryItemIds"))
        request.setAttribute("successMessage", quantity + " adet mamul üretilerek depoya kaydedildi.")

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in declareProductionRunCompletion: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün Ağaçları (BOM - Bill of Materials) Listesi ve Detayı
 */
String findProductBoms() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String selectedProductId = params.get("productId")?.toString()?.trim()

    try {
        // Tüm aktif MANUF_COMPONENT ilişkilerini çek
        List<EntityCondition> conds = [
            EntityCondition.makeCondition("productAssocTypeId", EntityOperator.EQUALS, "MANUF_COMPONENT")
        ]

        if (selectedProductId) {
            conds.add(EntityCondition.makeCondition("productId", EntityOperator.EQUALS, selectedProductId))
        }

        List<GenericValue> assocs = EntityQuery.use(delegator)
            .from("ProductAssoc")
            .where(conds)
            .filterByDate()
            .orderBy("productId", "sequenceNum")
            .queryList()

        // Mamul bazında grupla
        Map<String, List<Map<String, Object>>> bomsByProduct = [:]

        for (GenericValue assoc : assocs) {
            String pId = assoc.getString("productId")
            String compId = assoc.getString("productIdTo")

            GenericValue compProd = EntityQuery.use(delegator).from("Product").where("productId", compId).cache(true).queryOne()
            String compName = compProd ? (compProd.getString("internalName") ?: compProd.getString("productName")) : compId

            Map<String, Object> item = [
                productId: pId,
                componentId: compId,
                componentName: compName,
                quantity: assoc.getBigDecimal("quantity") ?: BigDecimal.ONE,
                scrapFactor: assoc.getBigDecimal("scrapFactor") ?: BigDecimal.ZERO,
                sequenceNum: assoc.getLong("sequenceNum") ?: 0,
                fromDate: assoc.getTimestamp("fromDate") ? assoc.getTimestamp("fromDate").toString() : "",
                thruDate: assoc.getTimestamp("thruDate") ? assoc.getTimestamp("thruDate").toString() : ""
            ]

            if (!bomsByProduct.containsKey(pId)) {
                bomsByProduct.put(pId, [])
            }
            bomsByProduct.get(pId).add(item)
        }

        List<Map<String, Object>> bomList = []
        bomsByProduct.each { pId, components ->
            GenericValue pProd = EntityQuery.use(delegator).from("Product").where("productId", pId).cache(true).queryOne()
            String pName = pProd ? (pProd.getString("internalName") ?: pProd.getString("productName")) : pId

            bomList.add([
                productId: pId,
                productName: pName,
                componentCount: components.size(),
                components: components
            ])
        }

        request.setAttribute("boms", bomList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findProductBoms: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün Ağacına Yeni Bileşen / Hammadde Ekleme
 */
String createBomComponent() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String productId = params.get("productId")?.toString()?.trim()
    String componentId = params.get("componentId")?.toString()?.trim() ?: params.get("productIdTo")?.toString()?.trim()
    Object qtyObj = params.get("quantity")
    Object scrapObj = params.get("scrapFactor")
    Object seqObj = params.get("sequenceNum")

    if (!productId || !componentId) {
        request.setAttribute("_ERROR_MESSAGE_", "productId ve componentId zorunludur.")
        return "error"
    }

    BigDecimal quantity = BigDecimal.ONE
    if (qtyObj != null) {
        try { quantity = new BigDecimal(qtyObj.toString()) } catch (Exception ignored) {}
    }

    BigDecimal scrapFactor = BigDecimal.ZERO
    if (scrapObj != null) {
        try { scrapFactor = new BigDecimal(scrapObj.toString()) } catch (Exception ignored) {}
    }

    Long sequenceNum = 10L
    if (seqObj != null) {
        try { sequenceNum = Long.parseLong(seqObj.toString()) } catch (Exception ignored) {}
    }

    Timestamp fromDate = parseTimestamp(params.get("fromDate")) ?: UtilDateTime.nowTimestamp()

    try {
        GenericValue newAssoc = delegator.makeValue("ProductAssoc", [
            productId: productId,
            productIdTo: componentId,
            productAssocTypeId: "MANUF_COMPONENT",
            fromDate: fromDate,
            quantity: quantity,
            scrapFactor: scrapFactor,
            sequenceNum: sequenceNum
        ])
        newAssoc.create()

        request.setAttribute("successMessage", "Reçete bileşeni başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createBomComponent: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürün Ağacından Bileşeni Kaldırma (thruDate set ederek sonlandırma)
 */
String deleteBomComponent() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String productId = params.get("productId")?.toString()?.trim()
    String componentId = params.get("componentId")?.toString()?.trim() ?: params.get("productIdTo")?.toString()?.trim()
    Timestamp fromDate = parseTimestamp(params.get("fromDate"))

    if (!productId || !componentId || !fromDate) {
        request.setAttribute("_ERROR_MESSAGE_", "productId, componentId ve fromDate zorunludur.")
        return "error"
    }

    try {
        GenericValue assoc = EntityQuery.use(delegator)
            .from("ProductAssoc")
            .where("productId", productId, "productIdTo", componentId, "productAssocTypeId", "MANUF_COMPONENT", "fromDate", fromDate)
            .queryOne()

        if (assoc) {
            assoc.set("thruDate", UtilDateTime.nowTimestamp())
            assoc.store()
        }

        request.setAttribute("successMessage", "Bileşen reçeteden çıkarıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteBomComponent: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Üretim Rotaları ve Operasyon Adımları Listeleme
 */
String findRoutings() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> routingGvs = EntityQuery.use(delegator)
            .from("WorkEffort")
            .where("workEffortTypeId", "ROUTING")
            .orderBy("workEffortName")
            .queryList()

        List<Map<String, Object>> routings = []

        for (GenericValue r : routingGvs) {
            String rId = r.getString("workEffortId")

            // Bu rotaya ait görev adımlarını bul (WorkEffortAssoc -> ROUTING_COMPONENT)
            List<GenericValue> stepAssocs = EntityQuery.use(delegator)
                .from("WorkEffortAssoc")
                .where("workEffortIdFrom", rId, "workEffortAssocTypeId", "ROUTING_COMPONENT")
                .filterByDate()
                .orderBy("sequenceNum")
                .queryList()

            List<Map<String, Object>> tasks = []
            for (GenericValue sa : stepAssocs) {
                String tId = sa.getString("workEffortIdTo")
                GenericValue tGv = EntityQuery.use(delegator).from("WorkEffort").where("workEffortId", tId).queryOne()
                if (tGv) {
                    tasks.add([
                        taskId: tId,
                        taskName: tGv.getString("workEffortName") ?: tId,
                        description: tGv.getString("description") ?: "",
                        sequenceNum: sa.getLong("sequenceNum") ?: 0,
                        estimatedSetupMillis: tGv.getBigDecimal("estimatedSetupMillis") ?: BigDecimal.ZERO,
                        estimatedMilliSeconds: tGv.getBigDecimal("estimatedMilliSeconds") ?: BigDecimal.ZERO
                    ])
                }
            }

            routings.add([
                routingId: rId,
                routingName: r.getString("workEffortName") ?: rId,
                description: r.getString("description") ?: "",
                taskCount: tasks.size(),
                tasks: tasks
            ])
        }

        request.setAttribute("routings", routings)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findRoutings: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni Rota Oluşturma
 */
String createRouting() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    String routingName = params.get("routingName")?.toString()?.trim()
    String description = params.get("description")?.toString()?.trim()

    if (!routingName) {
        request.setAttribute("_ERROR_MESSAGE_", "routingName zorunludur.")
        return "error"
    }

    try {
        String workEffortId = delegator.getNextSeqId("WorkEffort")
        GenericValue newRouting = delegator.makeValue("WorkEffort", [
            workEffortId: workEffortId,
            workEffortTypeId: "ROUTING",
            workEffortName: routingName,
            description: description ?: "",
            currentStatusId: "ROU_ACTIVE",
            createdDate: UtilDateTime.nowTimestamp()
        ])
        newRouting.create()

        request.setAttribute("routingId", workEffortId)
        request.setAttribute("successMessage", "Üretim rotası oluşturuldu: " + workEffortId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createRouting: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
