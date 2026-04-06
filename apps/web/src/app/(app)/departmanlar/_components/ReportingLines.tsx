'use client';

interface ReportingNode {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  department: string;
  reports: ReportingNode[];
}

// Static data — will be replaced with API call when services are connected
const reportingTree: ReportingNode = {
  id: '1',
  firstName: 'Ahmet',
  lastName: 'Yildiz',
  position: 'CEO',
  department: 'Genel Mudurluk',
  reports: [
    {
      id: '2',
      firstName: 'Ayse',
      lastName: 'Yilmaz',
      position: 'Satis Direktoru',
      department: 'Satis',
      reports: [
        { id: '2a', firstName: 'Kerem', lastName: 'Bulut', position: 'Ic Satis Muduru', department: 'Ic Satis', reports: [] },
        { id: '2b', firstName: 'Seda', lastName: 'Acar', position: 'Kurumsal Satis Muduru', department: 'Kurumsal Satis', reports: [] },
      ],
    },
    {
      id: '3',
      firstName: 'Burak',
      lastName: 'Aydin',
      position: 'VP Muhendislik',
      department: 'Muhendislik',
      reports: [
        { id: '3a', firstName: 'Deniz', lastName: 'Yildiz', position: 'Frontend Takim Lideri', department: 'Frontend', reports: [] },
        { id: '3b', firstName: 'Can', lastName: 'Celik', position: 'Backend Takim Lideri', department: 'Backend', reports: [] },
      ],
    },
    {
      id: '4',
      firstName: 'Elif',
      lastName: 'Ozturk',
      position: 'Urun Direktoru',
      department: 'Urun',
      reports: [],
    },
    {
      id: '5',
      firstName: 'Zeynep',
      lastName: 'Demir',
      position: 'Pazarlama Muduru',
      department: 'Pazarlama',
      reports: [],
    },
    {
      id: '6',
      firstName: 'Fatma',
      lastName: 'Korkmaz',
      position: 'Musteri Hizmetleri Muduru',
      department: 'Musteri Hizmetleri',
      reports: [],
    },
    {
      id: '7',
      firstName: 'Melis',
      lastName: 'Sahin',
      position: 'IK Muduru',
      department: 'Insan Kaynaklari',
      reports: [],
    },
  ],
};

const InitialsCircle = ({ firstName, lastName }: { firstName: string; lastName: string }) => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[12px] font-semibold text-[#555]">
      {initials}
    </div>
  );
};

const ReportingNodeView = ({ node, depth = 0 }: { node: ReportingNode; depth?: number }) => {
  return (
    <div>
      <div
        className="flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-[#fafafa]"
        style={{ paddingLeft: `${depth * 28 + 16}px` }}
      >
        {depth > 0 && (
          <div className="flex h-4 items-center">
            <div className="h-px w-5 bg-[#f0f0f0]" />
          </div>
        )}
        <InitialsCircle firstName={node.firstName} lastName={node.lastName} />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-[#111]">
            {node.firstName} {node.lastName}
          </p>
          <p className="text-[12px] text-[#888]">
            {node.position} — {node.department}
          </p>
        </div>
      </div>
      {node.reports.length > 0 && (
        <div className="relative" style={{ marginLeft: `${depth * 28 + 16}px` }}>
          <div className="absolute left-[18px] top-0 bottom-0 w-px bg-[#f0f0f0]" />
          {node.reports.map((child) => (
            <ReportingNodeView key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ReportingLines = () => {
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-white">
      <div className="border-b border-[#f0f0f0] px-5 py-4">
        <h3 className="text-[15px] font-semibold text-[#111]">Raporlama Hiyerarsisi</h3>
      </div>
      <div className="p-2">
        <ReportingNodeView node={reportingTree} />
      </div>
    </div>
  );
};
