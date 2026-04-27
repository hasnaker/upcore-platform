# @upcore/design-system

> **Nordic Minimal** — UpCore ürününün tek tasarım sistemi kaynağı.
> Renkler, tipografi, radius, gölge, motion tek yerde; tüm primitive ve
> composite component'ler Radix + CVA üstünde.

---

## 🎨 Tasarım dili

**İlke:** cognitive load minimal, action-first, bilgi önce. SAP/Workday'in tersine.

| Özellik | Değer | Not |
|---|---|---|
| **Accent** | `#5E5CE6` (violet) | Sadece interactive + focus — ASLA büyük alan rengi olarak kullanma |
| **Ink** | `#0A0A0A` → `#D4D4D4` (5 stop) | text-ink-60 secondary, text-ink-40 tertiary |
| **Line** | `#EDEDED` | Tüm border'ların varsayılanı — `border` sınıfı yeterli |
| **Radius** | `6px` (sm) / `8px` (md) / `10px` (lg) | Button/Input sm, Card md, Modal lg |
| **Font** | Inter + features `ss01, cv11, tnum` | Rakamsal tablolar için tabular-nums |
| **Whitespace** | 48-64px section gap | Yoğun ekran değil, nefes alan |
| **Gölge** | Minimal — sadece modal/popover'da | Kartlarda gölge kullanma, border yeterli |

---

## 📦 Kullanım

### 1. Tailwind v4 Token'ları (CSS @theme)

`apps/web` ve `apps/admin` `globals.css` üstünden paketi import eder:

```css
@import '@upcore/design-system/styles.css';
```

Sonra aşağıdaki sınıflar Tailwind utility olarak çalışır:

```tsx
<div className="bg-bg text-ink border border-line rounded-md p-4">
  <h2 className="text-ink font-semibold">Başlık</h2>
  <p className="text-ink-60 mt-1">Açıklama</p>
  <button className="bg-accent text-white hover:bg-accent/90">CTA</button>
</div>
```

### 2. Primitive Component'ler

Inline HTML + Tailwind yerine daima bu component'leri kullan:

```tsx
import { Button, Card, Input, Label, Select, Dialog, Tabs } from '@upcore/design-system';

<Card>
  <Card.Header>
    <Card.Title>Çalışan Ekle</Card.Title>
  </Card.Header>
  <Card.Content>
    <Label htmlFor="email">E-posta</Label>
    <Input id="email" type="email" placeholder="ad@sirket.com" />
  </Card.Content>
</Card>
```

Mevcut primitive'ler: `Avatar`, `Badge`, `Button`, `Card`, `Checkbox`, `Dialog`,
`Dropdown`, `Input`, `Label`, `Popover`, `Radio`, `Select`, `Separator`,
`Switch`, `Tabs`, `Textarea`, `Toast`, `Tooltip`.

### 3. Layout Shell'leri

Sayfa/panel düzenleri için:

```tsx
import { AppShell, Sidebar, Topbar, PageHeader, Breadcrumb, Stack } from '@upcore/design-system';
```

### 4. Composite'ler (Domain-specific)

UpCore'a özel, psikometri ve İK alanında:

- `EmployeeAvatar` — initials + renk + rol badge
- `BurnoutBadge` — BAT-TR skoru renk kodu (green/amber/red)
- `StatusPill` — Aktif/İzinde/Ayrılmış + semantic renk
- `MetricCard` — dashboard metrik kartı (value + delta + sparkline)
- `PulseBar` — pulse survey response rate bar
- `DataTable` — TanStack Table wrapper + Nordic styling
- `InfoBanner` — info/warning/error banner
- `LoadingSpinner` — accent violet ring

---

## 🚨 Migration Kuralları (inline hex → tokens)

Web app'te **3.400+ inline hex** değer var (`text-[#0A0A0A]` vb.). Bunları
toplu refactor yerine **her sayfada faz sırasına göre** aşağıdaki map ile
değiştir:

### Renk mapping'i

| İnline hex | Token | Tailwind sınıfı |
|---|---|---|
| `#0A0A0A` / `#111` / `#0a0a0a` | `ink` | `text-ink` |
| `#262626` | `ink-80` | `text-ink-80` |
| `#525252` / `#555` | `ink-60` | `text-ink-60` |
| `#888` / `#A3A3A3` | `ink-40` | `text-ink-40` |
| `#D4D4D4` / `#aaa` | `ink-20` | `text-ink-20` |
| `#EDEDED` / `#f0f0f0` | `line` | `border-line` |
| `#FAFAFA` | `bg-2` | `bg-bg-2` |
| `#F5F5F5` | `bg-3` | `bg-bg-3` |
| `#5E5CE6` / `#4B4AC5` | `accent` / `accent`/90 | `bg-accent` / `hover:bg-accent/90` |
| `#EEF0FD` | `accent-soft` | `bg-accent-soft` |
| `#DC2626` / `#B91C1C` | `red` | `text-red` / `bg-red` |
| `#FEE2E2` / `#FEF2F2` | `red-soft` | `bg-red-soft` |
| `#D97706` / `#EA580C` | `amber` | `text-amber` / `bg-amber` |
| `#FEF3C7` / `#FED7AA` / `#FFFBEB` | `amber-soft` | `bg-amber-soft` |
| `#059669` | `green` | `text-green` / `bg-green` |
| `#D1FAE5` / `#DCFCE7` / `#F0FDF4` | `green-soft` | `bg-green-soft` |
| `#0D9488` / `#0EA5E9` | `teal` | `text-teal` |
| `#CCFBF1` / `#E0F2FE` | `teal-soft` | `bg-teal-soft` |

### Border radius

| İnline | Token |
|---|---|
| `rounded-[6px]` veya `rounded` | `rounded-sm` |
| `rounded-[8px]` veya `rounded-lg` eski | `rounded-md` |
| `rounded-[10px]` | `rounded-lg` |
| `rounded-[12px]` | `rounded-xl` |

### Component substitution

| İnline pattern | Değiştir |
|---|---|
| `<button className="rounded-md bg-accent ...">` | `<Button>` |
| `<input className="rounded-md border ...">` | `<Input>` |
| `<div className="rounded-lg border border-line ...">` (kart) | `<Card>` |
| `<span className="inline-flex rounded-full bg-... px-2 ...">` (badge) | `<Badge variant=...>` |
| Mock table layout | `<DataTable>` |

---

## 🧪 Test

```bash
pnpm --filter @upcore/design-system test
pnpm --filter @upcore/design-system test:watch
```

Her primitive için unit test mevcut (`Button.test.tsx` vb.).

---

## 🏗 Build

```bash
pnpm --filter @upcore/design-system build    # tsup → dist
pnpm --filter @upcore/design-system dev      # watch mode
pnpm --filter @upcore/design-system typecheck
```

---

## 🚀 Yeni component eklerken

1. `src/components/{primitives|composites|layout}/YourComponent.tsx` oluştur
2. Test dosyası (`YourComponent.test.tsx`) ekle — Button/Badge test'leri referans
3. `index.ts` barrel'a export ekle
4. `src/components/primitives/index.ts` (veya ilgili) içinde named export
5. Bu README'ye kısa örnek ekle
6. `pnpm build` ile dist güncellenir

**Kural:** default export yasak, named export kullan. Props için
`ComponentNameProps` interface.
