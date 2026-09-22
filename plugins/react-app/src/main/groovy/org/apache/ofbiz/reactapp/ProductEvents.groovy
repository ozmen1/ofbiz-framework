/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilHttp
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery

import java.math.BigDecimal
import java.sql.Timestamp

final String MODULE = "ProductEvents.groovy"

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
 * Ürün yönetimi arayüzünün ihtiyaç duyduğu tüm dropdown seçeneklerini tek seferde döner.
 */
String getProductMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // 1. Ürün Tipleri (FINISHED_GOOD, SERVICE, RAW_MATERIAL, DIGITAL_GOOD vs.)
        List<GenericValue> typesGv = EntityQuery.use(delegator).from("ProductType").orderBy("description").queryList()
        List productTypes = []
        typesGv.each { t ->
            productTypes.add([productTypeId: t.productTypeId, description: t.description ?: t.productTypeId])
        }

        // 2. Ölçü Birimleri (UOM)
        List<GenericValue> uomsGv = EntityQuery.use(delegator).from("Uom")
                .where(EntityCondition.makeCondition([
                        EntityCondition.makeCondition("uomTypeId", EntityOperator.EQUALS, "PRODUCT_ORDER_MEASURE"),
                        EntityCondition.makeCondition("uomTypeId", EntityOperator.EQUALS, "WEIGHT_MEASURE"),
                        EntityCondition.makeCondition("uomTypeId", EntityOperator.EQUALS, "VOLUME_LIQ_MEASURE"),
                        EntityCondition.makeCondition("uomTypeId", EntityOperator.EQUALS, "DRY_MEASURE"),
                        EntityCondition.makeCondition("uomTypeId", EntityOperator.EQUALS, "DATA_MEASURE")
                ], EntityOperator.OR))
                .orderBy("description").queryList()
        List quantityUoms = []
        uomsGv.each { u ->
            quantityUoms.add([uomId: u.uomId, description: (u.description ?: u.uomId) + (u.abbreviation ? " (" + u.abbreviation + ")" : "")])
        }
        if (quantityUoms.isEmpty()) {
            quantityUoms.add([uomId: "OTH_ea", description: "Adet (ea)"])
            quantityUoms.add([uomId: "WT_kg", description: "Kilogram (kg)"])
            quantityUoms.add([uomId: "WT_g", description: "Gram (g)"])
            quantityUoms.add([uomId: "LEN_m", description: "Metre (m)"])
        }

        // 3. Para Birimleri
        List<GenericValue> currsGv = EntityQuery.use(delegator).from("Uom").where("uomTypeId", "CURRENCY_MEASURE").orderBy("description").queryList()
        List currencyUoms = []
        currsGv.each { c ->
            currencyUoms.add([uomId: c.uomId, description: (c.description ?: c.uomId) + " (" + (c.abbreviation ?: c.uomId) + ")"])
        }

        // 4. Fiyat Tipleri (DEFAULT_PRICE, LIST_PRICE, AVERAGE_COST, PROMO_PRICE vs.)
        List<GenericValue> priceTypesGv = EntityQuery.use(delegator).from("ProductPriceType").orderBy("description").queryList()
        List priceTypes = []
        priceTypesGv.each { pt ->
            priceTypes.add([productPriceTypeId: pt.productPriceTypeId, description: pt.description ?: pt.productPriceTypeId])
        }

        // 5. Fiyat Amaçları (PURCHASE, COMPONENT_PRICE vs.)
        List<GenericValue> pricePurposesGv = EntityQuery.use(delegator).from("ProductPricePurpose").orderBy("description").queryList()
        List pricePurposes = []
        pricePurposesGv.each { pp ->
            pricePurposes.add([productPricePurposeId: pp.productPricePurposeId, description: pp.description ?: pp.productPricePurposeId])
        }

        // 6. Tanımlayıcı Tipleri (SKU, UPCA, EAN, ISBN vs.)
        List<GenericValue> idTypesGv = EntityQuery.use(delegator).from("GoodIdentificationType").orderBy("description").queryList()
        List identificationTypes = []
        idTypesGv.each { it ->
            identificationTypes.add([goodIdentificationTypeId: it.goodIdentificationTypeId, description: it.description ?: it.goodIdentificationTypeId])
        }

        // 7. Mevcut Kategoriler (Hızlı atama için ilk 100)
        List<GenericValue> catsGv = EntityQuery.use(delegator).from("ProductCategory").maxRows(100).orderBy("categoryName").queryList()
        List categories = []
        catsGv.each { cat ->
            categories.add([
                    productCategoryId: cat.productCategoryId,
                    categoryName: cat.categoryName ?: (cat.description ?: cat.productCategoryId)
            ])
        }

        Map metadata = [
                productTypes: productTypes,
                quantityUoms: quantityUoms,
                currencyUoms: currencyUoms,
                priceTypes: priceTypes,
                pricePurposes: pricePurposes,
                identificationTypes: identificationTypes,
                categories: categories
        ]
        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Filtrelenebilir ve sayfalanabilir ürün listesi döner.
 * Anlık olarak her ürün için varsayılan fiyat ve depo stok özetini ekler.
 */
String getProducts() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String searchKeyword = request.getParameter("searchKeyword")
        String productTypeId = request.getParameter("productTypeId")
        String isVirtual = request.getParameter("isVirtual")
        String primaryProductCategoryId = request.getParameter("primaryProductCategoryId")

        int viewIndex = 0
        int viewSize = 20
        try {
            if (request.getParameter("viewIndex")) viewIndex = Integer.parseInt(request.getParameter("viewIndex"))
            if (request.getParameter("viewSize")) viewSize = Integer.parseInt(request.getParameter("viewSize"))
        } catch (Exception ignore) {}

        List conditions = []

        if (UtilValidate.isNotEmpty(productTypeId)) {
            conditions.add(EntityCondition.makeCondition("productTypeId", EntityOperator.EQUALS, productTypeId))
        }
        if (UtilValidate.isNotEmpty(isVirtual)) {
            conditions.add(EntityCondition.makeCondition("isVirtual", EntityOperator.EQUALS, isVirtual))
        }
        if (UtilValidate.isNotEmpty(primaryProductCategoryId)) {
            conditions.add(EntityCondition.makeCondition("primaryProductCategoryId", EntityOperator.EQUALS, primaryProductCategoryId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim() + "%"
            conditions.add(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("productId", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("productName", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("internalName", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("description", EntityOperator.LIKE, kw)
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("Product")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        List<GenericValue> productsGv = query
                .orderBy("-createdDate", "productId")
                .cursorScrollInsensitive()
                .maxRows(viewSize)
                .offset(viewIndex * viewSize)
                .queryList()

        List productList = []
        productsGv.each { p ->
            String pId = p.productId

            // 1. Fiyat Bilgisi (Öncelikli DEFAULT_PRICE veya herhangi bir aktif fiyat)
            GenericValue priceGv = EntityQuery.use(delegator).from("ProductPrice")
                    .where("productId", pId, "productPriceTypeId", "DEFAULT_PRICE")
                    .filterByDate()
                    .orderBy("-fromDate")
                    .queryFirst()
            if (!priceGv) {
                priceGv = EntityQuery.use(delegator).from("ProductPrice")
                        .where("productId", pId)
                        .filterByDate()
                        .orderBy("-fromDate")
                        .queryFirst()
            }

            BigDecimal defaultPrice = priceGv ? priceGv.getBigDecimal("price") : null
            String currencyUomId = priceGv ? priceGv.getString("currencyUomId") : null

            // 2. Depo Stok Özeti (Tüm tesislerdeki QOH ve ATP toplamı)
            BigDecimal totalQoh = BigDecimal.ZERO
            BigDecimal totalAtp = BigDecimal.ZERO
            try {
                List<GenericValue> invList = EntityQuery.use(delegator).from("InventoryItem")
                        .where("productId", pId)
                        .queryList()
                invList.each { inv ->
                    BigDecimal qoh = inv.getBigDecimal("quantityOnHandTotal")
                    BigDecimal atp = inv.getBigDecimal("availableToPromiseTotal")
                    if (qoh != null) totalQoh = totalQoh.add(qoh)
                    if (atp != null) totalAtp = totalAtp.add(atp)
                }
            } catch (Exception ignore) {}

            // 3. Ürün Tipi Açıklaması
            String typeDesc = p.productTypeId
            try {
                GenericValue tGv = p.getRelatedOne("ProductType", true)
                if (tGv && tGv.description) typeDesc = tGv.description
            } catch (Exception ignore) {}

            // 4. Kategori Adı
            String categoryName = ""
            if (p.primaryProductCategoryId) {
                try {
                    GenericValue catGv = p.getRelatedOne("PrimaryProductCategory", true)
                    if (catGv) categoryName = catGv.categoryName ?: (catGv.description ?: catGv.productCategoryId)
                } catch (Exception ignore) {}
            }

            // 5. Birincil Barkod / SKU
            String primarySku = ""
            try {
                GenericValue identGv = EntityQuery.use(delegator).from("GoodIdentification")
                        .where("productId", pId)
                        .queryFirst()
                if (identGv) primarySku = identGv.idValue
            } catch (Exception ignore) {}

            productList.add([
                    productId: pId,
                    productTypeId: p.productTypeId,
                    productTypeDesc: typeDesc,
                    productName: p.productName ?: p.internalName ?: pId,
                    internalName: p.internalName,
                    description: p.description,
                    isVirtual: p.isVirtual ?: "N",
                    isVariant: p.isVariant ?: "N",
                    primaryProductCategoryId: p.primaryProductCategoryId,
                    primaryCategoryName: categoryName,
                    quantityUomId: p.quantityUomId,
                    defaultPrice: defaultPrice,
                    currencyUomId: currencyUomId,
                    totalQoh: totalQoh,
                    totalAtp: totalAtp,
                    primarySku: primarySku,
                    createdDate: p.createdDate ? p.createdDate.toString() : null
            ])
        }

        // Özet Metrikleri
        long totalFinishedGoods = EntityQuery.use(delegator).from("Product")
                .where("productTypeId", "FINISHED_GOOD")
                .queryCount()
        long totalServices = EntityQuery.use(delegator).from("Product")
                .where("productTypeId", "SERVICE")
                .queryCount()

        Map result = [
                productList: productList,
                totalCount: totalCount,
                viewIndex: viewIndex,
                viewSize: viewSize,
                metrics: [
                        totalProducts: totalCount,
                        finishedGoods: totalFinishedGoods,
                        services: totalServices
                ]
        ]
        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProducts: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Tek bir ürünün tüm detaylarını (kart, fiyatlar, barkodlar, nitelikler, depo stokları) döner.
 */
String getProductDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        if (UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId parametresi zorunludur.")
            return "error"
        }

        GenericValue p = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!p) {
            request.setAttribute("_ERROR_MESSAGE_", "Ürün bulunamadı: " + productId)
            return "error"
        }

        // 1. Fiyatlar
        List<GenericValue> pricesGv = EntityQuery.use(delegator).from("ProductPrice")
                .where("productId", productId)
                .orderBy("-fromDate")
                .queryList()
        List prices = []
        pricesGv.each { pr ->
            String pTypeDesc = pr.productPriceTypeId
            try {
                GenericValue pt = pr.getRelatedOne("ProductPriceType", true)
                if (pt && pt.description) pTypeDesc = pt.description
            } catch (Exception ignore) {}

            String pPurpDesc = pr.productPricePurposeId
            try {
                GenericValue pp = pr.getRelatedOne("ProductPricePurpose", true)
                if (pp && pp.description) pPurpDesc = pp.description
            } catch (Exception ignore) {}

            prices.add([
                    productId: pr.productId,
                    productPriceTypeId: pr.productPriceTypeId,
                    productPriceTypeDesc: pTypeDesc,
                    productPricePurposeId: pr.productPricePurposeId,
                    productPricePurposeDesc: pPurpDesc,
                    currencyUomId: pr.currencyUomId,
                    productStoreGroupId: pr.productStoreGroupId,
                    fromDate: pr.fromDate ? pr.fromDate.toString() : null,
                    thruDate: pr.thruDate ? pr.thruDate.toString() : null,
                    price: pr.getBigDecimal("price"),
                    taxInPrice: pr.taxInPrice ?: "N"
            ])
        }

        // 2. Barkodlar & Tanımlayıcılar
        List<GenericValue> identsGv = EntityQuery.use(delegator).from("GoodIdentification")
                .where("productId", productId)
                .queryList()
        List goodIdentifications = []
        identsGv.each { ident ->
            String idDesc = ident.goodIdentificationTypeId
            try {
                GenericValue git = ident.getRelatedOne("GoodIdentificationType", true)
                if (git && git.description) idDesc = git.description
            } catch (Exception ignore) {}

            goodIdentifications.add([
                    goodIdentificationTypeId: ident.goodIdentificationTypeId,
                    goodIdentificationTypeDesc: idDesc,
                    idValue: ident.idValue
            ])
        }

        // 3. Özel Nitelikler (Attributes)
        List<GenericValue> attrsGv = EntityQuery.use(delegator).from("ProductAttribute")
                .where("productId", productId)
                .orderBy("attrName")
                .queryList()
        List attributes = []
        attrsGv.each { attr ->
            attributes.add([
                    attrName: attr.attrName,
                    attrValue: attr.attrValue,
                    attrDescription: attr.attrDescription
            ])
        }

        // 4. Depo Stok Dağılımı (Facility bazında QOH/ATP)
        List<GenericValue> invList = EntityQuery.use(delegator).from("InventoryItem")
                .where("productId", productId)
                .queryList()
        Map<String, Map> facMap = [:]
        invList.each { inv ->
            String fId = inv.facilityId ?: "_NA_"
            if (!facMap.containsKey(fId)) {
                String fName = fId
                try {
                    GenericValue fGv = EntityQuery.use(delegator).from("Facility").where("facilityId", fId).queryOne()
                    if (fGv && fGv.facilityName) fName = fGv.facilityName
                } catch (Exception ignore) {}
                facMap[fId] = [facilityId: fId, facilityName: fName, qoh: BigDecimal.ZERO, atp: BigDecimal.ZERO]
            }
            BigDecimal q = inv.getBigDecimal("quantityOnHandTotal")
            BigDecimal a = inv.getBigDecimal("availableToPromiseTotal")
            if (q) facMap[fId].qoh = facMap[fId].qoh.add(q)
            if (a) facMap[fId].atp = facMap[fId].atp.add(a)
        }

        Map productDetail = [
                productId: p.productId,
                productTypeId: p.productTypeId,
                productName: p.productName ?: "",
                internalName: p.internalName ?: "",
                description: p.description ?: "",
                longDescription: p.longDescription ?: "",
                primaryProductCategoryId: p.primaryProductCategoryId ?: "",
                quantityUomId: p.quantityUomId ?: "",
                isVirtual: p.isVirtual ?: "N",
                isVariant: p.isVariant ?: "N",
                taxable: p.taxable ?: "Y",
                chargeShipping: p.chargeShipping ?: "Y",
                returnable: p.returnable ?: "Y",
                salesDiscontinuationDate: p.salesDiscontinuationDate ? p.salesDiscontinuationDate.toString() : null,
                createdDate: p.createdDate ? p.createdDate.toString() : null,
                prices: prices,
                goodIdentifications: goodIdentifications,
                attributes: attributes,
                inventoryByFacility: facMap.values().toList()
        ]

        request.setAttribute("productDetail", productDetail)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni ürün kartı oluşturur.
 */
String createProduct() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = getSystemUserLogin()

        String productId = params.productId ? params.productId.trim() : null
        String productTypeId = params.productTypeId ? params.productTypeId.trim() : "FINISHED_GOOD"
        String productName = params.productName ? params.productName.trim() : ""
        String internalName = params.internalName ? params.internalName.trim() : productName

        if (UtilValidate.isEmpty(productName) && UtilValidate.isEmpty(internalName)) {
            request.setAttribute("_ERROR_MESSAGE_", "Ürün adı veya dahili referans adı zorunludur.")
            return "error"
        }

        // Eğer ID belirtilmemişse delegator sequence ile üret
        if (UtilValidate.isEmpty(productId)) {
            productId = delegator.getNextSeqId("Product")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu ürün kodu zaten kullanımda: " + productId)
                return "error"
            }
        }

        Timestamp nowTimestamp = UtilDateTime.nowTimestamp()

        GenericValue newProduct = delegator.makeValue("Product")
        newProduct.productId = productId
        newProduct.productTypeId = productTypeId
        newProduct.productName = productName
        newProduct.internalName = internalName
        newProduct.description = params.description ?: null
        newProduct.longDescription = params.longDescription ?: null
        newProduct.primaryProductCategoryId = params.primaryProductCategoryId ?: null
        newProduct.quantityUomId = params.quantityUomId ?: null
        newProduct.isVirtual = params.isVirtual ?: "N"
        newProduct.isVariant = params.isVariant ?: "N"
        newProduct.taxable = params.taxable ?: "Y"
        newProduct.chargeShipping = params.chargeShipping ?: "Y"
        newProduct.returnable = params.returnable ?: "Y"
        newProduct.createdDate = nowTimestamp
        newProduct.lastModifiedDate = nowTimestamp
        newProduct.createdByUserLogin = userLogin ? userLogin.userLoginId : "system"
        newProduct.lastModifiedByUserLogin = userLogin ? userLogin.userLoginId : "system"
        newProduct.create()

        // Başlangıç Fiyatı tanımlanmışsa ProductPrice oluştur
        BigDecimal defaultPrice = parseBigDecimal(params.defaultPrice)
        if (defaultPrice != null && defaultPrice.compareTo(BigDecimal.ZERO) > 0) {
            GenericValue newPrice = delegator.makeValue("ProductPrice")
            newPrice.productId = productId
            newPrice.productPriceTypeId = "DEFAULT_PRICE"
            newPrice.productPricePurposeId = "PURCHASE"
            newPrice.currencyUomId = params.currencyUomId ?: "TRY"
            newPrice.productStoreGroupId = "_NA_"
            newPrice.fromDate = nowTimestamp
            newPrice.price = defaultPrice
            newPrice.taxInPrice = params.taxInPrice ?: "N"
            newPrice.createdDate = nowTimestamp
            newPrice.lastModifiedDate = nowTimestamp
            newPrice.createdByUserLogin = userLogin ? userLogin.userLoginId : "system"
            newPrice.lastModifiedByUserLogin = userLogin ? userLogin.userLoginId : "system"
            newPrice.create()
        }

        // Başlangıç Barkodu / SKU tanımlanmışsa GoodIdentification oluştur
        String primarySku = params.primarySku ? params.primarySku.trim() : null
        if (UtilValidate.isNotEmpty(primarySku)) {
            String goodIdentificationTypeId = params.goodIdentificationTypeId ?: "SKU"
            GenericValue newIdent = delegator.makeValue("GoodIdentification")
            newIdent.productId = productId
            newIdent.goodIdentificationTypeId = goodIdentificationTypeId
            newIdent.idValue = primarySku
            newIdent.create()
        }

        // Birincil Kategori seçilmişse ProductCategoryMember olarak da bağla
        if (UtilValidate.isNotEmpty(params.primaryProductCategoryId)) {
            GenericValue pcm = delegator.makeValue("ProductCategoryMember")
            pcm.productId = productId
            pcm.productCategoryId = params.primaryProductCategoryId
            pcm.fromDate = nowTimestamp
            pcm.create()
        }

        request.setAttribute("productId", productId)
        request.setAttribute("message", "Ürün başarıyla oluşturuldu: " + productId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProduct: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Mevcut ürün kartını günceller.
 */
String updateProduct() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = getSystemUserLogin()

        String productId = params.productId
        if (UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId parametresi zorunludur.")
            return "error"
        }

        GenericValue p = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!p) {
            request.setAttribute("_ERROR_MESSAGE_", "Güncellenecek ürün bulunamadı: " + productId)
            return "error"
        }

        if (params.containsKey("productTypeId")) p.productTypeId = params.productTypeId
        if (params.containsKey("productName")) p.productName = params.productName
        if (params.containsKey("internalName")) p.internalName = params.internalName
        if (params.containsKey("description")) p.description = params.description
        if (params.containsKey("longDescription")) p.longDescription = params.longDescription
        if (params.containsKey("primaryProductCategoryId")) p.primaryProductCategoryId = params.primaryProductCategoryId
        if (params.containsKey("quantityUomId")) p.quantityUomId = params.quantityUomId
        if (params.containsKey("isVirtual")) p.isVirtual = params.isVirtual
        if (params.containsKey("isVariant")) p.isVariant = params.isVariant
        if (params.containsKey("taxable")) p.taxable = params.taxable
        if (params.containsKey("chargeShipping")) p.chargeShipping = params.chargeShipping
        if (params.containsKey("returnable")) p.returnable = params.returnable

        p.lastModifiedDate = UtilDateTime.nowTimestamp()
        p.lastModifiedByUserLogin = userLogin ? userLogin.userLoginId : "system"
        p.store()

        request.setAttribute("productId", productId)
        request.setAttribute("message", "Ürün bilgileri başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProduct: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürünü siler veya ilişkili kayıt varsa satıştan kaldırır (soft-delete / discontinue).
 */
String deleteProduct() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        if (UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId parametresi zorunludur.")
            return "error"
        }

        GenericValue p = EntityQuery.use(delegator).from("Product").where("productId", productId).queryOne()
        if (!p) {
            request.setAttribute("_ERROR_MESSAGE_", "Silinecek ürün bulunamadı: " + productId)
            return "error"
        }

        // Sipariş veya fatura ilişkisi var mı kontrol et
        long orderItemCount = EntityQuery.use(delegator).from("OrderItem").where("productId", productId).queryCount()
        long invoiceItemCount = EntityQuery.use(delegator).from("InvoiceItem").where("productId", productId).queryCount()

        if (orderItemCount > 0 || invoiceItemCount > 0) {
            // İlişkili muhasebe/sipariş kaydı var, soft-delete uyguluyoruz
            p.salesDiscontinuationDate = UtilDateTime.nowTimestamp()
            p.store()
            request.setAttribute("message", "Ürün sipariş ve faturalarda kullanıldığı için satıştan kaldırıldı (Arşivlendi).")
        } else {
            // Temiz ürün; alt ilişkileri ve ürünü sil
            delegator.removeByAnd("ProductPrice", [productId: productId])
            delegator.removeByAnd("GoodIdentification", [productId: productId])
            delegator.removeByAnd("ProductAttribute", [productId: productId])
            delegator.removeByAnd("ProductCategoryMember", [productId: productId])
            p.remove()
            request.setAttribute("message", "Ürün ve bağlı fiyat/barkod kayıtları başarıyla silindi.")
        }

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProduct: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürüne ait fiyatları döner.
 */
String getProductPrices() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productId = request.getParameter("productId")
        List<GenericValue> pricesGv = EntityQuery.use(delegator).from("ProductPrice")
                .where("productId", productId)
                .orderBy("-fromDate")
                .queryList()
        List prices = []
        pricesGv.each { pr ->
            prices.add([
                    productId: pr.productId,
                    productPriceTypeId: pr.productPriceTypeId,
                    productPricePurposeId: pr.productPricePurposeId,
                    currencyUomId: pr.currencyUomId,
                    productStoreGroupId: pr.productStoreGroupId,
                    fromDate: pr.fromDate ? pr.fromDate.toString() : null,
                    thruDate: pr.thruDate ? pr.thruDate.toString() : null,
                    price: pr.getBigDecimal("price"),
                    taxInPrice: pr.taxInPrice ?: "N"
            ])
        }
        request.setAttribute("prices", prices)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getProductPrices: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Ürüne yeni fiyat kaydı ekler.
 */
String createProductPrice() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = getSystemUserLogin()

        String productId = params.productId
        String productPriceTypeId = params.productPriceTypeId ?: "DEFAULT_PRICE"
        String productPricePurposeId = params.productPricePurposeId ?: "PURCHASE"
        String currencyUomId = params.currencyUomId ?: "TRY"
        String productStoreGroupId = params.productStoreGroupId ?: "_NA_"
        Timestamp fromDate = parseTimestamp(params.fromDate) ?: UtilDateTime.nowTimestamp()
        BigDecimal price = parseBigDecimal(params.price)

        if (UtilValidate.isEmpty(productId) || price == null) {
            request.setAttribute("_ERROR_MESSAGE_", "productId ve geçerli bir price değeri zorunludur.")
            return "error"
        }

        GenericValue newPrice = delegator.makeValue("ProductPrice")
        newPrice.productId = productId
        newPrice.productPriceTypeId = productPriceTypeId
        newPrice.productPricePurposeId = productPricePurposeId
        newPrice.currencyUomId = currencyUomId
        newPrice.productStoreGroupId = productStoreGroupId
        newPrice.fromDate = fromDate
        newPrice.thruDate = parseTimestamp(params.thruDate)
        newPrice.price = price
        newPrice.taxInPrice = params.taxInPrice ?: "N"
        newPrice.createdDate = UtilDateTime.nowTimestamp()
        newPrice.lastModifiedDate = UtilDateTime.nowTimestamp()
        newPrice.createdByUserLogin = userLogin ? userLogin.userLoginId : "system"
        newPrice.lastModifiedByUserLogin = userLogin ? userLogin.userLoginId : "system"
        newPrice.create()

        request.setAttribute("message", "Fiyat kaydı başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductPrice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Mevcut fiyat kaydını günceller.
 */
String updateProductPrice() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        GenericValue userLogin = getSystemUserLogin()

        String productId = params.productId
        String productPriceTypeId = params.productPriceTypeId
        String productPricePurposeId = params.productPricePurposeId ?: "PURCHASE"
        String currencyUomId = params.currencyUomId ?: "TRY"
        String productStoreGroupId = params.productStoreGroupId ?: "_NA_"
        Timestamp fromDate = parseTimestamp(params.fromDate)

        if (!productId || !productPriceTypeId || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "Fiyat güncellemesi için birincil anahtarlar eksik.")
            return "error"
        }

        GenericValue pr = EntityQuery.use(delegator).from("ProductPrice").where(
                "productId", productId,
                "productPriceTypeId", productPriceTypeId,
                "productPricePurposeId", productPricePurposeId,
                "currencyUomId", currencyUomId,
                "productStoreGroupId", productStoreGroupId,
                "fromDate", fromDate
        ).queryOne()

        if (!pr) {
            request.setAttribute("_ERROR_MESSAGE_", "Güncellenecek fiyat kaydı bulunamadı.")
            return "error"
        }

        if (params.containsKey("price")) pr.price = parseBigDecimal(params.price)
        if (params.containsKey("taxInPrice")) pr.taxInPrice = params.taxInPrice
        if (params.containsKey("thruDate")) pr.thruDate = parseTimestamp(params.thruDate)

        pr.lastModifiedDate = UtilDateTime.nowTimestamp()
        pr.lastModifiedByUserLogin = userLogin ? userLogin.userLoginId : "system"
        pr.store()

        request.setAttribute("message", "Fiyat kaydı başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProductPrice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Fiyat kaydını siler veya bitiş tarihi atar.
 */
String deleteProductPrice() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String productPriceTypeId = params.productPriceTypeId
        String productPricePurposeId = params.productPricePurposeId ?: "PURCHASE"
        String currencyUomId = params.currencyUomId ?: "TRY"
        String productStoreGroupId = params.productStoreGroupId ?: "_NA_"
        Timestamp fromDate = parseTimestamp(params.fromDate)

        GenericValue pr = EntityQuery.use(delegator).from("ProductPrice").where(
                "productId", productId,
                "productPriceTypeId", productPriceTypeId,
                "productPricePurposeId", productPricePurposeId,
                "currencyUomId", currencyUomId,
                "productStoreGroupId", productStoreGroupId,
                "fromDate", fromDate
        ).queryOne()

        if (pr) {
            pr.remove()
            request.setAttribute("message", "Fiyat kaydı silindi.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Fiyat kaydı bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductPrice: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Barkod / Tanımlayıcı ekler (EAN, UPC, SKU vs.)
 */
String createGoodIdentification() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String goodIdentificationTypeId = params.goodIdentificationTypeId
        String idValue = params.idValue

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(goodIdentificationTypeId) || UtilValidate.isEmpty(idValue)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId, goodIdentificationTypeId ve idValue zorunludur.")
            return "error"
        }

        GenericValue ident = delegator.makeValue("GoodIdentification")
        ident.productId = productId
        ident.goodIdentificationTypeId = goodIdentificationTypeId
        ident.idValue = idValue.trim()
        ident.createOrStore()

        request.setAttribute("message", "Tanımlayıcı başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createGoodIdentification: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Barkod / Tanımlayıcıyı kaldırır.
 */
String deleteGoodIdentification() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String goodIdentificationTypeId = params.goodIdentificationTypeId

        GenericValue ident = EntityQuery.use(delegator).from("GoodIdentification")
                .where("productId", productId, "goodIdentificationTypeId", goodIdentificationTypeId)
                .queryOne()

        if (ident) {
            ident.remove()
            request.setAttribute("message", "Tanımlayıcı silindi.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Tanımlayıcı bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteGoodIdentification: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Özel ürün niteliği kaydeder (createOrStore).
 */
String saveProductAttribute() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String attrName = params.attrName ? params.attrName.trim() : null
        String attrValue = params.attrValue ? params.attrValue.trim() : ""
        String attrDescription = params.attrDescription ? params.attrDescription.trim() : ""

        if (UtilValidate.isEmpty(productId) || UtilValidate.isEmpty(attrName)) {
            request.setAttribute("_ERROR_MESSAGE_", "productId ve attrName zorunludur.")
            return "error"
        }

        GenericValue attr = delegator.makeValue("ProductAttribute")
        attr.productId = productId
        attr.attrName = attrName
        attr.attrValue = attrValue
        attr.attrDescription = attrDescription
        attr.createOrStore()

        request.setAttribute("message", "Ürün niteliği başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in saveProductAttribute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Özel ürün niteliğini siler.
 */
String deleteProductAttribute() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productId = params.productId
        String attrName = params.attrName

        GenericValue attr = EntityQuery.use(delegator).from("ProductAttribute")
                .where("productId", productId, "attrName", attrName)
                .queryOne()

        if (attr) {
            attr.remove()
            request.setAttribute("message", "Ürün niteliği silindi.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Nitelik bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductAttribute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
