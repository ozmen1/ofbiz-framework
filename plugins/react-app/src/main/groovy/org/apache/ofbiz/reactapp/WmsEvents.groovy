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

final String MODULE = "WmsEvents.groovy"

/**
 * 1. getWmsMetadata
 * Returns metadata needed by WMS views: facilities, statuses, shipment methods, locations, carriers.
 */
String getWmsMetadata() {
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

        // Picklist Statuses
        List picklistStatusList = EntityQuery.use(delegator).from("StatusItem")
            .where("statusTypeId", "PICKLIST_STATUS")
            .orderBy("sequenceId", "statusId")
            .queryList()

        List picklistStatuses = []
        for (GenericValue s : picklistStatusList) {
            picklistStatuses.add([
                statusId: s.statusId,
                description: s.description ?: s.statusId,
                sequenceId: s.sequenceId
            ])
        }

        // Picklist Item Statuses
        List itemStatusList = EntityQuery.use(delegator).from("StatusItem")
            .where("statusTypeId", "PICKLIST_ITEM_STATUS")
            .orderBy("sequenceId", "statusId")
            .queryList()

        List itemStatuses = []
        for (GenericValue s : itemStatusList) {
            itemStatuses.add([
                statusId: s.statusId,
                description: s.description ?: s.statusId
            ])
        }

        // Shipment Method Types
        List shipmentMethodList = EntityQuery.use(delegator).from("ShipmentMethodType")
            .orderBy("description")
            .queryList()

        List shipmentMethods = []
        for (GenericValue sm : shipmentMethodList) {
            shipmentMethods.add([
                shipmentMethodTypeId: sm.shipmentMethodTypeId,
                description: sm.description ?: sm.shipmentMethodTypeId
            ])
        }

        // Facility Locations
        List locationList = EntityQuery.use(delegator).from("FacilityLocation")
            .orderBy("facilityId", "locationSeqId")
            .maxRows(100)
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

        Map responseData = [
            status: "success",
            facilities: facilities,
            picklistStatuses: picklistStatuses,
            picklistItemStatuses: itemStatuses,
            shipmentMethods: shipmentMethods,
            locations: locations
        ]

        request.setAttribute("wmsMetadata", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getWmsMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 2. findPicklists
 * Lists picklists with KPI metrics, filters, and pagination.
 */
String findPicklists() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String facilityId = params.facilityId
        String statusId = params.statusId
        String search = params.search

        int viewIndex = 0
        int viewSize = 25
        try {
            if (params.viewIndex) viewIndex = Integer.parseInt(params.viewIndex.toString())
            if (params.viewSize) viewSize = Integer.parseInt(params.viewSize.toString())
        } catch (NumberFormatException ignored) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(facilityId)) {
            conditions.add(EntityCondition.makeCondition("facilityId", EntityOperator.EQUALS, facilityId))
        }
        if (UtilValidate.isNotEmpty(statusId)) {
            conditions.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(search)) {
            String s = "%" + search.trim() + "%"
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.upperField("picklistId"), EntityOperator.LIKE, EntityFunction.upper(s)),
                EntityCondition.makeCondition(EntityFunction.upperField("description"), EntityOperator.LIKE, EntityFunction.upper(s))
            ], EntityOperator.OR))
        }

        // Calculate KPI Metrics across all picklists (or filtered by facility if provided)
        // Calculate KPI Metrics across all picklists (or filtered by facility if provided)
        def metricQuery = EntityQuery.use(delegator).from("Picklist").select("picklistId", "statusId")
        if (UtilValidate.isNotEmpty(facilityId)) {
            metricQuery = metricQuery.where("facilityId", facilityId)
        }
        List allPicklists = metricQuery.queryList()

        int totalCount = allPicklists.size()
        int inputCount = 0
        int assignedCount = 0
        int printedCount = 0
        int pickedCount = 0
        int cancelledCount = 0

        for (GenericValue p : allPicklists) {
            String st = p.statusId
            if ("PICKLIST_INPUT".equals(st)) inputCount++
            else if ("PICKLIST_ASSIGNED".equals(st)) assignedCount++
            else if ("PICKLIST_PRINTED".equals(st)) printedCount++
            else if ("PICKLIST_PICKED".equals(st)) pickedCount++
            else if ("PICKLIST_CANCELLED".equals(st)) cancelledCount++
        }

        // Query paginated picklists
        def pQuery = EntityQuery.use(delegator).from("Picklist")
        if (!conditions.isEmpty()) {
            pQuery = pQuery.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List picklistList = pQuery
            .orderBy("picklistDate DESC", "createdDate DESC")
            .offset(viewIndex * viewSize)
            .maxRows(viewSize)
            .queryList()

        List resultPicklists = []
        for (GenericValue p : picklistList) {
            String pid = p.picklistId
            // Get facility name
            String facName = p.facilityId
            if (p.facilityId) {
                GenericValue fac = EntityQuery.use(delegator).from("Facility").where("facilityId", p.facilityId).queryOne()
                if (fac && fac.facilityName) facName = fac.facilityName
            }

            // Get status description
            String statusDesc = p.statusId
            if (p.statusId) {
                GenericValue stItem = EntityQuery.use(delegator).from("StatusItem").where("statusId", p.statusId).queryOne()
                if (stItem && stItem.description) statusDesc = stItem.description
            }

            // Count bins
            long binCount = EntityQuery.use(delegator).from("PicklistBin")
                .where("picklistId", pid)
                .queryCount()

            // Count items
            List bins = EntityQuery.use(delegator).from("PicklistBin")
                .where("picklistId", pid)
                .select("picklistBinId")
                .queryList()
            List binIds = bins.collect { it.picklistBinId }

            long itemCount = 0
            long completedItemCount = 0
            if (!binIds.isEmpty()) {
                itemCount = EntityQuery.use(delegator).from("PicklistItem")
                    .where(EntityCondition.makeCondition("picklistBinId", EntityOperator.IN, binIds))
                    .queryCount()
                completedItemCount = EntityQuery.use(delegator).from("PicklistItem")
                    .where(EntityCondition.makeCondition([
                        EntityCondition.makeCondition("picklistBinId", EntityOperator.IN, binIds),
                        EntityCondition.makeCondition("itemStatusId", EntityOperator.EQUALS, "PICKITEM_COMPLETED")
                    ], EntityOperator.AND))
                    .queryCount()
            }

            resultPicklists.add([
                picklistId: pid,
                description: p.description ?: "",
                facilityId: p.facilityId,
                facilityName: facName,
                statusId: p.statusId,
                statusDescription: statusDesc,
                shipmentMethodTypeId: p.shipmentMethodTypeId,
                picklistDate: p.picklistDate ? p.picklistDate.toString() : "",
                createdDate: p.createdDate ? p.createdDate.toString() : "",
                createdByUserLogin: p.createdByUserLogin ?: "",
                binCount: binCount,
                itemCount: itemCount,
                completedItemCount: completedItemCount
            ])
        }

        Map responseData = [
            status: "success",
            picklists: resultPicklists,
            totalCount: totalCount,
            viewIndex: viewIndex,
            viewSize: viewSize,
            metrics: [
                total: totalCount,
                input: inputCount,
                assigned: assignedCount,
                printed: printedCount,
                picked: pickedCount,
                cancelled: cancelledCount
            ]
        ]

        request.setAttribute("picklistData", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findPicklists: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 3. getPicklistDetails
 * Returns full details for a picklist: header, status history, bins, and items with location & product info.
 */
String getPicklistDetails() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String picklistId = params.picklistId
        if (UtilValidate.isEmpty(picklistId)) {
            request.setAttribute("error", [status: "error", message: "picklistId is required"])
            return "error"
        }

        GenericValue picklist = EntityQuery.use(delegator).from("Picklist").where("picklistId", picklistId).queryOne()
        if (!picklist) {
            request.setAttribute("error", [status: "error", message: "Picklist not found: " + picklistId])
            return "error"
        }

        // Facility
        String facName = picklist.facilityId
        if (picklist.facilityId) {
            GenericValue fac = EntityQuery.use(delegator).from("Facility").where("facilityId", picklist.facilityId).queryOne()
            if (fac && fac.facilityName) facName = fac.facilityName
        }

        // Status Description
        String statusDesc = picklist.statusId
        if (picklist.statusId) {
            GenericValue stItem = EntityQuery.use(delegator).from("StatusItem").where("statusId", picklist.statusId).queryOne()
            if (stItem && stItem.description) statusDesc = stItem.description
        }

        // Status History
        List historyList = EntityQuery.use(delegator).from("PicklistStatus")
            .where("picklistId", picklistId)
            .orderBy("statusDate ASC")
            .queryList()

        List statusHistory = []
        for (GenericValue h : historyList) {
            String fromDesc = h.statusId ?: "BAŞLANGIÇ"
            String toDesc = h.statusIdTo ?: ""
            if (h.statusId) {
                GenericValue s1 = EntityQuery.use(delegator).from("StatusItem").where("statusId", h.statusId).queryOne()
                if (s1 && s1.description) fromDesc = s1.description
            }
            if (h.statusIdTo) {
                GenericValue s2 = EntityQuery.use(delegator).from("StatusItem").where("statusId", h.statusIdTo).queryOne()
                if (s2 && s2.description) toDesc = s2.description
            }

            statusHistory.add([
                statusId: h.statusId,
                statusIdTo: h.statusIdTo,
                fromDescription: fromDesc,
                toDescription: toDesc,
                statusDate: h.statusDate ? h.statusDate.toString() : "",
                changeByUserLoginId: h.changeByUserLoginId ?: ""
            ])
        }

        // Bins
        List binList = EntityQuery.use(delegator).from("PicklistBin")
            .where("picklistId", picklistId)
            .orderBy("binLocationNumber ASC")
            .queryList()

        List bins = []
        List items = []

        for (GenericValue bin : binList) {
            String binId = bin.picklistBinId
            bins.add([
                picklistBinId: binId,
                picklistId: bin.picklistId,
                binLocationNumber: bin.binLocationNumber,
                primaryOrderId: bin.primaryOrderId,
                primaryShipGroupSeqId: bin.primaryShipGroupSeqId
            ])

            // Query items for this bin
            List itemList = EntityQuery.use(delegator).from("PicklistItem")
                .where("picklistBinId", binId)
                .queryList()

            for (GenericValue it : itemList) {
                // Product info
                String productId = ""
                String productName = ""
                if (it.orderId && it.orderItemSeqId) {
                    GenericValue orderItem = EntityQuery.use(delegator).from("OrderItem")
                        .where("orderId", it.orderId, "orderItemSeqId", it.orderItemSeqId)
                        .queryOne()
                    if (orderItem) {
                        productId = orderItem.productId ?: ""
                        productName = orderItem.itemDescription ?: productId
                    }
                }
                if (productId && (!productName || productName.equals(productId))) {
                    GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
                    if (prod && prod.internalName) productName = prod.internalName
                }

                // Inventory item & location info
                String locationSeqId = ""
                String aisleId = ""
                String sectionId = ""
                String levelId = ""
                String positionId = ""
                String lotId = ""
                String serialNumber = ""
                String expireDate = ""

                if (it.inventoryItemId) {
                    GenericValue invItem = EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", it.inventoryItemId).queryOne()
                    if (invItem) {
                        locationSeqId = invItem.locationSeqId ?: ""
                        lotId = invItem.lotId ?: ""
                        serialNumber = invItem.serialNumber ?: ""
                        if (invItem.expireDate) expireDate = invItem.expireDate.toString()

                        if (locationSeqId && invItem.facilityId) {
                            GenericValue loc = EntityQuery.use(delegator).from("FacilityLocation")
                                .where("facilityId", invItem.facilityId, "locationSeqId", locationSeqId)
                                .queryOne()
                            if (loc) {
                                aisleId = loc.aisleId ?: ""
                                sectionId = loc.sectionId ?: ""
                                levelId = loc.levelId ?: ""
                                positionId = loc.positionId ?: ""
                            }
                        }
                    }
                }

                // Item status description
                String itemStatusDesc = it.itemStatusId ?: "PICKITEM_PENDING"
                if (it.itemStatusId) {
                    GenericValue st = EntityQuery.use(delegator).from("StatusItem").where("statusId", it.itemStatusId).queryOne()
                    if (st && st.description) itemStatusDesc = st.description
                }

                items.add([
                    picklistBinId: it.picklistBinId,
                    orderId: it.orderId,
                    orderItemSeqId: it.orderItemSeqId,
                    shipGroupSeqId: it.shipGroupSeqId,
                    inventoryItemId: it.inventoryItemId,
                    itemStatusId: it.itemStatusId ?: "PICKITEM_PENDING",
                    itemStatusDescription: itemStatusDesc,
                    quantity: it.quantity ? it.quantity.doubleValue() : 0.0,
                    productId: productId,
                    productName: productName,
                    locationSeqId: locationSeqId,
                    aisleId: aisleId,
                    sectionId: sectionId,
                    levelId: levelId,
                    positionId: positionId,
                    lotId: lotId,
                    serialNumber: serialNumber,
                    expireDate: expireDate
                ])
            }
        }

        Map responseData = [
            status: "success",
            picklist: [
                picklistId: picklist.picklistId,
                description: picklist.description ?: "",
                facilityId: picklist.facilityId,
                facilityName: facName,
                statusId: picklist.statusId,
                statusDescription: statusDesc,
                shipmentMethodTypeId: picklist.shipmentMethodTypeId ?: "",
                picklistDate: picklist.picklistDate ? picklist.picklistDate.toString() : "",
                createdDate: picklist.createdDate ? picklist.createdDate.toString() : "",
                createdByUserLogin: picklist.createdByUserLogin ?: "",
                lastModifiedDate: picklist.lastModifiedDate ? picklist.lastModifiedDate.toString() : "",
                lastModifiedByUserLogin: picklist.lastModifiedByUserLogin ?: ""
            ],
            bins: bins,
            items: items,
            statusHistory: statusHistory
        ]

        request.setAttribute("picklistDetail", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPicklistDetails: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 4. getPickableOrders
 * Lists approved sales orders that are ready to be picked (not already on an active picklist).
 */
String getPickableOrders() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String facilityId = params.facilityId

        // Active picklist order IDs (picklist not cancelled)
        List activePicklists = EntityQuery.use(delegator).from("Picklist")
            .where(EntityCondition.makeCondition("statusId", EntityOperator.NOT_EQUAL, "PICKLIST_CANCELLED"))
            .select("picklistId")
            .queryList()
        List activePicklistIds = activePicklists.collect { it.picklistId }

        Set activeOrderIds = new HashSet()
        if (!activePicklistIds.isEmpty()) {
            List activeBins = EntityQuery.use(delegator).from("PicklistBin")
                .where(EntityCondition.makeCondition("picklistId", EntityOperator.IN, activePicklistIds))
                .select("primaryOrderId")
                .queryList()
            for (GenericValue b : activeBins) {
                if (b.primaryOrderId) activeOrderIds.add(b.primaryOrderId)
            }
        }

        // Query ORDER_APPROVED sales orders
        List conds = [
            EntityCondition.makeCondition("orderTypeId", EntityOperator.EQUALS, "SALES_ORDER"),
            EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, "ORDER_APPROVED")
        ]
        if (!activeOrderIds.isEmpty()) {
            conds.add(EntityCondition.makeCondition("orderId", EntityOperator.NOT_IN, activeOrderIds))
        }

        List orders = EntityQuery.use(delegator).from("OrderHeader")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("orderDate DESC")
            .maxRows(50)
            .queryList()

        List resultOrders = []
        for (GenericValue o : orders) {
            String oid = o.orderId

            // Customer
            String customerName = ""
            GenericValue billTo = EntityQuery.use(delegator).from("OrderRole")
                .where("orderId", oid, "roleTypeId", "BILL_TO_CUSTOMER")
                .queryFirst()
            if (billTo) {
                GenericValue party = EntityQuery.use(delegator).from("PartyGroup").where("partyId", billTo.partyId).queryOne()
                if (party && party.groupName) {
                    customerName = party.groupName
                } else {
                    GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", billTo.partyId).queryOne()
                    if (person) customerName = ((person.firstName ?: "") + " " + (person.lastName ?: "")).trim()
                }
            }

            // Items count and products
            List orderItems = EntityQuery.use(delegator).from("OrderItem")
                .where("orderId", oid, "statusId", "ITEM_APPROVED")
                .queryList()

            double totalQuantity = 0.0
            List productList = []
            for (GenericValue oi : orderItems) {
                totalQuantity += (oi.quantity ? oi.quantity.doubleValue() : 0.0)
                productList.add([
                    productId: oi.productId,
                    itemDescription: oi.itemDescription ?: oi.productId,
                    quantity: oi.quantity ? oi.quantity.doubleValue() : 0.0
                ])
            }

            resultOrders.add([
                orderId: oid,
                orderName: o.orderName ?: "",
                orderDate: o.orderDate ? o.orderDate.toString() : "",
                customerName: customerName,
                grandTotal: o.grandTotal ? o.grandTotal.doubleValue() : 0.0,
                currencyUom: o.currencyUom ?: "TRY",
                itemCount: orderItems.size(),
                totalQuantity: totalQuantity,
                items: productList
            ])
        }

        Map responseData = [
            status: "success",
            orders: resultOrders,
            totalCount: resultOrders.size()
        ]

        request.setAttribute("pickableOrders", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPickableOrders: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 5. createPicklist
 * Creates a new picklist manually or automatically builds bins & items from a list of selected orderIds.
 */
String createPicklist() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")

        String facilityId = params.facilityId ?: "WebStoreWarehouse"
        String description = params.description ?: "Toplama Listesi"
        String shipmentMethodTypeId = params.shipmentMethodTypeId ?: "STANDARD"

        // Handle orderIds (can be List or comma-separated string)
        List orderIdList = []
        if (params.orderIds instanceof List) {
            orderIdList = (List) params.orderIds
        } else if (params.orderIds instanceof String && UtilValidate.isNotEmpty(params.orderIds)) {
            orderIdList = Arrays.asList(params.orderIds.toString().split(","))
        }

        Timestamp now = UtilDateTime.nowTimestamp()
        String picklistId = delegator.getNextSeqId("Picklist")

        GenericValue picklist = delegator.makeValue("Picklist", [
            picklistId: picklistId,
            description: description,
            facilityId: facilityId,
            shipmentMethodTypeId: shipmentMethodTypeId,
            statusId: "PICKLIST_INPUT",
            picklistDate: now,
            createdDate: now,
            createdByUserLogin: userLogin ? userLogin.userLoginId : "admin",
            lastModifiedDate: now,
            lastModifiedByUserLogin: userLogin ? userLogin.userLoginId : "admin"
        ])
        delegator.create(picklist)

        // Record initial status history
        GenericValue hist = delegator.makeValue("PicklistStatus", [
            picklistId: picklistId,
            statusDate: now,
            statusId: null,
            statusIdTo: "PICKLIST_INPUT",
            changeByUserLoginId: userLogin ? userLogin.userLoginId : "admin"
        ])
        delegator.create(hist)

        // If order IDs are provided, create PicklistBin and PicklistItem records for each
        long binLocationNumber = 1
        for (Object rawOrderId : orderIdList) {
            String orderId = rawOrderId.toString().trim()
            if (UtilValidate.isEmpty(orderId)) continue

            // Find ship groups
            List shipGroups = EntityQuery.use(delegator).from("OrderItemShipGroup")
                .where("orderId", orderId)
                .queryList()

            if (shipGroups.isEmpty()) {
                // Create a bin with default ship group "00001"
                String binId = delegator.getNextSeqId("PicklistBin")
                delegator.create(delegator.makeValue("PicklistBin", [
                    picklistBinId: binId,
                    picklistId: picklistId,
                    binLocationNumber: BigDecimal.valueOf(binLocationNumber++),
                    primaryOrderId: orderId,
                    primaryShipGroupSeqId: "00001"
                ]))

                // Order items
                List items = EntityQuery.use(delegator).from("OrderItem")
                    .where("orderId", orderId, "statusId", "ITEM_APPROVED")
                    .queryList()

                for (GenericValue item : items) {
                    // Try to find inventory reservation
                    GenericValue invRes = EntityQuery.use(delegator).from("OrderItemShipGrpInvRes")
                        .where("orderId", orderId, "orderItemSeqId", item.orderItemSeqId)
                        .queryFirst()

                    String invItemId = invRes ? invRes.inventoryItemId : ""
                    if (!invItemId) {
                        // Find any inventory item for product
                        GenericValue availInv = EntityQuery.use(delegator).from("InventoryItem")
                            .where("productId", item.productId, "facilityId", facilityId)
                            .queryFirst()
                        invItemId = availInv ? availInv.inventoryItemId : "9999"
                    }

                    delegator.create(delegator.makeValue("PicklistItem", [
                        picklistBinId: binId,
                        orderId: orderId,
                        orderItemSeqId: item.orderItemSeqId,
                        shipGroupSeqId: "00001",
                        inventoryItemId: invItemId,
                        itemStatusId: "PICKITEM_PENDING",
                        quantity: item.quantity ?: BigDecimal.ONE
                    ]))
                }
            } else {
                for (GenericValue sg : shipGroups) {
                    String binId = delegator.getNextSeqId("PicklistBin")
                    delegator.create(delegator.makeValue("PicklistBin", [
                        picklistBinId: binId,
                        picklistId: picklistId,
                        binLocationNumber: BigDecimal.valueOf(binLocationNumber++),
                        primaryOrderId: orderId,
                        primaryShipGroupSeqId: sg.shipGroupSeqId
                    ]))

                    // Find reservations for this ship group
                    List invResList = EntityQuery.use(delegator).from("OrderItemShipGrpInvRes")
                        .where("orderId", orderId, "shipGroupSeqId", sg.shipGroupSeqId)
                        .queryList()

                    if (!invResList.isEmpty()) {
                        for (GenericValue res : invResList) {
                            delegator.create(delegator.makeValue("PicklistItem", [
                                picklistBinId: binId,
                                orderId: orderId,
                                orderItemSeqId: res.orderItemSeqId,
                                shipGroupSeqId: sg.shipGroupSeqId,
                                inventoryItemId: res.inventoryItemId,
                                itemStatusId: "PICKITEM_PENDING",
                                quantity: res.quantity ?: BigDecimal.ONE
                            ]))
                        }
                    } else {
                        // Fallback to OrderItem
                        List items = EntityQuery.use(delegator).from("OrderItem")
                            .where("orderId", orderId, "statusId", "ITEM_APPROVED")
                            .queryList()
                        for (GenericValue item : items) {
                            GenericValue availInv = EntityQuery.use(delegator).from("InventoryItem")
                                .where("productId", item.productId, "facilityId", facilityId)
                                .queryFirst()
                            String invItemId = availInv ? availInv.inventoryItemId : "9999"

                            delegator.create(delegator.makeValue("PicklistItem", [
                                picklistBinId: binId,
                                orderId: orderId,
                                orderItemSeqId: item.orderItemSeqId,
                                shipGroupSeqId: sg.shipGroupSeqId,
                                inventoryItemId: invItemId,
                                itemStatusId: "PICKITEM_PENDING",
                                quantity: item.quantity ?: BigDecimal.ONE
                            ]))
                        }
                    }
                }
            }
        }

        Map responseData = [
            status: "success",
            message: "Picklist created successfully",
            picklistId: picklistId
        ]

        request.setAttribute("picklistResult", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPicklist: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 6. updatePicklistStatus
 * Advances or changes picklist status (INPUT -> ASSIGNED -> PRINTED -> PICKED, or CANCELLED).
 */
String updatePicklistStatus() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")

        String picklistId = params.picklistId
        String statusId = params.statusId

        if (UtilValidate.isEmpty(picklistId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("error", [status: "error", message: "picklistId and statusId are required"])
            return "error"
        }

        GenericValue picklist = EntityQuery.use(delegator).from("Picklist").where("picklistId", picklistId).queryOne()
        if (!picklist) {
            request.setAttribute("error", [status: "error", message: "Picklist not found: " + picklistId])
            return "error"
        }

        String oldStatusId = picklist.statusId
        Timestamp now = UtilDateTime.nowTimestamp()

        picklist.statusId = statusId
        picklist.lastModifiedDate = now
        picklist.lastModifiedByUserLogin = userLogin ? userLogin.userLoginId : "admin"
        picklist.store()

        // Status history
        GenericValue hist = delegator.makeValue("PicklistStatus", [
            picklistId: picklistId,
            statusDate: now,
            statusId: oldStatusId,
            statusIdTo: statusId,
            changeByUserLoginId: userLogin ? userLogin.userLoginId : "admin"
        ])
        delegator.create(hist)

        // If marked PICKED, set all items to COMPLETED
        if ("PICKLIST_PICKED".equals(statusId)) {
            List bins = EntityQuery.use(delegator).from("PicklistBin").where("picklistId", picklistId).queryList()
            List binIds = bins.collect { it.picklistBinId }
            if (!binIds.isEmpty()) {
                List items = EntityQuery.use(delegator).from("PicklistItem")
                    .where(EntityCondition.makeCondition("picklistBinId", EntityOperator.IN, binIds))
                    .queryList()
                for (GenericValue it : items) {
                    if (!"PICKITEM_COMPLETED".equals(it.itemStatusId) && !"PICKITEM_CANCELLED".equals(it.itemStatusId)) {
                        it.itemStatusId = "PICKITEM_COMPLETED"
                        it.store()
                    }
                }
            }
        }

        // If CANCELLED, set items to CANCELLED
        if ("PICKLIST_CANCELLED".equals(statusId)) {
            List bins = EntityQuery.use(delegator).from("PicklistBin").where("picklistId", picklistId).queryList()
            List binIds = bins.collect { it.picklistBinId }
            if (!binIds.isEmpty()) {
                List items = EntityQuery.use(delegator).from("PicklistItem")
                    .where(EntityCondition.makeCondition("picklistBinId", EntityOperator.IN, binIds))
                    .queryList()
                for (GenericValue it : items) {
                    it.itemStatusId = "PICKITEM_CANCELLED"
                    it.store()
                }
            }
        }

        Map responseData = [
            status: "success",
            message: "Picklist status updated to " + statusId,
            picklistId: picklistId,
            statusId: statusId
        ]

        request.setAttribute("picklistResult", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updatePicklistStatus: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 7. completePicklistItem
 * Completes picking for a single item line. If all items are completed, automatically advances picklist to PICKLIST_PICKED.
 */
String completePicklistItem() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String picklistBinId = params.picklistBinId
        String orderId = params.orderId
        String orderItemSeqId = params.orderItemSeqId
        String shipGroupSeqId = params.shipGroupSeqId
        String inventoryItemId = params.inventoryItemId

        if (UtilValidate.isEmpty(picklistBinId) || UtilValidate.isEmpty(orderId) || UtilValidate.isEmpty(orderItemSeqId)) {
            request.setAttribute("error", [status: "error", message: "Missing required picklist item keys"])
            return "error"
        }

        GenericValue item = EntityQuery.use(delegator).from("PicklistItem")
            .where([
                picklistBinId: picklistBinId,
                orderId: orderId,
                orderItemSeqId: orderItemSeqId,
                shipGroupSeqId: shipGroupSeqId ?: "00001",
                inventoryItemId: inventoryItemId ?: "9999"
            ])
            .queryOne()

        if (!item) {
            // Try query without inventoryItemId if not exact
            item = EntityQuery.use(delegator).from("PicklistItem")
                .where([
                    picklistBinId: picklistBinId,
                    orderId: orderId,
                    orderItemSeqId: orderItemSeqId,
                    shipGroupSeqId: shipGroupSeqId ?: "00001"
                ])
                .queryFirst()
        }

        if (item) {
            item.itemStatusId = "PICKITEM_COMPLETED"
            item.store()

            // Check if all items for the picklist are completed
            GenericValue bin = EntityQuery.use(delegator).from("PicklistBin").where("picklistBinId", picklistBinId).queryOne()
            if (bin) {
                String pid = bin.picklistId
                List allBins = EntityQuery.use(delegator).from("PicklistBin").where("picklistId", pid).queryList()
                List allBinIds = allBins.collect { it.picklistBinId }

                long uncompletedCount = EntityQuery.use(delegator).from("PicklistItem")
                    .where(EntityCondition.makeCondition([
                        EntityCondition.makeCondition("picklistBinId", EntityOperator.IN, allBinIds),
                        EntityCondition.makeCondition("itemStatusId", EntityOperator.NOT_EQUAL, "PICKITEM_COMPLETED"),
                        EntityCondition.makeCondition("itemStatusId", EntityOperator.NOT_EQUAL, "PICKITEM_CANCELLED")
                    ], EntityOperator.AND))
                    .queryCount()

                if (uncompletedCount == 0) {
                    GenericValue p = EntityQuery.use(delegator).from("Picklist").where("picklistId", pid).queryOne()
                    if (p && !"PICKLIST_PICKED".equals(p.statusId) && !"PICKLIST_CANCELLED".equals(p.statusId)) {
                        String oldSt = p.statusId
                        p.statusId = "PICKLIST_PICKED"
                        p.lastModifiedDate = UtilDateTime.nowTimestamp()
                        p.store()

                        delegator.create(delegator.makeValue("PicklistStatus", [
                            picklistId: pid,
                            statusDate: UtilDateTime.nowTimestamp(),
                            statusId: oldSt,
                            statusIdTo: "PICKLIST_PICKED",
                            changeByUserLoginId: "admin"
                        ]))
                    }
                }
            }
        }

        Map responseData = [
            status: "success",
            message: "Item marked as completed"
        ]

        request.setAttribute("picklistResult", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in completePicklistItem: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 8. findLots
 * Lists lot entries with search, expiring count, and active stock aggregated from InventoryItem.
 */
String findLots() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String search = params.search

        int viewIndex = 0
        int viewSize = 25
        try {
            if (params.viewIndex) viewIndex = Integer.parseInt(params.viewIndex.toString())
            if (params.viewSize) viewSize = Integer.parseInt(params.viewSize.toString())
        } catch (NumberFormatException ignored) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(search)) {
            String s = "%" + search.trim() + "%"
            conditions.add(EntityCondition.makeCondition(EntityFunction.upperField("lotId"), EntityOperator.LIKE, EntityFunction.upper(s)))
        }

        def lotQuery = EntityQuery.use(delegator).from("Lot")
        if (!conditions.isEmpty()) {
            lotQuery = lotQuery.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List lotList = lotQuery
            .orderBy("creationDate DESC", "lotId ASC")
            .offset(viewIndex * viewSize)
            .maxRows(viewSize)
            .queryList()

        def lotCountQuery = EntityQuery.use(delegator).from("Lot")
        if (!conditions.isEmpty()) {
            lotCountQuery = lotCountQuery.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        long totalCount = lotCountQuery.queryCount()

        // Expiring threshold (30 days from now)
        Timestamp now = UtilDateTime.nowTimestamp()
        Timestamp thirtyDaysLater = new Timestamp(now.getTime() + (30L * 24L * 60L * 60L * 1000L))

        long expiringCount = EntityQuery.use(delegator).from("Lot")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("expirationDate", EntityOperator.GREATER_THAN_EQUAL_TO, now),
                EntityCondition.makeCondition("expirationDate", EntityOperator.LESS_THAN_EQUAL_TO, thirtyDaysLater)
            ], EntityOperator.AND))
            .queryCount()

        List resultLots = []
        for (GenericValue l : lotList) {
            String lid = l.lotId

            // Query inventory items referencing this lot
            List invItems = EntityQuery.use(delegator).from("InventoryItem")
                .where("lotId", lid)
                .queryList()

            double totalQoh = 0.0
            double totalAtp = 0.0
            Set products = new HashSet()

            for (GenericValue ii : invItems) {
                totalQoh += (ii.quantityOnHandTotal ? ii.quantityOnHandTotal.doubleValue() : 0.0)
                totalAtp += (ii.availableToPromiseTotal ? ii.availableToPromiseTotal.doubleValue() : 0.0)
                if (ii.productId) products.add(ii.productId)
            }

            resultLots.add([
                lotId: lid,
                creationDate: l.creationDate ? l.creationDate.toString() : "",
                expirationDate: l.expirationDate ? l.expirationDate.toString() : "",
                quantity: l.quantity ? l.quantity.doubleValue() : 0.0,
                totalQoh: totalQoh,
                totalAtp: totalAtp,
                itemCount: invItems.size(),
                productCount: products.size()
            ])
        }

        Map responseData = [
            status: "success",
            lots: resultLots,
            totalCount: totalCount,
            viewIndex: viewIndex,
            viewSize: viewSize,
            metrics: [
                totalLots: totalCount,
                expiringCount: expiringCount
            ]
        ]

        request.setAttribute("lotData", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findLots: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 9. createLot
 * Creates a new Lot record.
 */
String createLot() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String lotId = params.lotId
        if (UtilValidate.isEmpty(lotId)) {
            lotId = "LOT-" + System.currentTimeMillis().toString().substring(6)
        }

        // Check uniqueness
        GenericValue existing = EntityQuery.use(delegator).from("Lot").where("lotId", lotId).queryOne()
        if (existing) {
            request.setAttribute("error", [status: "error", message: "Lot ID already exists: " + lotId])
            return "error"
        }

        Timestamp now = UtilDateTime.nowTimestamp()
        Timestamp expDate = null
        if (UtilValidate.isNotEmpty(params.expirationDate)) {
            try {
                if (params.expirationDate.toString().length() == 10) {
                    expDate = Timestamp.valueOf(params.expirationDate.toString() + " 23:59:59.0")
                } else {
                    expDate = Timestamp.valueOf(params.expirationDate.toString())
                }
            } catch (Exception ignore) {
                expDate = new Timestamp(System.currentTimeMillis() + (365L * 24L * 60L * 60L * 1000L))
            }
        }

        BigDecimal qty = BigDecimal.ZERO
        if (UtilValidate.isNotEmpty(params.quantity)) {
            try {
                qty = new BigDecimal(params.quantity.toString())
            } catch (Exception ignore) {}
        }

        GenericValue lot = delegator.makeValue("Lot", [
            lotId: lotId,
            creationDate: now,
            expirationDate: expDate,
            quantity: qty
        ])
        delegator.create(lot)

        Map responseData = [
            status: "success",
            message: "Lot created successfully",
            lotId: lotId
        ]

        request.setAttribute("lotResult", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createLot: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 10. getInventoryItemHistory
 * Returns detailed transaction history (audit trail) from InventoryItemDetail for a given inventoryItemId.
 */
String getInventoryItemHistory() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String inventoryItemId = params.inventoryItemId

        if (UtilValidate.isEmpty(inventoryItemId)) {
            request.setAttribute("error", [status: "error", message: "inventoryItemId is required"])
            return "error"
        }

        GenericValue item = EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", inventoryItemId).queryOne()
        if (!item) {
            request.setAttribute("error", [status: "error", message: "InventoryItem not found: " + inventoryItemId])
            return "error"
        }

        // Product info
        String productName = item.productId ?: ""
        if (item.productId) {
            GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", item.productId).queryOne()
            if (prod && prod.internalName) productName = prod.internalName
        }

        List detailList = EntityQuery.use(delegator).from("InventoryItemDetail")
            .where("inventoryItemId", inventoryItemId)
            .orderBy("effectiveDate DESC", "inventoryItemDetailSeqId DESC")
            .queryList()

        List history = []
        for (GenericValue d : detailList) {
            history.add([
                inventoryItemDetailSeqId: d.inventoryItemDetailSeqId,
                effectiveDate: d.effectiveDate ? d.effectiveDate.toString() : "",
                quantityOnHandDiff: d.quantityOnHandDiff ? d.quantityOnHandDiff.doubleValue() : 0.0,
                availableToPromiseDiff: d.availableToPromiseDiff ? d.availableToPromiseDiff.doubleValue() : 0.0,
                unitCost: d.unitCost ? d.unitCost.doubleValue() : null,
                orderId: d.orderId ?: "",
                orderItemSeqId: d.orderItemSeqId ?: "",
                shipmentId: d.shipmentId ?: "",
                workEffortId: d.workEffortId ?: "",
                receiptId: d.receiptId ?: "",
                physicalInventoryId: d.physicalInventoryId ?: "",
                description: d.description ?: ""
            ])
        }

        Map responseData = [
            status: "success",
            item: [
                inventoryItemId: item.inventoryItemId,
                productId: item.productId,
                productName: productName,
                facilityId: item.facilityId,
                locationSeqId: item.locationSeqId ?: "",
                lotId: item.lotId ?: "",
                serialNumber: item.serialNumber ?: "",
                quantityOnHandTotal: item.quantityOnHandTotal ? item.quantityOnHandTotal.doubleValue() : 0.0,
                availableToPromiseTotal: item.availableToPromiseTotal ? item.availableToPromiseTotal.doubleValue() : 0.0,
                expireDate: item.expireDate ? item.expireDate.toString() : ""
            ],
            history: history
        ]

        request.setAttribute("inventoryItemHistory", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getInventoryItemHistory: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}

/**
 * 11. updateInventoryItemTracking
 * Updates lotId, serialNumber, expireDate or locationSeqId on an existing InventoryItem.
 */
String updateInventoryItemTracking() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getCombinedMap(request)
        String inventoryItemId = params.inventoryItemId

        if (UtilValidate.isEmpty(inventoryItemId)) {
            request.setAttribute("error", [status: "error", message: "inventoryItemId is required"])
            return "error"
        }

        GenericValue item = EntityQuery.use(delegator).from("InventoryItem").where("inventoryItemId", inventoryItemId).queryOne()
        if (!item) {
            request.setAttribute("error", [status: "error", message: "InventoryItem not found: " + inventoryItemId])
            return "error"
        }

        if (params.lotId != null) item.lotId = params.lotId
        if (params.serialNumber != null) item.serialNumber = params.serialNumber
        if (params.locationSeqId != null) item.locationSeqId = params.locationSeqId

        if (UtilValidate.isNotEmpty(params.expireDate)) {
            try {
                if (params.expireDate.toString().length() == 10) {
                    item.expireDate = Timestamp.valueOf(params.expireDate.toString() + " 23:59:59.0")
                } else {
                    item.expireDate = Timestamp.valueOf(params.expireDate.toString())
                }
            } catch (Exception ignore) {}
        }

        item.store()

        Map responseData = [
            status: "success",
            message: "Inventory item tracking updated successfully",
            inventoryItemId: inventoryItemId
        ]

        request.setAttribute("inventoryItemResult", responseData)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateInventoryItemTracking: " + e.getMessage(), MODULE)
        request.setAttribute("error", [status: "error", message: e.getMessage()])
        return "error"
    }
}
