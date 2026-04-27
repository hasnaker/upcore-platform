'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Palette, Upload, Globe2, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';

type Branding = {
  logo_url?: string;
  logo_dark_url?: string;
  primary_color?: string;
  accent_color?: string;
  favicon_url?: string;
  email_footer?: string;
  custom_domain?: string;
  support_email?: string;
  support_phone?: string;
};

export default function BrandingPage() {
  const [b, setB] = useState<Branding>({
    primary_color: '#0A0A0A',
    accent_color: '#5E5CE6',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/tenant/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success('Branding kaydedildi');
    } catch (err) {
      toast.error(`Kaydedilemedi: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ayarlar" className="text-[12px] text-ink-40 hover:underline">← Ayarlar</Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
          <Palette className="h-5 w-5" />
          Kurumsal Kimlik
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Logonuz, şirket renkleriniz ve destek bilgileriniz UpCore panelinde, email'lerde ve
          PDF çıktılarda kullanılır. White-label paketine dahildir.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <Upload className="h-3.5 w-3.5" />
          Logo
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Logo URL (light)" value={b.logo_url ?? ''} onChange={(v) => setB({ ...b, logo_url: v })} placeholder="https://cdn.../logo.png" />
          <Field label="Logo URL (dark)" value={b.logo_dark_url ?? ''} onChange={(v) => setB({ ...b, logo_dark_url: v })} placeholder="https://cdn.../logo-dark.png" />
          <Field label="Favicon URL" value={b.favicon_url ?? ''} onChange={(v) => setB({ ...b, favicon_url: v })} placeholder="https://cdn.../favicon.ico" />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <Palette className="h-3.5 w-3.5" />
          Renk Teması
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <ColorPicker label="Ana Renk" value={b.primary_color ?? '#0A0A0A'} onChange={(v) => setB({ ...b, primary_color: v })} />
          <ColorPicker label="Vurgu Rengi" value={b.accent_color ?? '#5E5CE6'} onChange={(v) => setB({ ...b, accent_color: v })} />
        </div>
        <div
          className="mt-4 rounded-lg p-4 text-white"
          style={{ background: b.primary_color }}
        >
          <p className="text-sm">Önizleme — Ana Renk</p>
          <button
            type="button"
            className="mt-2 rounded-md px-3 py-1.5 text-[12px] font-medium text-white"
            style={{ background: b.accent_color }}
          >
            Vurgu Butonu
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <Globe2 className="h-3.5 w-3.5" />
          Özel Domain
        </h2>
        <Field
          label="Custom Domain"
          value={b.custom_domain ?? ''}
          onChange={(v) => setB({ ...b, custom_domain: v })}
          placeholder="ik.acme.com"
        />
        <p className="mt-2 text-[11px] text-ink-40">
          DNS CNAME kaydı gerekli: <code>ik.acme.com → custom.upcore.app</code>. SSL otomatik provizyonlanır (Let's Encrypt).
        </p>
      </section>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          <Mail className="h-3.5 w-3.5" />
          Destek İletişim
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field
            icon={<Mail className="h-3 w-3" />}
            label="Destek Email"
            value={b.support_email ?? ''}
            onChange={(v) => setB({ ...b, support_email: v })}
            placeholder="ik@acme.com"
          />
          <Field
            icon={<Phone className="h-3 w-3" />}
            label="Destek Telefon"
            value={b.support_phone ?? ''}
            onChange={(v) => setB({ ...b, support_phone: v })}
            placeholder="+90 212 xxx xx xx"
          />
        </div>
        <div className="mt-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
              Email Footer (HTML)
            </span>
            <textarea
              value={b.email_footer ?? ''}
              onChange={(e) => setB({ ...b, email_footer: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-line bg-bg px-2 py-1.5 font-mono text-[11px]"
              placeholder="<p>Acme A.Ş. · VKN 1234567890 · <a href='https://acme.com'>acme.com</a></p>"
            />
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor…' : 'Ayarları Kaydet'}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-ink-40">
        {icon}
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm"
      />
    </label>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-40">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-line bg-bg px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-10 cursor-pointer rounded border-0"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent font-mono text-sm focus:outline-none"
        />
      </div>
    </label>
  );
}
