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

### CORS, HTTP/HTTPS Portları ve Proxy Ayarları
OFBiz varsayılan olarak `framework/webapp/config/url.properties` dosyasında `no.http=Y` ayarı ile HTTP isteklerini `302 Found` ile HTTPS (`8443`) portuna yönlendirir. Bu durum tarayıcı veya yerel ağ üzerinden HTTP (`8080`) ile bağlanıldığında isteklerin düşmesine neden olur.
- `url.properties` dosyasında `no.http=N` yapılandırılmalı ve `http.request-map.list` listesine tüm API endpoint'leri eklenmelidir.
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
4. **Stil ve Tasarım:**
   - Modern ve responsive bir arayüz geliştirilmelidir (Tercihen TailwindCSS veya Material UI kullanılabilir, projedeki `package.json` dosyasını kontrol et).
   - "Placeholder" tasarımlardan kaçınılmalı, gerçekçi, bitmiş bir ürün görünümü sunulmalıdır.
5. **Dosya Değişiklikleri ve Build Kontrolü:**
   - Yeni bir sayfa veya bileşen eklendiğinde `src/components` veya `src/pages` klasör mimarisine uy.
   - Yapılan her değişiklik sonrası `plugins/react-app/frontend` içinde `npm run build` çalıştırarak derleme ve controller senkronizasyonunun başarılı olduğunu teyit et.

