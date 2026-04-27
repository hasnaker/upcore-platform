'use client';

import { Link as LinkIcon, Linkedin, Twitter } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonsProps {
  title: string;
  url: string;
}

// SSR-safe: tüm URL'ler render zamanında property olarak geçer,
// klipboarda kopyalama yalnızca istemcide çalışır.
export function ShareButtons({ title, url }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard yoksa sessizce geç.
    }
  }

  return (
    <div className="my-8 flex flex-wrap items-center gap-3 border-y border-[#E5E7EB] py-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
        Paylaş
      </span>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#374151] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
        aria-label="Twitter'da paylaş"
      >
        <Twitter className="h-4 w-4" aria-hidden="true" /> Twitter
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#374151] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
        aria-label="LinkedIn'de paylaş"
      >
        <Linkedin className="h-4 w-4" aria-hidden="true" /> LinkedIn
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#374151] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
        aria-label="Bağlantıyı kopyala"
      >
        <LinkIcon className="h-4 w-4" aria-hidden="true" />
        {copied ? 'Kopyalandı' : 'Bağlantıyı Kopyala'}
      </button>
    </div>
  );
}
