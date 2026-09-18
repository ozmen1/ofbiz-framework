---
name: react-ofbiz-integration
description: >-
  Apache OFBiz backend servislerinin ve veri modellerinin React SPA (plugins/react-app) arayüzüne
  entegrasyonu, controller request-map senkronizasyonu, Groovy event yazımı, Vite build yönetimi,
  güvenlik/ağ yapılandırmaları ve yeni kurumsal modül geliştirme standartları kılavuzu.
---

# React-App ve OFBiz Entegrasyon & Modül Geliştirme Kılavuzu

Bu kılavuz, `plugins/react-app` içerisinde yeni bir React özelliği, ekran veya modül geliştirildiğinde bu değişikliğin Apache OFBiz backend sistemine eksiksiz, güvenli ve kalıcı olarak nasıl yansıtılacağını tanımlar. Muhasebe (Accounting) modülünün 5 fazında sahada doğrulanmış kuralları ve en iyi uygulamaları içerir.

Ayrıntılı playbook için bkz: `plugins/react-app/docs/OFBIZ_REACT_MODULE_PLAYBOOK.md`

---

## 1. Temel Mimari ve İstek Akışı

OFBiz mimarisinde React SPA'dan gelen tüm HTTP istekleri Tomcat üzerindeki `ControlServlet` tarafından karşılanır.

```
React SPA (Fetch/api.ts) 
   ──> /react-app/control/<uri> 
   ──> ControlServlet 
   ──> controller.xml (request-map)
   ──> Groovy Event (<Module>Events.groovy)
   ──> Delegator (PostgreSQL) / Dispatcher (Services)
   ──> JSON Response (//{"key": ...})
```

* React bileşenleri `/react-app/control/<istekAdi>` URL'sine HTTP isteği yapar.
* `ControlServlet`, gelen isteği `controller.xml` dosyasındaki `<request-map uri="<istekAdi>">` tanımları arasında arar.
* Eğer istek tanımlı değilse OFBiz derhal `RequestHandlerException: Unknown request [...]` fırlatır ve geriye `Error.ftl` (HTML) döner. Bu durum React tarafında `Unexpected token < in JSON` hatasına yol açar.

---

## 2. EN KRİTİK KURAL: İki Adet `controller.xml` Senkronizasyonu (Vite Build Tuzağı)

Projede iki ayrı `controller.xml` dosyası yer almaktadır:
1. **Kaynak Dosya:** `plugins/react-app/frontend/public/WEB-INF/controller.xml`
2. **OFBiz Çalışma Zamanı (Runtime) Dosyası:** `plugins/react-app/webapp/react-app/WEB-INF/controller.xml`

### Vite Build Tuzağı Nedir?
`plugins/react-app/frontend/vite.config.ts` dosyasında `build.emptyOutDir: true` yapılandırılmıştır.
React tarafında `npm run build` komutu çalıştırıldığında:
1. `plugins/react-app/webapp/react-app` dizini **tamamen silinir**.
2. `frontend/public/` altındaki tüm dosyalar (dolayısıyla `frontend/public/WEB-INF/controller.xml`) `webapp/react-app/WEB-INF/` içine kopyalanır.

> [!CAUTION]
> **ASLA SADECE `webapp/react-app/WEB-INF/controller.xml` DOSYASINI DÜZENLEMEKLE YETİNMEYİN!**
> Yeni bir endpoint eklerken **önce** `frontend/public/WEB-INF/controller.xml` dosyasına ekleyin, **ardından** `webapp/react-app/WEB-INF/controller.xml` dosyasına ekleyin.

---

## 3. Backend Groovy Event Tasarım Standartları

Tüm API uç noktaları `plugins/react-app/src/main/groovy/org/apache/ofbiz/reactapp/<Modul>Events.groovy` içinde toplanır.

### Standart Groovy Event İskeleti
```groovy
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.*
import org.apache.ofbiz.entity.*
import org.apache.ofbiz.entity.condition.*
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.*

final String MODULE = "<Modul>Events.groovy"

GenericValue getSystemUserLogin() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    GenericValue uL = (GenericValue) request.getSession().getAttribute("userLogin")
    if (!uL) {
        uL = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    }
    return uL
}
```

### Kritik Backend Hata ve Çözümleri

#### A. `EntityQuery.where(null)` Belirsizlik Hatası (Ambiguous Method Overload)
Groovy derleyicisi `where(null)` çağrısında `where(Map)`, `where(List)` ve `where(EntityCondition)` arasında seçim yapamaz ve runtime hatası fırlatır.
- **Kural:**
  ```groovy
  def query = EntityQuery.use(delegator).from("MyEntity")
  if (!conditions.isEmpty()) {
      query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
  }
  List records = query.queryList()
  ```

#### B. OFBiz JTA Transaction Rollback & ECA Çakışması
OFBiz'de `dispatcher.runSync` çağrılan bir servis hata fırlatırsa (ör: birincil anahtar mükerrerliği), bu blok `try-catch` ile yakalansa bile geçerli JTA işlemi `setRollbackOnly` işaretlenir ve o istekteki tüm veritabanı yazma işlemleri iptal edilir.
- **Kural:** Servis çağırmadan önce `secas.xml` dosyasını denetleyin. Otomatik çalışan bir ECA varsa (örneğin `createBudget` -> `createBudgetStatus`), aynı servisi koddan tekrar çağırmayın. Durum güncellemelerinde doğrudan `create*Status` yerine geçerlilik denetimi yapan `update*Status` veya `change*Status` servislerini kullanın.

#### C. Metadata / Bootstrap Endpoint Kuralı
Her modülde `get<Modul>Metadata` endpoint'i sağlayın. Arayüzün ihtiyaç duyduğu tüm dropdown tiplerini (`Type`, `StatusItem`, para birimleri, taraflar) tek bir istekte dönün.

---

## 4. Standart `request-map` Tanımları

```xml
<request-map uri="getMyEndpoint">
    <security https="false" auth="false"/>
    <event type="groovy" path="component://react-app/src/main/groovy/org/apache/ofbiz/reactapp/MyModuleEvents.groovy" invoke="getMyEndpoint"/>
    <response name="success" type="request" value="json"/>
    <response name="error" type="request" value="json"/>
</request-map>
```
* `response` tipi kesinlikle `type="request" value="json"` olmalıdır.
* Groovy script içinde dönülecek veri `request.setAttribute("anahtar", deger)` ile atanmalı ve `return "success"` döndürülmelidir.

---

## 5. HTTP 302 ve Port Yönlendirmesi (`url.properties`)

OFBiz varsayılan olarak HTTP (`8080`) portundan gelen istekleri HTTPS (`8443`) portuna `302 Redirect` yapar.
- **Kural:** `framework/webapp/config/url.properties` dosyasında:
  1. `no.http=N` olmalıdır.
  2. `http.request-map.list` listesine yeni eklenen her endpoint adı virgülle eklenmelidir:
     ```properties
     http.request-map.list=...,getMyEndpoint,createMyRecord
     ```

---

## 6. Ağ ve Yerel IP Erişimi / Host Header İzinleri (`security.properties`)

Yerel ağdan (`192.168.x.x` veya farklı bir IP'den) erişildiğinde `ControlServlet` 500 HTML hata sayfası döner ve React verileri yüklenemez.
- **Kural:** `framework/security/config/security.properties` dosyasında `host-headers-allowed` parametresinde subnet wildcard'ları (`192.168.*`, `10.*`) tanımlı olmalıdır.

---

## 7. React Tarafında API Çağrısı ve Güvenlik Öneki (`//`)

OFBiz backend JSON yanıtlarını JSON Hijacking saldırılarına karşı `//` önekiyle döndürür (`//{"data":{...}}`).

`plugins/react-app/frontend/src/services/api.ts` içindeki standart temizleme mantığı:
```typescript
const cleanJson = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error('OFBiz HTML hata sayfası döndürdü (Unknown request veya yetki hatası)');
  }
  return trimmed.startsWith('//') ? trimmed.substring(2) : trimmed;
};
```

---

## 8. Frontend UI/UX Tasarım Kalıbı

Her modül sayfası şu 5 katmanlı modern bileşen mimarisini takip etmelidir:
1. **KPI Metrik Kartları (Metrics Row):** Toplam kayıt, bekleyen onaylar, parasal büyüklükler.
2. **Sekmeli Yapı (Tabbed Layout):** Modülün temel alt varlıkları arasında geçiş.
3. **Filtre Çubuğu (Filter & Search):** Arama kutusu, durum filtreleri ve "Yeni Kayıt" butonu.
4. **Veri Tablosu (Data Table):** Durum rozetleri, para birimi (`₺`/`$`) ve tarih biçimlendirmeleri.
5. **Kayar Çekmece (Slide-Over Drawer - Framer Motion):** Tıklanan kaydın detayını, kalemlerini ve durum geçmişini sayfa değiştirmeden inceleme.
6. **Form Modalları (Modals):** Validasyonlu, buton kilitlemeli ve işlem sonrası anlık tablo tazeleyen açılır pencereler.

---

## 9. Yeni Modülleri Geliştirirken Hızlı Referans (Cookbook)

| Modül | Temel Varlıklar (Entities) | Temel Servisler / Akış |
|---|---|---|
| **Sipariş (Order)** | `OrderHeader`, `OrderItem`, `OrderRole`, `OrderStatus` | `createOrder`, `changeOrderStatus`, `quickShipEntireOrder` |
| **Cari/Taraf (Party)** | `Party`, `Person`, `PartyGroup`, `ContactMech`, `PostalAddress` | `createPerson`, `createPartyGroup`, `createPartyPostalAddress` |
| **Ürün/Katalog (Product)** | `Product`, `ProductCategory`, `ProductPrice`, `GoodIdentification` | `createProduct`, `updateProduct`, `createProductPrice` |
| **Depo/Stok (Facility)** | `Facility`, `InventoryItem`, `Shipment`, `ShipmentItem` | `createInventoryItem`, `createFacility`, `receiveInventoryProduct` |

---

## 10. Değişiklik Uygulama Adım Adım Kontrol Listesi (Checklist)

React-app üzerinde yeni bir servis/veri entegrasyonu yaparken bu adımları sırasıyla takip edin:

1. **Analiz:** İlgili `entitymodel.xml`, `services.xml` ve `secas.xml` dosyalarını inceleyin.
2. **Backend:** `plugins/react-app/src/main/groovy/.../<Modul>Events.groovy` içine metotları yazın.
3. **Controller Kaynak:** `plugins/react-app/frontend/public/WEB-INF/controller.xml` dosyasına ekleyin.
4. **Controller Runtime:** `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` dosyasına ekleyin.
5. **URL İzinleri:** `framework/webapp/config/url.properties` dosyasında `http.request-map.list`'e ekleyin.
6. **Frontend API:** `api.ts` içinde TypeScript modellerini ve endpoint fonksiyonlarını yazın.
7. **Frontend UI:** Bileşeni oluşturup `App.tsx` ve `Layout.tsx` rotalarına ekleyin.
8. **Build:** `cd plugins/react-app/frontend && npm run build` çalıştırarak derleyin.
9. **Canlı Doğrulama:** `curl` ile JSON yanıtını ve PostgreSQL üzerinden veritabanı yansımasını test edin.
10. **Git Commit:** Hooks atlanarak temiz bir commit mesajıyla kaydedin.
