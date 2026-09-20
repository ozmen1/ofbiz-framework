/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.service.ServiceUtil
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.accounting.invoice.InvoiceWorker
import org.apache.ofbiz.order.order.OrderReadHelper
import java.sql.Timestamp
import java.math.BigDecimal

final String MODULE = "PartyEvents.groovy"

GenericValue getSystemUserLogin() {
    GenericValue uL = (GenericValue) binding.getVariable("userLogin")
    if (!uL) {
        def delegator = binding.getVariable("delegator")
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
 * 1. getPartyMetadata
 * Returns master data for selects: PartyTypes, RoleTypes, IdentificationTypes, ContactPurposeTypes, Countries
 */
String getPartyMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Party Types
        List partyTypes = [
            [partyTypeId: "PARTY_GROUP", description: "Kurumsal / Şirket"],
            [partyTypeId: "PERSON", description: "Bireysel / Şahıs"]
        ]

        // Role Types
        List<GenericValue> roleTypesGv = EntityQuery.use(delegator)
            .from("RoleType")
            .orderBy("description")
            .queryList()

        List roleTypes = []
        Set keyRoles = ["CUSTOMER", "SUPPLIER", "VENDOR", "EMPLOYEE", "CARRIER", "BILL_TO_CUSTOMER", "BILL_FROM_VENDOR", "LEAD", "CONTACT", "INTERNAL_ORGANIZATIO"] as Set
        
        // Priority list
        roleTypesGv.each { rt ->
            if (keyRoles.contains(rt.roleTypeId)) {
                roleTypes.add([
                    roleTypeId: rt.roleTypeId,
                    description: rt.description ?: rt.roleTypeId,
                    isKey: true
                ])
            }
        }
        // Then remaining roles
        roleTypesGv.each { rt ->
            if (!keyRoles.contains(rt.roleTypeId)) {
                roleTypes.add([
                    roleTypeId: rt.roleTypeId,
                    description: rt.description ?: rt.roleTypeId,
                    isKey: false
                ])
            }
        }

        // Party Identification Types (Ensure VKN & TCKN exist if missing)
        try {
            GenericValue vkn = EntityQuery.use(delegator).from("PartyIdentificationType").where("partyIdentificationTypeId", "VKN").queryOne()
            if (!vkn) {
                GenericValue newVkn = delegator.makeValue("PartyIdentificationType", [
                    partyIdentificationTypeId: "VKN",
                    description: "Vergi Kimlik Numarası (VKN)"
                ])
                delegator.create(newVkn)
            }
            GenericValue tckn = EntityQuery.use(delegator).from("PartyIdentificationType").where("partyIdentificationTypeId", "TCKN").queryOne()
            if (!tckn) {
                GenericValue newTckn = delegator.makeValue("PartyIdentificationType", [
                    partyIdentificationTypeId: "TCKN",
                    description: "T.C. Kimlik Numarası (TCKN)"
                ])
                delegator.create(newTckn)
            }
        } catch (Exception ignored) {}

        List<GenericValue> idTypesGv = EntityQuery.use(delegator)
            .from("PartyIdentificationType")
            .orderBy("partyIdentificationTypeId")
            .queryList()
        List identificationTypes = []
        idTypesGv.each { it ->
            identificationTypes.add([
                partyIdentificationTypeId: it.partyIdentificationTypeId,
                description: it.description ?: it.partyIdentificationTypeId
            ])
        }

        // Contact Purpose Types
        List<GenericValue> purposeGv = EntityQuery.use(delegator)
            .from("ContactMechPurposeType")
            .orderBy("description")
            .queryList()
        List contactMechPurposeTypes = []
        purposeGv.each { pt ->
            contactMechPurposeTypes.add([
                contactMechPurposeTypeId: pt.contactMechPurposeTypeId,
                description: pt.description ?: pt.contactMechPurposeTypeId
            ])
        }

        // Countries
        List<GenericValue> countryGv = EntityQuery.use(delegator)
            .from("Geo")
            .where("geoTypeId", "COUNTRY")
            .orderBy("geoName")
            .queryList()
        List countries = []
        countryGv.each { c ->
            countries.add([
                geoId: c.geoId,
                geoName: c.geoName ?: c.geoId,
                geoCode: c.geoCode ?: c.geoId
            ])
        }

        request.setAttribute("partyTypes", partyTypes)
        request.setAttribute("roleTypes", roleTypes)
        request.setAttribute("identificationTypes", identificationTypes)
        request.setAttribute("contactMechPurposeTypes", contactMechPurposeTypes)
        request.setAttribute("countries", countries)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getParties
 * Returns paginated party list with search, filters, roles, contact summary, and KPI metrics.
 */
String getParties() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String partyTypeId = parameters.partyTypeId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim()
        String statusId = parameters.statusId?.trim()

        int viewIndex = 0
        int viewSize = 20

        if (parameters.viewIndex) {
            try { viewIndex = Integer.parseInt(parameters.viewIndex.toString()) } catch (Exception ignored) {}
        }
        if (parameters.viewSize) {
            try { viewSize = Integer.parseInt(parameters.viewSize.toString()) } catch (Exception ignored) {}
        }

        // KPI Metrics calculation
        long totalParties = EntityQuery.use(delegator).from("Party").queryCount()
        long totalGroups = EntityQuery.use(delegator).from("Party").where("partyTypeId", "PARTY_GROUP").queryCount()
        long totalPersons = EntityQuery.use(delegator).from("Party").where("partyTypeId", "PERSON").queryCount()
        
        long activeCustomers = EntityQuery.use(delegator).from("PartyRole").where("roleTypeId", "CUSTOMER").queryCount()
        long activeSuppliers = EntityQuery.use(delegator).from("PartyRole").where("roleTypeId", "SUPPLIER").queryCount()
        if (activeSuppliers == 0) {
            activeSuppliers = EntityQuery.use(delegator).from("PartyRole").where("roleTypeId", "VENDOR").queryCount()
        }

        // Filter conditions
        List conditions = []

        if (UtilValidate.isNotEmpty(partyTypeId)) {
            conditions.add(EntityCondition.makeCondition("partyTypeId", EntityOperator.EQUALS, partyTypeId))
        }

        if (UtilValidate.isNotEmpty(statusId)) {
            conditions.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, statusId))
        }

        if (UtilValidate.isNotEmpty(roleTypeId)) {
            // Find partyIds having this role
            List<GenericValue> roleParties = EntityQuery.use(delegator)
                .from("PartyRole")
                .where("roleTypeId", roleTypeId)
                .select("partyId")
                .queryList()
            List rolePartyIds = roleParties.collect { it.partyId }
            if (rolePartyIds.isEmpty()) {
                conditions.add(EntityCondition.makeCondition("partyId", EntityOperator.EQUALS, "__NONE__"))
            } else {
                conditions.add(EntityCondition.makeCondition("partyId", EntityOperator.IN, rolePartyIds))
            }
        }

        if (UtilValidate.isNotEmpty(search)) {
            String searchPattern = "%" + search + "%"
            List searchConds = [
                EntityCondition.makeCondition("partyId", EntityOperator.LIKE, searchPattern),
                EntityCondition.makeCondition("groupName", EntityOperator.LIKE, searchPattern),
                EntityCondition.makeCondition("firstName", EntityOperator.LIKE, searchPattern),
                EntityCondition.makeCondition("lastName", EntityOperator.LIKE, searchPattern)
            ]
            conditions.add(EntityCondition.makeCondition(searchConds, EntityOperator.OR))
        }

        def query = EntityQuery.use(delegator)
            .from("PartyNameView")
            .orderBy("partyId")

        if (!conditions.isEmpty()) {
            query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
        }

        long totalCount = query.queryCount()

        List<GenericValue> partyListGv = query
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List partyList = []

        partyListGv.each { p ->
            String pId = p.partyId
            String name = p.groupName ?: ((p.firstName ?: "") + " " + (p.lastName ?: "")).trim()
            if (!name) name = pId

            // Roles
            List<GenericValue> rolesGv = EntityQuery.use(delegator)
                .from("PartyRole")
                .where("partyId", pId)
                .queryList()
            List roles = []
            rolesGv.each { r ->
                if (r.roleTypeId != "_NA_") {
                    roles.add(r.roleTypeId)
                }
            }

            // Primary Phone
            String phone = ""
            try {
                GenericValue telecom = EntityQuery.use(delegator)
                    .from("PartyAndTelecomNumber")
                    .where("partyId", pId)
                    .filterByDate()
                    .queryFirst()
                if (telecom) {
                    phone = (telecom.countryCode ? ("+" + telecom.countryCode + " ") : "") +
                            (telecom.areaCode ? (telecom.areaCode + " ") : "") +
                            (telecom.contactNumber ?: "")
                    phone = phone.trim()
                }
            } catch (Exception ignored) {}

            // Primary Email
            String email = ""
            try {
                GenericValue emailGv = EntityQuery.use(delegator)
                    .from("PartyAndContactMech")
                    .where("partyId", pId, "contactMechTypeId", "EMAIL_ADDRESS")
                    .filterByDate()
                    .queryFirst()
                if (emailGv && emailGv.infoString) {
                    email = emailGv.infoString
                }
            } catch (Exception ignored) {}

            // Primary Address
            String city = ""
            String countryGeoId = ""
            try {
                GenericValue postal = EntityQuery.use(delegator)
                    .from("PartyAndPostalAddress")
                    .where("partyId", pId)
                    .filterByDate()
                    .queryFirst()
                if (postal) {
                    city = postal.city ?: ""
                    countryGeoId = postal.countryGeoId ?: ""
                }
            } catch (Exception ignored) {}

            // Identifications (VKN / TCKN)
            List identifications = []
            try {
                List<GenericValue> idGv = EntityQuery.use(delegator)
                    .from("PartyIdentification")
                    .where("partyId", pId)
                    .queryList()
                idGv.each { idItem ->
                    identifications.add([
                        partyIdentificationTypeId: idItem.partyIdentificationTypeId,
                        idValue: idItem.idValue
                    ])
                }
            } catch (Exception ignored) {}

            partyList.add([
                partyId: pId,
                partyTypeId: p.partyTypeId ?: "PARTY_GROUP",
                name: name,
                groupName: p.groupName,
                firstName: p.firstName,
                lastName: p.lastName,
                statusId: p.statusId ?: "PARTY_ENABLED",
                roles: roles,
                primaryPhone: phone,
                primaryEmail: email,
                city: city,
                countryGeoId: countryGeoId,
                identifications: identifications
            ])
        }

        Map metrics = [
            totalParties: totalParties,
            totalGroups: totalGroups,
            totalPersons: totalPersons,
            activeCustomers: activeCustomers,
            activeSuppliers: activeSuppliers
        ]

        request.setAttribute("partyList", partyList)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("metrics", metrics)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getParties: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. getPartyDetail
 * 360-degree party details including addresses, telecom, email, roles, IDs, relationships, and financial summary.
 */
String getPartyDetail() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId parametresi zorunludur.")
            return "error"
        }

        GenericValue party = EntityQuery.use(delegator).from("Party").where("partyId", partyId).queryOne()
        if (!party) {
            request.setAttribute("_ERROR_MESSAGE_", "Taraf bulunamadı: " + partyId)
            return "error"
        }

        String partyTypeId = party.partyTypeId ?: "PARTY_GROUP"
        Map personData = null
        Map groupData = null
        String displayName = partyId

        if ("PERSON".equals(partyTypeId)) {
            GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
            if (person) {
                personData = [
                    firstName: person.firstName ?: "",
                    lastName: person.lastName ?: "",
                    middleName: person.middleName ?: "",
                    personalTitle: person.personalTitle ?: "",
                    gender: person.gender ?: "",
                    birthDate: person.birthDate ? person.birthDate.toString() : ""
                ]
                displayName = ((person.firstName ?: "") + " " + (person.lastName ?: "")).trim()
            }
        } else {
            GenericValue group = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).queryOne()
            if (group) {
                groupData = [
                    groupName: group.groupName ?: "",
                    groupNameLocal: group.groupNameLocal ?: "",
                    officeSiteName: group.officeSiteName ?: "",
                    annualRevenue: group.annualRevenue != null ? group.annualRevenue.doubleValue() : null,
                    numEmployees: group.numEmployees != null ? group.numEmployees.longValue() : null,
                    comments: group.comments ?: ""
                ]
                displayName = group.groupName ?: partyId
            }
        }

        // Roles
        List<GenericValue> rolesGv = EntityQuery.use(delegator)
            .from("PartyRole")
            .where("partyId", partyId)
            .queryList()
        List roles = []
        rolesGv.each { r ->
            GenericValue rt = EntityQuery.use(delegator).from("RoleType").where("roleTypeId", r.roleTypeId).queryOne()
            roles.add([
                roleTypeId: r.roleTypeId,
                description: rt ? (rt.description ?: rt.roleTypeId) : r.roleTypeId
            ])
        }

        // Postal Addresses
        List<GenericValue> postalGv = EntityQuery.use(delegator)
            .from("PartyAndPostalAddress")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()
        List postalAddresses = []
        postalGv.each { pa ->
            // Fetch purpose
            GenericValue purpose = EntityQuery.use(delegator)
                .from("PartyContactMechPurpose")
                .where("partyId", partyId, "contactMechId", pa.contactMechId)
                .filterByDate()
                .queryFirst()
            String purposeDesc = purpose ? purpose.contactMechPurposeTypeId : "GENERAL_LOCATION"

            postalAddresses.add([
                contactMechId: pa.contactMechId,
                toName: pa.toName ?: "",
                attnName: pa.attnName ?: "",
                address1: pa.address1 ?: "",
                address2: pa.address2 ?: "",
                city: pa.city ?: "",
                postalCode: pa.postalCode ?: "",
                countryGeoId: pa.countryGeoId ?: "",
                stateProvinceGeoId: pa.stateProvinceGeoId ?: "",
                purposeTypeId: purposeDesc
            ])
        }

        // Telecom Numbers
        List<GenericValue> telecomGv = EntityQuery.use(delegator)
            .from("PartyAndTelecomNumber")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()
        List telecomNumbers = []
        telecomGv.each { tn ->
            GenericValue purpose = EntityQuery.use(delegator)
                .from("PartyContactMechPurpose")
                .where("partyId", partyId, "contactMechId", tn.contactMechId)
                .filterByDate()
                .queryFirst()
            String purposeDesc = purpose ? purpose.contactMechPurposeTypeId : "PRIMARY_PHONE"

            String fullNumber = (tn.countryCode ? ("+" + tn.countryCode + " ") : "") +
                                (tn.areaCode ? (tn.areaCode + " ") : "") +
                                (tn.contactNumber ?: "")

            telecomNumbers.add([
                contactMechId: tn.contactMechId,
                countryCode: tn.countryCode ?: "",
                areaCode: tn.areaCode ?: "",
                contactNumber: tn.contactNumber ?: "",
                fullNumber: fullNumber.trim(),
                purposeTypeId: purposeDesc
            ])
        }

        // Email Addresses and Web URLs
        List<GenericValue> otherContactGv = EntityQuery.use(delegator)
            .from("PartyAndContactMech")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()
        List emailAddresses = []
        otherContactGv.each { cm ->
            if ("EMAIL_ADDRESS".equals(cm.contactMechTypeId)) {
                GenericValue purpose = EntityQuery.use(delegator)
                    .from("PartyContactMechPurpose")
                    .where("partyId", partyId, "contactMechId", cm.contactMechId)
                    .filterByDate()
                    .queryFirst()
                String purposeDesc = purpose ? purpose.contactMechPurposeTypeId : "PRIMARY_EMAIL"

                emailAddresses.add([
                    contactMechId: cm.contactMechId,
                    emailAddress: cm.infoString ?: "",
                    purposeTypeId: purposeDesc
                ])
            }
        }

        // Identifications (VKN / TCKN)
        List<GenericValue> idGv = EntityQuery.use(delegator)
            .from("PartyIdentification")
            .where("partyId", partyId)
            .queryList()
        List identifications = []
        idGv.each { idItem ->
            GenericValue idTypeGv = EntityQuery.use(delegator)
                .from("PartyIdentificationType")
                .where("partyIdentificationTypeId", idItem.partyIdentificationTypeId)
                .queryOne()
            identifications.add([
                partyIdentificationTypeId: idItem.partyIdentificationTypeId,
                typeDescription: idTypeGv ? (idTypeGv.description ?: idItem.partyIdentificationTypeId) : idItem.partyIdentificationTypeId,
                idValue: idItem.idValue
            ])
        }

        // Relationships (Contacts, parent-subsidiary, manager, employee)
        List relationships = []
        try {
            EntityCondition relCond = EntityCondition.makeCondition([
                EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId),
                EntityCondition.makeCondition("partyIdTo", EntityOperator.EQUALS, partyId)
            ], EntityOperator.OR)

            List<GenericValue> relsGv = EntityQuery.use(delegator)
                .from("PartyRelationship")
                .where(relCond)
                .filterByDate()
                .queryList()

            relsGv.each { rel ->
                String fromName = getPartyDisplayName(delegator, rel.partyIdFrom)
                String toName = getPartyDisplayName(delegator, rel.partyIdTo)
                relationships.add([
                    partyIdFrom: rel.partyIdFrom,
                    partyIdTo: rel.partyIdTo,
                    partyNameFrom: fromName,
                    partyNameTo: toName,
                    roleTypeIdFrom: rel.roleTypeIdFrom,
                    roleTypeIdTo: rel.roleTypeIdTo,
                    partyRelationshipTypeId: rel.partyRelationshipTypeId ?: "RELATIONSHIP",
                    fromDate: rel.fromDate ? rel.fromDate.toString() : "",
                    comments: rel.comments ?: ""
                ])
            }
        } catch (Exception ignored) {}

        // Financial quick summary
        long invoiceCount = 0
        long paymentCount = 0
        try {
            EntityCondition invCond = EntityCondition.makeCondition([
                EntityCondition.makeCondition("partyId", EntityOperator.EQUALS, partyId),
                EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId)
            ], EntityOperator.OR)
            invoiceCount = EntityQuery.use(delegator).from("Invoice").where(invCond).queryCount()

            EntityCondition payCond = EntityCondition.makeCondition([
                EntityCondition.makeCondition("partyIdTo", EntityOperator.EQUALS, partyId),
                EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId)
            ], EntityOperator.OR)
            paymentCount = EntityQuery.use(delegator).from("Payment").where(payCond).queryCount()
        } catch (Exception ignored) {}

        Map partyDetail = [
            partyId: partyId,
            partyTypeId: partyTypeId,
            displayName: displayName,
            statusId: party.statusId ?: "PARTY_ENABLED",
            createdDate: party.createdDate ? party.createdDate.toString() : "",
            description: party.description ?: "",
            preferredCurrencyUomId: party.preferredCurrencyUomId ?: "TRY",
            person: personData,
            group: groupData,
            roles: roles,
            postalAddresses: postalAddresses,
            telecomNumbers: telecomNumbers,
            emailAddresses: emailAddresses,
            identifications: identifications,
            relationships: relationships,
            financialSummary: [
                invoiceCount: invoiceCount,
                paymentCount: paymentCount
            ]
        ]

        request.setAttribute("partyDetail", partyDetail)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

String getPartyDisplayName(def delegator, String partyId) {
    if (!partyId) return ""
    try {
        GenericValue group = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).queryOne()
        if (group && group.groupName) return group.groupName
        GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
        if (person) {
            return ((person.firstName ?: "") + " " + (person.lastName ?: "")).trim()
        }
    } catch (Exception ignored) {}
    return partyId
}

/**
 * 4. createParty
 * Creates Person or PartyGroup, assigns roles, and saves initial contact & tax info.
 */
String createParty() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyTypeId = parameters.partyTypeId?.trim() ?: "PARTY_GROUP"
        String customPartyId = parameters.partyId?.trim()
        String statusId = parameters.statusId?.trim() ?: "PARTY_ENABLED"
        String partyId = null

        if ("PERSON".equals(partyTypeId)) {
            String firstName = parameters.firstName?.trim()
            String lastName = parameters.lastName?.trim()
            if (UtilValidate.isEmpty(firstName) || UtilValidate.isEmpty(lastName)) {
                request.setAttribute("_ERROR_MESSAGE_", "Şahıs için Ad ve Soyad zorunludur.")
                return "error"
            }

            Map personCtx = [
                userLogin: uL,
                firstName: firstName,
                lastName: lastName,
                personalTitle: parameters.personalTitle?.trim(),
                gender: parameters.gender?.trim(),
                statusId: statusId
            ]
            if (UtilValidate.isNotEmpty(customPartyId)) {
                personCtx.partyId = customPartyId
            }
            if (UtilValidate.isNotEmpty(parameters.birthDate)) {
                try {
                    personCtx.birthDate = java.sql.Date.valueOf(parameters.birthDate.toString().substring(0, 10))
                } catch (Exception ignored) {}
            }

            Map res = dispatcher.runSync("createPerson", personCtx)
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
            partyId = res.partyId
        } else {
            String groupName = parameters.groupName?.trim()
            if (UtilValidate.isEmpty(groupName)) {
                request.setAttribute("_ERROR_MESSAGE_", "Kurumsal cari için Şirket / Kurum Ünvanı zorunludur.")
                return "error"
            }

            Map groupCtx = [
                userLogin: uL,
                groupName: groupName,
                groupNameLocal: parameters.groupNameLocal?.trim(),
                officeSiteName: parameters.officeSiteName?.trim(),
                comments: parameters.comments?.trim(),
                statusId: statusId
            ]
            if (UtilValidate.isNotEmpty(customPartyId)) {
                groupCtx.partyId = customPartyId
            }

            Map res = dispatcher.runSync("createPartyGroup", groupCtx)
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
            partyId = res.partyId
        }

        // Roles assignment
        List roleList = []
        if (parameters.roleTypeIds instanceof List) {
            roleList.addAll((List) parameters.roleTypeIds)
        } else if (parameters.roleTypeId) {
            roleList.add(parameters.roleTypeId.toString().trim())
        }

        roleList.each { roleId ->
            if (UtilValidate.isNotEmpty(roleId)) {
                try {
                    dispatcher.runSync("ensurePartyRole", [
                        userLogin: uL,
                        partyId: partyId,
                        roleTypeId: roleId.toString().trim()
                    ])
                } catch (Exception e) {
                    Debug.logWarning("Could not assign role: " + roleId + " to party: " + partyId, MODULE)
                }
            }
        }

        // Optional Email
        if (UtilValidate.isNotEmpty(parameters.emailAddress)) {
            try {
                dispatcher.runSync("createPartyEmailAddress", [
                    userLogin: uL,
                    partyId: partyId,
                    emailAddress: parameters.emailAddress.toString().trim(),
                    contactMechPurposeTypeId: parameters.emailPurposeTypeId ?: "PRIMARY_EMAIL"
                ])
            } catch (Exception e) {
                Debug.logWarning("Could not save initial email: " + e.getMessage(), MODULE)
            }
        }

        // Optional Telecom
        if (UtilValidate.isNotEmpty(parameters.contactNumber)) {
            try {
                dispatcher.runSync("createPartyTelecomNumber", [
                    userLogin: uL,
                    partyId: partyId,
                    countryCode: parameters.countryCode ?: "90",
                    areaCode: parameters.areaCode ?: "",
                    contactNumber: parameters.contactNumber.toString().trim(),
                    contactMechPurposeTypeId: parameters.phonePurposeTypeId ?: "PRIMARY_PHONE"
                ])
            } catch (Exception e) {
                Debug.logWarning("Could not save initial phone: " + e.getMessage(), MODULE)
            }
        }

        // Optional Postal Address
        if (UtilValidate.isNotEmpty(parameters.address1)) {
            try {
                dispatcher.runSync("createPartyPostalAddress", [
                    userLogin: uL,
                    partyId: partyId,
                    address1: parameters.address1.toString().trim(),
                    address2: parameters.address2 ? parameters.address2.toString().trim() : "",
                    city: parameters.city ? parameters.city.toString().trim() : "",
                    postalCode: parameters.postalCode ? parameters.postalCode.toString().trim() : "",
                    countryGeoId: parameters.countryGeoId ? parameters.countryGeoId.toString().trim() : "TUR",
                    contactMechPurposeTypeId: parameters.addressPurposeTypeId ?: "GENERAL_LOCATION"
                ])
            } catch (Exception e) {
                Debug.logWarning("Could not save initial address: " + e.getMessage(), MODULE)
            }
        }

        // Optional Tax / ID Number (VKN or TCKN)
        if (UtilValidate.isNotEmpty(parameters.idValue)) {
            String idTypeId = parameters.partyIdentificationTypeId ?: ("PERSON".equals(partyTypeId) ? "TCKN" : "VKN")
            try {
                dispatcher.runSync("createPartyIdentification", [
                    userLogin: uL,
                    partyId: partyId,
                    partyIdentificationTypeId: idTypeId,
                    idValue: parameters.idValue.toString().trim()
                ])
            } catch (Exception e) {
                Debug.logWarning("Could not save identification: " + e.getMessage(), MODULE)
            }
        }

        request.setAttribute("partyId", partyId)
        request.setAttribute("message", "Cari başarıyla oluşturuldu: " + partyId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createParty: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. updateParty
 * Updates Person or PartyGroup attributes and optionally updates status.
 */
String updateParty() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId parametresi zorunludur.")
            return "error"
        }

        GenericValue party = EntityQuery.use(delegator).from("Party").where("partyId", partyId).queryOne()
        if (!party) {
            request.setAttribute("_ERROR_MESSAGE_", "Taraf bulunamadı: " + partyId)
            return "error"
        }

        String partyTypeId = party.partyTypeId ?: "PARTY_GROUP"

        if ("PERSON".equals(partyTypeId)) {
            Map personCtx = [
                userLogin: uL,
                partyId: partyId,
                firstName: parameters.firstName?.trim(),
                lastName: parameters.lastName?.trim(),
                personalTitle: parameters.personalTitle?.trim(),
                gender: parameters.gender?.trim()
            ]
            if (UtilValidate.isNotEmpty(parameters.birthDate)) {
                try {
                    personCtx.birthDate = java.sql.Date.valueOf(parameters.birthDate.toString().substring(0, 10))
                } catch (Exception ignored) {}
            }

            Map res = dispatcher.runSync("updatePerson", personCtx)
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
        } else {
            Map groupCtx = [
                userLogin: uL,
                partyId: partyId,
                groupName: parameters.groupName?.trim(),
                groupNameLocal: parameters.groupNameLocal?.trim(),
                officeSiteName: parameters.officeSiteName?.trim(),
                comments: parameters.comments?.trim()
            ]

            Map res = dispatcher.runSync("updatePartyGroup", groupCtx)
            if (ServiceUtil.isError(res)) {
                request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
                return "error"
            }
        }

        // Status change if provided
        if (UtilValidate.isNotEmpty(parameters.statusId) && !parameters.statusId.equals(party.statusId)) {
            dispatcher.runSync("setPartyStatus", [
                userLogin: uL,
                partyId: partyId,
                statusId: parameters.statusId.trim()
            ])
        }

        request.setAttribute("partyId", partyId)
        request.setAttribute("message", "Cari başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateParty: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. setPartyStatus
 * Enables or disables party.
 */
String setPartyStatus() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String statusId = parameters.statusId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(statusId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve statusId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("setPartyStatus", [
            userLogin: uL,
            partyId: partyId,
            statusId: statusId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("partyId", partyId)
        request.setAttribute("statusId", statusId)
        request.setAttribute("message", "Cari durumu başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setPartyStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. addPartyRole
 */
String addPartyRole() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(roleTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve roleTypeId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("ensurePartyRole", [
            userLogin: uL,
            partyId: partyId,
            roleTypeId: roleTypeId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("partyId", partyId)
        request.setAttribute("roleTypeId", roleTypeId)
        request.setAttribute("message", "Rol başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addPartyRole: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. deletePartyRole
 */
String deletePartyRole() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String roleTypeId = parameters.roleTypeId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(roleTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve roleTypeId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("deletePartyRole", [
            userLogin: uL,
            partyId: partyId,
            roleTypeId: roleTypeId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("partyId", partyId)
        request.setAttribute("roleTypeId", roleTypeId)
        request.setAttribute("message", "Rol başarıyla kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyRole: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 9. createPartyPostalAddress
 */
String createPartyPostalAddress() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String address1 = parameters.address1?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(address1)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve address1 alanları zorunludur.")
            return "error"
        }

        Map addrCtx = [
            userLogin: uL,
            partyId: partyId,
            toName: parameters.toName?.trim(),
            attnName: parameters.attnName?.trim(),
            address1: address1,
            address2: parameters.address2?.trim(),
            city: parameters.city?.trim() ?: "",
            postalCode: parameters.postalCode?.trim() ?: "",
            countryGeoId: parameters.countryGeoId?.trim() ?: "TUR",
            stateProvinceGeoId: parameters.stateProvinceGeoId?.trim(),
            contactMechPurposeTypeId: parameters.contactMechPurposeTypeId?.trim() ?: "GENERAL_LOCATION"
        ]

        Map res = dispatcher.runSync("createPartyPostalAddress", addrCtx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("contactMechId", res.contactMechId)
        request.setAttribute("message", "Adres başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyPostalAddress: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 10. createPartyTelecomNumber
 */
String createPartyTelecomNumber() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String contactNumber = parameters.contactNumber?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(contactNumber)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve contactNumber alanları zorunludur.")
            return "error"
        }

        Map telCtx = [
            userLogin: uL,
            partyId: partyId,
            countryCode: parameters.countryCode?.trim() ?: "90",
            areaCode: parameters.areaCode?.trim() ?: "",
            contactNumber: contactNumber,
            contactMechPurposeTypeId: parameters.contactMechPurposeTypeId?.trim() ?: "PRIMARY_PHONE"
        ]

        Map res = dispatcher.runSync("createPartyTelecomNumber", telCtx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("contactMechId", res.contactMechId)
        request.setAttribute("message", "Telefon numarası başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyTelecomNumber: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 11. createPartyEmailAddress
 */
String createPartyEmailAddress() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String emailAddress = parameters.emailAddress?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(emailAddress)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve emailAddress alanları zorunludur.")
            return "error"
        }

        Map emailCtx = [
            userLogin: uL,
            partyId: partyId,
            emailAddress: emailAddress,
            contactMechPurposeTypeId: parameters.contactMechPurposeTypeId?.trim() ?: "PRIMARY_EMAIL"
        ]

        Map res = dispatcher.runSync("createPartyEmailAddress", emailCtx)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("contactMechId", res.contactMechId)
        request.setAttribute("message", "E-posta adresi başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyEmailAddress: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 12. deletePartyContactMech
 */
String deletePartyContactMech() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String contactMechId = parameters.contactMechId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(contactMechId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve contactMechId alanları zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("deletePartyContactMech", [
            userLogin: uL,
            partyId: partyId,
            contactMechId: contactMechId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("contactMechId", contactMechId)
        request.setAttribute("message", "İletişim bilgisi başarıyla silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyContactMech: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 13. createPartyIdentification
 */
String createPartyIdentification() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String idTypeId = parameters.partyIdentificationTypeId?.trim()
        String idValue = parameters.idValue?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(idTypeId) || UtilValidate.isEmpty(idValue)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId, partyIdentificationTypeId ve idValue zorunludur.")
            return "error"
        }

        // Ensure type exists
        GenericValue typeGv = EntityQuery.use(delegator).from("PartyIdentificationType").where("partyIdentificationTypeId", idTypeId).queryOne()
        if (!typeGv) {
            delegator.create(delegator.makeValue("PartyIdentificationType", [
                partyIdentificationTypeId: idTypeId,
                description: idTypeId
            ]))
        }

        Map res = dispatcher.runSync("createPartyIdentification", [
            userLogin: uL,
            partyId: partyId,
            partyIdentificationTypeId: idTypeId,
            idValue: idValue
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("partyId", partyId)
        request.setAttribute("partyIdentificationTypeId", idTypeId)
        request.setAttribute("idValue", idValue)
        request.setAttribute("message", "Kimlik/Vergi bilgisi başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyIdentification: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 14. deletePartyIdentification
 */
String deletePartyIdentification() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String idTypeId = parameters.partyIdentificationTypeId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(idTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve partyIdentificationTypeId zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("deletePartyIdentification", [
            userLogin: uL,
            partyId: partyId,
            partyIdentificationTypeId: idTypeId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("message", "Kimlik/Vergi bilgisi başarıyla silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyIdentification: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 15. createPartyRelationship
 */
String createPartyRelationship() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyIdFrom = parameters.partyIdFrom?.trim()
        String partyIdTo = parameters.partyIdTo?.trim()
        String relTypeId = parameters.partyRelationshipTypeId?.trim() ?: "CONTACT_REL"

        if (UtilValidate.isEmpty(partyIdFrom) || UtilValidate.isEmpty(partyIdTo)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyIdFrom ve partyIdTo zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("createPartyRelationship", [
            userLogin: uL,
            partyIdFrom: partyIdFrom,
            partyIdTo: partyIdTo,
            roleTypeIdFrom: parameters.roleTypeIdFrom?.trim() ?: "_NA_",
            roleTypeIdTo: parameters.roleTypeIdTo?.trim() ?: "_NA_",
            partyRelationshipTypeId: relTypeId,
            comments: parameters.comments?.trim()
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("message", "Taraf ilişkisi başarıyla kuruldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyRelationship: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Helper to ensure common classification groups exist for segmentation
 */
void ensureDefaultClassificationGroups(def delegator) {
    try {
        List defaultGroups = [
            [partyClassificationGroupId: "VIP_CUSTOMER", partyClassificationTypeId: "ORGANIZATION_CLASSIF", description: "VIP / Stratejik Müşteri"],
            [partyClassificationGroupId: "WHOLESALE", partyClassificationTypeId: "TRADE_WHOLE_CLASSIFI", description: "Toptan / Distribütör"],
            [partyClassificationGroupId: "RETAIL", partyClassificationTypeId: "TRADE_RETAIL_CLASSIF", description: "Perakende Müşteri"],
            [partyClassificationGroupId: "KEY_SUPPLIER", partyClassificationTypeId: "ORGANIZATION_CLASSIF", description: "Stratejik Tedarikçi"],
            [partyClassificationGroupId: "HIGH_RISK", partyClassificationTypeId: "VALUE_RATING", description: "Yüksek Risk Grubu"],
            [partyClassificationGroupId: "LOW_RISK", partyClassificationTypeId: "VALUE_RATING", description: "Düşük Risk / Güvenilir"]
        ]
        for (Map grp : defaultGroups) {
            GenericValue existing = EntityQuery.use(delegator)
                .from("PartyClassificationGroup")
                .where("partyClassificationGroupId", grp.partyClassificationGroupId)
                .queryOne()
            if (!existing) {
                GenericValue newGrp = delegator.makeValue("PartyClassificationGroup", grp)
                newGrp.create()
            }
        }
    } catch (Exception e) {
        Debug.logWarning("Could not seed default classification groups: " + e.getMessage(), MODULE)
    }
}

/**
 * 16. getPartyFinancialProfile
 * Returns credit limit, billing accounts, open receivables/payables, risk metrics, payment terms, tax auth, classifications, notes.
 */
String getPartyFinancialProfile() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId parametresi zorunludur.")
            return "error"
        }

        // 1. Seed common classification groups if missing
        ensureDefaultClassificationGroups(delegator)

        // 2. Billing Accounts & Credit Limit
        List billingAccountRoles = EntityQuery.use(delegator)
            .from("BillingAccountRole")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()

        List billingAccounts = []
        BigDecimal totalCreditLimit = BigDecimal.ZERO
        BigDecimal totalAccountBalance = BigDecimal.ZERO

        for (GenericValue bar : billingAccountRoles) {
            GenericValue ba = EntityQuery.use(delegator)
                .from("BillingAccount")
                .where("billingAccountId", bar.getString("billingAccountId"))
                .queryOne()
            if (ba) {
                BigDecimal limit = ba.getBigDecimal("accountLimit") ?: BigDecimal.ZERO
                BigDecimal available = limit
                try {
                    available = OrderReadHelper.getBillingAccountBalance(ba) ?: limit
                } catch (Exception e) {
                    available = limit
                }
                BigDecimal balance = limit.subtract(available)
                if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO

                totalCreditLimit = totalCreditLimit.add(limit)
                totalAccountBalance = totalAccountBalance.add(balance)

                billingAccounts.add([
                    billingAccountId: ba.getString("billingAccountId"),
                    accountLimit: limit,
                    accountBalance: balance,
                    availableBalance: available,
                    accountCurrencyUomId: ba.getString("accountCurrencyUomId") ?: "TRY",
                    description: ba.getString("description") ?: "",
                    fromDate: ba.getTimestamp("fromDate")?.toString(),
                    thruDate: ba.getTimestamp("thruDate")?.toString(),
                    roleTypeId: bar.getString("roleTypeId")
                ])
            }
        }

        // 3. Outstanding Invoices & Receivables / Payables
        List salesInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(
                EntityCondition.makeCondition("partyId", EntityOperator.EQUALS, partyId),
                EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "SALES_INVOICE"),
                EntityCondition.makeCondition("statusId", EntityOperator.IN, ["INVOICE_SENT", "INVOICE_APPROVED", "INVOICE_READY"])
            )
            .queryList()

        BigDecimal totalReceivableOutstanding = BigDecimal.ZERO
        for (GenericValue inv : salesInvoices) {
            BigDecimal outstanding = BigDecimal.ZERO
            try {
                outstanding = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO
            } catch (Exception e) {
                outstanding = inv.getBigDecimal("outstandingAmount") ?: BigDecimal.ZERO
            }
            totalReceivableOutstanding = totalReceivableOutstanding.add(outstanding)
        }

        List purchaseInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(
                EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId),
                EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "PURCHASE_INVOICE"),
                EntityCondition.makeCondition("statusId", EntityOperator.IN, ["INVOICE_SENT", "INVOICE_APPROVED", "INVOICE_READY"])
            )
            .queryList()

        BigDecimal totalPayableOutstanding = BigDecimal.ZERO
        for (GenericValue inv : purchaseInvoices) {
            BigDecimal outstanding = BigDecimal.ZERO
            try {
                outstanding = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO
            } catch (Exception e) {
                outstanding = inv.getBigDecimal("outstandingAmount") ?: BigDecimal.ZERO
            }
            totalPayableOutstanding = totalPayableOutstanding.add(outstanding)
        }

        BigDecimal netExposure = totalReceivableOutstanding.subtract(totalPayableOutstanding)

        String riskLevel = "NO_LIMIT"
        BigDecimal utilizationPercent = BigDecimal.ZERO
        if (totalCreditLimit.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercent = totalReceivableOutstanding.divide(totalCreditLimit, 4, BigDecimal.ROUND_HALF_UP).multiply(new BigDecimal("100"))
            if (utilizationPercent.compareTo(new BigDecimal("100")) >= 0) {
                riskLevel = "EXCEEDED"
            } else if (utilizationPercent.compareTo(new BigDecimal("75")) >= 0) {
                riskLevel = "WARNING"
            } else {
                riskLevel = "SAFE"
            }
        }

        // 4. Payment Terms & Agreements
        List agreements = EntityQuery.use(delegator)
            .from("Agreement")
            .where(
                EntityCondition.makeCondition([
                    EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, partyId),
                    EntityCondition.makeCondition("partyIdTo", EntityOperator.EQUALS, partyId)
                ], EntityOperator.OR)
            )
            .filterByDate()
            .queryList()

        List paymentTerms = []
        for (GenericValue agr : agreements) {
            List terms = EntityQuery.use(delegator)
                .from("AgreementTerm")
                .where("agreementId", agr.getString("agreementId"))
                .queryList()
            for (GenericValue term : terms) {
                GenericValue tt = EntityQuery.use(delegator)
                    .from("TermType")
                    .where("termTypeId", term.getString("termTypeId"))
                    .cache()
                    .queryOne()
                paymentTerms.add([
                    agreementId: agr.getString("agreementId"),
                    agreementTermId: term.getString("agreementTermId"),
                    termTypeId: term.getString("termTypeId"),
                    termTypeDescription: tt?.getString("description") ?: term.getString("termTypeId"),
                    termValue: term.getBigDecimal("termValue"),
                    termDays: term.getLong("termDays"),
                    textValue: term.getString("textValue"),
                    description: term.getString("description") ?: agr.getString("description") ?: ""
                ])
            }
        }

        // 5. Tax Auth Info
        List taxAuthInfos = EntityQuery.use(delegator)
            .from("PartyTaxAuthInfo")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()
            .collect { GenericValue tai ->
                [
                    taxAuthGeoId: tai.getString("taxAuthGeoId"),
                    taxAuthPartyId: tai.getString("taxAuthPartyId"),
                    partyTaxId: tai.getString("partyTaxId") ?: "",
                    isExempt: tai.getString("isExempt") ?: "N",
                    isNexus: tai.getString("isNexus") ?: "N",
                    fromDate: tai.getTimestamp("fromDate")?.toString(),
                    thruDate: tai.getTimestamp("thruDate")?.toString()
                ]
            }

        // 6. Party Classifications (Segments)
        List partyClassifications = EntityQuery.use(delegator)
            .from("PartyClassification")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()
            .collect { GenericValue pc ->
                GenericValue group = EntityQuery.use(delegator)
                    .from("PartyClassificationGroup")
                    .where("partyClassificationGroupId", pc.getString("partyClassificationGroupId"))
                    .cache()
                    .queryOne()
                [
                    partyClassificationGroupId: pc.getString("partyClassificationGroupId"),
                    description: group?.getString("description") ?: pc.getString("partyClassificationGroupId"),
                    classificationTypeId: group?.getString("partyClassificationTypeId") ?: "",
                    fromDate: pc.getTimestamp("fromDate")?.toString(),
                    thruDate: pc.getTimestamp("thruDate")?.toString()
                ]
            }

        // 7. Party Notes
        List partyNotes = EntityQuery.use(delegator)
            .from("PartyNoteView")
            .where("targetPartyId", partyId)
            .orderBy("-noteDateTime")
            .queryList()
            .collect { GenericValue n ->
                [
                    noteId: n.getString("noteId"),
                    noteName: n.getString("noteName") ?: "",
                    noteInfo: n.getString("noteInfo") ?: "",
                    noteDateTime: n.getTimestamp("noteDateTime")?.toString(),
                    noteParty: n.getString("noteParty") ?: ""
                ]
            }

        // Master Reference Data
        List availableGroups = EntityQuery.use(delegator)
            .from("PartyClassificationGroup")
            .orderBy("description")
            .queryList()
            .collect { GenericValue g ->
                [
                    partyClassificationGroupId: g.getString("partyClassificationGroupId"),
                    description: g.getString("description") ?: g.getString("partyClassificationGroupId"),
                    partyClassificationTypeId: g.getString("partyClassificationTypeId") ?: ""
                ]
            }

        List availableTermTypes = EntityQuery.use(delegator)
            .from("TermType")
            .where(EntityCondition.makeCondition("parentTypeId", EntityOperator.IN, ["FINANCIAL_TERM", "FIN_PAYMENT_TERM", null]))
            .orderBy("description")
            .queryList()
            .collect { GenericValue tt ->
                [
                    termTypeId: tt.getString("termTypeId"),
                    description: tt.getString("description") ?: tt.getString("termTypeId")
                ]
            }

        request.setAttribute("financialProfile", [
            partyId: partyId,
            billingAccounts: billingAccounts,
            totalCreditLimit: totalCreditLimit,
            totalAccountBalance: totalAccountBalance,
            totalReceivableOutstanding: totalReceivableOutstanding,
            totalPayableOutstanding: totalPayableOutstanding,
            netExposure: netExposure,
            utilizationPercent: utilizationPercent,
            riskLevel: riskLevel,
            paymentTerms: paymentTerms,
            taxAuthInfos: taxAuthInfos,
            classifications: partyClassifications,
            notes: partyNotes,
            availableGroups: availableGroups,
            availableTermTypes: availableTermTypes
        ])

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyFinancialProfile: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 17. savePartyFinancialProfile
 * Updates or creates a BillingAccount and attaches it as BILL_TO_CUSTOMER
 */
String savePartyFinancialProfile() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId zorunludur.")
            return "error"
        }

        String billingAccountId = parameters.billingAccountId?.trim()
        BigDecimal accountLimit = parameters.accountLimit != null && !parameters.accountLimit.toString().trim().isEmpty() ? new BigDecimal(parameters.accountLimit.toString().trim()) : BigDecimal.ZERO
        String currencyUomId = parameters.accountCurrencyUomId?.trim() ?: "TRY"
        String description = parameters.description?.trim() ?: "Cari Kredili Açık Hesap"

        if (UtilValidate.isNotEmpty(billingAccountId)) {
            GenericValue ba = EntityQuery.use(delegator)
                .from("BillingAccount")
                .where("billingAccountId", billingAccountId)
                .queryOne()
            if (ba) {
                ba.set("accountLimit", accountLimit)
                ba.set("accountCurrencyUomId", currencyUomId)
                ba.set("description", description)
                ba.store()
                request.setAttribute("billingAccountId", billingAccountId)
                request.setAttribute("message", "Cari kredi limiti ve hesap koşulları güncellendi.")
                return "success"
            }
        }

        // Create new BillingAccount
        String newBaId = delegator.getNextSeqId("BillingAccount")
        GenericValue newBa = delegator.makeValue("BillingAccount", [
            billingAccountId: newBaId,
            accountLimit: accountLimit,
            accountCurrencyUomId: currencyUomId,
            description: description,
            fromDate: UtilDateTime.nowTimestamp()
        ])
        newBa.create()

        // Ensure PartyRole BILL_TO_CUSTOMER exists for this party
        GenericValue pr = EntityQuery.use(delegator)
            .from("PartyRole")
            .where("partyId", partyId, "roleTypeId", "BILL_TO_CUSTOMER")
            .queryOne()
        if (!pr) {
            delegator.makeValue("PartyRole", [partyId: partyId, roleTypeId: "BILL_TO_CUSTOMER"]).create()
        }

        // Create BillingAccountRole
        GenericValue bar = delegator.makeValue("BillingAccountRole", [
            billingAccountId: newBaId,
            partyId: partyId,
            roleTypeId: "BILL_TO_CUSTOMER",
            fromDate: UtilDateTime.nowTimestamp()
        ])
        bar.create()

        request.setAttribute("billingAccountId", newBaId)
        request.setAttribute("message", "Cariye yeni kredi hesabı başarıyla tanımlandı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in savePartyFinancialProfile: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 18. createPartyNote
 * Creates an internal CRM / audit note for a party
 */
String createPartyNote() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String noteInfo = parameters.noteInfo?.trim() ?: parameters.note?.trim()
        String noteName = parameters.noteName?.trim() ?: "Cari Görüşme / Dahili Not"

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(noteInfo)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve noteInfo zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("createPartyNote", [
            userLogin: uL,
            partyId: partyId,
            noteName: noteName,
            note: noteInfo
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("noteId", res.noteId)
        request.setAttribute("message", "Cari notu başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyNote: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 19. addPartyClassification
 * Adds a classification group (tag/segment) to a party
 */
String addPartyClassification() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String groupId = parameters.partyClassificationGroupId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(groupId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve partyClassificationGroupId zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator)
            .from("PartyClassification")
            .where("partyId", partyId, "partyClassificationGroupId", groupId)
            .filterByDate()
            .queryFirst()

        if (existing) {
            request.setAttribute("message", "Bu cari zaten seçili segment/etiket grubuna dahil.")
            return "success"
        }

        GenericValue pc = delegator.makeValue("PartyClassification", [
            partyId: partyId,
            partyClassificationGroupId: groupId,
            fromDate: UtilDateTime.nowTimestamp()
        ])
        pc.create()

        request.setAttribute("message", "Cari segmenti başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addPartyClassification: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 20. deletePartyClassification
 * Expires or deletes a party classification
 */
String deletePartyClassification() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String groupId = parameters.partyClassificationGroupId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(groupId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve partyClassificationGroupId zorunludur.")
            return "error"
        }

        List list = EntityQuery.use(delegator)
            .from("PartyClassification")
            .where("partyId", partyId, "partyClassificationGroupId", groupId)
            .filterByDate()
            .queryList()

        for (GenericValue pc : list) {
            pc.set("thruDate", UtilDateTime.nowTimestamp())
            pc.store()
        }

        request.setAttribute("message", "Cari segmenti kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyClassification: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 21. setPartyTaxAuthInfo
 * Sets or updates tax authority and exemption settings for a party
 */
String setPartyTaxAuthInfo() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String taxAuthGeoId = parameters.taxAuthGeoId?.trim() ?: "_NA_"
        String taxAuthPartyId = parameters.taxAuthPartyId?.trim() ?: "_NA_"
        String partyTaxId = parameters.partyTaxId?.trim() ?: ""
        String isExempt = "Y".equalsIgnoreCase(parameters.isExempt?.toString()?.trim()) ? "Y" : "N"

        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator)
            .from("PartyTaxAuthInfo")
            .where("partyId", partyId, "taxAuthGeoId", taxAuthGeoId, "taxAuthPartyId", taxAuthPartyId)
            .filterByDate()
            .queryFirst()

        if (existing) {
            existing.set("partyTaxId", partyTaxId)
            existing.set("isExempt", isExempt)
            existing.store()
        } else {
            GenericValue newTai = delegator.makeValue("PartyTaxAuthInfo", [
                partyId: partyId,
                taxAuthGeoId: taxAuthGeoId,
                taxAuthPartyId: taxAuthPartyId,
                fromDate: UtilDateTime.nowTimestamp(),
                partyTaxId: partyTaxId,
                isExempt: isExempt,
                isNexus: "Y"
            ])
            newTai.create()
        }

        request.setAttribute("message", "Vergi dairesi ve muafiyet bilgisi kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in setPartyTaxAuthInfo: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 22. createPartyPaymentTerm
 * Sets up a payment term (e.g. Net 30, discount, etc.) for a party
 */
String createPartyPaymentTerm() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String termTypeId = parameters.termTypeId?.trim()
        Long termDays = parameters.termDays ? Long.valueOf(parameters.termDays.toString().trim()) : null
        BigDecimal termValue = parameters.termValue ? new BigDecimal(parameters.termValue.toString().trim()) : null
        String description = parameters.description?.trim() ?: "Cari Vade ve Ödeme Şartı"

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(termTypeId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve termTypeId zorunludur.")
            return "error"
        }

        // Find or create Agreement for this party
        GenericValue agr = EntityQuery.use(delegator)
            .from("Agreement")
            .where(
                EntityCondition.makeCondition("partyIdTo", EntityOperator.EQUALS, partyId),
                EntityCondition.makeCondition("agreementTypeId", EntityOperator.EQUALS, "SALES_AGREEMENT")
            )
            .filterByDate()
            .queryFirst()

        String agreementId = agr ? agr.getString("agreementId") : null
        if (!agreementId) {
            agreementId = delegator.getNextSeqId("Agreement")
            GenericValue newAgr = delegator.makeValue("Agreement", [
                agreementId: agreementId,
                partyIdFrom: "Company",
                partyIdTo: partyId,
                agreementTypeId: "SALES_AGREEMENT",
                fromDate: UtilDateTime.nowTimestamp(),
                description: "Cari Finansal Şartlar ve Vade Sözleşmesi"
            ])
            newAgr.create()
        }

        String agreementTermId = delegator.getNextSeqId("AgreementTerm")
        GenericValue newTerm = delegator.makeValue("AgreementTerm", [
            agreementTermId: agreementTermId,
            agreementId: agreementId,
            termTypeId: termTypeId,
            termDays: termDays,
            termValue: termValue,
            description: description,
            fromDate: UtilDateTime.nowTimestamp()
        ])
        newTerm.create()

        request.setAttribute("agreementTermId", agreementTermId)
        request.setAttribute("message", "Ödeme şartı başarıyla tanımlandı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyPaymentTerm: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 23. deletePartyPaymentTerm
 * Removes a payment term from a party's agreement
 */
String deletePartyPaymentTerm() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String agreementTermId = parameters.agreementTermId?.trim()
        if (UtilValidate.isEmpty(agreementTermId)) {
            request.setAttribute("_ERROR_MESSAGE_", "agreementTermId zorunludur.")
            return "error"
        }

        GenericValue term = EntityQuery.use(delegator)
            .from("AgreementTerm")
            .where("agreementTermId", agreementTermId)
            .queryOne()

        if (term) {
            term.remove()
        }

        request.setAttribute("message", "Ödeme şartı başarıyla kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyPaymentTerm: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 24. getPartyPaymentMethods
 * Returns EFT accounts (bank accounts/IBAN) and credit cards linked to this party
 */
String getPartyPaymentMethods() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId parametresi zorunludur.")
            return "error"
        }

        List paymentMethods = EntityQuery.use(delegator)
            .from("PaymentMethod")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()

        List eftAccounts = []
        List creditCards = []

        for (GenericValue pm : paymentMethods) {
            String pmId = pm.getString("paymentMethodId")
            String pmTypeId = pm.getString("paymentMethodTypeId")

            if ("EFT_ACCOUNT".equals(pmTypeId)) {
                GenericValue eft = EntityQuery.use(delegator)
                    .from("EftAccount")
                    .where("paymentMethodId", pmId)
                    .queryOne()
                if (eft) {
                    eftAccounts.add([
                        paymentMethodId: pmId,
                        bankName: eft.getString("bankName") ?: "",
                        routingNumber: eft.getString("routingNumber") ?: "",
                        accountNumber: eft.getString("accountNumber") ?: "",
                        nameOnAccount: eft.getString("nameOnAccount") ?: "",
                        companyNameOnAccount: eft.getString("companyNameOnAccount") ?: "",
                        description: pm.getString("description") ?: "",
                        fromDate: pm.getTimestamp("fromDate")?.toString()
                    ])
                }
            } else if ("CREDIT_CARD".equals(pmTypeId)) {
                GenericValue cc = EntityQuery.use(delegator)
                    .from("CreditCard")
                    .where("paymentMethodId", pmId)
                    .queryOne()
                if (cc) {
                    String rawNum = cc.getString("cardNumber") ?: ""
                    String masked = rawNum.length() > 4 ? ("**** **** **** " + rawNum.substring(rawNum.length() - 4)) : "****"
                    creditCards.add([
                        paymentMethodId: pmId,
                        cardType: cc.getString("cardType") ?: "VISA",
                        cardNumberMasked: masked,
                        expireDate: cc.getString("expireDate") ?: "",
                        firstNameOnCard: cc.getString("firstNameOnCard") ?: cc.getString("companyNameOnCard") ?: "",
                        description: pm.getString("description") ?: "",
                        fromDate: pm.getTimestamp("fromDate")?.toString()
                    ])
                }
            }
        }

        request.setAttribute("paymentMethods", [
            partyId: partyId,
            eftAccounts: eftAccounts,
            creditCards: creditCards
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyPaymentMethods: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 25. createPartyEftAccount
 * Adds an EFT / IBAN Bank Account for a party
 */
String createPartyEftAccount() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String bankName = parameters.bankName?.trim()
        String accountNumber = parameters.accountNumber?.trim()
        String nameOnAccount = parameters.nameOnAccount?.trim()
        String routingNumber = parameters.routingNumber?.trim() ?: ""
        String description = parameters.description?.trim() ?: "Banka / IBAN Hesabı"

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(bankName) || UtilValidate.isEmpty(accountNumber)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId, bankName ve accountNumber (IBAN) zorunludur.")
            return "error"
        }

        String paymentMethodId = delegator.getNextSeqId("PaymentMethod")
        GenericValue pm = delegator.makeValue("PaymentMethod", [
            paymentMethodId: paymentMethodId,
            partyId: partyId,
            paymentMethodTypeId: "EFT_ACCOUNT",
            description: description,
            fromDate: UtilDateTime.nowTimestamp()
        ])
        pm.create()

        GenericValue eft = delegator.makeValue("EftAccount", [
            paymentMethodId: paymentMethodId,
            bankName: bankName,
            routingNumber: routingNumber,
            accountNumber: accountNumber,
            nameOnAccount: nameOnAccount ?: partyId
        ])
        eft.create()

        request.setAttribute("paymentMethodId", paymentMethodId)
        request.setAttribute("message", "Banka/IBAN hesabı başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyEftAccount: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 26. deletePartyPaymentMethod
 * Expires a payment method (EFT Account or Credit Card)
 */
String deletePartyPaymentMethod() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String paymentMethodId = parameters.paymentMethodId?.trim()
        if (UtilValidate.isEmpty(paymentMethodId)) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentMethodId zorunludur.")
            return "error"
        }

        GenericValue pm = EntityQuery.use(delegator)
            .from("PaymentMethod")
            .where("paymentMethodId", paymentMethodId)
            .queryOne()

        if (pm) {
            pm.set("thruDate", UtilDateTime.nowTimestamp())
            pm.store()
        }

        request.setAttribute("message", "Ödeme yöntemi devreden çıkarıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyPaymentMethod: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 27. createPartyCreditCard
 * Adds a registered credit card for a party
 */
String createPartyCreditCard() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String cardNumber = parameters.cardNumber?.trim()?.replaceAll("\\s+", "")
        String expireDate = parameters.expireDate?.trim()
        String cardType = parameters.cardType?.trim() ?: "CCT_VISA"
        String nameOnCard = parameters.nameOnCard?.trim() ?: ""

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(cardNumber) || UtilValidate.isEmpty(expireDate)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId, cardNumber ve expireDate (AA/YYYY) zorunludur.")
            return "error"
        }

        String paymentMethodId = delegator.getNextSeqId("PaymentMethod")
        GenericValue pm = delegator.makeValue("PaymentMethod", [
            paymentMethodId: paymentMethodId,
            partyId: partyId,
            paymentMethodTypeId: "CREDIT_CARD",
            description: "Kayıtlı Kredi Kartı",
            fromDate: UtilDateTime.nowTimestamp()
        ])
        pm.create()

        GenericValue cc = delegator.makeValue("CreditCard", [
            paymentMethodId: paymentMethodId,
            cardType: cardType,
            cardNumber: cardNumber,
            expireDate: expireDate,
            firstNameOnCard: nameOnCard
        ])
        cc.create()

        request.setAttribute("paymentMethodId", paymentMethodId)
        request.setAttribute("message", "Kredi kartı başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyCreditCard: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 28. getPartyAttributes
 * Returns custom attributes (key-value pairs) for a party
 */
String getPartyAttributes() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId zorunludur.")
            return "error"
        }

        List attributes = EntityQuery.use(delegator)
            .from("PartyAttribute")
            .where("partyId", partyId)
            .orderBy("attrName")
            .queryList()
            .collect { GenericValue attr ->
                [
                    attrName: attr.getString("attrName"),
                    attrValue: attr.getString("attrValue") ?: "",
                    attrDescription: attr.getString("attrDescription") ?: ""
                ]
            }

        request.setAttribute("attributes", attributes)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyAttributes: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 29. savePartyAttribute
 * Adds or updates a custom attribute for a party
 */
String savePartyAttribute() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String attrName = parameters.attrName?.trim()
        String attrValue = parameters.attrValue?.trim() ?: ""
        String attrDescription = parameters.attrDescription?.trim() ?: ""

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(attrName)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve attrName zorunludur.")
            return "error"
        }

        GenericValue attr = EntityQuery.use(delegator)
            .from("PartyAttribute")
            .where("partyId", partyId, "attrName", attrName)
            .queryOne()

        if (attr) {
            attr.set("attrValue", attrValue)
            attr.set("attrDescription", attrDescription)
            attr.store()
        } else {
            GenericValue newAttr = delegator.makeValue("PartyAttribute", [
                partyId: partyId,
                attrName: attrName,
                attrValue: attrValue,
                attrDescription: attrDescription
            ])
            newAttr.create()
        }

        request.setAttribute("message", "Özel nitelik başarıyla kaydedildi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in savePartyAttribute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 30. deletePartyAttribute
 * Removes a custom attribute
 */
String deletePartyAttribute() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String attrName = parameters.attrName?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(attrName)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve attrName zorunludur.")
            return "error"
        }

        GenericValue attr = EntityQuery.use(delegator)
            .from("PartyAttribute")
            .where("partyId", partyId, "attrName", attrName)
            .queryOne()

        if (attr) {
            attr.remove()
        }

        request.setAttribute("message", "Özel nitelik silindi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyAttribute: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * Helper to ensure standard Turkish ERP party content types exist
 */
void ensureDefaultPartyContentTypes(def delegator) {
    try {
        List defaultTypes = [
            [partyContentTypeId: "CONTRACT", description: "Sözleşme / Anlaşma Belgesi"],
            [partyContentTypeId: "TAX_PLATE", description: "Vergi Levhası"],
            [partyContentTypeId: "SIG_CIRCULAR", description: "İmza Sirküleri"],
            [partyContentTypeId: "TRADE_REGISTRY", description: "Ticaret Sicil Gazetesi"],
            [partyContentTypeId: "ID_COPY", description: "Kimlik / Pasaport Fotokopisi"],
            [partyContentTypeId: "INTERNAL", description: "Dahili Şirket Belgesi"]
        ]
        for (Map tMap : defaultTypes) {
            GenericValue existing = EntityQuery.use(delegator)
                .from("PartyContentType")
                .where("partyContentTypeId", tMap.partyContentTypeId)
                .queryOne()
            if (!existing) {
                delegator.makeValue("PartyContentType", tMap).create()
            }
        }
    } catch (Exception e) {
        Debug.logWarning("Could not seed default party content types: " + e.getMessage(), MODULE)
    }
}

/**
 * 31. getPartyContents
 * Returns documents, contracts, and files attached to a party
 */
String getPartyContents() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId zorunludur.")
            return "error"
        }

        ensureDefaultPartyContentTypes(delegator)

        List partyContentList = EntityQuery.use(delegator)
            .from("PartyContent")
            .where("partyId", partyId)
            .filterByDate()
            .queryList()

        List contents = []
        for (GenericValue pc : partyContentList) {
            GenericValue content = EntityQuery.use(delegator)
                .from("Content")
                .where("contentId", pc.getString("contentId"))
                .queryOne()

            GenericValue pct = EntityQuery.use(delegator)
                .from("PartyContentType")
                .where("partyContentTypeId", pc.getString("partyContentTypeId"))
                .cache()
                .queryOne()

            contents.add([
                contentId: pc.getString("contentId"),
                partyContentTypeId: pc.getString("partyContentTypeId"),
                contentTypeDescription: pct?.getString("description") ?: pc.getString("partyContentTypeId"),
                contentName: content?.getString("contentName") ?: pc.getString("contentId"),
                description: content?.getString("description") ?: "",
                fromDate: pc.getTimestamp("fromDate")?.toString()
            ])
        }

        List availableTypes = EntityQuery.use(delegator)
            .from("PartyContentType")
            .orderBy("description")
            .queryList()
            .collect { GenericValue pt ->
                [
                    partyContentTypeId: pt.getString("partyContentTypeId"),
                    description: pt.getString("description") ?: pt.getString("partyContentTypeId")
                ]
            }

        request.setAttribute("partyContents", [
            partyId: partyId,
            contents: contents,
            availableTypes: availableTypes
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyContents: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 32. createPartyContentRecord
 * Attaches a document/contract record to a party
 */
String createPartyContentRecord() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String partyContentTypeId = parameters.partyContentTypeId?.trim() ?: "CONTRACT"
        String contentName = parameters.contentName?.trim()
        String description = parameters.description?.trim() ?: ""

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(contentName)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve contentName zorunludur.")
            return "error"
        }

        String contentId = delegator.getNextSeqId("Content")
        GenericValue cnt = delegator.makeValue("Content", [
            contentId: contentId,
            contentTypeId: "DOCUMENT",
            contentName: contentName,
            description: description
        ])
        cnt.create()

        GenericValue pc = delegator.makeValue("PartyContent", [
            partyId: partyId,
            contentId: contentId,
            partyContentTypeId: partyContentTypeId,
            fromDate: UtilDateTime.nowTimestamp()
        ])
        pc.create()

        request.setAttribute("contentId", contentId)
        request.setAttribute("message", "Belge kaydı başarıyla eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyContentRecord: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 33. deletePartyContentRecord
 * Expires a document attached to a party
 */
String deletePartyContentRecord() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        String contentId = parameters.contentId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(contentId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId ve contentId zorunludur.")
            return "error"
        }

        List list = EntityQuery.use(delegator)
            .from("PartyContent")
            .where("partyId", partyId, "contentId", contentId)
            .filterByDate()
            .queryList()

        for (GenericValue pc : list) {
            pc.set("thruDate", UtilDateTime.nowTimestamp())
            pc.store()
        }

        request.setAttribute("message", "Belge kaydı kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in deletePartyContentRecord: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 34. getPartyUserLogins
 * Returns system user accounts associated with a party
 */
String getPartyUserLogins() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String partyId = parameters.partyId?.trim()
        if (UtilValidate.isEmpty(partyId)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId zorunludur.")
            return "error"
        }

        List userLogins = EntityQuery.use(delegator)
            .from("UserLogin")
            .where("partyId", partyId)
            .queryList()

        List list = []
        for (GenericValue ul : userLogins) {
            String uId = ul.getString("userLoginId")
            List secGroups = EntityQuery.use(delegator)
                .from("UserLoginSecurityGroup")
                .where("userLoginId", uId)
                .filterByDate()
                .queryList()
                .collect { GenericValue sg ->
                    GenericValue g = EntityQuery.use(delegator)
                        .from("SecurityGroup")
                        .where("groupId", sg.getString("groupId"))
                        .cache()
                        .queryOne()
                    [
                        groupId: sg.getString("groupId"),
                        description: g?.getString("description") ?: sg.getString("groupId")
                    ]
                }

            list.add([
                userLoginId: uId,
                enabled: ul.getString("enabled") ?: "Y",
                hasLoggedOut: ul.getString("hasLoggedOut") ?: "N",
                securityGroups: secGroups
            ])
        }

        List availableGroups = EntityQuery.use(delegator)
            .from("SecurityGroup")
            .orderBy("groupId")
            .queryList()
            .collect { GenericValue g ->
                [
                    groupId: g.getString("groupId"),
                    description: g.getString("description") ?: g.getString("groupId")
                ]
            }

        request.setAttribute("userLoginsData", [
            partyId: partyId,
            userLogins: list,
            availableSecurityGroups: availableGroups
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPartyUserLogins: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 35. createPartyUserLogin
 * Creates a new user login and associates with a party
 */
String createPartyUserLogin() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin()
        String partyId = parameters.partyId?.trim()
        String userLoginId = parameters.userLoginId?.trim()
        String currentPassword = parameters.currentPassword?.trim()
        String groupId = parameters.groupId?.trim()

        if (UtilValidate.isEmpty(partyId) || UtilValidate.isEmpty(userLoginId) || UtilValidate.isEmpty(currentPassword)) {
            request.setAttribute("_ERROR_MESSAGE_", "partyId, userLoginId ve currentPassword zorunludur.")
            return "error"
        }

        Map res = dispatcher.runSync("createUserLogin", [
            userLogin: uL,
            userLoginId: userLoginId,
            currentPassword: currentPassword,
            currentPasswordVerify: currentPassword,
            enabled: "Y",
            partyId: partyId
        ])
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        if (UtilValidate.isNotEmpty(groupId)) {
            dispatcher.runSync("addUserLoginToSecurityGroup", [
                userLogin: uL,
                userLoginId: userLoginId,
                groupId: groupId,
                fromDate: UtilDateTime.nowTimestamp()
            ])
        }

        request.setAttribute("message", "Kullanıcı hesabı başarıyla oluşturuldu.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createPartyUserLogin: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 36. updatePartyUserLoginStatus
 * Activates or deactivates a user login
 */
String updatePartyUserLoginStatus() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String userLoginId = parameters.userLoginId?.trim()
        String enabled = parameters.enabled?.trim() ?: "Y"

        if (UtilValidate.isEmpty(userLoginId)) {
            request.setAttribute("_ERROR_MESSAGE_", "userLoginId zorunludur.")
            return "error"
        }

        GenericValue ul = EntityQuery.use(delegator)
            .from("UserLogin")
            .where("userLoginId", userLoginId)
            .queryOne()

        if (ul) {
            ul.set("enabled", enabled)
            ul.store()
        }

        request.setAttribute("message", "Kullanıcı durumu güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updatePartyUserLoginStatus: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

