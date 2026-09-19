/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * PaymentGroupEvents.groovy
 * Faz 7 – Ödeme Grupları ve Toplu Bordrolar (Payment Groups & Batches)
 *
 * Endpoint'ler:
 *   getPaymentGroups          – Ödeme gruplarını listele (tipi, üye sayısı, toplam tutar ile)
 *   getPaymentGroupDetail     – Grup detayı + üye ödemeler
 *   createPaymentGroup        – Yeni ödeme grubu oluştur
 *   updatePaymentGroup        – Grup adını güncelle
 *   deletePaymentGroup        – Grubu ve üyelerini sil
 *   addPaymentToGroup         – Gruba ödeme ekle
 *   removePaymentFromGroup    – Gruptan ödeme çıkar
 *   getAvailablePayments      – Gruba eklenebilecek ödemeleri listele
 *   getPaymentGroupTypes      – Ödeme grup tiplerini listele (CHECK_RUN, BATCH_PAYMENT vb.)
 */

import org.apache.ofbiz.base.util.*
import org.apache.ofbiz.entity.condition.*
import org.apache.ofbiz.entity.util.*
import groovy.json.JsonOutput
import java.sql.Timestamp

// ─────────────────────────────────────────────────────────────────────────────
// Yardımcı: JSON yanıtı gönder
// ─────────────────────────────────────────────────────────────────────────────
def sendJson(response, data) {
    response.setContentType("application/json;charset=UTF-8")
    response.writer.write("//" + JsonOutput.toJson(data))
    response.writer.flush()
    return "success"
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ödeme Gruplarını Listele
// ─────────────────────────────────────────────────────────────────────────────
def getPaymentGroups() {
    def request  = request
    def response = response
    def delegator = delegator

    try {
        def typeFilter = request.getParameter("paymentGroupTypeId")
        def conditions = []
        if (typeFilter) {
            conditions << EntityCondition.makeCondition("paymentGroupTypeId", EntityOperator.EQUALS, typeFilter)
        }

        def econd = conditions.size() > 0
            ? EntityCondition.makeCondition(conditions, EntityOperator.AND)
            : null

        def groups = delegator.findList("PaymentGroup", econd, null,
                ["paymentGroupName"], null, false)

        def result = []
        groups.each { grp ->
            // Üye ödemeleri al
            def members = delegator.findByAnd("PaymentGroupMember",
                    [paymentGroupId: grp.paymentGroupId],
                    ["sequenceNum"], false)

            def totalAmount = 0.0
            def memberCount = members?.size() ?: 0
            members?.each { m ->
                def payment = delegator.findOne("Payment",
                        [paymentId: m.paymentId], false)
                if (payment?.amount) {
                    totalAmount += payment.getBigDecimal("amount")?.doubleValue() ?: 0.0
                }
            }

            // Tip bilgisi
            def grpType = delegator.findOne("PaymentGroupType",
                    [paymentGroupTypeId: grp.paymentGroupTypeId], true)

            result << [
                paymentGroupId      : grp.paymentGroupId,
                paymentGroupName    : grp.paymentGroupName ?: "",
                paymentGroupTypeId  : grp.paymentGroupTypeId ?: "",
                paymentGroupTypeDesc: grpType?.description ?: grp.paymentGroupTypeId ?: "",
                memberCount         : memberCount,
                totalAmount         : totalAmount
            ]
        }

        return sendJson(response, [success: true, paymentGroups: result])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Ödeme Grubu Detayı
// ─────────────────────────────────────────────────────────────────────────────
def getPaymentGroupDetail() {
    def request  = request
    def response = response
    def delegator = delegator

    try {
        def paymentGroupId = request.getParameter("paymentGroupId")
        if (!paymentGroupId) {
            return sendJson(response, [success: false, error: "paymentGroupId gerekli"])
        }

        def grp = delegator.findOne("PaymentGroup", [paymentGroupId: paymentGroupId], false)
        if (!grp) {
            return sendJson(response, [success: false, error: "Ödeme grubu bulunamadı: ${paymentGroupId}"])
        }

        def grpType = delegator.findOne("PaymentGroupType",
                [paymentGroupTypeId: grp.paymentGroupTypeId], true)

        def members = delegator.findByAnd("PaymentGroupMember",
                [paymentGroupId: paymentGroupId], ["sequenceNum"], false)

        def memberList = []
        def totalAmount = 0.0
        members?.each { m ->
            def payment = delegator.findOne("Payment", [paymentId: m.paymentId], false)
            if (payment) {
                def amount = payment.getBigDecimal("amount")?.doubleValue() ?: 0.0
                totalAmount += amount

                // Taraflar
                def fromParty = delegator.findOne("PartyNameView",
                        [partyId: payment.partyIdFrom], true)
                def toParty = delegator.findOne("PartyNameView",
                        [partyId: payment.partyIdTo], true)

                // Ödeme tipi
                def payType = delegator.findOne("PaymentType",
                        [paymentTypeId: payment.paymentTypeId], true)

                // Durum
                def statusItem = delegator.findOne("StatusItem",
                        [statusId: payment.statusId], true)

                memberList << [
                    paymentGroupId  : m.paymentGroupId,
                    paymentId       : m.paymentId,
                    fromDate        : m.fromDate?.toString() ?: "",
                    thruDate        : m.thruDate?.toString() ?: "",
                    sequenceNum     : m.sequenceNum ?: 0,
                    paymentTypeId   : payment.paymentTypeId ?: "",
                    paymentTypeDesc : payType?.description ?: payment.paymentTypeId ?: "",
                    statusId        : payment.statusId ?: "",
                    statusDesc      : statusItem?.description ?: payment.statusId ?: "",
                    amount          : amount,
                    currencyUomId   : payment.currencyUomId ?: "USD",
                    partyIdFrom     : payment.partyIdFrom ?: "",
                    partyNameFrom   : (fromParty?.firstName ? "${fromParty.firstName} ${fromParty.lastName ?: ''}".trim() : fromParty?.groupName ?: payment.partyIdFrom ?: ""),
                    partyIdTo       : payment.partyIdTo ?: "",
                    partyNameTo     : (toParty?.firstName ? "${toParty.firstName} ${toParty.lastName ?: ''}".trim() : toParty?.groupName ?: payment.partyIdTo ?: ""),
                    paymentRefNum   : payment.paymentRefNum ?: "",
                    effectiveDate   : payment.effectiveDate?.toString() ?: ""
                ]
            }
        }

        def detail = [
            paymentGroupId      : grp.paymentGroupId,
            paymentGroupName    : grp.paymentGroupName ?: "",
            paymentGroupTypeId  : grp.paymentGroupTypeId ?: "",
            paymentGroupTypeDesc: grpType?.description ?: grp.paymentGroupTypeId ?: "",
            totalAmount         : totalAmount,
            members             : memberList
        ]

        return sendJson(response, [success: true, paymentGroup: detail])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Yeni Ödeme Grubu Oluştur
// ─────────────────────────────────────────────────────────────────────────────
def createPaymentGroup() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def paymentGroupTypeId = request.getParameter("paymentGroupTypeId") ?: "BATCH_PAYMENT"
        def paymentGroupName   = request.getParameter("paymentGroupName") ?: ""

        def newId = delegator.getNextSeqId("PaymentGroup")
        def grp   = delegator.makeValue("PaymentGroup")
        grp.paymentGroupId     = newId
        grp.paymentGroupTypeId = paymentGroupTypeId
        grp.paymentGroupName   = paymentGroupName
        delegator.create(grp)

        return sendJson(response, [success: true, paymentGroupId: newId,
                message: "Ödeme grubu oluşturuldu: ${newId}"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Ödeme Grubunu Güncelle
// ─────────────────────────────────────────────────────────────────────────────
def updatePaymentGroup() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def paymentGroupId = request.getParameter("paymentGroupId")
        if (!paymentGroupId) {
            return sendJson(response, [success: false, error: "paymentGroupId gerekli"])
        }
        def grp = delegator.findOne("PaymentGroup", [paymentGroupId: paymentGroupId], false)
        if (!grp) {
            return sendJson(response, [success: false, error: "Grup bulunamadı: ${paymentGroupId}"])
        }

        def name = request.getParameter("paymentGroupName")
        if (name != null) grp.paymentGroupName = name

        delegator.store(grp)
        return sendJson(response, [success: true, message: "Ödeme grubu güncellendi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Ödeme Grubunu Sil
// ─────────────────────────────────────────────────────────────────────────────
def deletePaymentGroup() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def paymentGroupId = request.getParameter("paymentGroupId")
        if (!paymentGroupId) {
            return sendJson(response, [success: false, error: "paymentGroupId gerekli"])
        }

        // Önce üyeleri sil
        delegator.removeByAnd("PaymentGroupMember", [paymentGroupId: paymentGroupId])
        // Sonra grubu sil
        delegator.removeByAnd("PaymentGroup", [paymentGroupId: paymentGroupId])

        return sendJson(response, [success: true, message: "Ödeme grubu silindi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Gruba Ödeme Ekle
// ─────────────────────────────────────────────────────────────────────────────
def addPaymentToGroup() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def paymentGroupId = request.getParameter("paymentGroupId")
        def paymentId      = request.getParameter("paymentId")
        if (!paymentGroupId || !paymentId) {
            return sendJson(response, [success: false, error: "paymentGroupId ve paymentId gerekli"])
        }

        // Grubun var olup olmadığını kontrol et
        def grp = delegator.findOne("PaymentGroup", [paymentGroupId: paymentGroupId], false)
        if (!grp) {
            return sendJson(response, [success: false, error: "Grup bulunamadı: ${paymentGroupId}"])
        }

        // Ödemenin zaten grupta olup olmadığını kontrol et
        def existingConditions = [
            EntityCondition.makeCondition("paymentGroupId", EntityOperator.EQUALS, paymentGroupId),
            EntityCondition.makeCondition("paymentId", EntityOperator.EQUALS, paymentId)
        ]
        def existing = delegator.findList("PaymentGroupMember",
                EntityCondition.makeCondition(existingConditions, EntityOperator.AND),
                null, null, null, false)
        if (existing) {
            return sendJson(response, [success: false, error: "Bu ödeme zaten grupta mevcut"])
        }

        // Sıra numarası hesapla
        def members = delegator.findByAnd("PaymentGroupMember",
                [paymentGroupId: paymentGroupId], null, false)
        def seqNum = (members?.size() ?: 0) + 1

        def member = delegator.makeValue("PaymentGroupMember")
        member.paymentGroupId = paymentGroupId
        member.paymentId      = paymentId
        member.fromDate       = new Timestamp(System.currentTimeMillis())
        member.sequenceNum    = seqNum
        delegator.create(member)

        return sendJson(response, [success: true, message: "Ödeme gruba eklendi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Gruptan Ödeme Çıkar
// ─────────────────────────────────────────────────────────────────────────────
def removePaymentFromGroup() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def paymentGroupId = request.getParameter("paymentGroupId")
        def paymentId      = request.getParameter("paymentId")
        if (!paymentGroupId || !paymentId) {
            return sendJson(response, [success: false, error: "paymentGroupId ve paymentId gerekli"])
        }

        def conditions = [
            EntityCondition.makeCondition("paymentGroupId", EntityOperator.EQUALS, paymentGroupId),
            EntityCondition.makeCondition("paymentId", EntityOperator.EQUALS, paymentId)
        ]
        def removed = delegator.removeByCondition("PaymentGroupMember",
                EntityCondition.makeCondition(conditions, EntityOperator.AND))

        return sendJson(response, [success: true, message: "Ödeme gruptan çıkarıldı (${removed} kayıt)"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Gruba Eklenebilecek Ödemeleri Listele
// ─────────────────────────────────────────────────────────────────────────────
def getAvailablePayments() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def paymentGroupId = request.getParameter("paymentGroupId")

        // Mevcut grup üyelerinin paymentId'lerini topla
        def excludedIds = [] as Set
        if (paymentGroupId) {
            def members = delegator.findByAnd("PaymentGroupMember",
                    [paymentGroupId: paymentGroupId], null, false)
            members?.each { m -> excludedIds << m.paymentId }
        }

        // SENT veya RECEIVED durumundaki ödemeleri getir
        def statusCond = EntityCondition.makeCondition([
            EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, "PMNT_SENT"),
            EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, "PMNT_RECEIVED")
        ], EntityOperator.OR)

        def payments = delegator.findList("Payment", statusCond, null,
                ["-effectiveDate"], EntityFindOptions.findOptions().maxRows(100), false)

        def result = []
        payments?.each { p ->
            if (!excludedIds.contains(p.paymentId)) {
                def fromParty = delegator.findOne("PartyNameView",
                        [partyId: p.partyIdFrom], true)
                def toParty = delegator.findOne("PartyNameView",
                        [partyId: p.partyIdTo], true)
                result << [
                    paymentId    : p.paymentId,
                    amount       : p.getBigDecimal("amount")?.doubleValue() ?: 0.0,
                    currencyUomId: p.currencyUomId ?: "USD",
                    statusId     : p.statusId ?: "",
                    partyIdFrom  : p.partyIdFrom ?: "",
                    partyNameFrom: (fromParty?.firstName ? "${fromParty.firstName} ${fromParty.lastName ?: ''}".trim() : fromParty?.groupName ?: p.partyIdFrom ?: ""),
                    partyIdTo    : p.partyIdTo ?: "",
                    partyNameTo  : (toParty?.firstName ? "${toParty.firstName} ${toParty.lastName ?: ''}".trim() : toParty?.groupName ?: p.partyIdTo ?: ""),
                    paymentRefNum: p.paymentRefNum ?: "",
                    effectiveDate: p.effectiveDate?.toString() ?: ""
                ]
            }
        }

        return sendJson(response, [success: true, payments: result])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Ödeme Grup Tiplerini Listele
// ─────────────────────────────────────────────────────────────────────────────
def getPaymentGroupTypes() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def types = delegator.findList("PaymentGroupType", null, null,
                ["paymentGroupTypeId"], null, true)
        def result = types?.collect { t ->
            [
                paymentGroupTypeId: t.paymentGroupTypeId,
                description       : t.description ?: t.paymentGroupTypeId,
                parentTypeId      : t.parentTypeId ?: ""
            ]
        } ?: []
        return sendJson(response, [success: true, paymentGroupTypes: result])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}
