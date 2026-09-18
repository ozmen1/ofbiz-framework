---
name: ofbiz-postgres-docker
description: >-
  Apache OFBiz projesinde PostgreSQL veritabanının Docker konteyneri ile kurulumu,
  konteyner yaşam döngüsü yönetimi, entityengine.xml delegator ve datasource yapılandırması,
  Gradle bağımlılıkları, ilk şema ve veri yükleme (loadAll) adımları ile doğrudan psql
  üzerinden doğrulama ve sorun giderme kuralları.
---

# OFBiz PostgreSQL ve Docker Veritabanı Kurulum ve Yönetim Kılavuzu

Bu kılavuz, Apache OFBiz platformunun gömülü H2 veritabanı yerine Docker üzerinde çalışan PostgreSQL veritabanı ile yapılandırılması, şema ve başlangıç verilerinin yüklenmesi, servisin başlatılması ve operasyonel bakım adımlarını içerir.

---

## 1. Genel Mimari ve Docker Konfigürasyonu

OFBiz çoklu veritabanı/kiracı (multi-tenant) ve analitik (OLAP) mimarisi gereği 3 ayrı veritabanına ihtiyaç duyar:
1. **`ofbiz`**: Ana operasyonel veritabanı (OLTP - siparişler, faturalar, cariler, ürünler vb.)
2. **`ofbizolap`**: İş zekası ve analitik raporlama veritabanı (OLAP)
3. **`ofbiztenant`**: Kiracı yönetim veritabanı

### Docker Compose Yapılandırması (`docker-compose.yml`)
Kök dizinde yer alan `docker-compose.yml` dosyası:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: ofbiz-postgres
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ofbiz
      POSTGRES_DB: ofbiz
    volumes:
      - ofbiz-postgres-data:/var/lib/postgresql/data
      - ./docker/postgres/init-db:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ofbiz -d ofbiz"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  ofbiz-postgres-data:
    name: ofbiz-postgres-data
```

> [!IMPORTANT]
> Güvenlik gereği port eşlemesi doğrudan dış dünyaya açılmamalı, `127.0.0.1:5432:5432` şeklinde yalnızca yerel makineye bağlanmalıdır.

### İlk Veritabanı ve Kullanıcı Başlatma Betiği (`docker/postgres/init-db/01-init-ofbiz-dbs.sql`)
PostgreSQL konteyneri ilk ayağa kalktığında otomatik olarak `docker-entrypoint-initdb.d` altındaki SQL dosyasını çalıştırır:

```sql
-- OFBiz kullanıcısı oluştur ve süper yetki ver
DO
$do$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ofbiz') THEN
      CREATE ROLE ofbiz LOGIN PASSWORD 'ofbiz' SUPERUSER;
   ELSE
      ALTER ROLE ofbiz WITH PASSWORD 'ofbiz' SUPERUSER;
   END IF;
END
$do$;

-- OFBiz veritabanlarını oluştur
SELECT 'CREATE DATABASE ofbiz OWNER ofbiz' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ofbiz')\gexec
SELECT 'CREATE DATABASE ofbizolap OWNER ofbiz' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ofbizolap')\gexec
SELECT 'CREATE DATABASE ofbiztenant OWNER ofbiz' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ofbiztenant')\gexec

-- Şema sahipliği ve yetkilendirmeleri
\c ofbiz
ALTER SCHEMA public OWNER TO ofbiz;
GRANT ALL ON SCHEMA public TO ofbiz;

\c ofbizolap
ALTER SCHEMA public OWNER TO ofbiz;
GRANT ALL ON SCHEMA public TO ofbiz;

\c ofbiztenant
ALTER SCHEMA public OWNER TO ofbiz;
GRANT ALL ON SCHEMA public TO ofbiz;
```

---

## 2. OFBiz Bağımlılık ve Sürücü (JDBC) Yapılandırması

PostgreSQL JDBC sürücüsünün çalışma zamanında (runtime classpath) yer alması zorunludur.

1. **`gradle/libs.versions.toml`:**
   ```toml
   [versions]
   postgresql = "42.7.3"

   [libraries]
   postgresql = { module = "org.postgresql:postgresql", version.ref = "postgresql" }
   ```

2. **`dependencies.gradle`:**
   ```groovy
   dependencies {
       ...
       runtimeOnly libs.postgresql
       ...
   }
   ```

---

## 3. Entity Engine Yapılandırması (`entityengine.xml`)

Dosya konumu: `framework/entity/config/entityengine.xml`

### A. Delegator Grup Eşlemeleri (Group Maps)
`default`, `default-no-eca` ve `test` delegator'larının `localh2` yerine `localpostgres` datasourcelarına yönlendirilmesi gerekir:

```xml
<delegator name="default" entity-model-reader="main" entity-group-reader="main" entity-eca-reader="main" distributed-cache-clear-enabled="false">
    <group-map group-name="org.apache.ofbiz" datasource-name="localpostgres"/>
    <group-map group-name="org.apache.ofbiz.olap" datasource-name="localpostgresolap"/>
    <group-map group-name="org.apache.ofbiz.tenant" datasource-name="localpostgrestenant"/>
</delegator>

<delegator name="default-no-eca" entity-model-reader="main" entity-group-reader="main" entity-eca-reader="main" entity-eca-enabled="false" distributed-cache-clear-enabled="false">
    <group-map group-name="org.apache.ofbiz" datasource-name="localpostgres"/>
    <group-map group-name="org.apache.ofbiz.olap" datasource-name="localpostgresolap"/>
    <group-map group-name="org.apache.ofbiz.tenant" datasource-name="localpostgrestenant"/>
</delegator>

<delegator name="test" entity-model-reader="main" entity-group-reader="main" entity-eca-reader="main">
    <group-map group-name="org.apache.ofbiz" datasource-name="localpostgres"/>
    <group-map group-name="org.apache.ofbiz.olap" datasource-name="localpostgresolap"/>
    <group-map group-name="org.apache.ofbiz.tenant" datasource-name="localpostgrestenant"/>
</delegator>
```

### B. Datasource Bağlantı Parametreleri
`localpostgres`, `localpostgresolap` ve `localpostgrestenant` için inline JDBC tanımları:

```xml
<datasource name="localpostgres"
        helper-class="org.apache.ofbiz.entity.datasource.GenericHelperDAO"
        schema-name="public"
        field-type-name="postgres"
        check-on-start="true"
        add-missing-on-start="true"
        use-fk-initially-deferred="false"
        alias-view-columns="false"
        join-style="ansi"
        use-binary-type-for-blob="true"
        use-order-by-nulls="true"
        offset-style="limit"
        result-fetch-size="50">
    ...
    <inline-jdbc
            jdbc-driver="org.postgresql.Driver"
            jdbc-uri="jdbc:postgresql://127.0.0.1/ofbiz"
            jdbc-username="ofbiz"
            jdbc-password="ofbiz"
            isolation-level="ReadCommitted"
            pool-minsize="2"
            pool-maxsize="250"
            time-between-eviction-runs-millis="600000"/>
</datasource>
```

---

## 4. Sıfırdan Kurulum ve Veri Yükleme Adımları

PostgreSQL konteyneri ilk kurulduğunda tablolar boştur. Sırasıyla şu adımlar uygulanır:

### Adım 1: PostgreSQL Konteynerini Başlatma
```bash
sudo docker compose up -d
# Sağlık durumunu kontrol edin (Status: Up ... healthy olmalıdır)
sudo docker ps -f name=ofbiz-postgres
```

### Adım 2: OFBiz Şeması ve Tohum/Demo Verilerini Yükleme
```bash
./gradlew loadAll
```
* Bu komut PostgreSQL içinde **839 adet tablo** ve gerekli tüm sequence, index, foreign key yapılarını oluşturur.
* `13,400+` satırlık sistem yapılandırması, roller, kullanıcılar (`admin`), muhasebe hesap planı ve demo faturaları yükler.

### Adım 3: OFBiz Sunucusunu Başlatma
```bash
# Arka planda başlatmak için:
./gradlew ofbizBackground

# Başlatma loglarını takip etmek için:
tail -f runtime/logs/console.log
# veya
tail -f runtime/logs/ofbiz.log
```

---

## 5. Doğrulama ve Sorun Giderme (Checklist)

### 1. PostgreSQL Konteynerine Doğrudan Bağlantı ve Kontrol
```bash
# Tablo sayısını kontrol etme (839 olmalıdır):
sudo docker exec ofbiz-postgres psql -U ofbiz -d ofbiz -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"

# Fatura sayısını kontrol etme:
sudo docker exec ofbiz-postgres psql -U ofbiz -d ofbiz -c "SELECT count(*) FROM invoice;"

# Belirli bir faturayı sorgulama:
sudo docker exec ofbiz-postgres psql -U ofbiz -d ofbiz -c "SELECT invoice_id, invoice_type_id, status_id FROM invoice WHERE invoice_id='CI1';"
```

### 2. OFBiz Servis Durumu ve Port Kontrolü
```bash
# 8443 portunun dinlenip dinlenmediğini kontrol etme:
ss -tulpn | grep 8443

# Çalışan OFBiz sürecini zorla kapatma (gerekirse):
./gradlew terminateOfbiz
```

### 3. Sık Karşılaşılan Sorunlar ve Çözümleri
* **`Connection refused` Hatası:**
  - Konteynerin ayakta olup olmadığını `sudo docker ps` ile kontrol edin.
  - Eğer konteyner çalışmıyorsa `sudo docker compose up -d` ile başlatın.
* **`permission denied for schema public` Hatası:**
  - `ofbiz` kullanıcısının `public` şemasına yetkisi eksiktir.
  - `sudo docker exec ofbiz-postgres psql -U postgres -d ofbiz -c "ALTER SCHEMA public OWNER TO ofbiz; GRANT ALL ON SCHEMA public TO ofbiz;"` çalıştırın.
* **`GenericDataSourceException: Unable to establish a connection` Hatası:**
  - `dependencies.gradle` içinde `runtimeOnly libs.postgresql` olduğundan ve `build.gradle` içindeki `classpath` üzerinde PostgreSQL JAR'ının bulunduğundan emin olun.
