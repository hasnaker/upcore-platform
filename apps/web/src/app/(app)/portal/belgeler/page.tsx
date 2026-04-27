'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function MyDocumentsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/portal" className="text-[12px] text-ink-40 hover:underline">← Portal</Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink">
          <FileText className="h-5 w-5" />
          Belgelerim
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          İş sözleşmesi, banka mektubu, kimlik kopyası, sağlık raporu. Blob storage üzerinden
          şifrelenmiş indirme sağlanır (URL 10 dakika geçerli).
        </p>
      </div>

      <section className="rounded-xl border border-line bg-bg p-6 text-sm text-ink-60">
        <p>
          Entegrasyon: <code>document</code> servisi, <code>/api/v1/documents?employee_id=me</code>.
          Yüklenen her dosya MIME whitelist (pdf/jpg/png/docx) üzerinden geçer ve virüs taraması
          sonrasında erişime açılır.
        </p>
        <Link
          href="/belgeler"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#333]"
        >
          Belge modülüne git →
        </Link>
      </section>
    </div>
  );
}
