import type { Metadata } from 'next';
import { EmployeeDetailClient } from './_components/EmployeeDetailClient';

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>;
}

// Metadata statik — canlı veri client-side çekiliyor.
export const metadata: Metadata = {
  title: 'Çalışan Detay',
  description: 'Çalışan profil detayları — canlı API.',
};

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = await params;
  return <EmployeeDetailClient id={id} />;
}
