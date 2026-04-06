'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const interventionCategories = [
  { value: 'WORKLOAD', label: 'Is Yuku Duzenleme' },
  { value: 'AUTONOMY', label: 'Otonomi Artirma' },
  { value: 'RELATIONSHIPS', label: 'Iliski Gelistirme' },
  { value: 'RECOGNITION', label: 'Takdir ve Tanima' },
  { value: 'GROWTH', label: 'Gelisim Firsati' },
  { value: 'WELLBEING', label: 'Saglik ve Iyilik' },
  { value: 'COACHING', label: 'Kocluk/Mentorluk' },
  { value: 'ROLE_DESIGN', label: 'Rol Tasarimi' },
];

interface Intervention {
  id: string;
  title: string;
  category: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';
  employee: string;
}

const mockInterventions: Intervention[] = [
  { id: '1', title: 'Haftalik is yuku gorusmesi', category: 'WORKLOAD', status: 'IN_PROGRESS', employee: 'Burak Arslan' },
  { id: '2', title: 'Satis hedeflerinin yeniden degerlendirmesi', category: 'WORKLOAD', status: 'PROPOSED', employee: 'Deniz Kara' },
  { id: '3', title: 'Teknik kocluk programi', category: 'COACHING', status: 'ACCEPTED', employee: 'Ahmet Yilmaz' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PROPOSED: { label: 'Onerilen', color: '#D97706', bg: '#FEF3C7' },
  ACCEPTED: { label: 'Kabul Edildi', color: '#5E5CE6', bg: '#5E5CE6/10' },
  IN_PROGRESS: { label: 'Devam Ediyor', color: '#5E5CE6', bg: '#5E5CE6/10' },
  COMPLETED: { label: 'Tamamlandi', color: '#059669', bg: '#D1FAE5' },
};

export const InterventionFlow = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [interventions, setInterventions] = useState<Intervention[]>(mockInterventions);

  useEffect(() => {
    fetch('/api/interventions')
      .then((r) => r.json())
      .then((data: { items?: Array<{ id: string; title_tr: string; category: string; employee?: string }> }) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          const mapped: Intervention[] = data.items.map((item) => ({
            id: item.id,
            title: item.title_tr,
            category: item.category || 'WORKLOAD',
            status: 'PROPOSED' as const,
            employee: item.employee || '',
          }));
          setInterventions(mapped);
        }
      })
      .catch(() => {
        // Keep mock data as fallback
      });
  }, []);

  const handleCreate = async () => {
    if (!category) {
      toast.error('Lutfen bir mudahale kategorisi seciniz');
      return;
    }
    try {
      const res = await fetch('/api/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, description }),
      });
      if (!res.ok) {
        throw new Error('Mudahale olusturulamadi');
      }
      toast.success('Mudahale onerisi olusturuldu');
      setDialogOpen(false);
      setCategory('');
      setDescription('');
      // Refresh the list
      fetch('/api/interventions')
        .then((r) => r.json())
        .then((data: { items?: Array<{ id: string; title_tr: string; category: string; employee?: string }> }) => {
          if (data && Array.isArray(data.items) && data.items.length > 0) {
            const mapped: Intervention[] = data.items.map((item) => ({
              id: item.id,
              title: item.title_tr,
              category: item.category || 'WORKLOAD',
              status: 'PROPOSED' as const,
              employee: item.employee || '',
            }));
            setInterventions(mapped);
          }
        })
        .catch(() => {});
    } catch {
      toast.error('Mudahale olusturulurken hata olustu');
    }
  };

  return (
    <>
      <div className="rounded-xl border border-[#f0f0f0] bg-white">
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#111]">Aktif Mudahaleler</h3>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0f0f0] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#111] hover:bg-[#fafafa]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Yeni Mudahale
          </button>
        </div>
        <div>
          <div className="divide-y divide-[#f0f0f0]">
            {interventions.map((int) => {
              const config = statusConfig[int.status] ?? { label: int.status, color: '#888', bg: '#f0f0f0' };
              const catLabel = interventionCategories.find((c) => c.value === int.category)?.label ?? int.category;
              return (
                <div key={int.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#111]">{int.title}</p>
                    <p className="text-[12px] text-[#888]">{int.employee}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-[#f0f0f0] px-2 py-0.5 text-[11px] font-medium text-[#555]">
                    {catLabel}
                  </span>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ color: config.color, backgroundColor: `${config.color}15` }}
                  >
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#f0f0f0] bg-white p-6 shadow-lg">
            <div className="mb-4">
              <h2 className="text-[16px] font-semibold text-[#111]">Yeni Mudahale Onerisi</h2>
              <p className="mt-1 text-[13px] text-[#888]">Tukenmislik riski icin mudahale onerisi olusturun.</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#555]">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                >
                  <option value="">Mudahale kategorisi seciniz</option>
                  {interventionCategories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[#555]">Aciklama</label>
                <textarea
                  placeholder="Mudahale detaylarini yaziniz..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] rounded-lg border border-[#f0f0f0] bg-white px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#555] hover:bg-[#fafafa]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="rounded-lg bg-[#111] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#333]"
              >
                Olustur
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
