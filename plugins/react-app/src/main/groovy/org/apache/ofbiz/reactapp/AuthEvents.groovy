/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.entity.Delegator
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.LocalDispatcher
import org.apache.ofbiz.service.ServiceUtil
import org.apache.ofbiz.webapp.control.LoginWorker

final String MODULE = "AuthEvents.groovy"

/**
 * Helper to build a comprehensive User Profile Map from a UserLogin GenericValue
 */
Map getUserProfileMap(def delegator, GenericValue userLogin) {
    if (!userLogin) return null

    String userLoginId = userLogin.getString("userLoginId")
    String partyId = userLogin.getString("partyId")
    String displayName = userLoginId

    if (UtilValidate.isNotEmpty(partyId)) {
        try {
            GenericValue person = EntityQuery.use(delegator)
                .from("Person")
                .where("partyId", partyId)
                .queryOne()
            if (person) {
                String first = person.getString("firstName") ?: ""
                String last = person.getString("lastName") ?: ""
                displayName = "${first} ${last}".trim()
            } else {
                GenericValue partyGroup = EntityQuery.use(delegator)
                    .from("PartyGroup")
                    .where("partyId", partyId)
                    .queryOne()
                if (partyGroup && partyGroup.getString("groupName")) {
                    displayName = partyGroup.getString("groupName")
                }
            }
        } catch (Exception e) {
            Debug.logWarning(e, "Error resolving party name for userLoginId: " + userLoginId, MODULE)
        }
    }

    // 1. Fetch active security groups
    List ulsgList = []
    try {
        ulsgList = EntityQuery.use(delegator)
            .from("UserLoginSecurityGroup")
            .where("userLoginId", userLoginId)
            .filterByDate()
            .queryList()
    } catch (Exception e) {
        Debug.logWarning(e, "Error fetching UserLoginSecurityGroup for: " + userLoginId, MODULE)
    }

    List securityGroups = []
    List groupIds = []

    for (GenericValue ulsg : ulsgList) {
        String gId = ulsg.getString("groupId")
        groupIds.add(gId)

        String desc = gId
        try {
            GenericValue secGroup = EntityQuery.use(delegator)
                .from("SecurityGroup")
                .where("groupId", gId)
                .cache(true)
                .queryOne()
            if (secGroup && secGroup.getString("description")) {
                desc = secGroup.getString("description")
            }
        } catch (Exception ignored) {}

        securityGroups.add([
            groupId: gId,
            description: desc,
            fromDate: ulsg.getTimestamp("fromDate")?.toString()
        ])
    }

    // 2. Fetch permissions associated with groups
    Set permissions = new HashSet()
    if (!groupIds.isEmpty()) {
        try {
            List perms = EntityQuery.use(delegator)
                .from("SecurityGroupPermission")
                .where(EntityCondition.makeCondition("groupId", EntityOperator.IN, groupIds))
                .filterByDate()
                .queryList()
            for (GenericValue p : perms) {
                permissions.add(p.getString("permissionId"))
            }
        } catch (Exception e) {
            Debug.logWarning(e, "Error fetching SecurityGroupPermission for groups: " + groupIds, MODULE)
        }
    }

    // Admin detection
    boolean isAdmin = groupIds.contains("SUPER") || 
                      groupIds.contains("FULLADMIN") || 
                      groupIds.contains("BIZADMIN") || 
                      permissions.contains("REACT-APP_ADMIN") || 
                      permissions.contains("OFBTOOLS_ADMIN")

    String tenantId = ""
    try {
        tenantId = delegator.getDelegatorTenantId() ?: ""
    } catch (Exception ignored) {}

    return [
        userLoginId: userLoginId,
        partyId: partyId ?: "",
        displayName: displayName ?: userLoginId,
        enabled: userLogin.getString("enabled") ?: "Y",
        requirePasswordChange: userLogin.getString("requirePasswordChange") ?: "N",
        lastLocale: userLogin.getString("lastLocale") ?: "",
        lastTimeZone: userLogin.getString("lastTimeZone") ?: "",
        tenantId: tenantId,
        securityGroups: securityGroups,
        permissions: permissions.toList(),
        isAdmin: isAdmin
    ]
}

/**
 * 1. apiLogin
 * Authenticates user credentials via LoginWorker, starts session, and returns profile
 */
String apiLogin() {
    def request = binding.getVariable("request")
    def response = binding.getVariable("response")
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")

    try {
        String username = parameters.USERNAME ?: parameters.username ?: parameters.userLoginId
        String password = parameters.PASSWORD ?: parameters.password
        String userTenantId = parameters.userTenantId ?: parameters.tenantId

        if (UtilValidate.isEmpty(username) || UtilValidate.isEmpty(password)) {
            request.setAttribute("_ERROR_MESSAGE_", "Kullanıcı adı ve şifre zorunludur.")
            return "error"
        }

        username = username.trim()
        request.setAttribute("USERNAME", username)
        request.setAttribute("PASSWORD", password)

        if (UtilValidate.isNotEmpty(userTenantId)) {
            userTenantId = userTenantId.trim()
            request.setAttribute("userTenantId", userTenantId)
            parameters.put("userTenantId", userTenantId)
        }

        // Delegate authentication to OFBiz LoginWorker
        String loginResult = LoginWorker.login(request, response)

        if (!"success".equals(loginResult)) {
            String errMsg = (String) request.getAttribute("_ERROR_MESSAGE_")
            if (UtilValidate.isEmpty(errMsg)) {
                List errList = (List) request.getAttribute("_ERROR_MESSAGE_LIST_")
                if (errList && !errList.isEmpty()) {
                    errMsg = errList.join("\n")
                }
            }
            if (UtilValidate.isEmpty(errMsg)) {
                errMsg = "Kullanıcı adı veya şifre hatalı."
            }
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        // Login successful, retrieve UserLogin from session
        def session = request.getSession()
        GenericValue userLogin = (GenericValue) session.getAttribute("userLogin")
        if (!userLogin) {
            userLogin = EntityQuery.use(delegator)
                .from("UserLogin")
                .where("userLoginId", username)
                .queryOne()
            if (userLogin) {
                session.setAttribute("userLogin", userLogin)
            }
        }

        Map profile = getUserProfileMap(delegator, userLogin)

        request.setAttribute("authenticated", true)
        request.setAttribute("user", profile)
        request.setAttribute("message", "Giriş başarılı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in apiLogin: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Giriş işlemi sırasında hata oluştu: " + e.getMessage())
        return "error"
    }
}

/**
 * 2. apiLogout
 * Logs out user via LoginWorker, clears session
 */
String apiLogout() {
    def request = binding.getVariable("request")
    def response = binding.getVariable("response")

    try {
        LoginWorker.logout(request, response)
        def session = request.getSession(false)
        if (session != null) {
            session.removeAttribute("userLogin")
            try {
                session.invalidate()
            } catch (Exception ignored) {}
        }

        request.setAttribute("authenticated", false)
        request.setAttribute("message", "Başarıyla çıkış yapıldı.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in apiLogout: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 3. checkAuth
 * Validates active session and returns user profile if authenticated
 */
String checkAuth() {
    def request = binding.getVariable("request")
    def delegator = binding.getVariable("delegator")
    def session = request.getSession(false)

    try {
        GenericValue userLogin = session != null ? (GenericValue) session.getAttribute("userLogin") : null

        if (!userLogin) {
            request.setAttribute("authenticated", false)
            request.setAttribute("user", null)
            return "success"
        }

        // Validate account is still enabled
        GenericValue fresh = EntityQuery.use(delegator)
            .from("UserLogin")
            .where("userLoginId", userLogin.getString("userLoginId"))
            .queryOne()

        if (!fresh || "N".equals(fresh.getString("enabled"))) {
            if (session != null) {
                session.removeAttribute("userLogin")
            }
            request.setAttribute("authenticated", false)
            request.setAttribute("user", null)
            request.setAttribute("message", "Kullanıcı hesabı aktif değil.")
            return "success"
        }

        Map profile = getUserProfileMap(delegator, fresh)
        request.setAttribute("authenticated", true)
        request.setAttribute("user", profile)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in checkAuth: " + e.getMessage(), MODULE)
        request.setAttribute("authenticated", false)
        request.setAttribute("user", null)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}

/**
 * 4. updateMyPassword
 * Allows logged-in user to change their password
 */
String updateMyPassword() {
    def request = binding.getVariable("request")
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def session = request.getSession(false)

    try {
        GenericValue userLogin = session != null ? (GenericValue) session.getAttribute("userLogin") : null
        if (!userLogin) {
            request.setAttribute("_ERROR_MESSAGE_", "Lütfen önce giriş yapınız.")
            return "error"
        }

        String currentPassword = parameters.currentPassword?.trim()
        String newPassword = parameters.newPassword?.trim()
        String newPasswordVerify = parameters.newPasswordVerify?.trim()

        if (UtilValidate.isEmpty(currentPassword) || UtilValidate.isEmpty(newPassword) || UtilValidate.isEmpty(newPasswordVerify)) {
            request.setAttribute("_ERROR_MESSAGE_", "Mevcut şifre, yeni şifre ve yeni şifre tekrarı zorunludur.")
            return "error"
        }

        if (!newPassword.equals(newPasswordVerify)) {
            request.setAttribute("_ERROR_MESSAGE_", "Yeni şifre ile şifre tekrarı eşleşmiyor.")
            return "error"
        }

        Map res = dispatcher.runSync("updatePassword", [
            userLogin: userLogin,
            userLoginId: userLogin.getString("userLoginId"),
            currentPassword: currentPassword,
            newPassword: newPassword,
            newPasswordVerify: newPasswordVerify
        ])

        if (ServiceUtil.isError(res)) {
            request.setAttribute("_ERROR_MESSAGE_", ServiceUtil.getErrorMessage(res))
            return "error"
        }

        request.setAttribute("message", "Şifreniz başarıyla güncellendi.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in updateMyPassword: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
