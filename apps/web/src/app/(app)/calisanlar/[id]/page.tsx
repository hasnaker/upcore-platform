import type { Metadata } from 'next';
import { fetchEmployee } from '@/lib/employee-mapper';
import { EmployeeHeader } from './_components/EmployeeHeader';
import { EmployeeTabs } from './_components/EmployeeTabs';
import { EmployeeCrossModuleView } from './_components/EmployeeCrossModuleView';

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EmployeeDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const employee = await fetchEmployee(id);
    return {
      title: `${employee.tamAd} - Çalışan Detay`,
      description: `${employee.tamAd} çalışan profili`,
    };
  } catch {
    return {
      title: 'Çalışan Detay',
      description: 'Çalışan profil detayları.',
    };
  }
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params;
  const employee = await fetchEmployee(id);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col gap-0">
      <EmployeeHeader employee={employee} />
      <EmployeeTabs employee={employee} />
      <EmployeeCrossModuleView employeeId={id} />
    </div>
  );
}
