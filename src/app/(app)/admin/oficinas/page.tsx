import { createServerClient } from '@/lib/supabase/server';
import { listarOficinas } from '@/lib/oficinas/data';
import { OficinasManager } from '@/components/admin/OficinasManager';

export default async function OficinasPage() {
  const supabase = await createServerClient();
  const oficinas = await listarOficinas(supabase);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Oficinas</h1>
      <OficinasManager oficinasIniciais={oficinas} />
    </div>
  );
}
