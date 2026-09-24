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

final String MODULE = "ShipmentEvents.groovy"

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
 * Sevkiyat ve İrsaliye Metadata (Tipler, Durumlar, Depolar, Taşıyıcılar)
 */
String getShipmentMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Sevkiyat Tipleri
        List<Map<String, Object>> types = EntityQuery.use(delegator)
            .from("ShipmentType")
            .orderBy("shipmentTypeId")
            .queryList()
            .collect {
                [
                    shipmentTypeId: it.getString("shipmentTypeId"),
                    description: it.getString("description") ?: it.getString("shipmentTypeId")
                ]
            }

        // Sevkiyat Durumları (Giden ve Gelen)
        List<String> statusTypeIds = ["SHIPMENT_STATUS", "PURCH_SHIP_STATUS"]
        List<Map<String, Object>> statuses = EntityQuery.use(delegator)
            .from("StatusItem")
            .where(EntityCondition.makeCondition("statusTypeId", EntityOperator.IN, statusTypeIds))
            .orderBy("sequenceId")
            .queryList()
            .collect {
                [
                    statusId: it.getString("statusId"),
                    description: it.getString("description") ?: it.getString("statusId"),
                    statusTypeId: it.getString("statusTypeId")
                ]
            }

        // Tesisler / Depolar
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

        // Taraflar (Müşteri & Tedarikçi)
        List<GenericValue> parties = EntityQuery.use(delegator)
            .from("PartyNameView")
            .maxRows(200)
            .queryList()

        List<Map<String, Object>> partyList = parties.collect {
            String pName = (it.getString("groupName") ?: "") ?: ((it.getString("firstName") ?: "") + " " + (it.getString("lastName") ?: "")).trim()
            [
                partyId: it.getString("partyId"),
                name: pName ?: it.getString("partyId")
            ]
        }

        // Taşıyıcılar (Carriers)
        List<Map<String, Object>> carriers = [
            [carrierPartyId: "UPS", carrierName: "UPS Cargo"],
            [carrierPartyId: "DHL", carrierName: "DHL Express"],
            [carrierPartyId: "FEDEX", carrierName: "FedEx"],
            [carrierPartyId: "USPS", carrierName: "USPS Postal"],
            [carrierPartyId: "YURTICI", carrierName: "Yurtiçi Kargo"],
            [carrierPartyId: "ARAS", carrierName: "Aras Kargo"],
            [carrierPartyId: "MNG", carrierName: "MNG Kargo"],
            [carrierPartyId: "PTT", carrierName: "PTT Kargo"],
            [carrierPartyId: "_NA_", carrierName: "Özel Araç / Mağaza Teslim"]
        ]

        request.setAttribute("shipmentTypes", types)
        request.setAttribute("shipmentStatuses", statuses)
        request.setAttribute("facilities", facilities)
        request.setAttribute("parties", partyList)
        request.setAttribute("carriers", carriers)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getShipmentMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Sevkiyat / İrsaliye Listeleme, Arama, Filtreleme ve KPI Hesaplama
 */
String findShipments() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String shipmentTypeId = (String) params.get("shipmentTypeId")
        String statusId = (String) params.get("statusId")
        String primaryOrderId = (String) params.get("primaryOrderId")
        String searchKeyword = (String) params.get("searchKeyword")
        String originFacilityId = (String) params.get("originFacilityId")
        String destinationFacilityId = (String) params.get("destinationFacilityId")
        String fromDateStr = (String) params.get("fromDate")
        String thruDateStr = (String) params.get("thruDate")

        int viewIndex = 0
        int viewSize = 25
        try {
            if (params.get("viewIndex") != null) viewIndex = Integer.parseInt(params.get("viewIndex").toString())
            if (params.get("viewSize") != null) viewSize = Integer.parseInt(params.get("viewSize").toString())
        } catch (NumberFormatException ignored) {}

        List<EntityCondition> condList = []

        if (UtilValidate.isNotEmpty(shipmentTypeId)) {
            condList.add(EntityCondition.makeCondition("shipmentTypeId", EntityOperator.EQUALS, shipmentTypeId))
        }
        if (UtilValidate.isNotEmpty(statusId)) {
            condList.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(primaryOrderId)) {
            condList.add(EntityCondition.makeCondition("primaryOrderId", EntityOperator.EQUALS, primaryOrderId))
        }
        if (UtilValidate.isNotEmpty(originFacilityId)) {
            condList.add(EntityCondition.makeCondition("originFacilityId", EntityOperator.EQUALS, originFacilityId))
        }
        if (UtilValidate.isNotEmpty(destinationFacilityId)) {
            condList.add(EntityCondition.makeCondition("destinationFacilityId", EntityOperator.EQUALS, destinationFacilityId))
        }

        Timestamp fromDate = parseTimestamp(fromDateStr)
        if (fromDate) {
            condList.add(EntityCondition.makeCondition("estimatedShipDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        Timestamp thruDate = parseTimestamp(thruDateStr)
        if (thruDate) {
            condList.add(EntityCondition.makeCondition("estimatedShipDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }

        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim().toLowerCase() + "%"
            condList.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.upperField("shipmentId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("primaryOrderId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("partyIdFrom"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("partyIdTo"), EntityOperator.LIKE, kw.toUpperCase())
            ], EntityOperator.OR))
        }

        // Descriptions map
        Map<String, String> statusMap = EntityQuery.use(delegator)
            .from("StatusItem")
            .queryList()
            .collectEntries { [(it.statusId): it.description ?: it.statusId] }

        Map<String, String> typeMap = EntityQuery.use(delegator)
            .from("ShipmentType")
            .queryList()
            .collectEntries { [(it.shipmentTypeId): it.description ?: it.shipmentTypeId] }

        Map<String, String> facilityMap = EntityQuery.use(delegator)
            .from("Facility")
            .queryList()
            .collectEntries { [(it.facilityId): it.facilityName ?: it.facilityId] }

        // Query execution
        def query = EntityQuery.use(delegator).from("Shipment")
        if (!condList.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(condList, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        List<GenericValue> shipments = query
            .orderBy("-createdStamp")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List<Map<String, Object>> shipmentList = []
        for (GenericValue s : shipments) {
            String sId = s.getString("shipmentId")
            String sTypeId = s.getString("shipmentTypeId")
            String stId = s.getString("statusId")

            // Count items
            long itemCount = EntityQuery.use(delegator)
                .from("ShipmentItem")
                .where("shipmentId", sId)
                .queryCount()

            // Route / tracking info
            GenericValue routeSeg = EntityQuery.use(delegator)
                .from("ShipmentRouteSegment")
                .where("shipmentId", sId)
                .orderBy("shipmentRouteSegmentId")
                .queryFirst()

            shipmentList.add([
                shipmentId: sId,
                shipmentTypeId: sTypeId,
                shipmentTypeDesc: typeMap.get(sTypeId) ?: sTypeId,
                statusId: stId,
                statusDesc: statusMap.get(stId) ?: stId,
                primaryOrderId: s.getString("primaryOrderId"),
                partyIdFrom: s.getString("partyIdFrom"),
                partyIdTo: s.getString("partyIdTo"),
                originFacilityId: s.getString("originFacilityId"),
                originFacilityName: facilityMap.get(s.getString("originFacilityId")) ?: s.getString("originFacilityId"),
                destinationFacilityId: s.getString("destinationFacilityId"),
                destinationFacilityName: facilityMap.get(s.getString("destinationFacilityId")) ?: s.getString("destinationFacilityId"),
                estimatedShipDate: s.getTimestamp("estimatedShipDate")?.toString(),
                estimatedArrivalDate: s.getTimestamp("estimatedArrivalDate")?.toString(),
                createdDate: s.getTimestamp("createdDate")?.toString() ?: s.getTimestamp("createdStamp")?.toString(),
                itemCount: itemCount,
                carrierPartyId: routeSeg?.getString("carrierPartyId") ?: "",
                trackingIdNumber: routeSeg?.getString("trackingIdNumber") ?: ""
            ])
        }

        // Calculate KPIs
        long totalShipments = EntityQuery.use(delegator).from("Shipment").queryCount()
        long salesShipments = EntityQuery.use(delegator).from("Shipment").where("shipmentTypeId", "SALES_SHIPMENT").queryCount()
        long purchaseShipments = EntityQuery.use(delegator).from("Shipment").where("shipmentTypeId", "PURCHASE_SHIPMENT").queryCount()
        
        List<String> inTransitStatuses = ["SHIPMENT_SHIPPED", "PURCH_SHIP_SHIPPED"]
        long inTransitCount = EntityQuery.use(delegator).from("Shipment")
            .where(EntityCondition.makeCondition("statusId", EntityOperator.IN, inTransitStatuses))
            .queryCount()

        List<String> deliveredStatuses = ["SHIPMENT_DELIVERED", "PURCH_SHIP_RECEIVED"]
        long deliveredCount = EntityQuery.use(delegator).from("Shipment")
            .where(EntityCondition.makeCondition("statusId", EntityOperator.IN, deliveredStatuses))
            .queryCount()

        List<String> pendingStatuses = ["SHIPMENT_INPUT", "SHIPMENT_SCHEDULED", "SHIPMENT_PICKED", "SHIPMENT_PACKED", "PURCH_SHIP_CREATED"]
        long pendingCount = EntityQuery.use(delegator).from("Shipment")
            .where(EntityCondition.makeCondition("statusId", EntityOperator.IN, pendingStatuses))
            .queryCount()

        Map<String, Object> kpis = [
            totalShipments: totalShipments,
            salesShipments: salesShipments,
            purchaseShipments: purchaseShipments,
            inTransitCount: inTransitCount,
            deliveredCount: deliveredCount,
            pendingCount: pendingCount
        ]

        request.setAttribute("shipments", shipmentList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("kpis", kpis)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findShipments: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Sevkiyat Detayı, Kalemler, Rota ve Mal Kabul Bilgileri
 */
String getShipmentDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String shipmentId = (String) params.get("shipmentId")
        if (UtilValidate.isEmpty(shipmentId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sevkiyat Kodu (shipmentId) zorunludur.")
            return "error"
        }

        GenericValue shipment = EntityQuery.use(delegator).from("Shipment").where("shipmentId", shipmentId).queryOne()
        if (!shipment) {
            request.setAttribute("_ERROR_MESSAGE_", "Sevkiyat bulunamadı: " + shipmentId)
            return "error"
        }

        Map<String, String> statusMap = EntityQuery.use(delegator)
            .from("StatusItem")
            .queryList()
            .collectEntries { [(it.statusId): it.description ?: it.statusId] }

        Map<String, String> typeMap = EntityQuery.use(delegator)
            .from("ShipmentType")
            .queryList()
            .collectEntries { [(it.shipmentTypeId): it.description ?: it.shipmentTypeId] }

        Map<String, String> facilityMap = EntityQuery.use(delegator)
            .from("Facility")
            .queryList()
            .collectEntries { [(it.facilityId): it.facilityName ?: it.facilityId] }

        // Items
        List<GenericValue> shipmentItems = EntityQuery.use(delegator)
            .from("ShipmentItem")
            .where("shipmentId", shipmentId)
            .orderBy("shipmentItemSeqId")
            .queryList()

        List<Map<String, Object>> itemList = []
        for (GenericValue item : shipmentItems) {
            String pId = item.getString("productId")
            GenericValue prod = pId ? EntityQuery.use(delegator).from("Product").where("productId", pId).queryOne() : null
            itemList.add([
                shipmentItemSeqId: item.getString("shipmentItemSeqId"),
                productId: pId,
                productName: prod?.getString("productName") ?: prod?.getString("internalName") ?: pId,
                quantity: item.getBigDecimal("quantity") ?: BigDecimal.ZERO
            ])
        }

        // Route Segments
        List<GenericValue> routes = EntityQuery.use(delegator)
            .from("ShipmentRouteSegment")
            .where("shipmentId", shipmentId)
            .orderBy("shipmentRouteSegmentId")
            .queryList()

        List<Map<String, Object>> routeList = routes.collect {
            [
                shipmentRouteSegmentId: it.getString("shipmentRouteSegmentId"),
                carrierPartyId: it.getString("carrierPartyId"),
                carrierServiceCode: it.getString("carrierServiceCode"),
                shipmentMethodTypeId: it.getString("shipmentMethodTypeId"),
                trackingIdNumber: it.getString("trackingIdNumber"),
                actualStartDate: it.getTimestamp("actualStartDate")?.toString(),
                actualArrivalDate: it.getTimestamp("actualArrivalDate")?.toString(),
                actualCost: it.getBigDecimal("actualCost") ?: BigDecimal.ZERO
            ]
        }

        // Receipts (Mal Kabul Kayıtları)
        List<GenericValue> receipts = EntityQuery.use(delegator)
            .from("ShipmentReceipt")
            .where("shipmentId", shipmentId)
            .orderBy("-datetimeReceived")
            .queryList()

        List<Map<String, Object>> receiptList = receipts.collect {
            [
                receiptId: it.getString("receiptId"),
                productId: it.getString("productId"),
                orderId: it.getString("orderId"),
                orderItemSeqId: it.getString("orderItemSeqId"),
                inventoryItemId: it.getString("inventoryItemId"),
                quantityAccepted: it.getBigDecimal("quantityAccepted") ?: BigDecimal.ZERO,
                quantityRejected: it.getBigDecimal("quantityRejected") ?: BigDecimal.ZERO,
                datetimeReceived: it.getTimestamp("datetimeReceived")?.toString()
            ]
        }

        Map<String, Object> header = [
            shipmentId: shipment.getString("shipmentId"),
            shipmentTypeId: shipment.getString("shipmentTypeId"),
            shipmentTypeDesc: typeMap.get(shipment.getString("shipmentTypeId")) ?: shipment.getString("shipmentTypeId"),
            statusId: shipment.getString("statusId"),
            statusDesc: statusMap.get(shipment.getString("statusId")) ?: shipment.getString("statusId"),
            primaryOrderId: shipment.getString("primaryOrderId"),
            partyIdFrom: shipment.getString("partyIdFrom"),
            partyIdTo: shipment.getString("partyIdTo"),
            originFacilityId: shipment.getString("originFacilityId"),
            originFacilityName: facilityMap.get(shipment.getString("originFacilityId")) ?: shipment.getString("originFacilityId"),
            destinationFacilityId: shipment.getString("destinationFacilityId"),
            destinationFacilityName: facilityMap.get(shipment.getString("destinationFacilityId")) ?: shipment.getString("destinationFacilityId"),
            estimatedShipDate: shipment.getTimestamp("estimatedShipDate")?.toString(),
            estimatedArrivalDate: shipment.getTimestamp("estimatedArrivalDate")?.toString(),
            handlingInstructions: shipment.getString("handlingInstructions"),
            createdDate: shipment.getTimestamp("createdDate")?.toString() ?: shipment.getTimestamp("createdStamp")?.toString()
        ]

        request.setAttribute("shipmentHeader", header)
        request.setAttribute("shipmentItems", itemList)
        request.setAttribute("shipmentRoutes", routeList)
        request.setAttribute("shipmentReceipts", receiptList)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getShipmentDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni İrsaliye / Sevkiyat Oluşturma
 */
String createShipment() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String shipmentTypeId = (String) params.get("shipmentTypeId") ?: "SALES_SHIPMENT"
        String primaryOrderId = (String) params.get("primaryOrderId")
        String partyIdFrom = (String) params.get("partyIdFrom")
        String partyIdTo = (String) params.get("partyIdTo")
        String originFacilityId = (String) params.get("originFacilityId")
        String destinationFacilityId = (String) params.get("destinationFacilityId")
        String handlingInstructions = (String) params.get("handlingInstructions")
        String carrierPartyId = (String) params.get("carrierPartyId")
        String trackingIdNumber = (String) params.get("trackingIdNumber")

        boolean isPurchase = "PURCHASE_SHIPMENT".equals(shipmentTypeId)
        String initialStatus = isPurchase ? "PURCH_SHIP_CREATED" : "SHIPMENT_INPUT"

        Map<String, Object> createCtx = [
            shipmentTypeId: shipmentTypeId,
            statusId: initialStatus,
            primaryOrderId: primaryOrderId ?: null,
            partyIdFrom: partyIdFrom ?: (isPurchase ? "DemoSupplier" : "Company"),
            partyIdTo: partyIdTo ?: (isPurchase ? "Company" : "DemoCustomer"),
            originFacilityId: originFacilityId ?: null,
            destinationFacilityId: destinationFacilityId ?: null,
            handlingInstructions: handlingInstructions ?: null,
            estimatedShipDate: parseTimestamp(params.get("estimatedShipDate")) ?: UtilDateTime.nowTimestamp(),
            estimatedArrivalDate: parseTimestamp(params.get("estimatedArrivalDate")),
            userLogin: userLogin
        ]

        Map<String, Object> sRes = dispatcher.runSync("createShipment", createCtx)
        if (ServiceUtil.isError(sRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(sRes))
            return "error"
        }

        String shipmentId = (String) sRes.get("shipmentId")

        // Items parse
        String itemsJson = (String) params.get("items")
        if (UtilValidate.isNotEmpty(itemsJson)) {
            def parsed = new JsonSlurper().parseText(itemsJson)
            if (parsed instanceof List) {
                for (item in parsed) {
                    String pId = item.productId
                    BigDecimal qty = item.quantity != null ? new BigDecimal(item.quantity.toString()) : BigDecimal.ONE
                    if (pId && qty.compareTo(BigDecimal.ZERO) > 0) {
                        dispatcher.runSync("createShipmentItem", [
                            shipmentId: shipmentId,
                            productId: pId,
                            quantity: qty,
                            userLogin: userLogin
                        ])
                    }
                }
            }
        }

        // Route segment if carrier provided
        if (UtilValidate.isNotEmpty(carrierPartyId) || UtilValidate.isNotEmpty(trackingIdNumber)) {
            dispatcher.runSync("createShipmentRouteSegment", [
                shipmentId: shipmentId,
                carrierPartyId: carrierPartyId ?: "_NA_",
                shipmentMethodTypeId: "STANDARD",
                trackingIdNumber: trackingIdNumber ?: null,
                userLogin: userLogin
            ])
        }

        request.setAttribute("shipmentId", shipmentId)
        request.setAttribute("successMessage", "Sevkiyat (" + shipmentId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createShipment: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Sevkiyat Durumu Güncelleme (Sevk Edildi, Teslim Alındı, İptal vb.)
 */
String updateShipmentStatus() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String shipmentId = (String) params.get("shipmentId")
        String statusId = (String) params.get("statusId")

        if (UtilValidate.isEmpty(shipmentId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sevkiyat Kodu ve yeni Durum zorunludur.")
            return "error"
        }

        GenericValue shipment = EntityQuery.use(delegator).from("Shipment").where("shipmentId", shipmentId).queryOne()
        if (!shipment) {
            request.setAttribute("_ERROR_MESSAGE_", "Sevkiyat bulunamadı: " + shipmentId)
            return "error"
        }

        Map<String, Object> updateCtx = [
            shipmentId: shipmentId,
            statusId: statusId,
            userLogin: userLogin
        ]

        Map<String, Object> res = dispatcher.runSync("updateShipment", updateCtx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("shipmentId", shipmentId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("successMessage", "Sevkiyat durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateShipmentStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Taşıyıcı ve Takip Numarası Güncelleme
 */
String updateShipmentRoute() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String shipmentId = (String) params.get("shipmentId")
        String carrierPartyId = (String) params.get("carrierPartyId")
        String trackingIdNumber = (String) params.get("trackingIdNumber")
        String carrierServiceCode = (String) params.get("carrierServiceCode")

        if (UtilValidate.isEmpty(shipmentId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sevkiyat Kodu zorunludur.")
            return "error"
        }

        GenericValue existingRoute = EntityQuery.use(delegator)
            .from("ShipmentRouteSegment")
            .where("shipmentId", shipmentId)
            .orderBy("shipmentRouteSegmentId")
            .queryFirst()

        if (existingRoute) {
            String routeId = existingRoute.getString("shipmentRouteSegmentId")
            dispatcher.runSync("updateShipmentRouteSegment", [
                shipmentId: shipmentId,
                shipmentRouteSegmentId: routeId,
                carrierPartyId: carrierPartyId ?: existingRoute.getString("carrierPartyId"),
                trackingIdNumber: trackingIdNumber ?: existingRoute.getString("trackingIdNumber"),
                carrierServiceCode: carrierServiceCode ?: existingRoute.getString("carrierServiceCode"),
                userLogin: userLogin
            ])
        } else {
            dispatcher.runSync("createShipmentRouteSegment", [
                shipmentId: shipmentId,
                carrierPartyId: carrierPartyId ?: "_NA_",
                trackingIdNumber: trackingIdNumber ?: null,
                carrierServiceCode: carrierServiceCode ?: null,
                shipmentMethodTypeId: "STANDARD",
                userLogin: userLogin
            ])
        }

        request.setAttribute("shipmentId", shipmentId)
        request.setAttribute("successMessage", "Taşıyıcı ve takip bilgisi kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateShipmentRoute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Satın Alma Siparişini Depoya Mal Kabul Etme (Inbound Receiving / PO Receipt)
 * Her sipariş kalemi için receiveInventoryProduct servisi çalıştırılır.
 */
String receivePOInventory() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String orderId = (String) params.get("orderId")
        String facilityId = (String) params.get("facilityId")
        String locationSeqId = (String) params.get("locationSeqId")
        String comments = (String) params.get("comments")
        String itemsJson = (String) params.get("items")

        if (UtilValidate.isEmpty(orderId) || UtilValidate.isEmpty(facilityId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş Kodu ve Depo (Tesis) seçimi zorunludur.")
            return "error"
        }

        GenericValue order = EntityQuery.use(delegator).from("OrderHeader").where("orderId", orderId).queryOne()
        if (!order) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş bulunamadı: " + orderId)
            return "error"
        }

        if (UtilValidate.isEmpty(itemsJson)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kabul edilecek en az bir ürün kalemi belirtilmelidir.")
            return "error"
        }

        def parsedItems = new JsonSlurper().parseText(itemsJson)
        if (!(parsedItems instanceof List) || parsedItems.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "Ürün kalem listesi geçersiz.")
            return "error"
        }

        List<String> createdReceiptIds = []
        Timestamp now = UtilDateTime.nowTimestamp()

        for (item in parsedItems) {
            String pId = (String) item.productId
            String oItemSeqId = (String) item.orderItemSeqId
            BigDecimal qtyAccepted = item.quantityAccepted != null ? new BigDecimal(item.quantityAccepted.toString()) : BigDecimal.ZERO
            BigDecimal qtyRejected = item.quantityRejected != null ? new BigDecimal(item.quantityRejected.toString()) : BigDecimal.ZERO

            if (qtyAccepted.compareTo(BigDecimal.ZERO) <= 0 && qtyRejected.compareTo(BigDecimal.ZERO) <= 0) {
                continue
            }

            // Get unit price from order item
            GenericValue oItem = EntityQuery.use(delegator)
                .from("OrderItem")
                .where("orderId", orderId, "orderItemSeqId", oItemSeqId)
                .queryOne()
            BigDecimal unitPrice = oItem?.getBigDecimal("unitPrice") ?: BigDecimal.ZERO

            Map<String, Object> recvCtx = [
                productId: pId,
                facilityId: facilityId,
                locationSeqId: locationSeqId ?: null,
                quantityAccepted: qtyAccepted,
                quantityRejected: qtyRejected,
                inventoryItemTypeId: "NON_SERIAL_INV_ITEM",
                orderId: orderId,
                orderItemSeqId: oItemSeqId,
                unitCost: unitPrice,
                datetimeReceived: now,
                comments: comments ?: ("Sipariş " + orderId + " mal kabulü"),
                userLogin: userLogin
            ]

            Map<String, Object> rRes = dispatcher.runSync("receiveInventoryProduct", recvCtx)
            if (ServiceUtil.isError(rRes)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(rRes))
                return "error"
            }
            if (rRes.get("receiptId")) {
                createdReceiptIds.add((String) rRes.get("receiptId"))
            }
        }

        // Check if all items received and complete order if so
        List<GenericValue> allItems = EntityQuery.use(delegator).from("OrderItem").where("orderId", orderId).queryList()
        boolean allCompleted = true
        for (GenericValue oIt : allItems) {
            BigDecimal ordQty = oIt.getBigDecimal("quantity") ?: BigDecimal.ZERO
            BigDecimal canQty = oIt.getBigDecimal("cancelQuantity") ?: BigDecimal.ZERO
            BigDecimal netOrd = ordQty.subtract(canQty)

            // Sum receipts
            List<GenericValue> itemReceipts = EntityQuery.use(delegator)
                .from("ShipmentReceipt")
                .where("orderId", orderId, "orderItemSeqId", oIt.getString("orderItemSeqId"))
                .queryList()

            BigDecimal totalRecv = BigDecimal.ZERO
            for (GenericValue rc : itemReceipts) {
                totalRecv = totalRecv.add(rc.getBigDecimal("quantityAccepted") ?: BigDecimal.ZERO)
            }

            if (totalRecv.compareTo(netOrd) < 0) {
                allCompleted = false
                break
            }
        }

        if (allCompleted) {
            dispatcher.runSync("changeOrderStatus", [
                orderId: orderId,
                statusId: "ORDER_COMPLETED",
                setItemStatus: "Y",
                userLogin: userLogin
            ])
        }

        request.setAttribute("orderId", orderId)
        request.setAttribute("receiptCount", createdReceiptIds.size())
        request.setAttribute("successMessage", "Mal kabul başarıyla gerçekleştirildi. Depo stokları güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in receivePOInventory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Satış Siparişini Hızlıca Sevk Etme ve Stoktan Düşme (Quick Ship Sales Order)
 */
String quickShipOrder() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String orderId = (String) params.get("orderId")
        String originFacilityId = (String) params.get("originFacilityId")

        if (UtilValidate.isEmpty(orderId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş Kodu zorunludur.")
            return "error"
        }

        GenericValue order = EntityQuery.use(delegator).from("OrderHeader").where("orderId", orderId).queryOne()
        if (!order) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş bulunamadı: " + orderId)
            return "error"
        }

        // If order is still in CREATED status, approve it first
        if ("ORDER_CREATED".equals(order.getString("statusId"))) {
            dispatcher.runSync("changeOrderStatus", [
                orderId: orderId,
                statusId: "ORDER_APPROVED",
                setItemStatus: "Y",
                userLogin: userLogin
            ])
        }

        Map<String, Object> shipCtx = [
            orderId: orderId,
            originFacilityId: originFacilityId ?: order.getString("originFacilityId"),
            eventDate: UtilDateTime.nowTimestamp(),
            userLogin: userLogin
        ]

        Map<String, Object> shipRes = dispatcher.runSync("quickShipEntireOrder", shipCtx)
        if (ServiceUtil.isError(shipRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(shipRes))
            return "error"
        }

        List shipmentIds = (List) shipRes.get("shipmentIds")
        request.setAttribute("orderId", orderId)
        request.setAttribute("shipmentIds", shipmentIds ?: [])
        request.setAttribute("successMessage", "Sipariş başarıyla sevk edildi ve stoktan düşüldü. Sevkiyat Kodu: " + (shipmentIds?.join(", ") ?: "-"))
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in quickShipOrder: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
