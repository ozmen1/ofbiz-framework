---
name: react-ofbiz-integration
description: >-
  React-app plugininde yapılan değişikliklerin Apache OFBiz controller request-map mekanizmasına
  doğru şekilde uygulanması, Vite build çıktısı senkronizasyonu ve API entegrasyonu kuralları.
  React frontend üzerinde yeni bir endpoint, veri çağrısı veya arayüz değişikliği yapıldığında
  veya controller.xml düzenlenirken bu skill kullanılmalıdır.
---

# React-App ve OFBiz Controller Request-Map Entegrasyon Kılavuzu

Bu kılavuz, `plugins/react-app` içerisinde yeni bir React özelliği, sayfa veya API çağrısı geliştirildiğinde bu değişikliğin Apache OFBiz backend sistemine eksiksiz ve kalıcı olarak nasıl yansıtılacağını tanımlar.

---

## 1. Temel Mimari ve İstek Akışı

OFBiz mimarisinde dışarıdan (React SPA vb.) gelen tüm HTTP istekleri Tomcat üzerindeki `ControlServlet` tarafından karşılanır. 

* React bileşenleri `/react-app/control/<istekAdi>` URL'sine HTTP isteği yapar.
* `ControlServlet`, gelen isteği `controller.xml` dosyasındaki `<request-map uri="<istekAdi>">` tanımları arasında arar.
* Eğer istek tanımlı değilse OFBiz derhal `RequestHandlerException: Unknown request [...]` hatası fırlatır ve geriye `Error.ftl` (HTML) döner. Bu durum React tarafında `Unexpected token < in JSON` hatasına yol açar.

---

## 2. EN KRİTİK KURAL: İki Adet `controller.xml` Senkronizasyonu (Vite Build Tuzağı)

Projede iki ayrı `controller.xml` dosyası yer almaktadır:

1. **Kaynak Dosya:** `plugins/react-app/frontend/public/WEB-INF/controller.xml`
2. **OFBiz Çalışma Zamanı (Runtime) Dosyası:** `plugins/react-app/webapp/react-app/WEB-INF/controller.xml`

### Vite Build Tuzağı Nedir?
`plugins/react-app/frontend/vite.config.ts` dosyasında build çıktısı şu şekilde yapılandırılmıştır:
```typescript
build: {
  outDir: '../webapp/react-app',
  emptyOutDir: true,
}
```
`emptyOutDir: true` sebebiyle React tarafında `npm run build` komutu çalıştırıldığında:
1. `plugins/react-app/webapp/react-app` dizini **tamamen silinir**.
2. `frontend/public/` altındaki tüm dosyalar (ve dolayısıyla `frontend/public/WEB-INF/controller.xml`) `webapp/react-app/WEB-INF/` içine kopyalanır.

> [!CAUTION]
> **ASLA SADECE `webapp/react-app/WEB-INF/controller.xml` DOSYASINI DÜZENLEMEKLE YETİNMEYİN!**
> Eğer yeni bir `request-map` sadece `webapp/react-app/...` dosyasına eklenirse, bir sonraki `npm run build` işleminde bu dosya silinir ve `frontend/public/...` dosyasındaki eski sürüm üzerine yazılarak endpoint kaybolur.

### Uygulanması Zorunlu Kural:
Bir endpoint eklerken veya güncellerken:
* **ÖNCELİKLE** `plugins/react-app/frontend/public/WEB-INF/controller.xml` dosyasına ekleyin.
* **ARDINDAN** `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` dosyasına ekleyin (veya frontend'i `npm run build` ile derleyerek kopyalanmasını sağlayın).

---

## 3. Standart `request-map` Tanımları

### A. Groovy Script ile Veri Döndüren Endpoint (Event Type: Groovy)
```xml
<request-map uri="getAccountingSummary">
    <security https="false" auth="false"/>
    <event type="groovy" path="component://react-app/src/main/groovy/org/apache/ofbiz/reactapp/AccountingSummary.groovy"/>
    <response name="success" type="request" value="json"/>
    <response name="error" type="request" value="json"/>
</request-map>
```
* `response` tipi kesinlikle `type="request" value="json"` olmalıdır.
* Groovy script içinde dönülecek veri `request.setAttribute("veriAdi", dataMap)` ile eklenmeli ve son satırda `return "success"` döndürülmelidir.

### B. OFBiz Servisi Çalıştıran Endpoint (Event Type: Service)
```xml
<request-map uri="getAccountingSummary">
    <security https="false" auth="false"/>
    <event type="service" invoke="getAccountingSummary"/>
    <response name="success" type="request" value="json"/>
    <response name="error" type="request" value="json"/>
</request-map>
```
* Servis `plugins/react-app/servicedef/services.xml` içinde tanımlı olmalı, `auth="false"` veya token izinlerine sahip olmalıdır.

---

## 4. controller.xml XML Şema Zorunluluğu

`site-conf` kök etiketinde standart OFBiz şeması kullanılmalıdır:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<site-conf xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns="http://ofbiz.apache.org/Site-Conf" 
        xsi:schemaLocation="http://ofbiz.apache.org/Site-Conf http://ofbiz.apache.org/dtds/site-conf.xsd">
    <include location="component://common/webcommon/WEB-INF/common-controller.xml"/>

    <description>React App Configuration</description>
    ...
```
> [!WARNING]
> `xsi:noNamespaceSchemaLocation="https://ofbiz.apache.org/dtds/site-conf.xsd"` veya hatalı namespace kullanmayın. Bu hata OFBiz XML yükleyicisinin çökmesine veya dosyadaki tüm request haritalarının devre dışı kalmasına neden olur.

---

## 5. React Tarafında API Çağrısı ve Güvenlik Öneki (`//`)

OFBiz backend JSON yanıtlarını JSON Hijacking saldırılarına karşı `//` önekiyle döndürür (örneğin: `//{"accountingData":{...}}`).

React bileşenlerinde `fetch` yapılırken daima şu kontrol uygulanmalıdır:
```typescript
fetch('/react-app/control/endpointUri')
  .then(res => res.text())
  .then(text => {
    // 1. OFBiz HTML hata sayfası kontrolü
    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      throw new Error('OFBiz HTML hata sayfası döndürdü (Unknown request veya yetki hatası)');
    }
    // 2. Güvenlik öneki olan // işaretini temizleme
    const cleanJson = text.startsWith('//') ? text.substring(2) : text;
    const json = JSON.parse(cleanJson);
    return json;
  });
```

---

## 6. Değişiklik Uygulama Adım Adım Kontrol Listesi (Checklist)

React-app üzerinde yeni bir servis/veri entegrasyonu yaparken bu adımları sırasıyla takip edin:

1. **Backend Katmanı:**
   - Groovy dosyasını (`plugins/react-app/src/main/groovy/...`) veya servisi (`servicedef/services.xml`) oluşturun.
2. **Controller Kaynak Dosyası:**
   - [plugins/react-app/frontend/public/WEB-INF/controller.xml](file:///home/admin/Documents/ofbiz/plugins/react-app/frontend/public/WEB-INF/controller.xml) dosyasına `<request-map>` düğümünü ekleyin.
3. **Controller Runtime Dosyası:**
   - [plugins/react-app/webapp/react-app/WEB-INF/controller.xml](file:///home/admin/Documents/ofbiz/plugins/react-app/webapp/react-app/WEB-INF/controller.xml) dosyasına aynı `<request-map>` düğümünü ekleyin.
4. **React Frontend Kodu:**
   - İlgili React bileşeninde `/react-app/control/<uri>` çağrısını ve `//` temizleme mantığını yazın.
5. **Frontend Build:**
   - Terminalde `cd plugins/react-app/frontend && npm run build` çalıştırın. Bu sayede hem kod derlenir hem de `public/WEB-INF` dosyaları `webapp/react-app/WEB-INF` dizinine senkronize edilir.
6. **Doğrulama (Test):**
   - OFBiz controller önbelleğinin yenilenmesi için 10 saniye bekleyin (veya curl ile test edin):
     ```bash
     curl -k -i https://localhost:8443/react-app/control/<uri>
     ```
   - Yanıtın `content-type: application/json` ve `HTTP/2 200` olduğunu doğrulayın.
7. **Veritabanı Kalıcılığı (PostgreSQL Kontrolü):**
   - Sistem Docker tabanlı PostgreSQL veritabanı ile çalışmaktadır (ayrıntılar için `ofbiz-postgres-docker` skill dosyasına bakın).
   - Entity veya servis değişikliklerinde doğrudan PostgreSQL üzerinden veriyi doğrulamak için:
     ```bash
     sudo docker exec ofbiz-postgres psql -U ofbiz -d ofbiz -c "SELECT * FROM <tablo_adi> LIMIT 5;"
     ```

