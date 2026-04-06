'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MOCK_EMPLOYEE_STRENGTHS, STRENGTH_DOMAINS } from './lib/strengths-data';
import type { EmployeeStrengthSummary } from './lib/strengths-data';

function getDomainInfo(domainId: string) {
  return STRENGTH_DOMAINS.find((d) => d.id === domainId);
}

const DEPARTMENTS = ['Tümü', 'Mühendislik', 'Pazarlama', 'İnsan Kaynakları', 'Finans', 'Satış'];

export default function GucluYonlerPage() {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('Tümü');

  const filtered = useMemo(() => {
    return MOCK_EMPLOYEE_STRENGTHS.filter((emp) => {
      const matchSearch = emp.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'));
      const matchDept = departmentFilter === 'Tümü' || emp.department === departmentFilter;
      return matchSearch && matchDept;
    });
  }, [search, departmentFilter]);

  const stats = useMemo(() => {
    const total = MOCK_EMPLOYEE_STRENGTHS.length;
    const assessed = MOCK_EMPLOYEE_STRENGTHS.filter((e) => e.assessmentDate !== null).length;
    const pending = total - assessed;
    const avgCompleteness =
      assessed > 0
        ? Math.round(
            MOCK_EMPLOYEE_STRENGTHS.filter((e) => e.assessmentDate !== null).reduce(
              (sum, e) => sum + e.profileCompleteness,
              0
            ) / assessed
          )
        : 0;
    return { total, assessed, pending, avgCompleteness };
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
            Güçlü Yönler
          </h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            UpStrengths-TR ile çalışan güçlü yön keşfi ve profil yönetimi
          </p>
        </div>
        <Link
          href="/guclu-yonler/kesfet"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 40,
            padding: '0 20px',
            background: '#5E5CE6',
            color: '#fff',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            transition: 'all 150ms',
          }}
          className="shrink-0 hover:opacity-90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          Güçlü Yön Keşfi Başlat
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Toplam Çalışan" value={stats.total} color="#111" />
        <StatCard label="Değerlendirilen" value={stats.assessed} color="#059669" />
        <StatCard label="Bekleyen" value={stats.pending} color="#D97706" />
        <StatCard
          label="Ort. Profil Tamamlanma"
          value={`%${stats.avgCompleteness}`}
          color="#5E5CE6"
        />
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path strokeLinecap="round" d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Çalışan ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: 40,
              paddingLeft: 36,
              paddingRight: 12,
              border: '1px solid #f0f0f0',
              borderRadius: 10,
              fontSize: 13,
              color: '#111',
              background: '#fff',
              outline: 'none',
            }}
            className="focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
          />
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{
            height: 40,
            padding: '0 36px 0 12px',
            border: '1px solid #f0f0f0',
            borderRadius: 10,
            fontSize: 13,
            color: '#111',
            background: '#fff',
            outline: 'none',
            appearance: 'none',
            backgroundImage:
              "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")",
            backgroundPosition: 'right 10px center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '16px',
          }}
          className="focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Employee List */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          overflow: 'hidden',
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 280px 100px',
            padding: '12px 20px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Çalışan
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Departman
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Top 3 Güçlü Yön
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
            Profil %
          </span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#888', fontSize: 14 }}>
            Sonuç bulunamadı
          </div>
        ) : (
          filtered.map((emp) => <EmployeeRow key={emp.id} employee={emp} />)
        )}
      </div>
    </div>
  );
}

function EmployeeRow({ employee }: { employee: EmployeeStrengthSummary }) {
  const hasAssessment = employee.assessmentDate !== null;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 140px 280px 100px',
        padding: '14px 20px',
        borderBottom: '1px solid #f0f0f0',
        alignItems: 'center',
        transition: 'background 100ms',
      }}
      className="hover:bg-[#fafafa]"
    >
      {/* Name */}
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: hasAssessment ? '#f0f0ff' : '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: hasAssessment ? '#5E5CE6' : '#888',
          }}
        >
          {employee.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toLocaleUpperCase('tr-TR')}
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{employee.name}</span>
      </div>

      {/* Department */}
      <span style={{ fontSize: 13, color: '#555' }}>{employee.department}</span>

      {/* Top 3 Badges */}
      <div className="flex items-center gap-1.5">
        {hasAssessment ? (
          employee.top3.map((s) => {
            const domain = getDomainInfo(s.domainId);
            if (!domain) return null;
            return (
              <span
                key={s.domainId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 600,
                  color: domain.color,
                  background: `${domain.color}14`,
                  whiteSpace: 'nowrap',
                }}
              >
                {domain.name_tr}
                <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>
                  {s.score.toFixed(1)}
                </span>
              </span>
            );
          })
        ) : (
          <span style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
            Henüz değerlendirilmedi
          </span>
        )}
      </div>

      {/* Profile Completeness */}
      <div className="flex items-center justify-end gap-2">
        {hasAssessment ? (
          <>
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                background: '#f0f0f0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${employee.profileCompleteness}%`,
                  height: '100%',
                  background:
                    employee.profileCompleteness >= 80
                      ? '#059669'
                      : employee.profileCompleteness >= 50
                        ? '#D97706'
                        : '#DC2626',
                  borderRadius: 2,
                }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
              %{employee.profileCompleteness}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#aaa' }}>—</span>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        padding: 16,
      }}
    >
      <div className="flex items-center gap-2">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginTop: 8 }}>{value}</div>
    </div>
  );
}
