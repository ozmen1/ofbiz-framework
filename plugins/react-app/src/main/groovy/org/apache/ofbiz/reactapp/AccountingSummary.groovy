/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.accounting.invoice.InvoiceWorker
import java.math.BigDecimal

final String MODULE = "AccountingSummary.groovy"

def delegator = binding.getVariable("delegator")
def request = binding.getVariable("request")

try {
    // 1. Toplam fatura sayısı
    long invoiceCount = EntityQuery.use(delegator).from("Invoice").queryCount()

    // 2. Toplam ödeme sayısı
    long paymentCount = EntityQuery.use(delegator).from("Payment").queryCount()

    // 3. Cari / Müşteri sayısı
    long customerCount = EntityQuery.use(delegator).from("Party").where(
        EntityCondition.makeCondition("partyTypeId", EntityOperator.IN, ["PERSON", "PARTY_GROUP"])
    ).queryCount()

    // 4. Onay bekleyen taslak faturalar
    long pendingApprovals = EntityQuery.use(delegator).from("Invoice").where("statusId", "INVOICE_IN_PROCESS").queryCount()

    // 5. En son faturalar (veritabanından gerçek kayıtlar)
    List<GenericValue> recentInvoicesGv = EntityQuery.use(delegator)
        .from("Invoice")
        .orderBy("-invoiceDate", "-invoiceId")
        .maxRows(5)
        .queryList()

    List recentInvoices = []
    recentInvoicesGv.each { inv ->
        recentInvoices.add([
            invoiceId: inv.invoiceId,
            invoiceTypeId: inv.invoiceTypeId,
            partyIdFrom: inv.partyIdFrom,
            partyId: inv.partyId,
            invoiceDate: inv.invoiceDate ? inv.invoiceDate.toString().substring(0, 10) : "",
            statusId: inv.statusId,
            description: inv.description ?: "",
            currencyUomId: inv.currencyUomId ?: "USD"
        ])
    }

    // 6. Gerçek fatura durum dağılımı
    long paidCount = EntityQuery.use(delegator).from("Invoice").where("statusId", "INVOICE_PAID").queryCount()
    long inProcessCount = EntityQuery.use(delegator).from("Invoice").where("statusId", "INVOICE_IN_PROCESS").queryCount()
    long approvedCount = EntityQuery.use(delegator).from("Invoice").where("statusId", "INVOICE_APPROVED").queryCount()
    long sentCount = EntityQuery.use(delegator).from("Invoice").where("statusId", "INVOICE_SENT").queryCount()
    long readyCount = EntityQuery.use(delegator).from("Invoice").where("statusId", "INVOICE_READY").queryCount()

    List statusDistribution = [
        [name: "Paid", value: (int) paidCount],
        [name: "In Process", value: (int) inProcessCount],
        [name: "Approved", value: (int) approvedCount],
        [name: "Sent", value: (int) sentCount],
        [name: "Ready", value: (int) readyCount]
    ]

    // 7. Özet model
    Map data = [
        invoiceCount: invoiceCount,
        paymentCount: paymentCount,
        customerCount: customerCount,
        pendingApprovals: pendingApprovals,
        recentInvoices: recentInvoices,
        statusDistribution: statusDistribution,
        revenueData: [
            [name: 'Q1', revenue: 4500],
            [name: 'Q2', revenue: 6200],
            [name: 'Q3', revenue: 5800],
            [name: 'Q4', revenue: 7400]
        ]
    ]

    request.setAttribute("accountingData", data)
    return "success"
} catch (Exception e) {
    Debug.logError(e, "Error in AccountingSummary: " + e.getMessage(), MODULE)
    request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
    return "error"
}
