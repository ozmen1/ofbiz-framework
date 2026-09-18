package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.service.ServiceUtil
import java.text.SimpleDateFormat
import java.sql.Timestamp
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator

/**
 * Fetch accounting summary data for the React dashboard
 */
Map getAccountingSummary() {
    Map result = [:]

    // Get total invoice count
    long invoiceCount = EntityQuery.use(delegator).from('Invoice').queryCount()
    result.invoiceCount = invoiceCount

    // Get total payment count
    long paymentCount = EntityQuery.use(delegator).from('Payment').queryCount()
    result.paymentCount = paymentCount

    // Get recent invoices (top 10)
    List<GenericValue> recentInvoices = EntityQuery.use(delegator)
        .from('Invoice')
        .orderBy('-invoiceDate')
        .maxRows(10)
        .queryList()

    List invoicesList = []
    recentInvoices.each { inv ->
        invoicesList.add([
            invoiceId: inv.invoiceId,
            invoiceTypeId: inv.invoiceTypeId,
            partyIdFrom: inv.partyIdFrom,
            partyId: inv.partyId,
            invoiceDate: inv.invoiceDate?.toString(),
            statusId: inv.statusId,
            description: inv.description,
            currencyUomId: inv.currencyUomId
        ])
    }
    result.recentInvoices = invoicesList

    // Get invoice status distribution for a chart
    // Simplified: just a few statuses
    List statusDistribution = []
    ['INVOICE_IN_PROCESS', 'INVOICE_READY', 'INVOICE_PAID', 'INVOICE_CANCELLED'].each { statusId ->
        long count = EntityQuery.use(delegator)
            .from('Invoice')
            .where('statusId', statusId)
            .queryCount()
        statusDistribution.add([name: statusId, value: count])
    }
    result.statusDistribution = statusDistribution

    // Get active customers (party with CUSTOMER role)
    long customerCount = EntityQuery.use(delegator).from('PartyRole').where('roleTypeId', 'CUSTOMER').queryCount()
    result.customerCount = customerCount

    // Pending approvals (invoices in process)
    long pendingApprovals = EntityQuery.use(delegator).from('Invoice').where('statusId', 'INVOICE_IN_PROCESS').queryCount()
    result.pendingApprovals = pendingApprovals

    // Generate real chart data from invoices
    List chartData = []
    Calendar calendar = Calendar.getInstance()
    calendar.set(Calendar.DAY_OF_MONTH, 1)
    calendar.set(Calendar.HOUR_OF_DAY, 0)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)

    for (int i = 5; i >= 0; i--) {
        Calendar startMonth = (Calendar) calendar.clone()
        startMonth.add(Calendar.MONTH, -i)

        Calendar endMonth = (Calendar) startMonth.clone()
        endMonth.add(Calendar.MONTH, 1)

        SimpleDateFormat monthFormat = new SimpleDateFormat('MMM', Locale.getDefault())
        String monthName = monthFormat.format(startMonth.getTime())

        // Let's count invoices in this month as a proxy for revenue/activity since calculating total amount is complex
        long monthlyInvoices = EntityQuery.use(delegator).from('Invoice')
            .where(
                EntityCondition.makeCondition(
                    'invoiceDate',
                    EntityOperator.GREATER_THAN_EQUAL_TO,
                    new Timestamp(startMonth.getTimeInMillis())
                ),
                EntityCondition.makeCondition(
                    'invoiceDate',
                    EntityOperator.LESS_THAN,
                    new Timestamp(endMonth.getTimeInMillis())
                )
            )
            .queryCount()

        chartData.add([name: monthName, revenue: monthlyInvoices])
    }
    result.revenueData = chartData

    Map serviceResult = ServiceUtil.returnSuccess()
    serviceResult.accountingData = result
    return serviceResult
}
