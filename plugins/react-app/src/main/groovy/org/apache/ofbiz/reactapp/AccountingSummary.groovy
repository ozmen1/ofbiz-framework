
Map data = [
    invoiceCount: 15,
    paymentCount: 8,
    customerCount: 42,
    pendingApprovals: 5,
    revenueData: [
        [name: 'Jan', revenue: 4000],
        [name: 'Feb', revenue: 3000],
        [name: 'Mar', revenue: 5000]
    ],
    recentInvoices: [
        [invoiceId: 'INV-1001', invoiceTypeId: 'SALES_INVOICE', partyIdFrom: 'Company',
         partyId: 'Cust101', invoiceDate: '2026-07-10', statusId: 'INVOICE_READY',
         description: 'Yazılım Geliştirme', currencyUomId: 'USD'],
        [invoiceId: 'INV-1002', invoiceTypeId: 'SALES_INVOICE', partyIdFrom: 'Company',
         partyId: 'Cust102', invoiceDate: '2026-07-09', statusId: 'INVOICE_PAID',
         description: 'Danışmanlık', currencyUomId: 'USD']
    ],
    statusDistribution: [
        [name: 'Paid', value: 60],
        [name: 'Pending', value: 40]
    ]
]

request.setAttribute('accountingData', data)
return 'success'
