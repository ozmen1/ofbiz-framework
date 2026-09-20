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
