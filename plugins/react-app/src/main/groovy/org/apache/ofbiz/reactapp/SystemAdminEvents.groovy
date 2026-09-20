/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.UtilDateTime
import org.apache.ofbiz.base.util.UtilHttp
import org.apache.ofbiz.base.util.UtilMisc
import org.apache.ofbiz.base.util.cache.UtilCache
import org.apache.ofbiz.entity.condition.EntityCondition
import org.apache.ofbiz.entity.condition.EntityOperator
import org.apache.ofbiz.entity.util.EntityQuery
import java.lang.management.ManagementFactory

Map getParams(def binding) {
    def request = binding.getVariable("request")
    def parameters = binding.hasVariable("parameters") ? binding.getVariable("parameters") : [:]
    def httpParams = UtilHttp.getParameterMap(request)
    Map merged = new HashMap()
    if (parameters) merged.putAll(parameters)
    if (httpParams) merged.putAll(httpParams)
    return merged
}

/**
 * OFBiz UtilCache havuzlarını ve JVM bellek durumunu döner.
 */
String getCacheStatus() {
    def request = binding.getVariable("request")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    try {
        def params = getParams(binding)
        def search = params.searchQuery ? params.searchQuery.trim().toLowerCase() : ""

        def cacheList = []
        long totalCacheMemory = 0

        def names = new TreeSet(UtilCache.getUtilCacheTableKeySet())
        names.each { cacheName ->
            if (!search || cacheName.toLowerCase().contains(search)) {
                def utilCache = UtilCache.findCache(cacheName)
                if (utilCache) {
                    long mem = 0
                    try {
                        mem = utilCache.getSizeInBytes()
                    } catch (Exception ignored) {}
                    totalCacheMemory += mem

                    cacheList.add([
                        cacheName: utilCache.getName(),
                        cacheSize: utilCache.size(),
                        hitCount: utilCache.getHitCount(),
                        missCountTot: utilCache.getMissCountTotal(),
                        missCountNotFound: utilCache.getMissCountNotFound(),
                        missCountExpired: utilCache.getMissCountExpired(),
                        removeHitCount: utilCache.getRemoveHitCount(),
                        maxInMemory: utilCache.getMaxInMemory(),
                        expireTime: utilCache.getExpireTime(),
                        useSoftReference: utilCache.getUseSoftReference(),
                        cacheMemory: mem
                    ])
                }
            }
        }

        def rt = Runtime.getRuntime()
        long totalMem = rt.totalMemory()
        long freeMem = rt.freeMemory()
        long usedMem = totalMem - freeMem
        long maxMem = rt.maxMemory()

        def memoryInfo = [
            totalMemory: totalMem,
            freeMemory: freeMem,
            usedMemory: usedMem,
            maxMemory: maxMem,
            totalCacheMemory: totalCacheMemory
        ]

        request.setAttribute("cacheList", cacheList)
        request.setAttribute("memoryInfo", memoryInfo)
        request.setAttribute("totalCount", cacheList.size())
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Cache bilgileri alınırken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * Belirli bir önbelleği temizler.
 */
String clearCache() {
    def request = binding.getVariable("request")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    def params = getParams(binding)
    def cacheName = params.cacheName

    if (!cacheName) {
        request.setAttribute("_ERROR_MESSAGE_", "Cache adı belirtilmedi.")
        return "error"
    }

    try {
        UtilCache.clearCache(cacheName)
        request.setAttribute("success", true)
        request.setAttribute("message", "'${cacheName}' önbelleği başarıyla temizlendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Önbellek temizlenirken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * Tüm OFBiz önbellek havuzlarını temizler.
 */
String clearAllCaches() {
    def request = binding.getVariable("request")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    try {
        UtilCache.clearAllCaches()
        request.setAttribute("message", "Tüm sistem önbellekleri başarıyla temizlendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Tüm önbellekler temizlenirken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * JVM Garbage Collector çağrısı yapar.
 */
String forceGarbageCollection() {
    def request = binding.getVariable("request")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    try {
        System.gc()
        def rt = Runtime.getRuntime()
        request.setAttribute("memoryInfo", [
            totalMemory: rt.totalMemory(),
            freeMemory: rt.freeMemory(),
            usedMemory: rt.totalMemory() - rt.freeMemory(),
            maxMemory: rt.maxMemory()
        ])
        request.setAttribute("message", "Çöp toplayıcı (Garbage Collector) tetiklendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "GC tetiklenirken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * OFBiz JobSandbox tablosundaki zamanlanmış / arka plan görevleri listeler.
 */
String getScheduledJobs() {
    def request = binding.getVariable("request")
    def delegator = binding.getVariable("delegator")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    try {
        def params = getParams(binding)
        int viewIndex = 0
        int viewSize = 15

        if (params.viewIndex) {
            try { viewIndex = Integer.parseInt(params.viewIndex.toString()) } catch (NumberFormatException ignored) {}
        }
        if (params.viewSize) {
            try { viewSize = Integer.parseInt(params.viewSize.toString()) } catch (NumberFormatException ignored) {}
        }

        def conditions = []
        if (params.statusId && params.statusId != 'ALL') {
            conditions.add(EntityCondition.makeCondition("statusId", EntityOperator.EQUALS, params.statusId))
        }

        if (params.searchQuery && params.searchQuery.trim()) {
            def query = params.searchQuery.trim()
            conditions.add(EntityCondition.makeCondition([
                EntityCondition.makeCondition("jobName", EntityOperator.LIKE, "%" + query + "%"),
                EntityCondition.makeCondition("serviceName", EntityOperator.LIKE, "%" + query + "%"),
                EntityCondition.makeCondition("jobId", EntityOperator.LIKE, "%" + query + "%")
            ], EntityOperator.OR))
        }

        def baseQuery = EntityQuery.use(delegator).from("JobSandbox")
        if (!conditions.isEmpty()) {
            baseQuery = baseQuery.where(conditions)
        }

        long totalCount = baseQuery.queryCount()
        def jobGvs = baseQuery.orderBy("-runTime", "-startDateTime")
            .maxRows(viewSize)
            .offset(viewIndex * viewSize)
            .queryList()

        def jobs = []
        jobGvs.each { j ->
            jobs.add([
                jobId: j.jobId,
                jobName: j.jobName ?: j.serviceName,
                serviceName: j.serviceName,
                statusId: j.statusId,
                runTime: j.runTime ? j.runTime.toString() : null,
                startDateTime: j.startDateTime ? j.startDateTime.toString() : null,
                finishDateTime: j.finishDateTime ? j.finishDateTime.toString() : null,
                cancelDateTime: j.cancelDateTime ? j.cancelDateTime.toString() : null,
                currentRetryCount: j.currentRetryCount ?: 0,
                maxRetry: j.maxRetry ?: 0,
                poolId: j.poolId,
                authUserLoginId: j.authUserLoginId,
                jobResult: j.jobResult
            ])
        }

        // Özet sayaçlar
        long pendingCount = EntityQuery.use(delegator).from("JobSandbox").where("statusId", "SERVICE_PENDING").queryCount()
        long runningCount = EntityQuery.use(delegator).from("JobSandbox").where("statusId", "SERVICE_RUNNING").queryCount()
        long finishedCount = EntityQuery.use(delegator).from("JobSandbox").where("statusId", "SERVICE_FINISHED").queryCount()
        long failedCount = EntityQuery.use(delegator).from("JobSandbox").where("statusId", "SERVICE_FAILED").queryCount()

        request.setAttribute("jobs", jobs)
        request.setAttribute("totalCount", totalCount)
        request.setAttribute("viewIndex", viewIndex)
        request.setAttribute("viewSize", viewSize)
        request.setAttribute("stats", [
            pending: pendingCount,
            running: runningCount,
            finished: finishedCount,
            failed: failedCount
        ])
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Zamanlanmış görevler alınırken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * Zamanlanmış görevi iptal eder.
 */
String cancelScheduledJob() {
    def request = binding.getVariable("request")
    def dispatcher = binding.getVariable("dispatcher")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    def params = getParams(binding)
    def jobId = params.jobId

    if (!jobId) {
        request.setAttribute("_ERROR_MESSAGE_", "Görev ID (jobId) belirtilmedi.")
        return "error"
    }

    try {
        def result = dispatcher.runSync("cancelScheduledJob", [jobId: jobId, userLogin: userLogin])
        if (org.apache.ofbiz.service.ServiceUtil.isError(result)) {
            request.setAttribute("_ERROR_MESSAGE_", org.apache.ofbiz.service.ServiceUtil.getErrorMessage(result))
            return "error"
        }
        request.setAttribute("success", true)
        request.setAttribute("message", "Görev #${jobId} başarıyla iptal edildi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Görev iptal edilirken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * Başarısız / Kilitlenmiş görevi sıfırlayıp yeniden çalışabilir hale getirir.
 */
String resetScheduledJob() {
    def request = binding.getVariable("request")
    def dispatcher = binding.getVariable("dispatcher")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    def params = getParams(binding)
    def jobId = params.jobId

    if (!jobId) {
        request.setAttribute("_ERROR_MESSAGE_", "Görev ID (jobId) belirtilmedi.")
        return "error"
    }

    try {
        def result = dispatcher.runSync("resetScheduledJob", [jobId: jobId, userLogin: userLogin])
        if (org.apache.ofbiz.service.ServiceUtil.isError(result)) {
            request.setAttribute("_ERROR_MESSAGE_", org.apache.ofbiz.service.ServiceUtil.getErrorMessage(result))
            return "error"
        }
        request.setAttribute("success", true)
        request.setAttribute("message", "Görev #${jobId} durumu sıfırlandı (Pending yapıldı).")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Görev sıfırlanırken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * Belirtilen OFBiz servisini asenkron olarak tetikler.
 */
String runServiceNow() {
    def request = binding.getVariable("request")
    def dispatcher = binding.getVariable("dispatcher")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    def params = getParams(binding)
    def serviceName = params.serviceName

    if (!serviceName) {
        request.setAttribute("_ERROR_MESSAGE_", "Servis adı (serviceName) belirtilmedi.")
        return "error"
    }

    try {
        dispatcher.runAsync(serviceName, [userLogin: userLogin])
        request.setAttribute("success", true)
        request.setAttribute("message", "'${serviceName}' servisi arka planda asenkron olarak tetiklendi.")
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Servis tetiklenirken hata: " + e.getMessage())
        return "error"
    }
}

/**
 * JVM, CPU, Bellek, Thread ve OFBiz çekirdek tanılama metriklerini döner.
 */
String getSystemDiagnostics() {
    def request = binding.getVariable("request")
    def delegator = binding.getVariable("delegator")
    def session = request.getSession()
    def userLogin = session ? session.getAttribute("userLogin") : null

    if (!userLogin) {
        request.setAttribute("_ERROR_MESSAGE_", "Yetkilendirme hatası: Lütfen giriş yapın.")
        return "error"
    }

    try {
        def rt = Runtime.getRuntime()
        def osBean = ManagementFactory.getOperatingSystemMXBean()
        def runtimeBean = ManagementFactory.getRuntimeMXBean()
        def threadBean = ManagementFactory.getThreadMXBean()
        def memoryBean = ManagementFactory.getMemoryMXBean()

        def heapUsage = memoryBean.getHeapMemoryUsage()
        def nonHeapUsage = memoryBean.getNonHeapMemoryUsage()

        long uptimeMs = runtimeBean.getUptime()
        long uptimeSecs = uptimeMs / 1000
        long days = uptimeSecs / (24 * 3600)
        long hours = (uptimeSecs % (24 * 3600)) / 3600
        long mins = (uptimeSecs % 3600) / 60
        long secs = uptimeSecs % 60
        String formattedUptime = "${days}g ${hours}s ${mins}d ${secs}sn"

        def diagnostics = [
            jvm: [
                vmName: runtimeBean.getVmName(),
                vmVendor: runtimeBean.getVmVendor(),
                vmVersion: runtimeBean.getVmVersion(),
                startTime: new Date(runtimeBean.getStartTime()).toString(),
                uptimeMs: uptimeMs,
                uptimeFormatted: formattedUptime
            ],
            os: [
                name: osBean.getName(),
                version: osBean.getVersion(),
                arch: osBean.getArch(),
                availableProcessors: osBean.getAvailableProcessors(),
                systemLoadAverage: osBean.getSystemLoadAverage()
            ],
            memory: [
                heapUsed: heapUsage.getUsed(),
                heapCommitted: heapUsage.getCommitted(),
                heapMax: heapUsage.getMax(),
                nonHeapUsed: nonHeapUsage.getUsed(),
                nonHeapCommitted: nonHeapUsage.getCommitted(),
                totalMemory: rt.totalMemory(),
                freeMemory: rt.freeMemory(),
                usedMemory: rt.totalMemory() - rt.freeMemory(),
                maxMemory: rt.maxMemory()
            ],
            threads: [
                threadCount: threadBean.getThreadCount(),
                peakThreadCount: threadBean.getPeakThreadCount(),
                daemonThreadCount: threadBean.getDaemonThreadCount(),
                totalStartedThreadCount: threadBean.getTotalStartedThreadCount()
            ],
            ofbiz: [
                delegatorName: delegator ? delegator.getDelegatorName() : "default",
                frameworkVersion: "Apache OFBiz 18.12",
                currentTime: UtilDateTime.nowTimestamp().toString()
            ]
        ]

        request.setAttribute("diagnostics", diagnostics)
        return "success"
    } catch (Exception e) {
        request.setAttribute("_ERROR_MESSAGE_", "Sistem tanılama bilgileri alınırken hata: " + e.getMessage())
        return "error"
    }
}
