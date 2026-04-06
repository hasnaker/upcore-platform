'use client';

interface DepartmentJDR {
  department: string;
  demands: number;
  resources: number;
  gap: number;
}

const mockJDR: DepartmentJDR[] = [
  { department: 'Muhendislik', demands: 72, resources: 58, gap: 14 },
  { department: 'Satis', demands: 80, resources: 45, gap: 35 },
  { department: 'Pazarlama', demands: 55, resources: 62, gap: -7 },
  { department: 'Urun', demands: 65, resources: 60, gap: 5 },
  { department: 'Insan Kaynaklari', demands: 48, resources: 70, gap: -22 },
  { department: 'Finans', demands: 68, resources: 52, gap: 16 },
];

const PulseBar = ({ label, score, tone }: { label: string; score: number; tone: string }) => {
  let color = '#5E5CE6';
  if (tone === 'low') color = '#DC2626';
  else if (tone === 'medium') color = '#D97706';
  else if (tone === 'high') color = '#059669';
  else if (tone === 'accent') color = '#5E5CE6';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#888]">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-[#111]">{score}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#f0f0f0]">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};

export const JDRBalance = () => {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white">
      <div className="border-b border-[#f0f0f0] px-5 py-4">
        <h3 className="text-[15px] font-semibold text-[#111]">JD-R Denge Gorunumu</h3>
      </div>
      <div className="flex flex-col gap-4 p-5">
        {/* Info banner */}
        <div className="rounded-lg border border-[#5E5CE6]/20 bg-[#5E5CE6]/5 px-4 py-3">
          <p className="text-[12px] font-semibold text-[#5E5CE6]">JD-R Modeli</p>
          <p className="mt-0.5 text-[12px] text-[#555]">
            Pozitif gap (talep &gt; kaynak) tukenmislik riskini arttirir. Negatif gap saglikli dengeyi gosterir.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {mockJDR.map((dept) => (
            <div key={dept.department} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#111]">{dept.department}</span>
                <span
                  className={`text-[12px] font-semibold tabular-nums ${
                    dept.gap > 10 ? 'text-[#DC2626]' : dept.gap > 0 ? 'text-[#D97706]' : 'text-[#059669]'
                  }`}
                >
                  {dept.gap > 0 ? '+' : ''}{dept.gap} gap
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <PulseBar
                  label="Is Talepleri"
                  score={dept.demands}
                  tone={dept.demands > 70 ? 'low' : dept.demands > 50 ? 'medium' : 'high'}
                />
                <PulseBar
                  label="Is Kaynaklari"
                  score={dept.resources}
                  tone="accent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
