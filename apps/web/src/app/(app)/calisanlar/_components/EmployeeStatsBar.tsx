interface EmployeeStatsBarProps {
  total: number;
  active: number;
  onLeave: number;
  terminated: number;
}

export const EmployeeStatsBar = ({
  total,
  active,
  onLeave,
  terminated,
}: EmployeeStatsBarProps) => {
  const stats = [
    { label: 'Toplam', value: total, color: 'bg-[#0A0A0A]' },
    { label: 'Aktif', value: active, color: 'bg-[#059669]' },
    { label: 'Izinde', value: onLeave, color: 'bg-[#D97706]' },
    { label: 'Ayrilmis', value: terminated, color: 'bg-[#DC2626]' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3.5 py-1.5"
        >
          <span className={`h-2 w-2 rounded-full ${stat.color}`} />
          <span className="text-xs text-[#525252]">{stat.label}</span>
          <span className="text-xs font-semibold tabular-nums text-[#0A0A0A]">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
};
