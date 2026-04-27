-- 030_kamu_aile_fields.up.sql
-- 657 kamu bordro için aile yardımı + çocuk yardımı + engellilik indirim alanları.
-- Mevcut `medeni_hali` kolonu zaten var (007_employees); aileye özgü bilgiler
-- (eş çalışma durumu, çocuk sayıları, engelli indirimi) için yeni kolonlar.

ALTER TABLE app.employees
    ADD COLUMN IF NOT EXISTS es_calisiyor_mu          boolean NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cocuk_06                 integer NOT NULL DEFAULT 0
        CHECK (cocuk_06 BETWEEN 0 AND 20),
    ADD COLUMN IF NOT EXISTS cocuk_6plus              integer NOT NULL DEFAULT 0
        CHECK (cocuk_6plus BETWEEN 0 AND 20),
    ADD COLUMN IF NOT EXISTS engelli_indirimi_aylik   numeric(12, 2) NOT NULL DEFAULT 0
        CHECK (engelli_indirimi_aylik >= 0),
    ADD COLUMN IF NOT EXISTS medeni_hal               varchar(20);

-- Yeni medeni_hal alanı mevcut medeni_hali değerlerinden türetiliyor.
-- (Uzun vadede mevcut kolon temizlenecek, bu geçiş için ikisi de tutulur.)
UPDATE app.employees
SET medeni_hal = CASE medeni_hali
    WHEN 'evli'             THEN 'evli'
    WHEN 'bekâr'            THEN 'bekar'
    WHEN 'boşanmış'         THEN 'bosanmis'
    WHEN 'dul'              THEN 'dul'
    ELSE 'bekar'
END
WHERE medeni_hal IS NULL;

-- Kamu çalışanları için kıdem yılı hesabında hire_date zaten var; ek sütun yok.

COMMENT ON COLUMN app.employees.es_calisiyor_mu IS '657: Eş yardımı için eşin çalışma durumu (FALSE = çalışmıyor → aile yardımı alır)';
COMMENT ON COLUMN app.employees.cocuk_06 IS '657: 0-6 yaş çocuk sayısı (çocuk yardımı taban puan × katsayı)';
COMMENT ON COLUMN app.employees.cocuk_6plus IS '657: 6+ yaş çocuk sayısı';
COMMENT ON COLUMN app.employees.engelli_indirimi_aylik IS 'GVK 31: engelli gelir vergisi indirimi (1.der 9900 / 2.der 5700 / 3.der 2400 TL — 2026)';
COMMENT ON COLUMN app.employees.medeni_hal IS 'Normalize ASCII medeni hal: evli|bekar|dul|bosanmis';
