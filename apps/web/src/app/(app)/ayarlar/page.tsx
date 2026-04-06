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
  ShieldCheck,
  Mail,
  Key,
  Copy,
  RefreshCw,
  Users,
  UserPlus,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  AlertTriangle,
  Eye,
  Trash2,
  Edit3,
  Plus,
  Network,
  Download,
  Monitor,
  Lock,
  Clock,
  Zap,
  ArrowUpRight,
} from 'lucide-react';

type TabKey = 'profile' | 'company' | 'modules' | 'notifications' | 'billing' | 'team' | 'developer' | 'audit' | 'kvkk';

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
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

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

  // Multi-Entity / Holding state
  const [isHolding, setIsHolding] = useState(false);
  const [consolidatedReporting, setConsolidatedReporting] = useState(true);
  const [entities, setEntities] = useState([
    { id: '1', name: 'Acme Teknoloji A.S.', vkn: '1234567890', employees: 48, modules: ['Tukenmislik', 'Izin', 'Belgeler', 'Degerlendirme'], active: true },
    { id: '2', name: 'Acme Danismanlik Ltd.', vkn: '9876543210', employees: 22, modules: ['Izin', 'Belgeler'], active: true },
    { id: '3', name: 'Acme Lojistik A.S.', vkn: '5678901234', employees: 65, modules: ['Tukenmislik', 'Izin', 'Belgeler', 'OKR'], active: true },
  ]);
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityVkn, setNewEntityVkn] = useState('');

  // KVKK state
  const [kvkkScore] = useState(78);
  const [dsrRequests, setDsrRequests] = useState<
    { id: string; date: string; requester: string; type: string; status: string; slaRemaining: number }[]
  >([
    { id: '1', date: '2026-03-28', requester: 'Elif Demir', type: 'Erisim', status: 'Tamamlandi', slaRemaining: 0 },
    { id: '2', date: '2026-04-01', requester: 'Ahmet Yilmaz', type: 'Silme', status: 'Isleniyor', slaRemaining: 18 },
    { id: '3', date: '2026-04-03', requester: 'Merve Koc', type: 'Duzeltme', status: 'Beklemede', slaRemaining: 27 },
  ]);
  const [kvkkAuditLog] = useState([
    { id: '1', actor: 'Hasan Aker', action: 'Calisan verisine eristi', target: 'Tum bordro verileri', time: '2 saat once', type: 'read' as const },
    { id: '2', actor: 'Ayse Kara', action: 'Calisan bilgisi guncelledi', target: 'Elif Demir - Adres', time: '4 saat once', type: 'update' as const },
    { id: '3', actor: 'Mehmet B.', action: 'Belge indirdi', target: 'Is Sozlesmesi - Can D.', time: '6 saat once', type: 'read' as const },
    { id: '4', actor: 'Sistem', action: 'Toplu veri aktarimi', target: 'Aylik bordro raporu', time: '1 gun once', type: 'export' as const },
    { id: '5', actor: 'Selin Ozturk', action: 'Calisan silme talebi isledi', target: 'Eski calisan - ID:4521', time: '2 gun once', type: 'delete' as const },
  ]);

  // Modules with pricing
  const [modules, setModules] = useState<ModuleToggle[]>([
    { id: 'burnout', label: 'Tukenmislik Izleme', description: 'BAT-12-TR anketleri ve departman analizi', enabled: true, price: 1500, usage: { current: 847, limit: 'sinirsiz', label: 'pulse response bu ay' } },
    { id: 'assessment', label: 'Degerlendirme', description: 'Aday assessment ve yetkinlik olcumleri', enabled: true, price: 2000, usage: { current: 34, limit: 'sinirsiz', label: 'assessment bu ay' } },
    { id: 'leave', label: 'Izin Yonetimi', description: 'Izin bakiyeleri, talepler ve takvim', enabled: true, price: 500, usage: { current: 48, limit: 'sinirsiz', label: 'izin talebi bu ay' } },
    { id: 'docs', label: 'Belge Yonetimi', description: 'Calisan belgeleri ve guvenli arsiv', enabled: true, price: 500, usage: { current: 156, limit: '1000', label: 'belge' } },
    { id: 'rotation', label: 'Rotasyon', description: 'Ic mobilite ve kariyer planlama', enabled: false, price: 1000, usage: { current: 0, limit: 'sinirsiz', label: 'rotasyon plani' } },
    { id: 'okr', label: 'OKR Takibi', description: 'Hedef ve anahtar sonuc yonetimi', enabled: false, price: 1000, usage: { current: 0, limit: 'sinirsiz', label: 'OKR' } },
  ]);

  // Module sub-features detail
  const moduleFeatures: Record<string, { features: string[]; lastActivity: string; setupComplete: boolean }> = {
    burnout: { features: ['Haftalik BAT-12-TR pulse', 'Departman kirilim analizi', 'Norm karsilastirmasi', 'Risk haritasi & trendler', 'Otomatik alarm ve bildirimler'], lastActivity: '2 saat once', setupComplete: true },
    assessment: { features: ['Yetkinlik bazli degerlendirme', 'JD-R profil eslesmesi', 'Big Five kisilik analizi', 'Aday karsilastirma raporu', 'Otomatik skor ve onceliklendirme'], lastActivity: '5 saat once', setupComplete: true },
    leave: { features: ['Izin bakiye yonetimi', 'Onay akislari', 'Takvim gorunumu', 'Departman cakisma kontrolu'], lastActivity: '1 gun once', setupComplete: true },
    docs: { features: ['Guvenli belge arsivi', 'Sozlesme yonetimi', 'Otomatik suresi dolma uyarisi', 'KVKK uyumlu saklama'], lastActivity: '3 saat once', setupComplete: true },
    rotation: { features: ['Ic transfer planlama', 'Kariyer yolu haritasi', 'Yetkinlik gap analizi', 'Mentoring eslestirme'], lastActivity: 'Henuz kullanilmadi', setupComplete: false },
    okr: { features: ['Hedef agaci olusturma', 'Anahtar sonuc takibi', 'Ceyreklik raporlama', 'Departman OKR hizalamasi'], lastActivity: 'Henuz kullanilmadi', setupComplete: false },
  };

  // Notification delivery stats
  const notifStats: Record<string, { lastSent: string; deliveryRate: number }> = {
    'email-actions': { lastSent: '2 saat once', deliveryRate: 98 },
    'email-burnout': { lastSent: '5 saat once', deliveryRate: 100 },
    'email-leave': { lastSent: '1 gun once', deliveryRate: 97 },
    'email-weekly': { lastSent: 'Pazartesi 09:00', deliveryRate: 99 },
    'push-all': { lastSent: 'Henuz gonderilmedi', deliveryRate: 0 },
  };

  // Invoice history
  const invoiceHistory = [
    { month: 'Mart 2026', amount: 5000, status: 'paid' as const },
    { month: 'Subat 2026', amount: 5000, status: 'paid' as const },
    { month: 'Ocak 2026', amount: 4500, status: 'paid' as const },
  ];

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
    { key: 'kvkk', label: 'KVKK Uyum', icon: <ShieldCheck className="h-4 w-4" /> },
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
              {/* 2FA Toggle */}
              <div className="flex items-center justify-between rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#5E5CE6]" />
                  <div>
                    <span className="text-sm font-medium text-[#0A0A0A]">Iki Faktorlu Dogrulama (2FA)</span>
                    <p className="text-[11px] text-[#A3A3A3]">
                      {twoFactorEnabled ? 'Aktif — hesabiniz korunuyor' : 'Devre disi — aktif etmenizi oneriyoruz'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorEnabled(!twoFactorEnabled);
                    showToast(twoFactorEnabled ? '2FA devre disi birakildi' : '2FA aktif edildi');
                  }}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    twoFactorEnabled ? 'bg-[#059669]' : 'bg-[#D4D4D4]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      twoFactorEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Last login & active sessions */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                  <Clock className="h-4 w-4 text-[#525252]" />
                  <div>
                    <p className="text-[11px] text-[#A3A3A3]">Son giris</p>
                    <p className="text-sm font-medium text-[#0A0A0A]">Bugun 09:24, Istanbul</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                  <Monitor className="h-4 w-4 text-[#525252]" />
                  <div>
                    <p className="text-[11px] text-[#A3A3A3]">Aktif oturumlar</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#0A0A0A]">2 oturum</p>
                      <span className="text-[10px] text-[#888]">(bu cihaz + iPhone)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language & Theme preferences */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#525252]" />
                    <div>
                      <p className="text-[11px] text-[#A3A3A3]">Dil tercihi</p>
                      <p className="text-sm font-medium text-[#0A0A0A]">Turkce</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#A3A3A3]">V1 tek dil</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                  <div className="flex items-center gap-2">
                    {darkMode ? <Moon className="h-4 w-4 text-[#5E5CE6]" /> : <Sun className="h-4 w-4 text-[#D97706]" />}
                    <div>
                      <p className="text-[11px] text-[#A3A3A3]">Tema</p>
                      <p className="text-sm font-medium text-[#0A0A0A]">{darkMode ? 'Koyu' : 'Acik'}</p>
                    </div>
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

      {/* Company Tab — Enhanced with Multi-Entity / Holding Support */}
      {activeTab === 'company' && (
        <div className="max-w-3xl">
          {/* Company info card */}
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

          {/* Multi-Entity / Holding Section */}
          <div className="mt-6 rounded-xl border border-[#EDEDED] bg-white">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-[#5E5CE6]" />
                <div>
                  <h2 className="text-base font-semibold text-[#0A0A0A]">
                    {isHolding ? 'Holding Yapisi' : 'Coklu Sirket Yapisi'}
                  </h2>
                  <p className="text-xs text-[#A3A3A3]">
                    {isHolding
                      ? `${entities.length} sirket · ${entities.reduce((s, e) => s + e.employees, 0)} toplam calisan`
                      : 'Holding yapisina gecerek birden fazla sirket yonetin'}
                  </p>
                </div>
              </div>
              {!isHolding && (
                <button
                  type="button"
                  onClick={() => {
                    setIsHolding(true);
                    showToast('Holding yapisi aktif edildi');
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#4B4ACE] active:scale-[0.97]"
                >
                  <Network className="h-4 w-4" />
                  Holding Yapisina Gec
                </button>
              )}
            </div>

            {isHolding ? (
              <div className="p-6">
                {/* Consolidated reporting toggle */}
                <div className="mb-5 flex items-center justify-between rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#0A0A0A]">Konsolide Raporlama</p>
                    <p className="text-xs text-[#A3A3A3]">Tum sirketleri birlestir — tek gorunum</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setConsolidatedReporting(!consolidatedReporting);
                      showToast(consolidatedReporting ? 'Bireysel gorunum aktif' : 'Konsolide gorunum aktif');
                    }}
                    className={`relative h-6 w-11 rounded-full transition-colors ${consolidatedReporting ? 'bg-[#5E5CE6]' : 'bg-[#D4D4D4]'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${consolidatedReporting ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Entity tree */}
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#A3A3A3]">Sirket Agaci</p>
                  <button
                    type="button"
                    onClick={() => setAddEntityOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-3 py-1.5 text-xs font-medium text-[#525252] transition-colors hover:bg-[#FAFAFA]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Yeni Sirket Ekle
                  </button>
                </div>

                {/* Holding root */}
                <div className="rounded-lg border border-[#5E5CE6]/20 bg-[#F8F7FF] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5E5CE6] text-xs font-bold text-white">H</div>
                    <div>
                      <p className="text-sm font-semibold text-[#0A0A0A]">{companyName} Holding</p>
                      <p className="text-[11px] text-[#A3A3A3]">Ana sirket · VKN: 0000000000</p>
                    </div>
                  </div>
                </div>

                {/* Child entities */}
                <div className="ml-6 mt-2 flex flex-col gap-2 border-l-2 border-[#EDEDED] pl-4">
                  {entities.map((entity) => (
                    <div
                      key={entity.id}
                      className={`rounded-lg border bg-white px-4 py-3 transition-colors hover:border-[#D4D4D4] ${entity.active ? 'border-[#EDEDED]' : 'border-[#EDEDED] opacity-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F5] text-xs font-semibold text-[#525252]">
                            {entity.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#0A0A0A]">{entity.name}</p>
                            <p className="text-[11px] text-[#A3A3A3]">VKN: {entity.vkn} · {entity.employees} calisan</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${entity.active ? 'bg-[#F0FDF4] text-[#059669]' : 'bg-[#F5F5F5] text-[#A3A3A3]'}`}>
                            {entity.active ? 'Aktif' : 'Pasif'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEntities((prev) => prev.map((e) => e.id === entity.id ? { ...e, active: !e.active } : e));
                              showToast(`${entity.name} ${entity.active ? 'devre disi birakildi' : 'aktif edildi'}`);
                            }}
                            className="rounded-md p-1.5 text-[#A3A3A3] transition-colors hover:bg-[#F5F5F5] hover:text-[#525252]"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* Active modules for this entity */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {entity.modules.map((mod) => (
                          <span key={mod} className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-medium text-[#525252]">
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-[#FAFAFA] p-3 text-center">
                    <p className="text-lg font-bold tabular-nums text-[#0A0A0A]">{entities.length}</p>
                    <p className="text-[10px] text-[#A3A3A3]">Sirket</p>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] p-3 text-center">
                    <p className="text-lg font-bold tabular-nums text-[#0A0A0A]">{entities.reduce((s, e) => s + e.employees, 0)}</p>
                    <p className="text-[10px] text-[#A3A3A3]">Toplam Calisan</p>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] p-3 text-center">
                    <p className="text-lg font-bold tabular-nums text-[#0A0A0A]">{entities.filter((e) => e.active).length}</p>
                    <p className="text-[10px] text-[#A3A3A3]">Aktif Sirket</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-[#EDEDED] bg-[#FAFAFA] px-8 py-10 text-center">
                  <Network className="h-10 w-10 text-[#A3A3A3]" />
                  <div>
                    <p className="text-sm font-medium text-[#0A0A0A]">Holding Yapisi</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#A3A3A3]">
                      Birden fazla tüzel kisilik (sirket, belediye birimleri, baglilar) yonetin.
                      Konsolide raporlama, merkezi KVKK yonetimi ve sirketler arasi
                      karsilastirmali analizler icin holding yapisina gecin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHolding(true);
                      showToast('Holding yapisi aktif edildi');
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#5E5CE6] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#4B4ACE] active:scale-[0.97]"
                  >
                    <Network className="h-4 w-4" />
                    Holding Yapisina Gec
                  </button>
                  <p className="text-[11px] text-[#A3A3A3]">Enterprise planinda dahil · Fiyatlandirma icin iletisime gecin</p>
                </div>
              </div>
            )}
          </div>

          {/* Add Entity Modal */}
          {addEntityOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
              <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
                  <h3 className="text-base font-semibold text-[#0A0A0A]">Yeni Sirket Ekle</h3>
                  <button type="button" onClick={() => setAddEntityOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-col gap-4 p-6">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#525252]">Sirket Adi</label>
                    <input
                      type="text"
                      value={newEntityName}
                      onChange={(e) => setNewEntityName(e.target.value)}
                      placeholder="Acme Yeni Sirket A.S."
                      className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#525252]">Vergi Kimlik No (VKN)</label>
                    <input
                      type="text"
                      value={newEntityVkn}
                      onChange={(e) => setNewEntityVkn(e.target.value)}
                      placeholder="1234567890"
                      maxLength={10}
                      className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setAddEntityOpen(false)}
                    className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
                  >
                    Iptal
                  </button>
                  <button
                    type="button"
                    disabled={!newEntityName || !newEntityVkn}
                    onClick={() => {
                      setEntities((prev) => [
                        ...prev,
                        {
                          id: String(Date.now()),
                          name: newEntityName,
                          vkn: newEntityVkn,
                          employees: 0,
                          modules: [],
                          active: true,
                        },
                      ]);
                      showToast(`${newEntityName} eklendi`);
                      setNewEntityName('');
                      setNewEntityVkn('');
                      setAddEntityOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    Sirket Ekle
                  </button>
                </div>
              </div>
            </div>
          )}
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

                {/* Expandable feature list */}
                {(() => {
                  const mf = moduleFeatures[m.id];
                  if (!mf) return null;
                  return (
                    <div className="border-t border-[#EDEDED]">
                      <button
                        type="button"
                        onClick={() => setExpandedModuleId(expandedModuleId === m.id ? null : m.id)}
                        className="flex w-full items-center justify-between px-5 py-2.5 text-left transition-colors hover:bg-[#FAFAFA]"
                      >
                        <span className="text-[11px] font-medium text-[#5E5CE6]">Ozellikler ve detaylar</span>
                        {expandedModuleId === m.id ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[#A3A3A3]" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-[#A3A3A3]" />
                        )}
                      </button>

                      {expandedModuleId === m.id && (
                        <div className="bg-[#FAFAFF] px-5 py-3">
                          {/* Feature list */}
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">Alt Ozellikler</p>
                          <div className="flex flex-col gap-1.5 mb-3">
                            {mf.features.map((feat) => (
                              <div key={feat} className="flex items-center gap-2 text-[12px] text-[#525252]">
                                <Check className="h-3 w-3 text-[#059669]" />
                                {feat}
                              </div>
                            ))}
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center gap-4 rounded-lg bg-white border border-[#EDEDED] px-3 py-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
                              <Clock className="h-3 w-3" />
                              Son aktivite: <span className="font-medium text-[#0A0A0A]">{mf.lastActivity}</span>
                            </div>
                            {!mf.setupComplete && (
                              <button
                                type="button"
                                onClick={() => showToast(`${m.label} kurulum sihirbazi acildi`)}
                                className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-[#5E5CE6] hover:underline"
                              >
                                Kurulumu tamamla
                                <ArrowUpRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#525252]" />
              <p className="text-sm text-[#525252]">
                Bildirim tercihleri — {profileEmail}
              </p>
            </div>
            {/* Monthly stats summary */}
            <div className="flex items-center gap-3 rounded-lg bg-[#FAFAFA] px-3 py-2">
              <span className="text-[11px] text-[#A3A3A3]">Bu ay:</span>
              <span className="text-[11px] font-semibold text-[#0A0A0A]">47 email</span>
              <span className="text-[11px] text-[#D4D4D4]">|</span>
              <span className="text-[11px] font-semibold text-[#0A0A0A]">123 uygulama ici</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {notifications.map((n) => {
              const stats = notifStats[n.id];
              return (
                <div key={n.id} className="rounded-lg border border-[#EDEDED] bg-white transition-colors hover:border-[#D4D4D4]">
                  <div className="flex items-center justify-between px-5 py-4">
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
                  {/* Delivery stats per notification */}
                  {n.enabled && stats && (
                    <div className="border-t border-[#EDEDED] bg-[#FAFAFF] px-5 py-2.5">
                      <div className="flex items-center gap-4 text-[11px] text-[#888]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Son gonderim: <span className="font-medium text-[#525252]">{stats.lastSent}</span>
                        </span>
                        {stats.deliveryRate > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Teslim orani: <span className="font-medium text-[#059669]">%{stats.deliveryRate} basarili</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
          {/* Plan Limits */}
          <div className="mt-6 rounded-xl border border-[#EDEDED] bg-white p-5">
            <h3 className="text-sm font-semibold text-[#0A0A0A] mb-4">Plan Limitleri</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Calisan', current: 10, limit: 500, unit: '' },
                { label: 'Assessment', current: 34, limit: -1, unit: 'sinirsiz' },
                { label: 'Depolama', current: 2.1, limit: 10, unit: 'GB' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#525252]">{item.label}</span>
                    <span className="font-medium tabular-nums text-[#0A0A0A]">
                      {item.limit === -1 ? `${item.current} (${item.unit})` : `${item.current}/${item.limit} ${item.unit}`}
                    </span>
                  </div>
                  {item.limit > 0 && (
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div
                        className="h-full rounded-full bg-[#5E5CE6] transition-all"
                        style={{ width: `${Math.min(100, (item.current / item.limit) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade Comparison */}
          <div className="mt-4 rounded-xl border border-[#5E5CE6]/20 bg-[#FAFAFF] p-5">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpRight className="h-4 w-4 text-[#5E5CE6]" />
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Kurumsal Plana Yukselt</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 text-[12px]">
              <div className="rounded-lg border border-[#EDEDED] bg-white p-3">
                <p className="text-[#A3A3A3] mb-1">Platform (Mevcut)</p>
                <p className="font-semibold text-[#0A0A0A]">₺{currentMonthlyCost.toLocaleString('tr-TR')}/ay</p>
                <p className="text-[11px] text-[#888] mt-1">500 calisan, 10 GB</p>
              </div>
              <div className="rounded-lg border border-[#5E5CE6]/30 bg-[#EEF0FD] p-3">
                <p className="text-[#5E5CE6] mb-1 font-medium">Kurumsal</p>
                <p className="font-semibold text-[#0A0A0A]">+₺5.000/ay</p>
                <p className="text-[11px] text-[#5E5CE6] mt-1">Sinirsiz calisan, dedicated destek</p>
              </div>
            </div>
          </div>

          {/* Invoice History */}
          <div className="mt-4 rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-5 py-3">
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Fatura Gecmisi</h3>
            </div>
            <div className="divide-y divide-[#EDEDED]">
              {invoiceHistory.map((inv) => (
                <div key={inv.month} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[#FAFAFA]">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-[#A3A3A3]" />
                    <span className="text-[13px] font-medium text-[#0A0A0A]">{inv.month}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold tabular-nums text-[#0A0A0A]">
                      ₺{inv.amount.toLocaleString('tr-TR')}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#D1FAE5] px-2 py-0.5 text-[10px] font-semibold text-[#059669]">
                      <Check className="h-3 w-3" />
                      Odendi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-5 py-4">
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

      {/* KVKK Compliance Tab */}
      {activeTab === 'kvkk' && (
        <div className="max-w-3xl">
          {/* Compliance Score */}
          <div className="mb-6 flex items-start gap-6 rounded-xl border border-[#EDEDED] bg-white p-6">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#EDEDED" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={kvkkScore >= 80 ? '#059669' : kvkkScore >= 60 ? '#D97706' : '#DC2626'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(kvkkScore / 100) * 264} 264`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold tabular-nums text-[#0A0A0A]">{kvkkScore}</span>
                <span className="text-[10px] text-[#A3A3A3]">/100</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[#0A0A0A]">KVKK Uyum Skoru</h2>
              <p className="mt-1 text-xs text-[#A3A3A3]">6698 sayili Kisisel Verilerin Korunmasi Kanunu uyum durumu</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
                  <Check className="h-3 w-3" />4 tamamlandi
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-semibold text-[#D97706]">
                  <AlertTriangle className="h-3 w-3" />2 uyari
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                  <X className="h-3 w-3" />2 eksik
                </span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="mb-6 rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Uyum Kontrol Listesi</h3>
            </div>
            <div className="divide-y divide-[#EDEDED]">
              {[
                { status: 'done' as const, text: 'Acik riza formu aktif (calisan onboarding\'de)', detail: 'Son guncelleme: 15 Mart 2026' },
                { status: 'done' as const, text: 'Aydinlatma metni yayinda', detail: 'upcore.io/kvkk-aydinlatma' },
                { status: 'done' as const, text: 'Veri envanteri (VERBIS) guncel', detail: 'Son senkronizasyon: 1 Nisan 2026' },
                { status: 'done' as const, text: 'Calisan acik riza kayitlari arsivlendi', detail: '127 calisan · %100 riza orani' },
                { status: 'warn' as const, text: 'Veri saklama politikasi: 3 belge suresi dolmak uzere', detail: '2 sozlesme, 1 saglik raporu · 30 gun icinde islenmeli' },
                { status: 'warn' as const, text: 'Erisim loglari: son 30 gun', detail: '1.247 erisim kaydi · Anormallik tespit edilmedi' },
                { status: 'fail' as const, text: 'Veri ihlali bildirimi proseduru: tanimlanmadi', detail: 'KVKK md. 12 geregi 72 saat icinde bildirim zorunlu' },
                { status: 'fail' as const, text: 'Veri koruma etki degerlendirmesi (DPIA): yapilmadi', detail: 'Yuksek riskli isleme faaliyetleri icin gerekli' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-[#FAFAFA]">
                  {item.status === 'done' && (
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#059669]">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {item.status === 'warn' && (
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D97706]">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {item.status === 'fail' && (
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#DC2626]">
                      <X className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[#0A0A0A]">{item.text}</p>
                    <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Subject Requests (DSR) */}
          <div className="mb-6 rounded-xl border border-[#EDEDED] bg-white">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#0A0A0A]">Veri Sahibi Basvurulari (DSR)</h3>
                <p className="mt-0.5 text-[11px] text-[#A3A3A3]">KVKK md. 13 — 30 gun zorunlu SLA</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newId = String(Date.now());
                  setDsrRequests((prev) => [
                    { id: newId, date: '2026-04-04', requester: 'Yeni Talep', type: 'Erisim', status: 'Beklemede', slaRemaining: 30 },
                    ...prev,
                  ]);
                  showToast('Yeni DSR talebi olusturuldu');
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-3 py-1.5 text-xs font-medium text-[#525252] transition-colors hover:bg-[#FAFAFA]"
              >
                <Plus className="h-3.5 w-3.5" />
                Yeni Talep
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EDEDED] text-xs font-medium text-[#A3A3A3]">
                    <th className="px-6 py-3">Tarih</th>
                    <th className="px-4 py-3">Talep Eden</th>
                    <th className="px-4 py-3">Talep Tipi</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3 text-right">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {dsrRequests.map((req) => (
                    <tr key={req.id} className="transition-colors hover:bg-[#FAFAFA]">
                      <td className="px-6 py-3.5 text-[#525252]">{req.date}</td>
                      <td className="px-4 py-3.5 font-medium text-[#0A0A0A]">{req.requester}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-[#525252]">
                          {req.type === 'Erisim' && <Eye className="h-3.5 w-3.5" />}
                          {req.type === 'Silme' && <Trash2 className="h-3.5 w-3.5" />}
                          {req.type === 'Duzeltme' && <Edit3 className="h-3.5 w-3.5" />}
                          {req.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          req.status === 'Tamamlandi' ? 'bg-[#F0FDF4] text-[#059669]' :
                          req.status === 'Isleniyor' ? 'bg-[#EFF6FF] text-[#5E5CE6]' :
                          'bg-[#FFFBEB] text-[#D97706]'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {req.status === 'Tamamlandi' ? (
                          <span className="text-xs text-[#059669]">Tamamlandi</span>
                        ) : (
                          <span className={`text-xs tabular-nums font-medium ${req.slaRemaining <= 5 ? 'text-[#DC2626]' : req.slaRemaining <= 15 ? 'text-[#D97706]' : 'text-[#525252]'}`}>
                            {req.slaRemaining} gun kaldi
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Retention Policy Overview */}
          <div className="mb-6 rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Veri Saklama Politikasi</h3>
              <p className="mt-0.5 text-[11px] text-[#A3A3A3]">Belge tipine gore yasal saklama suresi ve aktif belge durumu</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#EDEDED] text-xs font-medium text-[#A3A3A3]">
                    <th className="px-6 py-3">Belge Tipi</th>
                    <th className="px-4 py-3">Saklama Suresi</th>
                    <th className="px-4 py-3">Yasal Dayanak</th>
                    <th className="px-4 py-3 text-right">Aktif Belge</th>
                    <th className="px-4 py-3 text-right">Suresi Dolan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDED]">
                  {[
                    { type: 'Is Sozlesmesi', period: '7 yil', basis: '4857 Is Kanunu', active: 45, expired: 2 },
                    { type: 'Bordro', period: '10 yil', basis: 'VUK', active: 120, expired: 0 },
                    { type: 'Saglik Raporu', period: '10 yil', basis: '6331 ISG Kanunu', active: 15, expired: 1 },
                    { type: 'Izin Kaydi', period: '5 yil', basis: '4857 Is Kanunu', active: 340, expired: 0 },
                    { type: 'Disiplin Kaydi', period: '2 yil', basis: 'Is Yonetmeligi', active: 8, expired: 3 },
                    { type: 'Performans Degerlendirmesi', period: '3 yil', basis: 'Ic Politika', active: 67, expired: 0 },
                  ].map((row, idx) => (
                    <tr key={idx} className="transition-colors hover:bg-[#FAFAFA]">
                      <td className="px-6 py-3.5 font-medium text-[#0A0A0A]">{row.type}</td>
                      <td className="px-4 py-3.5 text-[#525252]">{row.period}</td>
                      <td className="px-4 py-3.5 text-[#525252]">{row.basis}</td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-[#525252]">{row.active}</td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`tabular-nums font-medium ${row.expired > 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>
                          {row.expired}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail Summary */}
          <div className="rounded-xl border border-[#EDEDED] bg-white">
            <div className="border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-sm font-semibold text-[#0A0A0A]">Veri Erisim Denetim Kaydi</h3>
              <p className="mt-0.5 text-[11px] text-[#A3A3A3]">Son 5 kisisel veri erisim olayi</p>
            </div>
            <div className="divide-y divide-[#EDEDED]">
              {kvkkAuditLog.map((event) => (
                <div key={event.id} className="flex items-start gap-3 px-6 py-4 transition-colors hover:bg-[#FAFAFA]">
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    event.type === 'read' ? 'bg-[#EFF6FF]' :
                    event.type === 'update' ? 'bg-[#FFFBEB]' :
                    event.type === 'delete' ? 'bg-[#FEF2F2]' :
                    'bg-[#F5F5F5]'
                  }`}>
                    {event.type === 'read' && <Eye className="h-3.5 w-3.5 text-[#5E5CE6]" />}
                    {event.type === 'update' && <Edit3 className="h-3.5 w-3.5 text-[#D97706]" />}
                    {event.type === 'delete' && <Trash2 className="h-3.5 w-3.5 text-[#DC2626]" />}
                    {event.type === 'export' && <Download className="h-3.5 w-3.5 text-[#525252]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#0A0A0A]">
                      <span className="font-medium">{event.actor}</span>{' '}
                      {event.action}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#A3A3A3]">{event.target} · {event.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#EDEDED] px-6 py-3">
              <p className="text-[11px] text-[#A3A3A3]">
                Tum erisim kayitlari KVKK md. 12 geregi 2 yil boyunca saklanir ve degistirilemez.
              </p>
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
