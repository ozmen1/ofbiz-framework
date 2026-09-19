# OFBiz & React (Vite) Integration Guide and Agent Instructions

Bu belge, Apache OFBiz içerisindeki React frontend projesinin (Vite tabanlı) entegrasyonu ve geliştirilmesi için kuralları, mimari kararları ve yönergeleri içerir. AI Agent'lar ve geliştiriciler bu kurallara uymalıdır.

- **OFBiz Kök Dizini:** `/home/admin/Documents/ofbiz`
- **Plugin Dizini:** `plugins/react-app`
- **React Frontend Dizini:** `plugins/react-app/frontend`
- **Modül Geliştirme Playbook:** `plugins/react-app/docs/OFBIZ_REACT_MODULE_PLAYBOOK.md`

## 1. Geliştirme Ortamı (Development Workflow)

Geliştirme aşamasında React projesi ve OFBiz bağımsız servisler olarak çalıştırılır:
- **OFBiz (Backend):** Standart yöntemlerle çalıştırılır (`gradlew ofbiz`). Arayüz sağlamak yerine sadece REST API hizmeti vermelidir (Genellikle `https://localhost:8443` portunda çalışır).
- **React (Frontend):** `plugins\react-app\frontend` dizininde Vite geliştirme sunucusu başlatılır (`npm run dev`).

### CORS ve Proxy Ayarları
Frontend geliştirme sırasında CORS (Cross-Origin Resource Sharing) hatalarını önlemek ve frontend'i backend'e bağlamak için `vite.config.ts` içerisinde OFBiz API'lerine proxy ayarlanmalıdır:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { // OFBiz'deki REST API kök dizini
        target: 'https://localhost:8443',
        changeOrigin: true,
        secure: false, // OFBiz self-signed SSL sertifikası kullanıyorsa false olmalıdır
      }
    }
  }
});
```

## 2. Üretim (Production) ve OFBiz'e Entegre Etme

Production (Canlı) ortamında React uygulamasının SPA (Single Page Application) olarak OFBiz (Tomcat) üzerinden sunulması gerekmektedir.

1. **Build Süreci:** `plugins\react-app\frontend` dizininde `npm run build` komutu çalıştırılarak optimize edilmiş statik dosyalar elde edilir.
2. **Statik Dosyaların Taşınması (Dist):** Vite varsayılan olarak `dist` klasörüne çıktı üretir. Bu çıktı dosyaları, OFBiz'in statik dosyaları sunabilmesi için `plugins/react-app/webapp/react-app/` dizinine çıkarılmalıdır. Bunun için `vite.config.ts` içerisinde `build.outDir` ayarı güncellenebilir:
   ```typescript
   build: {
     outDir: '../webapp/react-app',
     emptyOutDir: true,
   }
   ```
3. **ofbiz-component.xml:** React dosyalarının OFBiz üzerinden bir uygulama olarak yayınlanması için webapp mount point tanımlanmalıdır:
   ```xml
   <webapp name="react-app"
           title="React App Frontend"
           server="default-server"
           location="webapp/react-app"
           mount-point="/react-app"/>
   ```
4. **React Router ve Routing Problemi (Catch-all):** Arayüzde React Router kullanıldığında, alt sayfalara (örn: `/react-app/dashboard`) doğrudan girilen URL istekleri OFBiz'e gidecek ve 404 hatası alacaktır. Bunu önlemek için OFBiz `web.xml` ve `controller.xml` dosyalarında bulunamayan tüm rotaların (catch-all) React'in `index.html` dosyasına yönlendirilmesi yapılandırılmalıdır.

## 3. Agent (Yapay Zeka Asistanı) İçin Çalışma Kuralları

Eğer bir yapay zeka asistanı olarak bu projede çalışıyorsan, şu kuralları harfiyen uygula:

1. **İzole Frontend Geliştirme:**
   - Frontend UI değişiklikleri için **SADECE** `plugins/react-app/frontend` dizininde çalış.
   - Paket kurulumu veya komut çalıştırma gerektiğinde, terminal cwd'sini daima `plugins/react-app/frontend` olarak ayarla (Örn: `npm install <paket>`).
2. **Backend API Entegrasyonu & Request-Map Kuralları (KRİTİK):**
   - Yeni bir özellik geliştirildiğinde veya frontend'de bir API isteği eklendiğinde, OFBiz'de bu istek için mutlaka bir `<request-map>` tanımlanmalıdır.
   - **Vite Build Tuzağı ve İki controller.xml Senkronizasyonu:**
     - Projede `plugins/react-app/frontend/public/WEB-INF/controller.xml` ve `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` olmak üzere iki dosya vardır.
     - `npm run build` çalıştırıldığında Vite `webapp/react-app/` dizinini silip `frontend/public/` içeriğini kopyalar.
     - Bu nedenle eklenen her `<request-map>`, **öncelikle `plugins/react-app/frontend/public/WEB-INF/controller.xml` dosyasına**, ardından `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` dosyasına eklenmelidir. Asla sadece webapp altındaki dosyayı düzenlemeyin!
   - Frontend, backend ile iletişim için standart Fetch API veya Axios kullanarak JSON formatında istek yapmalıdır (`/react-app/control/<uri>`).
   - OFBiz JSON yanıtlarının başındaki `//` güvenlik önekini `rawText.startsWith('//') ? rawText.substring(2) : rawText` ile temizleyin.
3. **Kimlik Doğrulama (Authentication):**
   - OFBiz'den dönen kimlik doğrulama token'ları (örn. JWT veya Session Cookie) frontend tarafında Context API, Redux veya Zustand aracılığıyla global state'te güvenli bir şekilde saklanmalıdır. API isteklerine Authorization header'ı olarak eklenmelidir.
4. **Stil, Birleşik Tasarım Dili (Design System) ve Responsive Standartları:**
   - Uygulamanın tüm sayfalarında tek bir tasarım dili (`src/design-system.css`) ve Tailwind CSS karanlık tema paleti (`slate-950`, `slate-900`, `slate-800`, `indigo-500/600`) kullanılmalıdır.
   - Satır içi stillerden (`style={{}}`), eski `glass-card` veya dağınık CSS değişkenlerinden kaçınılmalıdır.
   - Standart DS token'ları zorunludur:
     - Kartlar: `.ds-card`, istatistik kartları: `.ds-stat-card`
     - Tablolar: `.ds-table`, `.ds-thead-row`, `.ds-th`, `.ds-tbody-row`, `.ds-td`, `.ds-td-mono`, `.ds-td-right`
     - Butonlar: `.ds-btn-primary`, `.ds-btn-secondary`, `.ds-btn-danger`, `.ds-btn-ghost`
     - Formlar: `.ds-label`, `.ds-input`, `.ds-select`
     - Durumlar: `.ds-badge`, `.ds-badge-green/blue/yellow/red/purple/slate`
     - Yükleme & Boş Durum: `.ds-spinner`, `.ds-empty`
     - Modallar: `.ds-overlay`, `.ds-modal`
   - **Mobil & Masaüstü Duyarlılığı (Responsive Kuralları):**
     - **Tablolar:** Tüm `<table>` elementleri mobilde taşmaları önlemek için mutlaka `<div className="overflow-x-auto">` içine alınmalıdır.
     - **Modallar:** Mobilde ekran altına taşmaması için `.ds-overlay` (`overflow-y-auto p-3 sm:p-6`) ve `.ds-modal` (`max-h-[85vh] sm:max-h-[90vh] my-auto`) kullanılmalıdır.
     - **Form Gridleri:** Alanlar mobilde tek sütun, tablette/masaüstünde çift sütun (`grid grid-cols-1 sm:grid-cols-2 gap-4`) olmalıdır.
     - **Sekmeler:** Yatay kaydırılabilir `.ds-tab-bar` kullanılmalı, mobilde taşma yapmamalıdır.

5. **Çoklu Dil (Localization / i18n) Standartları:**
   - Yeni bir ekran, form, buton, tablo veya bildirim geliştirildiğinde **KESİNLİKLE sabit (hardcoded) metin yazılmamalıdır**.
   - Projedeki `src/i18n/` modülü kullanılmalıdır:
     1. `src/i18n/types.ts`: Yeni modül veya anahtar için TypeScript şemasını tanımlayın.
     2. `src/i18n/locales/tr.ts`: Türkçe kurumsal muhasebe/ERP karşılığını ekleyin.
     3. `src/i18n/locales/en.ts`: Standart İngilizce OFBiz karşılığını ekleyin.
     4. Bileşende `const { translations, locale } = useTranslation();` hook'unu kullanarak `translations.<modul>.<anahtar>` üzerinden çağırın.
     5. Tarih ve Para Birimi: Biçimlendirmelerde mutlaka `locale` parametresi dikkate alınmalıdır (`tr-TR` veya `en-US`).

6. **Dosya Değişiklikleri ve Build Kontrolü:**
   - Yeni bir sayfa veya bileşen eklendiğinde `src/components` mimarisine uy.
   - TypeScript `noUnusedLocals` denetimi devrededir; kullanılmayan değişkenleri (`t`, `locale`, vb.) import veya destructuring'de bırakmayın.
   - Yapılan her değişiklik sonrası `plugins/react-app/frontend` içinde `npm run build` çalıştırarak derleme ve controller senkronizasyonunun başarılı olduğunu teyit et.
7. **Backend Groovy Event ve İşlem (Transaction) Bütünlüğü:**
   - Groovy event metodlarında `EntityQuery.from(...).where(...)` kullanırken koşul listesi boş olduğunda `where(null)` çağırmayın (`if (!conditions.isEmpty()) query = query.where(...)`).
   - Servis çalıştırmadan önce `secas.xml` içindeki ECA kurallarını denetleyin. Otomatik tetiklenen bir alt servisi (ör. durum oluşturma) tekrar çağırıp mükerrerlik hatasıyla JTA transaction'ın `rollback-only` olmasını engelleyin.
8. **HTTP Port & Ağ İzinleri:**
   - `framework/webapp/config/url.properties` içindeki `http.request-map.list` listesine eklenen tüm endpoint'leri tanımlayın (`no.http=N`).
   - `framework/security/config/security.properties` içindeki `host-headers-allowed` listesinde yerel alt ağların (`192.168.*`) bulunduğundan emin olun.

Detaylı mimari şablonlar, modül cookbook'ları ve UI tasarım kalıpları için `plugins/react-app/docs/OFBIZ_REACT_MODULE_PLAYBOOK.md` dosyasını inceleyin.

