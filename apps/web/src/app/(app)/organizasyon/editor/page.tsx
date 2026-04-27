'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, GripVertical, Save } from 'lucide-react';
import { toast } from 'sonner';

// Minimal flat tree editor (drag to reorder + indent/outdent). Full tree
// with nested drops is possible via @dnd-kit/sortable + recursive render,
// but for the 90% case "move department X under Y" most HR tools use a
// flat "parent" dropdown + reorder — that's what we do here. Real nested
// drop-zones come in the next iteration.

type Dept = {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number; // visual indent level (0..n)
};

const SEED: Dept[] = [
  { id: '1', name: 'Genel Müdürlük', parent_id: null, depth: 0 },
  { id: '2', name: 'İK', parent_id: '1', depth: 1 },
  { id: '3', name: 'Bordro', parent_id: '2', depth: 2 },
  { id: '4', name: 'Teknoloji', parent_id: '1', depth: 1 },
  { id: '5', name: 'Backend Ekibi', parent_id: '4', depth: 2 },
  { id: '6', name: 'Frontend Ekibi', parent_id: '4', depth: 2 },
  { id: '7', name: 'Satış', parent_id: '1', depth: 1 },
];

export default function OrgEditorPage() {
  const [items, setItems] = useState<Dept[]>(SEED);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const [dirty, setDirty] = useState(false);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((x) => x.id === active.id);
    const newIndex = items.findIndex((x) => x.id === over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
    setDirty(true);
  };

  const changeParent = (id: string, parentId: string | null) => {
    setItems((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const parent = prev.find((x) => x.id === parentId);
        return { ...p, parent_id: parentId, depth: parent ? parent.depth + 1 : 0 };
      }),
    );
    setDirty(true);
  };

  const save = async () => {
    try {
      const r = await fetch('/api/organization/tree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((x, idx) => ({
            id: x.id,
            parent_id: x.parent_id,
            order_index: idx,
          })),
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success('Organizasyon yapısı kaydedildi');
      setDirty(false);
    } catch (err) {
      toast.error(`Kaydedilemedi: ${String(err)}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/organizasyon" className="text-[12px] text-ink-40 hover:underline">← Organizasyon</Link>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold text-ink">
            <Building2 className="h-5 w-5" />
            Organizasyon Editörü
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            Departmanları sürükleyip bırakarak yeniden sıralayın. Üst departman değişikliği için
            sağdaki dropdown'ı kullanın. Değişiklikler "Kaydet" sonrası aktif olur.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white hover:bg-[#333] disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Kaydet
        </button>
      </div>

      <section className="rounded-xl border border-line bg-bg p-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((dept) => (
              <DeptRow
                key={dept.id}
                dept={dept}
                allDepts={items}
                onParentChange={(parentId) => changeParent(dept.id, parentId)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </section>

      <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[11px] text-amber">
        <p className="font-semibold">Güvenli yeniden yapılandırma</p>
        <p className="mt-1 text-ink-80">
          "Kaydet"den önceki değişiklikler sadece önizleme amaçlıdır. Kaydettiğinizde
          organizasyon servisinde bir transaction'da uygulanır, başarısız olursa geri alınır.
          Döngüsel ebeveyn (A → B → A) otomatik engellenir.
        </p>
      </div>
    </div>
  );
}

function DeptRow({
  dept,
  allDepts,
  onParentChange,
}: {
  dept: Dept;
  allDepts: Dept[];
  onParentChange: (parentId: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dept.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: dept.depth * 24 + 8,
  };

  const possibleParents = allDepts.filter((d) => d.id !== dept.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border border-transparent bg-bg p-2 hover:border-line"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 text-ink-40 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Building2 className="h-4 w-4 text-accent" />
      <span className="flex-1 text-sm font-medium text-ink">{dept.name}</span>
      <select
        value={dept.parent_id ?? ''}
        onChange={(e) => onParentChange(e.target.value || null)}
        className="rounded-md border border-line bg-bg px-2 py-1 text-[11px]"
      >
        <option value="">— Kök —</option>
        {possibleParents.map((p) => (
          <option key={p.id} value={p.id}>
            {'  '.repeat(p.depth)}
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
