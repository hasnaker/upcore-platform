/**
 * KVKK rıza yöneticisi — tip yeniden ihracat ve yardımcılar.
 *
 * Hooks katmanındaki ConsentType / ConsentStatus / ConsentCatalogEntry
 * tiplerini buradan re-export ediyoruz; sayfa shell'i ve alt component'ler
 * tek import yolu üzerinden tüketsin (sıkı bağı azaltır, ileride hook
 * dosyası taşınırsa tek noktayı güncellemek yetiyor).
 */
export type {
  ConsentCatalogEntry,
  ConsentStatus,
  ConsentType,
  DataConsent,
} from '@/hooks/useKvkkConsents';
import type { ConsentStatus } from '@/hooks/useKvkkConsents';

// localStorage key — aydınlatma metni kabul durumu burada saklanır.
// Versiyon ekleyerek metin güncellendiğinde tüm kullanıcıların yeniden
// kabul etmesini sağlıyoruz (v1 → v2 olduğunda bu key'i bump et).
export const PRIVACY_ACCEPTANCE_STORAGE_KEY = 'upcore.kvkk.privacy_notice.v1';

/** Tarihi Türkçe locale ile gün+ay+yıl+saat formatına çevirir. */
export function formatTurkishDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Ham change_reason kodunu Türkçe etiket'e çevirir. */
export function mapChangeReason(r: string): string {
  switch (r) {
    case 'user_action':
      return 'Kullanıcı değiştirdi';
    case 'version_upgrade':
      return 'Metin versiyonu yenilendi';
    case 'admin_override':
      return 'Yönetici müdahalesi';
    case 'system_reset':
      return 'Sistem sıfırlaması';
    default:
      return r;
  }
}

/** Rıza durumunu kullanıcı dostu Türkçe etikete çevirir. */
export function consentStatusLabel(s: ConsentStatus | null): string {
  if (s === null) return 'Yok';
  if (s === 'granted') return 'Verildi';
  if (s === 'declined') return 'Reddedildi';
  return 'Geri Çekildi';
}
