import { exigirAdmin } from '@/lib/auth/guards';
import { AdminNavLinks } from './AdminNavLinks';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return (
    <div className="space-y-6">
      <AdminNavLinks />
      {children}
    </div>
  );
}
