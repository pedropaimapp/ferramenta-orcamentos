import { createServerClient } from '@/lib/supabase/server';
import { listarConsultores } from '@/lib/consultores/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { ConsultoresManager } from '@/components/admin/ConsultoresManager';

export default async function ConsultoresPage() {
  const supabase = await createServerClient();
  const [consultores, oficinas] = await Promise.all([listarConsultores(supabase), listarOficinas(supabase)]);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Consultores</h1>
      <ConsultoresManager consultoresIniciais={consultores} oficinas={oficinas} />
    </div>
  );
}
