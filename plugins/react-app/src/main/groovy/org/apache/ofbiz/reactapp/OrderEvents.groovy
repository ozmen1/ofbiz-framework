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

final String MODULE = "OrderEvents.groovy"

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
        Debug.logWarning("Could not parse timestamp from string: " + str, MODULE)
        return null
    }
}

BigDecimal parseBigDecimal(Object val) {
    if (val == null) return null
    if (val instanceof BigDecimal) return (BigDecimal) val
    String s = val.toString().trim()
    if (s.isEmpty()) return null
    try {
        return new BigDecimal(s)
    } catch (Exception e) {
        return null
    }
}

/**
 * Sipariş Yönetimi (OMS) arayüzünün ihtiyaç duyduğu durumlar, tipler, mağazalar ve temel metadata.
 */
String getOrderMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List orderTypes = EntityQuery.use(delegator).from("OrderType").orderBy("description").queryList()
        List orderStatuses = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "ORDER_STATUS").orderBy("sequenceId", "description").queryList()
        List itemStatuses = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "ORDER_ITEM_STATUS").orderBy("sequenceId", "description").queryList()
        List stores = EntityQuery.use(delegator).from("ProductStore").orderBy("storeName").queryList()
        List currencyUoms = EntityQuery.use(delegator).from("Uom").where("uomTypeId", "CURRENCY_MEASURE").orderBy("description").queryList()

        // Cari (Customer & Vendor) listeleri
        List customers = EntityQuery.use(delegator)
            .from("PartyNameView")
            .maxRows(200)
            .queryList()

        request.setAttribute("orderTypes", orderTypes.collect {
            [orderTypeId: it.orderTypeId, description: it.description ?: it.orderTypeId]
        })
        request.setAttribute("orderStatuses", orderStatuses.collect {
            [statusId: it.statusId, description: it.description ?: it.statusId]
        })
        request.setAttribute("itemStatuses", itemStatuses.collect {
            [statusId: it.statusId, description: it.description ?: it.statusId]
        })
        request.setAttribute("productStores", stores.collect {
            [productStoreId: it.productStoreId, storeName: it.storeName ?: it.productStoreId]
        })
        request.setAttribute("currencyUoms", currencyUoms.collect {
            [uomId: it.uomId, description: it.description ? "${it.description} (${it.uomId})" : it.uomId]
        })
        request.setAttribute("parties", customers.collect {
            String name = (it.groupName ?: "") ?: ((it.firstName ?: "") + " " + (it.lastName ?: "")).trim()
            [partyId: it.partyId, name: name.isEmpty() ? it.partyId : name]
        })

        List products = EntityQuery.use(delegator)
            .from("Product")
            .maxRows(200)
            .orderBy("internalName", "productName")
            .queryList()

        List productList = []
        for (prod in products) {
            String pId = prod.getString("productId")
            String pName = prod.getString("internalName") ?: prod.getString("productName") ?: pId
            GenericValue priceGv = EntityQuery.use(delegator)
                .from("ProductPrice")
                .where("productId", pId, "productPriceTypeId", "DEFAULT_PRICE")
                .filterByDate()
                .queryFirst()
            BigDecimal price = priceGv ? priceGv.getBigDecimal("price") : BigDecimal.ZERO
            String cur = priceGv ? priceGv.getString("currencyUomId") : "USD"
            productList.add([
                productId: pId,
                productName: pName,
                defaultPrice: price ?: BigDecimal.ZERO,
                currencyUomId: cur ?: "USD"
            ])
        }
        request.setAttribute("products", productList)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getOrderMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Siparişleri filtreleme, listeleme ve özet KPI metrikleri hesaplama.
 */
String findOrders() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String orderTypeId = (String) params.get("orderTypeId")
        String statusId = (String) params.get("statusId")
        String searchKeyword = (String) params.get("searchKeyword")
        String partyId = (String) params.get("partyId")
        Timestamp fromDate = parseTimestamp(params.get("fromDate"))
        Timestamp thruDate = parseTimestamp(params.get("thruDate"))

        int viewIndex = 0
        int viewSize = 50
        try {
            if (params.get("viewIndex") != null) viewIndex = Integer.parseInt(params.get("viewIndex").toString())
            if (params.get("viewSize") != null) viewSize = Integer.parseInt(params.get("viewSize").toString())
        } catch (Exception ignored) {}

        List<EntityCondition> conditions = []

        if (UtilValidate.isNotEmpty(orderTypeId)) {
            conditions.add(EntityCondition.makeCondition("orderTypeId", EntityOperator.EQUALS, orderTypeId))
        }
        if (UtilValidate.isNotEmpty(statusId)) {
            conditions.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim().toLowerCase() + "%"
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.upperField("orderId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("orderName"), EntityOperator.LIKE, kw.toUpperCase())
            ], EntityOperator.OR))
        }
        if (fromDate != null) {
            conditions.add(EntityCondition.makeCondition("orderDate", EntityOperator.GREATER_THAN_EQUAL_TO, fromDate))
        }
        if (thruDate != null) {
            conditions.add(EntityCondition.makeCondition("orderDate", EntityOperator.LESS_THAN_EQUAL_TO, thruDate))
        }

        // Party filter via OrderRole
        if (UtilValidate.isNotEmpty(partyId)) {
            List<GenericValue> roles = EntityQuery.use(delegator)
                .from("OrderRole")
                .where("partyId", partyId)
                .select("orderId")
                .distinct(true)
                .queryList()
            List<String> orderIds = roles.collect { it.getString("orderId") }
            if (orderIds.isEmpty()) {
                request.setAttribute("orders", [])
                request.setAttribute("totalCount", 0)
                request.setAttribute("kpis", [totalCount: 0, totalAmount: 0, pendingCount: 0, pendingAmount: 0, approvedCount: 0, approvedAmount: 0, completedCount: 0, completedAmount: 0])
                return "success"
            }
            conditions.add(EntityCondition.makeCondition("orderId", EntityOperator.IN, orderIds))
        }

        def baseQuery = EntityQuery.use(delegator).from("OrderHeader")
        if (!conditions.isEmpty()) {
            baseQuery = baseQuery.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }

        long totalCount = baseQuery.queryCount()

        // KPI Hesaplamaları: Toplam, Bekleyen, Onaylanan, Tamamlanan
        BigDecimal totalAmount = BigDecimal.ZERO
        int pendingCount = 0
        BigDecimal pendingAmount = BigDecimal.ZERO
        int approvedCount = 0
        BigDecimal approvedAmount = BigDecimal.ZERO
        int completedCount = 0
        BigDecimal completedAmount = BigDecimal.ZERO

        def kpiQuery = EntityQuery.use(delegator).from("OrderHeader")
        if (!conditions.isEmpty()) {
            kpiQuery = kpiQuery.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }
        List<GenericValue> allMatching = kpiQuery.select("statusId", "grandTotal").queryList()
        for (GenericValue oh : allMatching) {
            BigDecimal gt = oh.getBigDecimal("grandTotal") ?: BigDecimal.ZERO
            totalAmount = totalAmount.add(gt)
            String st = oh.getString("statusId")
            if ("ORDER_CREATED".equals(st) || "ORDER_PROCESSING".equals(st)) {
                pendingCount++
                pendingAmount = pendingAmount.add(gt)
            } else if ("ORDER_APPROVED".equals(st)) {
                approvedCount++
                approvedAmount = approvedAmount.add(gt)
            } else if ("ORDER_COMPLETED".equals(st)) {
                completedCount++
                completedAmount = completedAmount.add(gt)
            }
        }

        List<GenericValue> orderHeaders = baseQuery
            .orderBy("-orderDate")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        // Statü tanımları map
        Map<String, String> statusMap = EntityQuery.use(delegator)
            .from("StatusItem")
            .where("statusTypeId", "ORDER_STATUS")
            .queryList()
            .collectEntries { [(it.statusId): it.description ?: it.statusId] }

        // Tip tanımları map
        Map<String, String> typeMap = EntityQuery.use(delegator)
            .from("OrderType")
            .queryList()
            .collectEntries { [(it.orderTypeId): it.description ?: it.orderTypeId] }

        List<Map<String, Object>> resultList = []
        for (GenericValue oh : orderHeaders) {
            String ordId = oh.getString("orderId")
            String ordTypeId = oh.getString("orderTypeId")

            // İlgili Cariyi Bul: Satış için PLACING_CUSTOMER veya BILL_TO_CUSTOMER, Satınalma için BILL_FROM_VENDOR
            String roleTypeToFind = "SALES_ORDER".equals(ordTypeId) ? "PLACING_CUSTOMER" : "BILL_FROM_VENDOR"
            GenericValue oRole = EntityQuery.use(delegator)
                .from("OrderRole")
                .where("orderId", ordId, "roleTypeId", roleTypeToFind)
                .queryFirst()
            if (!oRole && "SALES_ORDER".equals(ordTypeId)) {
                oRole = EntityQuery.use(delegator)
                    .from("OrderRole")
                    .where("orderId", ordId, "roleTypeId", "BILL_TO_CUSTOMER")
                    .queryFirst()
            }

            String partyIdVal = oRole ? oRole.getString("partyId") : null
            String partyName = "-"
            if (partyIdVal) {
                GenericValue pnv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", partyIdVal).queryOne()
                if (pnv) {
                    partyName = (pnv.getString("groupName") ?: "") ?: ((pnv.getString("firstName") ?: "") + " " + (pnv.getString("lastName") ?: "")).trim()
                    if (partyName.isEmpty()) partyName = partyIdVal
                } else {
                    partyName = partyIdVal
                }
            }

            // Toplam Kalem Sayısı
            long itemCount = EntityQuery.use(delegator)
                .from("OrderItem")
                .where("orderId", ordId)
                .queryCount()

            resultList.add([
                orderId: ordId,
                orderName: oh.getString("orderName"),
                orderTypeId: ordTypeId,
                orderTypeDesc: typeMap.get(ordTypeId) ?: ordTypeId,
                statusId: oh.getString("statusId"),
                statusDesc: statusMap.get(oh.getString("statusId")) ?: oh.getString("statusId"),
                orderDate: oh.getTimestamp("orderDate")?.toString(),
                entryDate: oh.getTimestamp("entryDate")?.toString(),
                grandTotal: oh.getBigDecimal("grandTotal") ?: BigDecimal.ZERO,
                currencyUom: oh.getString("currencyUom"),
                partyId: partyIdVal,
                partyName: partyName,
                itemCount: itemCount
            ])
        }

        request.setAttribute("orders", resultList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("kpis", [
            totalCount: totalCount,
            totalAmount: totalAmount,
            pendingCount: pendingCount,
            pendingAmount: pendingAmount,
            approvedCount: approvedCount,
            approvedAmount: approvedAmount,
            completedCount: completedCount,
            completedAmount: completedAmount
        ])

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findOrders: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Belirli bir siparişin başlık, kalemler, indirimler/vergiler, roller ve durum tarihçesi detayını döner.
 */
String getOrderDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String orderId = (String) params.get("orderId")
        if (UtilValidate.isEmpty(orderId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş Kodu (orderId) zorunludur.")
            return "error"
        }

        GenericValue orderHeader = EntityQuery.use(delegator).from("OrderHeader").where("orderId", orderId).queryOne()
        if (!orderHeader) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş bulunamadı: " + orderId)
            return "error"
        }

        // Status Descriptions Map
        Map<String, String> statusMap = EntityQuery.use(delegator)
            .from("StatusItem")
            .where("statusTypeId", "ORDER_STATUS")
            .queryList()
            .collectEntries { [(it.statusId): it.description ?: it.statusId] }

        Map<String, String> itemStatusMap = EntityQuery.use(delegator)
            .from("StatusItem")
            .where("statusTypeId", "ORDER_ITEM_STATUS")
            .queryList()
            .collectEntries { [(it.statusId): it.description ?: it.statusId] }

        Map<String, String> typeMap = EntityQuery.use(delegator)
            .from("OrderType")
            .queryList()
            .collectEntries { [(it.orderTypeId): it.description ?: it.orderTypeId] }

        // Order Items
        List<GenericValue> items = EntityQuery.use(delegator)
            .from("OrderItem")
            .where("orderId", orderId)
            .orderBy("orderItemSeqId")
            .queryList()

        List<Map<String, Object>> itemList = []
        for (GenericValue item : items) {
            BigDecimal qty = item.getBigDecimal("quantity") ?: BigDecimal.ZERO
            BigDecimal cancelQty = item.getBigDecimal("cancelQuantity") ?: BigDecimal.ZERO
            BigDecimal unitPrice = item.getBigDecimal("unitPrice") ?: BigDecimal.ZERO
            BigDecimal effectiveQty = qty.subtract(cancelQty)
            BigDecimal itemTotal = effectiveQty.multiply(unitPrice)

            itemList.add([
                orderItemSeqId: item.getString("orderItemSeqId"),
                orderItemTypeId: item.getString("orderItemTypeId"),
                productId: item.getString("productId"),
                itemDescription: item.getString("itemDescription"),
                quantity: qty,
                cancelQuantity: cancelQty,
                unitPrice: unitPrice,
                itemTotal: itemTotal,
                statusId: item.getString("statusId"),
                statusDesc: itemStatusMap.get(item.getString("statusId")) ?: item.getString("statusId"),
                estimatedShipDate: item.getTimestamp("estimatedShipDate")?.toString(),
                estimatedDeliveryDate: item.getTimestamp("estimatedDeliveryDate")?.toString()
            ])
        }

        // Adjustments (Vergi, İndirim, Kargo vb.)
        List<GenericValue> adjustments = EntityQuery.use(delegator)
            .from("OrderAdjustment")
            .where("orderId", orderId)
            .orderBy("orderAdjustmentId")
            .queryList()

        List<Map<String, Object>> adjList = adjustments.collect {
            [
                orderAdjustmentId: it.getString("orderAdjustmentId"),
                orderAdjustmentTypeId: it.getString("orderAdjustmentTypeId"),
                amount: it.getBigDecimal("amount") ?: BigDecimal.ZERO,
                description: it.getString("description"),
                comments: it.getString("comments")
            ]
        }

        // Roles (Taraflar)
        List<GenericValue> roles = EntityQuery.use(delegator)
            .from("OrderRole")
            .where("orderId", orderId)
            .queryList()

        List<Map<String, Object>> roleList = []
        for (GenericValue r : roles) {
            String pId = r.getString("partyId")
            String rTypeId = r.getString("roleTypeId")
            GenericValue pnv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", pId).queryOne()
            String pName = pId
            if (pnv) {
                String full = (pnv.getString("groupName") ?: "") ?: ((pnv.getString("firstName") ?: "") + " " + (pnv.getString("lastName") ?: "")).trim()
                if (!full.isEmpty()) pName = full
            }
            roleList.add([
                partyId: pId,
                partyName: pName,
                roleTypeId: rTypeId
            ])
        }

        // Status History (Durum Geçmişi)
        List<GenericValue> statuses = EntityQuery.use(delegator)
            .from("OrderStatus")
            .where("orderId", orderId)
            .orderBy("-statusDatetime")
            .queryList()

        List<Map<String, Object>> statusHistory = statuses.collect {
            [
                orderStatusId: it.getString("orderStatusId"),
                statusId: it.getString("statusId"),
                statusDesc: statusMap.get(it.getString("statusId")) ?: it.getString("statusId"),
                statusDatetime: it.getTimestamp("statusDatetime")?.toString(),
                statusUserLogin: it.getString("statusUserLogin"),
                changeReason: it.getString("changeReason")
            ]
        }

        Map<String, Object> headerMap = [
            orderId: orderHeader.getString("orderId"),
            orderName: orderHeader.getString("orderName"),
            orderTypeId: orderHeader.getString("orderTypeId"),
            orderTypeDesc: typeMap.get(orderHeader.getString("orderTypeId")) ?: orderHeader.getString("orderTypeId"),
            statusId: orderHeader.getString("statusId"),
            statusDesc: statusMap.get(orderHeader.getString("statusId")) ?: orderHeader.getString("statusId"),
            orderDate: orderHeader.getTimestamp("orderDate")?.toString(),
            entryDate: orderHeader.getTimestamp("entryDate")?.toString(),
            grandTotal: orderHeader.getBigDecimal("grandTotal") ?: BigDecimal.ZERO,
            currencyUom: orderHeader.getString("currencyUom"),
            productStoreId: orderHeader.getString("productStoreId"),
            originFacilityId: orderHeader.getString("originFacilityId"),
            createdBy: orderHeader.getString("createdBy")
        ]

        // Linked Invoices (İlişkili Faturalar)
        List<GenericValue> billings = EntityQuery.use(delegator).from("OrderItemBilling").where("orderId", orderId).queryList()
        Set<String> invoiceIds = billings.collect { it.getString("invoiceId") }.findAll { it != null } as Set
        List<Map<String, Object>> invoiceList = []
        for (String invId : invoiceIds) {
            GenericValue inv = EntityQuery.use(delegator).from("Invoice").where("invoiceId", invId).queryOne()
            if (inv) {
                GenericValue statusItem = EntityQuery.use(delegator).from("StatusItem").where("statusId", inv.getString("statusId")).queryOne()
                GenericValue invType = EntityQuery.use(delegator).from("InvoiceType").where("invoiceTypeId", inv.getString("invoiceTypeId")).queryOne()
                invoiceList.add([
                    invoiceId: invId,
                    invoiceTypeId: inv.getString("invoiceTypeId"),
                    invoiceTypeDesc: invType?.getString("description") ?: inv.getString("invoiceTypeId"),
                    statusId: inv.getString("statusId"),
                    statusDesc: statusItem?.getString("description") ?: inv.getString("statusId"),
                    invoiceDate: inv.getTimestamp("invoiceDate")?.toString() ?: inv.getTimestamp("createdStamp")?.toString(),
                    totalAmount: org.apache.ofbiz.accounting.invoice.InvoiceWorker.getInvoiceTotal(inv) ?: BigDecimal.ZERO
                ])
            }
        }

        // Linked Shipments (İlişkili Sevkiyat / İrsaliyeler)
        List<GenericValue> shipments1 = EntityQuery.use(delegator).from("Shipment").where("primaryOrderId", orderId).queryList()
        List<GenericValue> orderShpmts = EntityQuery.use(delegator).from("OrderShipment").where("orderId", orderId).queryList()
        Set<String> shipmentIds = (shipments1.collect { it.getString("shipmentId") } + orderShpmts.collect { it.getString("shipmentId") }).findAll { it != null } as Set
        List<Map<String, Object>> shipmentList = []
        for (String shpId : shipmentIds) {
            GenericValue s = EntityQuery.use(delegator).from("Shipment").where("shipmentId", shpId).queryOne()
            if (s) {
                GenericValue sStatus = EntityQuery.use(delegator).from("StatusItem").where("statusId", s.getString("statusId")).queryOne()
                GenericValue sType = EntityQuery.use(delegator).from("ShipmentType").where("shipmentTypeId", s.getString("shipmentTypeId")).queryOne()
                GenericValue routeSeg = EntityQuery.use(delegator).from("ShipmentRouteSegment").where("shipmentId", shpId).queryFirst()
                shipmentList.add([
                    shipmentId: shpId,
                    shipmentTypeId: s.getString("shipmentTypeId"),
                    shipmentTypeDesc: sType?.getString("description") ?: s.getString("shipmentTypeId"),
                    statusId: s.getString("statusId"),
                    statusDesc: sStatus?.getString("description") ?: s.getString("statusId"),
                    estimatedShipDate: s.getTimestamp("estimatedShipDate")?.toString(),
                    createdDate: s.getTimestamp("createdDate")?.toString() ?: s.getTimestamp("createdStamp")?.toString(),
                    carrierPartyId: routeSeg?.getString("carrierPartyId") ?: "",
                    trackingIdNumber: routeSeg?.getString("trackingIdNumber") ?: ""
                ])
            }
        }

        // Linked Receipts (Mal Kabul Kayıtları)
        List<GenericValue> receipts = EntityQuery.use(delegator).from("ShipmentReceipt").where("orderId", orderId).orderBy("-datetimeReceived").queryList()
        List<Map<String, Object>> receiptList = []
        for (GenericValue rc : receipts) {
            String pId = rc.getString("productId")
            GenericValue pr = pId ? EntityQuery.use(delegator).from("Product").where("productId", pId).queryOne() : null
            receiptList.add([
                receiptId: rc.getString("receiptId"),
                orderItemSeqId: rc.getString("orderItemSeqId"),
                productId: pId,
                productName: pr?.getString("productName") ?: pr?.getString("internalName") ?: pId,
                quantityAccepted: rc.getBigDecimal("quantityAccepted") ?: BigDecimal.ZERO,
                quantityRejected: rc.getBigDecimal("quantityRejected") ?: BigDecimal.ZERO,
                datetimeReceived: rc.getTimestamp("datetimeReceived")?.toString(),
                inventoryItemId: rc.getString("inventoryItemId"),
                facilityId: rc.getString("facilityId")
            ])
        }

        request.setAttribute("orderHeader", headerMap)
        request.setAttribute("orderItems", itemList)
        request.setAttribute("orderAdjustments", adjList)
        request.setAttribute("orderRoles", roleList)
        request.setAttribute("orderStatuses", statusHistory)
        request.setAttribute("orderInvoices", invoiceList)
        request.setAttribute("orderShipments", shipmentList)
        request.setAttribute("orderReceipts", receiptList)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getOrderDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Sipariş durumunu değiştirme (Onaylama, Tamamlama, İptal, Bekletme).
 */
String changeOrderStatus() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String orderId = (String) params.get("orderId")
        String statusId = (String) params.get("statusId")
        String setItemStatus = (String) params.get("setItemStatus") ?: "Y"
        String changeReason = (String) params.get("changeReason")

        if (UtilValidate.isEmpty(orderId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş Kodu ve Yeni Durum zorunludur.")
            return "error"
        }

        Map<String, Object> sCtx = [
            orderId: orderId,
            statusId: statusId,
            setItemStatus: setItemStatus,
            changeReason: changeReason,
            userLogin: userLogin
        ]

        Map<String, Object> serviceResult = dispatcher.runSync("changeOrderStatus", sCtx)
        if (ServiceUtil.isError(serviceResult)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(serviceResult))
            return "error"
        }

        request.setAttribute("orderId", orderId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("successMessage", "Sipariş durumu başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in changeOrderStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni Satış veya Satınalma Siparişi Oluşturma (storeOrder).
 */
String createOrder() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String orderTypeId = (String) params.get("orderTypeId") ?: "SALES_ORDER"
        String partyId = (String) params.get("partyId")
        String orderName = (String) params.get("orderName")
        String currencyUom = (String) params.get("currencyUom") ?: "USD"
        String productStoreId = (String) params.get("productStoreId")
        String initialStatusId = (String) params.get("statusId") ?: "ORDER_CREATED"
        Timestamp orderDate = parseTimestamp(params.get("orderDate")) ?: UtilDateTime.nowTimestamp()
        BigDecimal shippingAmount = parseBigDecimal(params.get("shippingAmount"))
        BigDecimal taxAmount = parseBigDecimal(params.get("taxAmount"))

        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Müşteri / Tedarikçi (Cari) seçimi zorunludur.")
            return "error"
        }

        // Store resolve: If SALES_ORDER and no productStoreId given, pick first store
        if ("SALES_ORDER".equals(orderTypeId) && UtilValidate.isEmpty(productStoreId)) {
            GenericValue defaultStore = EntityQuery.use(delegator).from("ProductStore").cache().queryFirst()
            if (defaultStore) {
                productStoreId = defaultStore.getString("productStoreId")
            }
        }

        // Parse items
        def itemsRaw = params.get("items")
        List itemsList = []
        if (itemsRaw instanceof String) {
            String rawStr = ((String) itemsRaw).trim()
            if (!rawStr.isEmpty()) {
                itemsList = (List) new JsonSlurper().parseText(rawStr)
            }
        } else if (itemsRaw instanceof List) {
            itemsList = (List) itemsRaw
        }

        if (itemsList.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "Siparişe en az bir kalem eklenmelidir.")
            return "error"
        }

        // Build OrderItems and ship group
        String shipGroupSeqId = "00001"
        List<GenericValue> orderItems = []
        List<GenericValue> orderItemShipGroupInfo = []

        GenericValue orderItemShipGroup = delegator.makeValue("OrderItemShipGroup", [
            shipGroupSeqId: shipGroupSeqId,
            shipmentMethodTypeId: "NO_SHIPPING",
            carrierPartyId: "_NA_",
            carrierRoleTypeId: "CARRIER"
        ])
        orderItemShipGroupInfo.add(orderItemShipGroup)

        int idx = 1
        for (itemObj in itemsList) {
            Map itemMap = (Map) itemObj
            String productId = (String) itemMap.get("productId")
            BigDecimal qty = parseBigDecimal(itemMap.get("quantity")) ?: BigDecimal.ONE
            BigDecimal unitPrice = parseBigDecimal(itemMap.get("unitPrice")) ?: BigDecimal.ZERO
            String itemDesc = (String) itemMap.get("itemDescription")

            if (UtilValidate.isEmpty(itemDesc) && UtilValidate.isNotEmpty(productId)) {
                GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
                if (prod) {
                    itemDesc = prod.getString("internalName") ?: prod.getString("productName")
                }
            }

            String seqId = String.format("%05d", idx++)
            GenericValue orderItem = delegator.makeValue("OrderItem", [
                orderItemSeqId: seqId,
                orderItemTypeId: "PRODUCT_ORDER_ITEM",
                productId: productId,
                itemDescription: itemDesc ?: productId,
                quantity: qty,
                unitPrice: unitPrice,
                unitListPrice: unitPrice,
                isModifiedPrice: "N",
                isPromo: "N",
                statusId: "ITEM_CREATED"
            ])
            orderItems.add(orderItem)

            GenericValue orderItemShipGroupAssoc = delegator.makeValue("OrderItemShipGroupAssoc", [
                orderItemSeqId: seqId,
                quantity: qty,
                shipGroupSeqId: shipGroupSeqId
            ])
            orderItemShipGroupInfo.add(orderItemShipGroupAssoc)
        }

        // Adjustments (Shipping & Tax)
        List<GenericValue> orderAdjustments = []
        if (shippingAmount != null && shippingAmount.compareTo(BigDecimal.ZERO) > 0) {
            GenericValue shipAdj = delegator.makeValue("OrderAdjustment", [
                orderAdjustmentTypeId: "SHIPPING_CHARGES",
                shipGroupSeqId: shipGroupSeqId,
                amount: shippingAmount,
                comments: "Kargo Ücreti"
            ])
            orderItemShipGroupInfo.add(shipAdj)
        }
        if (taxAmount != null && taxAmount.compareTo(BigDecimal.ZERO) > 0) {
            GenericValue taxAdj = delegator.makeValue("OrderAdjustment", [
                orderAdjustmentTypeId: "SALES_TAX",
                amount: taxAmount,
                comments: "Vergi / KDV"
            ])
            orderAdjustments.add(taxAdj)
        }

        // Service Context
        Map<String, Object> serviceCtx = [
            partyId: partyId,
            orderTypeId: orderTypeId,
            currencyUom: currencyUom,
            orderName: orderName,
            orderDate: orderDate,
            productStoreId: productStoreId,
            orderItems: orderItems,
            orderItemShipGroupInfo: orderItemShipGroupInfo,
            orderAdjustments: orderAdjustments,
            orderTerms: [],
            userLogin: userLogin
        ]

        if ("PURCHASE_ORDER".equals(orderTypeId)) {
            serviceCtx.billToCustomerPartyId = "Company"
            serviceCtx.billFromVendorPartyId = partyId
            serviceCtx.shipFromVendorPartyId = partyId
            serviceCtx.supplierAgentPartyId = partyId
        } else {
            serviceCtx.placingCustomerPartyId = partyId
            serviceCtx.billToCustomerPartyId = partyId
            serviceCtx.shipToCustomerPartyId = partyId
            serviceCtx.endUserCustomerPartyId = partyId
            serviceCtx.billFromVendorPartyId = "Company"
        }

        Map<String, Object> resp = dispatcher.runSync("storeOrder", serviceCtx)
        if (ServiceUtil.isError(resp)) {
            String errMsg = ServiceUtil.getErrorMessage(resp)
            Debug.logError("storeOrder error: " + errMsg, MODULE)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        String orderId = (String) resp.get("orderId")

        // If initial status requested is ORDER_APPROVED, transition it
        if ("ORDER_APPROVED".equals(initialStatusId)) {
            try {
                dispatcher.runSync("changeOrderStatus", [
                    orderId: orderId,
                    statusId: "ORDER_APPROVED",
                    setItemStatus: "Y",
                    userLogin: userLogin
                ])
            } catch (Exception e) {
                Debug.logWarning("Could not immediately approve order " + orderId + ": " + e.getMessage(), MODULE)
            }
        }

        request.setAttribute("orderId", orderId)
        request.setAttribute("successMessage", "Sipariş (" + orderId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createOrder: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Teklif (Quote) metadata.
 */
String getQuoteMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List quoteTypes = EntityQuery.use(delegator).from("QuoteType").orderBy("description").queryList()
        List quoteStatuses = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "QUOTE_STATUS").orderBy("sequenceId", "description").queryList()
        List stores = EntityQuery.use(delegator).from("ProductStore").orderBy("storeName").queryList()
        List currencyUoms = EntityQuery.use(delegator).from("Uom").where("uomTypeId", "CURRENCY_MEASURE").orderBy("description").queryList()

        List customers = EntityQuery.use(delegator)
            .from("PartyNameView")
            .maxRows(200)
            .queryList()

        List products = EntityQuery.use(delegator)
            .from("Product")
            .maxRows(200)
            .orderBy("internalName", "productName")
            .queryList()

        List productList = []
        for (prod in products) {
            String pId = prod.getString("productId")
            String pName = prod.getString("internalName") ?: prod.getString("productName") ?: pId
            GenericValue priceGv = EntityQuery.use(delegator)
                .from("ProductPrice")
                .where("productId", pId, "productPriceTypeId", "DEFAULT_PRICE")
                .filterByDate()
                .queryFirst()
            BigDecimal price = priceGv ? priceGv.getBigDecimal("price") : BigDecimal.ZERO
            String cur = priceGv ? priceGv.getString("currencyUomId") : "USD"
            productList.add([
                productId: pId,
                productName: pName,
                defaultPrice: price ?: BigDecimal.ZERO,
                currencyUomId: cur ?: "USD"
            ])
        }

        request.setAttribute("quoteTypes", quoteTypes.collect {
            [quoteTypeId: it.quoteTypeId, description: it.description ?: it.quoteTypeId]
        })
        request.setAttribute("quoteStatuses", quoteStatuses.collect {
            [statusId: it.statusId, description: it.description ?: it.statusId]
        })
        request.setAttribute("productStores", stores.collect {
            [productStoreId: it.productStoreId, storeName: it.storeName ?: it.productStoreId]
        })
        request.setAttribute("currencyUoms", currencyUoms.collect {
            [uomId: it.uomId, description: it.description ? "${it.description} (${it.uomId})" : it.uomId]
        })
        request.setAttribute("parties", customers.collect {
            String name = (it.groupName ?: "") ?: ((it.firstName ?: "") + " " + (it.lastName ?: "")).trim()
            [partyId: it.partyId, name: name.isEmpty() ? it.partyId : name]
        })
        request.setAttribute("products", productList)

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getQuoteMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Teklif arama ve listeleme.
 */
String findQuotes() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String quoteTypeId = (String) params.get("quoteTypeId")
        String statusId = (String) params.get("statusId")
        String partyId = (String) params.get("partyId")
        String searchKeyword = (String) params.get("searchKeyword")
        int viewIndex = 0
        int viewSize = 25

        if (params.get("viewIndex") != null) {
            try { viewIndex = Integer.parseInt(params.get("viewIndex").toString()) } catch (Exception ignored) {}
        }
        if (params.get("viewSize") != null) {
            try { viewSize = Integer.parseInt(params.get("viewSize").toString()) } catch (Exception ignored) {}
        }

        List<EntityCondition> conds = []
        if (UtilValidate.isNotEmpty(quoteTypeId)) {
            conds.add(EntityCondition.makeCondition("quoteTypeId", EntityOperator.EQUALS, quoteTypeId))
        }
        if (UtilValidate.isNotEmpty(statusId)) {
            conds.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(partyId)) {
            conds.add(EntityCondition.makeCondition("partyId", EntityOperator.EQUALS, partyId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim().toLowerCase() + "%"
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.upperField("quoteId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("quoteName"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("partyId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("description"), EntityOperator.LIKE, kw.toUpperCase())
            ], EntityOperator.OR))
        }

        def baseQuery = EntityQuery.use(delegator).from("Quote")
        if (!conds.isEmpty()) {
            baseQuery = baseQuery.where(conds)
        }

        long totalCount = baseQuery.queryCount()
        List<GenericValue> quoteList = baseQuery
            .orderBy("-issueDate", "-quoteId")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        // Cache helpers
        Map<String, String> statusNames = [:]
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "QUOTE_STATUS").queryList().each {
            statusNames[it.statusId] = it.description ?: it.statusId
        }
        Map<String, String> typeNames = [:]
        EntityQuery.use(delegator).from("QuoteType").queryList().each {
            typeNames[it.quoteTypeId] = it.description ?: it.quoteTypeId
        }

        List quotes = []
        for (q in quoteList) {
            String qId = q.getString("quoteId")
            String qPartyId = q.getString("partyId")
            String pName = qPartyId
            if (qPartyId) {
                GenericValue pv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", qPartyId).cache().queryOne()
                if (pv) {
                    pName = (pv.groupName ?: "") ?: ((pv.firstName ?: "") + " " + (pv.lastName ?: "")).trim()
                    if (pName.isEmpty()) pName = qPartyId
                }
            }

            // Calculate total from items
            List<GenericValue> qItems = EntityQuery.use(delegator).from("QuoteItem").where("quoteId", qId).queryList()
            BigDecimal totalAmount = BigDecimal.ZERO
            for (qi in qItems) {
                BigDecimal qty = qi.getBigDecimal("quantity") ?: BigDecimal.ZERO
                BigDecimal price = qi.getBigDecimal("quoteUnitPrice") ?: BigDecimal.ZERO
                totalAmount = totalAmount.add(qty.multiply(price))
            }

            quotes.add([
                quoteId: qId,
                quoteName: q.getString("quoteName"),
                quoteTypeId: q.getString("quoteTypeId"),
                quoteTypeDesc: typeNames.get(q.getString("quoteTypeId")) ?: q.getString("quoteTypeId"),
                statusId: q.getString("statusId"),
                statusDesc: statusNames.get(q.getString("statusId")) ?: q.getString("statusId"),
                partyId: qPartyId,
                partyName: pName,
                issueDate: q.getTimestamp("issueDate")?.toString(),
                validThruDate: q.getTimestamp("validThruDate")?.toString(),
                currencyUomId: q.getString("currencyUomId") ?: "USD",
                description: q.getString("description"),
                itemCount: qItems.size(),
                totalAmount: totalAmount
            ])
        }

        long createdQuotes = 0
        long approvedQuotes = 0
        long orderedQuotes = 0
        EntityQuery.use(delegator).from("Quote").queryList().each {
            String st = it.getString("statusId")
            if ("QUO_CREATED".equals(st)) createdQuotes++
            else if ("QUO_APPROVED".equals(st)) approvedQuotes++
            else if ("QUO_ORDERED".equals(st)) orderedQuotes++
        }

        request.setAttribute("quotes", quotes)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("kpis", [
            totalQuotes: totalCount,
            createdQuotes: createdQuotes,
            approvedQuotes: approvedQuotes,
            orderedQuotes: orderedQuotes
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findQuotes: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Teklif detayı (başlık, kalemler, roller).
 */
String getQuoteDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String quoteId = (String) params.get("quoteId")
        if (UtilValidate.isEmpty(quoteId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Teklif Kodu zorunludur.")
            return "error"
        }

        GenericValue quote = EntityQuery.use(delegator).from("Quote").where("quoteId", quoteId).queryOne()
        if (!quote) {
            request.setAttribute("_ERROR_MESSAGE_", "Teklif bulunamadı: " + quoteId)
            return "error"
        }

        GenericValue statusGv = EntityQuery.use(delegator).from("StatusItem").where("statusId", quote.getString("statusId")).cache().queryOne()
        GenericValue typeGv = EntityQuery.use(delegator).from("QuoteType").where("quoteTypeId", quote.getString("quoteTypeId")).cache().queryOne()

        String partyId = quote.getString("partyId")
        String partyName = partyId
        if (partyId) {
            GenericValue pv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", partyId).cache().queryOne()
            if (pv) {
                partyName = (pv.groupName ?: "") ?: ((pv.firstName ?: "") + " " + (pv.lastName ?: "")).trim()
                if (partyName.isEmpty()) partyName = partyId
            }
        }

        List<GenericValue> quoteItems = EntityQuery.use(delegator).from("QuoteItem").where("quoteId", quoteId).orderBy("quoteItemSeqId").queryList()
        BigDecimal grandTotal = BigDecimal.ZERO
        List items = []
        for (qi in quoteItems) {
            BigDecimal qty = qi.getBigDecimal("quantity") ?: BigDecimal.ZERO
            BigDecimal price = qi.getBigDecimal("quoteUnitPrice") ?: BigDecimal.ZERO
            BigDecimal lineTotal = qty.multiply(price)
            grandTotal = grandTotal.add(lineTotal)

            String pId = qi.getString("productId")
            String pName = pId
            if (pId) {
                GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", pId).cache().queryOne()
                if (prod) {
                    pName = prod.getString("internalName") ?: prod.getString("productName") ?: pId
                }
            }

            items.add([
                quoteItemSeqId: qi.getString("quoteItemSeqId"),
                productId: pId,
                productName: pName,
                quantity: qty,
                quoteUnitPrice: price,
                lineTotal: lineTotal,
                comments: qi.getString("comments")
            ])
        }

        List<GenericValue> quoteRoles = EntityQuery.use(delegator).from("QuoteRole").where("quoteId", quoteId).queryList()
        List roles = []
        for (qr in quoteRoles) {
            String rPartyId = qr.getString("partyId")
            String rPartyName = rPartyId
            GenericValue pv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", rPartyId).cache().queryOne()
            if (pv) {
                rPartyName = (pv.groupName ?: "") ?: ((pv.firstName ?: "") + " " + (pv.lastName ?: "")).trim()
                if (rPartyName.isEmpty()) rPartyName = rPartyId
            }
            roles.add([
                partyId: rPartyId,
                partyName: rPartyName,
                roleTypeId: qr.getString("roleTypeId")
            ])
        }

        request.setAttribute("quote", [
            quoteId: quote.getString("quoteId"),
            quoteName: quote.getString("quoteName"),
            quoteTypeId: quote.getString("quoteTypeId"),
            quoteTypeDesc: typeGv ? (typeGv.description ?: typeGv.quoteTypeId) : quote.getString("quoteTypeId"),
            statusId: quote.getString("statusId"),
            statusDesc: statusGv ? (statusGv.description ?: statusGv.statusId) : quote.getString("statusId"),
            partyId: partyId,
            partyName: partyName,
            issueDate: quote.getTimestamp("issueDate")?.toString(),
            validThruDate: quote.getTimestamp("validThruDate")?.toString(),
            currencyUomId: quote.getString("currencyUomId") ?: "USD",
            productStoreId: quote.getString("productStoreId"),
            description: quote.getString("description"),
            grandTotal: grandTotal
        ])
        request.setAttribute("quoteItems", items)
        request.setAttribute("quoteRoles", roles)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getQuoteDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni Teklif Oluşturma.
 */
String createQuote() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String quoteName = (String) params.get("quoteName")
        String quoteTypeId = (String) params.get("quoteTypeId") ?: "PRODUCT_QUOTE"
        String partyId = (String) params.get("partyId")
        String currencyUomId = (String) params.get("currencyUomId") ?: "USD"
        String productStoreId = (String) params.get("productStoreId")
        String description = (String) params.get("description")
        Timestamp issueDate = parseTimestamp(params.get("issueDate")) ?: UtilDateTime.nowTimestamp()
        Timestamp validThruDate = parseTimestamp(params.get("validThruDate"))
        String statusId = (String) params.get("statusId") ?: "QUO_CREATED"

        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Müşteri / Cari seçimi zorunludur.")
            return "error"
        }

        // Parse items
        def itemsRaw = params.get("items")
        List itemsList = []
        if (itemsRaw instanceof String) {
            String rawStr = ((String) itemsRaw).trim()
            if (!rawStr.isEmpty()) {
                itemsList = (List) new JsonSlurper().parseText(rawStr)
            }
        } else if (itemsRaw instanceof List) {
            itemsList = (List) itemsRaw
        }

        if (itemsList.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "Teklife en az bir kalem eklenmelidir.")
            return "error"
        }

        String quoteId = delegator.getNextSeqId("Quote")
        GenericValue newQuote = delegator.makeValue("Quote", [
            quoteId: quoteId,
            quoteTypeId: quoteTypeId,
            partyId: partyId,
            quoteName: quoteName ?: ("Teklif #" + quoteId),
            description: description,
            currencyUomId: currencyUomId,
            productStoreId: productStoreId,
            issueDate: issueDate,
            validThruDate: validThruDate,
            statusId: statusId
        ])
        newQuote.create()

        int idx = 1
        for (itemObj in itemsList) {
            Map itemMap = (Map) itemObj
            String productId = (String) itemMap.get("productId")
            BigDecimal qty = parseBigDecimal(itemMap.get("quantity")) ?: BigDecimal.ONE
            BigDecimal unitPrice = parseBigDecimal(itemMap.get("unitPrice")) ?: BigDecimal.ZERO
            String itemDesc = (String) itemMap.get("itemDescription")

            String seqId = String.format("%05d", idx++)
            GenericValue qItem = delegator.makeValue("QuoteItem", [
                quoteId: quoteId,
                quoteItemSeqId: seqId,
                productId: productId,
                quantity: qty,
                quoteUnitPrice: unitPrice,
                comments: itemDesc ?: productId
            ])
            qItem.create()
        }

        request.setAttribute("quoteId", quoteId)
        request.setAttribute("successMessage", "Teklif (" + quoteId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createQuote: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Teklif durumunu güncelleme (Onaylama, Siparişe dönüştürme, Reddetme).
 */
String changeQuoteStatus() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String quoteId = (String) params.get("quoteId")
        String statusId = (String) params.get("statusId")

        if (UtilValidate.isEmpty(quoteId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Teklif Kodu ve Durum zorunludur.")
            return "error"
        }

        GenericValue quote = EntityQuery.use(delegator).from("Quote").where("quoteId", quoteId).queryOne()
        if (!quote) {
            request.setAttribute("_ERROR_MESSAGE_", "Teklif bulunamadı: " + quoteId)
            return "error"
        }

        quote.set("statusId", statusId)
        quote.store()

        request.setAttribute("quoteId", quoteId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("successMessage", "Teklif durumu başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in changeQuoteStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Teklifi Siparişe Dönüştürme (Quote -> Order).
 */
String createOrderFromQuote() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String quoteId = (String) params.get("quoteId")
        if (UtilValidate.isEmpty(quoteId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Teklif Kodu (quoteId) zorunludur.")
            return "error"
        }

        GenericValue quote = EntityQuery.use(delegator).from("Quote").where("quoteId", quoteId).queryOne()
        if (!quote) {
            request.setAttribute("_ERROR_MESSAGE_", "Belirtilen teklif bulunamadı: " + quoteId)
            return "error"
        }

        List<GenericValue> quoteItems = EntityQuery.use(delegator).from("QuoteItem").where("quoteId", quoteId).queryList()
        if (quoteItems.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu teklifte dönüştürülecek ürün kalemi bulunmuyor.")
            return "error"
        }

        String partyId = quote.getString("partyId")
        String currencyUom = quote.getString("currencyUomId") ?: "USD"
        String productStoreId = quote.getString("productStoreId")
        if (UtilValidate.isEmpty(productStoreId)) {
            GenericValue defaultStore = EntityQuery.use(delegator).from("ProductStore").cache().queryFirst()
            if (defaultStore) productStoreId = defaultStore.getString("productStoreId")
        }
        String orderName = "Teklif #" + quoteId + " (" + (quote.getString("quoteName") ?: "") + ")"

        String shipGroupSeqId = "00001"
        List<GenericValue> orderItems = []
        List<GenericValue> orderItemShipGroupInfo = []

        GenericValue orderItemShipGroup = delegator.makeValue("OrderItemShipGroup", [
            shipGroupSeqId: shipGroupSeqId,
            shipmentMethodTypeId: "NO_SHIPPING",
            carrierPartyId: "_NA_",
            carrierRoleTypeId: "CARRIER"
        ])
        orderItemShipGroupInfo.add(orderItemShipGroup)

        int idx = 1
        for (qi in quoteItems) {
            String pId = qi.getString("productId")
            BigDecimal qty = qi.getBigDecimal("quantity") ?: BigDecimal.ONE
            BigDecimal price = qi.getBigDecimal("quoteUnitPrice") ?: BigDecimal.ZERO
            String itemDesc = qi.getString("comments")

            if (UtilValidate.isEmpty(itemDesc) && UtilValidate.isNotEmpty(pId)) {
                GenericValue prod = EntityQuery.use(delegator).from("Product").where("productId", pId).queryOne()
                if (prod) {
                    itemDesc = prod.getString("internalName") ?: prod.getString("productName")
                }
            }

            String seqId = String.format("%05d", idx++)
            GenericValue orderItem = delegator.makeValue("OrderItem", [
                orderItemSeqId: seqId,
                orderItemTypeId: "PRODUCT_ORDER_ITEM",
                productId: pId,
                itemDescription: itemDesc ?: pId,
                quantity: qty,
                unitPrice: price,
                unitListPrice: price,
                isModifiedPrice: "N",
                isPromo: "N",
                statusId: "ITEM_CREATED"
            ])
            orderItems.add(orderItem)

            GenericValue orderItemShipGroupAssoc = delegator.makeValue("OrderItemShipGroupAssoc", [
                orderItemSeqId: seqId,
                quantity: qty,
                shipGroupSeqId: shipGroupSeqId
            ])
            orderItemShipGroupInfo.add(orderItemShipGroupAssoc)
        }

        Map<String, Object> serviceCtx = [
            partyId: partyId,
            orderTypeId: "SALES_ORDER",
            currencyUom: currencyUom,
            orderName: orderName,
            orderDate: UtilDateTime.nowTimestamp(),
            productStoreId: productStoreId,
            orderItems: orderItems,
            orderItemShipGroupInfo: orderItemShipGroupInfo,
            orderAdjustments: [],
            orderTerms: [],
            placingCustomerPartyId: partyId,
            billToCustomerPartyId: partyId,
            shipToCustomerPartyId: partyId,
            endUserCustomerPartyId: partyId,
            billFromVendorPartyId: "Company",
            userLogin: userLogin
        ]

        Map<String, Object> resp = dispatcher.runSync("storeOrder", serviceCtx)
        if (ServiceUtil.isError(resp)) {
            String errMsg = ServiceUtil.getErrorMessage(resp)
            Debug.logError("storeOrder from quote error: " + errMsg, MODULE)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        String orderId = (String) resp.get("orderId")

        // Update quote status to ordered
        quote.set("statusId", "QUO_ORDERED")
        quote.store()

        request.setAttribute("orderId", orderId)
        request.setAttribute("quoteId", quoteId)
        request.setAttribute("successMessage", "Teklif #" + quoteId + " başarıyla Siparişe (" + orderId + ") dönüştürüldü.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createOrderFromQuote: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Sipariş İadeleri (Returns / RMA) Metadata.
 */
String getReturnMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List returnHeaderTypes = EntityQuery.use(delegator).from("ReturnHeaderType").orderBy("description").queryList()
        List returnStatuses = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "ORDER_RETURN_STTS").orderBy("sequenceId", "description").queryList()
        List returnReasons = EntityQuery.use(delegator).from("ReturnReason").orderBy("sequenceId", "description").queryList()
        List returnTypes = EntityQuery.use(delegator).from("ReturnType").orderBy("sequenceId", "description").queryList()

        request.setAttribute("returnHeaderTypes", returnHeaderTypes.collect {
            [returnHeaderTypeId: it.returnHeaderTypeId, description: it.description ?: it.returnHeaderTypeId]
        })
        request.setAttribute("returnStatuses", returnStatuses.collect {
            [statusId: it.statusId, description: it.description ?: it.statusId]
        })
        request.setAttribute("returnReasons", returnReasons.collect {
            [returnReasonId: it.returnReasonId, description: it.description ?: it.returnReasonId]
        })
        request.setAttribute("returnTypes", returnTypes.collect {
            [returnTypeId: it.returnTypeId, description: it.description ?: it.returnTypeId]
        })

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getReturnMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * İade listeleme ve arama.
 */
String findReturns() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String returnHeaderTypeId = (String) params.get("returnHeaderTypeId")
        String statusId = (String) params.get("statusId")
        String searchKeyword = (String) params.get("searchKeyword")
        int viewIndex = 0
        int viewSize = 25
        try {
            if (params.get("viewIndex") != null) viewIndex = Integer.parseInt(params.get("viewIndex").toString())
            if (params.get("viewSize") != null) viewSize = Integer.parseInt(params.get("viewSize").toString())
        } catch (Exception ignored) {}

        List<EntityCondition> conds = []
        if (UtilValidate.isNotEmpty(returnHeaderTypeId)) {
            conds.add(EntityCondition.makeCondition("returnHeaderTypeId", EntityOperator.EQUALS, returnHeaderTypeId))
        }
        if (UtilValidate.isNotEmpty(statusId)) {
            conds.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim().toLowerCase() + "%"
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition(EntityFunction.upperField("returnId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("fromPartyId"), EntityOperator.LIKE, kw.toUpperCase()),
                EntityCondition.makeCondition(EntityFunction.upperField("toPartyId"), EntityOperator.LIKE, kw.toUpperCase())
            ], EntityOperator.OR))
        }

        def baseQuery = EntityQuery.use(delegator).from("ReturnHeader")
        if (!conds.isEmpty()) {
            baseQuery = baseQuery.where(conds)
        }

        long totalCount = baseQuery.queryCount()
        List<GenericValue> returnList = baseQuery
            .orderBy("-entryDate", "-returnId")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        Map<String, String> statusNames = [:]
        EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "ORDER_RETURN_STTS").queryList().each {
            statusNames[it.statusId] = it.description ?: it.statusId
        }

        List returns = []
        for (ret in returnList) {
            String rId = ret.getString("returnId")
            String fromPartyId = ret.getString("fromPartyId")
            String fromPartyName = fromPartyId
            if (fromPartyId) {
                GenericValue pv = EntityQuery.use(delegator).from("PartyNameView").where("partyId", fromPartyId).cache().queryOne()
                if (pv) {
                    fromPartyName = (pv.groupName ?: "") ?: ((pv.firstName ?: "") + " " + (pv.lastName ?: "")).trim()
                    if (fromPartyName.isEmpty()) fromPartyName = fromPartyId
                }
            }

            List<GenericValue> rItems = EntityQuery.use(delegator).from("ReturnItem").where("returnId", rId).queryList()
            BigDecimal totalAmount = BigDecimal.ZERO
            for (ri in rItems) {
                BigDecimal qty = ri.getBigDecimal("returnQuantity") ?: BigDecimal.ZERO
                BigDecimal price = ri.getBigDecimal("returnPrice") ?: BigDecimal.ZERO
                totalAmount = totalAmount.add(qty.multiply(price))
            }

            returns.add([
                returnId: rId,
                returnHeaderTypeId: ret.getString("returnHeaderTypeId"),
                statusId: ret.getString("statusId"),
                statusDesc: statusNames.get(ret.getString("statusId")) ?: ret.getString("statusId"),
                fromPartyId: fromPartyId,
                fromPartyName: fromPartyName,
                toPartyId: ret.getString("toPartyId"),
                entryDate: ret.getTimestamp("entryDate")?.toString(),
                currencyUomId: ret.getString("currencyUomId") ?: "USD",
                itemCount: rItems.size(),
                totalAmount: totalAmount
            ])
        }

        long requestedCount = 0
        long acceptedCount = 0
        long completedCount = 0
        EntityQuery.use(delegator).from("ReturnHeader").queryList().each {
            String st = it.getString("statusId")
            if ("RETURN_REQUESTED".equals(st)) requestedCount++
            else if ("RETURN_ACCEPTED".equals(st)) acceptedCount++
            else if ("RETURN_COMPLETED".equals(st)) completedCount++
        }

        request.setAttribute("returns", returns)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("kpis", [
            totalReturns: totalCount,
            requestedCount: requestedCount,
            acceptedCount: acceptedCount,
            completedCount: completedCount
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in findReturns: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * İade Detayı.
 */
String getReturnDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)

    try {
        String returnId = (String) params.get("returnId")
        if (UtilValidate.isEmpty(returnId)) {
            request.setAttribute("_ERROR_MESSAGE_", "İade Kodu zorunludur.")
            return "error"
        }

        GenericValue ret = EntityQuery.use(delegator).from("ReturnHeader").where("returnId", returnId).queryOne()
        if (!ret) {
            request.setAttribute("_ERROR_MESSAGE_", "İade kaydı bulunamadı: " + returnId)
            return "error"
        }

        GenericValue statusGv = EntityQuery.use(delegator).from("StatusItem").where("statusId", ret.getString("statusId")).cache().queryOne()
        List<GenericValue> returnItems = EntityQuery.use(delegator).from("ReturnItem").where("returnId", returnId).orderBy("returnItemSeqId").queryList()
        BigDecimal grandTotal = BigDecimal.ZERO
        List items = []
        for (ri in returnItems) {
            BigDecimal qty = ri.getBigDecimal("returnQuantity") ?: BigDecimal.ZERO
            BigDecimal price = ri.getBigDecimal("returnPrice") ?: BigDecimal.ZERO
            BigDecimal lineTotal = qty.multiply(price)
            grandTotal = grandTotal.add(lineTotal)

            items.add([
                returnItemSeqId: ri.getString("returnItemSeqId"),
                orderId: ri.getString("orderId"),
                orderItemSeqId: ri.getString("orderItemSeqId"),
                productId: ri.getString("productId"),
                description: ri.getString("description"),
                returnQuantity: qty,
                returnPrice: price,
                lineTotal: lineTotal,
                returnReasonId: ri.getString("returnReasonId"),
                returnTypeId: ri.getString("returnTypeId")
            ])
        }

        request.setAttribute("returnHeader", [
            returnId: ret.getString("returnId"),
            returnHeaderTypeId: ret.getString("returnHeaderTypeId"),
            statusId: ret.getString("statusId"),
            statusDesc: statusGv ? (statusGv.description ?: statusGv.statusId) : ret.getString("statusId"),
            fromPartyId: ret.getString("fromPartyId"),
            toPartyId: ret.getString("toPartyId"),
            entryDate: ret.getTimestamp("entryDate")?.toString(),
            currencyUomId: ret.getString("currencyUomId") ?: "USD",
            grandTotal: grandTotal
        ])
        request.setAttribute("returnItems", items)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getReturnDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni İade Talebi Oluşturma.
 */
String createReturn() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String returnHeaderTypeId = (String) params.get("returnHeaderTypeId") ?: "CUSTOMER_RETURN"
        String fromPartyId = (String) params.get("fromPartyId")
        String toPartyId = (String) params.get("toPartyId") ?: "Company"
        String currencyUomId = (String) params.get("currencyUomId") ?: "USD"
        String orderId = (String) params.get("orderId")

        if (UtilValidate.isEmpty(fromPartyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "İade eden cari (fromPartyId) zorunludur.")
            return "error"
        }

        // Parse items
        def itemsRaw = params.get("items")
        List itemsList = []
        if (itemsRaw instanceof String) {
            String rawStr = ((String) itemsRaw).trim()
            if (!rawStr.isEmpty()) {
                itemsList = (List) new JsonSlurper().parseText(rawStr)
            }
        } else if (itemsRaw instanceof List) {
            itemsList = (List) itemsRaw
        }

        if (itemsList.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "İadeye en az bir kalem eklenmelidir.")
            return "error"
        }

        Map<String, Object> headerCtx = [
            returnHeaderTypeId: returnHeaderTypeId,
            statusId: "RETURN_REQUESTED",
            fromPartyId: fromPartyId,
            toPartyId: toPartyId,
            entryDate: UtilDateTime.nowTimestamp(),
            currencyUomId: currencyUomId,
            userLogin: userLogin
        ]
        Map<String, Object> headerRes = dispatcher.runSync("createReturnHeader", headerCtx)
        if (ServiceUtil.isError(headerRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(headerRes))
            return "error"
        }

        String returnId = (String) headerRes.get("returnId")

        int idx = 1
        for (itemObj in itemsList) {
            Map itemMap = (Map) itemObj
            String seqId = String.format("%05d", idx++)
            BigDecimal qty = parseBigDecimal(itemMap.get("returnQuantity")) ?: BigDecimal.ONE
            BigDecimal price = parseBigDecimal(itemMap.get("returnPrice")) ?: BigDecimal.ZERO
            String productId = (String) itemMap.get("productId")
            String desc = (String) itemMap.get("description")
            String itemOrderId = (String) itemMap.get("orderId") ?: orderId
            String itemOrderItemSeqId = (String) itemMap.get("orderItemSeqId")

            GenericValue rItem = delegator.makeValue("ReturnItem", [
                returnId: returnId,
                returnItemSeqId: seqId,
                returnItemTypeId: (String) itemMap.get("returnItemTypeId") ?: (productId ? "RET_PROD_ITEM" : "RET_NPROD_ITEM"),
                orderId: itemOrderId,
                orderItemSeqId: itemOrderItemSeqId,
                productId: productId,
                description: desc ?: productId,
                returnQuantity: qty,
                returnPrice: price,
                returnReasonId: (String) itemMap.get("returnReasonId") ?: "RTN_DEFECTIVE_ITEM",
                returnTypeId: (String) itemMap.get("returnTypeId") ?: "RTN_REFUND",
                statusId: "RETURN_REQUESTED"
            ])
            rItem.create()
        }

        request.setAttribute("returnId", returnId)
        request.setAttribute("successMessage", "İade talebi (" + returnId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createReturn: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * İade durumunu güncelleme (Onaylama, Kabul etme, Tamamlama).
 */
String updateReturnStatus() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String returnId = (String) params.get("returnId")
        String statusId = (String) params.get("statusId")

        if (UtilValidate.isEmpty(returnId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "İade Kodu ve Yeni Durum zorunludur.")
            return "error"
        }

        Map<String, Object> sCtx = [
            returnId: returnId,
            statusId: statusId,
            userLogin: userLogin
        ]
        Map<String, Object> res = dispatcher.runSync("updateReturnHeader", sCtx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("returnId", returnId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("successMessage", "İade durumu güncellendi: " + statusId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateReturnStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Hızlı Fatura Oluşturma (Siparişten doğrudan Fatura çıkarma).
 */
String quickCreateInvoiceForOrder() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String orderId = (String) params.get("orderId")
        if (UtilValidate.isEmpty(orderId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş Kodu zorunludur.")
            return "error"
        }

        GenericValue order = EntityQuery.use(delegator).from("OrderHeader").where("orderId", orderId).queryOne()
        if (!order) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş bulunamadı: " + orderId)
            return "error"
        }

        Map<String, Object> sCtx = [
            orderId: orderId,
            userLogin: userLogin
        ]
        Map<String, Object> res = dispatcher.runSync("createInvoiceForOrderAllItems", sCtx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        String invoiceId = (String) res.get("invoiceId")
        request.setAttribute("invoiceId", invoiceId)
        request.setAttribute("orderId", orderId)
        request.setAttribute("successMessage", "Sipariş (" + orderId + ") için fatura (" + invoiceId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in quickCreateInvoiceForOrder: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Hızlı Sevkiyat Kaydı Oluşturma (Siparişten doğrudan Sevkiyat çıkarma).
 */
String quickCreateShipmentForOrder() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = (LocalDispatcher) binding.getVariable("dispatcher")
    def request = binding.getVariable("request")
    Map<String, Object> params = UtilHttp.getCombinedMap(request)
    GenericValue userLogin = getSystemUserLogin()

    try {
        String orderId = (String) params.get("orderId")
        if (UtilValidate.isEmpty(orderId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş Kodu zorunludur.")
            return "error"
        }

        GenericValue order = EntityQuery.use(delegator).from("OrderHeader").where("orderId", orderId).queryOne()
        if (!order) {
            request.setAttribute("_ERROR_MESSAGE_", "Sipariş bulunamadı: " + orderId)
            return "error"
        }

        String orderTypeId = order.getString("orderTypeId")
        boolean isPurchase = "PURCHASE_ORDER".equals(orderTypeId)
        String shipmentTypeId = isPurchase ? "PURCHASE_SHIPMENT" : "SALES_SHIPMENT"

        String partyIdFrom = isPurchase ? "" : "Company"
        String partyIdTo = isPurchase ? "Company" : ""

        GenericValue billRole = EntityQuery.use(delegator).from("OrderRole")
            .where("orderId", orderId, "roleTypeId", isPurchase ? "BILL_FROM_VENDOR" : "BILL_TO_CUSTOMER")
            .queryFirst()
        if (billRole) {
            if (isPurchase) partyIdFrom = billRole.getString("partyId")
            else partyIdTo = billRole.getString("partyId")
        }

        Map<String, Object> shipmentCtx = [
            shipmentTypeId: shipmentTypeId,
            statusId: "SHIPMENT_INPUT",
            primaryOrderId: orderId,
            partyIdFrom: partyIdFrom ?: (isPurchase ? "DemoSupplier" : "Company"),
            partyIdTo: partyIdTo ?: (isPurchase ? "Company" : "DemoCustomer"),
            estimatedShipDate: UtilDateTime.nowTimestamp(),
            userLogin: userLogin
        ]
        Map<String, Object> sRes = dispatcher.runSync("createShipment", shipmentCtx)
        if (ServiceUtil.isError(sRes)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(sRes))
            return "error"
        }

        String shipmentId = (String) sRes.get("shipmentId")

        // Add order items to shipment
        List<GenericValue> orderItems = EntityQuery.use(delegator).from("OrderItem").where("orderId", orderId).queryList()
        for (item in orderItems) {
            String pId = item.getString("productId")
            BigDecimal qty = item.getBigDecimal("quantity") ?: BigDecimal.ONE
            if (pId) {
                dispatcher.runSync("createShipmentItem", [
                    shipmentId: shipmentId,
                    productId: pId,
                    quantity: qty,
                    userLogin: userLogin
                ])
            }
        }

        request.setAttribute("shipmentId", shipmentId)
        request.setAttribute("orderId", orderId)
        request.setAttribute("successMessage", "Sipariş (" + orderId + ") için sevkiyat kaydı (" + shipmentId + ") başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in quickCreateShipmentForOrder: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}


