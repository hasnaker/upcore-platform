'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Departman adi zorunludur').max(200),
  code: z.string().min(1, 'Departman kodu zorunludur').max(20),
  parentId: z.string().optional(),
  description: z.string().optional(),
  costCenter: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

interface DepartmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Static data — will be replaced with API call when services are connected
const parentOptions = [
  { value: 'none', label: 'Ust departman yok (kok)' },
  { value: 'root', label: 'Acme Turkiye' },
  { value: 'sales', label: 'Satis' },
  { value: 'eng', label: 'Muhendislik' },
  { value: 'product', label: 'Urun' },
  { value: 'marketing', label: 'Pazarlama' },
  { value: 'cs', label: 'Musteri Hizmetleri' },
  { value: 'hr', label: 'Insan Kaynaklari' },
];

export const DepartmentForm = ({ open, onOpenChange }: DepartmentFormProps) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
  });

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // TODO: Replace with actual API call
      console.log('Department data:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Departman basariyla olusturuldu');
      reset();
      onOpenChange(false);
    } catch {
      toast.error('Departman olusturulurken hata olustu');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[#f0f0f0] bg-white p-6 shadow-lg">
        <div className="mb-4">
          <h2 className="text-[16px] font-semibold text-[#111]">Yeni Departman</h2>
          <p className="mt-1 text-[13px] text-[#888]">
            Organizasyon agacina yeni bir departman ekleyin.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">
              Departman Adi <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              placeholder="orn. Muhendislik"
              className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-[11px] text-[#DC2626]">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">
              Departman Kodu <span className="text-[#DC2626]">*</span>
            </label>
            <input
              type="text"
              placeholder="orn. ENG"
              className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
              {...register('code')}
            />
            {errors.code && (
              <p className="text-[11px] text-[#DC2626]">{errors.code.message}</p>
            )}
          </div>

          {/* Parent Department */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">Ust Departman</label>
            <select
              value={watch('parentId') ?? 'none'}
              onChange={(e) => setValue('parentId', e.target.value === 'none' ? undefined : e.target.value)}
              className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
            >
              {parentOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Cost Center */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">Maliyet Merkezi</label>
            <input
              type="text"
              placeholder="orn. CC-001"
              className="h-10 rounded-lg border border-[#f0f0f0] bg-white px-3 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
              {...register('costCenter')}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[#555]">Aciklama</label>
            <textarea
              placeholder="Departman hakkinda kisa aciklama..."
              className="min-h-[80px] rounded-lg border border-[#f0f0f0] bg-white px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
              {...register('description')}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#555] hover:bg-[#fafafa]"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#111] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#333] disabled:opacity-50"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Olustur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
