import { createServerClient } from '@/lib/supabase/server';
import { listarOficinas } from '@/lib/oficinas/data';
import { OficinasManager } from '@/components/admin/OficinasManager';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function OficinasPage() {
  const supabase = await createServerClient();
  const oficinas = await listarOficinas(supabase);
  return (
    <div>
      <PageHeader title="Oficinas" />
      <OficinasManager oficinasIniciais={oficinas} />
    </div>
  );
}
