/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.ServiceUtil

import java.sql.Timestamp

final String MODULE = "UserAdminEvents.groovy"

GenericValue getSystemUserLogin(def binding) {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    def session = request.getSession(false)
    GenericValue uL = session != null ? (GenericValue) session.getAttribute("userLogin") : null
    if (!uL) {
        uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
        if (!uL) {
            uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "admin").queryOne()
        }
    }
    return uL
}

String getPartyDisplayName(def delegator, String partyId) {
    if (!partyId) return ""
    try {
        GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
        if (person) {
            String first = person.getString("firstName") ?: ""
            String last = person.getString("lastName") ?: ""
            return "${first} ${last}".trim()
        }
        GenericValue group = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).queryOne()
        if (group && group.getString("groupName")) {
            return group.getString("groupName")
        }
    } catch (Exception ignored) {}
    return partyId
}

/**
 * 1. getUserLogins
 * Returns paginated, searchable, filterable list of user logins
 */
String getUserLogins() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()
        String statusId = parameters.statusId?.trim() ?: "ALL"
        String groupId = parameters.groupId?.trim()
        int viewIndex = parameters.viewIndex ? Integer.parseInt(parameters.viewIndex.toString()) : 0
        int viewSize = parameters.viewSize ? Integer.parseInt(parameters.viewSize.toString()) : 20

        List conds = []

        if ("ACTIVE".equalsIgnoreCase(statusId)) {
            conds.add(EntityCondition.makeCondition("enabled", EntityOperator.EQUALS, "Y"))
        } else if ("DISABLED".equalsIgnoreCase(statusId)) {
            conds.add(EntityCondition.makeCondition("enabled", EntityOperator.EQUALS, "N"))
        } else if ("LOCKED".equalsIgnoreCase(statusId)) {
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("disabledDateTime", EntityOperator.NOT_EQUAL, null),
                EntityCondition.makeCondition("successiveFailedLogins", EntityOperator.GREATER_THAN, 3L)
            ], EntityOperator.OR))
        }

        if (UtilValidate.isNotEmpty(search)) {
            String searchPattern = "%" + search + "%"
            conds.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("userLoginId", EntityOperator.LIKE, searchPattern),
                EntityCondition.makeCondition("partyId", EntityOperator.LIKE, searchPattern)
            ], EntityOperator.OR))
        }

        // If filtering by specific security group
        if (UtilValidate.isNotEmpty(groupId)) {
            List ulsgList = EntityQuery.use(delegator)
                .from("UserLoginSecurityGroup")
                .where("groupId", groupId)
                .filterByDate()
                .queryList()
            List userIdsInGroup = ulsgList.collect { it.getString("userLoginId") }
            if (userIdsInGroup.isEmpty()) {
                request.setAttribute("userLogins", [])
                request.setAttribute("totalCount", 0)
                request.setAttribute("viewIndex", viewIndex)
                request.setAttribute("viewSize", viewSize)
                return "success"
            }
            conds.add(EntityCondition.makeCondition("userLoginId", EntityOperator.IN, userIdsInGroup))
        }

        def baseQuery = EntityQuery.use(delegator).from("UserLogin")
        if (!conds.isEmpty()) {
            baseQuery = baseQuery.where(EntityCondition.makeCondition(conds, EntityOperator.AND))
        }

        long totalCount = baseQuery.queryCount()

        List<GenericValue> rawUsers = baseQuery
            .orderBy("userLoginId ASC")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        List users = []
        for (GenericValue ul : rawUsers) {
            String uId = ul.getString("userLoginId")
            String pId = ul.getString("partyId")
            String displayName = getPartyDisplayName(delegator, pId) ?: uId

            // Active security groups
            List secGroups = EntityQuery.use(delegator)
                .from("UserLoginSecurityGroup")
                .where("userLoginId", uId)
                .filterByDate()
                .queryList()

            List groupList = []
            for (GenericValue sg : secGroups) {
                String gId = sg.getString("groupId")
                groupList.add([
                    groupId: gId,
                    fromDate: sg.getTimestamp("fromDate")?.toString()
                ])
            }

            boolean isLocked = ul.get("disabledDateTime") != null || 
                               (ul.get("successiveFailedLogins") != null && ul.getLong("successiveFailedLogins") > 3L)

            users.add([
                userLoginId: uId,
                partyId: pId ?: "",
                displayName: displayName,
                enabled: ul.getString("enabled") ?: "Y",
                isLocked: isLocked,
                disabledDateTime: ul.getTimestamp("disabledDateTime")?.toString(),
                successiveFailedLogins: ul.getLong("successiveFailedLogins") ?: 0L,
                requirePasswordChange: ul.getString("requirePasswordChange") ?: "N",
                hasLoggedOut: ul.getString("hasLoggedOut") ?: "N",
                lastLocale: ul.getString("lastLocale") ?: "",
                lastTimeZone: ul.getString("lastTimeZone") ?: "",
                securityGroups: groupList
            ])
        }

        request.setAttribute("userLogins", users)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getUserLogins: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 2. getUserLoginDetail
 * Returns full detail for a user including history of groups and permissions
 */
String getUserLoginDetail() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String userLoginId = parameters.userLoginId?.trim()
        if (UtilValidate.isEmpty(userLoginId)) {
            request.setAttribute("_ERROR_MESSAGE_", "userLoginId parametresi zorunludur.")
            return "error"
        }

        GenericValue ul = EntityQuery.use(delegator)
            .from("UserLogin")
            .where("userLoginId", userLoginId)
            .queryOne()

        if (!ul) {
            request.setAttribute("_ERROR_MESSAGE_", "Kullanıcı bulunamadı: " + userLoginId)
            return "error"
        }

        String pId = ul.getString("partyId")
        String displayName = getPartyDisplayName(delegator, pId) ?: userLoginId

        // All security groups (including historical)
        List allSecGroups = EntityQuery.use(delegator)
            .from("UserLoginSecurityGroup")
            .where("userLoginId", userLoginId)
            .orderBy("fromDate DESC")
            .queryList()

        Timestamp now = UtilDateTime.nowTimestamp()
        List groupsData = []
        List activeGroupIds = []

        for (GenericValue sg : allSecGroups) {
            String gId = sg.getString("groupId")
            Timestamp from = sg.getTimestamp("fromDate")
            Timestamp thru = sg.getTimestamp("thruDate")

            boolean isActive = (thru == null || thru.after(now)) && (from == null || from.before(now))
            if (isActive) {
                activeGroupIds.add(gId)
            }

            String desc = gId
            GenericValue groupInfo = EntityQuery.use(delegator).from("SecurityGroup").where("groupId", gId).queryOne()
            if (groupInfo && groupInfo.getString("description")) {
                desc = groupInfo.getString("description")
            }

            groupsData.add([
                groupId: gId,
                description: desc,
                fromDate: from?.toString(),
                thruDate: thru?.toString(),
                isActive: isActive
            ])
        }

        // Permissions for active groups
        Set permissions = new HashSet()
        if (!activeGroupIds.isEmpty()) {
            List perms = EntityQuery.use(delegator)
                .from("SecurityGroupPermission")
                .where(EntityCondition.makeCondition("groupId", EntityOperator.IN, activeGroupIds))
                .filterByDate()
                .queryList()
            for (GenericValue p : perms) {
                permissions.add(p.getString("permissionId"))
            }
        }

        boolean isLocked = ul.get("disabledDateTime") != null || 
                           (ul.get("successiveFailedLogins") != null && ul.getLong("successiveFailedLogins") > 3L)

        request.setAttribute("userDetail", [
            userLoginId: userLoginId,
            partyId: pId ?: "",
            displayName: displayName,
            enabled: ul.getString("enabled") ?: "Y",
            isLocked: isLocked,
            disabledDateTime: ul.getTimestamp("disabledDateTime")?.toString(),
            successiveFailedLogins: ul.getLong("successiveFailedLogins") ?: 0L,
            requirePasswordChange: ul.getString("requirePasswordChange") ?: "N",
            hasLoggedOut: ul.getString("hasLoggedOut") ?: "N",
            lastLocale: ul.getString("lastLocale") ?: "",
            lastTimeZone: ul.getString("lastTimeZone") ?: "",
            securityGroups: groupsData,
            permissions: permissions.toList().sort()
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getUserLoginDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. createUserLoginAdmin
 * Creates a new UserLogin record and associates initial security group
 */
String createUserLoginAdmin() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin(binding)
        String userLoginId = parameters.userLoginId?.trim()
        String currentPassword = parameters.currentPassword?.trim()
        String partyId = parameters.partyId?.trim()
        String groupId = parameters.groupId?.trim()
        String requirePasswordChange = parameters.requirePasswordChange?.trim() ?: "N"

        if (UtilValidate.isEmpty(userLoginId) || UtilValidate.isEmpty(currentPassword)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kullanıcı adı ve şifre zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", userLoginId).queryOne()
        if (existing) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu kullanıcı adı ('${userLoginId}') zaten kullanımda.")
            return "error"
        }

        Map createParams = [
            userLogin: uL,
            userLoginId: userLoginId,
            currentPassword: currentPassword,
            currentPasswordVerify: currentPassword,
            enabled: "Y"
        ]
        if (UtilValidate.isNotEmpty(partyId)) {
            createParams.partyId = partyId
        }

        Map res = dispatcher.runSync("createUserLogin", createParams)
        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        // Attach security group
        if (UtilValidate.isNotEmpty(groupId)) {
            dispatcher.runSync("addUserLoginToSecurityGroup", [
                userLogin: uL,
                userLoginId: userLoginId,
                groupId: groupId,
                fromDate: UtilDateTime.nowTimestamp()
            ])
        }

        // Password change requirement
        if ("Y".equalsIgnoreCase(requirePasswordChange)) {
            GenericValue createdUl = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", userLoginId).queryOne()
            if (createdUl) {
                createdUl.set("requirePasswordChange", "Y")
                createdUl.store()
            }
        }

        request.setAttribute("message", "Kullanıcı hesabı başarıyla oluşturuldu.")
        request.setAttribute("userLoginId", userLoginId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createUserLoginAdmin: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. updateUserLoginStatusAdmin
 * Activates, deactivates, or unlocks a user account
 */
String updateUserLoginStatusAdmin() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String userLoginId = parameters.userLoginId?.trim()
        String enabled = parameters.enabled?.trim()
        String unlock = parameters.unlock?.trim()

        if (UtilValidate.isEmpty(userLoginId)) {
            request.setAttribute("_ERROR_MESSAGE_", "userLoginId parametresi zorunludur.")
            return "error"
        }

        GenericValue ul = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", userLoginId).queryOne()
        if (!ul) {
            request.setAttribute("_ERROR_MESSAGE_", "Kullanıcı bulunamadı: " + userLoginId)
            return "error"
        }

        if ("Y".equalsIgnoreCase(unlock)) {
            ul.set("disabledDateTime", null)
            ul.set("successiveFailedLogins", 0L)
            ul.set("enabled", "Y")
            ul.store()
            request.setAttribute("message", "Kullanıcı hesabı kilidi açıldı ve aktif edildi.")
            return "success"
        }

        if (UtilValidate.isNotEmpty(enabled)) {
            ul.set("enabled", enabled)
            if ("Y".equalsIgnoreCase(enabled)) {
                ul.set("disabledDateTime", null)
            }
            ul.store()
            request.setAttribute("message", "Kullanıcı durumu güncellendi: " + (enabled == "Y" ? "Aktif" : "Pasif"))
            return "success"
        }

        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateUserLoginStatusAdmin: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 5. adminResetUserPassword
 * Resets password of a given user account by administrator
 */
String adminResetUserPassword() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin(binding)
        String userLoginId = parameters.userLoginId?.trim()
        String newPassword = parameters.newPassword?.trim()
        String newPasswordVerify = parameters.newPasswordVerify?.trim()

        if (UtilValidate.isEmpty(userLoginId) || UtilValidate.isEmpty(newPassword) || UtilValidate.isEmpty(newPasswordVerify)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kullanıcı adı ve yeni şifre alanları zorunludur.")
            return "error"
        }

        if (!newPassword.equals(newPasswordVerify)) {
            request.setAttribute("_ERROR_MESSAGE_", "Yeni şifreler birbiriyle eşleşmiyor.")
            return "error"
        }

        Map res = dispatcher.runSync("updatePassword", [
            userLogin: uL,
            userLoginId: userLoginId,
            newPassword: newPassword,
            newPasswordVerify: newPasswordVerify
        ])

        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("message", "Kullanıcı şifresi başarıyla sıfırlandı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in adminResetUserPassword: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 6. addUserSecurityGroup
 * Assigns a security group to a user
 */
String addUserSecurityGroup() {
    def dispatcher = binding.getVariable("dispatcher")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        GenericValue uL = getSystemUserLogin(binding)
        String userLoginId = parameters.userLoginId?.trim()
        String groupId = parameters.groupId?.trim()

        if (UtilValidate.isEmpty(userLoginId) || UtilValidate.isEmpty(groupId)) {
            request.setAttribute("_ERROR_MESSAGE_", "userLoginId ve groupId parametreleri zorunludur.")
            return "error"
        }

        // Check if already active
        GenericValue activeAssign = EntityQuery.use(delegator)
            .from("UserLoginSecurityGroup")
            .where("userLoginId", userLoginId, "groupId", groupId)
            .filterByDate()
            .queryFirst()

        if (activeAssign) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu kullanıcı zaten '${groupId}' yetki grubuna aktif olarak atanmış.")
            return "error"
        }

        Map res = dispatcher.runSync("addUserLoginToSecurityGroup", [
            userLogin: uL,
            userLoginId: userLoginId,
            groupId: groupId,
            fromDate: UtilDateTime.nowTimestamp()
        ])

        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("message", "Yetki grubu başarıyla atandı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addUserSecurityGroup: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 7. removeUserSecurityGroup
 * Expires a security group assignment for a user
 */
String removeUserSecurityGroup() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String userLoginId = parameters.userLoginId?.trim()
        String groupId = parameters.groupId?.trim()

        if (UtilValidate.isEmpty(userLoginId) || UtilValidate.isEmpty(groupId)) {
            request.setAttribute("_ERROR_MESSAGE_", "userLoginId ve groupId parametreleri zorunludur.")
            return "error"
        }

        List activeList = EntityQuery.use(delegator)
            .from("UserLoginSecurityGroup")
            .where("userLoginId", userLoginId, "groupId", groupId)
            .filterByDate()
            .queryList()

        if (activeList.isEmpty()) {
            request.setAttribute("_ERROR_MESSAGE_", "Aktif yetki grubu ataması bulunamadı.")
            return "error"
        }

        Timestamp now = UtilDateTime.nowTimestamp()
        for (GenericValue ulsg : activeList) {
            ulsg.set("thruDate", now)
            ulsg.store()
        }

        request.setAttribute("message", "Yetki grubu ataması kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removeUserSecurityGroup: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 8. getSecurityGroups
 * Returns list of all security groups with active user count and permission count
 */
String getSecurityGroups() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List rawGroups = EntityQuery.use(delegator)
            .from("SecurityGroup")
            .orderBy("groupId ASC")
            .queryList()

        List groups = []
        for (GenericValue g : rawGroups) {
            String gId = g.getString("groupId")

            long permCount = EntityQuery.use(delegator)
                .from("SecurityGroupPermission")
                .where("groupId", gId)
                .filterByDate()
                .queryCount()

            long userCount = EntityQuery.use(delegator)
                .from("UserLoginSecurityGroup")
                .where("groupId", gId)
                .filterByDate()
                .queryCount()

            groups.add([
                groupId: gId,
                description: g.getString("description") ?: gId,
                permissionCount: permCount,
                userCount: userCount
            ])
        }

        request.setAttribute("securityGroups", groups)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getSecurityGroups: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 9. getSecurityGroupPermissions
 * Returns permissions assigned to a group and pool of available permissions
 */
String getSecurityGroupPermissions() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String groupId = parameters.groupId?.trim()
        if (UtilValidate.isEmpty(groupId)) {
            request.setAttribute("_ERROR_MESSAGE_", "groupId parametresi zorunludur.")
            return "error"
        }

        GenericValue group = EntityQuery.use(delegator).from("SecurityGroup").where("groupId", groupId).queryOne()
        if (!group) {
            request.setAttribute("_ERROR_MESSAGE_", "Yetki grubu bulunamadı: " + groupId)
            return "error"
        }

        List assigned = EntityQuery.use(delegator)
            .from("SecurityGroupPermission")
            .where("groupId", groupId)
            .filterByDate()
            .queryList()

        List assignedList = []
        Set assignedIds = new HashSet()

        for (GenericValue p : assigned) {
            String pId = p.getString("permissionId")
            assignedIds.add(pId)

            String desc = pId
            GenericValue pInfo = EntityQuery.use(delegator).from("SecurityPermission").where("permissionId", pId).queryOne()
            if (pInfo && pInfo.getString("description")) {
                desc = pInfo.getString("description")
            }

            assignedList.add([
                permissionId: pId,
                description: desc,
                fromDate: p.getTimestamp("fromDate")?.toString()
            ])
        }

        // Pool of available permissions (top 150 relevant)
        List rawPerms = EntityQuery.use(delegator)
            .from("SecurityPermission")
            .orderBy("permissionId ASC")
            .maxRows(200)
            .queryList()

        List availableList = []
        for (GenericValue ap : rawPerms) {
            String apId = ap.getString("permissionId")
            if (!assignedIds.contains(apId)) {
                availableList.add([
                    permissionId: apId,
                    description: ap.getString("description") ?: apId
                ])
            }
        }

        request.setAttribute("groupInfo", [
            groupId: group.getString("groupId"),
            description: group.getString("description") ?: group.getString("groupId")
        ])
        request.setAttribute("assignedPermissions", assignedList)
        request.setAttribute("availablePermissions", availableList)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getSecurityGroupPermissions: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 10. addPermissionToSecurityGroup
 * Adds a permission to a security group
 */
String addPermissionToSecurityGroup() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String groupId = parameters.groupId?.trim()
        String permissionId = parameters.permissionId?.trim()

        if (UtilValidate.isEmpty(groupId) || UtilValidate.isEmpty(permissionId)) {
            request.setAttribute("_ERROR_MESSAGE_", "groupId ve permissionId zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator)
            .from("SecurityGroupPermission")
            .where("groupId", groupId, "permissionId", permissionId)
            .filterByDate()
            .queryFirst()

        if (existing) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu izin zaten bu gruba atanmış.")
            return "error"
        }

        GenericValue sgp = delegator.makeValue("SecurityGroupPermission", [
            groupId: groupId,
            permissionId: permissionId,
            fromDate: UtilDateTime.nowTimestamp()
        ])
        sgp.create()

        request.setAttribute("message", "İzin başarıyla yetki grubuna eklendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in addPermissionToSecurityGroup: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 11. removePermissionFromSecurityGroup
 * Removes a permission from a security group
 */
String removePermissionFromSecurityGroup() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String groupId = parameters.groupId?.trim()
        String permissionId = parameters.permissionId?.trim()

        if (UtilValidate.isEmpty(groupId) || UtilValidate.isEmpty(permissionId)) {
            request.setAttribute("_ERROR_MESSAGE_", "groupId ve permissionId zorunludur.")
            return "error"
        }

        List activeList = EntityQuery.use(delegator)
            .from("SecurityGroupPermission")
            .where("groupId", groupId, "permissionId", permissionId)
            .filterByDate()
            .queryList()

        Timestamp now = UtilDateTime.nowTimestamp()
        for (GenericValue p : activeList) {
            p.set("thruDate", now)
            p.store()
        }

        request.setAttribute("message", "İzin gruptan kaldırıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in removePermissionFromSecurityGroup: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 12. createSecurityGroupAdmin
 * Creates a new security group
 */
String createSecurityGroupAdmin() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String groupId = parameters.groupId?.trim()?.toUpperCase()
        String description = parameters.description?.trim()

        if (UtilValidate.isEmpty(groupId)) {
            request.setAttribute("_ERROR_MESSAGE_", "Grup Kodu (groupId) zorunludur.")
            return "error"
        }

        GenericValue existing = EntityQuery.use(delegator).from("SecurityGroup").where("groupId", groupId).queryOne()
        if (existing) {
            request.setAttribute("_ERROR_MESSAGE_", "Bu yetki grubu ('${groupId}') zaten mevcut.")
            return "error"
        }

        GenericValue sg = delegator.makeValue("SecurityGroup", [
            groupId: groupId,
            description: description ?: groupId
        ])
        sg.create()

        request.setAttribute("message", "Yetki grubu başarıyla oluşturuldu.")
        request.setAttribute("groupId", groupId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createSecurityGroupAdmin: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 13. getUserAdminMetadata
 * Provides security groups and parties for selection dropdowns
 */
String getUserAdminMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        List rawGroups = EntityQuery.use(delegator)
            .from("SecurityGroup")
            .orderBy("groupId ASC")
            .queryList()

        List groups = rawGroups.collect {
            [
                groupId: it.getString("groupId"),
                description: it.getString("description") ?: it.getString("groupId")
            ]
        }

        // Top 100 parties (Persons and Groups)
        List parties = []
        List persons = EntityQuery.use(delegator)
            .from("Person")
            .orderBy("firstName ASC, lastName ASC")
            .maxRows(60)
            .queryList()

        for (GenericValue p : persons) {
            parties.add([
                partyId: p.getString("partyId"),
                name: "${p.getString('firstName') ?: ''} ${p.getString('lastName') ?: ''}".trim() + " (${p.getString('partyId')})"
            ])
        }

        List partyGroups = EntityQuery.use(delegator)
            .from("PartyGroup")
            .orderBy("groupName ASC")
            .maxRows(40)
            .queryList()

        for (GenericValue pg : partyGroups) {
            if (pg.getString("groupName")) {
                parties.add([
                    partyId: pg.getString("partyId"),
                    name: "${pg.getString('groupName')} (${pg.getString('partyId')})"
                ])
            }
        }

        request.setAttribute("metadata", [
            securityGroups: groups,
            parties: parties
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getUserAdminMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
