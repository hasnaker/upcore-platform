'use client';

import { useState } from 'react';

interface DepartmentNode {
  id: string;
  name: string;
  headcount: number;
  manager?: string;
  children: DepartmentNode[];
}

// Static data — will be replaced with API call when services are connected
const orgTree: DepartmentNode[] = [
  {
    id: 'root',
    name: 'Acme Turkiye',
    headcount: 70,
    manager: 'Ahmet Yildiz',
    children: [
      {
        id: 'sales',
        name: 'Satis',
        headcount: 24,
        manager: 'Ayse Yilmaz',
        children: [
          { id: 'sales-ic', name: 'Ic Satis', headcount: 12, manager: 'Kerem Bulut', children: [] },
          { id: 'sales-corp', name: 'Kurumsal Satis', headcount: 12, manager: 'Seda Acar', children: [] },
        ],
      },
      {
        id: 'eng',
        name: 'Muhendislik',
        headcount: 18,
        manager: 'Burak Aydin',
        children: [
          { id: 'eng-fe', name: 'Frontend', headcount: 8, manager: 'Deniz Yildiz', children: [] },
          { id: 'eng-be', name: 'Backend', headcount: 10, manager: 'Can Celik', children: [] },
        ],
      },
      {
        id: 'product',
        name: 'Urun',
        headcount: 8,
        manager: 'Elif Ozturk',
        children: [
          { id: 'product-design', name: 'Tasarim', headcount: 3, children: [] },
          { id: 'product-pm', name: 'Urun Yonetimi', headcount: 5, manager: 'Nisan Tekin', children: [] },
        ],
      },
      {
        id: 'marketing',
        name: 'Pazarlama',
        headcount: 6,
        manager: 'Zeynep Demir',
        children: [],
      },
      {
        id: 'cs',
        name: 'Musteri Hizmetleri',
        headcount: 10,
        manager: 'Fatma Korkmaz',
        children: [
          { id: 'cs-support', name: 'Destek', headcount: 6, children: [] },
          { id: 'cs-success', name: 'Musteri Basarisi', headcount: 4, children: [] },
        ],
      },
      {
        id: 'hr',
        name: 'Insan Kaynaklari',
        headcount: 4,
        manager: 'Melis Sahin',
        children: [],
      },
    ],
  },
];

const TreeNode = ({ node, depth = 0 }: { node: DepartmentNode; depth?: number }) => {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setExpanded(!expanded)}
        className="group flex w-full items-center gap-3 py-2 text-left transition-colors hover:bg-[#fafafa]"
        style={{ paddingLeft: `${depth * 24 + 16}px`, paddingRight: '16px' }}
      >
        {/* Expand/collapse chevron */}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {hasChildren ? (
            <svg
              className="h-4 w-4 text-[#888] transition-transform"
              style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          ) : (
            <span className="h-1 w-1 rounded-full bg-[#d4d4d4]" />
          )}
        </span>

        {/* Department name */}
        <span className="flex-1 text-[14px] font-medium text-[#111]">
          {node.name}
        </span>

        {/* Manager */}
        {node.manager && (
          <span className="hidden text-[12px] text-[#888] sm:inline">
            {node.manager}
          </span>
        )}

        {/* Headcount */}
        <span className="flex items-center gap-1 rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[12px] font-medium text-[#555]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          {node.headcount} kisi
        </span>
      </button>

      {/* Connecting line + children */}
      {expanded && hasChildren && (
        <div
          className="relative"
          style={{ marginLeft: `${depth * 24 + 16 + 10}px` }}
        >
          <div className="absolute left-0 top-0 bottom-0 w-px bg-[#f0f0f0]" />
          <div>
            {node.children.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const DepartmentTreeView = () => {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white">
      <div className="border-b border-[#f0f0f0] px-5 py-4">
        <h3 className="text-[15px] font-semibold text-[#111]">Organizasyon Agaci</h3>
      </div>
      <div>
        <div className="divide-y divide-[#f0f0f0]">
          {orgTree.map((node) => (
            <TreeNode key={node.id} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
};
