'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { AlertCircle, Mail, Search, Shield } from 'lucide-react';

interface GlobalUser {
  id: string;
  name: string;
  email: string;
  tenant: string;
  role: string;
  last_login: string;
}

const DEMO_USERS: GlobalUser[] = [
  { id: '1', name: 'Ayşe Demir', email: 'ayse@samsun.bel.tr', tenant: 'Samsun Büyükşehir', role: 'hr_director', last_login: '2 saat önce' },
  { id: '2', name: 'Mehmet Yılmaz', email: 'mehmet@koc.com.tr', tenant: 'Koç Holding', role: 'chro', last_login: '1 gün önce' },
  { id: '3', name: 'Deniz Kara', email: 'deniz@acme.co', tenant: 'Acme A.Ş.', role: 'hr_admin', last_login: '3 saat önce' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const filtered = DEMO_USERS.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLocaleLowerCase('tr-TR');
    return (
      u.name.toLocaleLowerCase('tr-TR').includes(q) ||
      u.email.toLocaleLowerCase('tr-TR').includes(q) ||
      u.tenant.toLocaleLowerCase('tr-TR').includes(q)
    );
  });

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Kullanıcılar</h1>
          <p className="mt-1 text-sm text-ink-60">
            Global kullanıcı arama — tüm tenantlar üzerinde. Impersonate, şifre sıfırlama.
          </p>
        </div>

        <div className="relative sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim, e-posta veya tenant ara…"
            className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm placeholder:text-ink-40 focus:border-accent focus:outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Kullanıcı</th>
                <th className="px-4 py-3 text-left font-semibold">Tenant</th>
                <th className="px-4 py-3 text-left font-semibold">Rol</th>
                <th className="px-4 py-3 text-left font-semibold">Son Giriş</th>
                <th className="px-4 py-3 text-right font-semibold">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-bg-2">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-ink-40">
                      <Mail className="h-3 w-3" />
                      {u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-60">{u.tenant}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex h-5 items-center rounded bg-accent-soft px-1.5 text-[11px] font-medium text-accent">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-40">{u.last_login}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded border border-line bg-bg px-2 py-1 text-[11px] font-medium text-ink-60 hover:border-accent hover:text-accent"
                    >
                      <Shield className="h-3 w-3" />
                      Impersonate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber/30 bg-amber-soft p-3 text-[11px] text-amber">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Demo veri. Production&apos;da <code className="rounded bg-bg-2 px-1">
              /api/v1/admin/users?q=…
            </code> endpoint&apos;i kullanılacak. Impersonate audit log&apos;da kayıt edilir.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
