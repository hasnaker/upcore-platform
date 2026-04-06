'use client';

import { useState, useMemo } from 'react';
import {
  User,
  Building2,
  Bell,
  CreditCard,
  Puzzle,
  Check,
  Save,
  Moon,
  Sun,
  Globe,
  Shield,
  Mail,
  Key,
  Copy,
  RefreshCw,
  Users,
  UserPlus,
  X,
  ChevronDown,
  FileText,
} from 'lucide-react';

type TabKey = 'profile' | 'company' | 'modules' | 'notifications' | 'billing' | 'team' | 'developer' | 'audit';

interface Toggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface ModuleToggle extends Toggle {
  price: number;
  usage: { current: number; limit: string; label: string };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  lastActive: string;
}

interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  timeAgo: string;
  type: 'info' | 'success' | 'warning';
}

export default function AyarlarPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const [toast, setToast] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('IK Uzmani');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  // Profile form
  const [profileName, setProfileName] = useState('Hasan Aker');
  const [profileEmail, setProfileEmail] = useState('hasan@upcore.io');
  const [profileRole, setProfileRole] = useState('Yonetici');
  const [profilePhone, setProfilePhone] = useState('+90 555 123 4567');

  // Company form
  const [companyName, setCompanyName] = useState('Upcore Demo');
  const [companyDomain, setCompanyDomain] = useState('upcore.io');
  const [companySize, setCompanySize] = useState('50-100');
  const [companySector, setCompanySector] = useState('Teknoloji');

  // Modules with pricing
  const [modules, setModules] = useState<ModuleToggle[]>([
    { id: 'burnout', label: 'Tukenmislik Izleme', description: 'BAT-12-TR anketleri ve departman analizi', enabled: true, price: 1500, usage: { current: 847, limit: 'sinirsiz', label: 'pulse response bu ay' } },
    { id: 'assessment', label: 'Degerlendirme', description: 'Aday assessment ve yetkinlik olcumleri', enabled: true, price: 2000, usage: { current: 34, limit: 'sinirsiz', label: 'assessment bu ay' } },
    { id: 'leave', label: 'Izin Yonetimi', description: 'Izin bakiyeleri, talepler ve takvim', enabled: true, price: 500, usage: { current: 48, limit: 'sinirsiz', label: 'izin talebi bu ay' } },
    { id: 'docs', label: 'Belge Yonetimi', description: 'Calisan belgeleri ve guvenli arsiv', enabled: true, price: 500, usage: { current: 156, limit: '1000', label: 'belge' } },
    { id: 'rotation', label: 'Rotasyon', description: 'Ic mobilite ve kariyer planlama', enabled: false, price: 1000, usage: { current: 0, limit: 'sinirsiz', label: 'rotasyon plani' } },
    { id: 'okr', label: 'OKR Takibi', description: 'Hedef ve anahtar sonuc yonetimi', enabled: false, price: 1000, usage: { current: 0, limit: 'sinirsiz', label: 'OKR' } },
  ]);

  // Team members
  const [team] = useState<TeamMember[]>([
    { id: '1', name: 'Hasan Aker', email: 'hasan@upcore.io', role: 'Admin', avatar: 'HA', lastActive: 'Simdi' },
    { id: '2', name: 'Ayse Kara', email: 'ayse@upcore.io', role: 'IK Direktoru', avatar: 'AK', lastActive: '2 saat once' },
    { id: '3', name: 'Mehmet B.', email: 'mehmet@upcore.io', role: 'IK Uzmani', avatar: 'MB', lastActive: '1 gun once' },
    { id: '4', name: 'Selin Ozturk', email: 'selin@upcore.io', role: 'IK Uzmani', avatar: 'SO', lastActive: '3 saat once' },
    { id: '5', name: 'Emre Sahin', email: 'emre@upcore.io', role: 'Gelistirici', avatar: 'ES', lastActive: '30 dk once' },
  ]);

  // Audit log
  const [auditEvents] = useState<AuditEvent[]>([
    { id: '1', actor: 'Hasan Aker', action: 'calisan ekledi', target: 'Selin Koc', timeAgo: '5 dk once', type: 'info' },
    { id: '2', actor: 'Ayse Kara', action: 'izin onayladi', target: 'Mehmet K.', timeAgo: '2 saat once', type: 'success' },
    { id: '3', actor: 'Mehmet B.', action: 'belge yukledi', target: 'Is Sozlesmesi.pdf', timeAgo: '3 saat once', type: 'info' },
    { id: '4', actor: 'Hasan Aker', action: 'modul aktif etti', target: 'Rotasyon', timeAgo: '1 gun once', type: 'info' },
    { id: '5', actor: 'Selin Ozturk', action: 'izin talebi olusturdu', target: '3 gunluk yillik izin', timeAgo: '1 gun once', type: 'info' },
    { id: '6', actor: 'Ayse Kara', action: 'calisan bilgilerini guncelledi', target: 'Elif Demir', timeAgo: '2 gun once', type: 'info' },
    { id: '7', actor: 'Hasan Aker', action: 'assessment davetiyesi gonderdi', target: 'aday@ornek.com', timeAgo: '2 gun once', type: 'info' },
    { id: '8', actor: 'Sistem', action: 'haftalik rapor gonderdi', target: 'tum adminler', timeAgo: '3 gun once', type: 'info' },
    { id: '9', actor: 'Mehmet B.', action: 'izin reddetti', target: 'Can D. (cakisma)', timeAgo: '4 gun once', type: 'warning' },
    { id: '10', actor: 'Hasan Aker', action: 'API anahtari yeniledi', target: '', timeAgo: '5 gun once', type: 'warning' },
  ]);

  // Notifications
  const [notifications, setNotifications] = useState<Toggle[]>([
    { id: 'email-actions', label: 'Aksiyon Bildirimleri', description: 'Oncelikli aksiyonlar e-posta ile bildirilsin', enabled: true },
    { id: 'email-burnout', label: 'Tukenmislik Alarmlari', description: 'Kritik risk grubu degisikliklerinde bildirim', enabled: true },
    { id: 'email-leave', label: 'Izin Talepleri', description: 'Yeni izin talepleri bildirilsin', enabled: true },
    { id: 'email-weekly', label: 'Haftalik Ozet', description: 'Her pazartesi haftalik ozet raporu', enabled: false },
    { id: 'push-all', label: 'Push Bildirimleri', description: 'Tarayici push bildirimleri', enabled: false },
  ]);

  // Billing
  const [plan] = useState<'free' | 'pro' | 'enterprise'>('pro');

  // Developer settings
  const [apiKey] = useState('upc_sk_live_8f2a4b6c...d1e3f7a91234');
  const [webhookUrl, setWebhookUrl] = useState('https://api.example.com/webhooks/upcore');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  /* ─── Module pricing calculator ─── */
  const currentMonthlyCost = useMemo(() => {
    return modules.filter((m) => m.enabled).reduce((sum, m) => sum + m.price, 0);
  }, [modules]);

  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);

  const pendingCostDiff = useMemo(() => {
    if (!pendingModuleId) return null;
    const mod = modules.find((m) => m.id === pendingModuleId);
    if (!mod) return null;
    const diff = mod.enabled ? -mod.price : mod.price;
    return { moduleName: mod.label, diff, newTotal: currentMonthlyCost + diff };
  }, [pendingModuleId, modules, currentMonthlyCost]);

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
    const mod = modules.find((m) => m.id === id);
    showToast(`${mod?.label} ${mod?.enabled ? 'devre disi birakildi' : 'aktif edildi'}`);
    setPendingModuleId(null);
  };

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey).catch(() => {/* noop */});
    setApiKeyCopied(true);
    showToast('API anahtari kopyalandi');
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    showToast(`Davetiye gonderildi: ${inviteEmail}`);
    setInviteOpen(false);
    setInviteEmail('');
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profil', icon: <User className="h-4 w-4" /> },
    { key: 'company', label: 'Sirket', icon: <Building2 className="h-4 w-4" /> },
    { key: 'modules', label: 'Moduller', icon: <Puzzle className="h-4 w-4" /> },
    { key: 'team', label: 'Ekip', icon: <Users className="h-4 w-4" /> },
    { key: 'notifications', label: 'Bildirimler', icon: <Bell className="h-4 w-4" /> },
    { key: 'billing', label: 'Abonelik', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'developer', label: 'Gelistirici', icon: <Key className="h-4 w-4" /> },
    { key: 'audit', label: 'Islem Kaydi', icon: <FileText className="h-4 w-4" /> },
  ];

  const roleColors: Record<string, string> = {
    'Admin': '#5E5CE6',
    'IK Direktoru': '#059669',
    'IK Uzmani': '#D97706',
    'Gelistirici': '#2563EB',
  };

  const auditTypeColors: Record<string, string> = {
    info: '#5E5CE6',
    success: '#059669',
    warning: '#D97706',
  };

  return (
    <div className="flex flex-col gap-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg bg-[#059669] px-4 py-3 text-sm font-medium text-white shadow-lg">
          <Check className="h-4 w-4" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Ayarlar</h1>
        <p className="mt-1 text-sm text-[#525252]">
          Profil, sirket bilgileri, modul yonetimi ve bildirim tercihlerinizi yapilandirin.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-[#EDEDED]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-[#0A0A0A] text-[#0A0A0A]'
                : 'text-[#A3A3A3] hover:text-[#525252]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl">
          <div className="rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-6 py-4">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Profil Bilgileri</h2>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5E5CE6] text-lg font-semibold text-white">
                  HA
                </div>
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{profileName}</p>
                  <p className="text-xs text-[#A3A3A3]">{profileRole}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Ad Soyad</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">E-posta</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Rol</label>
                  <input
                    type="text"
                    value={profileRole}
                    onChange={(e) => setProfileRole(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Telefon</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
              </div>
              {/* Theme toggle */}
              <div className="flex items-center justify-between rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                <div className="flex items-center gap-2">
                  {darkMode ? <Moon className="h-4 w-4 text-[#5E5CE6]" /> : <Sun className="h-4 w-4 text-[#D97706]" />}
                  <span className="text-sm font-medium text-[#0A0A0A]">
                    {darkMode ? 'Koyu Tema' : 'Acik Tema'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDarkMode(!darkMode);
                    showToast(darkMode ? 'Acik tema secildi' : 'Koyu tema secildi');
                  }}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    darkMode ? 'bg-[#5E5CE6]' : 'bg-[#D4D4D4]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      darkMode ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => showToast('Profil kaydedildi')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="max-w-2xl">
          <div className="rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-6 py-4">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Sirket Bilgileri</h2>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Sirket Adi</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Domain</label>
                  <input
                    type="text"
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Calisan Sayisi</label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  >
                    <option value="1-10">1-10</option>
                    <option value="10-50">10-50</option>
                    <option value="50-100">50-100</option>
                    <option value="100-500">100-500</option>
                    <option value="500+">500+</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#525252]">Sektor</label>
                  <input
                    type="text"
                    value={companySector}
                    onChange={(e) => setCompanySector(e.target.value)}
                    className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  />
                </div>
              </div>
              {/* Security info */}
              <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                <Shield className="h-4 w-4 text-[#059669]" />
                <span className="text-xs text-[#525252]">
                  SSL sertifikasi aktif · KVKK uyumlu · Veriler Turkiye&apos;de barindiriliyor
                </span>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => showToast('Sirket bilgileri kaydedildi')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modules Tab — with pricing calculator + usage analytics */}
      {activeTab === 'modules' && (
        <div className="max-w-2xl">
          {/* Cost summary */}
          <div className="mb-6 rounded-xl border border-[#EDEDED] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-[#A3A3A3]">Aylik Maliyet</p>
                <p className="text-2xl font-bold tabular-nums text-[#0A0A0A]">
                  {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(currentMonthlyCost)}
                  <span className="text-sm font-normal text-[#A3A3A3]"> /ay</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#A3A3A3]">Aktif moduller</p>
                <p className="text-lg font-semibold text-[#0A0A0A]">{modules.filter((m) => m.enabled).length} / {modules.length}</p>
              </div>
            </div>

            {/* Pending change indicator */}
            {pendingCostDiff && (
              <div className="mt-3 rounded-lg bg-[#FEF3C7] p-3">
                <p className="text-xs font-medium text-[#92400E]">
                  {pendingCostDiff.moduleName} {pendingCostDiff.diff > 0 ? 'aktif edilirse' : 'devre disi birakilirsa'}:
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#0A0A0A]">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(currentMonthlyCost)}
                  </span>
                  <span className="text-xs text-[#A3A3A3]">&rarr;</span>
                  <span className="text-sm font-semibold text-[#0A0A0A]">
                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(pendingCostDiff.newTotal)}
                  </span>
                  <span className={`text-xs font-semibold ${pendingCostDiff.diff > 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                    ({pendingCostDiff.diff > 0 ? '+' : ''}{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(pendingCostDiff.diff)}/ay)
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#92400E]">Bu degisiklik bir sonraki fatura doneminde gecerli olacaktir</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {modules.map((m) => (
              <div key={m.id} className="rounded-xl border border-[#EDEDED] bg-white transition-colors hover:border-[#D4D4D4]">
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#0A0A0A]">{m.label}</p>
                      <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-semibold text-[#525252]">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(m.price)}/ay
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#A3A3A3]">{m.description}</p>
                  </div>
                  <button
                    type="button"
                    onMouseEnter={() => setPendingModuleId(m.id)}
                    onMouseLeave={() => setPendingModuleId(null)}
                    onClick={() => toggleModule(m.id)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      m.enabled ? 'bg-[#059669]' : 'bg-[#D4D4D4]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        m.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Usage analytics */}
                {m.enabled && (
                  <div className="border-t border-[#EDEDED] px-5 py-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#A3A3A3]">{m.usage.label}</span>
                      <span className="font-medium tabular-nums text-[#0A0A0A]">
                        {m.usage.current.toLocaleString('tr-TR')}{m.usage.limit !== 'sinirsiz' ? ` / ${m.usage.limit}` : ''}
                      </span>
                    </div>
                    {m.usage.limit !== 'sinirsiz' && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                        <div
                          className="h-full rounded-full bg-[#5E5CE6] transition-all"
                          style={{ width: `${Math.min(100, (m.usage.current / parseInt(m.usage.limit)) * 100)}%` }}
                        />
                      </div>
                    )}
                    {m.usage.limit === 'sinirsiz' && (
                      <p className="mt-1 text-[10px] text-[#A3A3A3]">Aktif calisan sayisina gore sinirsiz</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#525252]">{team.length} kullanici</p>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
            >
              <UserPlus className="h-4 w-4" />
              Kullanici Davet Et
            </button>
          </div>
          <div className="rounded-xl border border-[#EDEDED] bg-white">
            <div className="divide-y divide-[#EDEDED]">
              {team.map((member) => (
                <div key={member.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5] text-xs font-semibold text-[#525252]">
                    {member.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0A0A0A]">{member.name}</p>
                    <p className="text-xs text-[#A3A3A3]">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: `${roleColors[member.role] || '#A3A3A3'}15`, color: roleColors[member.role] || '#A3A3A3' }}
                    >
                      {member.role}
                    </span>
                    <p className="mt-1 text-[10px] text-[#A3A3A3]">{member.lastActive}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#525252]" />
            <p className="text-sm text-[#525252]">
              Bildirim tercihleri — {profileEmail}
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border border-[#EDEDED] bg-white px-5 py-4 transition-colors hover:border-[#D4D4D4]">
                <div>
                  <p className="text-sm font-medium text-[#0A0A0A]">{n.label}</p>
                  <p className="mt-0.5 text-xs text-[#A3A3A3]">{n.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification(n.id)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    n.enabled ? 'bg-[#059669]' : 'bg-[#D4D4D4]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      n.enabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => showToast('Bildirim tercihleri kaydedildi')}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
            >
              <Save className="h-4 w-4" />
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="max-w-2xl">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: 'free', name: 'Baslangic', price: 'Ucretsiz', features: ['5 calisan', '1 modul', 'Temel raporlar'] },
              { key: 'pro', name: 'Profesyonel', price: '₺299/ay', features: ['100 calisan', 'Tum moduller', 'Gelismis analitik', 'E-posta destek'] },
              { key: 'enterprise', name: 'Kurumsal', price: 'Iletisime gecin', features: ['Sinirsiz calisan', 'Ozel entegrasyonlar', 'SLA garantisi', 'Oncelikli destek'] },
            ].map((p) => (
              <div
                key={p.key}
                className={`rounded-xl border p-5 transition-all ${
                  plan === p.key
                    ? 'border-[#5E5CE6] bg-white shadow-sm'
                    : 'border-[#EDEDED] bg-white hover:border-[#D4D4D4]'
                }`}
              >
                {plan === p.key && (
                  <span className="mb-3 inline-flex items-center rounded-full bg-[#EEF0FD] px-2.5 py-0.5 text-[11px] font-semibold text-[#5E5CE6]">
                    Mevcut Plan
                  </span>
                )}
                <h3 className="text-base font-semibold text-[#0A0A0A]">{p.name}</h3>
                <p className="mt-1 text-xl font-bold text-[#0A0A0A]">{p.price}</p>
                <ul className="mt-4 flex flex-col gap-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-[#525252]">
                      <Check className="h-3.5 w-3.5 text-[#059669]" />
                      {f}
                    </li>
                  ))}
                </ul>
                {plan !== p.key && (
                  <button
                    type="button"
                    onClick={() => showToast(`${p.name} planina gecis talebi olusturuldu`)}
                    className="mt-4 w-full rounded-lg border border-[#EDEDED] px-3 py-2 text-xs font-medium text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                  >
                    {p.key === 'enterprise' ? 'Iletisime Gec' : 'Plani Sec'}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4">
            <Globe className="h-4 w-4 text-[#5E5CE6]" />
            <div>
              <p className="text-xs font-medium text-[#525252]">Fatura Bilgileri</p>
              <p className="mt-0.5 text-[11px] text-[#A3A3A3]">
                Sonraki fatura tarihi: 1 Mayis 2026 · Upcore Demo — ₺{currentMonthlyCost.toLocaleString('tr-TR')}/ay
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Developer Tab */}
      {activeTab === 'developer' && (
        <div className="max-w-2xl">
          <div className="rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-6 py-4">
              <h2 className="text-base font-semibold text-[#0A0A0A]">Gelistirici Ayarlari</h2>
              <p className="mt-0.5 text-xs text-[#A3A3A3]">API anahtari ve entegrasyon ayarlari</p>
            </div>
            <div className="flex flex-col gap-5 p-6">
              {/* API Key */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">API Anahtari</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5">
                    <code className="text-sm text-[#0A0A0A]">{apiKey}</code>
                  </div>
                  <button
                    type="button"
                    onClick={copyApiKey}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                  >
                    {apiKeyCopied ? <Check className="h-4 w-4 text-[#059669]" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('API anahtari yenilendi')}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#EDEDED] text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-[#A3A3A3]">API anahtarinizi gizli tutun. Yenilemek mevcut entegrasyonlari bozabilir.</p>
              </div>

              {/* Webhook URL */}
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.example.com/webhooks/upcore"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
                <p className="mt-1 text-[11px] text-[#A3A3A3]">Izin onaylari, assessment sonuclari ve burnout alarmlari bu URL&apos;e POST edilir</p>
              </div>

              {/* API Usage */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[#525252]">API Kullanimi</label>
                <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#0A0A0A]">1.247 / 10.000</span>
                    <span className="text-xs text-[#A3A3A3]">bu ay</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EDEDED]">
                    <div className="h-full rounded-full bg-[#5E5CE6]" style={{ width: '12.47%' }} />
                  </div>
                  <p className="mt-2 text-[11px] text-[#A3A3A3]">
                    Ortalama: 42 istek/gun · Son 24 saat: 67 istek · Rate limit: 100 istek/dk
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => showToast('Gelistirici ayarlari kaydedildi')}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
              >
                <Save className="h-4 w-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#525252]">Son 10 sistem olayi</p>
            <span className="text-xs text-[#A3A3A3]">Tum kayitlar 90 gun saklanir</span>
          </div>
          <div className="rounded-xl border border-[#EDEDED] bg-white">
            <div className="divide-y divide-[#EDEDED]">
              {auditEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[#FAFAFA]">
                  <div
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: auditTypeColors[event.type] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#0A0A0A]">
                      <span className="font-medium">{event.actor}</span>{' '}
                      {event.action}{' '}
                      {event.target && <span className="font-medium">({event.target})</span>}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{event.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Kullanici Davet Et</h3>
              <button type="button" onClick={() => setInviteOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">E-posta Adresi</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="yeni.kullanici@sirket.com"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Rol</label>
                <div className="relative">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                  >
                    <option value="Admin">Admin</option>
                    <option value="IK Direktoru">IK Direktoru</option>
                    <option value="IK Uzmani">IK Uzmani</option>
                    <option value="Gelistirici">Gelistirici</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A3A3A3]" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleInvite}
                disabled={!inviteEmail}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Mail className="h-4 w-4" />
                Davet Gonder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
