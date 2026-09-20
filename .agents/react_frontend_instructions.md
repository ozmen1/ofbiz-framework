# OFBiz & React (Vite) Integration Guide and Agent Instructions

Bu belge, Apache OFBiz içerisindeki React frontend projesinin (Vite tabanlı) entegrasyonu ve geliştirilmesi için kuralları, mimari kararları ve yönergeleri içerir. AI Agent'lar ve geliştiriciler bu kurallara uymalıdır.

## Proje Yapısı

- **OFBiz Kök Dizini:** `/home/admin/Documents/ofbiz`
- **Plugin Dizini:** `plugins/react-app`
- **React Frontend Dizini:** `plugins/react-app/frontend`

## 1. Geliştirme Ortamı (Development Workflow)

Geliştirme aşamasında React projesi ve OFBiz bağımsız servisler olarak veya entegre çalıştırılabilir:
- **OFBiz (Backend):** Standart yöntemlerle çalıştırılır (`./gradlew ofbizBackground`). HTTP `8080` ve HTTPS `8443` portlarında hizmet verir.
- **React (Frontend):** `plugins/react-app/frontend` dizininde Vite geliştirme sunucusu başlatılır (`npm run dev`).

### CORS, HTTP/HTTPS Portları, Host Header ve Proxy Ayarları
1. **HTTP/HTTPS Yönlendirme:**
   - OFBiz varsayılan olarak `framework/webapp/config/url.properties` dosyasında `no.http=Y` ayarı ile HTTP isteklerini `302 Found` ile HTTPS (`8443`) portuna yönlendirir. Bu durum tarayıcı veya yerel ağ üzerinden HTTP (`8080`) ile bağlanıldığında isteklerin düşmesine neden olur.
   - `url.properties` dosyasında `no.http=N` yapılandırılmalı ve `http.request-map.list` listesine tüm API endpoint'leri eklenmelidir.
2. **Host Header Güvenlik Beyaz Listesi (`security.properties`):**
   - OFBiz `RequestHandler`, gelen `Host` başlığında yer alan IP/domain değerini `security.properties` dosyasındaki `host-headers-allowed` listesinde arar.
   - Eğer ağ IP'si (ör. `192.168.1.110`) bu listede yoksa, OFBiz API çağrılarına **500 HTML hata sayfası** döner. Frontend'de `api.ts` bu HTML'i yakalar ve arayüze veri gelmez!
   - `host-headers-allowed` içinde `192.168.*`, `10.*`, `172.*`, `raspberrypi`, `raspberrypi.local` tanımlı olmalıdır.
3. **Vite Proxy:**
   - Frontend geliştirme sırasında (`npm run dev`), `vite.config.ts` içerisinde `/react-app/control` API istekleri için proxy tanımlanmalıdır:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/react-app/',
  server: {
    proxy: {
      '/react-app/control': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/control': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
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
   - Modern ve responsive bir arayüz geliştirilmelidir. Tüm sayfalarda tek bir tasarım dili (`src/design-system.css`) ve Tailwind CSS karanlık tema paleti (`slate-950`, `slate-900`, `slate-800`, `indigo-500/600`) kullanılmalıdır.
   - Satır içi stillerden (`style={{}}`), eski `glass-card` veya dağınık CSS değişkenlerinden kaçınılmalıdır.
   - Standart DS sınıfları kullanılmalıdır: `.ds-card`, `.ds-stat-card`, `.ds-table`, `.ds-thead-row`, `.ds-th`, `.ds-tbody-row`, `.ds-td`, `.ds-btn-primary`, `.ds-btn-secondary`, `.ds-btn-danger`, `.ds-input`, `.ds-select`, `.ds-label`, `.ds-badge`, `.ds-overlay`, `.ds-modal`, `.ds-spinner`, `.ds-empty`.
   - **Tablo Sarmalama:** Her `<table>` mutlaka `<div className="overflow-x-auto">` içine alınmalıdır.
   - **Tarih Girdisi Genişliği:** `type="date"` input alanlarında tarayıcı yerel takvim ikonu ile tarih metninin (`DD.MM.YYYY`) çakışmasını önlemek için minimum `min-w-[140px]` (`w-36`+) genişlik tanımlanmalıdır.
   - **Duyarlı Izgaralar (Responsive Grid):** Çoklu istatistik veya döviz/yaşlandırma kutularında doğrudan sabit `grid-cols-6` verilmemeli, `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` gibi responsive kırılımlar kullanılmalıdır.

5. **60 FPS Akıcılık, Modal Mimarisi ve Performans Kuralları (KRİTİK):**
   - **Backdrop-Blur ve GPU Compositor Kilitlenmesi Yasağı:**
     - Modal ve çekmece (drawer) overlay arka planlarında (`fixed inset-0`) **ASLA `backdrop-blur-*` KULLANMAYIN**.
     - *Neden:* İç içe kartlar ve arka plan katmanları varken `backdrop-filter: blur()` uygulanması, tarayıcı GPU'sunda piksel başına katlanan Gauss hesaplama yükü bindirir ($O(N \times \text{layers})$). Modal açılışında, fare hareketlerinde ve animasyonlarda şiddetli donmaya (FPS düşüşü, INP > 1000ms) yol açar.
     - *Standart:* Overlay'lerde daima donanımsal olarak hafif, saf yarı saydam renk kullanın: `bg-black/80` veya doğrudan `.ds-overlay` sınıfı. `.ds-card` ve modal gövdelerinde gereksiz `backdrop-blur-*` eklemeyin.

   - **Modal Opaklığı ve Sayfa Karışmasını Önleme (Anti-Bleed - `.ds-card` Tuzağı):**
     - Modal kök container'ında **ASLA `.ds-card` KULLANMAYIN**.
     - *Neden:* `.ds-card` sınıfı varsayılan olarak `@apply bg-slate-800/50` (yani %50 yarı saydam) tanımlıdır. Modal ana gövdesinde kullanıldığında modal yarı saydam olur ve arkasındaki sayfa içerikleri, tablolar ve butonlar modal metinlerinin altından sızarak okunamaz hale gelir.
     - *Standart:* Modal ana penceresi daima **%100 opak** zemin rengine sahip olmalıdır: `bg-slate-900` veya `bg-slate-950` ile `border border-slate-700/80 shadow-2xl rounded-2xl`.

   - **Body Scroll Kilidi (Body Scroll Lock / Scroll Chaining Önleme):**
     - Modal açıldığında, kullanıcının fare tekerleğiyle kaydırmasının arkadaki sayfayı (`document.body`) hareket ettirmesini engellemek için scroll kilidi zorunludur:
       ```tsx
       useEffect(() => {
         const originalOverflow = document.body.style.overflow;
         document.body.style.overflow = 'hidden';
         return () => {
           document.body.style.overflow = originalOverflow;
         };
       }, []);
       ```

   - **Z-Index Katman Hiyerarşisi:**
     - Arayüz katmanları aşağıdaki z-index hiyerarşisine tam olarak uymalıdır:
       - Yapışkan Tablo Başlıkları (`sticky th`): `z-10`
       - Yan Çekmeceler (Slide-over Drawer): `z-50`
       - Modallar (Ayrıntı/İşlem Pencereleri): `z-[80]`
       - Onay / Alert Dialogları: `z-[90]`
       - Toast Bildirimleri: `z-[100]`
     - *Neden:* Modallar bir çekmecenin (drawer) içinden de açılabilir. Modal `z-50` olduğunda çekmeceyle çakışır veya yapışkan başlıkların arkasında kalabilir. Bu nedenle modallar mutlaka `z-[80]` olmalıdır.

   - **Tek Birleşik Dikey Kaydırma (İç İçe Scroll Trap Yasağı):**
     - Modal gövdesi (`overflow-y-auto flex-1`) dikey kaydırma sağlarken, modal içine konulan tablolara ayrıca `max-h-[50vh] overflow-y-auto` verilmemelidir.
     - *Neden:* İç içe dikey kaydırma kullanıcı fare tekerleğini iç alana hapsettiği için (scroll trap) modalın geri kalanı kaydırılamaz ve çift dikey kaydırma çubuğu oluşur.
     - *Standart:* Tablolarda yalnızca yatay taşmayı önlemek için `<div className="overflow-x-auto">` kullanın. Dikey kaydırmayı modalın ana gövdesi akıcı biçimde yönetsin.

   - **Opak Yapışkan Tablo Başlıkları (Sticky Headers):**
     - Tablo yapışkan başlıkları (`sticky top-0`) mutlaka `%100 opak` zemin rengine (`bg-slate-900` veya `bg-slate-800`) sahip olmalıdır. Şeffaf veya yarı saydam başlıklar, altından geçen satırların başlık metinlerine karışmasına sebep olur.

   - **Büyük `<select>` Seçeneklerinin Memoize Edilmesi (`useMemo`):**
     - Muhasebe hesapları (GL Accounts), ürünler veya cariler gibi 50'den fazla kayıt içeren dropdown seçeneklerini **mutlaka `useMemo` ile sarmalayın**:
       ```tsx
       const glAccountOptions = useMemo(() => (
         glAccounts.map(acc => (
           <option key={acc.glAccountId} value={acc.glAccountId}>
             {acc.glAccountId} - {acc.accountName}
           </option>
         ))
       ), [glAccounts]);
       ```
     - *Neden:* Formdaki bir harf değişiminde (keystroke) yüzlerce `<option>` DOM düğümünün sıfırdan oluşturulmasını engeller, klavye girdi gecikmesini (INP) sıfıra indirir.

   - **Bayrak İkonlarında SVG Kullanımı (Platform Bağımsızlığı):**
     - Dil seçiminde veya ülke göstergelerinde **ASLA Unicode emoji bayrakları (`🇹🇷`, `🇬🇧`) KULLANMAYIN**.
     - *Neden:* Linux ve birçok Chromium tabanlı sistemde işletim sistemi seviyesinde bayrak font glifleri bulunmadığından emojiler bozuk harf kodları ("TR", "GB") olarak render edilir.
     - *Standart:* Harici kütüphane gerektirmeyen saf inline SVG bileşenleri (`TrFlag`, `GbFlag`) kullanın.

   - **Koşullu Modal Render (Unmount on Close):**
     - Modalları CSS `hidden` ile gizlemek yerine daima `{isOpen && <MyModal ... />}` şeklinde DOM'dan kaldırarak render edin.

6. **Çoklu Dil (Localization / i18n) Standartları:**
   - Yeni bir ekran, form, buton, tablo veya bildirim geliştirildiğinde **KESİNLİKLE sabit (hardcoded) metin yazılmamalıdır**.
   - `src/i18n/types.ts`, `locales/tr.ts` ve `locales/en.ts` dosyalarına modül sözlükleri eklenmeli; bileşende `const { translations, locale } = useTranslation();` hook'u kullanılmalıdır.
   - Tarih ve para birimi biçimlendirmesinde `locale === 'tr' ? 'tr-TR' : 'en-US'` parametresi dikkate alınmalıdır.

7. **Dosya Değişiklikleri ve Build Kontrolü:**
   - Yeni bir sayfa veya bileşen eklendiğinde `src/components` veya `src/pages` klasör mimarisine uy.
   - TypeScript `noUnusedLocals` denetimi devrededir; kullanılmayan değişkenleri import veya destructuring'de bırakmayın.
   - Yapılan her değişiklik sonrası `plugins/react-app/frontend` içinde `npm run build` çalıştırarak derleme ve controller senkronizasyonunun başarılı olduğunu teyit et.

8. **Ağ Erişimi ve Host Header Doğrulaması (Yerel Ağda Veri Gelmeme Sorunu):**
   - Uygulama sadece `localhost` üzerinden değil, yerel ağ IP'si (örn: `https://192.168.1.x:8443/react-app/`) üzerinden de test edilmelidir.
   - Eğer React ekranı açılıyor fakat tablolara veya istatistik kartlarına veri dolmuyorsa, tarayıcı geliştirici araçları (Network sekmesi) üzerinden API çağrılarını kontrol et.
   - Eğer API çağrıları `500 Internal Server Error` ile HTML dönüyorsa, sorun OFBiz `host-headers-allowed` güvenliğidir. `framework/security/config/security.properties` dosyasına IP/subnet eklenmeli ve OFBiz yeniden başlatılmalıdır.


