# Apache OFBiz & React SPA — AI Agent Master Reference (AGENTS.md)

Bu dosya, Apache OFBiz ve React SPA (`plugins/react-app`) projesinde görev alan tüm Yapay Zeka Asistanları (AI Agents, Claude Code, Antigravity, Cursor vb.) için **tek gerçeklik kaynağı (Single Source of Truth)** ve ana yönetim merkezidir.

Tüm ayrıntılı rehberler, beceri dosyaları (skills) ve mimari belgeler `.agents/` dizininde toplanmıştır.

---

## 1. Belge ve Beceri İndeksi (.agents/)

Herhangi bir geliştirme veya hata giderme görevine başlamadan önce görevinize uygun belgeyi referans alın:

| Belge / Beceri | Konum | Odaklandığı Konu |
|---|---|---|
| **React & OFBiz Entegrasyon Becerisi** | [`.agents/skills/react-ofbiz-integration/SKILL.md`](.agents/skills/react-ofbiz-integration/SKILL.md) | Uçtan uca React SPA ve OFBiz bağlantısı, Groovy event'leri, API akışı, 60 FPS optimizasyonu. |
| **PostgreSQL & Docker Becerisi** | [`.agents/skills/ofbiz-postgres-docker/SKILL.md`](.agents/skills/ofbiz-postgres-docker/SKILL.md) | PostgreSQL Docker konteyneri, `entityengine.xml`, `loadAll`, psql doğrulama. |
| **Frontend Geliştirme Yönergesi** | [`.agents/react_frontend_instructions.md`](.agents/react_frontend_instructions.md) | `design-system.css`, Tailwind karanlık tema, responsive grid, i18n, modal kuralları. |
| **Backend API Yönergesi** | [`.agents/ofbiz_backend_api_instructions.md`](.agents/ofbiz_backend_api_instructions.md) | Standart `controller.xml` XSD şeması, JSON `request-map`, Groovy bağlamı, transaction güvenliği. |
| **Modül Geliştirme Playbook (Cookbook)**| [`.agents/OFBIZ_REACT_MODULE_PLAYBOOK.md`](.agents/OFBIZ_REACT_MODULE_PLAYBOOK.md) | Yeni modül çıkarma rehberi (Sipariş, Cari, Ürün, Depo), sequence diyagramı, 12 adımlı checklist. |

---

## 2. Altın Kurallar & Mimari Değişmezler (Golden Invariants)

Projeye katkı sağlayan her agent aşağıdaki 6 kuralı eksiksiz uygulamakla yükümlüdür:

### 1. Çift `controller.xml` Senkronizasyonu (Vite Build Tuzağı)
* Projede iki adet `controller.xml` vardır:
  1. `plugins/react-app/frontend/public/WEB-INF/controller.xml` (Kaynak)
  2. `plugins/react-app/webapp/react-app/WEB-INF/controller.xml` (OFBiz Runtime)
* `npm run build` komutu `webapp/react-app/` dizinini silip `frontend/public/` içeriğini kopyalar.
* **KURAL:** Yeni bir endpoint (`<request-map>`) eklerken **ÖNCE `frontend/public/WEB-INF/controller.xml`** dosyasına, **ARDINDAN `webapp/react-app/WEB-INF/controller.xml`** dosyasına yazın. Asla yalnızca webapp altındakini düzenlemeyin!

### 2. 60 FPS Akıcılık, Modal & GPU Performans Kuralları
* **Backdrop-Blur Yasağı:** Modal ve drawer overlay arka planlarında (`fixed inset-0`) **ASLA `backdrop-blur-*` KULLANMAYIN**. Katlanan Gauss bulanıklığı GPU compositor thread'ini kilitler, modal açılışında donmaya ve INP değerinin >1000ms olmasına yol açar. Her zaman `bg-black/80` veya `.ds-overlay` kullanın.
* **Büyük Dropdown `<select>` Memoization (`useMemo`):** 50'den fazla öğe içeren seçim listeleri (`glAccounts`, `products`, `parties`) mutlaka `useMemo` ile sarmalanmalıdır. Form tuş vuruşlarında binlerce DOM düğümünün baştan render edilmesi önlenmelidir.
* **Platform Bağımsız SVG Bayraklar:** Dil seçiminde Unicode emoji bayrakları (`🇹🇷`, `🇬🇧`) kullanmayın (Linux/Chromium ortamlarında bozulur). Saf inline SVG bileşenleri (`TrFlag`, `GbFlag`) kullanın.
* **Koşullu Render:** Modalları DOM'da `hidden` olarak tutmayın; `{isOpen && <ModalComponent ... />}` ile kapatıldığında unmount edin.

### 3. Backend Groovy & JTA Transaction Güvenliği
* `EntityQuery.from(...).where(...)` çağrılarında koşul listesi boşken `where(null)` çağırmayın (`if (!conditions.isEmpty()) query = query.where(...)`).
* Servis çalıştırmadan önce `secas.xml` içindeki ECA kurallarını denetleyin. Otomatik tetiklenen bir alt servisi tekrar çağırıp mükerrerlik hatasıyla JTA transaction'ın `rollback-only` olmasını engelleyin.
* Tüm JSON yanıtları `type="request" value="json"` ile dönmeli, frontend tarafında `//` güvenlik öneki temizlenmelidir.

### 4. Ağ ve Host Header İzinleri
* `framework/webapp/config/url.properties` dosyasında `no.http=N` olmalı ve eklenen her endpoint `http.request-map.list` listesine eklenmelidir.
* Yerel ağdan (`192.168.*`) erişim için `framework/security/config/security.properties` içindeki `host-headers-allowed` beyaz listesi güncel tutulmalıdır.

### 5. Sıfır Sabit Metin (Full i18n Standartı)
* Arayüzde hiçbir dize sabit (hardcoded) bırakılamaz.
* `src/i18n/types.ts`, `src/i18n/locales/tr.ts` ve `src/i18n/locales/en.ts` dosyaları eş zamanlı güncellenmelidir.
* Tarih ve para birimi formatlamalarında `locale === 'tr' ? 'tr-TR' : 'en-US'` parametresi kullanılmalıdır.

### 6. TypeScript ve Build Denetimi
* `noUnusedLocals` kuralı aktiftir; kullanılmayan import ve destructuring değişkenleri derleme hatası üretir.
* Yapılan her frontend değişikliğinin ardından `plugins/react-app/frontend` dizininde `npm run build` komutu çalıştırılarak 0 hata ile derlendiği doğrulanmalıdır.

---

## 3. Rol Bazlı Görev Dağılımı

| Agent Rolü | Öncelikli Okunacak Dosyalar |
|---|---|
| **Frontend / UI Agent** | [`.agents/react_frontend_instructions.md`](.agents/react_frontend_instructions.md), [`.agents/skills/react-ofbiz-integration/SKILL.md`](.agents/skills/react-ofbiz-integration/SKILL.md) |
| **Backend / API Agent** | [`.agents/ofbiz_backend_api_instructions.md`](.agents/ofbiz_backend_api_instructions.md), [`.agents/OFBIZ_REACT_MODULE_PLAYBOOK.md`](.agents/OFBIZ_REACT_MODULE_PLAYBOOK.md) |
| **Yeni Modül Mimarı** | [`.agents/OFBIZ_REACT_MODULE_PLAYBOOK.md`](.agents/OFBIZ_REACT_MODULE_PLAYBOOK.md) |
| **Veritabanı / DevOps Agent** | [`.agents/skills/ofbiz-postgres-docker/SKILL.md`](.agents/skills/ofbiz-postgres-docker/SKILL.md) |
