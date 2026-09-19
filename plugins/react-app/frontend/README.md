# OFBiz Modern React Frontend (SPA)

Bu dizin, Apache OFBiz ERP sistemine entegre modern React SPA (Single Page Application) istemcisini barındırır.

## 🚀 Teknoloji Yığını

- **Çatı & Araçlar:** React 18, Vite, TypeScript
- **Stil & Tasarım Sistemi:** Tailwind CSS v3, `src/design-system.css`
- **İkonlar & Animasyon:** Lucide React, Framer Motion
- **Çoklu Dil (i18n):** Özel Type-Safe React Context API tabanlı yerelleştirme (Türkçe & İngilizce)

---

## 💻 Geliştirme ve Derleme Komutları

```bash
# Bağımlılıkları yükleme
npm install

# Geliştirme sunucusunu başlatma (HMR)
npm run dev

# Üretim (Production) derlemesi
npm run build
```

> [!CAUTION]
> **Vite Build Tuzağı & Çift controller.xml:**
> `vite.config.ts` yapılandırmasında `build.emptyOutDir: true` tanımlıdır. `npm run build` komutu `webapp/react-app/` dizinini tamamen siler ve `frontend/public/` içeriğini oraya kopyalar.
> **Yeni bir endpoint eklediğinizde MUTLAKA önce `frontend/public/WEB-INF/controller.xml` dosyasına ekleyin**, ardından `webapp/react-app/WEB-INF/controller.xml` dosyasını senkronize edin!

---

## 🎨 Birleşik Tasarım Dili (Design System)

Uygulamanın tüm sayfalarında tek tip görünüm, tutarlı UX ve koyu tema (`slate-950`, `slate-900`, `slate-800`, `indigo-500/600`) standarttır. Tüm bileşenlerde `src/design-system.css` token sınıfları kullanılmalıdır:

- **Kartlar:** `.ds-card`, `.ds-stat-card`
- **Tablolar:** `.ds-table`, `.ds-thead-row`, `.ds-th`, `.ds-tbody-row`, `.ds-td`, `.ds-td-mono`, `.ds-td-right`
- **Butonlar:** `.ds-btn-primary`, `.ds-btn-secondary`, `.ds-btn-danger`, `.ds-btn-ghost`
- **Formlar:** `.ds-label`, `.ds-input`, `.ds-select`
- **Rozetler:** `.ds-badge`, `.ds-badge-green/blue/yellow/red/purple/slate`
- **Modallar:** `.ds-overlay`, `.ds-modal`
- **Durumlar:** `.ds-spinner`, `.ds-empty`

### 📱 Mobil & Masaüstü Duyarlılık (Responsive Kuralları)
1. **Tablolar:** Tüm `<table>` etiketleri taşmaları engellemek için `<div className="overflow-x-auto">` ile sarmalanmalıdır (`.ds-table` min-w-[640px] koruması içerir).
2. **Modallar:** Küçük ekranlar için `.ds-overlay` (`p-3 sm:p-6 overflow-y-auto`) ve `.ds-modal` (`max-h-[85vh] sm:max-h-[90vh]`) kullanılmalıdır.
3. **Form Izgaraları:** `grid grid-cols-1 sm:grid-cols-2 gap-4` yapısı uygulanmalıdır.

---

## 🌍 Çoklu Dil (Localization / i18n) Standartları

Uygulamada hiçbir bileşende sabit (hardcoded) metin bulunmamalıdır. Türkçe ve İngilizce sözlükler `src/i18n/` altında yönetilir.

### Yeni Metin / Modül Ekleme İş Akışı:
1. `src/i18n/types.ts`: İlgili modül veya ekran için şemayı tanımlayın.
2. `src/i18n/locales/tr.ts`: Türkçe karşılığını ekleyin.
3. `src/i18n/locales/en.ts`: İngilizce karşılığını ekleyin.
4. Bileşende kullanım:
   ```tsx
   import { useTranslation } from '../i18n/I18nContext';

   export const MyComponent = () => {
     const { translations, locale } = useTranslation();
     const t = translations.myModule;

     return (
       <div className="ds-card p-5">
         <h2 className="text-white font-semibold">{t.title}</h2>
       </div>
     );
   };
   ```

> [!WARNING]
> **TypeScript `noUnusedLocals`:**
> `tsconfig.json` dosyasında katı `noUnusedLocals: true` etkindir. Hook'tan çekilen ancak JSX içinde kullanılmayan değişkenler derleme hatasına yol açar. Yalnızca ihtiyaç duyulan anahtarları destructure edin.
