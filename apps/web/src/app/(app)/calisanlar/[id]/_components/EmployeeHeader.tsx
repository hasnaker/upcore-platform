'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { updateEmployee } from '@/lib/employee-mapper';
import type { EmployeeView, CreateEmployeeRequest } from '@/lib/employee-mapper';

interface EmployeeHeaderProps {
  employee: EmployeeView;
}

const STATUS_PILL_STYLES: Record<string, { bg: string; text: string }> = {
  green: { bg: '#DCFCE7', text: '#16A34A' },
  amber: { bg: '#FEF3C7', text: '#D97706' },
  red: { bg: '#FEE2E2', text: '#DC2626' },
  gray: { bg: '#F3F4F6', text: '#6B7280' },
};

export const EmployeeHeader = ({ employee }: EmployeeHeaderProps) => {
  const router = useRouter();
  const [isDeactivating, setIsDeactivating] = useState(false);
  const pill = STATUS_PILL_STYLES[employee.durumRenk] ?? STATUS_PILL_STYLES['gray']!;

  return (
    <div
      style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 24, marginBottom: 24 }}
      className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"
    >
      {/* Left side: back + avatar + info */}
      <div className="flex items-start gap-4">
        {/* Back button */}
        <button
          onClick={() => router.push('/calisanlar')}
          style={{ color: '#888' }}
          className="mt-2 shrink-0 hover:opacity-70"
          aria-label="Geri"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Initials avatar */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#5E5CE6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1,
            flexShrink: 0,
          }}
        >
          {employee.initials}
        </div>

        {/* Name + meta */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              style={{ fontSize: 24, fontWeight: 700, color: '#111', lineHeight: '32px' }}
            >
              {employee.tamAd}
            </h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                background: pill.bg,
                color: pill.text,
              }}
            >
              {employee.durumLabel}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3" style={{ fontSize: 13, color: '#888' }}>
            {employee.sicilNo && <span>Sicil: {employee.sicilNo}</span>}
            {employee.email && (
              <>
                <span style={{ color: '#ddd' }}>|</span>
                <span>{employee.email}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: action buttons */}
      <div className="flex shrink-0 items-center gap-2 sm:mt-1">
        <Link
          href={`/calisanlar/${employee.id}/duzenle`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: '#111',
            color: '#fff',
          }}
          className="hover:opacity-90 transition-opacity"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Düzenle
        </Link>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            border: '1px solid #e5e5e5',
            background: '#fff',
            color: '#DC2626',
          }}
          className="hover:bg-red-50 transition-colors"
          disabled={isDeactivating}
          onClick={async () => {
            if (window.confirm('Bu çalışanı devre dışı bırakmak istediğinize emin misiniz?')) {
              setIsDeactivating(true);
              try {
                const deactivatePayload: Partial<CreateEmployeeRequest> & { employment_status: string } = {
                  employment_status: 'inactive',
                };
                await updateEmployee(employee.id, deactivatePayload as Partial<CreateEmployeeRequest>);
                toast.success('Calisan devre disi birakildi');
                router.push('/calisanlar');
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Devre disi birakma basarisiz');
              } finally {
                setIsDeactivating(false);
              }
            }
          }}
        >
          Devre Dışı Bırak
        </button>
      </div>
    </div>
  );
};
