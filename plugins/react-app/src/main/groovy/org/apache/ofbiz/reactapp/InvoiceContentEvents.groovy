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
 * InvoiceContentEvents.groovy
 * Faz 7 – Fatura Notları, Şartları ve Evrak Ekleri
 *
 * Endpoint'ler:
 *   getInvoiceNotes      – Fatura notlarını listele
 *   createInvoiceNote    – Yeni not ekle
 *   deleteInvoiceNote    – Notu sil
 *   getInvoiceTerms      – Fatura vade şartlarını listele
 *   createInvoiceTerm    – Yeni şart ekle
 *   updateInvoiceTerm    – Şartı güncelle
 *   deleteInvoiceTerm    – Şartı sil
 *   getTermTypes         – Şart tipleri listele (FIN_PAYMENT_TERM, FIN_PAYMENT_DISC vb.)
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
// 1. Fatura Notlarını Listele
// ─────────────────────────────────────────────────────────────────────────────
def getInvoiceNotes() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def invoiceId = request.getParameter("invoiceId")
        if (!invoiceId) {
            return sendJson(response, [success: false, error: "invoiceId gerekli"])
        }

        def invoiceNotes = delegator.findByAnd("InvoiceNote",
                [invoiceId: invoiceId], ["-noteId"], false)

        def result = []
        invoiceNotes?.each { inNote ->
            def noteData = delegator.findOne("NoteData", [noteId: inNote.noteId], false)
            if (noteData) {
                result << [
                    invoiceId  : inNote.invoiceId,
                    noteId     : inNote.noteId,
                    noteName   : noteData.noteName ?: "",
                    noteInfo   : noteData.noteInfo ?: "",
                    noteParty  : noteData.noteParty ?: "",
                    noteDateTime: noteData.noteDateTime?.toString() ?: ""
                ]
            }
        }

        return sendJson(response, [success: true, invoiceNotes: result])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Faturaya Not Ekle
// ─────────────────────────────────────────────────────────────────────────────
def createInvoiceNote() {
    def request   = request
    def response  = response
    def delegator = delegator
    def dispatcher = dispatcher
    def userLogin  = userLogin

    try {
        def invoiceId = request.getParameter("invoiceId")
        def noteName  = request.getParameter("noteName") ?: "Fatura Notu"
        def noteInfo  = request.getParameter("noteInfo") ?: ""

        if (!invoiceId || !noteInfo?.trim()) {
            return sendJson(response, [success: false, error: "invoiceId ve noteInfo gerekli"])
        }

        // Önce NoteData oluştur
        def noteId  = delegator.getNextSeqId("NoteData")
        def noteData = delegator.makeValue("NoteData")
        noteData.noteId       = noteId
        noteData.noteName     = noteName
        noteData.noteInfo     = noteInfo
        noteData.noteParty    = userLogin?.partyId ?: "Company"
        noteData.noteDateTime = new Timestamp(System.currentTimeMillis())
        delegator.create(noteData)

        // InvoiceNote ilişkisini oluştur
        def invoiceNote = delegator.makeValue("InvoiceNote")
        invoiceNote.invoiceId = invoiceId
        invoiceNote.noteId    = noteId
        delegator.create(invoiceNote)

        return sendJson(response, [success: true, noteId: noteId,
                message: "Not başarıyla eklendi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Fatura Notunu Sil
// ─────────────────────────────────────────────────────────────────────────────
def deleteInvoiceNote() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def invoiceId = request.getParameter("invoiceId")
        def noteId    = request.getParameter("noteId")

        if (!invoiceId || !noteId) {
            return sendJson(response, [success: false, error: "invoiceId ve noteId gerekli"])
        }

        // InvoiceNote ilişkisini sil
        delegator.removeByAnd("InvoiceNote", [invoiceId: invoiceId, noteId: noteId])
        // NoteData'yı sil
        delegator.removeByAnd("NoteData", [noteId: noteId])

        return sendJson(response, [success: true, message: "Not silindi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Fatura Vade Şartlarını Listele
// ─────────────────────────────────────────────────────────────────────────────
def getInvoiceTerms() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        def invoiceId = request.getParameter("invoiceId")
        if (!invoiceId) {
            return sendJson(response, [success: false, error: "invoiceId gerekli"])
        }

        def terms = delegator.findByAnd("InvoiceTerm",
                [invoiceId: invoiceId], ["invoiceTermId"], false)

        def result = []
        terms?.each { t ->
            def termType = delegator.findOne("TermType", [termTypeId: t.termTypeId], true)
            result << [
                invoiceTermId    : t.invoiceTermId,
                invoiceId        : t.invoiceId,
                termTypeId       : t.termTypeId ?: "",
                termTypeDesc     : termType?.description ?: t.termTypeId ?: "",
                termValue        : t.getBigDecimal("termValue")?.doubleValue() ?: 0.0,
                termDays         : t.getLong("termDays") ?: 0,
                textValue        : t.textValue ?: "",
                description      : t.description ?: "",
                invoiceItemSeqId : t.invoiceItemSeqId ?: ""
            ]
        }

        return sendJson(response, [success: true, invoiceTerms: result])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Faturaya Vade Şartı Ekle
// ─────────────────────────────────────────────────────────────────────────────
def createInvoiceTerm() {
    def request   = request
    def response  = response
    def delegator = delegator
    def dispatcher = dispatcher
    def userLogin  = userLogin

    try {
        def invoiceId   = request.getParameter("invoiceId")
        def termTypeId  = request.getParameter("termTypeId") ?: "FIN_PAYMENT_TERM"
        def termValueStr = request.getParameter("termValue") ?: "0"
        def termDaysStr  = request.getParameter("termDays") ?: "0"
        def textValue   = request.getParameter("textValue") ?: ""
        def description = request.getParameter("description") ?: ""

        if (!invoiceId) {
            return sendJson(response, [success: false, error: "invoiceId gerekli"])
        }

        def serviceParams = [
            userLogin      : userLogin,
            invoiceId      : invoiceId,
            termTypeId     : termTypeId,
            termValue      : new BigDecimal(termValueStr),
            termDays       : Long.parseLong(termDaysStr),
            textValue      : textValue,
            description    : description
        ]

        def result = dispatcher.runSync("createInvoiceTerm", serviceParams)
        if (result?.responseMessage == "error") {
            return sendJson(response, [success: false, error: result.errorMessage ?: "Şart eklenemedi"])
        }

        return sendJson(response, [success: true,
                invoiceTermId: result?.invoiceTermId,
                message: "Vade şartı eklendi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Vade Şartını Güncelle
// ─────────────────────────────────────────────────────────────────────────────
def updateInvoiceTerm() {
    def request   = request
    def response  = response
    def delegator = delegator
    def dispatcher = dispatcher
    def userLogin  = userLogin

    try {
        def invoiceTermId = request.getParameter("invoiceTermId")
        if (!invoiceTermId) {
            return sendJson(response, [success: false, error: "invoiceTermId gerekli"])
        }

        def term = delegator.findOne("InvoiceTerm", [invoiceTermId: invoiceTermId], false)
        if (!term) {
            return sendJson(response, [success: false, error: "Şart bulunamadı: ${invoiceTermId}"])
        }

        def termTypeId  = request.getParameter("termTypeId")
        def termValue   = request.getParameter("termValue")
        def termDays    = request.getParameter("termDays")
        def textValue   = request.getParameter("textValue")
        def description = request.getParameter("description")

        if (termTypeId)  term.termTypeId  = termTypeId
        if (termValue)   term.set("termValue", new BigDecimal(termValue))
        if (termDays)    term.set("termDays", Long.parseLong(termDays))
        if (textValue != null)   term.textValue   = textValue
        if (description != null) term.description = description

        delegator.store(term)
        return sendJson(response, [success: true, message: "Vade şartı güncellendi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Vade Şartını Sil
// ─────────────────────────────────────────────────────────────────────────────
def deleteInvoiceTerm() {
    def request   = request
    def response  = response
    def delegator = delegator
    def dispatcher = dispatcher
    def userLogin  = userLogin

    try {
        def invoiceTermId = request.getParameter("invoiceTermId")
        if (!invoiceTermId) {
            return sendJson(response, [success: false, error: "invoiceTermId gerekli"])
        }

        // Önce özellikleri sil
        delegator.removeByAnd("InvoiceTermAttribute", [invoiceTermId: invoiceTermId])
        // Sonra termi sil
        delegator.removeByAnd("InvoiceTerm", [invoiceTermId: invoiceTermId])

        return sendJson(response, [success: true, message: "Vade şartı silindi"])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Şart Tiplerini Listele
// ─────────────────────────────────────────────────────────────────────────────
def getTermTypes() {
    def request   = request
    def response  = response
    def delegator = delegator

    try {
        // Muhasebe ile ilgili term tiplerini getir
        def relevantTermTypes = [
            "FIN_PAYMENT_TERM",
            "FIN_PAYMENT_DISC",
            "LOAN_PAYMENT",
            "COMM_ORDER_QTY",
            "COMM_ORDER_SUBTOT",
            "PURCHASE_PENALTY"
        ]
        def conditions = EntityCondition.makeCondition(
            relevantTermTypes.collect { tid ->
                EntityCondition.makeCondition("termTypeId", EntityOperator.EQUALS, tid)
            },
            EntityOperator.OR
        )
        def termTypes = delegator.findList("TermType", conditions, null,
                ["termTypeId"], null, true)

        // Eğer hiç bulunamazsa tüm tipleri getir
        if (!termTypes) {
            termTypes = delegator.findList("TermType", null, null,
                    ["termTypeId"], null, true)
        }

        def result = termTypes?.collect { t ->
            [
                termTypeId  : t.termTypeId,
                description : t.description ?: t.termTypeId,
                parentTypeId: t.parentTypeId ?: ""
            ]
        } ?: []

        return sendJson(response, [success: true, termTypes: result])
    } catch (Exception e) {
        return sendJson(response, [success: false, error: e.message])
    }
}
