package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilHttp
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.condition.EntityFunction
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "FacilityInventoryEvents.groovy"

/**
 * 1. getPhysicalInventoryList
 * Fetches physical inventory count and variance records with associated product and facility details.
 */
String getPhysicalInventoryList() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String facilityId = params.facilityId
        String productId = params.productId
        String varianceReasonId = params.varianceReasonId

        List conds = []
        if (UtilValidate.isNotEmpty(facilityId)) {
            // Find inventory items belonging to this facility
            List invItems = EntityQuery.use(delegator).from("InventoryItem")
                .where("facilityId", facilityId)
                .select("inventoryItemId")
                .queryList()
            List invIds = invItems.collect { it.inventoryItemId }
            if (invIds.isEmpty()) {
                request.setAttribute("physicalInventories", [])
                request.setAttribute("totalCount", 0)
                return "success"
            }
            conds.add(EntityCondition.makeCondition("inventoryItemId", EntityOperator.IN, invIds))
        }

        if (UtilValidate.isNotEmpty(varianceReasonId)) {
            conds.add(EntityCondition.makeCondition("varianceReasonId", EntityOperator.EQUALS, varianceReasonId))
        }

        def query = EntityQuery.use(delegator).from("PhysicalInventoryAndVariance")
        if (!conds.isEmpty()) {
            query = query.where(conds)
        }
        List varianceList = query.orderBy("-physicalInventoryDate", "-physicalInventoryId")
            .maxRows(100)
            .queryList()

        List result = []
        for (GenericValue v : varianceList) {
            String invItemId = v.inventoryItemId
            GenericValue invItem = invItemId ? EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", invItemId).queryOne() : null
            String prodId = invItem?.productId
            
            // Filter by productId if requested
            if (UtilValidate.isNotEmpty(productId) && prodId != productId) {
                continue
            }

            GenericValue product = prodId ? EntityQuery.use(delegator).from("Product").where("productId", prodId).queryOne() : null
            GenericValue facility = invItem?.facilityId ? EntityQuery.use(delegator).from("Facility").where("facilityId", invItem.facilityId).queryOne() : null
            GenericValue reason = v.varianceReasonId ? EntityQuery.use(delegator).from("VarianceReason").where("varianceReasonId", v.varianceReasonId).queryOne() : null

            result.add([
                physicalInventoryId: v.physicalInventoryId,
                physicalInventoryDate: v.physicalInventoryDate ? v.physicalInventoryDate.toString() : null,
                partyId: v.partyId,
                generalComments: v.generalComments,
                inventoryItemId: invItemId,
                productId: prodId,
                productName: product?.internalName ?: product?.productName ?: prodId,
                facilityId: invItem?.facilityId,
                facilityName: facility?.facilityName ?: invItem?.facilityId,
                locationSeqId: invItem?.locationSeqId,
                lotId: invItem?.lotId,
                serialNumber: invItem?.serialNumber,
                varianceReasonId: v.varianceReasonId,
                varianceReasonDesc: reason?.description ?: v.varianceReasonId,
                quantityOnHandVar: v.quantityOnHandVar != null ? v.quantityOnHandVar : 0,
                availableToPromiseVar: v.availableToPromiseVar != null ? v.availableToPromiseVar : 0,
                comments: v.comments
            ])
        }

        request.setAttribute("physicalInventories", result)
        request.setAttribute("totalCount", result.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPhysicalInventoryList", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Fiziksel sayım listesi alınırken hata oluştu: " + e.message)
        return "error"
    }
}

/**
 * 2. getVarianceReasons
 * Returns all predefined reasons for inventory variances.
 */
String getVarianceReasons() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List reasons = EntityQuery.use(delegator).from("VarianceReason")
            .orderBy("varianceReasonId")
            .queryList()

        List result = []
        for (GenericValue r : reasons) {
            result.add([
                varianceReasonId: r.varianceReasonId,
                description: r.description ?: r.varianceReasonId
            ])
        }

        request.setAttribute("varianceReasons", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getVarianceReasons", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Varyans sebepleri alınamadı: " + e.message)
        return "error"
    }
}

/**
 * 3. createStockAdjustment
 * Records physical inventory count / variance and adjusts InventoryItem QOH & ATP relative to current stock.
 */
String createStockAdjustment() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")
        if (!userLogin) {
            userLogin = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }

        String inventoryItemId = params.inventoryItemId
        if (UtilValidate.isEmpty(inventoryItemId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Stok kartı (inventoryItemId) seçilmelidir.")
            return "error"
        }

        GenericValue invItem = EntityQuery.use(delegator).from("InventoryItem")
            .where("inventoryItemId", inventoryItemId)
            .queryOne()
        if (!invItem) {
            request.setAttribute("_ERROR_MESSAGE_", "Belirtilen stok kalemi bulunamadı: " + inventoryItemId)
            return "error"
        }

        String varianceReasonId = params.varianceReasonId ?: "VAR_LOST"
        String comments = params.comments ?: "Fiziksel sayım düzeltmesi"

        BigDecimal curQOH = invItem.quantityOnHandTotal != null ? invItem.quantityOnHandTotal : BigDecimal.ZERO
        BigDecimal curATP = invItem.availableToPromiseTotal != null ? invItem.availableToPromiseTotal : BigDecimal.ZERO

        BigDecimal qohVar = BigDecimal.ZERO
        BigDecimal atpVar = BigDecimal.ZERO

        // If countedQuantity is provided, calculate relative difference
        if (UtilValidate.isNotEmpty(params.countedQuantity)) {
            BigDecimal counted = new BigDecimal(params.countedQuantity.toString().trim())
            qohVar = counted.subtract(curQOH)
            atpVar = counted.subtract(curATP)
        } else if (UtilValidate.isNotEmpty(params.quantityOnHandVar)) {
            qohVar = new BigDecimal(params.quantityOnHandVar.toString().trim())
            atpVar = UtilValidate.isNotEmpty(params.availableToPromiseVar) ? 
                new BigDecimal(params.availableToPromiseVar.toString().trim()) : qohVar
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Sayım miktarı (countedQuantity) veya fark miktarı (quantityOnHandVar) belirtilmelidir.")
            return "error"
        }

        Map serviceContext = [
            inventoryItemId: inventoryItemId,
            varianceReasonId: varianceReasonId,
            quantityOnHandVar: qohVar,
            availableToPromiseVar: atpVar,
            comments: comments,
            generalComments: comments,
            partyId: userLogin?.partyId ?: "admin",
            userLogin: userLogin
        ]

        Map serviceResult = dispatcher.runSync("createPhysicalInventoryAndVariance", serviceContext)
        if (ServiceUtil.isError(serviceResult)) {
            String errMsg = ServiceUtil.getErrorMessage(serviceResult)
            request.setAttribute("_ERROR_MESSAGE_", "Stok düzeltme işlemi başarısız: " + errMsg)
            return "error"
        }

        String physicalInventoryId = serviceResult.physicalInventoryId
        request.setAttribute("physicalInventoryId", physicalInventoryId)
        request.setAttribute("inventoryItemId", inventoryItemId)
        request.setAttribute("quantityOnHandVar", qohVar)
        request.setAttribute("_EVENT_MESSAGE_", "Stok sayımı ve düzeltmesi başarıyla işlendi. Fiş No: #" + physicalInventoryId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createStockAdjustment", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Stok düzeltme kaydedilirken hata oluştu: " + e.message)
        return "error"
    }
}

/**
 * 4. receiveDirectInventory
 * Direct stock inflow / quick receive into warehouse without purchase order.
 */
String receiveDirectInventory() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")
        if (!userLogin) {
            userLogin = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }

        String productId = params.productId
        String facilityId = params.facilityId
        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(facilityId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Ürün ve Tesis alanları zorunludur.")
            return "error"
        }

        if (UtilValidate.isEmpty(params.quantityAccepted)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kabul edilen miktar (quantityAccepted) girilmelidir.")
            return "error"
        }

        BigDecimal qty = new BigDecimal(params.quantityAccepted.toString().trim())
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            request.setAttribute("_ERROR_MESSAGE_", "Miktar 0'dan büyük olmalıdır.")
            return "error"
        }

        BigDecimal unitCost = null
        if (UtilValidate.isNotEmpty(params.unitCost)) {
            unitCost = new BigDecimal(params.unitCost.toString().trim())
        }

        String locationSeqId = params.locationSeqId ?: null
        String lotId = params.lotId ?: null
        String serialNumber = params.serialNumber ?: null
        String comments = params.comments ?: "Doğrudan Depo Stok Kabulü"

        String invItemType = UtilValidate.isNotEmpty(serialNumber) ? "SERIALIZED_INV_ITEM" : "NON_SERIAL_INV_ITEM"

        Map serviceContext = [
            productId: productId,
            facilityId: facilityId,
            quantityAccepted: qty,
            quantityRejected: BigDecimal.ZERO,
            inventoryItemTypeId: invItemType,
            locationSeqId: locationSeqId,
            lotId: lotId,
            serialNumber: serialNumber,
            unitCost: unitCost,
            comments: comments,
            userLogin: userLogin
        ]

        Map serviceResult = dispatcher.runSync("receiveInventoryProduct", serviceContext)
        if (ServiceUtil.isError(serviceResult)) {
            String errMsg = ServiceUtil.getErrorMessage(serviceResult)
            request.setAttribute("_ERROR_MESSAGE_", "Stok kabulü başarısız: " + errMsg)
            return "error"
        }

        String inventoryItemId = serviceResult.inventoryItemId
        request.setAttribute("inventoryItemId", inventoryItemId)
        request.setAttribute("_EVENT_MESSAGE_", "Stok girişi başarıyla tamamlandı. Stok Kalem No: #" + inventoryItemId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in receiveDirectInventory", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Doğrudan stok kabulü sırasında hata oluştu: " + e.message)
        return "error"
    }
}

/**
 * 5. getFacilityList
 * Returns full facilities list with summary stats (location count, inventory items count).
 */
String getFacilityList() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List facilityList = EntityQuery.use(delegator).from("Facility")
            .orderBy("facilityName", "facilityId")
            .queryList()

        List result = []
        for (GenericValue f : facilityList) {
            String fId = f.facilityId
            long locCount = EntityQuery.use(delegator).from("FacilityLocation")
                .where("facilityId", fId)
                .queryCount()
            long itemCount = EntityQuery.use(delegator).from("InventoryItem")
                .where("facilityId", fId)
                .queryCount()
            GenericValue fType = f.facilityTypeId ? EntityQuery.use(delegator).from("FacilityType").where("facilityTypeId", f.facilityTypeId).queryOne() : null

            result.add([
                facilityId: fId,
                facilityName: f.facilityName ?: fId,
                facilityTypeId: f.facilityTypeId,
                facilityTypeDesc: fType?.description ?: f.facilityTypeId,
                ownerPartyId: f.ownerPartyId,
                description: f.description,
                facilitySize: f.facilitySize,
                facilitySizeUomId: f.facilitySizeUomId,
                openedDate: f.openedDate ? f.openedDate.toString() : null,
                closedDate: f.closedDate ? f.closedDate.toString() : null,
                locationCount: locCount,
                inventoryCount: itemCount
            ])
        }

        request.setAttribute("facilities", result)
        request.setAttribute("totalCount", result.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFacilityList", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Tesis listesi alınamadı: " + e.message)
        return "error"
    }
}

/**
 * 6. createFacility
 * Creates a new facility in OFBiz.
 */
String createFacility() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")
        if (!userLogin) {
            userLogin = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }

        String facilityName = params.facilityName
        String facilityTypeId = params.facilityTypeId ?: "WAREHOUSE"
        String ownerPartyId = params.ownerPartyId ?: "Company"
        String description = params.description

        if (UtilValidate.isEmpty(facilityName)) {
            request.setAttribute("_ERROR_MESSAGE_", "Tesis Adı zorunludur.")
            return "error"
        }

        BigDecimal facilitySize = null
        if (UtilValidate.isNotEmpty(params.facilitySize)) {
            facilitySize = new BigDecimal(params.facilitySize.toString().trim())
        }

        Map serviceContext = [
            facilityName: facilityName,
            facilityTypeId: facilityTypeId,
            ownerPartyId: ownerPartyId,
            description: description,
            facilitySize: facilitySize,
            userLogin: userLogin
        ]
        if (UtilValidate.isNotEmpty(params.facilityId)) {
            serviceContext.facilityId = params.facilityId.toString().trim()
        }

        Map serviceResult = dispatcher.runSync("createFacility", serviceContext)
        if (ServiceUtil.isError(serviceResult)) {
            String errMsg = ServiceUtil.getErrorMessage(serviceResult)
            request.setAttribute("_ERROR_MESSAGE_", "Tesis oluşturulamadı: " + errMsg)
            return "error"
        }

        String createdFacilityId = serviceResult.facilityId
        request.setAttribute("facilityId", createdFacilityId)
        request.setAttribute("_EVENT_MESSAGE_", "Tesis başarıyla oluşturuldu: " + facilityName + " (" + createdFacilityId + ")")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFacility", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Tesis eklenirken hata oluştu: " + e.message)
        return "error"
    }
}

/**
 * 7. updateFacility
 * Updates existing facility.
 */
String updateFacility() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")
        if (!userLogin) {
            userLogin = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }

        String facilityId = params.facilityId
        if (UtilValidate.isEmpty(facilityId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Tesis ID (facilityId) zorunludur.")
            return "error"
        }

        Map serviceContext = [
            facilityId: facilityId,
            facilityName: params.facilityName,
            facilityTypeId: params.facilityTypeId,
            ownerPartyId: params.ownerPartyId,
            description: params.description,
            userLogin: userLogin
        ]
        if (UtilValidate.isNotEmpty(params.facilitySize)) {
            serviceContext.facilitySize = new BigDecimal(params.facilitySize.toString().trim())
        }

        Map serviceResult = dispatcher.runSync("updateFacility", serviceContext)
        if (ServiceUtil.isError(serviceResult)) {
            String errMsg = ServiceUtil.getErrorMessage(serviceResult)
            request.setAttribute("_ERROR_MESSAGE_", "Tesis güncellenemedi: " + errMsg)
            return "error"
        }

        request.setAttribute("_EVENT_MESSAGE_", "Tesis bilgileri güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateFacility", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Tesis güncellenirken hata oluştu: " + e.message)
        return "error"
    }
}

/**
 * 8. getFacilityTypes
 * Returns list of facility types from DB.
 */
String getFacilityTypes() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List types = EntityQuery.use(delegator).from("FacilityType")
            .orderBy("facilityTypeId")
            .queryList()

        List result = []
        for (GenericValue t : types) {
            result.add([
                facilityTypeId: t.facilityTypeId,
                description: t.description ?: t.facilityTypeId
            ])
        }

        request.setAttribute("facilityTypes", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFacilityTypes", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Tesis türleri alınamadı: " + e.message)
        return "error"
    }
}
