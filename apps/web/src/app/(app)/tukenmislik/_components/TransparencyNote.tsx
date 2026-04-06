import { Info } from 'lucide-react';

export const TransparencyNote = () => {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF0FD]">
        <Info className="h-4 w-4 text-[#5E5CE6]" />
      </div>
      <div>
        <p className="text-xs font-medium text-[#525252]">
          Veri Seffafligi Notu
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#A3A3A3]">
          Provisional European norms kullanilmaktadir (Schaufeli 2023). Turkce
          normlar N&ge;2000 musteri verisinden olusturulacaktir. Mevcut
          skorlar karsilastirma amacli kullanilmali, bireysel performans
          degerlendirmesi icin kullanilmamalidir.
        </p>
      </div>
    </div>
  );
};
