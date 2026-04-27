'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  LayoutGrid,
  Search,
  User,
  Users,
} from 'lucide-react';
import { useDepartmentsTree, type DepartmentTreeNode } from '@/hooks/useDepartments';

type ViewMode = 'tree' | 'grid';

export default function OrganizasyonPage() {
  const { data: tree = [], isLoading, isError, error, refetch } = useDepartmentsTree();
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const flatList = useMemo(() => flattenTree(tree), [tree]);
  const filtered = useMemo(() => {
    if (!search.trim()) return flatList;
    const q = search.toLocaleLowerCase('tr-TR');
    return flatList.filter((d) => d.name_tr.toLocaleLowerCase('tr-TR').includes(q));
  }, [flatList, search]);

  const stats = useMemo(() => {
    let depth = 0;
    const visit = (n: DepartmentTreeNode, d: number) => {
      depth = Math.max(depth, d);
      n.children?.forEach((c) => visit(c, d + 1));
    };
    tree.forEach((n) => visit(n, 1));
    const totalEmp = flatList.reduce((sum, d) => sum + (d.employee_count ?? 0), 0);
    return { deptCount: flatList.length, maxDepth: depth, totalEmp };
  }, [tree, flatList]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(flatList.map((d) => d.id)));
  const collapseAll = () => setExpanded(new Set());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Organizasyon Şeması</h1>
          <p className="mt-1 text-sm text-ink-60">
            Tüm departmanlar ve hiyerarşik yapı — canlı API üzerinden.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1">
          <button
            type="button"
            onClick={() => setViewMode('tree')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
              viewMode === 'tree' ? 'bg-accent-soft text-accent' : 'text-ink-60 hover:text-ink'
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            Ağaç
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
              viewMode === 'grid' ? 'bg-accent-soft text-accent' : 'text-ink-60 hover:text-ink'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Liste
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Building2 className="h-4 w-4" />} label="Departman" value={stats.deptCount} />
        <StatCard icon={<GitBranch className="h-4 w-4" />} label="Max hiyerarşi" value={stats.maxDepth} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Toplam çalışan" value={stats.totalEmp} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Departman ara…"
            className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none"
          />
        </div>
        {viewMode === 'tree' && (
          <div className="flex items-center gap-2 text-[12px] text-ink-60">
            <button type="button" onClick={expandAll} className="hover:text-ink underline">
              Hepsini aç
            </button>
            <span className="text-ink-20">·</span>
            <button type="button" onClick={collapseAll} className="hover:text-ink underline">
              Hepsini kapat
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg border border-line bg-bg" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-3 rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">Organizasyon yapısı yüklenemedi</p>
            <p className="mt-1 text-[12px]">{error?.message ?? 'Bilinmeyen hata'}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-md bg-red px-3 py-1.5 text-[12px] font-medium text-white"
            >
              Yeniden dene
            </button>
          </div>
        </div>
      )}

      {!isLoading && !isError && tree.length === 0 && <EmptyState />}

      {!isLoading && !isError && tree.length > 0 && viewMode === 'tree' && !search && (
        <div className="rounded-xl border border-line bg-bg">
          <ul className="divide-y divide-line">
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expanded}
                onToggle={toggle}
              />
            ))}
          </ul>
        </div>
      )}

      {!isLoading && !isError && (viewMode === 'grid' || search) && (
        <div className="rounded-xl border border-line bg-bg">
          {filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-40">Aramayla eşleşen departman yok.</p>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((d) => (
                <FlatRow key={d.id} dept={d} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const TreeNode = ({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: DepartmentTreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) => {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isOpen = expanded.has(node.id);
  const leftPad = depth * 20;

  return (
    <li>
      <div
        className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-bg-2"
        style={{ paddingLeft: `${leftPad + 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-40 hover:bg-bg-3 hover:text-ink-60"
            aria-label={isOpen ? 'Kapat' : 'Aç'}
          >
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-soft">
          <Building2 className="h-4 w-4 text-accent" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{node.name_tr}</p>
          {node.name_en && (
            <p className="truncate text-[11px] text-ink-40">{node.name_en}</p>
          )}
        </div>

        {typeof node.employee_count === 'number' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-ink-60">
            <Users className="h-3 w-3" />
            {node.employee_count}
          </span>
        )}

        {node.manager_id && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-ink-40"
            title="Yönetici atanmış"
          >
            <User className="h-3 w-3" />
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <ul className="divide-y divide-line border-t border-line bg-bg-2">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const FlatRow = ({ dept }: { dept: DepartmentTreeNode }) => (
  <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-2">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft">
      <Building2 className="h-4 w-4 text-accent" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-ink">{dept.name_tr}</p>
      {dept.path && <p className="text-[11px] text-ink-40">{dept.path}</p>}
    </div>
    {typeof dept.employee_count === 'number' && (
      <span className="inline-flex items-center gap-1 text-[12px] text-ink-60">
        <Users className="h-3 w-3" />
        {dept.employee_count}
      </span>
    )}
  </li>
);

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <div className="flex items-center gap-3 rounded-lg border border-line bg-bg p-4">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
      {icon}
    </div>
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-ink-40">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg px-6 py-16 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft">
      <Building2 className="h-6 w-6 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">Henüz departman yok</p>
    <p className="max-w-md text-xs text-ink-40">
      İlk departmanı ekleyerek organizasyon yapınızı kurmaya başlayın. Hiyerarşik olarak
      alt-departmanlar ekleyebilir, yöneticiler atayabilirsiniz.
    </p>
    <Link
      href="/departmanlar"
      className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
    >
      Departman yönetimine git →
    </Link>
  </div>
);

// ---------------------------------------------------------------------------

function flattenTree(nodes: DepartmentTreeNode[]): DepartmentTreeNode[] {
  const out: DepartmentTreeNode[] = [];
  const walk = (ns: DepartmentTreeNode[]) => {
    for (const n of ns) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
