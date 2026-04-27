import { AdminShell } from '@/components/AdminShell';
import { DashboardContent } from './_components/DashboardContent';

export const metadata = {
  title: 'Dashboard',
  description: 'UpCore admin paneli — platform genel durumu',
};

export default function DashboardPage() {
  return (
    <AdminShell>
      <DashboardContent />
    </AdminShell>
  );
}
