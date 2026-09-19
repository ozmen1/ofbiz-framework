# OFBiz & Modern React Entegrasyon ve Modül Geliştirme El Kitabı (Playbook)

Bu kılavuz, Apache OFBiz'in köklü ERP iş mantığı ve kurumsal veri modelini, modern bir React SPA (Vite + TypeScript + TailwindCSS + Lucide + Framer Motion) arayüzüne kusursuz, güvenilir ve yüksek performanslı şekilde taşımak için geliştirilen ve **Muhasebe (Accounting) modülünün 5 fazında** bizzat doğrulanmış mimari yöntemleri, tasarım kalıplarını ve tuzak çözümlerini içerir.

Gelecekte geliştirilecek **Sipariş (Order)**, **Cari/Taraf (Party)**, **Ürün/Katalog (Product)**, **Depo/Stok (Facility)** ve **Üretim (Manufacturing)** modüllerinde bu playbook standart referans olarak uygulanmalıdır.

---

## 1. Mimari Vizyon ve İstek Akışı

OFBiz monolitik yapısında ekranlar XML Form/Screen widget'ları ve FTL (FreeMarker) şablonları ile sunulur. Modern mimaride OFBiz, **Headless ERP Motoru**; React ise **Modern İstemci (SPA)** olarak konumlandırılmıştır.

```mermaid
sequenceDiagram
    autonumber
    participant React as React Frontend (SPA)
    participant Tomcat as ControlServlet
    participant Controller as controller.xml
    participant Groovy as Groovy Event (Backend API)
    participant Engine as Delegator / Service Engine
    participant DB as PostgreSQL (Docker)

    React->>Tomcat: POST/GET /react-app/control/<endpoint>
    Tomcat->>Controller: Request-map çözümleme
    alt Request-map tanımlı değil
        Controller-->>React: 500/404 HTML Error (Unknown request)
    else Request-map tanımlı
        Controller->>Groovy: invoke="<methodName>"
        Groovy->>Engine: EntityQuery (Delegator) veya runSync (Dispatcher)
        Engine->>DB: SQL Sorgusu / Transaction
        DB-->>Engine: Veri / Sonuç
        Engine-->>Groovy: GenericValue / Service Result
        Groovy->>Tomcat: request.setAttribute(key, data) + return "success"
        Tomcat-->>React: JSON Yanıtı (//{"key": ...})
    end
```

### Neden Groovy Events?
1. **Sıcak Yeniden Yükleme (Hot-Reloading):** Java sınıflarının aksine Groovy event dosyaları (`.groovy`), OFBiz yeniden başlatılmadan çalışma zamanında dinamik olarak derlenir ve güncellenir.
2. **Doğrudan Nesne Erişimi:** Groovy betiği içerisinde `delegator`, `dispatcher`, `request`, `response`, `parameters` doğrudan bağlamda (binding) hazırdır.
3. **Standart JSON Çıktısı:** `response type="request" value="json"` konfigürasyonu ile `request.setAttribute(...)` içine konan her veri Tomcat `ControlServlet` tarafından otomatik olarak JSON nesnesine dönüştürülür.

---

## 2. OFBiz Modülü Çözümleme ve Fazlandırma Metodolojisi

Mevcut bir OFBiz modülünü React'e taşırken uygulanması gereken 5 aşamalı yol haritası:

### Adım 1: Modülün OFBiz İçindeki Haritasını Çıkarın
- **Widget ve Ekranlar:** `applications/<modul>/widget/<Modul>Screens.xml` ve `*Forms.xml` dosyalarını inceleyerek kullanıcıya hangi alanların gösterildiğini ve hangi filtrelerin kullanıldığını tespit edin.
- **Varlık Modeli (Entities):** `applications/datamodel/entitydef/<modul>-entitymodel.xml` dosyasından birincil anahtarları (PK), ilişkileri (relations), Type ve Status tanımlarını çıkarın.
- **Servisler:** `applications/<modul>/servicedef/services*.xml` dosyasından hazır CRUD ve iş mantığı servislerini listeleyin.
- **ECA Kuralları (KRİTİK):** `servicedef/secas*.xml` ve `entitydef/eecas*.xml` dosyalarını kontrol ederek bir servis çalıştığında arka planda otomatik tetiklenen kuralları (örn: otomatik durum açılması, e-posta, muhasebe fişi) mutlaka tespit edin.

### Adım 2: Mantıksal Fazlara Bölün (Phased Roadmap)
Her modülü 3 ila 5 bağımsız, test edilebilir faza ayırın:
- **Faz 1: Ana İşlem Kayıtları & CRUD (Core Transactions)**
- **Faz 2: İşlem Hareketleri & Alt Kalemler (Line Items & Allocations)**
- **Faz 3: Durum Geçişleri & İş Akışı (State Machine & Workflow)**
- **Faz 4: Raporlama & Özet Göstergeler (Analytics & KPI Metrics)**
- **Faz 5: İleri Düzey & İlişkili Modüller (Advanced & Supporting Features)**

---

## 3. Backend Groovy Event Tasarım Kalıbı

Tüm backend endpoint'leri `plugins/react-app/src/main/groovy/org/apache/ofbiz/reactapp/<Modul>Events.groovy` dosyasında toplanır.

### Standart Şablon
```groovy
package org.apache.ofbiz.reactapp

import org.apache.ofbiz.base.util.*
import org.apache.ofbiz.entity.*
import org.apache.ofbiz.entity.condition.*
import org.apache.ofbiz.entity.util.EntityQuery
import org.apache.ofbiz.service.*
import java.sql.Timestamp

final String MODULE = "<Modul>Events.groovy"

/**
 * Oturum açmış kullanıcı yoksa sistem kullanıcısını döner.
 */
GenericValue getSystemUserLogin() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    GenericValue userLogin = (GenericValue) request.getSession().getAttribute("userLogin")
    if (!userLogin) {
        userLogin = EntityQuery.use(delegator).from("UserLogin").where("userLoginId", "system").queryOne()
    }
    return userLogin
}

/**
 * 1. Metadata / Bootstrap Endpoint
 * Form açılır kutuları (select dropdown) için gerekli tüm tip ve durumları tek seferde döner.
 */
String getModuleMetadata() {
    def delegator = binding.getVariable("delegator")
    def request = binding.getVariable("request")
    try {
        List types = EntityQuery.use(delegator).from("SomeType").orderBy("description").queryList()
        List statuses = EntityQuery.use(delegator).from("StatusItem").where("statusTypeId", "SOME_STATUS").queryList()

        request.setAttribute("types", types.collect { [id: it.typeId, description: it.description ?: it.typeId] })
        request.setAttribute("statuses", statuses.collect { [id: it.statusId, description: it.description ?: it.statusId] })
        return "success"
    } catch (Exception e) {
        Debug.logError(e, "Error in getModuleMetadata", MODULE)
        request.setAttribute("_ERROR_MESSAGE_", e.getMessage())
        return "error"
    }
}
```

### Kritik Backend Tuzakları ve Çözümleri

#### TUZAK 1: `EntityQuery.where(null)` Belirsizlik Hatası (Ambiguous Overload)
Groovy derleyicisi `where(null)` çağrıldığında `where(Map)`, `where(List)` ve `where(EntityCondition)` arasında seçim yapamaz ve runtime hatası fırlatır.
- **Hatalı:**
  ```groovy
  EntityCondition cond = conditions.isEmpty() ? null : EntityCondition.makeCondition(conditions)
  def list = EntityQuery.use(delegator).from("Invoice").where(cond).queryList() // ÇÖKER!
  ```
- **Doğru Çözüm:**
  ```groovy
  def query = EntityQuery.use(delegator).from("Invoice")
  if (!conditions.isEmpty()) {
      query = query.where(EntityCondition.makeCondition(conditions, EntityOperator.AND))
  }
  List results = query.maxRows(viewSize).cursorScroll(false).queryList()
  ```

#### TUZAK 2: JTA Transaction Rollback & ECA Çakışması
OFBiz servis çağrılarında (`dispatcher.runSync`) bir servis hata verirse (örneğin duplicate primary key), bu çağrı `try-catch` içine alınsa dahi geçerli veritabanı işlemi (Transaction) `setRollbackOnly` olarak işaretlenir. İstek sonunda tüm transaction iptal edilir!
- **Muhasebe Örneği:** `createBudget` servisi zaten `secas.xml` kuralı gereği otomatik olarak `createBudgetStatus(BG_CREATED)` çalıştırır. Groovy kodunda manuel olarak tekrar `createBudgetStatus` çağrıldığında birincil anahtar çakışması yaşanmış ve bütçe kaydı tamamen geri alınmıştır.
- **Kural:** Bir servis çağırmadan önce `secas.xml` dosyasına bakın. Durum geçişlerinde doğrudan `create*` yerine OFBiz'in durum doğrulama mantığı içeren `update*Status` veya `change*Status` servislerini kullanın.

#### TUZAK 3: Tarih ve Zaman Dönüşümleri
React frontend'inden gelen tarihler genellikle ISO string (`"2026-09-18"` veya `"2026-09-18T14:30:00.000Z"`) formatındadır. OFBiz `Timestamp` veya `java.sql.Date` bekler.
```groovy
Timestamp parseTimestamp(String dateStr) {
    if (!dateStr) return null
    try {
        if (dateStr.length() == 10) dateStr += " 00:00:00"
        return Timestamp.valueOf(dateStr.replace("T", " ").replaceAll("Z", "").substring(0, 19))
    } catch (Exception e) {
        return UtilDateTime.nowTimestamp()
    }
}
```

---

## 4. Çift Controller ve Güvenlik Yapılandırması (Dual Controller Pattern)

### Vite Build Tuzağı ve Çift Controller Kuralı
`plugins/react-app/frontend/vite.config.ts` dosyasında `build.emptyOutDir: true` tanımlıdır. `npm run build` komutu verildiğinde `webapp/react-app/` dizini tamamen silinir ve `frontend/public/` içindeki dosyalar buraya kopyalanır.

> [!CAUTION]
> **ASLA** sadece `webapp/react-app/WEB-INF/controller.xml` dosyasını düzenlemeyin!
> Bir endpoint eklerken **her iki dosyaya da** eklemelisiniz:
> 1. `plugins/react-app/frontend/public/WEB-INF/controller.xml` (Kalıcı Kaynak)
> 2. `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` (Çalışma Zamanı)

### Standart `request-map` Şablonu
```xml
<request-map uri="getMyEndpoint">
    <security https="false" auth="false"/>
    <event type="groovy" path="component://react-app/src/main/groovy/org/apache/ofbiz/reactapp/MyModuleEvents.groovy" invoke="getMyEndpoint"/>
    <response name="success" type="request" value="json"/>
    <response name="error" type="request" value="json"/>
</request-map>
```

### HTTP 302 Yönlendirme Tuzağı (`url.properties`)
OFBiz `8080` (HTTP) portundan gelen istekleri varsayılan olarak `8443` (HTTPS)'e yönlendirir. Tarayıcıda relative URL ile yapılan fetch istekleri 302 alır ve CORS / Network Error hatasına düşer.
- **Çözüm:** `framework/webapp/config/url.properties` dosyasında `http.request-map.list` virgüllü listesine eklediğiniz tüm endpoint isimlerini kaydedin:
  ```properties
  http.request-map.list=...,getMyEndpoint,createMyRecord,updateMyRecord
  ```

### Ağdan Erişim ve Host Header İzinleri (`security.properties`)
Uygulamaya yerel ağdan (`192.168.x.x`) veya IP ile bağlanıldığında OFBiz `host-headers-allowed` denetimi yapar. Eğer IP listede yoksa ControlServlet 500 HTML hata sayfası döner ve veriler yüklenmez.
- **Çözüm:** `framework/security/config/security.properties` içinde `host-headers-allowed` parametresine `192.168.*`, `10.*` wildcard tanımlarının bulunduğundan emin olun.

---

## 5. Frontend Mimari Şablonu (React + TypeScript + UI/UX)

### 1. `api.ts` Merkezi İstemci ve `//` Temizliği
OFBiz JSON çıktıları güvenlik gereği `//` öneki ile başlar. Merkezi API katmanı bu öneki temizlemeli ve HTML hata yanıtlarını yakalamalıdır:

```typescript
const cleanJson = (text: string) => {
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error('OFBiz sunucusundan HTML hata sayfası döndü. Yetki veya endpoint tanımlarını kontrol edin.');
  }
  return trimmed.startsWith('//') ? trimmed.substring(2) : trimmed;
};

export async function fetchWithAuth<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      ...options?.headers,
    },
  });
  const text = await response.text();
  const jsonStr = cleanJson(text);
  const data = JSON.parse(jsonStr);
  if (data._ERROR_MESSAGE_) {
    throw new Error(data._ERROR_MESSAGE_);
  }
  return data as T;
}
```

### 2. Standart Görünüm Mimarisi (Dashboard & Component Pattern)
Her modül ekranı 5 temel UI katmanından oluşur:

1. **Özet Gösterge Kartları (Metrics Row):** Toplam sayı, bekleyen işlem, onaylanan tutar gibi 3-4 adet KPI kutusu.
2. **Sekmeli Gezinme (Tabbed Navigation):** Modül altındaki ana kavramlar arasında geçiş (örn: Varlıklar, Amortisman, Bütçeler, Sözleşmeler).
3. **Filtre ve Arama Çubuğu (Filter Bar):** Anlık arama (Search input), Durum seçici (Status dropdown) ve "Yeni Ekle" aksiyon butonu.
4. **Veri Tablosu (Data Table):** Durum rozetleri (renkli badge'ler), biçimlendirilmiş para birimi (`₺` veya `$`), biçimlendirilmiş tarih ve sağ tarafta hızlı aksiyon butonları (İncele, Düzenle, Onayla).
5. **Kayar Çekmece (Slide-Over Drawer - Framer Motion):** Bir satıra tıklandığında sayfa yenilenmeden sağdan kayarak açılan detay çekmecesi. Alt kalemler (items), durum tarihçesi (history) ve ilişkili kayıtlar burada listelenir.
6. **İşlem Modalları (Action Modals):** Ekleme, düzenleme, durum değiştirme ve işlem gerçekleştirme formları. Gönderim esnasında loading animasyonu ve form kilitleme uygulanır.

### 3. Çoklu Dil (Localization / i18n) Mimarisi ve Standartları

Projede Türkçe ve İngilizce tam dil desteği `plugins/react-app/frontend/src/i18n/` dizininde tip güvenli (type-safe) bir yapıyla sağlanır.

> [!IMPORTANT]
> **Kural:** Arayüzde hiçbir sayfada, bileşende, modalda veya bildirim mesajında **kesinlikle sabit (hardcoded) metin yazılmamalıdır**. Tüm metinler `useTranslation` hook'u üzerinden çekilmelidir.

#### Dizin Yapısı ve İş Akışı:
```
src/i18n/
├── types.ts          # Tüm sözlük anahtarlarının ve modüllerin TypeScript tip sözleşmesi
├── I18nContext.tsx   # React Context sağlayıcısı, dil değiştirme (tr/en) ve localStorage kalıcılığı
└── locales/
    ├── tr.ts         # Türkçe kurumsal ERP/muhasebe terminolojisi sözlüğü
    └── en.ts         # Standart İngilizce OFBiz terminolojisi sözlüğü
```

#### Yeni Bir Modül Eklerken i18n Adımları:
1. **Tip Tanımı (`src/i18n/types.ts`):**
   ```typescript
   export interface Translations {
     // ...
     orders: {
       title: string;
       createNew: string;
       orderNumber: string;
       customer: string;
       status: string;
       totalAmount: string;
       // ...
     };
   }
   ```
2. **Türkçe Sözlük (`src/i18n/locales/tr.ts`):**
   ```typescript
   orders: {
     title: 'Sipariş Yönetimi',
     createNew: 'Yeni Sipariş',
     orderNumber: 'Sipariş No',
     customer: 'Müşteri',
     status: 'Durum',
     totalAmount: 'Toplam Tutar',
   }
   ```
3. **İngilizce Sözlük (`src/i18n/locales/en.ts`):**
   ```typescript
   orders: {
     title: 'Order Management',
     createNew: 'New Order',
     orderNumber: 'Order #',
     customer: 'Customer',
     status: 'Status',
     totalAmount: 'Total Amount',
   }
   ```
4. **Bileşende Kullanım:**
   ```tsx
   import React from 'react';
   import { useTranslation } from '../i18n/I18nContext';

   export const OrderList: React.FC = () => {
     const { translations, locale } = useTranslation();
     const t = translations.orders;

     const formatCurrency = (amount: number) =>
       new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
         style: 'currency',
         currency: locale === 'tr' ? 'TRY' : 'USD'
       }).format(amount);

     return (
       <div className="space-y-5">
         <div className="ds-page-header">
           <h1 className="ds-page-title">{t.title}</h1>
           <button className="ds-btn-primary">{t.createNew}</button>
         </div>
       </div>
     );
   };
   ```

> [!WARNING]
> **TypeScript `noUnusedLocals` Uyarısı:** Projedeki tsconfig yapılandırması kullanılmayan değişkenlerde derleme hatası (`npm run build`) verir. Destructuring yaparken yalnızca kod içinde referans verilen anahtarları çekin (örn. `locale` kullanılmıyorsa sadece `const { translations } = useTranslation();` yapın).

---

### 4. Birleşik Tasarım Sistemi (Design System) & Responsive Standartları

Tüm ekranlarda tek bir görsel kimlik ve kullanıcı deneyimi sunulması için `src/design-system.css` içerisinde tanımlanan token sınıfları ve Tailwind CSS karanlık paleti (`slate-950`, `slate-900`, `slate-800`, `indigo-500/600`) kullanılmalıdır.

#### A. Standart DS Sınıf Kataloğu:
| Kategori | Sınıf Adı | Açıklama / Kullanım Yeri |
| :--- | :--- | :--- |
| **Kartlar** | `.ds-card` | Standart içerik kartı (kenarlık, gölge, arka plan) |
| | `.ds-stat-card` | KPI gösterge kutusu (`border-l-4 border-l-indigo-500`) |
| **Tablolar** | `.ds-table` | Standart veri tablosu (`min-w-[640px]`) |
| | `.ds-thead-row` | Başlık satırı stili |
| | `.ds-th` | Sütun başlığı hücresi |
| | `.ds-tbody-row` | Satır hover efekti ve alt kenarlık |
| | `.ds-td` | Standart veri hücresi |
| | `.ds-td-mono` | Kod/ID hücreleri için tek aralıklı (monospace) font |
| | `.ds-td-right` | Sayısal/tutarsal sağa hizalı veri hücresi |
| **Butonlar** | `.ds-btn-primary` | Vurgulu işlem butonu (İndigo dolgu, beyaz yazı) |
| | `.ds-btn-secondary`| İkincil aksiyon butonu (Slate çerçeve ve dolgu) |
| | `.ds-btn-danger` | İptal/silme butonu (Kırmızı dolgu/kenarlık) |
| | `.ds-btn-ghost` | Şeffaf, hafif ikon veya geri butonu |
| **Formlar** | `.ds-label` | Alan başlık etiketi (küçük, gri, yarı kalın) |
| | `.ds-input` | Standart form giriş kutusu |
| | `.ds-select` | Seçim açılır kutusu |
| **Rozetler** | `.ds-badge` | Durum etiketi tabanı (yuvarlatılmış, küçük font) |
| | `.ds-badge-green/blue/yellow/red/purple/slate` | Renk varyantları |
| **Modallar** | `.ds-overlay` | Karartmalı arka plan (`p-3 sm:p-6 overflow-y-auto`) |
| | `.ds-modal` | Diyalog kutusu (`max-h-[85vh] sm:max-h-[90vh] my-auto`) |
| **Durumlar** | `.ds-spinner` | Yükleniyor halkası |
| | `.ds-empty` | Boş veri durumu taşıyıcısı |

#### B. Mobil ve Masaüstü Duyarlılık (Responsive Kuralları):
1. **Tabloların Sarmalanması (ZORUNLU):**
   Her `<table>` etiketi mutlaka `<div className="overflow-x-auto">` içine alınmalıdır. Tablolara eklenen `.ds-table` sınıfı minimum genişlik koruması (`min-w-[600px]`) sağlayarak küçük ekranlarda sütunların ezilmesini önler ve yatay kaydırma imkanı tanır.
2. **Form Alanları Izgarası (Grid Layout):**
   Form alanları masaüstünde çok sütunlu, mobil cihazlarda ise tek sütunlu olmalıdır:
   ```tsx
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
     <div>
       <label className="ds-label">{t.field}</label>
       <input className="ds-input" />
     </div>
   </div>
   ```
3. **Modallarda Dikey Taşma Güvenliği:**
   Mobil klavyeler ve küçük dikey ekran yükseklikleri için modallarda daima `max-h-[85vh] sm:max-h-[90vh] overflow-y-auto` yapısı kullanılmalıdır.
4. **Sekmeler (Tabs):**
   Çok sekmeli görünümlerde `.ds-tab-bar` kullanılmalı, sekme sayısı fazlaysa `overflow-x-auto` ile yatay kaydırma desteklenmelidir.

---

## 6. Diğer Modüllere Uygulama Rehberi (Cookbook)

Aşağıdaki şablonları yeni modülleri geliştirirken doğrudan kullanabilirsiniz:

### A. Sipariş Yönetimi (Order Management)
- **Ana Varlıklar:** `OrderHeader`, `OrderItem`, `OrderRole`, `OrderStatus`, `OrderAdjustment`.
- **Durum Akışı:** `ORDER_CREATED` -> `ORDER_APPROVED` -> `ORDER_COMPLETED` (veya `ORDER_CANCELLED`).
- **Endpoint'ler:** `getOrders`, `getOrderDetails`, `createOrder`, `approveOrder`, `cancelOrder`, `addOrderItem`.
- **Önemli Servisler:** `createOrder`, `changeOrderStatus`, `quickShipEntireOrder`.

### B. Cari / Taraf Yönetimi (Party Management)
- **Ana Varlıklar:** `Party`, `Person` (Bireysel), `PartyGroup` (Kurumsal), `PartyRole`, `ContactMech`, `PostalAddress`, `TelecomNumber`.
- **Endpoint'ler:** `getParties`, `getPartyDetails`, `createPersonCustomer`, `createCorporateSupplier`, `addPartyContactMech`.
- **Önemli Servisler:** `createPerson`, `createPartyGroup`, `createPartyPostalAddress`, `createPartyTelecomNumber`.

### C. Ürün & Katalog (Catalog & Product)
- **Ana Varlıklar:** `Product`, `ProductCategory`, `ProductCategoryMember`, `ProductPrice`, `GoodIdentification` (Barkod/SKU).
- **Endpoint'ler:** `getProducts`, `getProductDetails`, `createProduct`, `updateProductPrice`, `assignProductCategory`.
- **Önemli Servisler:** `createProduct`, `updateProduct`, `createProductPrice`.

### D. Depo & Stok (Facility & Inventory)
- **Ana Varlıklar:** `Facility`, `InventoryItem`, `InventoryItemDetail`, `Shipment`, `ShipmentItem`.
- **Metrikler:** ATP (Available to Promise) ve QOH (Quantity on Hand).
- **Endpoint'ler:** `getFacilities`, `getInventoryItems`, `createInventoryItem`, `receiveInventoryItem`, `transferInventory`.
- **Önemli Servisler:** `createInventoryItem`, `createFacility`, `receiveInventoryProduct`.

---

## 7. Geliştirme ve Dağıtım Adım Adım Kontrol Listesi (Checklist)

Yeni bir modül geliştirirken bu adımları sırayla işaretleyin:

1. [ ] **Veri & Servis Analizi:** `entitymodel.xml` ve `services.xml` incelendi.
2. [ ] **ECA Denetimi:** `secas.xml` kontrol edildi; otomatik tetiklenen servisler belirlendi.
3. [ ] **Backend Groovy Event:** `plugins/react-app/src/main/groovy/.../<Modul>Events.groovy` yazıldı.
4. [ ] **Controller Senkronizasyonu:** Hem `frontend/public/.../controller.xml` hem `webapp/react-app/.../controller.xml` güncellendi.
5. [ ] **URL Whitelist:** `framework/webapp/config/url.properties` içine endpoint'ler eklendi.
6. [ ] **Frontend API:** `api.ts` içine TypeScript interface'leri ve API çağrı fonksiyonları eklendi.
7. [ ] **Çoklu Dil (i18n):** `src/i18n/types.ts`, `locales/tr.ts` ve `locales/en.ts` dosyalarına modül sözlükleri eklendi; sabit (hardcoded) metin bırakılmadı; para/tarih biçimlendirmesinde `locale` kullanıldı.
8. [ ] **Tasarım Sistemi & Responsive:** `src/design-system.css` token sınıfları (`.ds-card`, `.ds-table`, `.ds-btn-*`, `.ds-badge`, vb.) kullanıldı; tüm tablolar `<div className="overflow-x-auto">` ile sarıldı; modal ve form ızgaraları mobil ekranda doğrulandı.
9. [ ] **Frontend UI & Entegrasyon:** `src/components/<Modul>.tsx` bileşeni oluşturuldu, `App.tsx` ve `Layout.tsx` rotalarına ve menüye bağlandı.
10. [ ] **Derleme:** `cd plugins/react-app/frontend && npm run build` hatasız çalıştırıldı (TypeScript `noUnusedLocals` ve controller kopyası doğrulandı).
11. [ ] **Canlı Doğrulama:** `curl` ile JSON yanıtı ve PostgreSQL üzerinden veritabanı kayıtları doğrulandı.
12. [ ] **Git Commit:** `git status` ve `git commit` yapıldı.

