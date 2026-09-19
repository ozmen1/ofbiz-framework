/* codenarc-disable */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.entity.GenericValue
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilValidate
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.base.util.Debug
import org.apache.ofbiz.accounting.invoice.InvoiceWorker
import org.apache.ofbiz.accounting.payment.PaymentWorker
import org.apache.ofbiz.service.ServiceUtil
import java.sql.Timestamp
import java.math.BigDecimal
import java.math.RoundingMode

final String MODULE = "CheckRunEvents.groovy"

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

Timestamp parseDateToTimestamp(Object dateObj, boolean isEndOfDay = false) {
    if (!dateObj) return null
    if (dateObj instanceof Timestamp) return (Timestamp) dateObj
    String str = dateObj.toString().trim()
    if (str.isEmpty()) return null
    try {
        if (str.length() == 10) {
            str += isEndOfDay ? " 23:59:59.999" : " 00:00:00.000"
        }
        return Timestamp.valueOf(str)
    } catch (Exception e) {
        Debug.logWarning("Could not parse timestamp: " + str + " - " + e.getMessage(), MODULE)
        return null
    }
}

String getPartyName(def delegator, String partyId) {
    if (!partyId) return "—"
    try {
        GenericValue pg = EntityQuery.use(delegator).from("PartyGroup").where("partyId", partyId).queryOne()
        if (pg && pg.groupName) return pg.groupName

        GenericValue person = EntityQuery.use(delegator).from("Person").where("partyId", partyId).queryOne()
        if (person) {
            String full = [person.firstName, person.middleName, person.lastName].findAll { it }.join(" ")
            if (full) return full
        }
    } catch (Exception e) {
        Debug.logWarning("Error getting party name for " + partyId + ": " + e.getMessage(), MODULE)
    }
    return partyId
}

String numberToWordsEnglish(BigDecimal amount) {
    if (!amount) return "Zero Dollars"
    long dollars = amount.longValue()
    int cents = ((amount - new BigDecimal(dollars)).abs() * 100).setScale(0, RoundingMode.HALF_UP).intValue()

    String[] units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
                      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
                      "Seventeen", "Eighteen", "Nineteen"]
    String[] tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

    def convertHundreds = { long n ->
        String res = ""
        if (n >= 100) {
            res += units[(int)(n / 100)] + " Hundred "
            n %= 100
        }
        if (n >= 20) {
            res += tens[(int)(n / 10)] + (n % 10 != 0 ? "-" + units[(int)(n % 10)] : "")
        } else if (n > 0) {
            res += units[(int)n]
        }
        return res.trim()
    }

    if (dollars == 0) {
        return "Zero Dollars and " + cents + "/100"
    }

    String result = ""
    if (dollars >= 1000000) {
        result += convertHundreds((long)(dollars / 1000000)) + " Million "
        dollars %= 1000000
    }
    if (dollars >= 1000) {
        result += convertHundreds((long)(dollars / 1000)) + " Thousand "
        dollars %= 1000
    }
    if (dollars > 0) {
        result += convertHundreds(dollars)
    }

    return result.trim() + " and " + String.format("%02d", cents) + "/100 Dollars"
}

String numberToWordsTurkish(BigDecimal amount) {
    if (!amount) return "Sıfır TL"
    long lira = amount.longValue()
    int kurus = ((amount - new BigDecimal(lira)).abs() * 100).setScale(0, RoundingMode.HALF_UP).intValue()

    String[] birler = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"]
    String[] onlar = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"]

    def convertUclu = { long n ->
        String res = ""
        int yuz = (int)(n / 100)
        int on = (int)((n % 100) / 10)
        int bir = (int)(n % 10)
        if (yuz > 1) res += birler[yuz] + " Yüz "
        else if (yuz == 1) res += "Yüz "
        if (on > 0) res += onlar[on] + " "
        if (bir > 0) res += birler[bir] + " "
        return res.trim()
    }

    if (lira == 0) {
        return kurus > 0 ? "Sıfır TL " + kurus + " Kuruş" : "Sıfır TL"
    }

    String result = ""
    if (lira >= 1000000) {
        result += convertUclu((long)(lira / 1000000)) + " Milyon "
        lira %= 1000000
    }
    if (lira >= 1000) {
        long binKisim = (long)(lira / 1000)
        if (binKisim == 1) result += "Bin "
        else result += convertUclu(binKisim) + " Bin "
        lira %= 1000
    }
    if (lira > 0) {
        result += convertUclu(lira) + " "
    }

    result = result.trim() + " TL"
    if (kurus > 0) {
        result += " " + convertUclu((long)kurus) + " Kuruş"
    }
    return result
}

/**
 * 1. getCheckRuns
 * Lists all PaymentGroups where paymentGroupTypeId = 'CHECK_RUN'
 */
String getCheckRuns() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String search = parameters.search?.trim()

        List<GenericValue> rawGroups = EntityQuery.use(delegator)
            .from("PaymentGroup")
            .where("paymentGroupTypeId", "CHECK_RUN")
            .orderBy("-fromDate")
            .queryList()

        List checkRuns = []
        int totalCheckRuns = rawGroups.size()
        int totalChecksIssued = 0
        int totalVoidedChecks = 0
        BigDecimal totalCheckVolume = BigDecimal.ZERO

        for (GenericValue pg : rawGroups) {
            String pgId = pg.paymentGroupId
            String pgName = pg.paymentGroupName ?: ("Check Run #" + pgId)
            Timestamp fromDate = pg.fromDate
            Timestamp thruDate = pg.thruDate

            // Fetch members
            List<GenericValue> members = EntityQuery.use(delegator)
                .from("PaymentGroupMember")
                .where("paymentGroupId", pgId)
                .queryList()

            int checkCount = 0
            int voidCount = 0
            BigDecimal groupTotal = BigDecimal.ZERO
            String samplePaymentMethod = null
            String sampleFinAccount = null

            for (GenericValue m : members) {
                GenericValue payment = EntityQuery.use(delegator)
                    .from("Payment")
                    .where("paymentId", m.paymentId)
                    .queryOne()

                if (payment) {
                    checkCount++
                    BigDecimal amt = payment.amount ?: BigDecimal.ZERO
                    if ("PMNT_VOID".equals(payment.statusId) || "PMNT_CANCELLED".equals(payment.statusId)) {
                        voidCount++
                    } else {
                        groupTotal = groupTotal.add(amt)
                    }
                    if (!samplePaymentMethod && payment.paymentMethodId) {
                        samplePaymentMethod = payment.paymentMethodId
                    }
                    if (!sampleFinAccount && payment.finAccountId) {
                        sampleFinAccount = payment.finAccountId
                    }
                }
            }

            totalChecksIssued += (checkCount - voidCount)
            totalVoidedChecks += voidCount
            totalCheckVolume = totalCheckVolume.add(groupTotal)

            String status = "ACTIVE"
            if (thruDate != null || (checkCount > 0 && voidCount == checkCount)) {
                status = "CANCELLED"
            }

            if (search) {
                String searchLower = search.toLowerCase()
                boolean match = pgId.toLowerCase().contains(searchLower) ||
                                (pgName && pgName.toLowerCase().contains(searchLower)) ||
                                (samplePaymentMethod && samplePaymentMethod.toLowerCase().contains(searchLower))
                if (!match) continue
            }

            checkRuns.add([
                paymentGroupId: pgId,
                paymentGroupName: pgName,
                paymentGroupTypeId: pg.paymentGroupTypeId,
                fromDate: fromDate ? fromDate.toString().substring(0, 19) : null,
                thruDate: thruDate ? thruDate.toString().substring(0, 19) : null,
                checkCount: checkCount,
                activeCheckCount: checkCount - voidCount,
                voidedCheckCount: voidCount,
                totalAmount: groupTotal.doubleValue(),
                status: status,
                paymentMethodId: samplePaymentMethod,
                finAccountId: sampleFinAccount
            ])
        }

        request.setAttribute("checkRuns", checkRuns)
        request.setAttribute("stats", [
            totalCheckRuns: totalCheckRuns,
            totalChecksIssued: totalChecksIssued,
            totalVoidedChecks: totalVoidedChecks,
            totalCheckVolume: totalCheckVolume.doubleValue()
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCheckRuns: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load check runs: " + e.getMessage())
        return "error"
    }
}

/**
 * 2. getCheckRunDetail
 * Returns full details and check list for a given paymentGroupId
 */
String getCheckRunDetail() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String paymentGroupId = parameters.paymentGroupId?.trim()
        if (!paymentGroupId) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentGroupId is required")
            return "error"
        }

        GenericValue pg = EntityQuery.use(delegator)
            .from("PaymentGroup")
            .where("paymentGroupId", paymentGroupId)
            .queryOne()

        if (!pg) {
            request.setAttribute("_ERROR_MESSAGE_", "Check Run payment group not found: " + paymentGroupId)
            return "error"
        }

        List<GenericValue> members = EntityQuery.use(delegator)
            .from("PaymentGroupMember")
            .where("paymentGroupId", paymentGroupId)
            .queryList()

        List checks = []
        BigDecimal totalAmount = BigDecimal.ZERO

        for (GenericValue m : members) {
            GenericValue payment = EntityQuery.use(delegator)
                .from("Payment")
                .where("paymentId", m.paymentId)
                .queryOne()

            if (payment) {
                BigDecimal amt = payment.amount ?: BigDecimal.ZERO
                if (!"PMNT_VOID".equals(payment.statusId) && !"PMNT_CANCELLED".equals(payment.statusId)) {
                    totalAmount = totalAmount.add(amt)
                }

                String statusDesc = payment.statusId
                GenericValue statusItem = EntityQuery.use(delegator)
                    .from("StatusItem")
                    .where("statusId", payment.statusId)
                    .queryOne()
                if (statusItem) statusDesc = statusItem.description ?: payment.statusId

                String payeeName = getPartyName(delegator, payment.partyIdTo)

                // Get applied invoices
                List<GenericValue> applications = EntityQuery.use(delegator)
                    .from("PaymentApplication")
                    .where("paymentId", payment.paymentId)
                    .queryList()

                List appliedInvoices = []
                for (GenericValue app : applications) {
                    appliedInvoices.add([
                        paymentApplicationId: app.paymentApplicationId,
                        invoiceId: app.invoiceId,
                        amountApplied: app.amountApplied ? app.amountApplied.doubleValue() : 0.0
                    ])
                }

                checks.add([
                    paymentId: payment.paymentId,
                    paymentRefNum: payment.paymentRefNum ?: "—",
                    partyIdTo: payment.partyIdTo,
                    payeeName: payeeName,
                    amount: amt.doubleValue(),
                    currencyUomId: payment.currencyUomId ?: "USD",
                    effectiveDate: payment.effectiveDate ? payment.effectiveDate.toString().substring(0, 10) : null,
                    statusId: payment.statusId,
                    statusDesc: statusDesc,
                    paymentMethodId: payment.paymentMethodId,
                    finAccountId: payment.finAccountId,
                    comments: payment.comments,
                    appliedInvoices: appliedInvoices,
                    memberFromDate: m.fromDate ? m.fromDate.toString().substring(0, 19) : null,
                    memberThruDate: m.thruDate ? m.thruDate.toString().substring(0, 19) : null
                ])
            }
        }

        request.setAttribute("checkRun", [
            paymentGroupId: pg.paymentGroupId,
            paymentGroupName: pg.paymentGroupName ?: ("Check Run #" + pg.paymentGroupId),
            paymentGroupTypeId: pg.paymentGroupTypeId,
            fromDate: pg.fromDate ? pg.fromDate.toString().substring(0, 19) : null,
            thruDate: pg.thruDate ? pg.thruDate.toString().substring(0, 19) : null,
            totalAmount: totalAmount.doubleValue(),
            checkCount: checks.size(),
            checks: checks
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCheckRunDetail: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load check run details: " + e.getMessage())
        return "error"
    }
}

/**
 * 3. getPayableInvoicesForCheckRun
 * Lists unpaid purchase invoices ready for check run payment
 */
String getPayableInvoicesForCheckRun() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String vendorPartyId = parameters.vendorPartyId?.trim()
        String asOfDateStr = parameters.asOfDate?.trim()
        Timestamp asOfDate = parseDateToTimestamp(asOfDateStr, true)

        List<EntityCondition> conds = [
            EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "PURCHASE_INVOICE"),
            EntityCondition.makeCondition("statusId", EntityOperator.IN, ["INVOICE_READY", "INVOICE_APPROVED"])
        ]

        if (vendorPartyId) {
            conds.add(EntityCondition.makeCondition("partyIdFrom", EntityOperator.EQUALS, vendorPartyId))
        }

        List<GenericValue> rawInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(EntityCondition.makeCondition(conds, EntityOperator.AND))
            .orderBy("dueDate", "invoiceDate")
            .queryList()

        List payableInvoices = []
        BigDecimal totalOutstanding = BigDecimal.ZERO

        for (GenericValue inv : rawInvoices) {
            String invId = inv.invoiceId
            BigDecimal totalAmt = InvoiceWorker.getInvoiceTotal(inv) ?: BigDecimal.ZERO
            BigDecimal notApplied = InvoiceWorker.getInvoiceNotApplied(inv) ?: BigDecimal.ZERO

            if (notApplied.compareTo(BigDecimal.ZERO) <= 0) {
                continue
            }

            Timestamp dueDate = inv.dueDate
            if (asOfDate && dueDate && dueDate.after(asOfDate)) {
                continue
            }

            String vendorName = getPartyName(delegator, inv.partyIdFrom)

            totalOutstanding = totalOutstanding.add(notApplied)
            payableInvoices.add([
                invoiceId: invId,
                invoiceTypeId: inv.invoiceTypeId,
                invoiceDate: inv.invoiceDate ? inv.invoiceDate.toString().substring(0, 10) : null,
                dueDate: dueDate ? dueDate.toString().substring(0, 10) : null,
                statusId: inv.statusId,
                partyIdFrom: inv.partyIdFrom,
                vendorName: vendorName,
                currencyUomId: inv.currencyUomId ?: "USD",
                totalAmount: totalAmt.doubleValue(),
                outstandingAmount: notApplied.doubleValue(),
                description: inv.description ?: ""
            ])
        }

        request.setAttribute("payableInvoices", payableInvoices)
        request.setAttribute("totalOutstanding", totalOutstanding.doubleValue())
        request.setAttribute("invoiceCount", payableInvoices.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getPayableInvoicesForCheckRun: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load payable invoices: " + e.getMessage())
        return "error"
    }
}

/**
 * 4. createCheckRun
 * Creates payments and check run group for selected invoices
 */
String createCheckRun() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    try {
        String paymentMethodId = parameters.paymentMethodId?.trim()
        String checkStartNumberStr = parameters.checkStartNumber?.toString()?.trim()
        String paymentGroupName = parameters.paymentGroupName?.trim()
        String organizationPartyId = parameters.organizationPartyId?.trim() ?: "Company"
        Object rawInvoiceIds = parameters.invoiceIds

        if (!paymentMethodId) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentMethodId (bank checking account) is required")
            return "error"
        }

        List<String> invoiceIdList = []
        if (rawInvoiceIds instanceof List) {
            invoiceIdList = (List<String>) rawInvoiceIds
        } else if (rawInvoiceIds instanceof String) {
            String str = (String) rawInvoiceIds
            if (str.startsWith("[") && str.endsWith("]")) {
                str = str.substring(1, str.length() - 1)
            }
            invoiceIdList = str.split(",").collect { it.replace("\"", "").replace("'", "").trim() }.findAll { !it.isEmpty() }
        }

        if (!invoiceIdList) {
            request.setAttribute("_ERROR_MESSAGE_", "At least one invoiceId must be selected")
            return "error"
        }

        Long startNum = 100001L
        if (checkStartNumberStr) {
            try {
                startNum = Long.parseLong(checkStartNumberStr)
            } catch (Exception ignored) {}
        } else {
            // Find max check number currently in db
            List<GenericValue> lastChecks = EntityQuery.use(delegator)
                .from("Payment")
                .where(EntityCondition.makeCondition("paymentRefNum", EntityOperator.NOT_EQUAL, null))
                .orderBy("-createdStamp")
                .maxRows(20)
                .queryList()

            Long maxRef = 0L
            for (GenericValue chk : lastChecks) {
                String ref = chk.paymentRefNum?.replaceAll("[^0-9]", "")
                if (ref) {
                    try {
                        long val = Long.parseLong(ref)
                        if (val > maxRef) maxRef = val
                    } catch (Exception ignored) {}
                }
            }
            if (maxRef > 0) startNum = maxRef + 1
        }

        // Verify and prepare invoices: ensure each invoice is in INVOICE_READY status
        for (String invId : invoiceIdList) {
            GenericValue inv = EntityQuery.use(delegator).from("Invoice").where("invoiceId", invId).queryOne()
            if (inv && "INVOICE_APPROVED".equals(inv.statusId)) {
                dispatcher.runSync("setInvoiceStatus", [
                    invoiceId: invId,
                    statusId: "INVOICE_READY",
                    userLogin: userLogin
                ])
            }
        }

        // Run createPaymentAndPaymentGroupForInvoices
        Map serviceCtx = [
            organizationPartyId: organizationPartyId,
            paymentMethodId: paymentMethodId,
            invoiceIds: invoiceIdList,
            checkStartNumber: startNum - 1L, // service increments by 1 for each check
            userLogin: userLogin
        ]

        Map result = dispatcher.runSync("createPaymentAndPaymentGroupForInvoices", serviceCtx)
        if (ServiceUtil.isError(result)) {
            String errMsg = ServiceUtil.getErrorMessage(result)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        String paymentGroupId = (String) result.paymentGroupId
        if (paymentGroupId && paymentGroupName) {
            GenericValue pg = EntityQuery.use(delegator).from("PaymentGroup").where("paymentGroupId", paymentGroupId).queryOne()
            if (pg) {
                pg.paymentGroupName = paymentGroupName
                pg.store()
            }
        }

        request.setAttribute("paymentGroupId", paymentGroupId)
        request.setAttribute("_EVENT_MESSAGE_", "Check Run created successfully: #" + paymentGroupId)
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in createCheckRun: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to create check run: " + e.getMessage())
        return "error"
    }
}

/**
 * 5. cancelCheckRun
 * Voids all check payments in a payment group and cancels the group
 */
String cancelCheckRun() {
    def delegator = binding.getVariable("delegator")
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    try {
        String paymentGroupId = parameters.paymentGroupId?.trim()
        if (!paymentGroupId) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentGroupId is required")
            return "error"
        }

        Map result = dispatcher.runSync("cancelCheckRunPayments", [
            paymentGroupId: paymentGroupId,
            userLogin: userLogin
        ])

        if (ServiceUtil.isError(result)) {
            String errMsg = ServiceUtil.getErrorMessage(result)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        // Mark payment group thruDate
        GenericValue pg = EntityQuery.use(delegator).from("PaymentGroup").where("paymentGroupId", paymentGroupId).queryOne()
        if (pg) {
            pg.thruDate = UtilDateTime.nowTimestamp()
            pg.store()
        }

        request.setAttribute("_EVENT_MESSAGE_", "Check Run #" + paymentGroupId + " and all member checks have been voided/cancelled.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in cancelCheckRun: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to cancel check run: " + e.getMessage())
        return "error"
    }
}

/**
 * 6. voidPaymentRecord
 * Invokes standard OFBiz voidPayment service to void check/payment, reverse GL trans and reinstate invoices
 */
String voidPaymentRecord() {
    def dispatcher = binding.getVariable("dispatcher")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")
    GenericValue userLogin = getSystemUserLogin()

    try {
        String paymentId = parameters.paymentId?.trim()
        if (!paymentId) {
            request.setAttribute("_ERROR_MESSAGE_", "paymentId is required")
            return "error"
        }

        Map result = dispatcher.runSync("voidPayment", [
            paymentId: paymentId,
            userLogin: userLogin
        ])

        if (ServiceUtil.isError(result)) {
            String errMsg = ServiceUtil.getErrorMessage(result)
            request.setAttribute("_ERROR_MESSAGE_", errMsg)
            return "error"
        }

        request.setAttribute("paymentId", paymentId)
        request.setAttribute("_EVENT_MESSAGE_", "Payment/Check #" + paymentId + " has been successfully voided and related accounting entries reversed.")
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in voidPaymentRecord: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to void payment: " + e.getMessage())
        return "error"
    }
}

/**
 * 7. getCheckPrintData
 * Prepares printable check voucher data (check layout, payer, payee, words, invoices)
 */
String getCheckPrintData() {
    def delegator = binding.getVariable("delegator")
    def parameters = binding.getVariable("parameters")
    def request = binding.getVariable("request")

    try {
        String paymentGroupId = parameters.paymentGroupId?.trim()
        String paymentId = parameters.paymentId?.trim()

        List<String> targetPaymentIds = []
        if (paymentId) {
            targetPaymentIds.add(paymentId)
        } else if (paymentGroupId) {
            List<GenericValue> members = EntityQuery.use(delegator)
                .from("PaymentGroupMember")
                .where("paymentGroupId", paymentGroupId)
                .queryList()
            for (GenericValue m : members) {
                targetPaymentIds.add(m.paymentId)
            }
        }

        if (!targetPaymentIds) {
            request.setAttribute("_ERROR_MESSAGE_", "Either paymentGroupId or paymentId is required")
            return "error"
        }

        // Payer information (Company)
        String companyPartyId = "Company"
        String companyName = getPartyName(delegator, companyPartyId)

        List checkVouchers = []

        for (String pId : targetPaymentIds) {
            GenericValue payment = EntityQuery.use(delegator)
                .from("Payment")
                .where("paymentId", pId)
                .queryOne()

            if (!payment) continue

            BigDecimal amt = payment.amount ?: BigDecimal.ZERO
            String payeeName = getPartyName(delegator, payment.partyIdTo)

            // Bank details
            String bankName = "Corporate Checking Account"
            String bankAccountNum = "XXXX-XXXX-8821"
            if (payment.finAccountId) {
                GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", payment.finAccountId).queryOne()
                if (fa) {
                    bankName = fa.finAccountName ?: fa.finAccountId
                    bankAccountNum = fa.finAccountCode ?: fa.finAccountId
                }
            }

            // Invoices applied
            List<GenericValue> apps = EntityQuery.use(delegator)
                .from("PaymentApplication")
                .where("paymentId", pId)
                .queryList()

            List invoicesBreakdown = []
            for (GenericValue app : apps) {
                GenericValue inv = app.invoiceId ? EntityQuery.use(delegator).from("Invoice").where("invoiceId", app.invoiceId).queryOne() : null
                invoicesBreakdown.add([
                    invoiceId: app.invoiceId ?: "—",
                    invoiceDate: inv?.invoiceDate ? inv.invoiceDate.toString().substring(0, 10) : null,
                    description: inv?.description ?: "",
                    amountApplied: app.amountApplied ? app.amountApplied.doubleValue() : 0.0
                ])
            }

            checkVouchers.add([
                paymentId: payment.paymentId,
                checkNumber: payment.paymentRefNum ?: ("CHK-" + payment.paymentId),
                date: payment.effectiveDate ? payment.effectiveDate.toString().substring(0, 10) : UtilDateTime.nowDateString(),
                amount: amt.doubleValue(),
                currencyUomId: payment.currencyUomId ?: "USD",
                amountInWordsEn: numberToWordsEnglish(amt),
                amountInWordsTr: numberToWordsTurkish(amt),
                payee: [
                    partyId: payment.partyIdTo,
                    name: payeeName
                ],
                payer: [
                    partyId: companyPartyId,
                    name: companyName,
                    bankName: bankName,
                    accountNumber: bankAccountNum
                ],
                memo: payment.comments ?: ("Payment for " + (invoicesBreakdown.size()) + " invoice(s)"),
                invoices: invoicesBreakdown,
                statusId: payment.statusId
            ])
        }

        request.setAttribute("vouchers", checkVouchers)
        request.setAttribute("voucherCount", checkVouchers.size())
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCheckPrintData: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load check print data: " + e.getMessage())
        return "error"
    }
}

/**
 * 8. getCheckRunMetadata
 * Returns bank checking payment methods and next check number
 */
String getCheckRunMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")

    try {
        // Payment methods for company checks
        List<GenericValue> checkMethods = EntityQuery.use(delegator)
            .from("PaymentMethod")
            .where(EntityCondition.makeCondition("paymentMethodTypeId", EntityOperator.IN, ["COMPANY_CHECK", "CERTIFIED_CHECK"]))
            .queryList()

        List paymentMethods = []
        for (GenericValue pm : checkMethods) {
            String faName = pm.finAccountId ?: pm.paymentMethodId
            if (pm.finAccountId) {
                GenericValue fa = EntityQuery.use(delegator).from("FinAccount").where("finAccountId", pm.finAccountId).queryOne()
                if (fa && fa.finAccountName) faName = fa.finAccountName
            }
            paymentMethods.add([
                paymentMethodId: pm.paymentMethodId,
                paymentMethodTypeId: pm.paymentMethodTypeId,
                finAccountId: pm.finAccountId,
                finAccountName: faName,
                description: pm.paymentMethodId + " - " + faName
            ])
        }

        // If no payment method found with COMPANY_CHECK, provide fallback checking finAccounts
        if (!paymentMethods) {
            List<GenericValue> finAccounts = EntityQuery.use(delegator)
                .from("FinAccount")
                .where("finAccountTypeId", "BANK_ACCOUNT")
                .queryList()

            for (GenericValue fa : finAccounts) {
                paymentMethods.add([
                    paymentMethodId: fa.finAccountId,
                    paymentMethodTypeId: "COMPANY_CHECK",
                    finAccountId: fa.finAccountId,
                    finAccountName: fa.finAccountName ?: fa.finAccountId,
                    description: fa.finAccountId + " (" + (fa.finAccountName ?: "") + ")"
                ])
            }
        }

        // Next check number
        List<GenericValue> lastChecks = EntityQuery.use(delegator)
            .from("Payment")
            .where(EntityCondition.makeCondition("paymentRefNum", EntityOperator.NOT_EQUAL, null))
            .orderBy("-createdStamp")
            .maxRows(30)
            .queryList()

        Long maxRef = 100100L
        for (GenericValue chk : lastChecks) {
            String ref = chk.paymentRefNum?.replaceAll("[^0-9]", "")
            if (ref) {
                try {
                    long val = Long.parseLong(ref)
                    if (val > maxRef) maxRef = val
                } catch (Exception ignored) {}
            }
        }
        Long nextCheckNumber = maxRef + 1L

        // Vendors with open invoices
        List<GenericValue> openInvoices = EntityQuery.use(delegator)
            .from("Invoice")
            .where(EntityCondition.makeCondition([
                EntityCondition.makeCondition("invoiceTypeId", EntityOperator.EQUALS, "PURCHASE_INVOICE"),
                EntityCondition.makeCondition("statusId", EntityOperator.IN, ["INVOICE_READY", "INVOICE_APPROVED"])
            ], EntityOperator.AND))
            .queryList()

        Set<String> vendorIds = []
        for (GenericValue inv : openInvoices) {
            if (inv.partyIdFrom) vendorIds.add(inv.partyIdFrom)
        }

        List vendors = []
        for (String vId : vendorIds) {
            vendors.add([
                partyId: vId,
                name: getPartyName(delegator, vId)
            ])
        }

        request.setAttribute("metadata", [
            paymentMethods: paymentMethods,
            nextCheckNumber: nextCheckNumber,
            vendors: vendors
        ])
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getCheckRunMetadata: " + e.getMessage(), MODULE)
        request.setAttribute("_ERROR_MESSAGE_", "Failed to load check run metadata: " + e.getMessage())
        return "error"
    }
}
