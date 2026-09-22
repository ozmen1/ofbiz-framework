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

final String MODULE = "InventoryMediaConfigEvents.groovy"

// ---------------- 1. METADATA ----------------
String getInventoryMediaConfigMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Facilities
        List facilityList = EntityQuery.use(delegator).from("Facility")
            .select("facilityId", "facilityName", "facilityTypeId")
            .orderBy("facilityName")
            .queryList()

        List facilities = []
        for (GenericValue f : facilityList) {
            facilities.add([
                facilityId: f.facilityId,
                facilityName: f.facilityName ?: f.facilityId,
                facilityTypeId: f.facilityTypeId
            ])
        }

        // Facility Locations
        List locationList = EntityQuery.use(delegator).from("FacilityLocation")
            .orderBy("facilityId", "locationSeqId")
            .queryList()

        List locations = []
        for (GenericValue loc : locationList) {
            locations.add([
                facilityId: loc.facilityId,
                locationSeqId: loc.locationSeqId,
                locationTypeEnumId: loc.locationTypeEnumId,
                areaId: loc.areaId,
                aisleId: loc.aisleId,
                sectionId: loc.sectionId,
                levelId: loc.levelId,
                positionId: loc.positionId
            ])
        }

        // Transfer Statuses
        List transferStatusList = EntityQuery.use(delegator).from("StatusItem")
            .where("statusTypeId", "INVENTORY_XFER_STTS")
            .orderBy("sequenceId", "statusId")
            .queryList()

        List transferStatuses = []
        for (GenericValue s : transferStatusList) {
            transferStatuses.add([
                statusId: s.statusId,
                description: s.description ?: s.statusId
            ])
        }

        // Variance Reasons
        List reasonList = EntityQuery.use(delegator).from("VarianceReason")
            .orderBy("description")
            .queryList()

        List varianceReasons = []
        for (GenericValue r : reasonList) {
            varianceReasons.add([
                varianceReasonId: r.varianceReasonId,
                description: r.description ?: r.varianceReasonId
            ])
        }

        // Product Content Types
        List contentTypeList = EntityQuery.use(delegator).from("ProductContentType")
            .orderBy("description")
            .queryList()

        List contentTypes = []
        for (GenericValue ct : contentTypeList) {
            contentTypes.add([
                productContentTypeId: ct.productContentTypeId,
                description: ct.description ?: ct.productContentTypeId
            ])
        }

        // Products quick list
        List productList = EntityQuery.use(delegator).from("Product")
            .select("productId", "productName")
            .maxRows(200)
            .orderBy("productName")
            .queryList()

        List products = []
        for (GenericValue p : productList) {
            products.add([
                productId: p.productId,
                productName: p.productName ?: p.productId
            ])
        }

        Map metadata = [
            facilities: facilities,
            locations: locations,
            transferStatuses: transferStatuses,
            varianceReasons: varianceReasons,
            contentTypes: contentTypes,
            products: products
        ]

        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInventoryMediaConfigMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ---------------- 2. INVENTORY ITEMS ----------------
String getInventoryItems() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String facilityId = request.getParameter("facilityId")
        String productId = request.getParameter("productId")
        String locationSeqId = request.getParameter("locationSeqId")
        String searchKeyword = request.getParameter("searchKeyword")

        int viewIndex = 0
        int viewSize = 50
        try {
            if (request.getParameter("viewIndex")) viewIndex = Integer.parseInt(request.getParameter("viewIndex"))
            if (request.getParameter("viewSize")) viewSize = Integer.parseInt(request.getParameter("viewSize"))
        } catch (Exception ignored) {}

        List conds = []
        if (UtilValidate.isNotEmpty(facilityId)) {
            conds.add(EntityCondition.makeCondition("facilityId", EntityOperator.EQUALS, facilityId))
        }
        if (UtilValidate.isNotEmpty(productId)) {
            conds.add(EntityCondition.makeCondition("productId", EntityOperator.EQUALS, productId))
        }
        if (UtilValidate.isNotEmpty(locationSeqId)) {
            conds.add(EntityCondition.makeCondition("locationSeqId", EntityOperator.EQUALS, locationSeqId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.toLowerCase() + "%"
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.lowerField("inventoryItemId"), EntityOperator.LIKE, kw),
                EntityCondition.makeCondition(EntityFunction.lowerField("productId"), EntityOperator.LIKE, kw),
                EntityCondition.makeCondition(EntityFunction.lowerField("serialNumber"), EntityOperator.LIKE, kw),
                EntityCondition.makeCondition(EntityFunction.lowerField("lotId"), EntityOperator.LIKE, kw)
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("InventoryItem")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        List itemList = query.orderBy("-datetimeReceived", "inventoryItemId")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        // Calculate overall metrics
        BigDecimal totalQoh = BigDecimal.ZERO
        BigDecimal totalAtp = BigDecimal.ZERO
        BigDecimal totalValue = BigDecimal.ZERO

        List items = []
        for (GenericValue item : itemList) {
            String pId = item.productId
            String pName = ""
            if (pId) {
                GenericValue p = EntityQuery.use(delegator).from("Product").where("productId", pId).cache().queryOne()
                if (p) pName = p.productName ?: pId
            }

            String fName = ""
            if (item.facilityId) {
                GenericValue f = EntityQuery.use(delegator).from("Facility").where("facilityId", item.facilityId).cache().queryOne()
                if (f) fName = f.facilityName ?: item.facilityId
            }

            BigDecimal qoh = item.quantityOnHandTotal ?: BigDecimal.ZERO
            BigDecimal atp = item.availableToPromiseTotal ?: BigDecimal.ZERO
            BigDecimal cost = item.unitCost ?: BigDecimal.ZERO

            totalQoh = totalQoh.add(qoh)
            totalAtp = totalAtp.add(atp)
            totalValue = totalValue.add(qoh.multiply(cost))

            items.add([
                inventoryItemId: item.inventoryItemId,
                inventoryItemTypeId: item.inventoryItemTypeId,
                productId: pId,
                productName: pName,
                facilityId: item.facilityId,
                facilityName: fName,
                locationSeqId: item.locationSeqId,
                quantityOnHandTotal: qoh,
                availableToPromiseTotal: atp,
                unitCost: cost,
                currencyUomId: item.currencyUomId,
                serialNumber: item.serialNumber,
                lotId: item.lotId,
                softIdentifier: item.softIdentifier,
                statusId: item.statusId,
                datetimeReceived: item.datetimeReceived ? item.datetimeReceived.toString() : null,
                expireDate: item.expireDate ? item.expireDate.toString() : null
            ])
        }

        Map result = [
            items: items,
            totalCount: totalCount,
            viewIndex: viewIndex,
            viewSize: viewSize,
            metrics: [
                totalInventoryItems: totalCount,
                totalQoh: totalQoh,
                totalAtp: totalAtp,
                totalInventoryValue: totalValue
            ]
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInventoryItems: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ---------------- 3. PHYSICAL INVENTORY VARIANCE (STOCK ADJUSTMENT) ----------------
String createInventoryVariance() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")

    try {
        String inventoryItemId = request.getParameter("inventoryItemId")
        String quantityOnHandVarStr = request.getParameter("quantityOnHandVar")
        String availableToPromiseVarStr = request.getParameter("availableToPromiseVar")
        String varianceReasonId = request.getParameter("varianceReasonId")
        String comments = request.getParameter("comments")

        if (UtilValidate.isEmpty(inventoryItemId)) {
            request.setAttribute("_ERROR_MESSAGE_", "inventoryItemId is required")
            return "error"
        }

        BigDecimal qohVar = UtilValidate.isNotEmpty(quantityOnHandVarStr) ? new BigDecimal(quantityOnHandVarStr) : BigDecimal.ZERO
        BigDecimal atpVar = UtilValidate.isNotEmpty(availableToPromiseVarStr) ? new BigDecimal(availableToPromiseVarStr) : qohVar

        Map serviceCtx = [
            inventoryItemId: inventoryItemId,
            varianceReasonId: varianceReasonId ?: "VAR_DAMAGED",
            quantityOnHandVar: qohVar,
            availableToPromiseVar: atpVar,
            comments: comments ?: "Manual stock adjustment via React SPA",
            userLogin: userLogin
        ]

        Map serviceResult = dispatcher.runSync("createPhysicalInventoryAndVariance", serviceCtx)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        request.setAttribute("physicalInventoryId", serviceResult.get("physicalInventoryId"))
        request.setAttribute("message", "Inventory variance recorded successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInventoryVariance: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ---------------- 4. INVENTORY TRANSFERS ----------------
String getInventoryTransfers() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String statusId = request.getParameter("statusId")
        String facilityId = request.getParameter("facilityId")

        List conds = []
        if (UtilValidate.isNotEmpty(statusId)) {
            conds.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(facilityId)) {
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("facilityId", EntityOperator.EQUALS, facilityId),
                EntityCondition.makeCondition("facilityIdTo", EntityOperator.EQUALS, facilityId)
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("InventoryTransfer")
        if (!conds.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        List transferList = query.orderBy("-sendDate", "-inventoryTransferId").queryList()

        List transfers = []
        for (GenericValue xfer : transferList) {
            String invItemId = xfer.inventoryItemId
            String productId = ""
            String productName = ""
            if (invItemId) {
                GenericValue item = EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", invItemId).queryOne()
                if (item && item.productId) {
                    productId = item.productId
                    GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", productId).cache().queryOne()
                    if (prod) productName = prod.productName ?: productId
                }
            }

            String fromFacName = ""
            if (xfer.facilityId) {
                GenericValue f = EntityQuery.use(delegator).from("Facility").where("facilityId", xfer.facilityId).cache().queryOne()
                if (f) fromFacName = f.facilityName ?: xfer.facilityId
            }

            String toFacName = ""
            if (xfer.facilityIdTo) {
                GenericValue f = EntityQuery.use(delegator).from("Facility").where("facilityId", xfer.facilityIdTo).cache().queryOne()
                if (f) toFacName = f.facilityName ?: xfer.facilityIdTo
            }

            transfers.add([
                inventoryTransferId: xfer.inventoryTransferId,
                statusId: xfer.statusId,
                inventoryItemId: invItemId,
                productId: productId,
                productName: productName,
                facilityId: xfer.facilityId,
                facilityName: fromFacName,
                locationSeqId: xfer.locationSeqId,
                facilityIdTo: xfer.facilityIdTo,
                facilityNameTo: toFacName,
                locationSeqIdTo: xfer.locationSeqIdTo,
                xferQty: xfer.xferQty,
                sendDate: xfer.sendDate ? xfer.sendDate.toString() : null,
                receiveDate: xfer.receiveDate ? xfer.receiveDate.toString() : null,
                comments: xfer.comments
            ])
        }

        Map result = [
            transfers: transfers,
            totalCount: transfers.size()
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInventoryTransfers: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createInventoryTransfer() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")

    try {
        String inventoryItemId = request.getParameter("inventoryItemId")
        String facilityId = request.getParameter("facilityId")
        String facilityIdTo = request.getParameter("facilityIdTo")
        String locationSeqId = request.getParameter("locationSeqId")
        String locationSeqIdTo = request.getParameter("locationSeqIdTo")
        String xferQtyStr = request.getParameter("xferQty")
        String statusId = request.getParameter("statusId") ?: "IXF_REQUESTED"
        String comments = request.getParameter("comments")

        if (UtilValidate.isEmpty(inventoryItemId) || UtilValidate.isEmpty(facilityIdTo) || UtilValidate.isEmpty(xferQtyStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "inventoryItemId, facilityIdTo, and xferQty are required")
            return "error"
        }

        // Auto-detect source facility if not provided
        if (UtilValidate.isEmpty(facilityId)) {
            GenericValue item = EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", inventoryItemId).queryOne()
            if (item) {
                facilityId = item.facilityId
                if (!locationSeqId) locationSeqId = item.locationSeqId
            }
        }

        Map serviceCtx = [
            inventoryItemId: inventoryItemId,
            facilityId: facilityId,
            facilityIdTo: facilityIdTo,
            locationSeqId: locationSeqId ?: null,
            locationSeqIdTo: locationSeqIdTo ?: null,
            xferQty: new BigDecimal(xferQtyStr),
            statusId: statusId,
            sendDate: new Timestamp(System.currentTimeMillis()),
            comments: comments ?: null,
            userLogin: userLogin
        ]

        Map serviceResult = dispatcher.runSync("createInventoryTransfer", serviceCtx)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        request.setAttribute("inventoryTransferId", serviceResult.get("inventoryTransferId"))
        request.setAttribute("message", "Inventory transfer created successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createInventoryTransfer: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String updateInventoryTransferStatus() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")

    try {
        String inventoryTransferId = request.getParameter("inventoryTransferId")
        String statusId = request.getParameter("statusId")

        if (UtilValidate.isEmpty(inventoryTransferId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "inventoryTransferId and statusId are required")
            return "error"
        }

        Map serviceCtx = [
            inventoryTransferId: inventoryTransferId,
            statusId: statusId,
            userLogin: userLogin
        ]

        if ("IXF_COMPLETE".equals(statusId)) {
            serviceCtx.put("receiveDate", new Timestamp(System.currentTimeMillis()))
        }

        Map serviceResult = dispatcher.runSync("updateInventoryTransfer", serviceCtx)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        request.setAttribute("message", "Inventory transfer status updated")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateInventoryTransferStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ---------------- 5. FACILITY LOCATIONS ----------------
String getFacilityLocations() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String facilityId = request.getParameter("facilityId")

        def query = EntityQuery.use(delegator).from("FacilityLocation")
        if (UtilValidate.isNotEmpty(facilityId)) {
            query = query.where("facilityId", facilityId)
        }

        List locationList = query.orderBy("facilityId", "areaId", "aisleId", "sectionId", "levelId", "positionId").queryList()

        List locations = []
        for (GenericValue loc : locationList) {
            long itemCount = EntityQuery.use(delegator).from("InventoryItem")
                .where("facilityId", loc.facilityId, "locationSeqId", loc.locationSeqId)
                .queryCount()

            locations.add([
                facilityId: loc.facilityId,
                locationSeqId: loc.locationSeqId,
                locationTypeEnumId: loc.locationTypeEnumId,
                areaId: loc.areaId,
                aisleId: loc.aisleId,
                sectionId: loc.sectionId,
                levelId: loc.levelId,
                positionId: loc.positionId,
                itemCount: itemCount
            ])
        }

        request.setAttribute("locations", locations)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getFacilityLocations: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createFacilityLocation() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String facilityId = request.getParameter("facilityId")
        String locationSeqId = request.getParameter("locationSeqId")
        String locationTypeEnumId = request.getParameter("locationTypeEnumId") ?: "FLT_PICKLOC"
        String areaId = request.getParameter("areaId")
        String aisleId = request.getParameter("aisleId")
        String sectionId = request.getParameter("sectionId")
        String levelId = request.getParameter("levelId")
        String positionId = request.getParameter("positionId")

        if (UtilValidate.isEmpty(facilityId)) {
            request.setAttribute("_ERROR_MESSAGE_", "facilityId is required")
            return "error"
        }

        if (UtilValidate.isEmpty(locationSeqId)) {
            locationSeqId = delegator.getNextSeqId("FacilityLocation")
        }

        GenericValue loc = delegator.makeValue("FacilityLocation", [
            facilityId: facilityId,
            locationSeqId: locationSeqId,
            locationTypeEnumId: locationTypeEnumId,
            areaId: areaId ?: null,
            aisleId: aisleId ?: null,
            sectionId: sectionId ?: null,
            levelId: levelId ?: null,
            positionId: positionId ?: null
        ])
        loc.create()

        request.setAttribute("facilityId", facilityId)
        request.setAttribute("locationSeqId", locationSeqId)
        request.setAttribute("message", "Facility location created successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createFacilityLocation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String deleteFacilityLocation() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String facilityId = request.getParameter("facilityId")
        String locationSeqId = request.getParameter("locationSeqId")

        if (UtilValidate.isEmpty(facilityId) || UtilValidate.isEmpty(locationSeqId)) {
            request.setAttribute("_ERROR_MESSAGE_", "facilityId and locationSeqId are required")
            return "error"
        }

        GenericValue loc = EntityQuery.use(delegator).from("FacilityLocation")
            .where("facilityId", facilityId, "locationSeqId", locationSeqId)
            .queryOne()

        if (loc) {
            loc.remove()
        }

        request.setAttribute("message", "Facility location deleted successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteFacilityLocation: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ---------------- 6. PRODUCT MEDIA & CONTENTS ----------------
String getProductMedia() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        if (UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId is required")
            return "error"
        }

        GenericValue product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!product) {
            request.setAttribute("_ERROR_MESSAGE_", "Product not found: " + productId)
            return "error"
        }

        Map standardImages = [
            smallImageUrl: product.smallImageUrl,
            mediumImageUrl: product.mediumImageUrl,
            largeImageUrl: product.largeImageUrl,
            detailImageUrl: product.detailImageUrl,
            originalImageUrl: product.originalImageUrl
        ]

        List pcList = EntityQuery.use(delegator).from("ProductContent")
            .where("productId", productId)
            .filterByDate()
            .orderBy("sequenceNum", "fromDate")
            .queryList()

        List contents = []
        for (GenericValue pc : pcList) {
            String cId = pc.contentId
            GenericValue content = EntityQuery.use(delegator).from("Content").where("contentId", cId).queryOne()
            String cName = content ? content.contentName : ""
            String dataResId = content ? content.dataResourceId : ""
            String objectInfo = ""
            if (dataResId) {
                GenericValue dr = EntityQuery.use(delegator).from("DataResource").where("dataResourceId", dataResId).queryOne()
                if (dr) objectInfo = dr.objectInfo ?: ""
            }

            contents.add([
                productId: pc.productId,
                contentId: pc.contentId,
                productContentTypeId: pc.productContentTypeId,
                fromDate: pc.fromDate ? pc.fromDate.toString() : null,
                thruDate: pc.thruDate ? pc.thruDate.toString() : null,
                sequenceNum: pc.sequenceNum,
                contentName: cName,
                dataResourceId: dataResId,
                objectInfo: objectInfo
            ])
        }

        Map result = [
            productId: productId,
            productName: product.productName ?: productId,
            standardImages: standardImages,
            contents: contents
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductMedia: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String updateProductMediaUrls() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        if (UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId is required")
            return "error"
        }

        GenericValue product = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!product) {
            request.setAttribute("_ERROR_MESSAGE_", "Product not found: " + productId)
            return "error"
        }

        if (request.getParameter("smallImageUrl") != null) product.smallImageUrl = request.getParameter("smallImageUrl").trim()
        if (request.getParameter("mediumImageUrl") != null) product.mediumImageUrl = request.getParameter("mediumImageUrl").trim()
        if (request.getParameter("largeImageUrl") != null) product.largeImageUrl = request.getParameter("largeImageUrl").trim()
        if (request.getParameter("detailImageUrl") != null) product.detailImageUrl = request.getParameter("detailImageUrl").trim()
        if (request.getParameter("originalImageUrl") != null) product.originalImageUrl = request.getParameter("originalImageUrl").trim()

        product.store()

        request.setAttribute("message", "Product image URLs updated successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProductMediaUrls: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String addProductContent() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        String productContentTypeId = request.getParameter("productContentTypeId") ?: "ORIGINAL_IMAGE"
        String contentName = request.getParameter("contentName")
        String objectInfo = request.getParameter("objectInfo")
        String sequenceNumStr = request.getParameter("sequenceNum")

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(objectInfo)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId and objectInfo (URL) are required")
            return "error"
        }

        // Create DataResource
        String dataResourceId = delegator.getNextSeqId("DataResource")
        GenericValue dr = delegator.makeValue("DataResource", [
            dataResourceId: dataResourceId,
            dataResourceTypeId: "URL_RESOURCE",
            dataTemplateTypeId: "NONE",
            statusId: "CTNT_IN_PROGRESS",
            dataResourceName: contentName ?: "Product Media",
            objectInfo: objectInfo
        ])
        dr.create()

        // Create Content
        String contentId = delegator.getNextSeqId("Content")
        GenericValue content = delegator.makeValue("Content", [
            contentId: contentId,
            contentTypeId: "DOCUMENT",
            dataResourceId: dataResourceId,
            statusId: "CTNT_IN_PROGRESS",
            contentName: contentName ?: (productId + " Media")
        ])
        content.create()

        // Link to ProductContent
        Timestamp fromDate = new Timestamp(System.currentTimeMillis())
        Long seq = UtilValidate.isNotEmpty(sequenceNumStr) ? Long.parseLong(sequenceNumStr) : 10L

        GenericValue pc = delegator.makeValue("ProductContent", [
            productId: productId,
            contentId: contentId,
            productContentTypeId: productContentTypeId,
            fromDate: fromDate,
            sequenceNum: seq
        ])
        pc.create()

        request.setAttribute("contentId", contentId)
        request.setAttribute("message", "Product content added successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addProductContent: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String removeProductContent() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        String contentId = request.getParameter("contentId")
        String productContentTypeId = request.getParameter("productContentTypeId")
        String fromDateStr = request.getParameter("fromDate")

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(contentId) || UtilValidate.isEmpty(fromDateStr)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId, contentId, and fromDate are required")
            return "error"
        }

        Timestamp fromDate = Timestamp.valueOf(fromDateStr)
        GenericValue pc = EntityQuery.use(delegator).from("ProductContent")
            .where("productId", productId, "contentId", contentId, "productContentTypeId", productContentTypeId, "fromDate", fromDate)
            .queryOne()

        if (pc) {
            pc.remove()
        }

        request.setAttribute("message", "Product content removed successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeProductContent: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

// ---------------- 7. PRODUCT CONFIG ITEMS & OPTIONS ----------------
String getProductConfigItems() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String searchKeyword = request.getParameter("searchKeyword")

        def query = EntityQuery.use(delegator).from("ProductConfigItem")
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.toLowerCase() + "%"
            query = query.where(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.lowerField("configItemId"), EntityOperator.LIKE, kw),
                EntityCondition.makeCondition(EntityFunction.lowerField("configItemName"), EntityOperator.LIKE, kw),
                EntityCondition.makeCondition(EntityFunction.lowerField("description"), EntityOperator.LIKE, kw)
            ], EntityOperator.OR))
        }

        List configList = query.orderBy("configItemName", "configItemId").queryList()

        List items = []
        for (GenericValue ci : configList) {
            long optionCount = EntityQuery.use(delegator).from("ProductConfigOption")
                .where("configItemId", ci.configItemId)
                .queryCount()

            items.add([
                configItemId: ci.configItemId,
                configItemTypeId: ci.configItemTypeId,
                configItemName: ci.configItemName ?: ci.configItemId,
                description: ci.description,
                longDescription: ci.longDescription,
                imageUrl: ci.imageUrl,
                optionCount: optionCount
            ])
        }

        Map result = [
            configItems: items,
            totalCount: items.size()
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductConfigItems: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getProductConfigItemDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String configItemId = request.getParameter("configItemId")
        if (UtilValidate.isEmpty(configItemId)) {
            request.setAttribute("_ERROR_MESSAGE_", "configItemId is required")
            return "error"
        }

        GenericValue ci = EntityQuery.use(delegator).from("ProductConfigItem").where("configItemId", configItemId).queryOne()
        if (!ci) {
            request.setAttribute("_ERROR_MESSAGE_", "Config item not found: " + configItemId)
            return "error"
        }

        List optList = EntityQuery.use(delegator).from("ProductConfigOption")
            .where("configItemId", configItemId)
            .orderBy("sequenceNum", "configOptionId")
            .queryList()

        List options = []
        for (GenericValue opt : optList) {
            options.add([
                configItemId: opt.configItemId,
                configOptionId: opt.configOptionId,
                configOptionName: opt.configOptionName ?: opt.configOptionId,
                description: opt.description,
                sequenceNum: opt.sequenceNum,
                fromDate: opt.fromDate ? opt.fromDate.toString() : null,
                thruDate: opt.thruDate ? opt.thruDate.toString() : null
            ])
        }

        Map result = [
            configItem: [
                configItemId: ci.configItemId,
                configItemTypeId: ci.configItemTypeId,
                configItemName: ci.configItemName,
                description: ci.description,
                longDescription: ci.longDescription,
                imageUrl: ci.imageUrl
            ],
            options: options
        ]

        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductConfigItemDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createProductConfigItem() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String configItemId = request.getParameter("configItemId")
        String configItemTypeId = request.getParameter("configItemTypeId") ?: "MULTIPLE"
        String configItemName = request.getParameter("configItemName")
        String description = request.getParameter("description")
        String longDescription = request.getParameter("longDescription")
        String imageUrl = request.getParameter("imageUrl")

        if (UtilValidate.isEmpty(configItemName)) {
            request.setAttribute("_ERROR_MESSAGE_", "configItemName is required")
            return "error"
        }

        if (UtilValidate.isEmpty(configItemId)) {
            configItemId = delegator.getNextSeqId("ProductConfigItem")
        }

        GenericValue ci = delegator.makeValue("ProductConfigItem", [
            configItemId: configItemId,
            configItemTypeId: configItemTypeId,
            configItemName: configItemName,
            description: description ?: null,
            longDescription: longDescription ?: null,
            imageUrl: imageUrl ?: null
        ])
        ci.create()

        request.setAttribute("configItemId", configItemId)
        request.setAttribute("message", "Config item created successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductConfigItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String updateProductConfigItem() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String configItemId = request.getParameter("configItemId")
        if (UtilValidate.isEmpty(configItemId)) {
            request.setAttribute("_ERROR_MESSAGE_", "configItemId is required")
            return "error"
        }

        GenericValue ci = EntityQuery.use(delegator).from("ProductConfigItem").where("configItemId", configItemId).queryOne()
        if (!ci) {
            request.setAttribute("_ERROR_MESSAGE_", "Config item not found: " + configItemId)
            return "error"
        }

        if (request.getParameter("configItemName") != null) ci.configItemName = request.getParameter("configItemName")
        if (request.getParameter("configItemTypeId") != null) ci.configItemTypeId = request.getParameter("configItemTypeId")
        if (request.getParameter("description") != null) ci.description = request.getParameter("description")
        if (request.getParameter("longDescription") != null) ci.longDescription = request.getParameter("longDescription")
        if (request.getParameter("imageUrl") != null) ci.imageUrl = request.getParameter("imageUrl")

        ci.store()

        request.setAttribute("message", "Config item updated successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProductConfigItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String deleteProductConfigItem() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String configItemId = request.getParameter("configItemId")
        if (UtilValidate.isEmpty(configItemId)) {
            request.setAttribute("_ERROR_MESSAGE_", "configItemId is required")
            return "error"
        }

        GenericValue ci = EntityQuery.use(delegator).from("ProductConfigItem").where("configItemId", configItemId).queryOne()
        if (ci) {
            // Delete dependent options
            delegator.removeByAnd("ProductConfigOption", [configItemId: configItemId])
            ci.remove()
        }

        request.setAttribute("message", "Config item deleted successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductConfigItem: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String createProductConfigOption() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String configItemId = request.getParameter("configItemId")
        String configOptionId = request.getParameter("configOptionId")
        String configOptionName = request.getParameter("configOptionName")
        String description = request.getParameter("description")
        String sequenceNumStr = request.getParameter("sequenceNum")

        if (UtilValidate.isEmpty(configItemId) || UtilValidate.isEmpty(configOptionName)) {
            request.setAttribute("_ERROR_MESSAGE_", "configItemId and configOptionName are required")
            return "error"
        }

        if (UtilValidate.isEmpty(configOptionId)) {
            configOptionId = delegator.getNextSeqId("ProductConfigOption")
        }

        Long seq = UtilValidate.isNotEmpty(sequenceNumStr) ? Long.parseLong(sequenceNumStr) : 10L

        GenericValue opt = delegator.makeValue("ProductConfigOption", [
            configItemId: configItemId,
            configOptionId: configOptionId,
            configOptionName: configOptionName,
            description: description ?: null,
            sequenceNum: seq,
            fromDate: new Timestamp(System.currentTimeMillis())
        ])
        opt.create()

        request.setAttribute("configOptionId", configOptionId)
        request.setAttribute("message", "Config option created successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductConfigOption: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String deleteProductConfigOption() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String configItemId = request.getParameter("configItemId")
        String configOptionId = request.getParameter("configOptionId")

        if (UtilValidate.isEmpty(configItemId) || UtilValidate.isEmpty(configOptionId)) {
            request.setAttribute("_ERROR_MESSAGE_", "configItemId and configOptionId are required")
            return "error"
        }

        GenericValue opt = EntityQuery.use(delegator).from("ProductConfigOption")
            .where("configItemId", configItemId, "configOptionId", configOptionId)
            .queryFirst()

        if (opt) {
            opt.remove()
        }

        request.setAttribute("message", "Config option deleted successfully")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductConfigOption: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
