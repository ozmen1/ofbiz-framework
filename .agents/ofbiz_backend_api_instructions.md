# OFBiz Backend API Entegrasyon Kuralları (Agent Yönergesi)

Bu belge, OFBiz projelerinde (özellikle React gibi harici SPA frontend'ler ile haberleşirken) yeni REST API endpoint'leri oluştururken veya mevcut yapıları güncellerken sık yapılan hataları engellemek amacıyla AI asistanları için hazırlanmıştır. 

Aşağıdaki kurallara kesinlikle uyulmalıdır:

## 1. controller.xml Şema ve Yapılandırması

OFBiz'in `controller.xml` dosyasını oluştururken veya düzenlerken `site-conf` düğümü için **kesinlikle standart OFBiz şeması** kullanılmalıdır. Hatalı namespace atamaları Tomcat'in başlatılması veya XML okuması sırasında (`XmlFileLoader`) çökmelere neden olur.

**Yanlış Kullanım (Hata Verir):**
```xml
<site-conf xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns="https://ofbiz.apache.org/dtds/site-conf.xsd"
        xsi:noNamespaceSchemaLocation="https://ofbiz.apache.org/dtds/site-conf.xsd">
```

**DOĞRU KULLANIM:**
```xml
<site-conf xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns="http://ofbiz.apache.org/Site-Conf" 
        xsi:schemaLocation="http://ofbiz.apache.org/Site-Conf http://ofbiz.apache.org/dtds/site-conf.xsd">
```

## 2. Request-Map ve JSON Yanıt Döndürme

React veya başka bir frontend'in veri alabilmesi için, geleneksel ekran (`screen`) render etmek yerine doğrudan JSON veri dönen `request-map` tanımları kullanılmalıdır.

* `response name="success"` için `type="request"` ve `value="json"` kullanılmalıdır (OFBiz `common-controller` üzerinden JSON request işleyicisini devralır).
* Güvenlik test aşamasındaysa veya JWT kullanılmıyorsa `auth="false"` yapılmalıdır; aksi halde OFBiz HTML formatında login ekranına redirect atar, bu da Frontend'in JSON ayrıştırmasında `JSON.parse` veya `<!DOCTYPE` hataları (Unexpected token < in JSON) yaşamasına neden olur.

**Örnek Endpoint Tanımı (`controller.xml`):**
```xml
<request-map uri="getAccountingSummary">
    <security https="false" auth="false"/> <!-- Test aşamasındaysa auth=false tutun -->
    <event type="groovy" path="component://react-app/src/main/groovy/org/apache/ofbiz/reactapp/AccountingSummary.groovy"/>
    <response name="success" type="request" value="json"/>
    <response name="error" type="request" value="json"/>
</request-map>
```

## 3. Groovy Event Script ile Veri Gönderme

Groovy (veya Java) event kodları doğrudan ekrana string yazdırmamalıdır. Dönmesi beklenen veriler bir `Map` (veya List) objesine atılmalı ve `request.setAttribute` ile isteğe eklenmelidir. Sonunda `return "success"` döndürülmelidir. OFBiz'in çekirdeği bu attribute'ları alıp otomatik olarak JSON'a çevirecektir.

**Örnek Groovy Event Kodu:**
```groovy
import java.util.*
import org.apache.ofbiz.base.util.*

// 1. Veri modelini (JSON nesnesi olacak şekilde) oluştur
Map responseData = [
    status: "success",
    message: "Veriler başarıyla çekildi",
    accountingData: [ invoiceCount: 15, pendingApprovals: 5 ]
]

// 2. Bunu request attribute olarak OFBiz framework'üne ver
request.setAttribute("accountingData", responseData)

// 3. Başarı durumunu dön, framework bunu JSON olarak parse etsin
return "success"
```

## 4. Problem Çözüm Akışı (Troubleshooting)

Eğer frontend `Unknown request [istek_adi]` hatası alıyorsa:
1. **İki `controller.xml` Dosyasını Kontrol Et (Vite Build Tuzağı!):**
   - Projede İKİ adet `controller.xml` vardır:
     - `plugins/react-app/frontend/public/WEB-INF/controller.xml` (Kaynak dosya)
     - `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` (Runtime dosya)
   - Vite `npm run build` komutu çalıştırıldığında `webapp/react-app` dizinini tamamen temizler ve `frontend/public/WEB-INF/controller.xml` dosyasını `webapp/react-app/WEB-INF/controller.xml` üzerine kopyalar.
   - **Eğer request-map sadece `webapp/.../controller.xml` dosyasına eklenirse, ilk `npm run build` işleminde silinir!**
   - Bu nedenle endpoint'ler MUTLAKA **her iki dosyaya da**, en başta `frontend/public/WEB-INF/controller.xml` dosyasına eklenmelidir.
2. `controller.xml` dosyasında bir syntax/şema hatası olup olmadığını loglardan kontrol et (`xmlns="http://ofbiz.apache.org/Site-Conf"` kullanılmalı). En ufak bir XML hatası, dosyadaki tüm request'lerin parse edilmesini engeller!
3. OFBiz bileşeninin yüklendiğinden (`ofbiz-component.xml` içinde controller mount edildiğinden) emin ol.
4. OFBiz controller konfigürasyonunu ~10 saniye boyunca önbellekte tutar (`webapp.ControllerConfig.expireTime=10000`). Değişiklik sonrası 10 saniye bekleyip test et.

Eğer frontend API isteğinde `Unexpected token < in JSON at position 0` hatası alıyorsa:
1. OFBiz bir API isteğine `HTML` dönmüştür. Bu durum genellikle bilinmeyen request hatası (`Unknown request`), bir hata sayfası (`error.ftl`) veya Giriş (Login) sayfasına yönlendirildiğinde olur.
2. Loglardan hatanın arkasında ne olduğuna bak. `auth="true"` olup olmadığını kontrol et. Mevcut React projesi henüz auth token göndermiyorsa geçici olarak auth gereksinimini kaldır (`auth="false"`).
3. React fetch kodunda yanıtın `<!DOCTYPE` veya `<html` ile başlayıp başlamadığını kontrol edin ve `//` güvenlik önekini temizlemeyi unutmayın.

## 5. PostgreSQL ve Docker Veritabanı Doğrulaması

Sistem PostgreSQL (`ofbiz-postgres` Docker konteyneri) ile çalışmaktadır. Entity veya delegator üzerinden yapılan tüm ekleme/güncelleme/silme işlemleri (örneğin `createInvoice`, `createInvoiceItem`) doğrudan PostgreSQL tablolarına yansır.

* **Konteyner Durumu:** `sudo docker ps -f name=ofbiz-postgres`
* **SQL Konsolu:**
  ```bash
  sudo docker exec ofbiz-postgres psql -U ofbiz -d ofbiz -c "SELECT count(*) FROM invoice;"
  ```
* Detaylı veritabanı yönetimi ve delegator yapılandırmaları için `.agents/skills/ofbiz-postgres-docker/SKILL.md` kılavuzuna başvurun.

## 6. HTTP (8080) ve HTTPS (8443) Port Yönlendirmesi (`url.properties`)

OFBiz varsayılan olarak `framework/webapp/config/url.properties` dosyasında `no.http=Y` ayarına sahiptir. Bu durumda `http.request-map.list` içinde yer almayan tüm HTTP (8080) istekleri `302 Found` ile `https://localhost:8443/...` adresine yönlendirilir.

* **Sorun:** React uygulaması HTTP (`http://<ip>:8080/react-app/`) üzerinden açıldığında, tarayıcının attığı relative API istekleri `https://localhost:8443`'e yönlenir ve istemcide SSL/CORS/bağlantı hatası oluşturarak verilerin gelmesini engeller.
* **Kural:**
  1. `framework/webapp/config/url.properties` dosyasında `no.http=N` olmalıdır.
  2. `http.request-map.list` virgülle ayrılmış listesine tüm yeni React API URI'leri eklenmelidir (ör. `getInvoices`, `getInvoiceDetails`, `createInvoice`, vb.).
  3. `controller.xml` içindeki endpoint tanımlarında `<security https="false" auth="false"/>` yer almalıdır.

