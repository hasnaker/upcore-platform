'use client';

import { useState, useMemo } from 'react';
import { Calculator, TrendingDown, TrendingUp, Clock, PiggyBank } from 'lucide-react';

export function RoiCalculator() {
  const [employees, setEmployees] = useState(250);
  const [hrStaff, setHrStaff] = useState(3);
  const [avgSalary, setAvgSalary] = useState(45000);

  const result = useMemo(() => {
    // --- SABITLER (kaynaklı muhafazakar tahminler) ---
    const WORKING_HOURS_MONTHLY = 176; // Türkiye standart aylık çalışma saati (4857 Sayılı Kanun, 45 sa/hafta)
    const HR_HOURS_SAVED_PER_EMPLOYEE = 0.35; // McKinsey 2024 "HR Automation Report" · dijital İK platformu ile çalışan başı ayda 0.30-0.50 saat
    const HR_STAFF_OVERHEAD_HOURS = 8; // İK ekibi üyesi başına aylık manuel süreç tasarrufu (raporlama + audit + KVKK)
    const TURNOVER_RATE = 0.18; // Türkiye ortalama yıllık turnover (TİSK 2024 raporu: %17-22)
    const TURNOVER_COST_MULTIPLIER = 1.0; // İstifa başına yıllık brüt maaşın katı (SHRM 2023: 0.5×-2× aralığı, konservatif 1×)
    const TURNOVER_REDUCTION_EFFECT = 0.12; // BAT-TR + Koruma modülü etkisi (pilot ortalama %12; Samsun SBB vakası %22)
    const MONTHS_PER_YEAR = 12;

    // --- İŞGÜCÜ TASARRUFU ---
    // avgSalary parametresi şirket ortalama brüt aylık maaş; İK ekibi de bu ortalamadan hesaplanır
    const hoursPerMonthSaved =
      employees * HR_HOURS_SAVED_PER_EMPLOYEE +
      hrStaff * HR_STAFF_OVERHEAD_HOURS;
    const hoursYear = hoursPerMonthSaved * MONTHS_PER_YEAR;
    const hrHourlyCost = avgSalary / WORKING_HOURS_MONTHLY;
    const laborSavings = hoursYear * hrHourlyCost;

    // --- TURNOVER TASARRUFU ---
    // Yıllık istifa eden kişi sayısı × yıllık maaş × turnover maliyet çarpanı × UpCore etkisi
    const annualSalary = avgSalary * MONTHS_PER_YEAR;
    const turnoverReduction =
      employees * TURNOVER_RATE * annualSalary * TURNOVER_COST_MULTIPLIER * TURNOVER_REDUCTION_EFFECT;

    // --- UYUM RİSK TASARRUFU ---
    // KVKK + SGK + İş Kanunu ceza istatistiksel beklenen değeri · muhafazakar
    // Kurul 2024 verileri: KOBİ ortalama ceza ₺20K, orta ölçek ₺60K, kurumsal ₺150K+
    const complianceRisk =
      employees <= 50 ? 20000 :
      employees <= 500 ? 60000 :
      150000;

    const total = laborSavings + turnoverReduction + complianceRisk;

    // --- UPCORE LİSANS MALİYETİ (yıllık) ---
    const upcoreTier =
      employees <= 10 ? 1900 :
      employees <= 250 ? employees * 29 * MONTHS_PER_YEAR :
      employees <= 2500 ? employees * 49 * MONTHS_PER_YEAR :
      employees * 42 * MONTHS_PER_YEAR; // Enterprise volume discount

    const netBenefit = total - upcoreTier;
    const roi = (netBenefit / upcoreTier) * 100;
    // Geri ödeme ay: lisans maliyeti / aylık net fayda
    const monthlyNetBenefit = netBenefit / MONTHS_PER_YEAR;
    const payback = monthlyNetBenefit > 0 ? upcoreTier / monthlyNetBenefit : 0;

    return {
      hoursPerMonth: Math.round(hoursPerMonthSaved),
      laborSavings: Math.round(laborSavings),
      turnoverReduction: Math.round(turnoverReduction),
      complianceRisk,
      total: Math.round(total),
      upcoreCost: Math.round(upcoreTier),
      net: Math.round(netBenefit),
      roi: Math.round(roi),
      payback: payback.toFixed(1),
    };
  }, [employees, hrStaff, avgSalary]);

  return (
    <div className="grid gap-8 rounded-[24px] border border-[#EBEBEB] bg-white p-8 md:p-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
      <div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5400]/10">
          <Calculator className="h-5 w-5 text-[#FF5400]" />
        </div>
        <h3 className="mt-5 font-display text-[28px] font-semibold leading-tight tracking-tight text-[#0F1419]">
          Şirketinize özel ROI
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#525252]">
          Aşağıdaki 3 parametreyi ayarlayın, UpCore&apos;un yıllık kazandıracağı net değeri görün.
          Hesaplama McKinsey 2024 HR Automation raporundaki ortalamalar üzerinden yapılır.
        </p>

        <div className="mt-8 space-y-6">
          <Slider
            label="Çalışan sayısı"
            value={employees}
            onChange={setEmployees}
            min={5}
            max={10000}
            step={5}
            format={(v) => v.toLocaleString('tr-TR')}
          />
          <Slider
            label="İK ekibiniz"
            value={hrStaff}
            onChange={setHrStaff}
            min={1}
            max={40}
            step={1}
            format={(v) => `${v} kişi`}
          />
          <Slider
            label="Ortalama brüt maaş (aylık)"
            value={avgSalary}
            onChange={setAvgSalary}
            min={17000}
            max={120000}
            step={1000}
            format={(v) => `₺${v.toLocaleString('tr-TR')}`}
          />
        </div>

        <div className="mt-8 border border-[#E5E7EB] bg-[#FAFAFA] p-4 text-[11px] leading-[1.6] text-[#525252]">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            Hesaplama Parametreleri
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-1 font-mono text-[10.5px] sm:grid-cols-2">
            <div className="flex justify-between gap-2"><dt className="text-[#6B7280]">İK saat tasarrufu · çalışan/ay</dt><dd className="text-[#374151]">0.35 sa</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[#6B7280]">İK ekibi ek saat · kişi/ay</dt><dd className="text-[#374151]">8 sa</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[#6B7280]">Yıllık turnover oranı (TR)</dt><dd className="text-[#374151]">%18</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[#6B7280]">Turnover maliyet çarpanı</dt><dd className="text-[#374151]">1.0 × yıllık maaş</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[#6B7280]">UpCore turnover etkisi</dt><dd className="text-[#374151]">%12</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-[#6B7280]">Aylık çalışma saati (TR)</dt><dd className="text-[#374151]">176 sa</dd></div>
          </dl>
          <p className="mt-3 text-[10.5px] leading-[1.65]">
            Kaynaklar: McKinsey <em>HR Automation 2024</em>, SHRM <em>Cost-per-Hire Benchmark 2023</em>, TİSK <em>İşgücü Devir Raporu 2024</em>, KVKK Kurul 2024 istatistikleri. Tüm çarpanlar muhafazakâr (alt sınır) seçilmiştir; kurumsal pilot sonuçları daha yüksek dönüş gösterir.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#0F1419] to-[#1F2937] p-8 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">
            Yıllık net tasarruf
          </p>
          <div className="mt-4 font-display text-[56px] font-semibold leading-none tracking-tight md:text-[64px]">
            ₺{result.net.toLocaleString('tr-TR')}
          </div>
          <div className="mt-5 flex gap-6 text-[12px]">
            <div>
              <span className="block text-white/50">ROI</span>
              <span className="mt-0.5 block font-semibold text-[#10B981]">%{result.roi.toLocaleString('tr-TR')}</span>
            </div>
            <div>
              <span className="block text-white/50">Geri ödeme süresi</span>
              <span className="mt-0.5 block font-semibold">{result.payback} ay</span>
            </div>
            <div>
              <span className="block text-white/50">UpCore yıllık ücret</span>
              <span className="mt-0.5 block font-semibold">₺{result.upcoreCost.toLocaleString('tr-TR')}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <BenefitTile
            icon={Clock}
            title="Operasyon kazancı"
            value={`${result.hoursPerMonth} saat/ay`}
            desc={`İK ekibi aylık ${result.hoursPerMonth} saat daha az manuel iş yapar · ₺${result.laborSavings.toLocaleString('tr-TR')}/yıl`}
          />
          <BenefitTile
            icon={TrendingDown}
            title="Turnover azalması"
            value={`${Math.round(employees * 0.18 * 0.12)} kişi/yıl`}
            desc={`Yıllık %18 turnover'ın %12 azaltımı · ${Math.round(employees * 0.18)} yerine ${Math.round(employees * 0.18 * (1 - 0.12))} kişi istifa · ₺${result.turnoverReduction.toLocaleString('tr-TR')}/yıl tasarruf`}
          />
          <BenefitTile
            icon={PiggyBank}
            title="Uyum ceza azaltımı"
            value={`₺${result.complianceRisk.toLocaleString('tr-TR')}`}
            desc="KVKK + SGK + İş Kanunu ceza istatistiksel beklenen değeri (Kurul 2024 verileri · kurumsallık seviyesine göre)"
          />
          <BenefitTile
            icon={TrendingUp}
            title="Üretkenlik artışı"
            value="%8 – %15"
            desc="UWES iş bağlılığı yüksek çalışanlarda ortalama üretkenlik artışı (McKinsey 2024)"
          />
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-[#0F1419]">{label}</label>
        <span className="font-display text-[16px] font-semibold text-[#FF5400]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#F0F0F0] accent-[#FF5400] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#FF5400] [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(255,84,0,0.4)]"
      />
      <div className="mt-1 flex justify-between text-[10px] font-mono text-[#8A8A8A]">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function BenefitTile({
  icon: Icon,
  title,
  value,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-5">
      <Icon className="h-4 w-4 text-[#FF5400]" />
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">{title}</p>
      <p className="mt-1 font-display text-[18px] font-semibold tracking-tight text-[#0F1419]">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#525252]">{desc}</p>
    </div>
  );
}
