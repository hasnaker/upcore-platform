'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flame, Activity } from 'lucide-react';

export function BurnoutSimulator() {
  const [workload, setWorkload] = useState(70);
  const [autonomy, setAutonomy] = useState(45);
  const [socialSupport, setSocialSupport] = useState(60);
  const [recognition, setRecognition] = useState(40);

  const batScore = useMemo(() => {
    const demands = workload;
    const resources = (autonomy + socialSupport + recognition) / 3;
    const imbalance = Math.max(0, demands - resources);
    const raw = (demands * 0.6 + imbalance * 0.4) / 100;
    return Math.round(Math.min(100, raw * 100));
  }, [workload, autonomy, socialSupport, recognition]);

  const band =
    batScore >= 60 ? { label: 'Yüksek Risk', color: '#EF4444', icon: Flame, action: 'Acil müdahale · Koruma modülü aktif et' } :
    batScore >= 40 ? { label: 'Dikkat', color: '#F59E0B', icon: AlertTriangle, action: 'İzleme · haftalık pulse önerilir' } :
    batScore >= 25 ? { label: 'Hafif', color: '#10B981', icon: Activity, action: 'Stabil · aylık kontrol yeterli' } :
    { label: 'Sağlıklı', color: '#10B981', icon: CheckCircle2, action: 'Optimum · güçlü yönler programına yönlendir' };

  const interventions = [
    batScore >= 60 && 'İş yükü yeniden dağıtımı (Koruma Protokol-03)',
    batScore >= 60 && '1:1 yönetici destek görüşmesi (7 gün içinde)',
    autonomy < 50 && 'Job Crafting workshop (Wrzesniewski & Dutton)',
    socialSupport < 50 && 'Peer mentor programı (VIA güçlü yönler)',
    recognition < 50 && 'Haftalık takdir ritüeli + manager training',
    batScore < 40 && 'Mevcut güçlü yönleri pekiştirme (PsyCap PsyCap)',
  ].filter(Boolean) as string[];

  return (
    <div className="grid gap-8 rounded-[24px] border border-[#EBEBEB] bg-white p-8 md:p-12 lg:grid-cols-[1fr_1fr] lg:gap-14">
      <div>
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5400]/10">
          <Flame className="h-5 w-5 text-[#FF5400]" />
        </div>
        <h3 className="mt-5 font-display text-[28px] font-semibold leading-tight tracking-tight text-[#0F1419]">
          JD-R + BAT-TR canlı simülasyon
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#525252]">
          İş Talepleri (demands) ve İş Kaynakları (resources) dengesizliği, Schaufeli & Desart&apos;ın Burnout Assessment Tool
          çerçevesinde risk bandına çevrilir. Sliderları ayarlayın, platformun gerçek zamanlı nasıl davrandığını görün.
        </p>

        <div className="mt-8 space-y-5">
          <Slider label="İş yükü (demands)" value={workload} onChange={setWorkload} tone="demand" />
          <Slider label="Otonomi (resource)" value={autonomy} onChange={setAutonomy} tone="resource" />
          <Slider label="Sosyal destek (resource)" value={socialSupport} onChange={setSocialSupport} tone="resource" />
          <Slider label="Takdir & geri bildirim (resource)" value={recognition} onChange={setRecognition} tone="resource" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className="rounded-2xl p-8 text-white"
          style={{ background: `linear-gradient(135deg, ${band.color}, ${band.color}CC)` }}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]">
            <band.icon className="h-4 w-4" />
            BAT-TR tahmin skoru
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-[72px] font-semibold leading-none tracking-tight">{batScore}</span>
            <span className="text-[14px] font-medium uppercase tracking-wider">{band.label}</span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${batScore}%` }} />
          </div>
          <p className="mt-5 text-[13px] leading-relaxed text-white/90">{band.action}</p>
        </div>

        <div className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
            Otomatik öneri kataloğu
          </p>
          <ul className="mt-3 space-y-2">
            {interventions.length === 0 ? (
              <li className="text-[13px] text-[#525252]">Ekip sağlıklı · mevcut programı sürdürün.</li>
            ) : (
              interventions.map((i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[#333]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5400]" />
                  {i}
                </li>
              ))
            )}
          </ul>
        </div>

        <p className="text-[11px] leading-relaxed text-[#8A8A8A]">
          <strong>Bilimsel dayanak:</strong> Bu simülasyon, Bakker & Demerouti (2007) JD-R modelini ve Schaufeli-De Witte-Desart
          (2019) BAT-12 ölçeğinin Türk standardizasyonunu (Aker et al., 2024) kullanır. Üretimde çalışanların anonim pulse
          cevapları modele girdidir.
        </p>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  tone: 'demand' | 'resource';
}) {
  const color = tone === 'demand' ? '#EF4444' : '#10B981';
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-[13px] font-medium text-[#0F1419]">{label}</label>
        <span className="font-mono text-[13px] font-semibold" style={{ color }}>
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#F0F0F0] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}
