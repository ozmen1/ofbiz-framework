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

final String MODULE = "CatalogCategoryEvents.groovy"

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

/**
 * Katalog ve Kategori yönetimi için gerekli metadata'yı döner.
 */
String getCatalogCategoryMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // 1. Kategori Tipleri
        List<GenericValue> catTypesGv = EntityQuery.use(delegator).from("ProductCategoryType").orderBy("description").queryList()
        List categoryTypes = []
        catTypesGv.each { ct ->
            categoryTypes.add([productCategoryTypeId: ct.productCategoryTypeId, description: ct.description ?: ct.productCategoryTypeId])
        }

        // 2. Katalog Kategori Tipleri (Root, Search, Promo vs.)
        List<GenericValue> pccTypesGv = EntityQuery.use(delegator).from("ProdCatalogCategoryType").orderBy("description").queryList()
        List catalogCategoryTypes = []
        pccTypesGv.each { pct ->
            catalogCategoryTypes.add([prodCatalogCategoryTypeId: pct.prodCatalogCategoryTypeId, description: pct.description ?: pct.prodCatalogCategoryTypeId])
        }

        // 3. Mevcut Kataloglar (Dropdown için)
        List<GenericValue> catalogsGv = EntityQuery.use(delegator).from("ProdCatalog").orderBy("catalogName").queryList()
        List catalogs = []
        catalogsGv.each { cat ->
            catalogs.add([prodCatalogId: cat.prodCatalogId, catalogName: cat.catalogName ?: cat.prodCatalogId])
        }

        // 4. Tüm Kategoriler (Üst kategori seçimi için)
        List<GenericValue> allCatsGv = EntityQuery.use(delegator).from("ProductCategory").orderBy("categoryName").queryList()
        List categories = []
        allCatsGv.each { c ->
            categories.add([
                    productCategoryId: c.productCategoryId,
                    categoryName: c.categoryName ?: (c.description ?: c.productCategoryId)
            ])
        }

        Map metadata = [
                categoryTypes: categoryTypes,
                catalogCategoryTypes: catalogCategoryTypes,
                catalogs: catalogs,
                categories: categories
        ]
        request.setAttribute("metadata", metadata)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCatalogCategoryMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Mevcut ProdCatalog kayıtlarını ve bunlara bağlı kategori özetini döner.
 */
String getCatalogs() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> catalogsGv = EntityQuery.use(delegator).from("ProdCatalog").orderBy("catalogName").queryList()
        List catalogList = []

        catalogsGv.each { cat ->
            String cId = cat.prodCatalogId

            // Bağlı kategoriler
            List<GenericValue> pccList = EntityQuery.use(delegator).from("ProdCatalogCategory")
                    .where("prodCatalogId", cId)
                    .filterByDate()
                    .orderBy("sequenceNum")
                    .queryList()

            List categories = []
            pccList.each { pcc ->
                String catName = pcc.productCategoryId
                try {
                    GenericValue cGv = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", pcc.productCategoryId).queryOne()
                    if (cGv && cGv.categoryName) catName = cGv.categoryName
                } catch (Exception ignore) {}

                String typeDesc = pcc.prodCatalogCategoryTypeId
                try {
                    GenericValue tGv = pcc.getRelatedOne("ProdCatalogCategoryType", true)
                    if (tGv && tGv.description) typeDesc = tGv.description
                } catch (Exception ignore) {}

                categories.add([
                        productCategoryId: pcc.productCategoryId,
                        categoryName: catName,
                        prodCatalogCategoryTypeId: pcc.prodCatalogCategoryTypeId,
                        prodCatalogCategoryTypeDesc: typeDesc,
                        fromDate: pcc.fromDate ? pcc.fromDate.toString() : null,
                        sequenceNum: pcc.sequenceNum
                ])
            }

            catalogList.add([
                    prodCatalogId: cId,
                    catalogName: cat.catalogName ?: cId,
                    useQuickAdd: cat.useQuickAdd ?: "N",
                    viewAllowPermReqd: cat.viewAllowPermReqd ?: "N",
                    purchaseAllowPermReqd: cat.purchaseAllowPermReqd ?: "N",
                    categoryCount: categories.size(),
                    categories: categories
            ])
        }

        request.setAttribute("catalogs", catalogList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCatalogs: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni ProdCatalog oluşturur.
 */
String createProdCatalog() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String prodCatalogId = params.prodCatalogId ? params.prodCatalogId.trim() : null
        String catalogName = params.catalogName ? params.catalogName.trim() : ""

        if (UtilValidate.isEmpty(catalogName)) {
            request.setAttribute("_ERROR_MESSAGE_", "Katalog adı zorunludur.")
            return "error"
        }

        if (UtilValidate.isEmpty(prodCatalogId)) {
            prodCatalogId = delegator.getNextSeqId("ProdCatalog")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("ProdCatalog").where("prodCatalogId", prodCatalogId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu katalog kodu zaten var: " + prodCatalogId)
                return "error"
            }
        }

        GenericValue newCat = delegator.makeValue("ProdCatalog")
        newCat.prodCatalogId = prodCatalogId
        newCat.catalogName = catalogName
        newCat.useQuickAdd = params.useQuickAdd ?: "N"
        newCat.viewAllowPermReqd = params.viewAllowPermReqd ?: "N"
        newCat.purchaseAllowPermReqd = params.purchaseAllowPermReqd ?: "N"
        newCat.create()

        request.setAttribute("prodCatalogId", prodCatalogId)
        request.setAttribute("message", "Katalog başarıyla oluşturuldu: " + prodCatalogId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProdCatalog: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * ProdCatalog günceller.
 */
String updateProdCatalog() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String prodCatalogId = params.prodCatalogId
        if (UtilValidate.isEmpty(prodCatalogId)) {
            request.setAttribute("_ERROR_MESSAGE_", "prodCatalogId parametresi zorunludur.")
            return "error"
        }

        GenericValue cat = EntityQuery.use(delegator).from("ProdCatalog").where("prodCatalogId", prodCatalogId).queryOne()
        if (!cat) {
            request.setAttribute("_ERROR_MESSAGE_", "Katalog bulunamadı: " + prodCatalogId)
            return "error"
        }

        if (params.containsKey("catalogName")) cat.catalogName = params.catalogName
        if (params.containsKey("useQuickAdd")) cat.useQuickAdd = params.useQuickAdd
        if (params.containsKey("viewAllowPermReqd")) cat.viewAllowPermReqd = params.viewAllowPermReqd
        if (params.containsKey("purchaseAllowPermReqd")) cat.purchaseAllowPermReqd = params.purchaseAllowPermReqd
        cat.store()

        request.setAttribute("message", "Katalog başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProdCatalog: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * ProdCatalog ve ilişkilerini siler.
 */
String deleteProdCatalog() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String prodCatalogId = request.getParameter("prodCatalogId")
        if (UtilValidate.isEmpty(prodCatalogId)) {
            request.setAttribute("_ERROR_MESSAGE_", "prodCatalogId parametresi zorunludur.")
            return "error"
        }

        GenericValue cat = EntityQuery.use(delegator).from("ProdCatalog").where("prodCatalogId", prodCatalogId).queryOne()
        if (cat) {
            delegator.removeByAnd("ProdCatalogCategory", [prodCatalogId: prodCatalogId])
            delegator.removeByAnd("ProductStoreCatalog", [prodCatalogId: prodCatalogId])
            cat.remove()
            request.setAttribute("message", "Katalog başarıyla silindi.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Katalog bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProdCatalog: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Kataloğa kategori bağlar.
 */
String addCategoryToProdCatalog() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String prodCatalogId = params.prodCatalogId
        String productCategoryId = params.productCategoryId
        String prodCatalogCategoryTypeId = params.prodCatalogCategoryTypeId ?: "PCCT_BROWSE_ROOT"
        Timestamp fromDate = parseTimestamp(params.fromDate) ?: UtilDateTime.nowTimestamp()

        if (UtilValidate.isEmpty(prodCatalogId) || UtilValidate.isEmpty(productCategoryId)) {
            request.setAttribute("_ERROR_MESSAGE_", "prodCatalogId ve productCategoryId zorunludur.")
            return "error"
        }

        GenericValue pcc = delegator.makeValue("ProdCatalogCategory")
        pcc.prodCatalogId = prodCatalogId
        pcc.productCategoryId = productCategoryId
        pcc.prodCatalogCategoryTypeId = prodCatalogCategoryTypeId
        pcc.fromDate = fromDate
        if (params.thruDate) pcc.thruDate = parseTimestamp(params.thruDate)
        if (params.sequenceNum) {
            try { pcc.sequenceNum = Long.parseLong(params.sequenceNum.toString()) } catch (Exception ignore) {}
        }
        pcc.create()

        request.setAttribute("message", "Kategori kataloğa başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addCategoryToProdCatalog: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Katalogdan kategori bağını kaldırır.
 */
String removeCategoryFromProdCatalog() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String prodCatalogId = params.prodCatalogId
        String productCategoryId = params.productCategoryId
        String prodCatalogCategoryTypeId = params.prodCatalogCategoryTypeId
        Timestamp fromDate = parseTimestamp(params.fromDate)

        if (!prodCatalogId || !productCategoryId || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "Eksik parametreler.")
            return "error"
        }

        GenericValue pcc = EntityQuery.use(delegator).from("ProdCatalogCategory")
                .where("prodCatalogId", prodCatalogId, "productCategoryId", productCategoryId, "prodCatalogCategoryTypeId", prodCatalogCategoryTypeId, "fromDate", fromDate)
                .queryOne()

        if (pcc) {
            pcc.remove()
            request.setAttribute("message", "Kategori katalogdan kaldırıldı.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Kayıt bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeCategoryFromProdCatalog: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Sayfalanabilir, filtrelenebilir kategoriler listesi döner.
 */
String getCategories() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String searchKeyword = request.getParameter("searchKeyword")
        String productCategoryTypeId = request.getParameter("productCategoryTypeId")

        int viewIndex = 0
        int viewSize = 20
        try {
            if (request.getParameter("viewIndex")) viewIndex = Integer.parseInt(request.getParameter("viewIndex"))
            if (request.getParameter("viewSize")) viewSize = Integer.parseInt(request.getParameter("viewSize"))
        } catch (Exception ignore) {}

        List conditions = []
        if (UtilValidate.isNotEmpty(productCategoryTypeId)) {
            conditions.add(EntityCondition.makeCondition("productCategoryTypeId", EntityOperator.EQUALS, productCategoryTypeId))
        }
        if (UtilValidate.isNotEmpty(searchKeyword)) {
            String kw = "%" + searchKeyword.trim() + "%"
            conditions.add(EntityCondition.makeCondition([
                    EntityCondition.makeCondition("productCategoryId", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("categoryName", EntityOperator.LIKE, kw),
                    EntityCondition.makeCondition("description", EntityOperator.LIKE, kw)
            ], EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator).from("ProductCategory")
        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        List<GenericValue> catsGv = query
                .orderBy("categoryName", "productCategoryId")
                .cursorScrollInsensitive()
                .maxRows(viewSize)
                .offset(viewIndex * viewSize)
                .queryList()

        List categoryList = []
        catsGv.each { c ->
            String cId = c.productCategoryId

            // 1. Üst Kategori (primaryParentCategoryId veya ProductCategoryRollup)
            String parentCatId = c.primaryParentCategoryId
            String parentCatName = ""
            if (!parentCatId) {
                GenericValue rollupGv = EntityQuery.use(delegator).from("ProductCategoryRollup")
                        .where("productCategoryId", cId)
                        .filterByDate()
                        .queryFirst()
                if (rollupGv) parentCatId = rollupGv.parentProductCategoryId
            }
            if (parentCatId) {
                try {
                    GenericValue pGv = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", parentCatId).queryOne()
                    if (pGv) parentCatName = pGv.categoryName ?: (pGv.description ?: parentCatId)
                } catch (Exception ignore) {}
            }

            // 2. Alt Kategori Sayısı
            long childCount = EntityQuery.use(delegator).from("ProductCategoryRollup")
                    .where("parentProductCategoryId", cId)
                    .filterByDate()
                    .queryCount()

            // 3. Bağlı Ürün Sayısı
            long memberCount = EntityQuery.use(delegator).from("ProductCategoryMember")
                    .where("productCategoryId", cId)
                    .filterByDate()
                    .queryCount()

            // 4. Kategori Tipi Açıklaması
            String typeDesc = c.productCategoryTypeId
            try {
                GenericValue tGv = c.getRelatedOne("ProductCategoryType", true)
                if (tGv && tGv.description) typeDesc = tGv.description
            } catch (Exception ignore) {}

            categoryList.add([
                    productCategoryId: cId,
                    categoryName: c.categoryName ?: c.description ?: cId,
                    description: c.description,
                    productCategoryTypeId: c.productCategoryTypeId,
                    productCategoryTypeDesc: typeDesc,
                    parentProductCategoryId: parentCatId,
                    parentCategoryName: parentCatName,
                    childCount: childCount,
                    memberCount: memberCount
            ])
        }

        long totalCategories = EntityQuery.use(delegator).from("ProductCategory").queryCount()
        long totalCatalogs = EntityQuery.use(delegator).from("ProdCatalog").queryCount()

        Map result = [
                categoryList: categoryList,
                totalCount: totalCount,
                viewIndex: viewIndex,
                viewSize: viewSize,
                metrics: [
                        totalCategories: totalCategories,
                        totalCatalogs: totalCatalogs
                ]
        ]
        request.setAttribute("result", result)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCategories: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Hiyerarşik Kategori Ağacını (Tree View) oluşturur.
 */
String getCategoryTree() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List<GenericValue> allCats = EntityQuery.use(delegator).from("ProductCategory").orderBy("categoryName").queryList()
        List<GenericValue> allRollups = EntityQuery.use(delegator).from("ProductCategoryRollup").filterByDate().queryList()

        // Parent -> Children map
        Map<String, List<String>> parentToChildren = [:]
        // Child -> Parents set
        Set<String> childCategories = new HashSet<>()

        allRollups.each { r ->
            String pId = r.parentProductCategoryId
            String cId = r.productCategoryId
            childCategories.add(cId)
            if (!parentToChildren.containsKey(pId)) {
                parentToChildren[pId] = []
            }
            parentToChildren[pId].add(cId)
        }

        // Kategori detay lookup map
        Map<String, Map> catMap = [:]
        allCats.each { c ->
            long memberCount = 0
            try {
                memberCount = EntityQuery.use(delegator).from("ProductCategoryMember")
                        .where("productCategoryId", c.productCategoryId)
                        .filterByDate()
                        .queryCount()
            } catch (Exception ignore) {}

            catMap[c.productCategoryId] = [
                    productCategoryId: c.productCategoryId,
                    categoryName: c.categoryName ?: (c.description ?: c.productCategoryId),
                    description: c.description,
                    productCategoryTypeId: c.productCategoryTypeId,
                    memberCount: memberCount,
                    children: []
            ]
        }

        // Özyinelemeli ağaç kurucu
        Closure buildNode
        buildNode = { String catId, Set<String> visited ->
            if (visited.contains(catId)) return null // döngü engelleme
            visited.add(catId)

            Map node = catMap[catId]
            if (!node) return null

            Map copy = new HashMap(node)
            List children = []
            List<String> childIds = parentToChildren[catId] ?: []
            childIds.each { chId ->
                Map childNode = buildNode(chId, new HashSet<>(visited))
                if (childNode) children.add(childNode)
            }
            copy.children = children
            return copy
        }

        // Kök Kategoriler (Herhangi bir kategorinin altı olmayanlar)
        List rootNodes = []
        allCats.each { c ->
            String cId = c.productCategoryId
            if (!childCategories.contains(cId)) {
                Map root = buildNode(cId, new HashSet<String>())
                if (root) rootNodes.add(root)
            }
        }

        request.setAttribute("categoryTree", rootNodes)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCategoryTree: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Tek bir kategorinin detaylarını, alt/üst kategorilerini ve üye ürünlerini döner.
 */
String getCategoryDetail() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productCategoryId = request.getParameter("productCategoryId")
        if (UtilValidate.isEmpty(productCategoryId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productCategoryId parametresi zorunludur.")
            return "error"
        }

        GenericValue cat = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", productCategoryId).queryOne()
        if (!cat) {
            request.setAttribute("_ERROR_MESSAGE_", "Kategori bulunamadı: " + productCategoryId)
            return "error"
        }

        // 1. Üst Kategoriler (Parent Rollups)
        List<GenericValue> parentRollupsGv = EntityQuery.use(delegator).from("ProductCategoryRollup")
                .where("productCategoryId", productCategoryId)
                .filterByDate()
                .queryList()
        List parentRollups = []
        parentRollupsGv.each { pr ->
            String pName = pr.parentProductCategoryId
            try {
                GenericValue pGv = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", pr.parentProductCategoryId).queryOne()
                if (pGv && pGv.categoryName) pName = pGv.categoryName
            } catch (Exception ignore) {}
            parentRollups.add([
                    parentProductCategoryId: pr.parentProductCategoryId,
                    parentCategoryName: pName,
                    fromDate: pr.fromDate ? pr.fromDate.toString() : null,
                    sequenceNum: pr.sequenceNum
            ])
        }

        // 2. Alt Kategoriler (Child Rollups)
        List<GenericValue> childRollupsGv = EntityQuery.use(delegator).from("ProductCategoryRollup")
                .where("parentProductCategoryId", productCategoryId)
                .filterByDate()
                .queryList()
        List childRollups = []
        childRollupsGv.each { cr ->
            String cName = cr.productCategoryId
            try {
                GenericValue cGv = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", cr.productCategoryId).queryOne()
                if (cGv && cGv.categoryName) cName = cGv.categoryName
            } catch (Exception ignore) {}
            childRollups.add([
                    productCategoryId: cr.productCategoryId,
                    categoryName: cName,
                    fromDate: cr.fromDate ? cr.fromDate.toString() : null,
                    sequenceNum: cr.sequenceNum
            ])
        }

        // 3. Üye Ürünler (ProductCategoryMember)
        List<GenericValue> membersGv = EntityQuery.use(delegator).from("ProductCategoryMember")
                .where("productCategoryId", productCategoryId)
                .filterByDate()
                .orderBy("sequenceNum")
                .queryList()
        List members = []
        membersGv.each { m ->
            String pId = m.productId
            String pName = pId
            BigDecimal defaultPrice = null
            String currencyUomId = null
            try {
                GenericValue pGv = EntityQuery.use(delegator).from("Product").where("productId", pId).queryOne()
                if (pGv) pName = pGv.productName ?: pGv.internalName ?: pId

                GenericValue prGv = EntityQuery.use(delegator).from("ProductPrice")
                        .where("productId", pId, "productPriceTypeId", "DEFAULT_PRICE")
                        .filterByDate()
                        .queryFirst()
                if (prGv) {
                    defaultPrice = prGv.getBigDecimal("price")
                    currencyUomId = prGv.getString("currencyUomId")
                }
            } catch (Exception ignore) {}

            members.add([
                    productId: pId,
                    productName: pName,
                    defaultPrice: defaultPrice,
                    currencyUomId: currencyUomId,
                    fromDate: m.fromDate ? m.fromDate.toString() : null,
                    thruDate: m.thruDate ? m.thruDate.toString() : null,
                    sequenceNum: m.sequenceNum,
                    quantity: m.getBigDecimal("quantity")
            ])
        }

        // 4. Bağlı Olduğu Kataloglar (ProdCatalogCategory)
        List<GenericValue> catalogsGv = EntityQuery.use(delegator).from("ProdCatalogCategory")
                .where("productCategoryId", productCategoryId)
                .filterByDate()
                .queryList()
        List catalogs = []
        catalogsGv.each { c ->
            String cName = c.prodCatalogId
            try {
                GenericValue catGv = EntityQuery.use(delegator).from("ProdCatalog").where("prodCatalogId", c.prodCatalogId).queryOne()
                if (catGv && catGv.catalogName) cName = catGv.catalogName
            } catch (Exception ignore) {}

            catalogs.add([
                    prodCatalogId: c.prodCatalogId,
                    catalogName: cName,
                    prodCatalogCategoryTypeId: c.prodCatalogCategoryTypeId,
                    fromDate: c.fromDate ? c.fromDate.toString() : null
            ])
        }

        Map categoryDetail = [
                productCategoryId: cat.productCategoryId,
                categoryName: cat.categoryName ?: "",
                description: cat.description ?: "",
                longDescription: cat.longDescription ?: "",
                productCategoryTypeId: cat.productCategoryTypeId ?: "CATALOG_CATEGORY",
                primaryParentCategoryId: cat.primaryParentCategoryId ?: "",
                parentRollups: parentRollups,
                childRollups: childRollups,
                members: members,
                catalogs: catalogs
        ]

        request.setAttribute("categoryDetail", categoryDetail)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCategoryDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Yeni kategori oluşturur.
 */
String createProductCategory() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productCategoryId = params.productCategoryId ? params.productCategoryId.trim() : null
        String categoryName = params.categoryName ? params.categoryName.trim() : ""
        String productCategoryTypeId = params.productCategoryTypeId ?: "CATALOG_CATEGORY"
        String primaryParentCategoryId = params.primaryParentCategoryId ? params.primaryParentCategoryId.trim() : null

        if (UtilValidate.isEmpty(categoryName)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kategori adı zorunludur.")
            return "error"
        }

        if (UtilValidate.isEmpty(productCategoryId)) {
            productCategoryId = delegator.getNextSeqId("ProductCategory")
        } else {
            GenericValue existing = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", productCategoryId).queryOne()
            if (existing) {
                request.setAttribute("_ERROR_MESSAGE_", "Bu kategori kodu zaten kullanımda: " + productCategoryId)
                return "error"
            }
        }

        GenericValue newCat = delegator.makeValue("ProductCategory")
        newCat.productCategoryId = productCategoryId
        newCat.categoryName = categoryName
        newCat.productCategoryTypeId = productCategoryTypeId
        newCat.description = params.description ?: null
        newCat.longDescription = params.longDescription ?: null
        newCat.primaryParentCategoryId = primaryParentCategoryId
        newCat.create()

        // Üst Kategori seçilmişse ProductCategoryRollup oluştur
        if (UtilValidate.isNotEmpty(primaryParentCategoryId)) {
            GenericValue rollup = delegator.makeValue("ProductCategoryRollup")
            rollup.parentProductCategoryId = primaryParentCategoryId
            rollup.productCategoryId = productCategoryId
            rollup.fromDate = UtilDateTime.nowTimestamp()
            rollup.create()
        }

        request.setAttribute("productCategoryId", productCategoryId)
        request.setAttribute("message", "Kategori başarıyla oluşturuldu: " + productCategoryId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createProductCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Kategori günceller.
 */
String updateProductCategory() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productCategoryId = params.productCategoryId
        if (UtilValidate.isEmpty(productCategoryId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productCategoryId parametresi zorunludur.")
            return "error"
        }

        GenericValue cat = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", productCategoryId).queryOne()
        if (!cat) {
            request.setAttribute("_ERROR_MESSAGE_", "Kategori bulunamadı: " + productCategoryId)
            return "error"
        }

        String oldParentId = cat.primaryParentCategoryId

        if (params.containsKey("categoryName")) cat.categoryName = params.categoryName
        if (params.containsKey("description")) cat.description = params.description
        if (params.containsKey("longDescription")) cat.longDescription = params.longDescription
        if (params.containsKey("productCategoryTypeId")) cat.productCategoryTypeId = params.productCategoryTypeId
        if (params.containsKey("primaryParentCategoryId")) cat.primaryParentCategoryId = params.primaryParentCategoryId

        cat.store()

        // Eğer üst kategori değiştiyse rollup'ı senkronize et
        String newParentId = params.primaryParentCategoryId ? params.primaryParentCategoryId.trim() : null
        if (newParentId != oldParentId) {
            if (oldParentId) {
                delegator.removeByAnd("ProductCategoryRollup", [parentProductCategoryId: oldParentId, productCategoryId: productCategoryId])
            }
            if (newParentId) {
                GenericValue existingRollup = EntityQuery.use(delegator).from("ProductCategoryRollup")
                        .where("parentProductCategoryId", newParentId, "productCategoryId", productCategoryId)
                        .filterByDate()
                        .queryFirst()
                if (!existingRollup) {
                    GenericValue rollup = delegator.makeValue("ProductCategoryRollup")
                    rollup.parentProductCategoryId = newParentId
                    rollup.productCategoryId = productCategoryId
                    rollup.fromDate = UtilDateTime.nowTimestamp()
                    rollup.create()
                }
            }
        }

        request.setAttribute("message", "Kategori bilgileri güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateProductCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Kategoriyi ve ilişkilerini siler.
 */
String deleteProductCategory() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        String productCategoryId = request.getParameter("productCategoryId")
        if (UtilValidate.isEmpty(productCategoryId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productCategoryId parametresi zorunludur.")
            return "error"
        }

        GenericValue cat = EntityQuery.use(delegator).from("ProductCategory").where("productCategoryId", productCategoryId).queryOne()
        if (cat) {
            delegator.removeByAnd("ProductCategoryRollup", [productCategoryId: productCategoryId])
            delegator.removeByAnd("ProductCategoryRollup", [parentProductCategoryId: productCategoryId])
            delegator.removeByAnd("ProductCategoryMember", [productCategoryId: productCategoryId])
            delegator.removeByAnd("ProdCatalogCategory", [productCategoryId: productCategoryId])
            cat.remove()
            request.setAttribute("message", "Kategori ve ilişkili rollup/üyelik kayıtları silindi.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Kategori bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deleteProductCategory: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Kategoriye ürün bağlar (ProductCategoryMember).
 */
String addCategoryProductMember() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productCategoryId = params.productCategoryId
        String productId = params.productId
        Timestamp fromDate = parseTimestamp(params.fromDate) ?: UtilDateTime.nowTimestamp()

        if (UtilValidate.isEmpty(productCategoryId) || UtilValidate.isEmpty(productId)) {
            request.setAttribute("_ERROR_MESSAGE_", "productCategoryId ve productId zorunludur.")
            return "error"
        }

        GenericValue pcm = delegator.makeValue("ProductCategoryMember")
        pcm.productCategoryId = productCategoryId
        pcm.productId = productId
        pcm.fromDate = fromDate
        if (params.thruDate) pcm.thruDate = parseTimestamp(params.thruDate)
        if (params.sequenceNum) {
            try { pcm.sequenceNum = Long.parseLong(params.sequenceNum.toString()) } catch (Exception ignore) {}
        }
        pcm.create()

        request.setAttribute("message", "Ürün kategoriye başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addCategoryProductMember: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Kategoriden ürünü kaldırır (ProductCategoryMember).
 */
String removeCategoryProductMember() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        Map params = UtilHttp.getParameterMap(request)
        String productCategoryId = params.productCategoryId
        String productId = params.productId
        Timestamp fromDate = parseTimestamp(params.fromDate)

        if (!productCategoryId || !productId || !fromDate) {
            request.setAttribute("_ERROR_MESSAGE_", "Eksik parametreler.")
            return "error"
        }

        GenericValue pcm = EntityQuery.use(delegator).from("ProductCategoryMember")
                .where("productCategoryId", productCategoryId, "productId", productId, "fromDate", fromDate)
                .queryOne()

        if (pcm) {
            pcm.remove()
            request.setAttribute("message", "Ürün kategoriden çıkarıldı.")
        } else {
            request.setAttribute("_ERROR_MESSAGE_", "Üyelik kaydı bulunamadı.")
            return "error"
        }
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeCategoryProductMember: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
