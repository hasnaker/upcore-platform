'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Users,
  Plus,
  X,
  Check,
  Building2,
  MapPin,
  User,
  BarChart3,
} from 'lucide-react';
import { DepartmentAnalytics } from './_components/DepartmentAnalytics';

interface Department {
  id: string;
  name: string;
  head: string;
  headCount: number;
  location: string;
  color: string;
  children: Department[];
}

interface ApiDepartment {
  id: string;
  name_tr: string;
  code: string;
  path: string;
  depth: number;
  employee_count: number;
}

/* ─── Color palette for tree depth ─── */
const DEPTH_COLORS = ['#0A0A0A', '#5E5CE6', '#DC2626', '#059669', '#D97706', '#2563EB', '#EA580C'];

/* ─── Build tree from flat department list using path field ─── */
const buildTree = (depts: ApiDepartment[]): Department[] => {
  // Sort by path so parents come first
  const sorted = [...depts].sort((a, b) => a.path.localeCompare(b.path));

  const nodeMap = new Map<string, Department>();

  for (const d of sorted) {
    const node: Department = {
      id: d.id,
      name: d.name_tr,
      head: '-',
      headCount: d.employee_count,
      location: 'Istanbul',
      color: DEPTH_COLORS[d.depth] ?? '#5E5CE6',
      children: [],
    };
    nodeMap.set(d.path, node);
  }

  const roots: Department[] = [];

  for (const d of sorted) {
    const node = nodeMap.get(d.path);
    if (!node) continue;

    // Find parent by removing last segment from path
    const pathParts = d.path.split('.');
    if (pathParts.length > 1) {
      const parentPath = pathParts.slice(0, -1).join('.');
      const parent = nodeMap.get(parentPath);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  return roots;
};

/* ─── Fallback static data ─── */
const fallbackOrgData: Department[] = [
  {
    id: 'ceo',
    name: 'Genel Mudurluk',
    head: 'Hasan Aker',
    headCount: 3,
    location: 'Istanbul',
    color: '#0A0A0A',
    children: [
      {
        id: 'tech',
        name: 'Teknoloji',
        head: 'Emre Sahin',
        headCount: 18,
        location: 'Istanbul',
        color: '#5E5CE6',
        children: [
          { id: 'frontend', name: 'Frontend', head: 'Defne Yildirim', headCount: 6, location: 'Istanbul', color: '#5E5CE6', children: [] },
          { id: 'backend', name: 'Backend', head: 'Baris Erdogan', headCount: 8, location: 'Istanbul', color: '#5E5CE6', children: [] },
          { id: 'devops', name: 'DevOps', head: 'Can Demirtas', headCount: 4, location: 'Uzaktan', color: '#5E5CE6', children: [] },
        ],
      },
      {
        id: 'satis',
        name: 'Satis',
        head: 'Burak Arslan',
        headCount: 12,
        location: 'Istanbul',
        color: '#DC2626',
        children: [
          { id: 'kurumsal', name: 'Kurumsal Satis', head: 'Mehmet Kaya', headCount: 5, location: 'Istanbul', color: '#DC2626', children: [] },
          { id: 'kucuk', name: 'KOBi Satis', head: 'Selin Ozturk', headCount: 7, location: 'Ankara', color: '#DC2626', children: [] },
        ],
      },
      {
        id: 'urun',
        name: 'Urun',
        head: 'Kerem Aslan',
        headCount: 6,
        location: 'Istanbul',
        color: '#059669',
        children: [],
      },
      {
        id: 'musteri',
        name: 'Musteri Hizmetleri',
        head: 'Deniz Kara',
        headCount: 8,
        location: 'Ankara',
        color: '#D97706',
        children: [],
      },
      {
        id: 'ik',
        name: 'Insan Kaynaklari',
        head: 'Zeynep Celik',
        headCount: 5,
        location: 'Istanbul',
        color: '#2563EB',
        children: [],
      },
      {
        id: 'pazarlama',
        name: 'Pazarlama',
        head: 'Melis Acar',
        headCount: 8,
        location: 'Istanbul',
        color: '#EA580C',
        children: [],
      },
    ],
  },
];

interface TreeNodeProps {
  dept: Department;
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

const TreeNode = ({ dept, level, selectedId, onSelect, expandedIds, onToggle }: TreeNodeProps) => {
  const hasChildren = dept.children.length > 0;
  const isExpanded = expandedIds.has(dept.id);
  const isSelected = selectedId === dept.id;

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          onSelect(dept.id);
          if (hasChildren) onToggle(dept.id);
        }}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
          isSelected ? 'bg-[#F5F5F5]' : 'hover:bg-[#FAFAFA]'
        }`}
        style={{ paddingLeft: `${12 + level * 20}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#A3A3A3]" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#A3A3A3]" />
          )
        ) : (
          <span className="w-4" />
        )}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dept.color }}
        />
        <span className="text-sm font-medium text-[#0A0A0A]">{dept.name}</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-[#A3A3A3]">
          <Users className="h-3 w-3" />
          {dept.headCount}
        </span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {dept.children.map((child) => (
            <TreeNode
              key={child.id}
              dept={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const findDept = (depts: Department[], id: string): Department | null => {
  for (const d of depts) {
    if (d.id === id) return d;
    const found = findDept(d.children, id);
    if (found) return found;
  }
  return null;
};

const totalCount = (dept: Department): number => {
  return dept.headCount + dept.children.reduce((sum, c) => sum + totalCount(c), 0);
};

const countAllDepts = (depts: Department[]): number => {
  let count = 0;
  for (const d of depts) {
    count += 1 + countAllDepts(d.children);
  }
  return count;
};

export default function DepartmanlarPage() {
  const [orgData, setOrgData] = useState<Department[]>(fallbackOrgData);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formHead, setFormHead] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetch('/api/departments')
      .then((r) => r.json())
      .then((data) => {
        if (data.departments && data.departments.length > 0) {
          const tree = buildTree(data.departments);
          if (tree.length > 0) {
            setOrgData(tree);
            setTotalEmployees(data.total_employees ?? 0);
            // Auto-expand root nodes
            const rootIds = tree.map((d) => d.id);
            setExpandedIds(new Set(rootIds));
            setSelectedId(tree[0]?.id ?? null);
          } else {
            // API returned departments but tree building yielded nothing - use fallback
            setSelectedId('ceo');
            setExpandedIds(new Set(['ceo', 'tech', 'satis']));
          }
        } else {
          setSelectedId('ceo');
          setExpandedIds(new Set(['ceo', 'tech', 'satis']));
        }
      })
      .catch(() => {
        // Use fallback data
        setSelectedId('ceo');
        setExpandedIds(new Set(['ceo', 'tech', 'satis']));
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds: string[] = [];
    const collect = (depts: Department[]) => {
      for (const d of depts) {
        if (d.children.length > 0) allIds.push(d.id);
        collect(d.children);
      }
    };
    collect(orgData);
    setExpandedIds(new Set(allIds));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleAddDept = () => {
    if (!formName) return;
    showToast(`"${formName}" departmani olusturuldu`);
    setFormOpen(false);
    setFormName('');
    setFormHead('');
  };

  const selected = selectedId ? findDept(orgData, selectedId) : null;
  const deptCount = countAllDepts(orgData);
  const empCount = totalEmployees > 0 ? totalEmployees : (orgData[0] ? totalCount(orgData[0]) : 0);

  if (loading) {
    return (
      <div className="flex flex-col gap-8" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Organizasyon</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Departman yapinizi yonetin, raporlama hiyerarsisini goruntuleyin.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-80 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
          <div className="h-80 animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
        </div>
      </div>
    );
  }

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Organizasyon</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Departman yapinizi yonetin, raporlama hiyerarsisini goruntuleyin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0A0A0A] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Yeni Departman
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Toplam Departman', value: String(deptCount), icon: Building2, color: '#5E5CE6' },
          { label: 'Toplam Calisan', value: String(empCount), icon: Users, color: '#059669' },
          { label: 'Lokasyon', value: '3', icon: MapPin, color: '#D97706' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-[#EDEDED] bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${card.color}15` }}>
                  <Icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#A3A3A3]">{card.label}</p>
                  <p className="text-xl font-semibold tabular-nums text-[#0A0A0A]">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tree + Detail */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Tree Panel */}
        <div className="rounded-xl border border-[#EDEDED] bg-white">
          <div className="flex items-center justify-between border-b border-[#EDEDED] px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">
              Organizasyon Agaci
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="rounded px-2 py-1 text-[11px] font-medium text-[#5E5CE6] hover:bg-[#EEF0FD]"
              >
                Tum Ac
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="rounded px-2 py-1 text-[11px] font-medium text-[#525252] hover:bg-[#F5F5F5]"
              >
                Kapat
              </button>
            </div>
          </div>
          <div className="py-2">
            {orgData.map((dept) => (
              <TreeNode
                key={dept.id}
                dept={dept}
                level={0}
                selectedId={selectedId}
                onSelect={setSelectedId}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
              />
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-xl border border-[#EDEDED] bg-white">
          {selected ? (
            <>
              <div className="border-b border-[#EDEDED] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: selected.color }}
                    />
                    <h2 className="text-lg font-semibold text-[#0A0A0A]">{selected.name}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      showAnalytics
                        ? 'bg-[#5E5CE6] text-white'
                        : 'border border-[#EDEDED] text-[#525252] hover:bg-[#F5F5F5]'
                    }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Analitik
                  </button>
                </div>
              </div>
              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <User className="h-5 w-5 text-[#525252]" />
                  <div>
                    <p className="text-[11px] font-medium text-[#A3A3A3]">Departman Yoneticisi</p>
                    <p className="text-sm font-medium text-[#0A0A0A]">{selected.head}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <Users className="h-5 w-5 text-[#525252]" />
                  <div>
                    <p className="text-[11px] font-medium text-[#A3A3A3]">Calisan Sayisi</p>
                    <p className="text-sm font-medium text-[#0A0A0A]">{selected.headCount} kisi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <MapPin className="h-5 w-5 text-[#525252]" />
                  <div>
                    <p className="text-[11px] font-medium text-[#A3A3A3]">Lokasyon</p>
                    <p className="text-sm font-medium text-[#0A0A0A]">{selected.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] p-4">
                  <Building2 className="h-5 w-5 text-[#525252]" />
                  <div>
                    <p className="text-[11px] font-medium text-[#A3A3A3]">Alt Departman</p>
                    <p className="text-sm font-medium text-[#0A0A0A]">{selected.children.length} birim</p>
                  </div>
                </div>
              </div>
              {selected.children.length > 0 && !showAnalytics && (
                <div className="border-t border-[#EDEDED] px-6 py-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#A3A3A3]">Alt Departmanlar</p>
                  <div className="flex flex-col gap-2">
                    {selected.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => setSelectedId(child.id)}
                        className="flex items-center gap-3 rounded-lg border border-[#EDEDED] p-3 text-left transition-colors hover:bg-[#FAFAFA]"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: child.color }} />
                        <span className="text-sm font-medium text-[#0A0A0A]">{child.name}</span>
                        <span className="ml-auto text-xs text-[#A3A3A3]">{child.headCount} kisi</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Department Analytics Panel */}
              {showAnalytics && (
                <div className="border-t border-[#EDEDED] p-6">
                  <DepartmentAnalytics
                    departmentId={selected.id}
                    departmentName={selected.name}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-[#A3A3A3]">
              Detay goruntulemek icin soldan bir departman secin.
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDEDED] px-6 py-4">
              <h3 className="text-base font-semibold text-[#0A0A0A]">Yeni Departman</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-[#A3A3A3] hover:text-[#525252]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Departman Adi</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ornek: Finans"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#525252]">Yonetici</label>
                <input
                  type="text"
                  value={formHead}
                  onChange={(e) => setFormHead(e.target.value)}
                  placeholder="Ad Soyad"
                  className="w-full rounded-lg border border-[#EDEDED] px-3 py-2.5 text-sm text-[#0A0A0A] outline-none focus:border-[#5E5CE6] focus:ring-1 focus:ring-[#5E5CE6]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#EDEDED] px-6 py-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Iptal
              </button>
              <button
                type="button"
                onClick={handleAddDept}
                disabled={!formName}
                className="rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Olustur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
